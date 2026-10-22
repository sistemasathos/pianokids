let ctx: AudioContext | null = null;
let unlocked = false;

function getCtx(): AudioContext {
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new Ctor();
  }
  return ctx;
}

export function unlockAudio(): void {
  const audio = getCtx();
  if (audio.state === "suspended") {
    void audio.resume();
  }
  if (!unlocked) {
    const buffer = audio.createBuffer(1, 1, 22050);
    const source = audio.createBufferSource();
    source.buffer = buffer;
    source.connect(audio.destination);
    source.start(0);
    unlocked = true;
  }
}

export function isSoundReady(): boolean {
  return unlocked && !!ctx && ctx.state === "running";
}

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function playPiano(midi: number, duration = 0.45): void {
  const audio = getCtx();
  if (audio.state === "suspended") return;
  const t = audio.currentTime;
  const freq = midiToFreq(midi);
  const master = audio.createGain();
  const filter = audio.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(Math.min(4200, 900 + freq * 3.2), t);
  filter.Q.value = 0.7;

  const partials: Array<[number, OscillatorType, number]> = [
    [1, "sine", 0.38],
    [2, "sine", 0.16],
    [3, "sine", 0.07],
    [1, "triangle", 0.09],
  ];

  for (const [mult, type, gain] of partials) {
    const osc = audio.createOscillator();
    const g = audio.createGain();
    osc.type = type;
    osc.frequency.value = freq * mult;
    g.gain.value = gain;
    osc.connect(g).connect(filter);
    osc.start(t);
    osc.stop(t + duration + 0.55);
  }

  master.gain.setValueAtTime(0.0001, t);
  master.gain.exponentialRampToValueAtTime(0.85, t + 0.012);
  master.gain.exponentialRampToValueAtTime(0.28, t + 0.11);
  master.gain.exponentialRampToValueAtTime(0.0001, t + duration + 0.42);

  filter.connect(master).connect(audio.destination);
}

export function playMissThud(): void {
  const audio = getCtx();
  if (audio.state === "suspended") return;
  const t = audio.currentTime;
  const osc = audio.createOscillator();
  const g = audio.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(180, t);
  osc.frequency.exponentialRampToValueAtTime(70, t + 0.12);
  g.gain.setValueAtTime(0.12, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
  osc.connect(g).connect(audio.destination);
  osc.start(t);
  osc.stop(t + 0.16);
}
