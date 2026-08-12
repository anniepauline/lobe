import {
  DEFAULT_EXTENSION_SETTINGS,
  type ExtensionSettings,
  type ExtensionStatus,
} from "@lobe/shared";
import { Check, Eye, EyeOff } from "lucide-react";
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
        status.reachable
          ? "Connected. Lobe is ready on X."
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

      <form onSubmit={(event) => void save(event)}>
        <section>
          <h1>Connection</h1>
          <label>
            <span>Server URL</span>
            <input
              type="url"
              required
              value={settings.apiUrl}
              onChange={(event) => update("apiUrl", event.target.value)}
              placeholder="http://localhost:8787"
            />
          </label>
          <label>
            <span>API token</span>
            <div className="token-field">
              <input
                type={showToken ? "text" : "password"}
                required
                value={settings.apiToken}
                onChange={(event) => update("apiToken", event.target.value)}
                autoComplete="off"
              />
              <button
                type="button"
                aria-label={showToken ? "Hide API token" : "Show API token"}
                onClick={() => setShowToken((visible) => !visible)}
              >
                {showToken ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </label>
        </section>

        <section>
          <h2>Capture</h2>
          <label className="toggle-row">
            <span>
              <strong>Post screenshots</strong>
              <small>Keep the visual state from the moment you saved it.</small>
            </span>
            <input
              type="checkbox"
              checked={settings.captureScreenshot}
              onChange={(event) =>
                update("captureScreenshot", event.target.checked)
              }
            />
          </label>
          <label className="toggle-row">
            <span>
              <strong>Save confirmations</strong>
              <small>Show a compact confirmation after bookmarking.</small>
            </span>
            <input
              type="checkbox"
              checked={settings.showConfirmation}
              onChange={(event) =>
                update("showConfirmation", event.target.checked)
              }
            />
          </label>
        </section>

        <footer>
          <p className={saveState}>{message}</p>
          <button
            className="primary"
            type="submit"
            disabled={saveState === "saving"}
          >
            {saveState === "saved" && <Check size={16} />}
            {saveState === "saving" ? "Saving…" : "Save settings"}
          </button>
        </footer>
      </form>
    </main>
  );
}
