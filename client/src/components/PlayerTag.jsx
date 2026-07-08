export default function PlayerTag({ name, colorKey, size = 'md', muted = false }) {
  return (
    <span
      className={`player-tag accent-${colorKey || 'sky'}`}
      style={{
        fontSize: size === 'sm' ? '0.85rem' : size === 'lg' ? '1.2rem' : '1rem',
        opacity: muted ? 0.5 : 1,
      }}
    >
      <span className="dot" />
      {name}
    </span>
  );
}
