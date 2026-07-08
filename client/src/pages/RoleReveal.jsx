import { useEffect } from 'react';

const AUTO_ADVANCE_MS = 4500;

export default function RoleReveal({ isImposter, word, roundNumber, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, AUTO_ADVANCE_MS);
    return () => clearTimeout(t);
  }, [onDone]);

  const bg = isImposter ? '#E4402F' : 'var(--sage-base)';

  return (
    <div
      className="phase-fade"
      onClick={onDone}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onDone()}
      style={{
        position: 'fixed',
        inset: 0,
        background: bg,
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: 'var(--space-6)',
        zIndex: 40,
        cursor: 'pointer',
      }}
    >
      <div style={{ fontSize: '3.4rem', marginBottom: 'var(--space-4)' }}>{isImposter ? '🎭' : '🎨'}</div>
      <h1 style={{ fontSize: 'clamp(1.8rem, 6vw, 3rem)', marginBottom: 'var(--space-4)' }}>
        {isImposter ? "YOU ARE THE IMPOSTOR" : 'YOU ARE A CREWMATE'}
      </h1>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.6rem, 5vw, 2.4rem)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
        {word}
      </p>
      {!isImposter && (
        <p style={{ fontWeight: 700, opacity: 0.9, maxWidth: 420 }}>
          Draw it so your team can guess — don't give it away.
        </p>
      )}
      {isImposter && (
        <p style={{ fontWeight: 700, opacity: 0.9, maxWidth: 420 }}>
          Your word is close, but not the same. Blend in.
        </p>
      )}
      <p style={{ marginTop: 'var(--space-6)', opacity: 0.75, fontSize: '0.9rem', fontWeight: 700 }}>
        Round {roundNumber} · Tap to continue
      </p>
    </div>
  );
}
