import type { Lane, Song, SongNote } from "./types";

type Pair = readonly [number, number];

function assignLanes(midis: number[]): Lane[] {
  const unique = [...new Set(midis)].sort((a, b) => a - b);
  const lanes: Lane[] = [];
  let prev: Lane | null = null;
  for (const midi of midis) {
    const idx = unique.indexOf(midi);
    let lane = (unique.length <= 1 ? 1 : Math.round((idx / (unique.length - 1)) * 3)) as Lane;
    if (prev !== null && lane === prev) {
      if (lane < 2) lane = (lane + 1) as Lane;
      else if (lane > 0) lane = (lane - 1) as Lane;
      if (lane === prev) lane = ((prev + 1) % 4) as Lane;
    }
    lanes.push(lane);
    prev = lane;
  }
  return lanes;
}

function melody(id: string, title: string, composer: string, level: Song["level"], pairs: Pair[]): Song {
  const lanes = assignLanes(pairs.map((p) => p[0]));
  const notes: SongNote[] = [];
  let beat = 0;
  pairs.forEach(([midi, dur], i) => {
    notes.push({ midi, beat, dur, lane: lanes[i] });
    beat += dur;
  });
  return { id, title, composer, level, notes };
}

const G3 = 55,
  A3 = 57,
  B3 = 59;
const C4 = 60,
  Cs4 = 61,
  D4 = 62,
  E4 = 64,
  F4 = 65,
  Fs4 = 66,
  G4 = 67,
  Gs4 = 68,
  A4 = 69,
  Bb4 = 70,
  B4 = 71;
const C5 = 72,
  Cs5 = 73,
  D5 = 74,
  Ds5 = 75,
  E5 = 76,
  G5 = 79;

const Q = 1;
const H = 2;
const E = 0.5;

export const SONGS: Song[] = [
  melody("estrelinha", "Brilha, Brilha, Estrelinha", "Música folclórica inglesa", "facil", [
    [C4, Q], [C4, Q], [G4, Q], [G4, Q], [A4, Q], [A4, Q], [G4, H],
    [F4, Q], [F4, Q], [E4, Q], [E4, Q], [D4, Q], [D4, Q], [C4, H],
    [G4, Q], [G4, Q], [F4, Q], [F4, Q], [E4, Q], [E4, Q], [D4, H],
    [C4, Q], [C4, Q], [G4, Q], [G4, Q], [A4, Q], [A4, Q], [G4, H],
    [F4, Q], [F4, Q], [E4, Q], [E4, Q], [D4, Q], [D4, Q], [C4, H],
  ]),
  melody("frei-joao", "Frei João", "Música folclórica francesa", "facil", [
    [C4, Q], [D4, Q], [E4, Q], [C4, Q],
    [C4, Q], [D4, Q], [E4, Q], [C4, Q],
    [E4, Q], [F4, Q], [G4, H],
    [E4, Q], [F4, Q], [G4, H],
    [G4, E], [A4, E], [G4, E], [F4, E], [E4, Q], [C4, Q],
    [G4, E], [A4, E], [G4, E], [F4, E], [E4, Q], [C4, Q],
    [C4, Q], [G3, Q], [C4, H],
    [C4, Q], [G3, Q], [C4, H],
  ]),
  melody("parabens", "Parabéns pra Você", "Patty e Mildred Hill", "facil", [
    [C4, Q], [C4, Q], [D4, Q], [C4, Q], [F4, Q], [E4, H],
    [C4, Q], [C4, Q], [D4, Q], [C4, Q], [G4, Q], [F4, H],
    [C4, Q], [C4, Q], [C5, Q], [A4, Q], [F4, Q], [E4, Q], [D4, H],
    [Bb4, Q], [Bb4, Q], [A4, Q], [F4, Q], [G4, Q], [F4, H],
  ]),
  melody("ode", "Ode à Alegria", "Ludwig van Beethoven", "facil", [
    [E4, Q], [E4, Q], [F4, Q], [G4, Q], [G4, Q], [F4, Q], [E4, Q], [D4, Q],
    [C4, Q], [C4, Q], [D4, Q], [E4, Q], [E4, Q + E], [D4, E], [D4, H],
    [E4, Q], [E4, Q], [F4, Q], [G4, Q], [G4, Q], [F4, Q], [E4, Q], [D4, Q],
    [C4, Q], [C4, Q], [D4, Q], [E4, Q], [D4, Q + E], [C4, E], [C4, H],
  ]),
  melody("sinos", "Os Sinos de Natal", "James Lord Pierpont", "medio", [
    [E4, Q], [E4, Q], [E4, H], [E4, Q], [E4, Q], [E4, H],
    [E4, Q], [G4, Q], [C4, Q], [D4, Q], [E4, H + Q],
    [F4, Q], [F4, Q], [F4, Q], [F4, Q], [F4, Q], [E4, Q], [E4, Q], [E4, E], [E4, E],
    [E4, Q], [D4, Q], [D4, Q], [E4, Q], [D4, H], [G4, H],
    [E4, Q], [E4, Q], [E4, H], [E4, Q], [E4, Q], [E4, H],
    [E4, Q], [G4, Q], [C4, Q], [D4, Q], [E4, H + Q],
    [F4, Q], [F4, Q], [F4, Q], [F4, Q], [F4, Q], [E4, Q], [E4, Q], [E4, E], [E4, E],
    [G4, Q], [G4, Q], [F4, Q], [D4, Q], [C4, H + Q],
  ]),
  melody("canone", "Cânone", "Johann Pachelbel", "medio", [
    [D4, E], [Fs4, E], [A4, E], [D5, E],
    [Cs4, E], [E4, E], [A4, E], [Cs5, E],
    [B3, E], [D4, E], [Fs4, E], [B4, E],
    [Fs4, E], [A4, E], [Cs5, E], [A4, E],
    [G4, E], [B4, E], [D5, E], [G5, E],
    [D4, E], [Fs4, E], [A4, E], [D5, E],
    [G3, E], [B3, E], [D4, E], [G4, E],
    [A3, E], [Cs4, E], [E4, E], [A4, E],
  ]),
  melody("danubio", "O Danúbio Azul", "Johann Strauss II", "medio", [
    [A3, Q],
    [D4, Q], [D4, Q], [Fs4, Q], [A4, Q], [A4, H],
    [B4, Q], [A4, Q], [G4, Q], [Fs4, Q], [E4, H],
    [A3, Q], [A3, Q], [Cs4, Q], [E4, Q], [A4, H],
    [G4, Q], [Fs4, Q], [E4, Q], [D4, Q], [D4, H],
    [A4, Q], [A4, Q], [B4, Q], [Cs5, Q], [D5, H],
    [Cs5, Q], [B4, Q], [A4, Q], [G4, Q], [Fs4, H],
    [G4, Q], [A4, Q], [Fs4, Q], [E4, Q], [D4, H],
  ]),
  melody("elisa", "Para Elisa", "Ludwig van Beethoven", "medio", [
    [E5, E], [Ds5, E], [E5, E], [Ds5, E], [E5, E], [B4, E], [D5, E], [C5, E], [A4, Q],
    [C4, E], [E4, E], [A4, E], [B4, Q],
    [E4, E], [Gs4, E], [B4, E], [C5, Q],
    [E5, E], [Ds5, E], [E5, E], [Ds5, E], [E5, E], [B4, E], [D5, E], [C5, E], [A4, Q],
    [C4, E], [E4, E], [A4, E], [B4, Q],
    [E4, E], [C5, E], [B4, E], [A4, Q + E],
  ]),
];

export function songById(id: string): Song | undefined {
  return SONGS.find((s) => s.id === id);
}

export function isUnlocked(index: number, saveStars: Record<string, { stars: number }>): boolean {
  if (index <= 0) return true;
  const prev = SONGS[index - 1];
  return (saveStars[prev.id]?.stars ?? 0) >= 1;
}
