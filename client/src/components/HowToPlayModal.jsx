export default function HowToPlayModal({ onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-5)' }}>
          <h2 style={{ fontSize: '1.8rem' }}>How to play 👀</h2>
          <button className="btn-ghost btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <Section emoji="🎭" title="The setup">
          Everyone gets the same secret word — except one <strong>imposter</strong>, who
          gets a sneaky, similar-but-different word. Nobody knows who's who.
        </Section>

        <Section emoji="✏️" title="Draw phase">
          Everyone draws their word on a private canvas. Crewmates want to draw
          something recognizable — but not <em>too</em> obvious, or the imposter
          copies off the vibe. The imposter has to bluff.
        </Section>

        <Section emoji="🔍" title="Reveal, piece by piece">
          Drawings are split into 4 quadrants. One quadrant is revealed for
          everyone at a time — top-left, top-right, bottom-left, bottom-right.
        </Section>

        <Section emoji="💬" title="Discuss & call a vote">
          After each reveal, talk it over out loud — who looks off? Confident?
          Tap <strong>Call a Vote</strong> — if everyone calls it, voting
          starts immediately. Otherwise the next quadrant reveals when time
          runs out.
        </Section>

        <Section emoji="🗳️" title="Vote">
          Everyone privately votes for who they think the imposter is.
          Majority accusation decides the outcome.
        </Section>

        <Section emoji="🏆" title="Round end">
          Accuse the real imposter → <strong>Imposter caught</strong>, crewmates
          score. Guess wrong, tie, or run out of quadrants →
          <strong> Imposter escapes</strong> and scores instead.
        </Section>

        <button className="btn btn-primary" style={{ width: '100%', marginTop: 'var(--space-5)' }} onClick={onClose}>
          Got it, let's play
        </button>
      </div>
    </div>
  );
}

function Section({ emoji, title, children }) {
  return (
    <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
      <div style={{ fontSize: '1.6rem', lineHeight: 1 }}>{emoji}</div>
      <div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 2 }}>{title}</div>
        <div style={{ color: 'var(--ink-soft)', fontSize: '0.95rem', lineHeight: 1.45 }}>{children}</div>
      </div>
    </div>
  );
}
