import { INTENT_IDS, intentById, type TasteProfile } from "@lobe/shared";
import { Sparkles } from "lucide-react";

export function TastePanel({ profile }: { profile: TasteProfile | null }) {
  const maxIntent = profile
    ? Math.max(1, ...Object.values(profile.intentCounts))
    : 1;

  return (
    <aside className="taste-panel">
      <div className="panel-heading">
        <span className="panel-icon">
          <Sparkles size={15} />
        </span>
        <div>
          <h2>Your taste</h2>
          <span>{profile?.totalSaves ?? 0} signals</span>
        </div>
      </div>

      {profile && profile.totalSaves > 0 ? (
        <>
          <div className="intent-bars">
            {INTENT_IDS.filter(
              (intent) => profile.intentCounts[intent] > 0,
            ).map((intent) => (
              <div className="intent-row" key={intent}>
                <div>
                  <span>{intentById[intent].label}</span>
                  <strong>{profile.intentCounts[intent]}</strong>
                </div>
                <div className="bar-track">
                  <span
                    style={{
                      width: `${(profile.intentCounts[intent] / maxIntent) * 100}%`,
                      background: intentById[intent].color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {profile.topTopics.length > 0 && (
            <div className="taste-section">
              <h3>Recurring topics</h3>
              <div className="taste-tags">
                {profile.topTopics.slice(0, 8).map((topic) => (
                  <span key={topic.name}>
                    {topic.name} <small>{topic.count}</small>
                  </span>
                ))}
              </div>
            </div>
          )}

          {profile.topCreators.length > 0 && (
            <div className="taste-section">
              <h3>Saved creators</h3>
              <div className="creator-list">
                {profile.topCreators.slice(0, 5).map((creator) => (
                  <div key={creator.handle}>
                    <span className="creator-initial">
                      {creator.name.charAt(0).toLocaleUpperCase()}
                    </span>
                    <span>
                      <strong>{creator.name}</strong>
                      <small>{creator.handle}</small>
                    </span>
                    <b>{creator.count}</b>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="taste-empty">
          Your patterns appear here as Lobe learns from deliberate saves.
        </p>
      )}
    </aside>
  );
}
