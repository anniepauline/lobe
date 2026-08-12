import {
  ArrowLeft01Icon,
  ArrowUpRight01Icon,
  Cancel01Icon,
  Delete02Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { INTENT_IDS, intentById, type IntentId, type Save } from "@lobe/shared";
import { Badge } from "@lobe/ui/components/badge";
import { Button } from "@lobe/ui/components/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@lobe/ui/components/sheet";
import { Textarea } from "@lobe/ui/components/textarea";
import { useEffect, useState, type CSSProperties } from "react";

import type { LobeApi } from "../api";
import { useSaveImage } from "../hooks";
import { intentIcons } from "../icons";

export function SaveDetail({
  save,
  api,
  onClose,
  onFeedback,
  onDelete,
}: {
  save: Save;
  api: LobeApi;
  onClose: () => void;
  onFeedback: (intent: IntentId, reason: string) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const imageUrl = useSaveImage(save, api);
  const [feedbackIntent, setFeedbackIntent] = useState<IntentId>(
    save.intent ?? "reference",
  );
  const [reason, setReason] = useState(save.userReason ?? "");
  const [feedbackState, setFeedbackState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [feedbackError, setFeedbackError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const saveFeedback = async () => {
    if (reason.trim().length < 3) return;
    setFeedbackState("saving");
    setFeedbackError("");
    try {
      await onFeedback(feedbackIntent, reason.trim());
      setFeedbackState("saved");
    } catch (error) {
      setFeedbackState("error");
      setFeedbackError(
        error instanceof Error ? error.message : "Could not save feedback.",
      );
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="save-detail"
        showCloseButton={false}
      >
        <SheetTitle className="sr-only">Saved post details</SheetTitle>
        <SheetDescription className="sr-only">
          Review the saved post and teach Lobe why it matters to you.
        </SheetDescription>
        <div className="detail-topbar">
          <Button
            variant="ghost"
            size="icon-lg"
            type="button"
            aria-label="Close details"
            onClick={onClose}
          >
            <HugeiconsIcon
              className="mobile-back"
              icon={ArrowLeft01Icon}
              size={20}
            />
            <HugeiconsIcon
              className="desktop-close"
              icon={Cancel01Icon}
              size={20}
            />
          </Button>
          <Button asChild variant="ghost" size="sm">
            <a href={save.canonicalUrl} target="_blank" rel="noreferrer">
              Open on X
              <HugeiconsIcon icon={ArrowUpRight01Icon} size={15} />
            </a>
          </Button>
        </div>

        <div className="detail-scroll">
          {imageUrl && (
            <div className="detail-media">
              <img src={imageUrl} alt={save.media[0]?.alt ?? "Saved X post"} />
            </div>
          )}

          <div className="detail-content">
            <div className="detail-author">
              {save.author.avatarUrl ? (
                <img src={save.author.avatarUrl} alt="" />
              ) : (
                <span>{save.author.name.charAt(0).toLocaleUpperCase()}</span>
              )}
              <div>
                <strong>{save.author.name}</strong>
                <small>{save.author.handle}</small>
              </div>
            </div>
            <p className="original-copy">{save.content}</p>

            {save.summary && (
              <section className="interpretation">
                <span>LOBE’S READ</span>
                <h2>{save.summary}</h2>
                {save.why && <p>{save.why}</p>}
              </section>
            )}

            <section className="detail-section">
              <div className="feedback-heading">
                <h3>Why you saved it</h3>
                {save.needsReview && (
                  <Badge variant="secondary">Lobe is unsure</Badge>
                )}
              </div>
              <div className="intent-choices">
                {INTENT_IDS.map((intent) => {
                  const Icon = intentIcons[intent];
                  const selected = feedbackIntent === intent;
                  return (
                    <Button
                      variant="outline"
                      key={intent}
                      className={selected ? "selected" : ""}
                      type="button"
                      disabled={feedbackState === "saving"}
                      style={
                        {
                          "--choice-color": intentById[intent].color,
                        } as CSSProperties
                      }
                      onClick={() => {
                        setFeedbackIntent(intent);
                        setFeedbackState("idle");
                      }}
                    >
                      <HugeiconsIcon icon={Icon} size={16} />
                      {intentById[intent].label}
                      {selected && (
                        <HugeiconsIcon icon={Tick02Icon} size={14} />
                      )}
                    </Button>
                  );
                })}
              </div>
              <Textarea
                className="feedback-reason"
                value={reason}
                maxLength={1_000}
                placeholder="What made this worth saving?"
                onChange={(event) => {
                  setReason(event.target.value);
                  setFeedbackState("idle");
                }}
              />
              <div className="feedback-actions">
                <span
                  className={
                    feedbackState === "error" ? "feedback-error" : undefined
                  }
                >
                  {feedbackState === "saved"
                    ? "Saved. Similar posts will use this signal."
                    : feedbackState === "error"
                      ? feedbackError
                      : save.needsReview
                        ? "Your note clears the uncertainty and reprocesses this save."
                        : "Update this note whenever Lobe gets your intent wrong."}
                </span>
                <Button
                  size="lg"
                  className="button primary"
                  type="button"
                  disabled={
                    reason.trim().length < 3 || feedbackState === "saving"
                  }
                  onClick={() => void saveFeedback()}
                >
                  {feedbackState === "saving"
                    ? "Saving…"
                    : feedbackState === "saved"
                      ? "Feedback saved"
                      : "Save feedback"}
                </Button>
              </div>
            </section>

            {save.topics.length > 0 && (
              <section className="detail-section">
                <h3>Topics</h3>
                <div className="detail-topics">
                  {save.topics.map((topic) => (
                    <span key={topic}>{topic}</span>
                  ))}
                </div>
              </section>
            )}

            <div className="delete-row">
              {confirmDelete ? (
                <>
                  <span>Remove this save?</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="danger"
                    type="button"
                    disabled={deleting}
                    onClick={() => void remove()}
                  >
                    {deleting ? "Removing…" : "Remove"}
                  </Button>
                </>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                >
                  <HugeiconsIcon icon={Delete02Icon} size={15} /> Remove from
                  Lobe
                </Button>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
