import React, { useState, useEffect } from 'react';
import { X, Layers, Sparkles, Check, ChevronDown } from 'lucide-react';
import { CartItem, Product } from '../types';

export interface PromoSelection {
    vinylCartItemId: string;
    laminate: Product;
    finish: 'gloss' | 'matte';
}

export interface PromoVinylEntry {
    vinylItem: CartItem;           // The vinyl already in the cart
    candidates: Product[];         // Matching laminates (same width + brand)
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
    // Per-vinyl selections: vinylItemId -> { laminateId, finish }
    const [selections, setSelections] = useState<Record<string, { laminateId: string; finish: 'gloss' | 'matte' }>>({});

    // Reset selections when modal opens with new entries
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

    const setFinish = (vinylId: string, finish: 'gloss' | 'matte') => {
        setSelections(prev => ({ ...prev, [vinylId]: { ...prev[vinylId], finish } }));
    };

    const setLaminate = (vinylId: string, laminateId: string) => {
        setSelections(prev => ({ ...prev, [vinylId]: { ...prev[vinylId], laminateId } }));
    };

    const handleAccept = () => {
        const result: PromoSelection[] = promoEntries.map(entry => {
            const sel = selections[entry.vinylItem.id];
            const laminate = entry.candidates.find(c => c.id === sel?.laminateId) ?? entry.candidates[0];
            return {
                vinylCartItemId: entry.vinylItem.id,
                laminate,
                finish: sel?.finish ?? 'gloss',
            };
        });
        onAcceptPromo(result);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100"
                style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
            >
                {/* ── Header ── */}
                <div className="relative bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-6 text-white flex-shrink-0 overflow-hidden">
                    {/* decorative blobs */}
                    <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full" />
                    <div className="absolute -bottom-10 -left-6 w-32 h-32 bg-white/10 rounded-full" />

                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white/70 hover:text-white hover:bg-white/20 rounded-full p-1 transition-all z-10"
                        aria-label="Cerrar"
                    >
                        <X size={20} />
                    </button>

                    <div className="relative z-10 flex items-center gap-4">
                        <div className="bg-white/20 backdrop-blur-sm w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                            <Layers size={28} className="text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="bg-yellow-400 text-yellow-900 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide flex items-center gap-1">
                                    <Sparkles size={10} /> Oferta Pack
                                </span>
                            </div>
                            <h2 className="text-xl font-black leading-tight">¡Protege tu vinilo!</h2>
                            <p className="text-purple-200 text-sm mt-0.5">
                                Añade el laminado a juego con{' '}
                                <span className="font-bold text-white">-{DISCOUNT_M2.toFixed(2).replace('.', ',')}€/m²</span>{' '}
                                en ambas bobinas
                            </p>
                        </div>
                    </div>
                </div>

                {/* ── Body ── */}
                <div className="overflow-y-auto flex-1 p-5 space-y-4">
                    {promoEntries.map((entry) => {
                        const { vinylItem, candidates } = entry;
                        const sel = selections[vinylItem.id];
                        const chosenLaminate = candidates.find(c => c.id === sel?.laminateId) ?? candidates[0];
                        if (!chosenLaminate) return null;

                        // Vinyl discount display
                        const vinylOrigPriceM2 = vinylItem.pricePerM2 ?? 0;
                        const vinylDiscPriceM2 = Math.max(0, vinylOrigPriceM2 - DISCOUNT_M2);

                        // Laminate discount display
                        const lamOrigPriceM2 = chosenLaminate.pricePerM2 ?? 0;
                        const lamDiscPriceM2 = Math.max(0, lamOrigPriceM2 - DISCOUNT_M2);

                        return (
                            <div
                                key={vinylItem.id}
                                className="border border-purple-100 rounded-xl overflow-hidden bg-slate-50"
                            >
                                {/* vinyl row */}
                                <div className="px-4 py-3 bg-white border-b border-slate-100 flex items-center gap-3">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-slate-500 uppercase mb-0.5">Tu vinilo</p>
                                        <p className="text-sm font-bold text-slate-900 truncate">{vinylItem.name}</p>
                                        <p className="text-xs text-slate-400 font-mono">{vinylItem.reference}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className="text-xs line-through text-slate-400">{formatCurrency(vinylOrigPriceM2)}/m²</p>
                                        <p className="text-sm font-black text-purple-700">{formatCurrency(vinylDiscPriceM2)}/m²</p>
                                        <p className="text-[10px] text-green-600 font-bold">-{formatCurrency(DISCOUNT_M2)}/m²</p>
                                    </div>
                                </div>

                                {/* laminate selector */}
                                <div className="px-4 py-3">
                                    <p className="text-xs font-bold text-slate-500 uppercase mb-2">Laminado sugerido</p>

                                    {/* If multiple candidates, show a select */}
                                    {candidates.length > 1 && (
                                        <div className="relative mb-3">
                                            <select
                                                value={sel?.laminateId ?? candidates[0].id}
                                                onChange={e => setLaminate(vinylItem.id, e.target.value)}
                                                className="w-full appearance-none bg-white border border-slate-200 rounded-lg px-3 py-2 pr-8 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-400"
                                            >
                                                {candidates.map(c => (
                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                ))}
                                            </select>
                                            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                        </div>
                                    )}

                                    {/* Laminate name + price */}
                                    {candidates.length === 1 && (
                                        <p className="text-sm font-bold text-slate-800 mb-2 truncate">{chosenLaminate.name}</p>
                                    )}

                                    <div className="flex items-center justify-between mb-3">
                                        <div>
                                            <span className="text-xs line-through text-slate-400 mr-1">{formatCurrency(lamOrigPriceM2)}/m²</span>
                                            <span className="text-base font-black text-purple-700">{formatCurrency(lamDiscPriceM2)}/m²</span>
                                        </div>
                                        <span className="bg-green-100 text-green-700 text-[10px] font-black px-2 py-0.5 rounded-full">-{formatCurrency(DISCOUNT_M2)}/m²</span>
                                    </div>

                                    {/* Finish selector */}
                                    <p className="text-xs font-bold text-slate-500 uppercase mb-2">Acabado del laminado</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => setFinish(vinylItem.id, 'gloss')}
                                            className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 text-sm font-bold transition-all ${sel?.finish === 'gloss'
                                                    ? 'border-purple-600 bg-purple-50 text-purple-700 shadow-sm'
                                                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                                }`}
                                        >
                                            {sel?.finish === 'gloss' && <Check size={14} />}
                                            ✨ Brillo
                                        </button>
                                        <button
                                            onClick={() => setFinish(vinylItem.id, 'matte')}
                                            className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 text-sm font-bold transition-all ${sel?.finish === 'matte'
                                                    ? 'border-purple-600 bg-purple-50 text-purple-700 shadow-sm'
                                                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                                }`}
                                        >
                                            {sel?.finish === 'matte' && <Check size={14} />}
                                            🔲 Mate
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* ── Footer ── */}
                <div className="p-4 border-t border-slate-100 flex-shrink-0 space-y-2 bg-white">
                    <button
                        onClick={handleAccept}
                        className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-black py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-purple-200"
                    >
                        <Layers size={18} />
                        ¡Añadir {promoEntries.length > 1 ? `${promoEntries.length} Laminados` : 'Laminado'} con Descuento!
                    </button>
                    <button
                        onClick={onClose}
                        className="w-full text-slate-400 hover:text-slate-600 text-sm font-medium py-2 transition-colors"
                    >
                        No gracias, continuar sin laminado
                    </button>
                </div>
            </div>
        </div>
    );
};
