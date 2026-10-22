import { playMissThud, playPiano, unlockAudio } from "./audio";
import { DIFFICULTIES } from "./storage";
import type { Difficulty, GameResult, HitMode, Lane, Song, SongNote } from "./types";

interface LiveNote {
  note: SongNote;
  el: HTMLElement;
  hit: boolean;
  missed: boolean;
  judged: boolean;
}

export interface GameHandle {
  destroy: () => void;
}

const HIT_FROM_BOTTOM = 50;
const LANE_KEYS = ["d", "f", "j", "k"] as const;

function starsFromAccuracy(accuracy: number, failed: boolean): number {
  if (failed) return 0;
  if (accuracy >= 0.85) return 3;
  if (accuracy >= 0.65) return 2;
  return 1;
}

function popup(layer: HTMLElement, text: string, lane: number, kind: string): void {
  const el = document.createElement("div");
  el.className = `judge-pop ${kind}`;
  el.textContent = text;
  el.style.left = `${(lane + 0.5) * 25}%`;
  layer.appendChild(el);
  window.setTimeout(() => el.remove(), 700);
}

export function mountGame(
  root: HTMLElement,
  song: Song,
  difficulty: Difficulty,
  soundOn: boolean,
  hitMode: HitMode,
  onEnd: (result: GameResult) => void,
  onQuit: () => void,
): GameHandle {
  const profile = DIFFICULTIES[difficulty];
  const last = song.notes[song.notes.length - 1];
  const totalBeats = last.beat + last.dur;
  const leadIn = profile.lookAheadBeats;
  const useCircles = hitMode === "alvo";

  root.innerHTML = `
    <section class="game-screen" aria-label="Jogo">
      <header class="game-top">
        <button class="icon-btn pause-btn" type="button" aria-label="Pausar">❚❚</button>
        <div class="progress-wrap" aria-hidden="true">
          <div class="progress-bar"><span class="progress-fill"></span></div>
        </div>
        <div class="game-score">0</div>
      </header>
      <p class="game-song-title">${song.title}</p>
      ${
        profile.missEnds
          ? `<div class="lives" aria-label="Vidas">${"<span class='heart'>♥</span>".repeat(profile.maxMisses)}</div>`
          : `<div class="lives calm">Modo calmo</div>`
      }
      <div class="playfield mode-${hitMode}" role="application" aria-label="Quatro pistas">
        <div class="lanes">
          <div class="lane" data-lane="0"></div>
          <div class="lane" data-lane="1"></div>
          <div class="lane" data-lane="2"></div>
          <div class="lane" data-lane="3"></div>
        </div>
        ${
          useCircles
            ? `<div class="hit-row">
          <span class="hit-circle" data-lane="0"></span>
          <span class="hit-circle" data-lane="1"></span>
          <span class="hit-circle" data-lane="2"></span>
          <span class="hit-circle" data-lane="3"></span>
        </div>`
            : ""
        }
        <div class="judge-layer"></div>
      </div>
      <div class="countdown" hidden><span>3</span></div>
      <div class="pause-overlay" hidden>
        <div class="pause-card">
          <h2>Pausa</h2>
          <button class="btn primary resume-btn" type="button">Continuar</button>
          <button class="btn ghost quit-btn" type="button">Sair</button>
        </div>
      </div>
    </section>
  `;

  const playfield = root.querySelector(".playfield") as HTMLElement;
  const laneEls = [...root.querySelectorAll<HTMLElement>(".lane")];
  const circles = [...root.querySelectorAll<HTMLElement>(".hit-circle")];
  const fill = root.querySelector(".progress-fill") as HTMLElement;
  const scoreEl = root.querySelector(".game-score") as HTMLElement;
  const judgeLayer = root.querySelector(".judge-layer") as HTMLElement;
  const countdownEl = root.querySelector(".countdown") as HTMLElement;
  const pauseOverlay = root.querySelector(".pause-overlay") as HTMLElement;
  const livesEl = root.querySelector(".lives") as HTMLElement;

  const live: LiveNote[] = song.notes.map((note) => {
    const el = document.createElement("button");
    el.type = "button";
    el.className = `tile lane-${note.lane}`;
    el.style.visibility = "hidden";
    el.setAttribute("aria-hidden", "true");
    el.tabIndex = -1;
    laneEls[note.lane].appendChild(el);
    return { note, el, hit: false, missed: false, judged: false };
  });

  let destroyed = false;
  let raf = 0;
  let paused = true;
  let counting = true;
  let currentBeat = 0;
  let lastTs = 0;
  let score = 0;
  let hits = 0;
  let perfects = 0;
  let misses = 0;
  let combo = 0;
  let ended = false;
  let fieldH = playfield.clientHeight;

  const onResize = (): void => {
    fieldH = playfield.clientHeight;
  };
  window.addEventListener("resize", onResize);

  function bpmNow(): number {
    const p = Math.min(1, Math.max(0, currentBeat / totalBeats));
    return profile.bpm * (1 + (profile.ramp - 1) * p);
  }

  function yFor(note: SongNote, el: HTMLElement): number {
    const spawn = note.beat + leadIn - profile.lookAheadBeats;
    const t = (currentBeat - spawn) / profile.lookAheadBeats;
    const tileH = el.offsetHeight || fieldH * 0.72;
    const hitY = fieldH - HIT_FROM_BOTTOM;
    return -tileH + t * (hitY + tileH * 0.12);
  }

  function placeTiles(): void {
    for (const n of live) {
      if (n.judged) continue;
      const spawn = n.note.beat + leadIn - profile.lookAheadBeats;
      const t = (currentBeat - spawn) / profile.lookAheadBeats;
      n.el.style.visibility = t < -0.05 ? "hidden" : "visible";
      n.el.style.transform = `translate3d(0, ${yFor(n.note, n.el)}px, 0)`;
    }
  }

  function updateLives(): void {
    if (!profile.missEnds) return;
    const left = Math.max(0, profile.maxMisses - misses);
    livesEl.innerHTML = Array.from({ length: profile.maxMisses }, (_, i) =>
      `<span class="heart${i < left ? "" : " empty"}">♥</span>`,
    ).join("");
  }

  function finish(failed: boolean): void {
    if (ended) return;
    ended = true;
    paused = true;
    const accuracy = song.notes.length ? hits / song.notes.length : 0;
    const result: GameResult = {
      songId: song.id,
      score,
      hits,
      perfects,
      misses,
      total: song.notes.length,
      stars: starsFromAccuracy(accuracy, failed),
      failed,
      accuracy,
    };
    window.setTimeout(() => {
      if (!destroyed) onEnd(result);
    }, failed ? 700 : 550);
  }

  function registerMiss(lane: Lane | null): void {
    misses += 1;
    combo = 0;
    updateLives();
    if (soundOn) playMissThud();
    if (lane !== null) {
      laneEls[lane].classList.add("shake");
      window.setTimeout(() => laneEls[lane].classList.remove("shake"), 220);
      popup(judgeLayer, "Ops", lane, "miss");
    }
    if (profile.missEnds && misses >= profile.maxMisses) {
      playfield.classList.add("failed");
      finish(true);
    }
  }

  function hitPadPx(): number {
    if (profile.id === "iniciante") return 78;
    if (profile.id === "mediano") return 40;
    return 22;
  }

  function distToHit(n: LiveNote): number {
    const tile = n.el.getBoundingClientRect();
    const circle = circles[n.note.lane];
    if (!circle) return 0;
    const circleBox = circle.getBoundingClientRect();
    const tileY = tile.top + tile.height * 0.82;
    const circleY = circleBox.top + circleBox.height / 2;
    return tileY - circleY;
  }

  function visibleInLane(lane: Lane): LiveNote[] {
    return live.filter(
      (n) => n.note.lane === lane && !n.judged && n.el.style.visibility !== "hidden",
    );
  }

  function applyHit(best: LiveNote, lane: Lane, perfect: boolean): void {
    best.judged = true;
    best.hit = true;
    hits += 1;
    combo += 1;
    if (perfect) {
      perfects += 1;
      score += 300 + Math.min(combo, 12) * 10;
      popup(judgeLayer, "Perfeito!", lane, "perfect");
    } else {
      score += 150 + Math.min(combo, 12) * 5;
      popup(judgeLayer, "Boa!", lane, "good");
    }
    scoreEl.textContent = String(score);
    best.el.classList.add(perfect ? "hit-perfect" : "hit-good");
    circles[lane]?.classList.add("flash");
    window.setTimeout(() => {
      best.el.remove();
      circles[lane]?.classList.remove("flash");
    }, 160);
    if (soundOn) playPiano(best.note.midi, Math.max(0.28, best.note.dur * (60 / bpmNow()) * 0.85));
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(12);
  }

  function judgeTap(lane: Lane): void {
    if (paused || ended || counting) return;
    unlockAudio();
    if (!useCircles) {
      const candidates = visibleInLane(lane);
      if (!candidates.length) {
        if (!profile.ignoreEmptyTaps) registerMiss(lane);
        return;
      }
      let best = candidates[0];
      let bestBottom = best.el.getBoundingClientRect().bottom;
      for (const n of candidates) {
        const bottom = n.el.getBoundingClientRect().bottom;
        if (bottom > bestBottom) {
          best = n;
          bestBottom = bottom;
        }
      }
      const field = playfield.getBoundingClientRect();
      const perfect = bestBottom > field.top + field.height * 0.45;
      applyHit(best, lane, perfect);
      return;
    }

    const pad = hitPadPx();
    let best: LiveNote | null = null;
    let bestAbs = Infinity;
    for (const n of live) {
      if (n.note.lane !== lane || n.judged) continue;
      if (n.el.style.visibility === "hidden") continue;
      const abs = Math.abs(distToHit(n));
      if (abs < bestAbs) {
        bestAbs = abs;
        best = n;
      }
    }
    if (!best || bestAbs > pad) {
      if (!profile.ignoreEmptyTaps) registerMiss(lane);
      return;
    }
    applyHit(best, lane, bestAbs <= pad * 0.42);
  }

  function tick(ts: number): void {
    if (destroyed) return;
    raf = requestAnimationFrame(tick);
    if (!lastTs) lastTs = ts;
    const dt = Math.min(48, ts - lastTs);
    lastTs = ts;
    if (paused || ended) return;

    currentBeat += (dt / 1000) * (bpmNow() / 60);
    fill.style.width = `${Math.min(100, (currentBeat / (totalBeats + leadIn)) * 100)}%`;
    const pad = hitPadPx();
    const fieldBox = playfield.getBoundingClientRect();

    let remaining = 0;
    for (const n of live) {
      if (n.judged) continue;
      remaining += 1;
      const spawn = n.note.beat + leadIn - profile.lookAheadBeats;
      const t = (currentBeat - spawn) / profile.lookAheadBeats;
      n.el.style.visibility = t < -0.05 ? "hidden" : "visible";
      n.el.style.transform = `translate3d(0, ${yFor(n.note, n.el)}px, 0)`;
      const tileBox = n.el.getBoundingClientRect();
      if (useCircles) {
        const dist = distToHit(n);
        const near = Math.abs(dist) <= pad * 1.25;
        n.el.classList.toggle("near", near);
        circles[n.note.lane]?.classList.toggle("hot", near && !n.judged);
        if (!n.missed && dist > pad) {
          n.missed = true;
          n.judged = true;
          n.el.classList.add("missed");
          window.setTimeout(() => n.el.remove(), 180);
          registerMiss(n.note.lane);
        }
      } else {
        n.el.classList.toggle("near", t >= 0 && t < 1.2);
        if (!n.missed && tileBox.top > fieldBox.bottom - 6) {
          n.missed = true;
          n.judged = true;
          n.el.classList.add("missed");
          window.setTimeout(() => n.el.remove(), 180);
          registerMiss(n.note.lane);
        }
      }
    }

    if (remaining === 0 && !ended) finish(false);
  }

  function onPointer(ev: PointerEvent): void {
    if (ev.button !== undefined && ev.button !== 0) return;
    const rect = playfield.getBoundingClientRect();
    if (ev.clientY < rect.top || ev.clientY > rect.bottom) return;
    const x = ev.clientX - rect.left;
    const lane = Math.min(3, Math.max(0, Math.floor(x / (rect.width / 4)))) as Lane;
    judgeTap(lane);
  }

  function onKey(ev: KeyboardEvent): void {
    const i = LANE_KEYS.indexOf(ev.key.toLowerCase() as (typeof LANE_KEYS)[number]);
    if (i >= 0) {
      ev.preventDefault();
      judgeTap(i as Lane);
    } else if (ev.key === "Escape") {
      togglePause(true);
    }
  }

  function togglePause(show: boolean): void {
    if (ended || counting) return;
    paused = show;
    pauseOverlay.hidden = !show;
    if (!show) lastTs = 0;
  }

  root.querySelector(".pause-btn")?.addEventListener("click", () => togglePause(true));
  root.querySelector(".resume-btn")?.addEventListener("click", () => togglePause(false));
  root.querySelector(".quit-btn")?.addEventListener("click", () => {
    destroyed = true;
    onQuit();
  });
  playfield.addEventListener("pointerdown", onPointer);
  window.addEventListener("keydown", onKey);
  document.addEventListener("visibilitychange", onVis);

  function onVis(): void {
    if (document.hidden && !ended && !counting) togglePause(true);
  }

  function startCountdown(): void {
    countdownEl.hidden = false;
    const nums = ["3", "2", "1", "Toca!"];
    let i = 0;
    const step = (): void => {
      if (destroyed) return;
      if (i >= nums.length) {
        countdownEl.hidden = true;
        counting = false;
        paused = false;
        lastTs = 0;
        raf = requestAnimationFrame(tick);
        return;
      }
      countdownEl.querySelector("span")!.textContent = nums[i];
      i += 1;
      window.setTimeout(step, i === nums.length ? 420 : 650);
    };
    step();
  }

  requestAnimationFrame(placeTiles);
  startCountdown();

  return {
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onVis);
    },
  };
}
