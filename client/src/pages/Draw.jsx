import { useEffect, useRef, useState } from 'react';
import DrawCanvas from '../components/DrawCanvas.jsx';
import PlayerTag from '../components/PlayerTag.jsx';
import Timer from '../components/Timer.jsx';
import { accentBase } from '../data/colors.js';

export default function Draw({
  word,
  isImposter,
  drawEndsAt,
  drawTime,
  myColorKey,
  roundNumber,
  onStrokeChunk,
  initialStrokes,
  players = [],
  doneDrawingInfo = { doneIds: [], total: 0 },
  onDoneDrawing,
  initialDone = false,
  resyncToken,
}) {
  const clearRef = useRef(null);
  const color = accentBase(myColorKey);
  const [myDone, setMyDone] = useState(initialDone);

  // A resync (rejoin) can land us back on the same draw phase we were
  // already in — restore "I already clicked Done Drawing" instead of
  // quietly forgetting it and letting the button re-enable.
  useEffect(() => {
    setMyDone(initialDone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resyncToken]);

  const doneIds = new Set(doneDrawingInfo.doneIds || []);

  const markDone = () => {
    if (myDone) return; // already clicked — can't click it twice
    setMyDone(true);
    onDoneDrawing?.();
  };

  return (
    <div className="app-shell phase-fade">
      <div className="wide" style={{ paddingTop: 'var(--space-5)', paddingBottom: 'var(--space-5)', flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div>
            <p style={{ fontWeight: 800, color: 'var(--ink-soft)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Round {roundNumber} · Draw
            </p>
            <h2 style={{ fontSize: '1.6rem' }}>
              Draw: <span style={{ color: isImposter ? '#E4402F' : 'var(--sage-shade)' }}>{word}</span>
            </h2>
          </div>
          <button className="btn btn-secondary" onClick={() => clearRef.current?.()}>
            Clear
          </button>
        </div>

        <Timer endsAt={drawEndsAt} totalSeconds={drawTime} label="Time to draw" accent="coral" />

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--space-3)' }}>
          <button
            className={`btn btn-toggle ${myDone ? 'active' : ''}`}
            style={{ padding: '10px 20px' }}
            onClick={markDone}
            disabled={myDone}
          >
            {myDone ? '✅ Done!' : '🔔 Done Drawing'}
          </button>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            {players.map((p) => (
              <span key={p.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <PlayerTag name={p.name} colorKey={p.colorKey} size="sm" muted={!doneIds.has(p.id)} />
                {doneIds.has(p.id) && (
                  <span style={{ color: 'var(--sage-shade)', fontWeight: 800, fontSize: '0.9rem' }} aria-label="Done drawing">
                    ✓
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 320 }}>
          <DrawCanvas color={color} strokeWidth={5} onStrokeChunk={onStrokeChunk} onClear={clearRef} initialStrokes={initialStrokes} />
        </div>
        <p style={{ textAlign: 'center', color: 'var(--ink-soft)', fontWeight: 700, fontSize: '0.85rem' }}>
          Only you can see this canvas until the reveal.
        </p>
      </div>
    </div>
  );
}
