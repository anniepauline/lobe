import { Cancel01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  intentById,
  type IntentId,
  type Save,
  type TasteProfile,
} from "@lobe/shared";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@lobe/ui/components/dialog";
import { Skeleton } from "@lobe/ui/components/skeleton";
import { useEffect, useMemo, useRef, useState } from "react";

import { LobeApi } from "./api";
import { ConnectionForm } from "./components/ConnectionForm";
import { Logo } from "./components/Logo";
import { SaveCard } from "./components/SaveCard";
import { SaveDetail } from "./components/SaveDetail";
import { Sidebar, type LibraryFilter } from "./components/Sidebar";
import { loadConnection, storeConnection, type Connection } from "./config";
import { useDebouncedValue } from "./hooks";

export default function App() {
  const [connection, setConnection] = useState(loadConnection);
  const [showConnection, setShowConnection] = useState(false);
  const [connectBusy, setConnectBusy] = useState(false);
  const [connectError, setConnectError] = useState("");
  const [saves, setSaves] = useState<Save[]>([]);
  const [profile, setProfile] = useState<TasteProfile | null>(null);
  const [selected, setSelected] = useState<Save | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<LibraryFilter>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebouncedValue(query.trim());
  const api = useMemo(() => new LobeApi(connection), [connection]);
  const configured = connection.apiToken.length > 0;
  const intent = filter === "review" ? null : filter;
  const needsReview = filter === "review" ? true : undefined;

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (
        event.key === "/" &&
        !(event.target instanceof HTMLInputElement) &&
        !(event.target instanceof HTMLTextAreaElement)
      ) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    if (!configured) return;
    const controller = new AbortController();
    let retryTimer: number | undefined;
    setLoading(true);
    setError("");

    const load = async (attempt = 0) => {
      try {
        const page = await api.listSaves(
          {
            query: debouncedQuery,
            intent,
            ...(needsReview === undefined ? {} : { needsReview }),
          },
          controller.signal,
        );
        setSaves(page.saves);
        setNextCursor(debouncedQuery ? null : page.nextCursor);
        if (page.search.semanticPending && attempt < 3) {
          retryTimer = window.setTimeout(() => void load(attempt + 1), 700);
        }
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Could not load your saves.",
          );
        }
      } finally {
        if (attempt === 0 && !controller.signal.aborted) setLoading(false);
      }
    };

    void load();

    return () => {
      controller.abort();
      if (retryTimer) window.clearTimeout(retryTimer);
    };
  }, [api, configured, debouncedQuery, intent, needsReview]);

  useEffect(() => {
    if (!configured) return;
    const controller = new AbortController();
    void api
      .getTaste(controller.signal)
      .then(setProfile)
      .catch(() => undefined);
    return () => controller.abort();
  }, [api, configured]);

  const refreshTaste = async () => {
    setProfile(await api.getTaste());
  };

  const connect = async (next: Connection) => {
    setConnectBusy(true);
    setConnectError("");
    try {
      const normalized: Connection = {
        apiUrl: new URL(next.apiUrl).origin,
        apiToken: next.apiToken.trim(),
      };
      await new LobeApi(normalized).verify();
      setConnection(storeConnection(normalized));
      setShowConnection(false);
    } catch (connectionError) {
      setConnectError(
        connectionError instanceof Error
          ? connectionError.message
          : "Could not connect to Lobe.",
      );
    } finally {
      setConnectBusy(false);
    }
  };

  const loadMore = async () => {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const page = await api.listSaves({
        query: "",
        intent,
        ...(needsReview === undefined ? {} : { needsReview }),
        cursor: nextCursor,
      });
      setSaves((current) => [
        ...current,
        ...page.saves.filter(
          (save) => !current.some((existing) => existing.id === save.id),
        ),
      ]);
      setNextCursor(page.nextCursor);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load more saves.",
      );
    } finally {
      setLoadingMore(false);
    }
  };

  const submitFeedback = async (nextIntent: IntentId, reason: string) => {
    if (!selected) return;
    const previousIntent = selected.intent;
    const updated = await api.submitFeedback(selected.id, nextIntent, reason);
    setSelected(updated);
    setSaves((current) =>
      current
        .map((save) => (save.id === updated.id ? updated : save))
        .filter((save) => matchesFilter(save, filter)),
    );
    setProfile((current) => {
      if (!current) return current;

      const intentCounts =
        previousIntent !== nextIntent
          ? {
              ...current.intentCounts,
              ...(previousIntent
                ? {
                    [previousIntent]: Math.max(
                      0,
                      current.intentCounts[previousIntent] - 1,
                    ),
                  }
                : {}),
              [nextIntent]: current.intentCounts[nextIntent] + 1,
            }
          : current.intentCounts;

      return {
        ...current,
        reviewCount: selected.needsReview
          ? Math.max(0, current.reviewCount - 1)
          : current.reviewCount,
        intentCounts,
      };
    });
  };

  const deleteSelected = async () => {
    if (!selected) return;
    await api.remove(selected.canonicalUrl);
    setSaves((current) => current.filter((save) => save.id !== selected.id));
    setSelected(null);
    await refreshTaste();
  };

  if (!configured) {
    return (
      <ConnectionForm
        initial={connection}
        busy={connectBusy}
        error={connectError}
        onSubmit={connect}
      />
    );
  }

  const heading = debouncedQuery
    ? `${saves.length} match${saves.length === 1 ? "" : "es"}`
    : filter === "review"
      ? "Needs review"
      : filter
        ? intentById[filter].label
        : "Everything";

  return (
    <div className="app-shell">
      <Sidebar
        filter={filter}
        profile={profile}
        onChange={(next) => {
          setFilter(next);
          window.scrollTo({ top: 0 });
        }}
        onOpenSettings={() => setShowConnection(true)}
      />

      <main className="library">
        <label className="hero-search">
          <HugeiconsIcon icon={Search01Icon} size={21} strokeWidth={1.7} />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search your mind…"
            aria-label="Search saves"
          />
          {query ? (
            <button
              type="button"
              className="search-clear"
              aria-label="Clear search"
              onClick={() => setQuery("")}
            >
              <HugeiconsIcon icon={Cancel01Icon} size={15} />
            </button>
          ) : (
            <kbd>/</kbd>
          )}
        </label>

        <div className="library-heading">
          <h1>{heading}</h1>
          {filter === "review" && !debouncedQuery && (
            <p>Teach Lobe what these saves mean to you.</p>
          )}
        </div>

        {error && (
          <div className="error-banner" role="alert">
            <span>{error}</span>
            <button type="button" onClick={() => setShowConnection(true)}>
              Check connection
            </button>
          </div>
        )}

        {loading ? (
          <div className="save-grid" aria-label="Loading saves">
            {Array.from({ length: 8 }, (_, index) => (
              <Skeleton
                className="save-skeleton"
                key={index}
                style={{ height: 120 + ((index * 53) % 140) }}
              />
            ))}
          </div>
        ) : saves.length > 0 ? (
          <>
            <div className="save-grid">
              {saves.map((save) => (
                <SaveCard
                  key={save.id}
                  save={save}
                  api={api}
                  onOpen={() => setSelected(save)}
                />
              ))}
            </div>
            {nextCursor && (
              <button
                type="button"
                className="load-more"
                disabled={loadingMore}
                onClick={() => void loadMore()}
              >
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            )}
          </>
        ) : (
          <EmptyState query={debouncedQuery} filter={filter} />
        )}
      </main>

      {selected && (
        <SaveDetail
          save={selected}
          api={api}
          onClose={() => setSelected(null)}
          onFeedback={submitFeedback}
          onDelete={deleteSelected}
        />
      )}

      <Dialog
        open={showConnection}
        onOpenChange={(open) => {
          setShowConnection(open);
          if (!open) setConnectError("");
        }}
      >
        <DialogContent className="connection-dialog" showCloseButton={false}>
          <DialogTitle className="sr-only">Connection</DialogTitle>
          <DialogDescription className="sr-only">
            Update the Lobe server used by this browser.
          </DialogDescription>
          <ConnectionForm
            compact
            initial={connection}
            busy={connectBusy}
            error={connectError}
            onCancel={() => {
              setShowConnection(false);
              setConnectError("");
            }}
            onSubmit={connect}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmptyState({
  query,
  filter,
}: {
  query: string;
  filter: LibraryFilter;
}) {
  const heading = query
    ? "No saves match that thought"
    : filter === "review"
      ? "Nothing needs your input"
      : filter
        ? `Nothing saved to ${intentById[filter].label} yet`
        : "Your library starts with one bookmark";
  const detail = query
    ? "Try a broader phrase, creator name, or another intent."
    : filter === "review"
      ? "Lobe will keep uncertain saves here until you teach it what they mean to you."
      : "On X, use the bookmark you already know. Lobe handles everything after the click.";

  return (
    <div className="empty-state">
      <Logo size={44} />
      <h2>{heading}</h2>
      <p>{detail}</p>
      {!query && !filter && (
        <a
          className="empty-cta"
          href="https://x.com/home"
          target="_blank"
          rel="noreferrer"
        >
          Bookmark something on X
        </a>
      )}
    </div>
  );
}

function matchesFilter(save: Save, filter: LibraryFilter): boolean {
  if (filter === "review") return save.needsReview;
  return !filter || save.intent === filter;
}
