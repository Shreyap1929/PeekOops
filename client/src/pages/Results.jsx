import PlayerTag from '../components/PlayerTag.jsx';

export default function Results({ results, isHost, onNextRound }) {
  if (!results) return null;
  const caught = results.outcome === 'caught';
  const imposter = results.players.find((p) => p.id === results.imposterId);
  const sorted = [...results.players].sort((a, b) => b.score - a.score);

  return (
    <div className="app-shell phase-fade">
      <div className="wide" style={{ paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-8)', flex: 1 }}>
        <div className="card" style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto var(--space-6)' }}>
          <div style={{ fontSize: '2.6rem', marginBottom: 'var(--space-3)' }}>{caught ? '🎉' : '🃏'}</div>
          <h1 style={{ fontSize: '2rem', color: caught ? 'var(--sage-shade)' : 'var(--coral-shade)' }}>
            {caught ? 'Imposter caught!' : 'Imposter got away!'}
          </h1>
          <div style={{ marginTop: 'var(--space-4)', display: 'flex', justifyContent: 'center' }}>
            {imposter && <PlayerTag name={imposter.name} colorKey={imposter.colorKey} size="lg" />}
          </div>
          <p style={{ marginTop: 'var(--space-2)', color: 'var(--ink-soft)', fontWeight: 700 }}>was the imposter</p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 'var(--space-3)',
              marginTop: 'var(--space-5)',
            }}
          >
            <div style={{ background: 'var(--sage-tint)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--sage-shade)', textTransform: 'uppercase' }}>Crew word</p>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', marginTop: 4 }}>{results.word}</p>
            </div>
            <div style={{ background: '#FDE8E5', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 800, color: '#E4402F', textTransform: 'uppercase' }}>Imposter word</p>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', marginTop: 4 }}>{results.imposterWord}</p>
            </div>
          </div>
        </div>

        <div className="card" style={{ maxWidth: 640, margin: '0 auto' }}>
          <h3 style={{ marginBottom: 'var(--space-4)' }}>Scoreboard</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {sorted.map((p, i) => (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 'var(--space-3)',
                  borderRadius: 'var(--radius-md)',
                  background: i === 0 ? 'var(--sunshine-tint)' : 'transparent',
                }}
              >
                <PlayerTag name={p.name} colorKey={p.colorKey} />
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>{p.score} pts</span>
              </div>
            ))}
          </div>

          {isHost ? (
            <button className="btn btn-primary" style={{ width: '100%', marginTop: 'var(--space-5)' }} onClick={onNextRound}>
              Next Round →
            </button>
          ) : (
            <p style={{ textAlign: 'center', marginTop: 'var(--space-5)', color: 'var(--ink-soft)', fontWeight: 700 }}>
              Waiting for the host to start the next round…
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
