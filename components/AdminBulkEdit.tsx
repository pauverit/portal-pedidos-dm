import React, { useState, useEffect } from 'react';
import { Save, Search, Calculator, AlertCircle, CheckCircle, Layers, Droplet, Box } from 'lucide-react';
import { Product } from '../types';
import { useToast } from './Toast';

interface AdminBulkEditProps {
    products: Product[];
    onSave: (products: Product[]) => void;
    onBack: () => void;
}

interface EditableProduct extends Product {
    modified?: boolean;
}

import { calculateWeight } from '../lib/utils';

// Small reusable toggle checkbox
const Toggle: React.FC<{ label: string; checked: boolean; onChange: (v: boolean) => void }> = ({ label, checked, onChange }) => (
    <label className="flex items-center gap-1 cursor-pointer select-none whitespace-nowrap">
        <input
            type="checkbox"
            checked={checked}
            onChange={e => onChange(e.target.checked)}
            className="w-3.5 h-3.5 rounded accent-slate-800"
        />
        <span className="text-[11px] text-slate-600">{label}</span>
    </label>
);

export const AdminBulkEdit: React.FC<AdminBulkEditProps> = ({ products, onSave, onBack }) => {
    const [editableProducts, setEditableProducts] = useState<EditableProduct[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [saving, setSaving] = useState(false);
    const [editMode, setEditMode] = useState<'flexible' | 'ink' | 'others'>('flexible');
    const { toast } = useToast();

    useEffect(() => {
        setEditableProducts(products.map(p => ({ ...p, modified: false })));
    }, [products]);

    const filteredProducts = editableProducts.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.description?.toLowerCase().includes(searchQuery.toLowerCase());

        if (!matchesSearch) return false;

        if (editMode === 'flexible') return p.isFlexible;
        if (editMode === 'ink') return p.category === 'ink';
        if (editMode === 'others') return !p.isFlexible && p.category !== 'ink';
        return true;
    });

    const updateProduct = (id: string, field: keyof Product, value: any) => {
        setEditableProducts(prev => prev.map(p => {
            if (p.id !== id) return p;

            const updated = { ...p, [field]: value, modified: true };

            // Recalculate unit price when pricePerM2 changes for flexible
            if (editMode === 'flexible' && field === 'pricePerM2') {
                const w = p.widthOptions?.[0] ?? p.width ?? 0;
                const l = p.length ?? 0;
                if (w > 0 && l > 0) {
                    updated.price = parseFloat((Number(value) * w * l).toFixed(2));
                }
            }

            return updated;
        }));
    };

    // widthOptions helper: parse comma-separated widths string -> number[]
    const updateWidthOptions = (id: string, raw: string) => {
        const parsed = raw
            .split(',')
            .map(s => parseFloat(s.trim()))
            .filter(n => !isNaN(n) && n > 0);
        setEditableProducts(prev => prev.map(p => {
            if (p.id !== id) return p;
            return { ...p, widthOptions: parsed.length ? parsed : undefined, width: parsed[0] ?? p.width, modified: true };
        }));
    };

    const autoCalculateWeight = (id: string) => {
        setEditableProducts(prev => prev.map(p => {
            if (p.id !== id) return p;
            const calculatedWeight = calculateWeight(p);
            return { ...p, weight: calculatedWeight, modified: true };
        }));
    };

    const autoCalculateAllWeights = () => {
        setEditableProducts(prev => prev.map(p => {
            const calculatedWeight = calculateWeight(p);
            if (calculatedWeight > 0 && calculatedWeight !== p.weight) {
                return { ...p, weight: calculatedWeight, modified: true };
            }
            return p;
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        const modifiedCount = editableProducts.filter(p => p.modified).length;

        if (modifiedCount === 0) {
            toast('No hay cambios para guardar', 'info');
            setSaving(false);
            return;
        }

        try {
            const cleanProducts = editableProducts
                .filter(p => p.modified)
                .map(({ modified, ...product }) => product);

            await onSave(cleanProducts);
            setEditableProducts(prev => prev.map(p => ({ ...p, modified: false })));
            toast(`${modifiedCount} producto${modifiedCount !== 1 ? 's' : ''} guardado${modifiedCount !== 1 ? 's' : ''} correctamente`, 'success');
            setSaving(false);
        } catch (error: any) {
            console.error('Error al guardar:', error);
            toast('Error al guardar: ' + (error.message || 'Error desconocido'), 'error');
            setSaving(false);
        }
    };

    const modifiedCount = editableProducts.filter(p => p.modified).length;

    // Shared cell classes
    const inp = 'border border-slate-300 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-slate-500 outline-none w-full';
    const inpSm = 'border border-slate-300 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-slate-500 outline-none w-20 text-right';
    const inpBlue = 'border border-blue-300 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 outline-none w-20 text-right font-bold text-blue-900 bg-blue-50';

    return (
        <div className="p-4 md:p-10 max-w-full mx-auto pb-32">
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <button onClick={onBack} className="text-slate-500 hover:text-slate-900 text-sm mb-2 flex items-center gap-1">
                        ← Volver al Panel
                    </button>
                    <h1 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                        <Save className="text-slate-400" /> Edición Masiva de Productos
                    </h1>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={autoCalculateAllWeights}
                        className="bg-purple-100 text-purple-700 px-4 py-2 rounded-lg font-bold hover:bg-purple-200 transition-colors flex items-center gap-2 text-sm"
                    >
                        <Calculator size={16} /> Calcular Todos los Pesos
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || modifiedCount === 0}
                        className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold hover:bg-slate-800 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <Save size={18} />
                        {saving ? 'Guardando...' : `Guardar Cambios${modifiedCount > 0 ? ` (${modifiedCount})` : ''}`}
                    </button>
                </div>
            </div>

            {modifiedCount > 0 && (
                <div className="mb-4 bg-yellow-50 border border-yellow-200 text-yellow-800 px-3 py-2 rounded-lg flex items-center gap-2 text-sm">
                    <AlertCircle size={18} />
                    <span>Tienes <strong>{modifiedCount}</strong> producto{modifiedCount !== 1 ? 's' : ''} modificado{modifiedCount !== 1 ? 's' : ''} sin guardar.</span>
                </div>
            )}

            {/* Mode Selection */}
            <div className="flex gap-4 mb-6">
                <button
                    onClick={() => setEditMode('flexible')}
                    className={`flex-1 p-4 rounded-xl border transition-all flex items-center justify-center gap-3 ${editMode === 'flexible'
                        ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                        }`}
                >
                    <Layers size={20} />
                    <div className="text-left">
                        <div className="font-bold">Materiales Flexibles</div>
                        <div className="text-xs opacity-75">Precio, config. y dimensiones</div>
                    </div>
                </button>
                <button
                    onClick={() => setEditMode('ink')}
                    className={`flex-1 p-4 rounded-xl border transition-all flex items-center justify-center gap-3 ${editMode === 'ink'
                        ? 'bg-purple-50 border-purple-200 text-purple-700 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                        }`}
                >
                    <Droplet size={20} />
                    <div className="text-left">
                        <div className="font-bold">Tintas</div>
                        <div className="text-xs opacity-75">Precio, volumen y stock</div>
                    </div>
                </button>
                <button
                    onClick={() => setEditMode('others')}
                    className={`flex-1 p-4 rounded-xl border transition-all flex items-center justify-center gap-3 ${editMode === 'others'
                        ? 'bg-slate-100 border-slate-300 text-slate-700 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                        }`}
                >
                    <Box size={20} />
                    <div className="text-left">
                        <div className="font-bold">Otros Productos</div>
                        <div className="text-xs opacity-75">Precio, peso y stock</div>
                    </div>
                </button>
            </div>

            {/* Search Bar */}
            <div className="mb-6 relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                    type="text"
                    placeholder="Buscar por nombre, referencia o descripción..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                />
            </div>

            {/* Editable Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-3 py-3 w-8"></th>{/* modified indicator */}
                                <th className="px-3 py-3 w-40">Nombre</th>
                                <th className="px-3 py-3 w-28">Referencia</th>
                                <th className="px-3 py-3 w-24">Marca</th>
                                <th className="px-3 py-3">Descripción</th>

                                {editMode === 'flexible' && (
                                    <>
                                        <th className="px-3 py-3 w-20 text-right bg-blue-50/50">€/m²</th>
                                        <th className="px-3 py-3 w-24 text-right text-slate-400">Precio Rollo</th>
                                        <th className="px-3 py-3 w-32">Anchos (m)</th>
                                        <th className="px-3 py-3 w-20">Largo (m)</th>
                                        <th className="px-3 py-3 w-36">Tipo material</th>
                                        <th className="px-3 py-3 w-48">Config. opciones</th>
                                    </>
                                )}

                                {editMode === 'ink' && (
                                    <>
                                        <th className="px-3 py-3 w-24 text-right">Precio (€/ud)</th>
                                        <th className="px-3 py-3 w-24">Volumen</th>
                                    </>
                                )}

                                {editMode === 'others' && (
                                    <>
                                        <th className="px-3 py-3 w-24 text-right">Precio (€/ud)</th>
                                        <th className="px-3 py-3 w-28">Subcategoría</th>
                                    </>
                                )}

                                <th className="px-3 py-3 w-24 text-right">Peso (kg)</th>
                                <th className="px-3 py-3 w-16 text-center">Auto</th>
                                <th className="px-3 py-3 w-16 text-center">Stock</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredProducts.length === 0 ? (
                                <tr>
                                    <td colSpan={20} className="px-4 py-8 text-center text-slate-400">
                                        No se encontraron productos
                                    </td>
                                </tr>
                            ) : (
                                filteredProducts.map(product => (
                                    <tr
                                        key={product.id}
                                        className={`hover:bg-slate-50/80 ${product.modified ? 'bg-blue-50/40' : ''}`}
                                    >
                                        {/* Modified indicator */}
                                        <td className="px-2 py-2 text-center">
                                            {product.modified && <CheckCircle size={14} className="text-blue-500 mx-auto" />}
                                        </td>

                                        {/* Name */}
                                        <td className="px-3 py-2">
                                            <input
                                                type="text"
                                                value={product.name}
                                                onChange={(e) => updateProduct(product.id, 'name', e.target.value)}
                                                className={inp}
                                            />
                                        </td>

                                        {/* Reference */}
                                        <td className="px-3 py-2">
                                            <input
                                                type="text"
                                                value={product.reference}
                                                onChange={(e) => updateProduct(product.id, 'reference', e.target.value)}
                                                className={inp}
                                            />
                                        </td>

                                        {/* Brand */}
                                        <td className="px-3 py-2">
                                            <input
                                                type="text"
                                                value={product.brand || ''}
                                                onChange={(e) => updateProduct(product.id, 'brand', e.target.value)}
                                                placeholder="DM"
                                                className={inp}
                                            />
                                        </td>

                                        {/* Description */}
                                        <td className="px-3 py-2">
                                            <textarea
                                                value={product.description || ''}
                                                onChange={(e) => updateProduct(product.id, 'description', e.target.value)}
                                                placeholder="Añadir descripción..."
                                                className={`${inp} resize-none`}
                                                rows={2}
                                            />
                                        </td>

                                        {/* FLEXIBLE MODE EXTRA FIELDS */}
                                        {editMode === 'flexible' && (
                                            <>
                                                {/* Price per m² */}
                                                <td className="px-3 py-2 bg-blue-50/20">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={product.pricePerM2 || ''}
                                                        onChange={(e) => updateProduct(product.id, 'pricePerM2', parseFloat(e.target.value) || 0)}
                                                        className={inpBlue}
                                                        placeholder="0.00"
                                                    />
                                                </td>
                                                {/* Calculated roll price (read-only) */}
                                                <td className="px-3 py-2 text-right text-slate-400 font-mono text-xs">
                                                    {product.price?.toFixed(2)}€
                                                </td>
                                                {/* Width options (comma-separated) */}
                                                <td className="px-3 py-2">
                                                    <input
                                                        type="text"
                                                        value={(product.widthOptions ?? (product.width ? [product.width] : [])).join(', ')}
                                                        onChange={(e) => updateWidthOptions(product.id, e.target.value)}
                                                        placeholder="0.61, 1.07, 1.37"
                                                        title="Anchos disponibles separados por coma (en metros)"
                                                        className={inp}
                                                    />
                                                </td>
                                                {/* Roll length */}
                                                <td className="px-3 py-2">
                                                    <input
                                                        type="number"
                                                        step="1"
                                                        value={product.length ?? ''}
                                                        onChange={(e) => updateProduct(product.id, 'length', parseFloat(e.target.value) || undefined)}
                                                        placeholder="50"
                                                        className={inpSm}
                                                    />
                                                </td>
                                                {/* Material type */}
                                                <td className="px-3 py-2">
                                                    <select
                                                        value={product.materialType || ''}
                                                        onChange={(e) => updateProduct(product.id, 'materialType', e.target.value || undefined)}
                                                        className={`${inp} bg-white`}
                                                    >
                                                        <option value="">— Tipo —</option>
                                                        <option value="monomeric">Monomérico</option>
                                                        <option value="polymeric">Polimérico</option>
                                                        <option value="cast">Cast</option>
                                                        <option value="frontlit">Frontlit</option>
                                                        <option value="backlit">Backlit</option>
                                                        <option value="mesh">Mesh</option>
                                                        <option value="blockout">Blockout</option>
                                                    </select>
                                                </td>
                                                {/* Config toggles */}
                                                <td className="px-3 py-2">
                                                    <div className="flex flex-col gap-1">
                                                        <Toggle
                                                            label="Acabado (Br/Ma)"
                                                            checked={product.allowFinish ?? false}
                                                            onChange={v => updateProduct(product.id, 'allowFinish', v)}
                                                        />
                                                        <Toggle
                                                            label="Trasera (Bl/Gr)"
                                                            checked={product.allowBacking ?? false}
                                                            onChange={v => updateProduct(product.id, 'allowBacking', v)}
                                                        />
                                                        <Toggle
                                                            label="Adhesivo (Pe/Re)"
                                                            checked={product.allowAdhesive ?? false}
                                                            onChange={v => updateProduct(product.id, 'allowAdhesive', v)}
                                                        />
                                                    </div>
                                                </td>
                                            </>
                                        )}

                                        {/* INK MODE EXTRA FIELDS */}
                                        {editMode === 'ink' && (
                                            <>
                                                <td className="px-3 py-2">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={product.price}
                                                        onChange={(e) => updateProduct(product.id, 'price', parseFloat(e.target.value) || 0)}
                                                        className={`${inpSm} w-24`}
                                                    />
                                                </td>
                                                <td className="px-3 py-2">
                                                    <input
                                                        type="text"
                                                        value={product.volume || ''}
                                                        onChange={(e) => updateProduct(product.id, 'volume', e.target.value)}
                                                        placeholder="500ml"
                                                        className={inp}
                                                    />
                                                </td>
                                            </>
                                        )}

                                        {/* OTHERS MODE EXTRA FIELDS */}
                                        {editMode === 'others' && (
                                            <>
                                                <td className="px-3 py-2">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={product.price}
                                                        onChange={(e) => updateProduct(product.id, 'price', parseFloat(e.target.value) || 0)}
                                                        className={`${inpSm} w-24`}
                                                    />
                                                </td>
                                                <td className="px-3 py-2">
                                                    <input
                                                        type="text"
                                                        value={product.subcategory || ''}
                                                        onChange={(e) => updateProduct(product.id, 'subcategory', e.target.value)}
                                                        placeholder="general"
                                                        className={inp}
                                                    />
                                                </td>
                                            </>
                                        )}

                                        {/* Peso */}
                                        <td className="px-3 py-2">
                                            <input
                                                type="number"
                                                step="0.001"
                                                value={product.weight || ''}
                                                onChange={(e) => updateProduct(product.id, 'weight', parseFloat(e.target.value) || 0)}
                                                placeholder="0.000"
                                                className={inpSm}
                                            />
                                        </td>

                                        {/* Auto weight */}
                                        <td className="px-3 py-2 text-center">
                                            <button
                                                onClick={() => autoCalculateWeight(product.id)}
                                                disabled={!product.isFlexible}
                                                title={product.isFlexible ? 'Calcular peso automáticamente' : 'Solo para productos flexibles'}
                                                className="text-purple-600 hover:text-purple-800 disabled:text-slate-300 disabled:cursor-not-allowed"
                                            >
                                                <Calculator size={16} />
                                            </button>
                                        </td>

                                        {/* Stock toggle */}
                                        <td className="px-3 py-2 text-center">
                                            <button
                                                onClick={() => updateProduct(product.id, 'inStock', !(product.inStock ?? true))}
                                                className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto text-xs font-bold transition-colors ${(product.inStock ?? true)
                                                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                    : 'bg-red-100 text-red-600 hover:bg-red-200'
                                                    }`}
                                                title={(product.inStock ?? true) ? 'En stock — clic para marcar sin stock' : 'Sin stock — clic para marcar con stock'}
                                            >
                                                {(product.inStock ?? true) ? '✓' : '✗'}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="mt-4 text-sm text-slate-500">
                <p>Mostrando {filteredProducts.length} de {editableProducts.length} productos</p>
                <p className="mt-1 text-xs">
                    <strong>Tip:</strong> El cálculo automático de peso funciona para vinilos (130gr/m²), laminados (100gr/m²) y lonas (según descripción). Los anchos se indican en metros separados por coma.
                </p>
            </div>
        </div>
    );
};
