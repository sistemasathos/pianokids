let ctx: AudioContext | null = null;
let unlocked = false;
let unlocking: Promise<boolean> | null = null;

function Ctor(): typeof AudioContext {
  return window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
}

function getCtx(): AudioContext {
  if (!ctx) ctx = new (Ctor())();
  return ctx;
}

export async function unlockAudio(): Promise<boolean> {
  if (unlocking) return unlocking;
  unlocking = (async () => {
    try {
      const audio = getCtx();
      if (audio.state === "suspended" || (audio.state as string) === "interrupted") {
        await audio.resume();
      }
      if (!unlocked) {
        const buffer = audio.createBuffer(1, 1, audio.sampleRate);
        const source = audio.createBufferSource();
        source.buffer = buffer;
        source.connect(audio.destination);
        source.start(0);
        unlocked = true;
      }
      return audio.state === "running";
    } catch {
      return false;
    } finally {
      unlocking = null;
    }
  })();
  return unlocking;
}

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function startPiano(audio: AudioContext, midi: number, duration: number): void {
  const t = audio.currentTime;
  const freq = midiToFreq(midi);
  const master = audio.createGain();
  const filter = audio.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(Math.min(4800, 1200 + freq * 3.2), t);
  filter.Q.value = 0.8;

  const partials: Array<[number, OscillatorType, number]> = [
    [1, "sine", 0.42],
    [2, "sine", 0.2],
    [3, "sine", 0.08],
    [1, "triangle", 0.12],
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

  master.gain.setValueAtTime(0.001, t);
  master.gain.linearRampToValueAtTime(0.95, t + 0.015);
  master.gain.exponentialRampToValueAtTime(0.32, t + 0.12);
  master.gain.exponentialRampToValueAtTime(0.001, t + duration + 0.45);
  filter.connect(master).connect(audio.destination);
}

export function playPiano(midi: number, duration = 0.45): void {
  try {
    const audio = getCtx();
    const go = (): void => {
      if (audio.state !== "running") return;
      startPiano(audio, midi, duration);
    };
    if (audio.state !== "running") {
      void audio.resume().then(go).catch(() => undefined);
      return;
    }
    go();
  } catch {
    /* keep taps working even if audio fails */
  }
}

export function playMissThud(): void {
  try {
    const audio = getCtx();
    const go = (): void => {
      if (audio.state !== "running") return;
      const t = audio.currentTime;
      const osc = audio.createOscillator();
      const g = audio.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.exponentialRampToValueAtTime(70, t + 0.12);
      g.gain.setValueAtTime(0.18, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      osc.connect(g).connect(audio.destination);
      osc.start(t);
      osc.stop(t + 0.16);
    };
    if (audio.state !== "running") {
      void audio.resume().then(go).catch(() => undefined);
      return;
    }
    go();
  } catch {
    /* ignore */
  }
}
