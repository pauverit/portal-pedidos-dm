import React, { useState, useEffect } from 'react';
import { Save, Search, Calculator, AlertCircle, CheckCircle, Layers, Droplet, Box, Filter } from 'lucide-react';
import { Product } from '../types';

interface AdminBulkEditProps {
    products: Product[];
    onSave: (products: Product[]) => void;
    onBack: () => void;
}

interface EditableProduct extends Product {
    modified?: boolean;
}

import { calculateWeight } from '../lib/utils';

export const AdminBulkEdit: React.FC<AdminBulkEditProps> = ({ products, onSave, onBack }) => {
    const [editableProducts, setEditableProducts] = useState<EditableProduct[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [saving, setSaving] = useState(false);
    const [editMode, setEditMode] = useState<'flexible' | 'ink' | 'others'>('flexible');

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

            // Special logic: If editing pricePerM2 in Flexible mode, recalculate Unit Price
            if (editMode === 'flexible' && field === 'pricePerM2') {
                const w = p.width || 0;
                const l = p.length || 0;
                if (w > 0 && l > 0) {
                    updated.price = parseFloat((Number(value) * w * l).toFixed(2));
                }
            }

            return updated;
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
            let newP = { ...p };
            let dimsChanged = false;

            // Extract dimensions directly inside this loop if not using the util
            const newDimsTest = newP.width && newP.length ? null : newP; // Optimization

            // 3. Calculate weight (using new dimensions if fixed)
            const calculatedWeight = calculateWeight(newP);

            if ((calculatedWeight > 0 && calculatedWeight !== p.weight) || dimsChanged) {
                return { ...newP, weight: calculatedWeight, modified: true };
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
                        <div className="text-xs opacity-75">Editar Precio por m²</div>
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
                        <div className="text-xs opacity-75">Editar Precio Unidad</div>
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
                        <div className="text-xs opacity-75">Editar Precio Unidad</div>
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
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                            <tr>
                                <th className="px-4 py-3 w-48">Nombre</th>
                                <th className="px-4 py-3">Descripción</th>
                                {editMode === 'flexible' ? (
                                    <>
                                        <th className="px-4 py-3 w-28 text-right bg-blue-50/50">Precio (€/m²)</th>
                                        <th className="px-4 py-3 w-28 text-right text-slate-400">Precio Rollo</th>
                                    </>
                                ) : (
                                    <th className="px-4 py-3 w-28 text-right">Precio (€/ud)</th>
                                )}
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
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={product.name}
                                                    onChange={(e) => updateProduct(product.id, 'name', e.target.value)}
                                                    className="w-full border border-slate-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                                                />
                                                {product.modified && (
                                                    <div className="absolute -left-6 top-1/2 -translate-y-1/2">
                                                        <CheckCircle size={14} className="text-blue-600" />
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <textarea
                                                value={product.description || ''}
                                                onChange={(e) => updateProduct(product.id, 'description', e.target.value)}
                                                placeholder="Añadir descripción..."
                                                className="w-full border border-slate-300 rounded px-2 py-1 text-xs resize-none focus:ring-2 focus:ring-slate-900 outline-none"
                                                rows={2}
                                            />
                                        </td>
                                        {editMode === 'flexible' ? (
                                            <>
                                                <td className="px-4 py-3 bg-blue-50/30">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={product.pricePerM2 || ''}
                                                        onChange={(e) => updateProduct(product.id, 'pricePerM2', parseFloat(e.target.value) || 0)}
                                                        className="w-24 border border-blue-200 rounded px-2 py-1 text-right focus:ring-2 focus:ring-blue-500 outline-none font-bold text-blue-900"
                                                        placeholder="0.00"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-right text-slate-400 font-mono text-xs">
                                                    {product.price?.toFixed(2)}€
                                                </td>
                                            </>
                                        ) : (
                                            <td className="px-4 py-3">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={product.price}
                                                    onChange={(e) => updateProduct(product.id, 'price', parseFloat(e.target.value) || 0)}
                                                    className="w-24 border border-slate-300 rounded px-2 py-1 text-right focus:ring-2 focus:ring-slate-900 outline-none"
                                                />
                                            </td>
                                        )}
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
