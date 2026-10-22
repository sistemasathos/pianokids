export type Lane = 0 | 1 | 2 | 3;
export type Difficulty = "iniciante" | "mediano" | "avancado";
export type HitMode = "teclas" | "alvo";
export type SongLevel = "facil" | "medio";

export interface SongNote {
  midi: number;
  beat: number;
  dur: number;
  lane: Lane;
}

export interface Song {
  id: string;
  title: string;
  composer: string;
  level: SongLevel;
  notes: SongNote[];
}

export interface SongProgress {
  stars: number;
  bestScore: number;
}

export interface SaveState {
  difficulty: Difficulty;
  hitMode: HitMode;
  sound: boolean;
  progress: Record<string, SongProgress>;
}

export interface DifficultyProfile {
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

export interface GameResult {
  songId: string;
  score: number;
  hits: number;
  perfects: number;
  misses: number;
  total: number;
  stars: number;
  failed: boolean;
  accuracy: number;
}
