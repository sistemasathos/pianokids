export function registerPwa(): void {
  if (!import.meta.env.PROD) return;
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("./sw.js");
  });
}

export function watchInstallPrompt(onPrompt: (event: BeforeInstallPromptEvent) => void): void {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    onPrompt(event as BeforeInstallPromptEvent);
  });
}

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
