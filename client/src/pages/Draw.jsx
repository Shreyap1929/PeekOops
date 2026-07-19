import { useEffect, useRef, useState } from 'react';
import DrawCanvas from '../components/DrawCanvas.jsx';
import PlayerTag from '../components/PlayerTag.jsx';
import Timer from '../components/Timer.jsx';
import { ACCENTS, accentBase } from '../data/colors.js';

// Small, fixed drawing palette — reuses the app's existing accent colors
// (data/colors.js, already themed throughout the UI) plus the app's own
// ink color as the default "black", instead of inventing a new, unrelated
// color system just for the canvas.
const PALETTE = [
  { key: 'ink', hex: '#2B2A28' },
  ...Object.entries(ACCENTS).map(([key, a]) => ({ key, hex: a.base })),
];

// Brush size presets. Values are raw canvas lineWidth px — the same unit
// the canvas already used for its old hardcoded strokeWidth={5}.
const BRUSH_SIZES = [
  { key: 'S', value: 3 },
  { key: 'M', value: 5 },
  { key: 'L', value: 9 },
];

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
  const undoRef = useRef(null);
  const defaultColor = accentBase(myColorKey);
  const [myDone, setMyDone] = useState(initialDone);
  const [selectedColor, setSelectedColor] = useState(defaultColor);
  const [selectedWidth, setSelectedWidth] = useState(BRUSH_SIZES[1].value);
  const [hasStrokes, setHasStrokes] = useState((initialStrokes || []).length > 0);

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
            <p style={{ fontWeight: 800, color: 'var(--cyan-soft)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Round {roundNumber} · Draw
            </p>
            <h2 style={{ fontSize: '1.6rem' }}>
              Draw: <span style={{ color: isImposter ? 'var(--pink)' : 'var(--green)' }}>{word}</span>
            </h2>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button
              className="btn btn-secondary"
              onClick={() => undoRef.current?.()}
              disabled={!hasStrokes}
            >
              ↩️ Undo
            </button>
            <button className="btn btn-secondary" onClick={() => clearRef.current?.()}>
              🗑️ Clear
            </button>
          </div>
        </div>

        <Timer endsAt={drawEndsAt} totalSeconds={drawTime} label="Time to draw" accent="violet" />

        {/* Toolbar dock — a single glass strip for color + brush size, so it
            reads as one professional drawing tool rather than loose buttons. */}
        <div
          className="card"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 'var(--space-5)',
            padding: 'var(--space-3) var(--space-4)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            {PALETTE.map((c) => (
              <button
                key={c.key}
                onClick={() => setSelectedColor(c.hex)}
                aria-label={`Use ${c.key} color`}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  background: c.hex,
                  border: selectedColor === c.hex ? '2px solid white' : '2px solid rgba(255,255,255,0.15)',
                  boxShadow: selectedColor === c.hex ? `0 0 0 3px ${c.hex}55, 0 0 14px ${c.hex}77` : 'none',
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'transform 0.12s ease, box-shadow 0.15s ease',
                  transform: selectedColor === c.hex ? 'scale(1.12)' : 'scale(1)',
                }}
              />
            ))}
          </div>

          <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--line)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            {BRUSH_SIZES.map((b) => (
              <button
                key={b.key}
                className={`btn btn-toggle ${selectedWidth === b.value ? 'active' : ''}`}
                style={{ padding: '8px 14px', minWidth: 44 }}
                onClick={() => setSelectedWidth(b.value)}
                aria-label={`Brush size ${b.key}`}
              >
                {b.key}
              </button>
            ))}
          </div>

          <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--line)' }} />

          <button
            className={`btn btn-toggle ${myDone ? 'active' : ''}`}
            style={{ padding: '10px 20px' }}
            onClick={markDone}
            disabled={myDone}
          >
            {myDone ? '✅ Done!' : '🔔 Done Drawing'}
          </button>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginLeft: 'auto' }}>
            {players.map((p) => (
              <span key={p.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <PlayerTag name={p.name} colorKey={p.colorKey} size="sm" muted={!doneIds.has(p.id)} />
                {doneIds.has(p.id) && (
                  <span style={{ color: 'var(--green)', fontWeight: 800, fontSize: '0.9rem' }} aria-label="Done drawing">
                    ✓
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>

        <div className="canvas-mat" style={{ flex: 1, minHeight: 320 }}>
          <DrawCanvas
            color={selectedColor}
            strokeWidth={selectedWidth}
            onStrokeChunk={onStrokeChunk}
            onClear={clearRef}
            onUndo={undoRef}
            onStrokeCountChange={(count) => setHasStrokes(count > 0)}
            initialStrokes={initialStrokes}
          />
        </div>
        <p style={{ textAlign: 'center', color: 'var(--ink-faint)', fontWeight: 600, fontSize: '0.85rem' }}>
          Only you can see this canvas until the reveal.
        </p>
      </div>
    </div>
  );
}
