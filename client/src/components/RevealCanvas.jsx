import { useEffect, useRef } from 'react';
import { setupHiDPICanvas, drawStrokesClipped, drawQuadrantGuides } from '../canvasUtils.js';

export default function RevealCanvas({ strokes, revealedQuadrants }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const draw = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const rect = container.getBoundingClientRect();
    const ctx = setupHiDPICanvas(canvas, rect.width, rect.height);
    drawStrokesClipped(ctx, strokes || [], rect.width, rect.height, revealedQuadrants || []);
    drawQuadrantGuides(ctx, rect.width, rect.height);
  };

  useEffect(() => {
    draw();
    const ro = new ResizeObserver(draw);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strokes, revealedQuadrants]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        aspectRatio: '1 / 1',
        background: 'white',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </div>
  );
}
