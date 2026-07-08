import { useEffect, useRef } from 'react';
import { setupHiDPICanvas, drawStrokesFull, drawQuadrantGuides } from '../canvasUtils.js';

const EMIT_INTERVAL_MS = 70;

export default function DrawCanvas({ color, strokeWidth = 5, disabled, onStrokeChunk, onClear }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const ctxRef = useRef(null);
  const sizeRef = useRef({ w: 0, h: 0 });

  const strokesRef = useRef([]); // full history, normalized points
  const activeStrokeRef = useRef(null);
  const pendingPointsRef = useRef([]); // points not yet flushed to server
  const flushTimerRef = useRef(null);
  const strokeCounterRef = useRef(0);
  const isFirstChunkRef = useRef(false);

  const redraw = () => {
    const ctx = ctxRef.current;
    const { w, h } = sizeRef.current;
    if (!ctx) return;
    drawStrokesFull(ctx, strokesRef.current, w, h);
    drawQuadrantGuides(ctx, w, h);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      sizeRef.current = { w: rect.width, h: rect.height };
      ctxRef.current = setupHiDPICanvas(canvas, rect.width, rect.height);
      redraw();
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(container);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (flushTimerRef.current) clearInterval(flushTimerRef.current);
    };
  }, []);

  const flush = () => {
    if (pendingPointsRef.current.length === 0 || !activeStrokeRef.current) return;
    const points = pendingPointsRef.current;
    pendingPointsRef.current = [];
    onStrokeChunk?.({
      strokeId: activeStrokeRef.current.id,
      color: activeStrokeRef.current.color,
      width: activeStrokeRef.current.width,
      points,
      newStroke: isFirstChunkRef.current,
    });
    isFirstChunkRef.current = false;
  };

  const getNormalizedPoint = (e) => {
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    return { x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) };
  };

  const handlePointerDown = (e) => {
    if (disabled) return;
    e.target.setPointerCapture?.(e.pointerId);
    const p = getNormalizedPoint(e);
    strokeCounterRef.current += 1;
    const stroke = {
      id: `${Date.now()}-${strokeCounterRef.current}`,
      color,
      width: strokeWidth,
      points: [p],
    };
    activeStrokeRef.current = stroke;
    strokesRef.current.push(stroke);
    pendingPointsRef.current = [p];
    isFirstChunkRef.current = true;

    redraw();
    flushTimerRef.current = setInterval(flush, EMIT_INTERVAL_MS);
  };

  const handlePointerMove = (e) => {
    if (disabled || !activeStrokeRef.current) return;
    const p = getNormalizedPoint(e);
    const stroke = activeStrokeRef.current;
    const last = stroke.points[stroke.points.length - 1];
    // Skip near-duplicate points to keep payloads small.
    if (last && Math.abs(last.x - p.x) < 0.001 && Math.abs(last.y - p.y) < 0.001) return;
    stroke.points.push(p);
    pendingPointsRef.current.push(p);

    const { w, h } = sizeRef.current;
    const ctx = ctxRef.current;
    if (ctx && last) {
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(last.x * w, last.y * h);
      ctx.lineTo(p.x * w, p.y * h);
      ctx.stroke();
    }
  };

  const endStroke = () => {
    if (!activeStrokeRef.current) return;
    flush();
    if (flushTimerRef.current) {
      clearInterval(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    activeStrokeRef.current = null;
  };

  useEffect(() => {
    if (onClear) {
      onClear.current = () => {
        strokesRef.current = [];
        redraw();
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClear]);

  return (
    <div
      ref={containerRef}
      className="draw-canvas-wrap"
      style={{
        width: '100%',
        height: '100%',
        touchAction: 'none',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        background: 'white',
        position: 'relative',
        cursor: disabled ? 'default' : 'crosshair',
      }}
    >
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endStroke}
        onPointerLeave={endStroke}
        onPointerCancel={endStroke}
        style={{ display: 'block' }}
      />
    </div>
  );
}
