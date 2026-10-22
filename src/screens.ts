import { DIFFICULTIES } from "./storage";
import type { BeforeInstallPromptEvent } from "./pwa";
import { SONGS, isUnlocked } from "./songs";
import type { Difficulty, GameResult, SaveState, Song } from "./types";

function starsHtml(count: number, size = "md"): string {
  const bits = [0, 1, 2].map((i) => `<span class="star ${i < count ? "on" : ""} ${size}">★</span>`).join("");
  return `<span class="stars" aria-label="${count} de 3 estrelas">${bits}</span>`;
}

function logoSvg(): string {
  return `<span class="brand-mark" aria-hidden="true">
    <svg viewBox="0 0 64 64" width="36" height="36">
      <rect x="4" y="10" width="56" height="44" rx="10" fill="#FFB4A2"/>
      <rect x="10" y="18" width="12" height="28" rx="3" fill="#FFF8F0"/>
      <rect x="26" y="18" width="12" height="28" rx="3" fill="#FFF8F0"/>
      <rect x="42" y="18" width="12" height="28" rx="3" fill="#FFF8F0"/>
      <rect x="20" y="18" width="7" height="16" rx="2" fill="#3B3355"/>
      <rect x="36" y="18" width="7" height="16" rx="2" fill="#3B3355"/>
      <path d="M52 14l2.2 4.4 4.8.6-3.5 3.4.9 4.8L52 25.2 47.6 27.2l.9-4.8-3.5-3.4 4.8-.6z" fill="#FFD15C"/>
    </svg>
  </span>`;
}

export function renderSongList(
  root: HTMLElement,
  save: SaveState,
  opts: {
    onPlay: (song: Song) => void;
    onSettings: () => void;
    installEvent: BeforeInstallPromptEvent | null;
    onInstall: () => void;
  },
): void {
  const cards = SONGS.map((song, index) => {
    const unlocked = isUnlocked(index, save.progress);
    const prog = save.progress[song.id];
    const badge = song.level === "facil" ? "Fácil" : "Médio";
    const arrow = index < SONGS.length - 1 ? `<div class="song-arrow ${isUnlocked(index + 1, save.progress) ? "open" : ""}">▼</div>` : "";
    return `
      <article class="song-card ${unlocked ? "" : "locked"}" data-id="${song.id}">
        <div class="song-index ${unlocked ? "free" : ""}">${unlocked ? index + 1 : "🔒"}</div>
        <div class="song-body">
          <h2>${song.title}</h2>
          <p>${song.composer}</p>
          <div class="song-meta">
            <span class="badge ${song.level}">${badge}</span>
            ${starsHtml(prog?.stars ?? 0)}
          </div>
        </div>
        ${
          unlocked
            ? `<button class="btn play" type="button" data-play="${song.id}">Jogar</button>`
            : `<button class="btn play locked-btn" type="button" data-lock="${song.id}">Bloqueada</button>`
        }
      </article>
      ${arrow}
    `;
  }).join("");

  const install = opts.installEvent
    ? `<button class="install-banner" type="button" data-install>Instalar PianoKids no telemóvel</button>`
    : "";

  root.innerHTML = `
    <section class="sheet songs-screen">
      <header class="topbar">
        ${logoSvg()}
        <div>
          <h1>PianoKids</h1>
          <p class="tagline">Toca, ganha estrelas, desbloqueia a próxima</p>
        </div>
      </header>
      ${install}
      <div class="song-list">${cards}</div>
      <nav class="tabbar">
        <button class="tab on" type="button">Músicas</button>
        <button class="tab" type="button" data-settings>Ajustes</button>
      </nav>
    </section>
  `;

  root.querySelector("[data-settings]")?.addEventListener("click", opts.onSettings);
  root.querySelector("[data-install]")?.addEventListener("click", opts.onInstall);
  root.querySelectorAll<HTMLButtonElement>("[data-play]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const song = SONGS.find((s) => s.id === btn.dataset.play);
      if (song) opts.onPlay(song);
    });
  });
  root.querySelectorAll<HTMLButtonElement>("[data-lock]").forEach((btn) => {
    btn.addEventListener("click", () => toast("Ganha 1 estrela na música anterior para desbloquear."));
  });
}

export function renderReady(
  root: HTMLElement,
  song: Song,
  save: SaveState,
  onBack: () => void,
  onStart: () => void,
): void {
  const profile = DIFFICULTIES[save.difficulty];
  const prog = save.progress[song.id];
  const modeName = save.difficulty === "iniciante" ? "Modo calmo" : "Modo clássico";
  root.innerHTML = `
    <section class="sheet ready-screen">
      <header class="ready-head">
        <button class="icon-btn back" type="button" aria-label="Voltar">←</button>
        <div>
          <h1>${song.title}</h1>
          <p>${song.composer}</p>
        </div>
      </header>
      <div class="ready-hero">
        <p class="mode-kicker">${modeName}</p>
        <p class="mode-copy">${profile.blurb}</p>
        <button class="start-key" type="button">Começar</button>
      </div>
      <footer class="ready-foot">
        ${starsHtml(prog?.stars ?? 0, "lg")}
        <div class="best">
          <span>Melhor</span>
          <strong>${prog?.bestScore ?? 0}</strong>
        </div>
      </footer>
    </section>
  `;
  root.querySelector(".back")?.addEventListener("click", onBack);
  root.querySelector(".start-key")?.addEventListener("click", onStart);
}

export function renderResult(
  root: HTMLElement,
  song: Song,
  result: GameResult,
  next: Song | null,
  onReplay: () => void,
  onNext: () => void,
  onList: () => void,
): void {
  const title = result.failed
    ? "Quase!"
    : result.stars >= 3
      ? "Incrível!"
      : result.stars >= 2
        ? "Muito bem!"
        : "Conseguiste!";
  const subtitle = result.failed
    ? "Acabaram as vidas. Tenta outra vez, bem devagar."
    : `${result.hits} acertos de ${result.total} · ${Math.round(result.accuracy * 100)}%`;

  root.innerHTML = `
    <section class="sheet result-screen">
      <div class="confetti" aria-hidden="true"></div>
      <p class="result-kicker">${song.title}</p>
      <h1>${title}</h1>
      <p class="result-sub">${subtitle}</p>
      <div class="result-stars">${starsHtml(result.stars, "xl")}</div>
      <p class="result-score">${result.score} pontos</p>
      <div class="result-actions">
        <button class="btn primary" type="button" data-replay>Tocar de novo</button>
        ${next && result.stars >= 1 ? `<button class="btn mint" type="button" data-next>Próxima música</button>` : ""}
        <button class="btn ghost" type="button" data-list>Lista de músicas</button>
      </div>
    </section>
  `;
  const confetti = root.querySelector(".confetti");
  if (confetti && !result.failed) {
    for (let i = 0; i < 18; i++) {
      const d = document.createElement("span");
      d.style.setProperty("--i", String(i));
      confetti.appendChild(d);
    }
  }
  root.querySelector("[data-replay]")?.addEventListener("click", onReplay);
  root.querySelector("[data-next]")?.addEventListener("click", onNext);
  root.querySelector("[data-list]")?.addEventListener("click", onList);
}

export function renderSettings(
  root: HTMLElement,
  save: SaveState,
  onChange: (patch: Partial<SaveState>) => void,
  onBack: () => void,
): void {
  const cards = (Object.keys(DIFFICULTIES) as Difficulty[])
    .map((id) => {
      const d = DIFFICULTIES[id];
      return `
        <button class="diff-card ${save.difficulty === id ? "on" : ""}" type="button" data-diff="${id}">
          <strong>${d.title}</strong>
          <span>${d.blurb}</span>
          <em>${d.bpm} BPM → ${d.ramp.toFixed(1)}×</em>
        </button>
      `;
    })
    .join("");

  root.innerHTML = `
    <section class="sheet settings-screen">
      <header class="topbar">
        <button class="icon-btn back" type="button" aria-label="Voltar">←</button>
        <div>
          <h1>Ajustes</h1>
          <p class="tagline">Vale para todas as músicas neste aparelho</p>
        </div>
      </header>
      <h2 class="section-title">Como queres tocar?</h2>
      <div class="diff-grid">${cards}</div>
      <label class="sound-row">
        <span>Som do piano</span>
        <input type="checkbox" data-sound ${save.sound ? "checked" : ""} />
      </label>
      <div class="install-help">
        <h2 class="section-title">Instalar o app</h2>
        <p>No telemóvel, abre o menu do navegador e escolhe <strong>Adicionar ao ecrã principal</strong> ou <strong>Instalar aplicação</strong>. PianoKids abre sozinho, sem loja e sem login.</p>
      </div>
      <nav class="tabbar">
        <button class="tab" type="button" data-songs>Músicas</button>
        <button class="tab on" type="button">Ajustes</button>
      </nav>
    </section>
  `;
  root.querySelector(".back")?.addEventListener("click", onBack);
  root.querySelector("[data-songs]")?.addEventListener("click", onBack);
  root.querySelectorAll<HTMLButtonElement>("[data-diff]").forEach((btn) => {
    btn.addEventListener("click", () => onChange({ difficulty: btn.dataset.diff as Difficulty }));
  });
  root.querySelector<HTMLInputElement>("[data-sound]")?.addEventListener("change", (ev) => {
    onChange({ sound: (ev.target as HTMLInputElement).checked });
  });
}

export function toast(message: string): void {
  document.querySelectorAll(".toast").forEach((n) => n.remove());
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  document.body.appendChild(el);
  window.setTimeout(() => el.remove(), 2400);
}
