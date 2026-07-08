import { useRef } from 'react';
import DrawCanvas from '../components/DrawCanvas.jsx';
import Timer from '../components/Timer.jsx';
import { accentBase } from '../data/colors.js';

export default function Draw({ word, isImposter, drawEndsAt, drawTime, myColorKey, roundNumber, onStrokeChunk }) {
  const clearRef = useRef(null);
  const color = accentBase(myColorKey);

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

        <div style={{ flex: 1, minHeight: 320 }}>
          <DrawCanvas color={color} strokeWidth={5} onStrokeChunk={onStrokeChunk} onClear={clearRef} />
        </div>
        <p style={{ textAlign: 'center', color: 'var(--ink-soft)', fontWeight: 700, fontSize: '0.85rem' }}>
          Only you can see this canvas until the reveal.
        </p>
      </div>
    </div>
  );
}
