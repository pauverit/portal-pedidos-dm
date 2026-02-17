import React, { useState, useEffect } from 'react';
import { Save, Search, Calculator, AlertCircle, CheckCircle } from 'lucide-react';
import { Product } from '../types';

interface AdminBulkEditProps {
    products: Product[];
    onSave: (products: Product[]) => void;
    onBack: () => void;
}

interface EditableProduct extends Product {
    modified?: boolean;
}

// Helper to extract dimensions from string (reference or name)
const extractDimensionsFromString = (text: string): { width: number, length: number } | null => {
    if (!text) return null;

    // Pattern 1: Explicit "1.22x50", "1,22x50", "152x50"
    // Matches: (1.22 or 1,22 or 0.60 or 152) [xX] (50)
    const matchX = text.match(/(\d+(?:[.,]\d+)?)\s*[xX]\s*(\d+)/);
    if (matchX) {
        let widthRaw = matchX[1].replace(',', '.');
        let width = parseFloat(widthRaw);
        let length = parseInt(matchX[2]);

        // Normalize width: if > 10, assume cm and convert to m (e.g. 152cm -> 1.52m)
        // Unless it's likely meters (e.g. 1.22)
        if (width >= 10) width = width / 100;

        return { width, length };
    }

    // Pattern 2: Combined "12250" (3 digits cm + 2 digits m)
    // Only applied if text looks like a reference code (no spaces/words attached tightly)
    const matchCombined = text.match(/\b(\d{3})(50|25|10|05|30)\b/);
    if (matchCombined) {
        return { width: parseInt(matchCombined[1]) / 100, length: parseInt(matchCombined[2]) };
    }

    return null;
};

const extractLonaWeight = (description: string): number => {
    // Look for patterns like "280gr", "340 gr/m2", "450gr/m²", etc.
    const match = description.match(/(\d+)\s*gr/i);
    return match ? parseInt(match[1]) : 0;
};

// Helper to calculate weight based on material type
const calculateWeight = (product: Product): number => {
    let width = product.width;
    let length = product.length;

    // Try to extract dimensions from reference OR name if missing
    if (!width || !length) {
        // Try reference first
        let dims = extractDimensionsFromString(product.reference);

        // If not found in reference, try name
        if (!dims) {
            dims = extractDimensionsFromString(product.name);
        }

        if (dims) {
            console.log(`[DEBUG] Extracted dims for ${product.reference}: ${dims.width}x${dims.length}`);
            width = dims.width;
            length = dims.length;
        } else {
            console.log(`[DEBUG] Could not extract dims for ${product.reference}`);
        }
    }

    if (!width || !length) {
        return product.weight || 0;
    }

    const areaM2 = width * length;
    let gramsPerM2 = 0;

    // Determine weight per m² based on subcategory or name
    const name = product.name.toLowerCase();
    const subcat = product.subcategory?.toLowerCase() || '';

    // Check for "esmerilado" specifically if needed, but "vinilo" covers it
    if (name.includes('vinil') || subcat.includes('vinil')) {
        gramsPerM2 = 130;
    } else if (name.includes('laminad') || subcat.includes('laminad')) {
        gramsPerM2 = 100;
    } else if (name.includes('lona') || subcat.includes('lona')) {
        // Extract from description if available
        gramsPerM2 = extractLonaWeight(product.description || '');
    }

    console.log(`[DEBUG] Material check for '${name}': gramsPerM2 = ${gramsPerM2}`);

    if (gramsPerM2 === 0) {
        console.log(`[DEBUG] Skipping calc for ${product.reference} - 0g/m2`);
        return product.weight || 0;
    }

    const finalWeight = parseFloat(((areaM2 * gramsPerM2) / 1000).toFixed(3));
    console.log(`[DEBUG] Final Calc for ${product.reference}: ${width}x${length}=${areaM2}m2 * ${gramsPerM2}g = ${finalWeight}kg`);

    return finalWeight; // Convert grams to kg
};

export const AdminBulkEdit: React.FC<AdminBulkEditProps> = ({ products, onSave, onBack }) => {
    const [editableProducts, setEditableProducts] = useState<EditableProduct[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setEditableProducts(products.map(p => ({ ...p, modified: false })));
    }, [products]);

    const filteredProducts = editableProducts.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const updateProduct = (id: string, field: keyof Product, value: any) => {
        setEditableProducts(prev => prev.map(p =>
            p.id === id ? { ...p, [field]: value, modified: true } : p
        ));
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
        const modifiedProducts = editableProducts.filter(p => p.modified);

        if (modifiedProducts.length === 0) {
            alert('No hay cambios para guardar.');
            setSaving(false);
            return;
        }

        try {
            // Remove the 'modified' flag before saving
            const cleanProducts = editableProducts
                .filter(p => p.modified)
                .map(({ modified, ...product }) => product);

            console.log('Guardando productos:', cleanProducts);
            await onSave(cleanProducts);

            // If successful, reset modified flags
            setEditableProducts(prev => prev.map(p => ({ ...p, modified: false })));
            setSaving(false);
        } catch (error: any) {
            console.error('Error al guardar:', error);
            alert(`Error al guardar: ${error.message || 'Error desconocido'}`);
            setSaving(false);
        }
    };

    const modifiedCount = editableProducts.filter(p => p.modified).length;

    return (
        <div className="p-6 md:p-10 max-w-full mx-auto pb-32">
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <button onClick={onBack} className="text-slate-500 hover:text-slate-900 text-sm mb-2 flex items-center gap-1">
                        ← Volver al Panel
                    </button>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
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
                        className="bg-slate-900 text-white px-6 py-2 rounded-lg font-bold hover:bg-slate-800 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <Save size={18} />
                        {saving ? 'Guardando...' : `Guardar Cambios${modifiedCount > 0 ? ` (${modifiedCount})` : ''}`}
                    </button>
                </div>
            </div>

            {modifiedCount > 0 && (
                <div className="mb-4 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg flex items-center gap-2 text-sm">
                    <AlertCircle size={18} />
                    <span>Tienes <strong>{modifiedCount}</strong> producto{modifiedCount !== 1 ? 's' : ''} modificado{modifiedCount !== 1 ? 's' : ''} sin guardar.</span>
                </div>
            )}

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
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                            <tr>
                                <th className="px-4 py-3 w-32">Referencia</th>
                                <th className="px-4 py-3 w-48">Nombre</th>
                                {/* <th className="px-4 py-3 flex-1">Descripción</th> */}
                                <th className="px-4 py-3 w-28 text-right">Precio (€)</th>
                                <th className="px-4 py-3 w-28 text-right">Peso (kg)</th>
                                <th className="px-4 py-3 w-24 text-center">Auto</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredProducts.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                                        No se encontraron productos
                                    </td>
                                </tr>
                            ) : (
                                filteredProducts.map(product => (
                                    <tr
                                        key={product.id}
                                        className={`hover:bg-slate-50 ${product.modified ? 'bg-blue-50' : ''}`}
                                    >
                                        <td className="px-4 py-3">
                                            <div className="font-mono text-xs font-bold text-slate-900 flex items-center gap-2">
                                                {product.reference}
                                                {product.modified && <CheckCircle size={14} className="text-blue-600" />}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <input
                                                type="text"
                                                value={product.name}
                                                onChange={(e) => updateProduct(product.id, 'name', e.target.value)}
                                                className="w-full border border-slate-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                                            />
                                        </td>
                                        {/* <td className="px-4 py-3">
                                            <textarea
                                                value={product.description || ''}
                                                onChange={(e) => updateProduct(product.id, 'description', e.target.value)}
                                                placeholder="Añadir descripción..."
                                                className="w-full border border-slate-300 rounded px-2 py-1 text-xs resize-none focus:ring-2 focus:ring-slate-900 outline-none"
                                                rows={2}
                                            />
                                        </td> */}
                                        <td className="px-4 py-3">
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={product.price}
                                                onChange={(e) => updateProduct(product.id, 'price', parseFloat(e.target.value) || 0)}
                                                className="w-24 border border-slate-300 rounded px-2 py-1 text-right focus:ring-2 focus:ring-slate-900 outline-none"
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <input
                                                type="number"
                                                step="0.001"
                                                value={product.weight || ''}
                                                onChange={(e) => updateProduct(product.id, 'weight', parseFloat(e.target.value) || 0)}
                                                placeholder="0.000"
                                                className="w-24 border border-slate-300 rounded px-2 py-1 text-right focus:ring-2 focus:ring-slate-900 outline-none"
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                onClick={() => autoCalculateWeight(product.id)}
                                                disabled={!product.isFlexible}
                                                title={product.isFlexible ? 'Calcular peso automáticamente' : 'Solo para productos flexibles'}
                                                className="text-purple-600 hover:text-purple-800 disabled:text-slate-300 disabled:cursor-not-allowed"
                                            >
                                                <Calculator size={18} />
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
                    <strong>Tip:</strong> El cálculo automático de peso funciona para vinilos (130gr/m²), laminados (100gr/m²) y lonas (según descripción).
                </p>
            </div>
        </div>
    );
};
