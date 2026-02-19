import React, { useState, useEffect } from 'react';
import { X, Layers, Check, ChevronDown } from 'lucide-react';
import { CartItem, Product } from '../types';

export interface PromoSelection {
    vinylCartItemId: string;
    laminate: Product;
    finish: 'gloss' | 'matte';
}

export interface PromoVinylEntry {
    vinylItem: CartItem;
    candidates: Product[];
}

interface CrossSellModalProps {
    isOpen: boolean;
    onClose: () => void;
    promoEntries: PromoVinylEntry[];
    onAcceptPromo: (selections: PromoSelection[]) => void;
    formatCurrency: (value: number) => string;
}

const DISCOUNT_M2 = 0.10;

export const CrossSellModal: React.FC<CrossSellModalProps> = ({
    isOpen,
    onClose,
    promoEntries,
    onAcceptPromo,
    formatCurrency,
}) => {
    const [selections, setSelections] = useState<Record<string, { laminateId: string; finish: 'gloss' | 'matte' }>>({});

    useEffect(() => {
        if (isOpen && promoEntries.length > 0) {
            const initial: Record<string, { laminateId: string; finish: 'gloss' | 'matte' }> = {};
            promoEntries.forEach(entry => {
                initial[entry.vinylItem.id] = {
                    laminateId: entry.candidates[0]?.id ?? '',
                    finish: 'gloss',
                };
            });
            setSelections(initial);
        }
    }, [isOpen, promoEntries]);

    if (!isOpen || promoEntries.length === 0) return null;

    const setFinish = (vinylId: string, finish: 'gloss' | 'matte') =>
        setSelections(prev => ({ ...prev, [vinylId]: { ...prev[vinylId], finish } }));

    const setLaminate = (vinylId: string, laminateId: string) =>
        setSelections(prev => ({ ...prev, [vinylId]: { ...prev[vinylId], laminateId } }));

    const handleAccept = () => {
        const result: PromoSelection[] = promoEntries.map(entry => {
            const sel = selections[entry.vinylItem.id];
            const laminate = entry.candidates.find(c => c.id === sel?.laminateId) ?? entry.candidates[0];
            return { vinylCartItemId: entry.vinylItem.id, laminate, finish: sel?.finish ?? 'gloss' };
        });
        onAcceptPromo(result);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div
                className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200"
                style={{ maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}
            >
                {/* Header */}
                <div className="relative bg-gradient-to-r from-slate-700 to-slate-800 px-5 py-4 text-white flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="absolute top-3 right-3 text-white/60 hover:text-white hover:bg-white/15 rounded-full p-1 transition-all"
                        aria-label="Cerrar"
                    >
                        <X size={16} />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="bg-white/15 w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Layers size={18} className="text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-0.5">
                                <span className="bg-amber-400 text-amber-900 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wide">
                                    Oferta Pack
                                </span>
                            </div>
                            <h2 className="text-sm font-bold leading-tight">¿Añadimos el laminado a juego?</h2>
                            <p className="text-slate-300 text-[11px] mt-0.5">
                                Descuento de <span className="font-semibold text-white">-{DISCOUNT_M2.toFixed(2).replace('.', ',')}€/m²</span> en ambas bobinas
                            </p>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="overflow-y-auto flex-1 p-4 space-y-3">
                    {promoEntries.map(entry => {
                        const { vinylItem, candidates } = entry;
                        const sel = selections[vinylItem.id];
                        const chosenLaminate = candidates.find(c => c.id === sel?.laminateId) ?? candidates[0];
                        if (!chosenLaminate) return null;

                        const vinylOrigPriceM2 = vinylItem.pricePerM2 ?? 0;
                        const vinylDiscPriceM2 = Math.max(0, vinylOrigPriceM2 - DISCOUNT_M2);
                        const lamOrigPriceM2 = chosenLaminate.pricePerM2 ?? 0;
                        const lamDiscPriceM2 = Math.max(0, lamOrigPriceM2 - DISCOUNT_M2);

                        return (
                            <div key={vinylItem.id} className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                                {/* Vinyl row */}
                                <div className="px-3 py-2.5 bg-white border-b border-slate-100 flex items-center gap-2">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-semibold text-slate-400 uppercase mb-0.5">Tu vinilo</p>
                                        <p className="text-xs font-semibold text-slate-800 truncate">{vinylItem.name}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className="text-[10px] line-through text-slate-400">{formatCurrency(vinylOrigPriceM2)}/m²</p>
                                        <p className="text-xs font-bold text-emerald-700">{formatCurrency(vinylDiscPriceM2)}/m²</p>
                                    </div>
                                </div>

                                {/* Laminate section */}
                                <div className="px-3 py-2.5">
                                    <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1.5">Laminado compatibe</p>

                                    {candidates.length > 1 && (
                                        <div className="relative mb-2">
                                            <select
                                                value={sel?.laminateId ?? candidates[0].id}
                                                onChange={e => setLaminate(vinylItem.id, e.target.value)}
                                                className="w-full appearance-none bg-white border border-slate-200 rounded-md px-2.5 py-1.5 pr-7 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
                                            >
                                                {candidates.map(c => (
                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                ))}
                                            </select>
                                            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                        </div>
                                    )}

                                    {candidates.length === 1 && (
                                        <p className="text-xs font-semibold text-slate-700 mb-1.5 truncate">{chosenLaminate.name}</p>
                                    )}

                                    <div className="flex items-center justify-between mb-2.5">
                                        <div>
                                            <span className="text-[10px] line-through text-slate-400 mr-1">{formatCurrency(lamOrigPriceM2)}/m²</span>
                                            <span className="text-xs font-bold text-emerald-700">{formatCurrency(lamDiscPriceM2)}/m²</span>
                                        </div>
                                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-bold px-1.5 py-0.5 rounded">
                                            -{formatCurrency(DISCOUNT_M2)}/m²
                                        </span>
                                    </div>

                                    {/* Finish selector */}
                                    <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1.5">Acabado</p>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        {(['gloss', 'matte'] as const).map(f => (
                                            <button
                                                key={f}
                                                onClick={() => setFinish(vinylItem.id, f)}
                                                className={`flex items-center justify-center gap-1.5 py-2 rounded-md border text-xs font-semibold transition-all ${sel?.finish === f
                                                        ? 'border-slate-600 bg-slate-100 text-slate-800'
                                                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                                                    }`}
                                            >
                                                {sel?.finish === f && <Check size={11} />}
                                                {f === 'gloss' ? '✨ Brillo' : '🔲 Mate'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-slate-100 flex-shrink-0 space-y-1.5 bg-white">
                    <button
                        onClick={handleAccept}
                        className="w-full bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                        <Layers size={15} />
                        Añadir {promoEntries.length > 1 ? `${promoEntries.length} laminados` : 'laminado'} con descuento
                    </button>
                    <button
                        onClick={onClose}
                        className="w-full text-slate-400 hover:text-slate-600 text-xs font-medium py-1.5 transition-colors"
                    >
                        No gracias
                    </button>
                </div>
            </div>
        </div>
    );
};
