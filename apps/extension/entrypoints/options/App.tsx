import { Tick02Icon, ViewIcon, ViewOffIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  DEFAULT_EXTENSION_SETTINGS,
  type ExtensionSettings,
  type ExtensionStatus,
} from "@lobe/shared";
import { Alert, AlertDescription } from "@lobe/ui/components/alert";
import { Button } from "@lobe/ui/components/button";
import { Card } from "@lobe/ui/components/card";
import { Input } from "@lobe/ui/components/input";
import { Label } from "@lobe/ui/components/label";
import { Switch } from "@lobe/ui/components/switch";
import { useEffect, useState, type FormEvent } from "react";

import { sendExtensionMessage } from "../../lib/messaging";
import { Logo } from "../../ui/Logo";

type SaveState = "idle" | "saving" | "saved" | "error";

export default function App() {
  const [settings, setSettings] = useState(DEFAULT_EXTENSION_SETTINGS);
  const [showToken, setShowToken] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    void sendExtensionMessage<ExtensionSettings>({ type: "settings:get" }).then(
      setSettings,
    );
  }, []);

  const update = <K extends keyof ExtensionSettings>(
    key: K,
    value: ExtensionSettings[K],
  ) => setSettings((current) => ({ ...current, [key]: value }));

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaveState("saving");
    setMessage("");

    try {
      const apiUrl = new URL(settings.apiUrl);
      apiUrl.pathname = "";
      apiUrl.search = "";
      apiUrl.hash = "";
      const normalized = {
        ...settings,
        apiUrl: apiUrl.href.replace(/\/$/, ""),
      };
      const granted = await browser.permissions.request({
        origins: [`${apiUrl.origin}/*`],
      });
      if (!granted) {
        throw new Error("Permission to contact this server was not granted.");
      }

      const saved = await sendExtensionMessage<ExtensionSettings>({
        type: "settings:set",
        settings: normalized,
      });
      setSettings(saved);
      const status = await sendExtensionMessage<ExtensionStatus>({
        type: "status:get",
      });
      setSaveState("saved");
      setMessage(
        status.authorized
          ? "Connected. Lobe is ready on X."
          : status.reachable
            ? "Saved. The server rejected this API token."
            : "Saved. Start the server to complete the connection.",
      );
    } catch (error) {
      setSaveState("error");
      setMessage(
        error instanceof Error ? error.message : "Settings were not saved.",
      );
    }
  };

  return (
    <main>
      <header>
        <div className="brand">
          <Logo size={36} />
          <span>Lobe</span>
        </div>
        <span className="eyebrow">Extension settings</span>
      </header>

      <Card className="settings-card">
        <form onSubmit={(event) => void save(event)}>
          <section>
            <h1>Connection</h1>
            <Label>
              <span>Server URL</span>
              <Input
                type="url"
                required
                value={settings.apiUrl}
                onChange={(event) => update("apiUrl", event.target.value)}
                placeholder="http://localhost:8787"
              />
            </Label>
            <Label>
              <span>API token</span>
              <div className="token-field">
                <Input
                  type={showToken ? "text" : "password"}
                  required
                  value={settings.apiToken}
                  onChange={(event) => update("apiToken", event.target.value)}
                  autoComplete="off"
                />
                <Button
                  variant="ghost"
                  size="icon-lg"
                  type="button"
                  aria-label={showToken ? "Hide API token" : "Show API token"}
                  onClick={() => setShowToken((visible) => !visible)}
                >
                  <HugeiconsIcon
                    icon={showToken ? ViewOffIcon : ViewIcon}
                    size={17}
                  />
                </Button>
              </div>
            </Label>
          </section>

          <section>
            <h2>Capture</h2>
            <Label className="toggle-row">
              <span>
                <strong>Post screenshots</strong>
                <small>
                  Keep the visual state from the moment you saved it.
                </small>
              </span>
              <Switch
                checked={settings.captureScreenshot}
                onCheckedChange={(checked) =>
                  update("captureScreenshot", checked)
                }
              />
            </Label>
            <Label className="toggle-row">
              <span>
                <strong>Save confirmations</strong>
                <small>Show a compact confirmation after bookmarking.</small>
              </span>
              <Switch
                checked={settings.showConfirmation}
                onCheckedChange={(checked) =>
                  update("showConfirmation", checked)
                }
              />
            </Label>
          </section>

          <footer>
            {message ? (
              <Alert
                variant={saveState === "error" ? "destructive" : "default"}
                className={saveState}
              >
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            ) : (
              <span />
            )}
            <Button
              size="lg"
              className="primary"
              type="submit"
              disabled={saveState === "saving"}
            >
              {saveState === "saved" && (
                <HugeiconsIcon icon={Tick02Icon} size={16} />
              )}
              {saveState === "saving" ? "Saving…" : "Save settings"}
            </Button>
          </footer>
        </form>
      </Card>
    </main>
  );
}
