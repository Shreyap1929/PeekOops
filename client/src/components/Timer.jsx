import { useEffect, useState } from 'react';

export default function Timer({ endsAt, totalSeconds, label, accent = 'sky' }) {
  const [remainingMs, setRemainingMs] = useState(() => Math.max(0, (endsAt || 0) - Date.now()));

  useEffect(() => {
    if (!endsAt) return undefined;
    const tick = () => setRemainingMs(Math.max(0, endsAt - Date.now()));
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [endsAt]);

  const remainingSec = Math.ceil(remainingMs / 1000);
  const pct = totalSeconds ? Math.max(0, Math.min(100, (remainingMs / 1000 / totalSeconds) * 100)) : 0;
  const low = remainingSec <= 5;

  return (
    <div style={{ width: '100%' }}>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {label}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              color: low ? 'var(--coral-shade)' : 'var(--ink)',
            }}
          >
            {remainingSec}s
          </span>
        </div>
      )}
      <div style={{ height: 8, borderRadius: 999, background: '#EFE8D8', overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: low ? 'var(--coral-base)' : `var(--${accent}-base)`,
            transition: 'width 0.2s linear, background 0.2s ease',
            borderRadius: 999,
          }}
        />
      </div>
    </div>
  );
}
