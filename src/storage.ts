import type { Difficulty, HitMode, SaveState } from "./types";

const KEY = "pianokids-save-v1";

const DEFAULT_SAVE: SaveState = {
  difficulty: "iniciante",
  hitMode: "teclas",
  sound: true,
  progress: {},
};

export const DIFFICULTIES: Record<
  Difficulty,
  {
    id: Difficulty;
    title: string;
    blurb: string;
    bpm: number;
    ramp: number;
    windowMs: number;
    lookAheadBeats: number;
    missEnds: boolean;
    maxMisses: number;
    ignoreEmptyTaps: boolean;
  }
> = {
  iniciante: {
    id: "iniciante",
    title: "Iniciante",
    blurb: "Bem devagar. Erros não param a música — só baixam as estrelas.",
    bpm: 44,
    ramp: 1.3,
    windowMs: 420,
    lookAheadBeats: 4,
    missEnds: false,
    maxMisses: Infinity,
    ignoreEmptyTaps: true,
  },
  mediano: {
    id: "mediano",
    title: "Mediano",
    blurb: "Andamento médio. Alguns erros são permitidos.",
    bpm: 72,
    ramp: 1.6,
    windowMs: 200,
    lookAheadBeats: 3.2,
    missEnds: true,
    maxMisses: 5,
    ignoreEmptyTaps: false,
  },
  avancado: {
    id: "avancado",
    title: "Avançado",
    blurb: "Rápido, janela apertada. Poucos erros.",
    bpm: 112,
    ramp: 2,
    windowMs: 120,
    lookAheadBeats: 2.6,
    missEnds: true,
    maxMisses: 2,
    ignoreEmptyTaps: false,
  },
};

export function loadSave(): SaveState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_SAVE, progress: {} };
    const parsed = JSON.parse(raw) as Partial<SaveState>;
    const difficulty: Difficulty =
      parsed.difficulty === "mediano" || parsed.difficulty === "avancado" || parsed.difficulty === "iniciante"
        ? parsed.difficulty
        : "iniciante";
    const hitMode: HitMode = parsed.hitMode === "alvo" ? "alvo" : "teclas";
    return {
      difficulty,
      hitMode,
      sound: parsed.sound !== false,
      progress: parsed.progress && typeof parsed.progress === "object" ? parsed.progress : {},
    };
  } catch {
    return { ...DEFAULT_SAVE, progress: {} };
  }
}

export function writeSave(save: SaveState): void {
  localStorage.setItem(KEY, JSON.stringify(save));
}

export function recordResult(save: SaveState, songId: string, stars: number, score: number): SaveState {
  const prev = save.progress[songId];
  const nextStars = Math.max(prev?.stars ?? 0, stars);
  const nextScore = Math.max(prev?.bestScore ?? 0, score);
  save.progress[songId] = { stars: nextStars, bestScore: nextScore };
  writeSave(save);
  return save;
}
