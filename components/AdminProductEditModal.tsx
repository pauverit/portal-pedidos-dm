import React, { useState, useEffect } from 'react';
import { X, Plus, Save, Ruler, ToggleLeft, ToggleRight, TrendingUp, BookOpen } from 'lucide-react';
import { Product, ProductCategory } from '../types';

interface AdminProductEditModalProps {
    product: Product;
    onSave: (product: Product) => Promise<void>;
    onClose: () => void;
}

const UNIT_OPTIONS = ['ud', 'bobina', 'caja', 'litro', 'kg', 'ml', 'par', 'rollo'];
const CATEGORY_OPTIONS: { value: ProductCategory; label: string }[] = [
    { value: 'flexible', label: 'Flexible' },
    { value: 'rigid', label: 'Rígido' },
    { value: 'ink', label: 'Tinta' },
    { value: 'accessory', label: 'Accesorio' },
    { value: 'display', label: 'Display' },
];

const Toggle: React.FC<{
    label: string;
    description: string;
    checked: boolean;
    onChange: (v: boolean) => void;
    color?: string;
}> = ({ label, description, checked, onChange, color = 'emerald' }) => (
    <button
        onClick={() => onChange(!checked)}
        className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all text-left ${checked
                ? `bg-${color}-50 border-${color}-200`
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
    >
        <div>
            <div className={`text-sm font-semibold ${checked ? `text-${color}-800` : 'text-slate-700'}`}>{label}</div>
            <div className="text-xs text-slate-500">{description}</div>
        </div>
        {checked
            ? <ToggleRight size={24} className={`text-${color}-500 shrink-0 ml-2`} />
            : <ToggleLeft size={24} className="text-slate-300 shrink-0 ml-2" />
        }
    </button>
);

export const AdminProductEditModal: React.FC<AdminProductEditModalProps> = ({
    product,
    onSave,
    onClose,
}) => {
    const [draft, setDraft] = useState<Product>({ ...product });
    const [activeTab, setActiveTab] = useState<'general' | 'costes'>('general');
    const [widthOptions, setWidthOptions] = useState<number[]>(
        (product as any).widthOptions ?? (product.width ? [product.width] : [1.05])
    );
    const [newWidthInput, setNewWidthInput] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // Prevent background scroll
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    const set = <K extends keyof Product>(key: K, value: Product[K]) =>
        setDraft(prev => ({ ...prev, [key]: value }));

    const addWidth = () => {
        const val = parseFloat(newWidthInput.replace(',', '.'));
        if (isNaN(val) || val <= 0) { setError('Introduce un ancho válido (ej: 1.52)'); return; }
        if (widthOptions.includes(val)) { setError('Ese ancho ya existe'); return; }
        setWidthOptions(prev => [...prev, val].sort((a, b) => a - b));
        setNewWidthInput('');
        setError('');
    };

    const removeWidth = (w: number) => {
        setWidthOptions(prev => prev.filter(v => v !== w));
    };

    const handleSave = async () => {
        setSaving(true);
        setError('');
        try {
            const finalProduct: Product = {
                ...draft,
                // Store the first width as the canonical .width field used elsewhere
                width: widthOptions[0] ?? draft.width,
                // Store the full list in widthOptions (custom field, stored as JSON in DB)
                ...(draft.isFlexible ? { widthOptions } : {}),
            };
            await onSave(finalProduct);
            onClose();
        } catch (e: any) {
            setError(e.message || 'Error al guardar');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.45)' }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 shrink-0">
                    <div>
                        <h2 className="text-base font-bold text-slate-900">Editar Producto</h2>
                        <p className="text-xs text-slate-400">{draft.reference}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-700">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-100 shrink-0 px-4">
                    {([
                        { id: 'general', label: 'General', icon: <Ruler size={13} /> },
                        { id: 'costes',  label: 'Costes y Contabilidad', icon: <TrendingUp size={13} /> },
                    ] as const).map(t => (
                        <button
                            key={t.id}
                            onClick={() => setActiveTab(t.id)}
                            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === t.id
                                    ? 'border-slate-900 text-slate-900'
                                    : 'border-transparent text-slate-400 hover:text-slate-600'
                            }`}
                        >
                            {t.icon} {t.label}
                        </button>
                    ))}
                </div>

                {/* Scrollable body */}
                <div className="overflow-y-auto flex-1 px-4 py-4 space-y-4">

                {/* ── TAB: COSTES Y CONTABILIDAD ───────────────────────────────────── */}
                {activeTab === 'costes' && (() => {
                    const pvpEfectivo = draft.pvp || draft.price || 0;
                    const coste      = draft.precioCompra || 0;
                    const margen     = pvpEfectivo > 0 && coste > 0
                        ? ((pvpEfectivo - coste) / pvpEfectivo * 100).toFixed(2)
                        : '—';
                    return (
                        <div className="space-y-5">
                            {/* Costes */}
                            <div>
                                <h3 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-1.5">
                                    <TrendingUp size={13}/> Precios y Margen
                                </h3>
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-xs text-slate-500 mb-1">Precio Compra (€)</label>
                                        <div className="relative">
                                            <input type="number" step="0.0001" min="0"
                                                value={draft.precioCompra ?? ''}
                                                onChange={e => set('precioCompra', parseFloat(e.target.value) || 0)}
                                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none pr-8"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">€</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-500 mb-1">PVP recomendado (€)</label>
                                        <div className="relative">
                                            <input type="number" step="0.0001" min="0"
                                                value={draft.pvp ?? ''}
                                                onChange={e => set('pvp', parseFloat(e.target.value) || undefined)}
                                                placeholder={String(draft.price || '')}
                                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none pr-8"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">€</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-500 mb-1">Margen bruto</label>
                                        <div className={`w-full border rounded-lg px-3 py-2 text-sm font-bold text-center ${
                                            margen !== '—' && parseFloat(margen) >= 0
                                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                                : 'bg-red-50 border-red-200 text-red-600'
                                        }`}>
                                            {margen !== '—' ? `${margen}%` : '—'}
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <label className="block text-xs text-slate-500 mb-1">Familia / Agrupación comercial</label>
                                    <input type="text"
                                        value={draft.familia ?? ''}
                                        onChange={e => set('familia', e.target.value || undefined)}
                                        placeholder="Ej: Vinilos, Rígidos, Tintas..."
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                                    />
                                </div>
                            </div>

                            {/* Contabilidad PGC */}
                            <div>
                                <h3 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-1.5">
                                    <BookOpen size={13}/> Cuentas PGC
                                </h3>
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-xs text-slate-500 mb-1">Cuenta Ventas</label>
                                        <input type="text" maxLength={10}
                                            value={draft.cuentaVentas ?? '700'}
                                            onChange={e => set('cuentaVentas', e.target.value)}
                                            placeholder="700"
                                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-slate-900 outline-none"
                                        />
                                        <p className="text-xs text-slate-400 mt-0.5">Ventas de mercaderías</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-500 mb-1">Cuenta Compras</label>
                                        <input type="text" maxLength={10}
                                            value={draft.cuentaCompras ?? '600'}
                                            onChange={e => set('cuentaCompras', e.target.value)}
                                            placeholder="600"
                                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-slate-900 outline-none"
                                        />
                                        <p className="text-xs text-slate-400 mt-0.5">Compras de mercaderías</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-500 mb-1">Cuenta Existencias</label>
                                        <input type="text" maxLength={10}
                                            value={draft.cuentaExistencias ?? '300'}
                                            onChange={e => set('cuentaExistencias', e.target.value)}
                                            placeholder="300"
                                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-slate-900 outline-none"
                                        />
                                        <p className="text-xs text-slate-400 mt-0.5">Mercaderías en stock</p>
                                    </div>
                                </div>
                            </div>

                            {/* Notas internas */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Notas internas</label>
                                <textarea
                                    value={draft.notasInternas ?? ''}
                                    onChange={e => set('notasInternas', e.target.value || undefined)}
                                    rows={3}
                                    placeholder="Observaciones de uso interno (no visibles al cliente)"
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none resize-none"
                                />
                            </div>
                        </div>
                    );
                })()}

                {/* ── TAB: GENERAL ─────────────────────────────────────────────────── */}
                {activeTab === 'general' && <>
                    {/* Basic fields */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre</label>
                            <input
                                type="text"
                                value={draft.name}
                                onChange={e => set('name', e.target.value)}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Categoría</label>
                            <select
                                value={draft.category}
                                onChange={e => set('category', e.target.value as ProductCategory)}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none bg-white"
                            >
                                {CATEGORY_OPTIONS.map(c => (
                                    <option key={c.value} value={c.value}>{c.label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Marca</label>
                            <input
                                type="text"
                                value={draft.brand || ''}
                                onChange={e => set('brand', e.target.value)}
                                placeholder="Ej: Avery, LG, Fedrigoni..."
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descripción</label>
                            <textarea
                                value={draft.description || ''}
                                onChange={e => set('description', e.target.value)}
                                rows={2}
                                placeholder="Descripción del producto..."
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none resize-none"
                            />
                        </div>
                    </div>

                    {/* Pricing */}
                    <div>
                        <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">Precio</h3>
                        <div className="grid grid-cols-3 gap-3">
                            {draft.isFlexible ? (
                                <div>
                                    <label className="block text-xs text-slate-500 mb-1">Precio (€/m²)</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={draft.pricePerM2 ?? ''}
                                            onChange={e => set('pricePerM2', parseFloat(e.target.value) || 0)}
                                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none pr-10"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">€/m²</span>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-xs text-slate-500 mb-1">Precio (€)</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={draft.price ?? ''}
                                            onChange={e => set('price', parseFloat(e.target.value) || 0)}
                                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none pr-8"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">€</span>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs text-slate-500 mb-1">Peso (kg)</label>
                                <input
                                    type="number"
                                    step="0.001"
                                    min="0"
                                    value={draft.weight ?? ''}
                                    onChange={e => set('weight', parseFloat(e.target.value) || 0)}
                                    placeholder="0.000"
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs text-slate-500 mb-1">Unidad</label>
                                <select
                                    value={draft.unit}
                                    onChange={e => set('unit', e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none bg-white"
                                >
                                    {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Flexible-only section */}
                    {draft.isFlexible && (
                        <>
                            {/* Widths */}
                            <div>
                                <h3 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-1.5">
                                    <Ruler size={13} /> Anchos disponibles (metros)
                                </h3>
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {widthOptions.map(w => (
                                        <div
                                            key={w}
                                            className="flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-800 text-sm font-medium px-3 py-1.5 rounded-full"
                                        >
                                            <span>{w}m</span>
                                            <button
                                                onClick={() => removeWidth(w)}
                                                className="ml-1 text-blue-400 hover:text-red-500 transition-colors rounded-full"
                                                title={`Quitar ${w}m`}
                                            >
                                                <X size={13} />
                                            </button>
                                        </div>
                                    ))}
                                    {widthOptions.length === 0 && (
                                        <span className="text-xs text-slate-400 italic">Sin anchos definidos</span>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        value={newWidthInput}
                                        onChange={e => { setNewWidthInput(e.target.value); setError(''); }}
                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addWidth(); } }}
                                        placeholder="Ej: 2.00"
                                        className="w-36 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
                                    />
                                    <button
                                        onClick={addWidth}
                                        className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        <Plus size={15} /> Añadir ancho
                                    </button>
                                </div>
                            </div>

                            {/* Length */}
                            <div>
                                <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">Largo del rollo (metros)</h3>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="number"
                                        step="1"
                                        min="1"
                                        value={draft.length ?? ''}
                                        onChange={e => set('length', parseFloat(e.target.value) || 0)}
                                        placeholder="Ej: 50"
                                        className="w-36 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                                    />
                                    <span className="text-sm text-slate-500">metros</span>
                                </div>
                            </div>

                            {/* Options */}
                            <div>
                                <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">Opciones de configuración del cliente</h3>
                                <div className="grid grid-cols-1 gap-2">
                                    <Toggle
                                        label="Acabado (Brillo / Mate)"
                                        description="El cliente puede elegir entre acabado brillo o mate"
                                        checked={draft.allowFinish ?? false}
                                        onChange={v => set('allowFinish', v)}
                                        color="emerald"
                                    />
                                    <Toggle
                                        label="Trasera (Blanca / Gris)"
                                        description="El cliente puede elegir el color de la trasera"
                                        checked={draft.allowBacking ?? false}
                                        onChange={v => set('allowBacking', v)}
                                        color="blue"
                                    />
                                    <Toggle
                                        label="Adhesivo (Permanente / Removible)"
                                        description="El cliente puede elegir el tipo de adhesivo"
                                        checked={draft.allowAdhesive ?? false}
                                        onChange={v => set('allowAdhesive', v)}
                                        color="purple"
                                    />
                                </div>
                            </div>
                        </>
                    )}
                </>}
                </div>

                {/* Footer */}
                {error && (
                    <div className="mx-6 mb-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>
                )}
                <div className="flex justify-end gap-3 px-3 py-2 border-t border-slate-100 shrink-0">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-5 py-2 rounded-lg bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
                    >
                        <Save size={15} />
                        {saving ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                </div>
            </div>
        </div>
    );
};
