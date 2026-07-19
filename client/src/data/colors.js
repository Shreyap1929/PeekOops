// Same 5 keys the server hands out via colorKey (server/colors.js) — only
// the hex values changed, for the dark glassmorphism theme. tint is now a
// translucent overlay (low-alpha white-mixed color) instead of a pale flat
// tint, so it reads correctly on a dark glass card.
export const ACCENTS = {
  coral: { tint: 'rgba(251, 113, 133, 0.16)', soft: '#FDA4AF', base: '#FB7185', shade: '#E11D48' },
  sky: { tint: 'rgba(56, 189, 248, 0.16)', soft: '#7DD3FC', base: '#38BDF8', shade: '#0EA5E9' },
  sage: { tint: 'rgba(52, 211, 153, 0.16)', soft: '#6EE7B7', base: '#34D399', shade: '#10B981' },
  sunshine: { tint: 'rgba(251, 191, 36, 0.16)', soft: '#FCD34D', base: '#FBBF24', shade: '#F59E0B' },
  lilac: { tint: 'rgba(167, 139, 250, 0.16)', soft: '#C4B5FD', base: '#A78BFA', shade: '#8B5CF6' },
};

export function accentBase(colorKey) {
  return ACCENTS[colorKey]?.base || '#F4F6FF';
}
