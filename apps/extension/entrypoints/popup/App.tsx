import type { ExtensionStatus } from "@lobe/shared";
import { ArrowUpRight, Settings2 } from "lucide-react";
import { useEffect, useState } from "react";

import { sendExtensionMessage } from "../../lib/messaging";
import { Logo } from "../../ui/Logo";

const appUrl = import.meta.env.WXT_PUBLIC_APP_URL ?? "http://localhost:5173";

export default function App() {
  const [status, setStatus] = useState<ExtensionStatus | null>(null);

  useEffect(() => {
    void sendExtensionMessage<ExtensionStatus>({ type: "status:get" })
      .then(setStatus)
      .catch(() =>
        setStatus({
          configured: true,
          reachable: false,
          authorized: false,
          model: null,
          ai: null,
        }),
      );
  }, []);

  const state = !status
    ? { label: "Checking connection", tone: "checking" }
    : !status.configured
      ? { label: "Setup needed", tone: "offline" }
      : status.reachable && status.authorized
        ? { label: "Ready on X", tone: "online" }
        : status.reachable
          ? { label: "Check API token", tone: "offline" }
          : { label: "Server offline", tone: "offline" };

  return (
    <main>
      <header>
        <div className="brand">
          <Logo />
          <span>Lobe</span>
        </div>
        <button
          className="icon-button"
          type="button"
          aria-label="Open settings"
          onClick={() => void browser.runtime.openOptionsPage()}
        >
          <Settings2 size={17} strokeWidth={2} />
        </button>
      </header>

      <section className="status-panel">
        <div className={`status-dot ${state.tone}`} />
        <div>
          <strong>{state.label}</strong>
          <p>
            {status?.configured
              ? "Use X’s bookmark button. Lobe organizes each save quietly."
              : "Connect your Lobe server, then bookmark on X as usual."}
          </p>
        </div>
      </section>

      {status?.ai === "fallback" && (
        <div className="fallback">
          AI key missing, local categorization is active.
        </div>
      )}

      <button
        className="primary open-library"
        type="button"
        onClick={() => void browser.tabs.create({ url: appUrl })}
      >
        Open library
        <ArrowUpRight size={16} strokeWidth={2.2} />
      </button>
    </main>
  );
}
