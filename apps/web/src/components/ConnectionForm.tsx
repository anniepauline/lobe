import {
  ArrowRight01Icon,
  Key01Icon,
  ServerStack01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert, AlertDescription } from "@lobe/ui/components/alert";
import { Button } from "@lobe/ui/components/button";
import { Card } from "@lobe/ui/components/card";
import { Input } from "@lobe/ui/components/input";
import { Label } from "@lobe/ui/components/label";
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

  const card = (
    <Card className="connection-card">
      <form className="connection-form" onSubmit={submit}>
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

        <Label className="input-shell">
          <HugeiconsIcon icon={ServerStack01Icon} size={17} />
          <span>
            <small>Server URL</small>
            <Input
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
        </Label>
        <Label className="input-shell">
          <HugeiconsIcon icon={Key01Icon} size={17} />
          <span>
            <small>API token</small>
            <Input
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
        </Label>

        {error && (
          <Alert variant="destructive" className="form-error">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="connection-actions">
          {onCancel && (
            <Button
              variant="outline"
              size="lg"
              className="button secondary"
              type="button"
              onClick={onCancel}
            >
              Cancel
            </Button>
          )}
          <Button
            size="lg"
            className="button primary"
            type="submit"
            disabled={busy}
          >
            {busy ? "Connecting…" : "Connect"}
            {!busy && <HugeiconsIcon icon={ArrowRight01Icon} size={17} />}
          </Button>
        </div>
        {!compact && (
          <small className="privacy-note">
            Your token stays in this browser. OpenAI credentials remain on your
            server.
          </small>
        )}
      </form>
    </Card>
  );

  return compact ? card : <div className="connection-screen">{card}</div>;
}
