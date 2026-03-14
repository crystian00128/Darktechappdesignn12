/**
 * ══════════════════════════════════════════════════════════════════
 *  NEON SOUND ENGINE — Futuristic Synthesized Sound Effects
 *  Uses Web Audio API to generate cyber/neon themed sounds
 * ══════════════════════════════════════════════════════════════════
 */

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx || audioCtx.state === "closed") {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

// Helper: play a tone with envelope
function playTone(
  freq: number,
  type: OscillatorType,
  duration: number,
  volume = 0.15,
  delay = 0,
  detune = 0,
) {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
  osc.detune.setValueAtTime(detune, ctx.currentTime + delay);
  gain.gain.setValueAtTime(0, ctx.currentTime + delay);
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + delay + 0.02);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + delay + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime + delay);
  osc.stop(ctx.currentTime + delay + duration + 0.05);
}

// Helper: frequency sweep
function playSweep(
  startFreq: number,
  endFreq: number,
  type: OscillatorType,
  duration: number,
  volume = 0.12,
  delay = 0,
) {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(startFreq, ctx.currentTime + delay);
  osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + delay + duration);
  gain.gain.setValueAtTime(0, ctx.currentTime + delay);
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + delay + 0.015);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + delay + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime + delay);
  osc.stop(ctx.currentTime + delay + duration + 0.05);
}

// Helper: noise burst
function playNoise(duration: number, volume = 0.04, delay = 0) {
  const ctx = getCtx();
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.setValueAtTime(2000, ctx.currentTime + delay);
  gain.gain.setValueAtTime(volume, ctx.currentTime + delay);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + delay + duration);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start(ctx.currentTime + delay);
}

/* ══════════════════════════════════════════════════════════════
   PUBLIC SOUND EFFECTS
   ══════════════════════════════════════════════════════════════ */

/** Soft click — PIN digit press, button tap */
export function playClick() {
  playTone(1800, "sine", 0.06, 0.08);
  playTone(2400, "sine", 0.04, 0.04, 0.01);
}

/** PIN digit entered — ascending micro-tone based on position */
export function playPinDigit(position: number) {
  const baseFreq = 600 + position * 120;
  playTone(baseFreq, "sine", 0.08, 0.1);
  playTone(baseFreq * 1.5, "triangle", 0.06, 0.04, 0.02);
}

/** PIN delete — descending tone */
export function playPinDelete() {
  playSweep(1200, 400, "sine", 0.12, 0.08);
}

/** Step transition — whoosh forward */
export function playStepForward() {
  playSweep(300, 1200, "sine", 0.2, 0.1);
  playTone(1200, "triangle", 0.15, 0.06, 0.15);
  playNoise(0.15, 0.03, 0.05);
}

/** Step back — whoosh backward */
export function playStepBack() {
  playSweep(1200, 300, "sine", 0.2, 0.08);
  playNoise(0.1, 0.02, 0.05);
}

/** ═══ ERROR — Wrong PIN / Wrong password / General errors ═══
 *  Harsh, jarring double buzz with alarm quality */
export function playError() {
  // Low warning buzz
  playTone(150, "sawtooth", 0.15, 0.12);
  playTone(180, "square", 0.15, 0.06);
  // Second buzz
  playTone(130, "sawtooth", 0.18, 0.14, 0.18);
  playTone(160, "square", 0.18, 0.07, 0.18);
  // High alert pip
  playTone(900, "sine", 0.05, 0.08, 0.1);
  playNoise(0.2, 0.05, 0.05);
}

/** ═══ WARNING — Username taken / Validation issue ═══
 *  3 descending alarm pips */
export function playWarning() {
  playTone(1000, "triangle", 0.1, 0.1);
  playTone(800, "triangle", 0.1, 0.1, 0.12);
  playTone(600, "triangle", 0.15, 0.12, 0.24);
  playNoise(0.08, 0.03, 0.15);
}

/** ═══ USERNAME TAKEN — Specific "denied access" alarm ═══
 *  Dramatic forbidden sound */
export function playUsernameTaken() {
  // Alarm sweep down
  playSweep(1400, 200, "sawtooth", 0.35, 0.1);
  // Rejection buzz
  playTone(120, "square", 0.2, 0.08, 0.1);
  playTone(100, "square", 0.25, 0.1, 0.2);
  // High denial ping
  playTone(2200, "sine", 0.08, 0.06, 0.05);
  playTone(1800, "sine", 0.08, 0.06, 0.15);
  playNoise(0.15, 0.04, 0.1);
}

/** ═══ SUCCESS — Login / Registration complete ═══
 *  Triumphant ascending chord with sparkle */
export function playSuccess() {
  // Major chord arpeggio
  playTone(523, "sine", 0.3, 0.12);         // C5
  playTone(659, "sine", 0.28, 0.1, 0.08);   // E5
  playTone(784, "sine", 0.26, 0.1, 0.16);   // G5
  playTone(1047, "sine", 0.35, 0.12, 0.24); // C6
  // Sparkle overtone
  playTone(2093, "sine", 0.2, 0.05, 0.3);   // C7 shimmer
  playTone(2637, "sine", 0.15, 0.03, 0.35);
  // Sub bass boom
  playTone(80, "sine", 0.4, 0.08);
  playNoise(0.1, 0.02, 0.25);
}

/** ═══ FACE DETECTED — Face found in camera ═══ */
export function playFaceDetected() {
  playTone(880, "sine", 0.12, 0.08);
  playTone(1320, "sine", 0.12, 0.06, 0.06);
  playTone(1760, "sine", 0.15, 0.04, 0.12);
}

/** ═══ FACE SCAN — Scanning in progress beep ═══ */
export function playScanBeep() {
  playTone(1500, "sine", 0.06, 0.06);
  playTone(2000, "triangle", 0.04, 0.03, 0.03);
}

/** ═══ COUNTDOWN — 3, 2, 1 beep (pitch varies by count) ═══ */
export function playCountdown(count: number) {
  const freq = count === 3 ? 600 : count === 2 ? 800 : 1200;
  const vol = count === 1 ? 0.15 : 0.1;
  playTone(freq, "sine", 0.15, vol);
  playTone(freq * 2, "triangle", 0.1, 0.04, 0.02);
  if (count === 1) {
    // Extra emphasis on final count
    playSweep(1200, 2400, "sine", 0.2, 0.06, 0.1);
  }
}

/** ═══ FACE MATCH — Face verified successfully ═══ */
export function playFaceMatch() {
  // Biometric confirmation
  playSweep(400, 1600, "sine", 0.3, 0.1);
  playTone(1600, "sine", 0.2, 0.1, 0.15);
  playTone(2000, "sine", 0.25, 0.08, 0.25);
  // Approval shimmer
  playTone(3000, "sine", 0.15, 0.03, 0.3);
  playTone(3500, "sine", 0.1, 0.02, 0.35);
  playNoise(0.08, 0.02, 0.2);
}

/** ═══ FACE FAIL — Face not recognized ═══ */
export function playFaceFail() {
  playSweep(1400, 200, "sine", 0.4, 0.1);
  playTone(200, "sawtooth", 0.3, 0.08, 0.15);
  playTone(150, "square", 0.2, 0.06, 0.25);
  playNoise(0.2, 0.04, 0.1);
}

/** ═══ NAVIGATE — Mode/tab switch ═══ */
export function playNavigate() {
  playSweep(600, 1200, "sine", 0.12, 0.06);
  playTone(1200, "triangle", 0.08, 0.04, 0.08);
}

/** ═══ NOTIFICATION — New message / alert ═══ */
export function playNotification() {
  playTone(880, "sine", 0.1, 0.1);
  playTone(1320, "sine", 0.1, 0.08, 0.1);
  playTone(1760, "sine", 0.15, 0.06, 0.2);
  playNoise(0.05, 0.02, 0.15);
}

/** ═══ TOGGLE — On/Off switch ═══ */
export function playToggle(on: boolean) {
  if (on) {
    playSweep(400, 1000, "sine", 0.1, 0.08);
  } else {
    playSweep(1000, 400, "sine", 0.1, 0.06);
  }
}

/** ═══ TYPING — Keyboard character input ═══ */
export function playType() {
  playTone(1400 + Math.random() * 400, "sine", 0.03, 0.04);
}

/** ═══ CAMERA SHUTTER — Photo capture ═══ */
export function playCameraShutter() {
  playNoise(0.08, 0.12);
  playTone(4000, "sine", 0.04, 0.06, 0.02);
  playNoise(0.06, 0.06, 0.06);
}

/** ═══ INVITE CODE — Code validated successfully ═══ */
export function playCodeAccepted() {
  playTone(700, "sine", 0.12, 0.1);
  playTone(1050, "sine", 0.12, 0.1, 0.1);
  playTone(1400, "sine", 0.2, 0.12, 0.2);
  playSweep(1400, 2800, "sine", 0.15, 0.04, 0.3);
}

/** ═══ ACCESS DENIED — No invite code / blocked ═══ */
export function playAccessDenied() {
  playTone(200, "sawtooth", 0.4, 0.12);
  playTone(180, "square", 0.4, 0.08, 0.05);
  playSweep(2000, 100, "sawtooth", 0.5, 0.06, 0.1);
  playNoise(0.3, 0.05, 0.1);
}

/** ═══ WHOOSH — General transition ═══ */
export function playWhoosh() {
  playNoise(0.2, 0.06);
  playSweep(200, 2000, "sine", 0.15, 0.04, 0.02);
}

/** ═══ BOOT — App loaded / Panel open ═══ */
export function playBoot() {
  playSweep(80, 400, "sine", 0.4, 0.08);
  playTone(400, "triangle", 0.2, 0.06, 0.25);
  playTone(600, "sine", 0.2, 0.06, 0.35);
  playTone(800, "sine", 0.25, 0.08, 0.45);
  playNoise(0.15, 0.02, 0.2);
}

/** ═══ DELETE — Destructive action ═══ */
export function playDelete() {
  playSweep(800, 100, "sawtooth", 0.3, 0.1);
  playNoise(0.15, 0.06, 0.05);
  playTone(80, "sine", 0.3, 0.08, 0.15);
}

/** ═══ MESSAGE SENT — Chat message whoosh ═══ */
export function playMessageSent() {
  playSweep(400, 1600, "sine", 0.15, 0.06);
  playTone(1600, "triangle", 0.08, 0.04, 0.1);
}

/** ═══ MESSAGE RECEIVED — Incoming message ping ═══ */
export function playMessageReceived() {
  playTone(1200, "sine", 0.08, 0.08);
  playTone(1600, "sine", 0.1, 0.06, 0.08);
}

/** ═══ PHOTO SNAP — Photo taken ═══ */
export function playPhotoSnap() {
  playCameraShutter();
  playTone(2000, "sine", 0.1, 0.05, 0.12);
}
