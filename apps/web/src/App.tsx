import {
  intentById,
  type IntentId,
  type Save,
  type TasteProfile,
} from "@lobe/shared";
import { ExternalLink, Search, Settings2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { LobeApi } from "./api";
import { ConnectionForm } from "./components/ConnectionForm";
import { IntentFilter } from "./components/IntentFilter";
import { Logo } from "./components/Logo";
import { SaveCard } from "./components/SaveCard";
import { SaveDetail } from "./components/SaveDetail";
import { TastePanel } from "./components/TastePanel";
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
  const [intent, setIntent] = useState<IntentId | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebouncedValue(query.trim());
  const api = useMemo(() => new LobeApi(connection), [connection]);
  const configured = connection.apiToken.length > 0;

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
    setLoading(true);
    setError("");

    void api
      .listSaves({ query: debouncedQuery, intent }, controller.signal)
      .then((page) => {
        setSaves(page.saves);
        setNextCursor(debouncedQuery ? null : page.nextCursor);
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Could not load your saves.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [api, configured, debouncedQuery, intent]);

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

  const updateIntent = async (nextIntent: IntentId) => {
    if (!selected) return;
    const updated = await api.updateIntent(selected.id, nextIntent);
    setSelected(updated);
    setSaves((current) =>
      current
        .map((save) => (save.id === updated.id ? updated : save))
        .filter((save) => !intent || save.intent === intent),
    );
    await refreshTaste();
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

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <a className="brand" href="/" aria-label="Lobe home">
            <Logo />
            <span>Lobe</span>
          </a>
          <label className="global-search">
            <Search size={18} />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search ideas, people, or intent"
              aria-label="Search saves"
            />
            {query ? (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setQuery("")}
              >
                <X size={16} />
              </button>
            ) : (
              <kbd>/</kbd>
            )}
          </label>
          <button
            className="icon-button"
            type="button"
            aria-label="Connection settings"
            onClick={() => setShowConnection(true)}
          >
            <Settings2 size={18} />
          </button>
        </div>
      </header>

      <main className="workspace">
        <section className="library">
          <div className="library-heading">
            <div>
              <h1>{debouncedQuery ? "Search" : "Library"}</h1>
              <p>
                {debouncedQuery
                  ? `${saves.length} match${saves.length === 1 ? "" : "es"} for “${debouncedQuery}”`
                  : `${profile?.totalSaves ?? saves.length} saved thoughts`}
              </p>
            </div>
            <a
              className="button secondary open-x"
              href="https://x.com/home"
              target="_blank"
              rel="noreferrer"
            >
              Open X <ExternalLink size={15} />
            </a>
          </div>

          <IntentFilter
            active={intent}
            profile={profile}
            onChange={setIntent}
          />

          {error && (
            <div className="error-banner">
              <span>{error}</span>
              <button type="button" onClick={() => setShowConnection(true)}>
                Check connection
              </button>
            </div>
          )}

          {loading ? (
            <div className="save-grid" aria-label="Loading saves">
              {Array.from({ length: 6 }, (_, index) => (
                <div className="save-skeleton" key={index} />
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
                  className="button secondary load-more"
                  type="button"
                  disabled={loadingMore}
                  onClick={() => void loadMore()}
                >
                  {loadingMore ? "Loading…" : "Load more"}
                </button>
              )}
            </>
          ) : (
            <EmptyState query={debouncedQuery} intent={intent} />
          )}
        </section>

        <TastePanel profile={profile} />
      </main>

      {selected && (
        <SaveDetail
          save={selected}
          api={api}
          onClose={() => setSelected(null)}
          onIntent={updateIntent}
          onDelete={deleteSelected}
        />
      )}

      {showConnection && (
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
      )}
    </div>
  );
}

function EmptyState({
  query,
  intent,
}: {
  query: string;
  intent: IntentId | null;
}) {
  const heading = query
    ? "No saves match that thought"
    : intent
      ? `Nothing saved to ${intentById[intent].label} yet`
      : "Your library starts with one bookmark";
  const detail = query
    ? "Try a broader phrase, creator name, or another intent."
    : "On X, use the bookmark you already know. Lobe handles everything after the click.";

  return (
    <div className="empty-state">
      <span className="empty-mark">
        <Logo size={44} />
      </span>
      <h2>{heading}</h2>
      <p>{detail}</p>
      {!query && !intent && (
        <a
          className="button primary"
          href="https://x.com/home"
          target="_blank"
          rel="noreferrer"
        >
          Bookmark something on X <ExternalLink size={16} />
        </a>
      )}
    </div>
  );
}
