import { playPiano, unlockAudio } from "./audio";
import { mountGame, type GameHandle } from "./game";
import { registerPwa, watchInstallPrompt, type BeforeInstallPromptEvent } from "./pwa";
import { renderReady, renderResult, renderSettings, renderSongList, toast } from "./screens";
import { SONGS, isUnlocked } from "./songs";
import { loadSave, recordResult, writeSave } from "./storage";
import type { GameResult, SaveState, Song } from "./types";
import "./style.css";

type Screen = "songs" | "ready" | "game" | "result" | "settings";

const appEl = document.querySelector<HTMLDivElement>("#app");
if (!appEl) throw new Error("PianoKids: #app em falta");
const app: HTMLElement = appEl;

let save: SaveState = loadSave();
let screen: Screen = "songs";
let currentSong: Song = SONGS[0];
let lastResult: GameResult | null = null;
let game: GameHandle | null = null;
let installEvent: BeforeInstallPromptEvent | null = null;

function persist(): void {
  writeSave(save);
}

function goSongs(): void {
  screen = "songs";
  game?.destroy();
  game = null;
  renderSongList(app, save, {
    onPlay: (song) => {
      currentSong = song;
      goReady();
    },
    onSettings: goSettings,
    installEvent,
    onInstall: async () => {
      if (!installEvent) return;
      await installEvent.prompt();
      installEvent = null;
      goSongs();
    },
  });
}

function goReady(): void {
  screen = "ready";
  renderReady(app, currentSong, save, goSongs, goGame);
}

function goGame(): void {
  screen = "game";
  game?.destroy();
  void unlockAudio();
  if (save.sound) playPiano(60, 0.35);
  game = mountGame(
    app,
    currentSong,
    save.difficulty,
    save.sound,
    save.hitMode,
    (result) => {
      lastResult = result;
      if (!result.failed && result.stars >= 1) {
        save = recordResult(save, currentSong.id, result.stars, result.score);
      } else if (!result.failed) {
        save = recordResult(save, currentSong.id, result.stars, result.score);
      } else if (result.score > (save.progress[currentSong.id]?.bestScore ?? 0)) {
        save = recordResult(save, currentSong.id, save.progress[currentSong.id]?.stars ?? 0, result.score);
      }
      goResult();
    },
    goSongs,
  );
}

function goResult(): void {
  screen = "result";
  game?.destroy();
  game = null;
  if (!lastResult) {
    goSongs();
    return;
  }
  const idx = SONGS.findIndex((s) => s.id === currentSong.id);
  const next = idx >= 0 && idx < SONGS.length - 1 && isUnlocked(idx + 1, save.progress) ? SONGS[idx + 1] : null;
  renderResult(
    app,
    currentSong,
    lastResult,
    next,
    () => goReady(),
    () => {
      if (next) {
        currentSong = next;
        goReady();
      }
    },
    goSongs,
  );
}

function goSettings(): void {
  screen = "settings";
  renderSettings(
    app,
    save,
    (patch) => {
      save = { ...save, ...patch };
      persist();
      if (patch.hitMode) toast(patch.hitMode === "teclas" ? "Modo Teclas guardado neste aparelho." : "Modo Alvo guardado neste aparelho.");
      if (patch.difficulty) toast(`${patch.difficulty === "iniciante" ? "Iniciante" : patch.difficulty === "mediano" ? "Mediano" : "Avançado"} guardado neste aparelho.`);
      goSettings();
    },
    goSongs,
  );
}

document.addEventListener("pointerdown", () => {
  void unlockAudio();
});

watchInstallPrompt((event) => {
  installEvent = event;
  if (screen === "songs") goSongs();
});

registerPwa();
goSongs();
