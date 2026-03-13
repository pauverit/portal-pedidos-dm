import React, { useState, useMemo } from 'react';
import { Product } from '../types';
import { Search, X, Tag, ChevronDown, ChevronRight } from 'lucide-react';

interface ClientCustomPricesEditorProps {
    products: Product[];
    customPrices: Record<string, number>;
    onChange: (prices: Record<string, number>) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
    flexible: 'Materiales Flexibles',
    rigid: 'Rígidos',
    accessory: 'Accesorios',
    display: 'Displays',
    ink: 'Tintas & Consumibles',
};

const SUBCAT_LABELS: Record<string, string> = {
    // Flexible
    vinilos: 'Vinilos', laminados: 'Laminados', wrapping: 'Wrapping',
    lonas: 'Lonas', papeles: 'Papeles', textiles: 'Textiles',
    lienzos: 'Lienzos', corte_colores: 'Corte Colores', otros: 'Otros',
    // Rigid
    pvc: 'PVC', composite: 'Composite', carton_pluma: 'Cartón Pluma',
    metacrilato: 'Metacrilato',
    // Display
    rollups: 'Roll-ups', xban: 'X-Banners', muros: 'Muros Pop-up',
    mostradores: 'Mostradores',
    // Accessory
    herramientas: 'Herramientas', ollados: 'Ollados', refuerzos: 'Refuerzos',
    adhesivos: 'Adhesivos',
    // Ink series
    l600_700: 'L600/L700', l800: 'L800/R530', l300: 'L300',
    l570_375: 'L570/L375', r1000: 'R1000', r2000: 'R2000',
    l1500: 'L1500', fs50: 'FS50', fs70: 'FS70', dtf: 'DTF',
};

export const ClientCustomPricesEditor: React.FC<ClientCustomPricesEditorProps> = ({
    products,
    customPrices,
    onChange,
}) => {
    const [search, setSearch] = useState('');
    const [onlyCustom, setOnlyCustom] = useState(false);

    // All categories expanded by default
    const allCats = useMemo(() => [...new Set(products.map(p => p.category))], [products]);
    const [expanded, setExpanded] = useState<Set<string>>(() => new Set(allCats));

    // Auto-expand when user searches
    useMemo(() => {
        if (search || onlyCustom) setExpanded(new Set(allCats));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, onlyCustom]);

    const toggleGroup = (key: string) => {
        setExpanded(prev => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    };

    const setPrice = (reference: string, value: string) => {
        const n = parseFloat(value);
        const next = { ...customPrices };
        if (value === '' || isNaN(n)) {
            delete next[reference];
        } else {
            next[reference] = n;
        }
        onChange(next);
    };

    const clearPrice = (reference: string) => {
        const next = { ...customPrices };
        delete next[reference];
        onChange(next);
    };

    const grouped = useMemo(() => {
        const q = search.toLowerCase().trim();
        const filtered = products.filter(p => {
            if (onlyCustom && customPrices[p.reference] === undefined) return false;
            if (!q) return true;
            return (
                p.name.toLowerCase().includes(q) ||
                p.reference.toLowerCase().includes(q) ||
                (p.brand || '').toLowerCase().includes(q) ||
                (p.subcategory || '').toLowerCase().includes(q)
            );
        });

        const map: Record<string, Record<string, Product[]>> = {};
        for (const p of filtered) {
            const cat = p.category;
            const sub = p.subcategory || 'otros';
            if (!map[cat]) map[cat] = {};
            if (!map[cat][sub]) map[cat][sub] = [];
            map[cat][sub].push(p);
        }
        return map;
    }, [products, search, onlyCustom, customPrices]);

    const customCount = Object.keys(customPrices).length;

    return (
        <div className="flex flex-col gap-3">
            {/* Header bar */}
            <div className="flex items-center gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[180px]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar producto o referencia..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
                    />
                </div>
                <label className="flex items-center gap-1.5 cursor-pointer select-none text-xs text-slate-600 font-medium">
                    <input
                        type="checkbox"
                        checked={onlyCustom}
                        onChange={e => setOnlyCustom(e.target.checked)}
                        className="accent-slate-800 w-3.5 h-3.5"
                    />
                    Solo con precio especial
                </label>
                {customCount > 0 && (
                    <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-1 rounded-full">
                        <Tag size={10} />
                        {customCount} precio{customCount > 1 ? 's' : ''} especial{customCount > 1 ? 'es' : ''}
                    </span>
                )}
            </div>

            {/* Product tree */}
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
                {Object.keys(grouped).length === 0 ? (
                    <div className="p-4 text-center text-slate-400 text-xs">No hay productos que coincidan</div>
                ) : (
                    Object.entries(grouped).map(([cat, subcats]) => (
                        <div key={cat}>
                            {/* Category header */}
                            <button
                                onClick={() => toggleGroup(cat)}
                                className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase tracking-wider hover:bg-slate-100 transition-colors"
                            >
                                <span>{CATEGORY_LABELS[cat] || cat}</span>
                                {expanded.has(cat) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>

                            {expanded.has(cat) && Object.entries(subcats).map(([sub, prods]) => (
                                <div key={sub}>
                                    {/* Subcategory */}
                                    <div className="px-4 py-1.5 bg-white border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        {SUBCAT_LABELS[sub] || sub}
                                    </div>
                                    {prods.map(p => {
                                        const basePrice = p.isFlexible ? (p.pricePerM2 ?? 0) : p.price;
                                        const customVal = customPrices[p.reference];
                                        const hasCustom = customVal !== undefined;
                                        const unit = p.isFlexible ? '€/m²' : `€/${p.unit}`;

                                        return (
                                            <div
                                                key={p.reference}
                                                className={`flex items-center gap-3 px-4 py-2 border-b border-slate-50 last:border-0 ${hasCustom ? 'bg-amber-50' : 'bg-white hover:bg-slate-50'} transition-colors`}
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-xs font-semibold text-slate-800 truncate">{p.name}</p>
                                                        {p.brand && (
                                                            <span className="bg-slate-100 text-slate-500 text-[9px] font-bold px-1.5 py-0.5 rounded border border-slate-200 uppercase">
                                                                {p.brand}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] text-slate-400">{p.reference} · Base: <span className="font-bold">{basePrice.toFixed(2)}{unit}</span></p>
                                                </div>
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            placeholder={basePrice.toFixed(2)}
                                                            value={customVal ?? ''}
                                                            onChange={e => setPrice(p.reference, e.target.value)}
                                                            className={`w-24 text-xs text-right border rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-amber-400 font-bold ${hasCustom ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-slate-200'}`}
                                                        />
                                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-slate-400 pointer-events-none hidden">
                                                            {unit}
                                                        </span>
                                                    </div>
                                                    <span className="text-[10px] text-slate-400 w-10 text-left">{unit}</span>
                                                    {hasCustom && (
                                                        <button
                                                            onClick={() => clearPrice(p.reference)}
                                                            title="Eliminar precio especial"
                                                            className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    ))
                )}
            </div>
            <p className="text-[10px] text-slate-400">Deja el campo vacío para usar el precio base del catálogo. Los cambios se aplican al guardar el cliente.</p>
        </div>
    );
};
