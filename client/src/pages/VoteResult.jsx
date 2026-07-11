import PlayerTag from '../components/PlayerTag.jsx';

export default function VoteResult({ result }) {
  if (!result) return null;

  const { accusedId, accusedName, accusedColorKey, wasImposter, noMajority, isLastQuadrant } = result;

  let bg = 'var(--sunshine-base)';
  let emoji = '🤷';
  let headline = 'No clear majority';
  let sub = 'The vote was too split — nobody gets ejected.';

  if (!noMajority && accusedId) {
    if (wasImposter) {
      bg = 'var(--sage-base)';
      emoji = '✅';
      headline = 'Imposter caught!';
      sub = 'Nailed it — the round ends here.';
    } else {
      bg = '#E4402F';
      emoji = '❌';
      headline = 'Not the imposter';
      sub = isLastQuadrant
        ? "That was everyone's last guess — the imposter got away."
        : 'The real imposter is still out there. On to the next quadrant…';
    }
  }

  return (
    <div
      className="phase-fade"
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
      }}
    >
      <div style={{ fontSize: '3.4rem', marginBottom: 'var(--space-4)' }}>{emoji}</div>

      {!noMajority && accusedId && (
        <div style={{ marginBottom: 'var(--space-4)', transform: 'scale(1.3)' }}>
          <PlayerTag name={accusedName} colorKey={accusedColorKey} size="lg" />
        </div>
      )}

      <h1 style={{ fontSize: 'clamp(1.8rem, 6vw, 3rem)', marginBottom: 'var(--space-3)' }}>{headline}</h1>
      <p style={{ fontWeight: 700, opacity: 0.92, maxWidth: 460 }}>{sub}</p>
    </div>
  );
}
