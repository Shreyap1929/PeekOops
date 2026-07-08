// Strokes store points in NORMALIZED 0..1 coordinates so a drawing scales
// cleanly to any canvas size (mobile vs desktop, private canvas vs the
// small reveal-grid thumbnails).

export const QUADRANTS = {
  1: { x0: 0, y0: 0, x1: 0.5, y1: 0.5 }, // top-left
  2: { x0: 0.5, y0: 0, x1: 1, y1: 0.5 }, // top-right
  3: { x0: 0, y0: 0.5, x1: 0.5, y1: 1 }, // bottom-left
  4: { x0: 0.5, y0: 0.5, x1: 1, y1: 1 }, // bottom-right
};

export function setupHiDPICanvas(canvas, cssWidth, cssHeight) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(cssWidth * dpr);
  canvas.height = Math.round(cssHeight * dpr);
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

function strokePath(ctx, stroke, w, h) {
  const pts = stroke.points;
  if (!pts || pts.length === 0) return;
  ctx.strokeStyle = stroke.color || '#2B2A28';
  ctx.lineWidth = stroke.width || 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  if (pts.length === 1) {
    // A tap with no drag — draw a dot.
    const p = pts[0];
    ctx.arc(p.x * w, p.y * h, (stroke.width || 4) / 2, 0, Math.PI * 2);
    ctx.fillStyle = stroke.color || '#2B2A28';
    ctx.fill();
    return;
  }
  ctx.moveTo(pts[0].x * w, pts[0].y * h);
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i].x * w, pts[i].y * h);
  }
  ctx.stroke();
}

/** Draw all strokes, unclipped — used for the player's own private canvas. */
export function drawStrokesFull(ctx, strokes, w, h) {
  ctx.clearRect(0, 0, w, h);
  for (const stroke of strokes) strokePath(ctx, stroke, w, h);
}

/**
 * Draw strokes, but only the portions falling inside the given set of
 * revealed quadrants (1-4). Uses canvas clip regions per quadrant so a
 * stroke that crosses quadrant boundaries is masked correctly.
 */
export function drawStrokesClipped(ctx, strokes, w, h, revealedQuadrants) {
  ctx.clearRect(0, 0, w, h);
  for (const qn of revealedQuadrants) {
    const q = QUADRANTS[qn];
    if (!q) continue;
    ctx.save();
    ctx.beginPath();
    ctx.rect(q.x0 * w, q.y0 * h, (q.x1 - q.x0) * w, (q.y1 - q.y0) * h);
    ctx.clip();
    for (const stroke of strokes) strokePath(ctx, stroke, w, h);
    ctx.restore();
  }
}

/** Faint quadrant divider lines, drawn on top so players can see the grid. */
export function drawQuadrantGuides(ctx, w, h, color = 'rgba(43,42,40,0.12)') {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 5]);
  ctx.beginPath();
  ctx.moveTo(w / 2, 0);
  ctx.lineTo(w / 2, h);
  ctx.moveTo(0, h / 2);
  ctx.lineTo(w, h / 2);
  ctx.stroke();
  ctx.restore();
}
