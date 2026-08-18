import { intentById, type IntentId } from "@lobe/shared";
import { Button } from "@lobe/ui/components/button";
import { Card } from "@lobe/ui/components/card";
import { Textarea } from "@lobe/ui/components/textarea";
import { useEffect, useRef, useState, type CSSProperties } from "react";

import { Logo } from "../ui/Logo";
import type { FeedbackPrompt, ToastMessage } from "./toast";

function Mark() {
  return (
    <span className="mark" aria-hidden="true">
      <Logo size={15} />
    </span>
  );
}

export function FeedbackToast({ prompt }: { prompt: FeedbackPrompt }) {
  const [secondsLeft, setSecondsLeft] = useState(30);
  const [selectedIntent, setSelectedIntent] = useState<IntentId>(
    prompt.selectedIntent,
  );
  const selectedIntentRef = useRef(prompt.selectedIntent);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const settledRef = useRef(false);

  const dismiss = async () => {
    if (settledRef.current) return;
    settledRef.current = true;
    setBusy(true);
    setError("");
    try {
      await prompt.onDismiss();
    } catch (cause) {
      settledRef.current = false;
      setBusy(false);
      setError(
        cause instanceof Error ? cause.message : "Could not dismiss this.",
      );
    }
  };

  useEffect(() => {
    const expiresAt = Date.now() + 30_000;
    const countdown = window.setInterval(() => {
      const remaining = Math.max(
        0,
        Math.ceil((expiresAt - Date.now()) / 1_000),
      );
      setSecondsLeft(remaining);
    }, 1_000);
    const expiry = window.setTimeout(() => {
      setSecondsLeft(0);
      void dismiss();
    }, 30_000);

    return () => {
      window.clearInterval(countdown);
      window.clearTimeout(expiry);
    };
  }, []);

  const submit = async () => {
    const explanation = reasonRef.current?.value.trim() ?? "";
    if (explanation.length < 3) {
      setError("Add a short reason so Lobe can learn.");
      reasonRef.current?.focus();
      return;
    }

    settledRef.current = true;
    setBusy(true);
    setError("");
    try {
      await prompt.onSubmit(selectedIntentRef.current, explanation);
    } catch (cause) {
      settledRef.current = false;
      setBusy(false);
      setError(
        cause instanceof Error ? cause.message : "Could not save feedback.",
      );
    }
  };

  return (
    <Card className="toast feedback" aria-label="Lobe bookmark feedback">
      <div className="prompt-expiry">
        Will be gone in {secondsLeft} second{secondsLeft === 1 ? "" : "s"}
      </div>
      <div className="head">
        <Mark />
        <div className="title">Where should Lobe file this bookmark?</div>
      </div>
      <div className="detail">Choose the closest fit and tell Lobe why.</div>
      <div className="prompt-label">Best fit</div>
      <div className="intent-list">
        {prompt.intents.map((intent) => (
          <Button
            variant="outline"
            size="sm"
            key={intent}
            type="button"
            disabled={busy}
            aria-pressed={intent === selectedIntent}
            style={{ "--intent": intentById[intent].color } as CSSProperties}
            onClick={() => {
              selectedIntentRef.current = intent;
              setSelectedIntent(intent);
            }}
          >
            {intentById[intent].label}
          </Button>
        ))}
      </div>
      <Textarea
        ref={reasonRef}
        maxLength={1_000}
        disabled={busy}
        placeholder="What made you save it? Your explanation helps with similar posts."
        aria-label="Why you saved this bookmark"
      />
      <div className="prompt-error" aria-live="polite">
        {error}
      </div>
      <div className="prompt-actions">
        <Button
          variant="ghost"
          size="sm"
          className="quiet"
          type="button"
          disabled={busy}
          onClick={() => void dismiss()}
        >
          Not now
        </Button>
        <Button
          size="sm"
          className="submit"
          type="button"
          disabled={busy}
          onClick={() => void submit()}
        >
          Teach Lobe
        </Button>
      </div>
    </Card>
  );
}

export function ToastNotice({ message }: { message: ToastMessage }) {
  return (
    <Card className={`toast ${message.tone ?? "neutral"}`}>
      <div className="head">
        <Mark />
        <div className="title">{message.title}</div>
      </div>
      {message.detail && <div className="detail">{message.detail}</div>}
      {message.buttons?.length ? (
        <div className="buttons">
          {message.buttons.map((action) => (
            <Button
              variant="outline"
              size="sm"
              key={action.label}
              type="button"
              style={action.color ? { borderColor: action.color } : undefined}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          ))}
        </div>
      ) : null}
    </Card>
  );
}
