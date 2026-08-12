import { INTENT_IDS, intentById, type IntentId, type Save } from "@lobe/shared";
import { ArrowUpRight, Check, ChevronLeft, Trash2, X } from "lucide-react";
import { useEffect, useState, type CSSProperties } from "react";

import type { LobeApi } from "../api";
import { useSaveImage } from "../hooks";
import { intentIcons } from "../icons";

export function SaveDetail({
  save,
  api,
  onClose,
  onIntent,
  onDelete,
}: {
  save: Save;
  api: LobeApi;
  onClose: () => void;
  onIntent: (intent: IntentId) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const imageUrl = useSaveImage(save, api);
  const [updating, setUpdating] = useState<IntentId | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const chooseIntent = async (intent: IntentId) => {
    setUpdating(intent);
    try {
      await onIntent(intent);
    } finally {
      setUpdating(null);
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
    <div className="detail-backdrop" role="presentation" onMouseDown={onClose}>
      <aside
        className="save-detail"
        role="dialog"
        aria-modal="true"
        aria-label="Saved post details"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="detail-topbar">
          <button type="button" aria-label="Close details" onClick={onClose}>
            <ChevronLeft className="mobile-back" size={20} />
            <X className="desktop-close" size={20} />
          </button>
          <a href={save.canonicalUrl} target="_blank" rel="noreferrer">
            Open on X <ArrowUpRight size={15} />
          </a>
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
              <h3>Why you saved it</h3>
              <div className="intent-choices">
                {INTENT_IDS.map((intent) => {
                  const Icon = intentIcons[intent];
                  const selected = save.intent === intent;
                  return (
                    <button
                      key={intent}
                      className={selected ? "selected" : ""}
                      type="button"
                      disabled={updating !== null}
                      style={
                        {
                          "--choice-color": intentById[intent].color,
                        } as CSSProperties
                      }
                      onClick={() => void chooseIntent(intent)}
                    >
                      <Icon size={16} />
                      {intentById[intent].label}
                      {selected && <Check size={14} />}
                    </button>
                  );
                })}
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
                  <button type="button" onClick={() => setConfirmDelete(false)}>
                    Cancel
                  </button>
                  <button
                    className="danger"
                    type="button"
                    disabled={deleting}
                    onClick={() => void remove()}
                  >
                    {deleting ? "Removing…" : "Remove"}
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => setConfirmDelete(true)}>
                  <Trash2 size={15} /> Remove from Lobe
                </button>
              )}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
