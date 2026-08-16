// ─── SIGNATURE PAD ────────────────────────────────────────────────────────────
// Canvas-based finger/stylus signature capture.
// Returns base64 PNG via onSave callback.
// No external dependencies — pure canvas API.
import { useRef, useState, useEffect } from "react";
import { C } from "./constants";

export default function SignaturePad({ onSave, height = 160 }) {
  const canvasRef = useRef(null);
  const drawing   = useRef(false);
  const [hasSig, setHasSig] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width  = canvas.offsetWidth;
    canvas.height = height;
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#f0c040";
    ctx.lineWidth   = 2.5;
    ctx.lineCap     = "round";
    ctx.lineJoin    = "round";
  }, []);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const src  = e.touches ? e.touches[0] : e;
    return {
      x: src.clientX - rect.left,
      y: src.clientY - rect.top,
    };
  };

  const start = (e) => {
    e.preventDefault();
    drawing.current = true;
    const ctx = canvasRef.current.getContext("2d");
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const move = (e) => {
    e.preventDefault();
    if (!drawing.current) return;
    const ctx = canvasRef.current.getContext("2d");
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    if (!hasSig) setHasSig(true);
  };

  const end = (e) => {
    e.preventDefault();
    if (!drawing.current) return;
    drawing.current = false;
    // Save as base64
    const data = canvasRef.current.toDataURL("image/png");
    onSave(data);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext("2d");
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSig(false);
    onSave(null);
  };

  return (
    <div>
      <div style={{ position: "relative", borderRadius: 10, overflow: "hidden",
        border: `2px dashed ${hasSig ? C.gold : C.ash}`, transition: "border 0.2s" }}>
        <canvas
          ref={canvasRef}
          style={{ display: "block", width: "100%", height, touchAction: "none",
            cursor: "crosshair" }}
          onMouseDown={start}  onMouseMove={move}  onMouseUp={end}
          onTouchStart={start} onTouchMove={move}  onTouchEnd={end}
        />
        {!hasSig && (
          <div style={{ position: "absolute", inset: 0, display: "flex",
            alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
            <span style={{ color: "#333", fontFamily: "monospace", fontSize: 13 }}>
              Sign here with your finger ↑
            </span>
          </div>
        )}
      </div>
      {hasSig && (
        <button onClick={clear} style={{ background: "transparent", border: "none",
          color: C.ghost, fontFamily: "monospace", fontSize: 12,
          cursor: "pointer", marginTop: 6, padding: 0 }}>
          ✕ Clear and sign again
        </button>
      )}
    </div>
  );
}
