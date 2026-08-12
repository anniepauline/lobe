import { ArrowRight, KeyRound, Server } from "lucide-react";
import { useState, type FormEvent } from "react";

import type { Connection } from "../config";
import { Logo } from "./Logo";

interface ConnectionFormProps {
  initial: Connection;
  busy: boolean;
  error: string;
  compact?: boolean;
  onCancel?: () => void;
  onSubmit: (connection: Connection) => Promise<void>;
}

export function ConnectionForm({
  initial,
  busy,
  error,
  compact = false,
  onCancel,
  onSubmit,
}: ConnectionFormProps) {
  const [connection, setConnection] = useState(initial);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void onSubmit(connection);
  };

  return (
    <div className={compact ? "connection-modal" : "connection-screen"}>
      <form className="connection-card" onSubmit={submit}>
        <div className="connection-brand">
          <Logo size={40} />
          <span>Lobe</span>
        </div>
        <div>
          <h1>{compact ? "Connection" : "Turn bookmarks into memory"}</h1>
          <p>
            {compact
              ? "Update the server used by this browser."
              : "Connect your server, then Lobe will organize every X bookmark by why you saved it."}
          </p>
        </div>

        <label className="input-shell">
          <Server size={17} />
          <span>
            <small>Server URL</small>
            <input
              type="url"
              required
              value={connection.apiUrl}
              onChange={(event) =>
                setConnection((current) => ({
                  ...current,
                  apiUrl: event.target.value,
                }))
              }
            />
          </span>
        </label>
        <label className="input-shell">
          <KeyRound size={17} />
          <span>
            <small>API token</small>
            <input
              type="password"
              required
              autoComplete="off"
              value={connection.apiToken}
              onChange={(event) =>
                setConnection((current) => ({
                  ...current,
                  apiToken: event.target.value,
                }))
              }
            />
          </span>
        </label>

        {error && <div className="form-error">{error}</div>}
        <div className="connection-actions">
          {onCancel && (
            <button
              className="button secondary"
              type="button"
              onClick={onCancel}
            >
              Cancel
            </button>
          )}
          <button className="button primary" type="submit" disabled={busy}>
            {busy ? "Connecting…" : "Connect"}
            {!busy && <ArrowRight size={17} />}
          </button>
        </div>
        {!compact && (
          <small className="privacy-note">
            Your token stays in this browser. OpenAI credentials remain on your
            server.
          </small>
        )}
      </form>
    </div>
  );
}
