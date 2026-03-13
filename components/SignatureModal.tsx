import React, { useRef, useState, useEffect, useCallback } from 'react';
import { X, PenLine, RotateCcw, CheckCircle } from 'lucide-react';

interface SignatureModalProps {
    technicianName: string;
    clientName: string;
    workDescription: string;
    onSign: (signatureDataUrl: string) => Promise<void>;
    onClose: () => void;
}

export const SignatureModal: React.FC<SignatureModalProps> = ({
    technicianName, clientName, workDescription, onSign, onClose
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [isEmpty, setIsEmpty] = useState(true);
    const [saving, setSaving] = useState(false);
    const lastPos = useRef<{ x: number; y: number } | null>(null);

    // Initialise canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }, []);

    const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        if ('touches' in e) {
            const touch = e.touches[0] || e.changedTouches[0];
            return {
                x: (touch.clientX - rect.left) * scaleX,
                y: (touch.clientY - rect.top) * scaleY,
            };
        } else {
            return {
                x: (e.clientX - rect.left) * scaleX,
                y: (e.clientY - rect.top) * scaleY,
            };
        }
    };

    const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;
        setIsDrawing(true);
        setIsEmpty(false);
        lastPos.current = getPos(e, canvas);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d')!;
        const pos = getPos(e, canvas);
        if (lastPos.current) {
            ctx.beginPath();
            ctx.moveTo(lastPos.current.x, lastPos.current.y);
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
        }
        lastPos.current = pos;
    };

    const stopDraw = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        setIsDrawing(false);
        lastPos.current = null;
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        setIsEmpty(true);
    };

    const handleSign = async () => {
        const canvas = canvasRef.current;
        if (!canvas || isEmpty) return;
        setSaving(true);
        try {
            await onSign(canvas.toDataURL('image/png'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black z-[60] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                    <PenLine size={20} className="text-white" />
                    <div>
                        <p className="font-bold text-white text-sm">Firma del cliente</p>
                        <p className="text-white/50 text-xs">Confirmo la finalización de los trabajos</p>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors">
                    <X size={20} />
                </button>
            </div>

            {/* Document summary */}
            <div className="px-5 py-3 bg-white/5 border-b border-white/10">
                <div className="flex flex-wrap gap-x-8 gap-y-1 text-xs text-white/70">
                    <span>Técnico: <strong className="text-white">{technicianName}</strong></span>
                    <span>Cliente: <strong className="text-white">{clientName}</strong></span>
                    <span>Fecha: <strong className="text-white">{new Date().toLocaleDateString('es-ES')}</strong></span>
                </div>
                <p className="text-xs text-white/50 mt-1 truncate">{workDescription}</p>
            </div>

            {/* Canvas area */}
            <div className="flex-1 flex flex-col items-center justify-center p-4 select-none">
                <p className="text-white/40 text-xs mb-3 uppercase tracking-widest">Firme aquí</p>
                <div className="relative w-full max-w-lg border-2 border-white/20 rounded-2xl overflow-hidden shadow-2xl">
                    <canvas
                        ref={canvasRef}
                        width={800}
                        height={320}
                        className="w-full touch-none bg-white cursor-crosshair block"
                        onMouseDown={startDraw}
                        onMouseMove={draw}
                        onMouseUp={stopDraw}
                        onMouseLeave={stopDraw}
                        onTouchStart={startDraw}
                        onTouchMove={draw}
                        onTouchEnd={stopDraw}
                    />
                    {isEmpty && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <p className="text-slate-300 text-sm font-medium">← Deslice para firmar →</p>
                        </div>
                    )}
                </div>
                <div className="mt-4 w-full max-w-lg border-t border-white/10 pt-1">
                    <p className="text-center text-white/30 text-[10px] uppercase tracking-widest">Firma del cliente</p>
                </div>
            </div>

            {/* Footer actions */}
            <div className="flex gap-3 px-5 py-4 border-t border-white/10">
                <button
                    onClick={clearCanvas}
                    disabled={isEmpty || saving}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/20 text-white/70 hover:text-white hover:border-white/40 disabled:opacity-30 transition-colors text-sm font-semibold"
                >
                    <RotateCcw size={15} /> Borrar
                </button>
                <button
                    onClick={handleSign}
                    disabled={isEmpty || saving}
                    className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 text-white px-3 py-2 rounded-xl font-bold text-sm hover:bg-emerald-400 disabled:opacity-30 transition-colors"
                >
                    {saving
                        ? <><span className="animate-spin text-base">◌</span> Guardando…</>
                        : <><CheckCircle size={17} /> Confirmar y firmar</>}
                </button>
            </div>
        </div>
    );
};
