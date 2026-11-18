// Звуки синтезируются на лету — файлов нет.
let AC = null, master = null, noiseBuf = null;

export function initAudio() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    master = AC.createGain(); master.gain.value = 0.7; master.connect(AC.destination);
    noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  } catch (e) { AC = null; }
}
function env(g, t, vol, a, dur) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
}
function tone(type, f0, f1, dur, vol = 0.25, delay = 0, a = 0.01) {
  if (!AC) return;
  const t = AC.currentTime + delay, o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  env(g, t, vol, a, dur); o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
}
function noise(dur, vol, ft, freq, delay = 0, q = 1, a = 0.005) {
  if (!AC) return;
  const t = AC.currentTime + delay, s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
  s.buffer = noiseBuf; s.loop = true; f.type = ft; f.frequency.value = freq; f.Q.value = q;
  env(g, t, vol, a, dur); s.connect(f); f.connect(g); g.connect(master);
  s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
}

export const SFX = {
  step() { noise(0.04, 0.08, 'lowpass', 600 + Math.random() * 300); },
  jump() { tone('sine', 300, 720, 0.16, 0.2); },
  land() { noise(0.08, 0.18, 'lowpass', 380); },
  pick() { tone('triangle', 520, 1100, 0.12, 0.25); tone('triangle', 780, 1500, 0.12, 0.2, 0.1); },
  place() { [660, 880, 1100].forEach((f, i) => tone('sine', f, f, 0.15, 0.2, i * 0.08)); },
  caught() { tone('sine', 520, 200, 0.35, 0.25); noise(0.15, 0.3, 'lowpass', 500, 0.05); },
  meow() { tone('triangle', 560, 900, 0.16, 0.13); tone('triangle', 900, 520, 0.32, 0.13, 0.15); },
  purr() { for (let i = 0; i < 3; i++) noise(0.22, 0.1, 'lowpass', 150, i * 0.28, 1, 0.08); },
  rustle() { noise(0.3, 0.25, 'bandpass', 3200, 0, 0.6); },
  nope() { tone('square', 220, 150, 0.2, 0.07); },
  hatch() { noise(0.07, 0.5, 'highpass', 1700); [523, 659, 784, 1047].forEach((f, i) => tone('triangle', f, f, 0.25, 0.22, 0.1 + i * 0.1)); },
  coins() { for (let i = 0; i < 5; i++) tone('sine', 1300 + i * 120, 1700 + i * 120, 0.08, 0.12, i * 0.05); },
  tap() { tone('sine', 660, 660, 0.06, 0.15); },
  buy() { tone('triangle', 660, 990, 0.1, 0.22); tone('triangle', 990, 1320, 0.14, 0.2, 0.09); },
  levelUp() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone('triangle', f, f, 0.2, 0.22, i * 0.08)); },
  banana() { tone('sine', 400, 260, 0.15, 0.2); },
  slip() { tone('sine', 900, 200, 0.4, 0.2); },
  yawn() { tone('sine', 520, 240, 1.3, 0.2, 0, 0.2); },
  fanfare() { [523, 659, 784, 1047].forEach((f, i) => tone('triangle', f, f, 0.28, 0.25, i * 0.12)); tone('triangle', 1047, 1047, 0.7, 0.25, 0.5); },
  collect() { tone('triangle', 880, 1320, 0.08, 0.18); },
  chop() { noise(0.06, 0.45, 'bandpass', 900, 0, 1.5); tone('square', 180, 120, 0.06, 0.08); },
  mine() { noise(0.05, 0.4, 'highpass', 2600); tone('square', 900, 700, 0.05, 0.06); },
  climb() { tone('sine', 300, 900, 0.7, 0.15, 0, 0.05); },
  chest() { [659, 784, 988, 1319].forEach((f, i) => tone('triangle', f, f, 0.2, 0.22, i * 0.08)); },
  craft() { for (let i = 0; i < 3; i++) noise(0.05, 0.4, 'bandpass', 1400, i * 0.12, 2); [784, 1047, 1319].forEach((f, i) => tone('triangle', f, f, 0.25, 0.22, 0.4 + i * 0.1)); },
  portal() { tone('sine', 300, 1200, 0.45, 0.2); tone('triangle', 600, 2000, 0.4, 0.12, 0.08); },
  star() { [988, 1319, 1568, 1976, 2637].forEach((f, i) => tone('triangle', f, f, 0.22, 0.2, i * 0.07)); },
  boing() { tone('sine', 160, 640, 0.25, 0.35); tone('sine', 640, 220, 0.35, 0.25, 0.24); },
  pop() { tone('sine', 900, 1800, 0.06, 0.14); },
  kick() { noise(0.06, 0.4, 'lowpass', 700); tone('sine', 180, 90, 0.1, 0.2); },
  quack() { tone('sawtooth', 520, 380, 0.12, 0.07); tone('sawtooth', 500, 360, 0.12, 0.07, 0.16); },
  note(i = 0) { const f = [523, 659, 784, 988][i % 4]; tone('triangle', f, f, 0.35, 0.24); },
  boom() { noise(0.5, 0.4, 'lowpass', 300); tone('sine', 1400, 300, 0.4, 0.06, 0.05); },
  refill() { [784, 988, 1175].forEach((f, i) => tone('sine', f, f, 0.2, 0.12, i * 0.07)); },
  bell() { for (let i = 0; i < 6; i++) { tone('triangle', 1568, 1568, 0.18, 0.1, i * 0.16); tone('sine', 1175, 1175, 0.18, 0.06, i * 0.16 + 0.08); } },   // школьный звонок
  // аквапарк: «плюх» в бассейн и свист на горке
  splash() { noise(0.5, 0.45, 'lowpass', 900, 0, 0.8); noise(0.25, 0.25, 'bandpass', 2400, 0.05, 1); for (let i = 0; i < 4; i++) tone('sine', 300 + Math.random() * 300, 700 + Math.random() * 400, 0.08, 0.08, 0.15 + i * 0.07); },
  whoosh() { noise(0.9, 0.22, 'bandpass', 1400, 0, 2.5, 0.25); tone('sine', 500, 900, 0.6, 0.06, 0.05, 0.2); },
};
