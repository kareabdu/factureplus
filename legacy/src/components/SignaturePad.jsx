import React, { useRef, forwardRef, useImperativeHandle, useEffect } from "react";

const SignaturePad = forwardRef((props, ref) => {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const hasDrawn = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(rect.width * ratio));
    canvas.height = Math.max(1, Math.round(rect.height * ratio));
    const ctx = canvas.getContext("2d");
    ctx.scale(ratio, ratio);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "#111827";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
  }, []);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e) => {
    e.preventDefault();
    drawing.current = true;
    last.current = getPos(e);
  };

  const move = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const pos = getPos(e);
    const ctx = canvasRef.current.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    last.current = pos;
    hasDrawn.current = true;
  };

  const end = () => {
    drawing.current = false;
    props.onEnd?.();
  };

  useImperativeHandle(ref, () => ({
    getDataURL: () => canvasRef.current?.toDataURL("image/png"),
    clear: () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      const rect = canvas.getBoundingClientRect();
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, rect.width, rect.height);
      hasDrawn.current = false;
    },
    isEmpty: () => !hasDrawn.current,
  }));

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-40 bg-white border border-gray-200 rounded-xl touch-none cursor-crosshair"
      onPointerDown={start}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
    />
  );
});

export default SignaturePad;