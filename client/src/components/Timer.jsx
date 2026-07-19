import { useEffect, useRef, useState } from 'react';
import { playSound } from '../sound.js';

export default function Timer({ endsAt, totalSeconds, label, accent = 'sky' }) {
  const [remainingMs, setRemainingMs] = useState(() => Math.max(0, (endsAt || 0) - Date.now()));
  // Guards the countdown sound so it fires exactly once per timer
  // instance (i.e. once per endsAt), not on every ~200ms tick while the
  // remaining time stays inside the last-5-seconds window.
  const countdownFiredRef = useRef(false);

  useEffect(() => {
    countdownFiredRef.current = false;
    if (!endsAt) return undefined;
    const tick = () => {
      const ms = Math.max(0, endsAt - Date.now());
      setRemainingMs(ms);
      // Computed fresh from Date.now() right here — deliberately not
      // derived from remainingSec/low below, which can briefly still hold
      // the PREVIOUS endsAt's value during the same render this effect
      // resets on (e.g. discuss timer hands off to vote timer on the same
      // Timer instance). Using the fresh value here means the one-shot
      // fire is always judged against the timer this effect actually just
      // (re)started, never a leftover from the one before it.
      const sec = Math.ceil(ms / 1000);
      if (sec <= 5 && sec > 0 && !countdownFiredRef.current) {
        countdownFiredRef.current = true;
        playSound('countdown');
      }
    };
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
