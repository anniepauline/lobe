import {
  ArrowLeft01Icon,
  ArrowUpRight01Icon,
  Cancel01Icon,
  Delete02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { INTENT_IDS, intentById, type IntentId, type Save } from "@lobe/shared";
import { Button } from "@lobe/ui/components/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@lobe/ui/components/sheet";
import { Textarea } from "@lobe/ui/components/textarea";
import { useState, type CSSProperties } from "react";

import type { LobeApi } from "../api";
import { useSaveImage } from "../hooks";
import { intentIcons } from "../icons";
import { PostText } from "./PostText";

function longDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

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
            size="icon-sm"
            type="button"
            className="detail-close"
            aria-label="Close details"
            onClick={onClose}
          >
            <HugeiconsIcon
              className="mobile-back"
              icon={ArrowLeft01Icon}
              size={19}
            />
            <HugeiconsIcon
              className="desktop-close"
              icon={Cancel01Icon}
              size={17}
            />
          </Button>
          <Button asChild variant="ghost" size="sm" className="detail-source">
            <a href={save.canonicalUrl} target="_blank" rel="noreferrer">
              Open on X
              <HugeiconsIcon icon={ArrowUpRight01Icon} size={14} />
            </a>
          </Button>
        </div>

        <div className="detail-scroll">
          <div className="detail-content">
            <div className="detail-author">
              {save.author.avatarUrl ? (
                <img src={save.author.avatarUrl} alt="" />
              ) : (
                <span>{save.author.name.charAt(0).toLocaleUpperCase()}</span>
              )}
              <div>
                <strong>{save.author.name}</strong>
                <small>
                  {save.author.handle} · saved {longDate(save.createdAt)}
                </small>
              </div>
            </div>

            <p className="original-copy">
              <PostText text={save.content} />
            </p>

            {imageUrl && (
              <img
                className="detail-media"
                src={imageUrl}
                alt={save.media[0]?.alt ?? "Saved X post"}
              />
            )}

            {save.summary && (
              <section className="interpretation">
                <span>Lobe’s read</span>
                <p className="interpretation-summary">{save.summary}</p>
                {save.why && <p className="interpretation-why">{save.why}</p>}
              </section>
            )}

            <section className="detail-section">
              <div className="feedback-heading">
                <h3>Why you saved it</h3>
                {save.needsReview && (
                  <span className="unsure-tag">Lobe is unsure</span>
                )}
              </div>
              <div className="intent-choices">
                {INTENT_IDS.map((intent) => {
                  const Icon = intentIcons[intent];
                  const selected = feedbackIntent === intent;
                  return (
                    <Button
                      variant="outline"
                      size="sm"
                      key={intent}
                      type="button"
                      className={
                        selected ? "intent-choice selected" : "intent-choice"
                      }
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
                      <HugeiconsIcon icon={Icon} size={15} />
                      {intentById[intent].label}
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
                        ? "Your note clears the uncertainty."
                        : ""}
                </span>
                <Button
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
