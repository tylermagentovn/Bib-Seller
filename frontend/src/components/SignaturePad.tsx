import { useRef, useState, useEffect } from "react";
import { Trash2 } from "lucide-react";

interface SignaturePadProps {
  onChange: (dataUrl: string | null) => void;
}

export function SignaturePad({ onChange }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const isEmptyRef = useRef(true);
  const onChangeRef = useRef(onChange);
  const [isEmpty, setIsEmpty] = useState(true);

  onChangeRef.current = onChange;

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const getXY = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const sx = canvas.width / rect.width;
      const sy = canvas.height / rect.height;
      const src = "touches" in e ? e.touches[0] : e;
      return {
        x: (src.clientX - rect.left) * sx,
        y: (src.clientY - rect.top) * sy,
      };
    };

    const onStart = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      drawing.current = true;
      const { x, y } = getXY(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    };

    const onMove = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      if (!drawing.current) return;
      const { x, y } = getXY(e);
      ctx.lineTo(x, y);
      ctx.stroke();
      if (isEmptyRef.current) {
        isEmptyRef.current = false;
        setIsEmpty(false);
      }
      onChangeRef.current(canvas.toDataURL("image/png"));
    };

    const onEnd = () => {
      drawing.current = false;
    };

    canvas.addEventListener("mousedown", onStart);
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseup", onEnd);
    canvas.addEventListener("mouseleave", onEnd);
    canvas.addEventListener("touchstart", onStart, { passive: false });
    canvas.addEventListener("touchmove", onMove, { passive: false });
    canvas.addEventListener("touchend", onEnd);

    return () => {
      canvas.removeEventListener("mousedown", onStart);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseup", onEnd);
      canvas.removeEventListener("mouseleave", onEnd);
      canvas.removeEventListener("touchstart", onStart);
      canvas.removeEventListener("touchmove", onMove);
      canvas.removeEventListener("touchend", onEnd);
    };
  }, []);

  const clear = () => {
    const canvas = canvasRef.current!;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    isEmptyRef.current = true;
    setIsEmpty(true);
    onChangeRef.current(null);
  };

  return (
    <div className="space-y-1.5">
      <canvas
        ref={canvasRef}
        width={560}
        height={150}
        className="w-full rounded-xl border-2 border-dashed border-gray-300 bg-white touch-none cursor-crosshair"
      />
      {!isEmpty ? (
        <button
          type="button"
          onClick={clear}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
        >
          <Trash2 className="h-3 w-3" />
          Xóa và ký lại
        </button>
      ) : (
        <p className="text-xs text-gray-400">Ký tên bằng chuột hoặc ngón tay</p>
      )}
    </div>
  );
}
