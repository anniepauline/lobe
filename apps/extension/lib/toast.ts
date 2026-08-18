import type { IntentId } from "@lobe/shared";
import { createElement } from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";

import { FeedbackToast, ToastNotice } from "./toast-ui";

export interface ToastButton {
  label: string;
  color?: string;
  onClick: () => void;
}

export interface FeedbackPrompt {
  intents: IntentId[];
  selectedIntent: IntentId;
  onSubmit: (intent: IntentId, reason: string) => Promise<void>;
  onDismiss: () => Promise<void>;
}

export interface ToastMessage {
  title: string;
  detail?: string | undefined;
  tone?: "neutral" | "success" | "error";
  buttons?: ToastButton[];
  duration?: number;
}

export class LobeToast {
  readonly host: HTMLDivElement;
  readonly root: ShadowRoot;
  readonly #reactRoot: Root;
  #dismissTimer: number | null = null;
  #feedbackVersion = 0;
  #mode: "idle" | "toast" | "feedback" = "idle";

  constructor() {
    this.host = document.createElement("div");
    this.host.dataset.lobeUi = "toast";
    this.host.style.cssText =
      "position:fixed;inset:auto 20px 24px auto;z-index:2147483647;pointer-events:none";
    this.root = this.host.attachShadow({ mode: "closed" });
    for (const eventType of ["keydown", "keypress", "keyup"]) {
      this.root.addEventListener(eventType, (event) => event.stopPropagation());
      window.addEventListener(
        eventType,
        (event) => {
          if (event.composedPath().includes(this.host)) {
            event.stopImmediatePropagation();
          }
        },
        true,
      );
    }
    this.root.innerHTML = `<style>
      :host { color-scheme: dark; }
      * { box-sizing:border-box; }
      .toast { width:min(380px,calc(100vw - 40px)); box-sizing:border-box; padding:14px; border:1px solid #27272a; border-radius:16px; background:rgba(0,0,0,.97); color:#fafafa; box-shadow:0 18px 60px rgba(0,0,0,.48); font:500 14px/1.4 "Geist Variable",Geist,ui-sans-serif,sans-serif; pointer-events:auto; animation:enter .16s ease-out; }
      .head { display:flex; align-items:center; gap:10px; }
      .mark { display:grid; place-items:center; width:26px; height:26px; border-radius:8px; background:#fafafa; color:#09090b; flex:none; }
      .mark svg { width:15px; height:15px; }
      .title { font-weight:680; letter-spacing:-.015em; }
      .detail { color:#a1a1aa; margin:6px 0 0 36px; font-size:13px; }
      .buttons { display:flex; flex-wrap:wrap; gap:7px; margin:12px 0 0 36px; }
      button,textarea { font:inherit; }
      button { appearance:none; border:1px solid #3f3f46; border-radius:9px; padding:7px 10px; color:#f4f4f5; background:#18181b; font-size:12px; font-weight:650; cursor:pointer; }
      button:hover { border-color:#52525b; background:#27272a; }
      button:disabled { cursor:wait; opacity:.55; }
      .error .mark { background:#fb7185; color:#4c0519; }
      .success .mark { background:#34d399; color:#022c22; }
      .prompt-expiry { margin:-2px 0 11px; color:#71717a; font-size:11px; text-align:right; }
      .prompt-label { margin:14px 0 5px; color:#71717a; font-size:10px; font-weight:750; letter-spacing:.09em; text-transform:uppercase; }
      .intent-list { display:flex; flex-wrap:wrap; gap:7px; }
      .intent-list button { padding:7px 9px; }
      .intent-list button[aria-pressed="true"] { border-color:var(--intent); color:#fff; background:color-mix(in srgb,var(--intent) 22%,#09090b); box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--intent) 52%,transparent); }
      textarea { display:block; width:100%; min-height:76px; resize:vertical; margin-top:10px; border:1px solid #27272a; border-radius:10px; outline:0; padding:10px 11px; color:#fafafa; background:#0b0b0d; font-size:13px; line-height:1.4; transition:border-color 120ms ease,background-color 120ms ease; }
      textarea::placeholder { color:#52525b; }
      textarea:hover { border-color:#3f3f46; }
      textarea:focus { border-color:#71717a; background:#0f0f12; }
      .prompt-actions { display:flex; align-items:center; justify-content:flex-end; gap:8px; margin-top:10px; }
      .prompt-actions .quiet { border-color:transparent; color:#a1a1aa; background:transparent; }
      .prompt-actions .submit { border-color:#fafafa; color:#09090b; background:#fafafa; }
      .prompt-actions .submit:hover { background:#e4e4e7; }
      .prompt-error { min-height:17px; margin:7px 0 -4px; color:#fb7185; font-size:11px; }
      @keyframes enter { from { opacity:0; transform:translateY(8px) scale(.98); } }
      @media (prefers-reduced-motion:reduce) { .toast { animation:none; } }
      @media (max-width:520px) { .toast { width:calc(100vw - 24px); } }
    </style><div id="mount"></div>`;
    const mount = this.root.querySelector<HTMLDivElement>("#mount");
    if (!mount) throw new Error("Could not mount the Lobe on-page UI");
    this.#reactRoot = createRoot(mount);
    document.documentElement.append(this.host);
  }

  showFeedback(prompt: FeedbackPrompt): void {
    if (this.#dismissTimer) {
      window.clearTimeout(this.#dismissTimer);
      this.#dismissTimer = null;
    }

    this.#mode = "feedback";
    this.#feedbackVersion += 1;
    flushSync(() =>
      this.#reactRoot.render(
        createElement(FeedbackToast, {
          key: this.#feedbackVersion,
          prompt,
        }),
      ),
    );
  }

  show(message: ToastMessage): void {
    if (this.#dismissTimer) {
      window.clearTimeout(this.#dismissTimer);
      this.#dismissTimer = null;
    }

    this.#mode = "toast";
    flushSync(() =>
      this.#reactRoot.render(createElement(ToastNotice, { message })),
    );
    const duration =
      message.duration ?? (message.buttons?.length ? 15_000 : 3_500);
    if (duration > 0) {
      this.#dismissTimer = window.setTimeout(() => this.dismiss(), duration);
    }
  }

  dismiss(): void {
    flushSync(() => this.#reactRoot.render(null));
    this.#dismissTimer = null;
    this.#mode = "idle";
  }

  isFeedbackVisible(): boolean {
    return this.#mode === "feedback";
  }

  isVisible(): boolean {
    return this.#mode !== "idle";
  }
}
