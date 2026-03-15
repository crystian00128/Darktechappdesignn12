// @refresh reset
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

// ─── WebRTC Configuration ───────────────────────────
const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
  ],
};

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

  // ─── WebRTC refs ───────────────────────────────────
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const webrtcRoleRef = useRef<"caller" | "callee" | null>(null);
  const webrtcCallIdRef = useRef<string | null>(null);
  const icePollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const iceIndexRef = useRef<number>(0);
  const webrtcSetupDoneRef = useRef(false);
  const otherUserRef = useRef<string | null>(null);
  const silentCtxRef = useRef<AudioContext | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [micBlocked, setMicBlocked] = useState(false);

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

  // ─── WebRTC helpers ────────────────────────────────
  const cleanupWebRTC = useCallback(() => {
    console.log("[WebRTC] Cleaning up...");
    // Stop ICE polling
    if (icePollRef.current) {
      clearInterval(icePollRef.current);
      icePollRef.current = null;
    }
    // Close peer connection
    if (pcRef.current) {
      pcRef.current.onicecandidate = null;
      pcRef.current.ontrack = null;
      pcRef.current.oniceconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }
    // Stop local media tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    // Close silent audio context if used (mic-blocked fallback)
    if (silentCtxRef.current) {
      silentCtxRef.current.close().catch(() => {});
      silentCtxRef.current = null;
    }
    // Stop remote audio
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
      remoteAudioRef.current.remove();
      remoteAudioRef.current = null;
    }
    // Cleanup server-side WebRTC data
    const callId = webrtcCallIdRef.current;
    if (callId) {
      api.cleanupWebRTC(callId, usernameRef.current, otherUserRef.current || undefined).catch(() => {});
    }
    webrtcRoleRef.current = null;
    webrtcCallIdRef.current = null;
    webrtcSetupDoneRef.current = false;
    otherUserRef.current = null;
    iceIndexRef.current = 0;
    setMicBlocked(false);
  }, []);

  const getOrCreateRemoteAudio = useCallback(() => {
    if (!remoteAudioRef.current) {
      const audio = document.createElement("audio");
      audio.autoplay = true;
      audio.playsInline = true;
      audio.setAttribute("style", "position:fixed;top:-9999px;left:-9999px;");
      document.body.appendChild(audio);
      remoteAudioRef.current = audio;
    }
    return remoteAudioRef.current;
  }, []);

  // Helper: create a silent audio track for mic-blocked fallback
  // Keeps the AudioContext alive (stored in silentCtxRef) so the track stays valid
  const createSilentTrack = useCallback((pc: RTCPeerConnection) => {
    try {
      const ctx = new AudioContext();
      silentCtxRef.current = ctx; // Keep alive until cleanup
      const oscillator = ctx.createOscillator();
      const dst = ctx.createMediaStreamDestination();
      oscillator.connect(dst);
      oscillator.start();
      const silentTrack = dst.stream.getAudioTracks()[0];
      silentTrack.enabled = false; // mute the silent track
      pc.addTrack(silentTrack, dst.stream);
      console.log("[WebRTC] Added silent placeholder audio track (mic blocked)");
    } catch (e) {
      console.warn("[WebRTC] Could not create silent track:", e);
    }
  }, []);

  // Start polling for ICE candidates from the other party
  const startICEPolling = useCallback((callId: string, otherUser: string) => {
    if (icePollRef.current) clearInterval(icePollRef.current);
    iceIndexRef.current = 0;

    const pollICE = async () => {
      try {
        const pc = pcRef.current;
        if (!pc || pc.signalingState === "closed" || pc.connectionState === "closed") {
          if (icePollRef.current) { clearInterval(icePollRef.current); icePollRef.current = null; }
          return;
        }
        const res = await api.getICECandidates(callId, otherUser);
        if (!res.success || !res.candidates) return;
        const candidates = res.candidates;
        // Only process new candidates
        for (let i = iceIndexRef.current; i < candidates.length; i++) {
          // Re-check PC is still open before each addIceCandidate
          const currentPc = pcRef.current;
          if (!currentPc || currentPc.signalingState === "closed" || currentPc.connectionState === "closed") {
            if (icePollRef.current) { clearInterval(icePollRef.current); icePollRef.current = null; }
            return;
          }
          try {
            const parsed = JSON.parse(candidates[i].candidate);
            await currentPc.addIceCandidate(new RTCIceCandidate(parsed));
            console.log(`[WebRTC] Added ICE candidate #${i} from ${otherUser}`);
          } catch (e: any) {
            // Silence InvalidStateError on closed connections (race during cleanup)
            if (e?.name === "InvalidStateError") {
              if (icePollRef.current) { clearInterval(icePollRef.current); icePollRef.current = null; }
              return;
            }
            console.warn("[WebRTC] Failed to add ICE candidate:", e);
          }
        }
        iceIndexRef.current = candidates.length;
      } catch (err: any) {
        if (err?.name === "AbortError" || err?.message?.includes("Failed to fetch")) return;
      }
    };

    // Poll immediately then every 1s
    pollICE();
    icePollRef.current = setInterval(pollICE, 1000);
  }, []);

  // Setup WebRTC as CALLER (creates offer)
  const setupWebRTCCaller = useCallback(async (callId: string, otherUser: string, preAcquiredStream?: MediaStream) => {
    if (webrtcSetupDoneRef.current) return;
    webrtcSetupDoneRef.current = true;
    console.log("[WebRTC] Setting up as CALLER for call:", callId);
    otherUserRef.current = otherUser;

    try {
      // Try to get microphone - use pre-acquired stream if available
      // If mic is denied, continue without local audio (one-way: can still hear other party)
      let stream: MediaStream | null = preAcquiredStream || null;
      if (!stream) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        } catch (micErr: any) {
          console.warn("[WebRTC] Microphone denied for CALLER, continuing without local audio:", micErr?.message);
          setMicBlocked(true);
        }
      }
      if (stream) {
        localStreamRef.current = stream;
        setMicBlocked(false);
        console.log("[WebRTC] Microphone acquired, tracks:", stream.getAudioTracks().length);
      }

      // Create peer connection
      const pc = new RTCPeerConnection(RTC_CONFIG);
      pcRef.current = pc;
      webrtcRoleRef.current = "caller";
      webrtcCallIdRef.current = callId;

      // Add local audio tracks to connection (if mic available)
      if (stream) {
        stream.getTracks().forEach(track => {
          pc.addTrack(track, stream!);
          console.log("[WebRTC] Added local track:", track.kind, track.enabled);
        });
      } else {
        // Add a silent audio track so the peer connection has audio in the SDP
        // This ensures the other party can still send us their audio
        createSilentTrack(pc);
      }

      // Handle remote audio
      pc.ontrack = (event) => {
        console.log("[WebRTC] CALLER received remote track!", event.track.kind);
        const audio = getOrCreateRemoteAudio();
        audio.srcObject = event.streams[0] || new MediaStream([event.track]);
        audio.play().catch(e => console.warn("[WebRTC] Audio play failed:", e));
      };

      // Handle ICE candidates - send to server
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          api.sendICECandidate(callId, usernameRef.current, event.candidate.toJSON()).catch(() => {});
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log("[WebRTC] ICE connection state:", pc.iceConnectionState);
      };

      // Create and set offer
      const offer = await pc.createOffer({ offerToReceiveAudio: true });
      await pc.setLocalDescription(offer);
      console.log("[WebRTC] Offer created, sending to server...");

      // Store offer on server
      await api.sendSDP(callId, usernameRef.current, pc.localDescription!.toJSON(), "offer");
      console.log("[WebRTC] Offer stored on server");

      // Poll for answer from callee
      const answerPollInterval = setInterval(async () => {
        try {
          if (!pcRef.current || pcRef.current.signalingState === "closed") {
            clearInterval(answerPollInterval);
            return;
          }
          const res = await api.getSDP(callId, "answer");
          if (res.success && res.data && res.data.sdp) {
            clearInterval(answerPollInterval);
            const answer = JSON.parse(res.data.sdp);
            console.log("[WebRTC] Answer received from callee!");
            if (pcRef.current && pcRef.current.signalingState === "have-local-offer") {
              await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
              console.log("[WebRTC] Remote description set (answer)");
            }
          }
        } catch (err: any) {
          if (err?.name === "AbortError" || err?.message?.includes("Failed to fetch")) return;
        }
      }, 1000);

      // Start polling for ICE candidates from the other party
      startICEPolling(callId, otherUser);

    } catch (err) {
      console.error("[WebRTC] CALLER setup failed:", err);
      webrtcSetupDoneRef.current = false;
    }
  }, [getOrCreateRemoteAudio, startICEPolling, createSilentTrack]);

  // Setup WebRTC as CALLEE (receives offer, creates answer)
  const setupWebRTCCallee = useCallback(async (callId: string, otherUser: string, preAcquiredStream?: MediaStream) => {
    if (webrtcSetupDoneRef.current) return;
    webrtcSetupDoneRef.current = true;
    console.log("[WebRTC] Setting up as CALLEE for call:", callId);
    otherUserRef.current = otherUser;

    try {
      // Try to get microphone - use pre-acquired stream if available
      // If mic is denied, continue without local audio (one-way: can still hear other party)
      let stream: MediaStream | null = preAcquiredStream || null;
      if (!stream) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        } catch (micErr: any) {
          console.warn("[WebRTC] Microphone denied for CALLEE, continuing without local audio:", micErr?.message);
          setMicBlocked(true);
        }
      }
      if (stream) {
        localStreamRef.current = stream;
        setMicBlocked(false);
        console.log("[WebRTC] Microphone acquired, tracks:", stream.getAudioTracks().length);
      }

      // Create peer connection
      const pc = new RTCPeerConnection(RTC_CONFIG);
      pcRef.current = pc;
      webrtcRoleRef.current = "callee";
      webrtcCallIdRef.current = callId;

      // Add local audio tracks (if mic available)
      if (stream) {
        stream.getTracks().forEach(track => {
          pc.addTrack(track, stream!);
          console.log("[WebRTC] Added local track:", track.kind, track.enabled);
        });
      } else {
        // Add a silent audio track so the peer connection negotiates audio
        createSilentTrack(pc);
      }

      // Handle remote audio
      pc.ontrack = (event) => {
        console.log("[WebRTC] CALLEE received remote track!", event.track.kind);
        const audio = getOrCreateRemoteAudio();
        audio.srcObject = event.streams[0] || new MediaStream([event.track]);
        audio.play().catch(e => console.warn("[WebRTC] Audio play failed:", e));
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          api.sendICECandidate(callId, usernameRef.current, event.candidate.toJSON()).catch(() => {});
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log("[WebRTC] ICE connection state:", pc.iceConnectionState);
      };

      // Poll for offer from caller
      const pollForOffer = async (): Promise<RTCSessionDescriptionInit | null> => {
        for (let attempt = 0; attempt < 30; attempt++) {
          // Bail out if PC was closed during polling (call ended)
          if (!pcRef.current || pcRef.current.signalingState === "closed") return null;
          try {
            const res = await api.getSDP(callId, "offer");
            if (res.success && res.data && res.data.sdp) {
              return JSON.parse(res.data.sdp);
            }
          } catch {}
          await new Promise(r => setTimeout(r, 1000));
        }
        return null;
      };

      const offer = await pollForOffer();
      if (!offer || !pcRef.current || pcRef.current.signalingState === "closed") {
        if (!offer) console.error("[WebRTC] No offer received after 30s");
        webrtcSetupDoneRef.current = false;
        return;
      }

      console.log("[WebRTC] Offer received from caller!");
      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      // Create and set answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log("[WebRTC] Answer created, sending to server...");

      // Store answer on server
      await api.sendSDP(callId, usernameRef.current, pc.localDescription!.toJSON(), "answer");
      console.log("[WebRTC] Answer stored on server");

      // Start polling for ICE candidates from the caller
      startICEPolling(callId, otherUser);

    } catch (err) {
      console.error("[WebRTC] CALLEE setup failed:", err);
      webrtcSetupDoneRef.current = false;
    }
  }, [getOrCreateRemoteAudio, startICEPolling, createSilentTrack]);

  // ─── Mute/unmute ──────────────────────────────────
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const tracks = localStreamRef.current.getAudioTracks();
      const newMuted = !isMuted;
      tracks.forEach(t => { t.enabled = !newMuted; });
      setIsMuted(newMuted);
      console.log("[WebRTC] Mute toggled:", newMuted);
    }
  }, [isMuted]);

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
        if (!state.isInCall) {
          playConnectedSound();
          // Callee: setup WebRTC when call connects
          setupWebRTCCallee(incoming.callId, incoming.from);
        }
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
        // Caller: setup WebRTC when callee answers - use pre-acquired stream from startCall if available
        setupWebRTCCaller(outgoing.callId, outgoing.to, localStreamRef.current || undefined);
        setCallState(prev => ({
          ...prev,
          outgoingCall: null,
          isInCall: true,
          activeCall: outgoing,
        }));
      } else if (!outgoing && state.outgoingCall) {
        getDialTone().stop();
        playHangupSound();
        cleanupWebRTC();
        setCallState(prev => ({ ...prev, outgoingCall: null }));
      }

      // ── Active (connected) call ended by other party ──
      if (!outgoing && !incoming && state.isInCall) {
        playHangupSound();
        lastCallIdRef.current = null;
        cleanupWebRTC();
        setIsMuted(false);
        setCallState({
          incomingCall: null,
          outgoingCall: null,
          isInCall: false,
          activeCall: null,
        });
      }
    } catch (err: any) {
      // Silence transient network errors and timeouts
      if (
        err?.name === 'AbortError' ||
        err?._aborted ||
        (err instanceof TypeError && err.message?.includes('Failed to fetch')) ||
        (typeof err === 'string' && err.includes('timeout')) ||
        (err?.message && /timeout|aborted/i.test(err.message))
      ) {
        return;
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
      cleanupWebRTC();
    };
  }, [currentUsername, pollCalls, cleanupWebRTC]);

  // ── Actions ──────────────────────────────────
  const startCall = useCallback(async (to: string, type: "voice" | "video", fromName: string, fromPhoto?: string) => {
    try {
      // Pre-acquire microphone in user gesture context to avoid permission errors
      let preStream: MediaStream | undefined;
      try {
        preStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        console.log("[WebRTC] Microphone pre-acquired for CALLER (user gesture)");
      } catch (micErr) {
        console.warn("[WebRTC] Could not pre-acquire microphone:", micErr);
        setMicBlocked(true);
      }
      // Store pre-acquired stream so WebRTC setup can use it
      if (preStream) {
        localStreamRef.current = preStream;
      }
      const res = await api.initiateCall(currentUsername, to, type, fromName, fromPhoto);
      if (res.success) {
        getDialTone().play();
        setCallState(prev => ({ ...prev, outgoingCall: res.call }));
      } else if (preStream) {
        // If call initiation failed, clean up the stream
        preStream.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
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
      // Pre-acquire microphone in user gesture context BEFORE any async calls
      // This is critical: browsers require getUserMedia to be called directly from a user gesture
      let preStream: MediaStream | undefined;
      try {
        preStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        console.log("[WebRTC] Microphone pre-acquired for CALLEE (user gesture)");
      } catch (micErr) {
        console.warn("[WebRTC] Could not pre-acquire microphone:", micErr);
        setMicBlocked(true);
      }
      await api.answerCall(currentUsername, state.incomingCall.callId);
      playConnectedSound();
      // Start WebRTC as callee, passing the pre-acquired stream
      setupWebRTCCallee(state.incomingCall.callId, state.incomingCall.from, preStream);
      setCallState(prev => ({
        ...prev,
        incomingCall: null,
        isInCall: true,
        activeCall: prev.incomingCall ? { ...prev.incomingCall, status: "connected" } : null,
      }));
    } catch (err) {
      console.error("Erro ao atender chamada:", err);
    }
  }, [currentUsername, setupWebRTCCallee]);

  const declineCall = useCallback(async () => {
    getRingtone().stop();
    lastCallIdRef.current = null;
    try { await api.endCall(currentUsername); } catch {}
    playHangupSound();
    cleanupWebRTC();
    setCallState(prev => ({ ...prev, incomingCall: null }));
  }, [currentUsername, cleanupWebRTC]);

  const endCall = useCallback(async () => {
    getRingtone().stop();
    getDialTone().stop();
    lastCallIdRef.current = null;
    try { await api.endCall(currentUsername); } catch {}
    playHangupSound();
    cleanupWebRTC();
    setIsMuted(false);
    setCallState({
      incomingCall: null,
      outgoingCall: null,
      isInCall: false,
      activeCall: null,
    });
  }, [currentUsername, cleanupWebRTC]);

  return {
    ...callState,
    startCall,
    answerCall,
    declineCall,
    endCall,
    toggleMute,
    isMuted,
    micBlocked,
    localStream: localStreamRef.current,
  };
}