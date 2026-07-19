import { useEffect, useState } from 'react';
import RevealCanvas from '../components/RevealCanvas.jsx';
import PlayerTag from '../components/PlayerTag.jsx';
import Timer from '../components/Timer.jsx';

const QUADRANT_LABELS = { 1: 'top-left', 2: 'top-right', 3: 'bottom-left', 4: 'bottom-right' };

export default function QuadrantPhase({
  phase, // 'discuss' | 'vote'
  quadrant,
  players,
  strokesByPlayer,
  discussEndsAt,
  discussTime,
  voteEndsAt,
  voteTime,
  readyInfo,
  onToggleReady,
  voteInfo,
  onSubmitVote,
  me,
  initialReady = false,
  initialVote = null,
  resyncToken,
}) {
  const [myReady, setMyReady] = useState(initialReady);
  const [myVote, setMyVote] = useState(initialVote);

  useEffect(() => {
    setMyReady(false);
    setMyVote(null);
  }, [quadrant]);

  // A resync (rejoin) can land us back on the SAME quadrant/phase we were
  // already in, so it needs its own trigger to restore what we'd already
  // called or voted, distinct from the "new quadrant" reset above.
  useEffect(() => {
    setMyReady(initialReady);
    setMyVote(initialVote);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resyncToken]);

  const revealedQuadrants = Array.from({ length: quadrant }, (_, i) => i + 1);
  const isVote = phase === 'vote';

  const toggleReady = () => {
    const next = !myReady;
    setMyReady(next);
    onToggleReady(next);
  };

  const castVote = (playerId) => {
    setMyVote(playerId);
    onSubmitVote(playerId);
  };

  return (
    <div className="app-shell phase-fade">
      <div className="wide" style={{ paddingTop: 'var(--space-5)', paddingBottom: 'var(--space-6)', flex: 1 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
          <div>
            <p style={{ fontWeight: 800, color: isVote ? 'var(--pink)' : 'var(--cyan-soft)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Quadrant {quadrant} of 4 · {QUADRANT_LABELS[quadrant]}
            </p>
            <h2 style={{ fontSize: '1.6rem' }}>{isVote ? '🗳️ Vote: who is the imposter?' : 'Discuss'}</h2>
          </div>
          <div style={{ minWidth: 220 }}>
            {phase === 'discuss' ? (
              <Timer endsAt={discussEndsAt} totalSeconds={discussTime} label="Discuss time" accent="cyan" />
            ) : (
              <Timer endsAt={voteEndsAt} totalSeconds={voteTime} label="Vote time" accent="pink" />
            )}
          </div>
        </div>

        <div className="quadrant-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2.2fr) minmax(300px,1fr)', gap: 'var(--space-5)', alignItems: 'start' }}>
          <div>
            <div
              key={quadrant}
              className="quadrant-reveal-anim"
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(auto-fill, minmax(${isVote ? 180 : 150}px, 1fr))`,
                gap: 'var(--space-4)',
              }}
            >
              {players.map((p) => {
                const isMe = p.id === me?.id;
                const votedForThem = isVote && myVote === p.id;
                return (
                  <div
                    key={p.id}
                    className={`card reveal-tile ${isVote && !isMe ? 'votable' : ''} ${votedForThem ? 'selected' : ''}`}
                    style={{ padding: 'var(--space-3)' }}
                    onClick={() => isVote && !isMe && castVote(p.id)}
                  >
                    <div className="canvas-mat" style={{ padding: 4 }}>
                      <RevealCanvas strokes={strokesByPlayer?.[p.id] || []} revealedQuadrants={revealedQuadrants} />
                    </div>
                    <div style={{ marginTop: 'var(--space-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <PlayerTag name={p.name} colorKey={p.colorKey} size="sm" />
                      {votedForThem && (
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--violet-soft)' }}>Your vote</span>
                      )}
                    </div>
                    {isVote && !isMe && (
                      <button
                        className={`btn btn-toggle ${votedForThem ? 'active' : ''}`}
                        style={{ width: '100%', marginTop: 'var(--space-2)', padding: '8px 12px', fontSize: '0.85rem' }}
                        onClick={(e) => { e.stopPropagation(); castVote(p.id); }}
                      >
                        {votedForThem ? '✓ Accused' : 'Accuse'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {phase === 'discuss' && (
              <div className="card">
                <button className={`btn btn-toggle ${myReady ? 'active' : ''}`} style={{ width: '100%' }} onClick={toggleReady}>
                  {myReady ? '✓ Called a vote' : '📣 Call a Vote'}
                </button>
                <p style={{ marginTop: 'var(--space-3)', fontWeight: 600, color: 'var(--ink-soft)', fontSize: '0.9rem', textAlign: 'center' }}>
                  {readyInfo.readyCount}/{readyInfo.total} ready to vote
                </p>
              </div>
            )}

            {phase === 'vote' && (
              <div className="card">
                <p style={{ fontWeight: 600, color: 'var(--ink-soft)', fontSize: '0.9rem', textAlign: 'center' }}>
                  {voteInfo.votedCount}/{voteInfo.total} voted
                </p>
                {myVote && (
                  <p style={{ marginTop: 'var(--space-2)', textAlign: 'center', fontWeight: 700, color: 'var(--violet-soft)', fontSize: '0.9rem' }}>
                    Tap another player to change your vote.
                  </p>
                )}
              </div>
            )}

            {phase === 'discuss' && (
              <div className="card">
                <h4 style={{ marginBottom: 'var(--space-3)' }}>Connected players</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {players.map((p) => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <PlayerTag name={p.name} colorKey={p.colorKey} size="sm" muted={!p.connected} />
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          color: p.connected ? 'var(--green)' : 'var(--ink-faint)',
                        }}
                      >
                        {p.connected ? '● Connected' : 'Reconnecting…'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .quadrant-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
