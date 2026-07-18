import PlayerTag from '../components/PlayerTag.jsx';

export default function VoteResult({ result }) {
  if (!result) return null;

  // outcome is always exactly one of these three — set unconditionally by
  // the server, so there's no combination of fields here that falls
  // through without a screen.
  const { accusedId, accusedName, accusedColorKey, outcome, isLastQuadrant } = result;

  let bg = 'var(--sunshine-base)';
  let emoji = '🤷';
  let headline = 'No one was ejected.';
  let sub = 'The vote was too split to reach a majority.';
  let caption = null;

  if (outcome === 'caught') {
    // Case 1 — victory screen.
    bg = 'var(--sage-base)';
    emoji = '✅';
    headline = 'The Impostor was caught!';
    sub = 'Victory for the crew — the round ends here.';
  } else if (outcome === 'wrong') {
    // Case 2.
    bg = '#E4402F';
    emoji = '❌';
    headline = 'An innocent crewmate was ejected.';
    sub = 'The Impostor escaped!';
    caption = isLastQuadrant
      ? null
      : 'The real imposter is still out there — on to the next quadrant…';
  }
  // outcome === 'noMajority' (Case 3) keeps the defaults above — nobody is
  // shown as accused and no player is removed from the game.

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

      {outcome !== 'noMajority' && accusedId && (
        <div style={{ marginBottom: 'var(--space-4)', transform: 'scale(1.3)' }}>
          <PlayerTag name={accusedName} colorKey={accusedColorKey} size="lg" />
        </div>
      )}

      <h1 style={{ fontSize: 'clamp(1.8rem, 6vw, 3rem)', marginBottom: 'var(--space-3)' }}>{headline}</h1>
      <p style={{ fontWeight: 700, opacity: 0.92, maxWidth: 460 }}>{sub}</p>
      {caption && (
        <p style={{ marginTop: 'var(--space-3)', fontWeight: 600, opacity: 0.75, fontSize: '0.85rem' }}>{caption}</p>
      )}
    </div>
  );
}
