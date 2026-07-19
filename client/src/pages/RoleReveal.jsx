import { useEffect } from 'react';

const AUTO_ADVANCE_MS = 4500;

export default function RoleReveal({ isImposter, word, roundNumber, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, AUTO_ADVANCE_MS);
    return () => clearTimeout(t);
  }, [onDone]);

  const burst = isImposter
    ? 'radial-gradient(circle at 50% 36%, rgba(251,113,133,0.85), rgba(190,24,73,0.55) 45%, #2A0A15 82%)'
    : 'radial-gradient(circle at 50% 36%, rgba(52,211,153,0.8), rgba(6,95,70,0.55) 45%, #06231C 82%)';

  return (
    <div
      className="spotlight-screen phase-fade"
      onClick={onDone}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onDone()}
      style={{ '--burst': burst, cursor: 'pointer' }}
    >
      <div className="spotlight-icon">{isImposter ? '🎭' : '🎨'}</div>
      <h1 style={{ fontSize: 'clamp(1.8rem, 6vw, 3rem)', marginBottom: 'var(--space-4)' }}>
        {isImposter ? "YOU ARE THE IMPOSTER" : 'YOU ARE A CREWMATE'}
      </h1>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.6rem, 5vw, 2.4rem)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
        {word}
      </p>
      {!isImposter && (
        <p style={{ fontWeight: 600, opacity: 0.92, maxWidth: 420 }}>
          Draw it so your team can guess — don't give it away.
        </p>
      )}
      {isImposter && (
        <p style={{ fontWeight: 600, opacity: 0.92, maxWidth: 420 }}>
          Your word is close, but not the same. Blend in.
        </p>
      )}
      <p style={{ marginTop: 'var(--space-6)', opacity: 0.75, fontSize: '0.9rem', fontWeight: 700 }}>
        Round {roundNumber} · Tap to continue
      </p>
    </div>
  );
}
