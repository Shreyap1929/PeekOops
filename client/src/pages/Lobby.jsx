import { useState } from 'react';
import PlayerTag from '../components/PlayerTag.jsx';
import HowToPlayModal from '../components/HowToPlayModal.jsx';
import { SETTINGS_META } from '../data/settingsMeta.js';

export default function Lobby({ roomCode, players, hostId, me, settings, onUpdateSettings, onStart }) {
  const [showHowTo, setShowHowTo] = useState(false);
  const [copied, setCopied] = useState(false);
  const isHost = me?.id === hostId;
  const count = players.length;
  const canStart = count >= 3;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard not available — silently ignore */
    }
  };

  const handleSlider = (key, value) => {
    onUpdateSettings({ ...settings, [key]: Number(value) });
  };

  return (
    <div className="app-shell phase-fade">
      <div className="wide" style={{ paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-8)', flex: 1 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
          <div>
            <p style={{ fontWeight: 800, color: 'var(--cyan-soft)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Lobby
            </p>
            <h1 style={{ fontSize: '2rem' }}>Waiting for everyone to join</h1>
          </div>
          <button className="btn btn-secondary" onClick={copyCode} title="Copy room code">
            Room code&nbsp;
            <span style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.25em', color: 'var(--violet-soft)' }}>{roomCode}</span>
            &nbsp;{copied ? '✓' : '⧉'}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(280px,1fr)', gap: 'var(--space-6)', alignItems: 'start' }} className="lobby-grid">
          <div className="card">
            <h3 style={{ marginBottom: 'var(--space-4)' }}>Players ({count})</h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                gap: 'var(--space-3)',
              }}
            >
              {players.map((p) => (
                <div key={p.id} className={`accent-${p.colorKey} player-chip`}>
                  <PlayerTag name={p.name} colorKey={p.colorKey} />
                  {p.id === hostId && <span className="badge">Host</span>}
                </div>
              ))}
            </div>

            <div style={{ marginTop: 'var(--space-5)' }}>
              {isHost ? (
                <>
                  <button className="btn btn-primary" style={{ width: '100%' }} disabled={!canStart} onClick={onStart}>
                    🚀 Start Game
                  </button>
                  {!canStart && (
                    <p style={{ marginTop: 'var(--space-2)', fontWeight: 700, color: 'var(--pink)', fontSize: '0.9rem' }}>
                      Need at least 3 players to start ({count}/3)
                    </p>
                  )}
                </>
              ) : (
                <p style={{ fontWeight: 600, color: 'var(--ink-soft)' }}>
                  {canStart ? 'Waiting for the host to start…' : `Need at least 3 players to start (${count}/3)`}
                </p>
              )}
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: 'var(--space-4)' }}>Round settings</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              {SETTINGS_META.map((s) => {
                const pct = ((settings[s.key] - s.min) / (s.max - s.min)) * 100;
                return (
                  <div className="slider-row" key={s.key}>
                    <div className="slider-label">
                      <span>{s.label}</span>
                      <span className="slider-value">{settings[s.key]}s</span>
                    </div>
                    <input
                      type="range"
                      min={s.min}
                      max={s.max}
                      step={1}
                      value={settings[s.key]}
                      disabled={!isHost}
                      onChange={(e) => handleSlider(s.key, e.target.value)}
                      style={{ '--fill': `${pct}%` }}
                    />
                  </div>
                );
              })}
            </div>
            {!isHost && (
              <p style={{ marginTop: 'var(--space-4)', fontSize: '0.85rem', color: 'var(--ink-soft)' }}>
                Only the host can change settings.
              </p>
            )}
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 'var(--space-6)' }}>
          <button className="btn btn-ghost" onClick={() => setShowHowTo(true)}>
            📖 How to Play
          </button>
        </div>
      </div>

      {showHowTo && <HowToPlayModal onClose={() => setShowHowTo(false)} />}

      <style>{`
        @media (max-width: 820px) {
          .lobby-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
