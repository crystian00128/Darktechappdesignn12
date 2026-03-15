import { useState, useEffect, useCallback, useRef } from "react";
import * as api from "../services/api";
import { notifyIncomingCall } from "../services/notifications";

export interface CallData {
  callId: string;
  from: string;
  to: string;
  type: "voice" | "video";
  fromName: string;
  fromPhoto: string;
  toName: string;
  toPhoto: string;
  status: "ringing" | "connected" | "ended";
  startedAt: string;
  connectedAt?: string;
}

export interface CallState {
  incomingCall: CallData | null;
  outgoingCall: CallData | null;
  isInCall: boolean;
  activeCall: CallData | null;
}

// ─── Web Audio API Ringtone (incoming call) ─────────
class RingtonePlayer {
  private ctx: AudioContext | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isPlaying = false;

  play() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.ctx = new AudioContext();

    const playTone = () => {
      if (!this.ctx || !this.isPlaying) return;
      const now = this.ctx.currentTime;
      [0, 0.15].forEach((offset) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(440, now + offset);
        osc.frequency.setValueAtTime(520, now + offset + 0.05);
        gain.gain.setValueAtTime(0, now + offset);
        gain.gain.linearRampToValueAtTime(0.18, now + offset + 0.02);
        gain.gain.setValueAtTime(0.18, now + offset + 0.1);
        gain.gain.linearRampToValueAtTime(0, now + offset + 0.14);
        osc.connect(gain).connect(this.ctx!.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.15);
      });
    };
    playTone();
    this.intervalId = setInterval(playTone, 2000);
  }

  stop() {
    this.isPlaying = false;
    if (this.intervalId) { clearInterval(this.intervalId); this.intervalId = null; }
    if (this.ctx) { this.ctx.close().catch(() => {}); this.ctx = null; }
  }
}

// ─── Dial Tone (outgoing call ringing) ──────────────
class DialTonePlayer {
  private ctx: AudioContext | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isPlaying = false;

  play() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.ctx = new AudioContext();

    const playBeep = () => {
      if (!this.ctx || !this.isPlaying) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(425, now);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.05);
      gain.gain.setValueAtTime(0.08, now + 0.8);
      gain.gain.linearRampToValueAtTime(0, now + 1.0);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 1.0);
    };
    playBeep();
    this.intervalId = setInterval(playBeep, 3000);
  }

  stop() {
    this.isPlaying = false;
    if (this.intervalId) { clearInterval(this.intervalId); this.intervalId = null; }
    if (this.ctx) { this.ctx.close().catch(() => {}); this.ctx = null; }
  }
}

function playConnectedSound() {
  try {
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + i * 0.12);
      gain.gain.linearRampToValueAtTime(0.12, now + i * 0.12 + 0.03);
      gain.gain.linearRampToValueAtTime(0, now + i * 0.12 + 0.2);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.25);
    });
    setTimeout(() => ctx.close(), 1000);
  } catch {}
}

function playHangupSound() {
  try {
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(480, now);
    osc.frequency.linearRampToValueAtTime(300, now + 0.3);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.3);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
    setTimeout(() => ctx.close(), 500);
  } catch {}
}

// ─── Main Hook ──────────────────────────────────────
export function useCallSystem(currentUsername: string) {
  const [callState, setCallState] = useState<CallState>({
    incomingCall: null,
    outgoingCall: null,
    isInCall: false,
    activeCall: null,
  });

  // Use refs so the polling callback always reads fresh state
  const stateRef = useRef(callState);
  stateRef.current = callState;

  const ringtoneRef = useRef<RingtonePlayer | null>(null);
  const dialToneRef = useRef<DialTonePlayer | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastCallIdRef = useRef<string | null>(null);
  const usernameRef = useRef(currentUsername);
  usernameRef.current = currentUsername;

  // Lazy-init audio players (safe across HMR)
  const getRingtone = useCallback(() => {
    if (!ringtoneRef.current || typeof ringtoneRef.current.stop !== "function") {
      ringtoneRef.current = new RingtonePlayer();
    }
    return ringtoneRef.current;
  }, []);

  const getDialTone = useCallback(() => {
    if (!dialToneRef.current || typeof dialToneRef.current.stop !== "function") {
      dialToneRef.current = new DialTonePlayer();
    }
    return dialToneRef.current;
  }, []);

  // Poll for call status changes
  const pollCalls = useCallback(async () => {
    const username = usernameRef.current;
    if (!username) return;

    try {
      const res = await api.getCallStatus(username);
      if (!res.success) return;

      const { incoming, outgoing } = res;
      const state = stateRef.current;

      // ── Incoming call handling ──
      if (incoming && incoming.status === "ringing" && incoming.callId !== lastCallIdRef.current) {
        lastCallIdRef.current = incoming.callId;
        getRingtone().play();
        notifyIncomingCall(incoming.fromName || incoming.from, incoming.type);
        setCallState(prev => ({ ...prev, incomingCall: incoming }));
      } else if (incoming && incoming.status === "connected") {
        getRingtone().stop();
        if (!state.isInCall) playConnectedSound();
        setCallState(prev => ({
          ...prev,
          incomingCall: null,
          isInCall: true,
          activeCall: incoming,
        }));
      } else if (!incoming && state.incomingCall && !state.isInCall) {
        // Caller cancelled before we answered
        getRingtone().stop();
        lastCallIdRef.current = null;
        playHangupSound();
        setCallState(prev => ({ ...prev, incomingCall: null }));
      }

      // ── Outgoing call handling ──
      if (outgoing && outgoing.status === "connected" && state.outgoingCall) {
        getDialTone().stop();
        playConnectedSound();
        setCallState(prev => ({
          ...prev,
          outgoingCall: null,
          isInCall: true,
          activeCall: outgoing,
        }));
      } else if (!outgoing && state.outgoingCall) {
        getDialTone().stop();
        playHangupSound();
        setCallState(prev => ({ ...prev, outgoingCall: null }));
      }

      // ── Active (connected) call ended by other party ──
      if (!outgoing && !incoming && state.isInCall) {
        playHangupSound();
        lastCallIdRef.current = null;
        setCallState({
          incomingCall: null,
          outgoingCall: null,
          isInCall: false,
          activeCall: null,
        });
      }
    } catch (err) {
      // Silence transient network errors (tab switch, connectivity, abort) — they resolve on next poll
      if (err instanceof TypeError && (err as TypeError).message?.includes('Failed to fetch')) {
        return; // silently skip
      }
      console.error("Erro polling chamadas:", err);
    }
  }, []); // No deps — reads everything from refs

  useEffect(() => {
    if (!currentUsername) return;
    pollCalls();
    pollingRef.current = setInterval(pollCalls, 2000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      try { ringtoneRef.current?.stop(); } catch {}
      try { dialToneRef.current?.stop(); } catch {}
    };
  }, [currentUsername, pollCalls]);

  // ── Actions ──────────────────────────────────
  const startCall = useCallback(async (to: string, type: "voice" | "video", fromName: string, fromPhoto?: string) => {
    try {
      const res = await api.initiateCall(currentUsername, to, type, fromName, fromPhoto);
      if (res.success) {
        getDialTone().play();
        setCallState(prev => ({ ...prev, outgoingCall: res.call }));
      }
    } catch (err) {
      console.error("Erro ao iniciar chamada:", err);
    }
  }, [currentUsername]);

  const answerCall = useCallback(async () => {
    const state = stateRef.current;
    if (!state.incomingCall) return;
    try {
      getRingtone().stop();
      await api.answerCall(currentUsername, state.incomingCall.callId);
      playConnectedSound();
      setCallState(prev => ({
        ...prev,
        incomingCall: null,
        isInCall: true,
        activeCall: prev.incomingCall ? { ...prev.incomingCall, status: "connected" } : null,
      }));
    } catch (err) {
      console.error("Erro ao atender chamada:", err);
    }
  }, [currentUsername]);

  const declineCall = useCallback(async () => {
    getRingtone().stop();
    lastCallIdRef.current = null;
    try { await api.endCall(currentUsername); } catch {}
    playHangupSound();
    setCallState(prev => ({ ...prev, incomingCall: null }));
  }, [currentUsername]);

  const endCall = useCallback(async () => {
    getRingtone().stop();
    getDialTone().stop();
    lastCallIdRef.current = null;
    try { await api.endCall(currentUsername); } catch {}
    playHangupSound();
    setCallState({
      incomingCall: null,
      outgoingCall: null,
      isInCall: false,
      activeCall: null,
    });
  }, [currentUsername]);

  return {
    ...callState,
    startCall,
    answerCall,
    declineCall,
    endCall,
  };
}