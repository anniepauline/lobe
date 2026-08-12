export interface ToastButton {
  label: string;
  color?: string;
  onClick: () => void;
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
  #dismissTimer: number | null = null;

  constructor() {
    this.host = document.createElement("div");
    this.host.dataset.lobeUi = "toast";
    this.host.style.cssText =
      "position:fixed;inset:auto 20px 24px auto;z-index:2147483647;pointer-events:none";
    this.root = this.host.attachShadow({ mode: "closed" });
    this.root.innerHTML = `<style>
      :host { color-scheme: light dark; }
      .toast { width:min(360px,calc(100vw - 40px)); box-sizing:border-box; padding:14px; border:1px solid rgba(127,127,127,.26); border-radius:16px; background:rgba(24,24,27,.96); color:#fafafa; box-shadow:0 16px 48px rgba(0,0,0,.3); font:500 14px/1.35 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; pointer-events:auto; animation:enter .16s ease-out; }
      .head { display:flex; align-items:center; gap:10px; }
      .mark { display:grid; place-items:center; width:26px; height:26px; border-radius:9px; background:#f4ede3; color:#27221d; flex:none; }
      .mark svg { width:15px; height:15px; }
      .title { font-weight:700; letter-spacing:-.01em; }
      .detail { color:#b8b8bd; margin:6px 0 0 36px; font-size:13px; }
      .buttons { display:flex; flex-wrap:wrap; gap:7px; margin:12px 0 0 36px; }
      button { appearance:none; border:1px solid rgba(255,255,255,.15); border-radius:9px; padding:7px 10px; color:#f6f6f6; background:#333338; font:650 12px/1 system-ui,-apple-system,sans-serif; cursor:pointer; }
      button:hover { background:#414148; }
      .error .mark { background:#f4d9d4; color:#7c2d22; }
      .success .mark { background:#d9eadf; color:#225f39; }
      @keyframes enter { from { opacity:0; transform:translateY(8px) scale(.98); } }
      @media (prefers-reduced-motion:reduce) { .toast { animation:none; } }
    </style><div id="mount"></div>`;
    document.documentElement.append(this.host);
  }

  show(message: ToastMessage): void {
    if (this.#dismissTimer) {
      window.clearTimeout(this.#dismissTimer);
      this.#dismissTimer = null;
    }

    const mount = this.root.querySelector<HTMLDivElement>("#mount");
    if (!mount) return;
    mount.replaceChildren();

    const toast = document.createElement("div");
    toast.className = `toast ${message.tone ?? "neutral"}`;
    const head = document.createElement("div");
    head.className = "head";
    const mark = document.createElement("span");
    mark.className = "mark";
    mark.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6 3.5A2.5 2.5 0 0 0 3.5 6v15l8.5-5.4 8.5 5.4V6A2.5 2.5 0 0 0 18 3.5H6Zm0 2h12a.5.5 0 0 1 .5.5v11.35L12 13.22l-6.5 4.13V6a.5.5 0 0 1 .5-.5Z"/></svg>`;
    const title = document.createElement("div");
    title.className = "title";
    title.textContent = message.title;
    head.append(mark, title);
    toast.append(head);

    if (message.detail) {
      const detail = document.createElement("div");
      detail.className = "detail";
      detail.textContent = message.detail;
      toast.append(detail);
    }

    if (message.buttons?.length) {
      const buttons = document.createElement("div");
      buttons.className = "buttons";
      for (const action of message.buttons) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = action.label;
        if (action.color) button.style.borderColor = action.color;
        button.addEventListener("click", action.onClick, { once: true });
        buttons.append(button);
      }
      toast.append(buttons);
    }

    mount.append(toast);
    const duration =
      message.duration ?? (message.buttons?.length ? 15_000 : 3_500);
    if (duration > 0) {
      this.#dismissTimer = window.setTimeout(() => this.dismiss(), duration);
    }
  }

  dismiss(): void {
    this.root.querySelector("#mount")?.replaceChildren();
    this.#dismissTimer = null;
  }
}
