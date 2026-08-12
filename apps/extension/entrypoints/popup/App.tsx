import { ArrowUpRight01Icon, Settings02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ExtensionStatus } from "@lobe/shared";
import { Alert, AlertDescription } from "@lobe/ui/components/alert";
import { Button } from "@lobe/ui/components/button";
import { Card, CardContent } from "@lobe/ui/components/card";
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
        <Button
          variant="outline"
          size="icon-lg"
          className="icon-button"
          type="button"
          aria-label="Open settings"
          onClick={() => void browser.runtime.openOptionsPage()}
        >
          <HugeiconsIcon icon={Settings02Icon} size={17} strokeWidth={2} />
        </Button>
      </header>

      <Card className="status-panel" size="sm">
        <CardContent>
          <div className={`status-dot ${state.tone}`} />
          <div>
            <strong>{state.label}</strong>
            <p>
              {status?.configured
                ? "Use X’s bookmark button. Lobe organizes each save quietly."
                : "Connect your Lobe server, then bookmark on X as usual."}
            </p>
          </div>
        </CardContent>
      </Card>

      {status?.ai === "fallback" && (
        <Alert className="fallback">
          <AlertDescription>
            AI key missing, local categorization is active.
          </AlertDescription>
        </Alert>
      )}

      <Button
        size="lg"
        className="primary open-library"
        type="button"
        onClick={() => void browser.tabs.create({ url: appUrl })}
      >
        Open library
        <HugeiconsIcon icon={ArrowUpRight01Icon} size={16} strokeWidth={2} />
      </Button>
    </main>
  );
}
