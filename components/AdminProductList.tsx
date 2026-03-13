import React, { useState } from 'react';
import { Product } from '../types';
import { ArrowLeft, ShoppingBag, Search, Check, X, Trash2 } from 'lucide-react';
import { useToast } from './Toast';

interface AdminProductListProps {
    products: Product[];
    searchQuery: string;
    onSearchChange: (query: string) => void;
    editingProduct: Product | null;
    onEditClick: (product: Product) => void;
    onUpdateProduct: (product: Product) => void;
    onDeleteProduct: (productId: string) => void;
    onCancelEdit: () => void;
    onEditingProductChange: (product: Product) => void;
    onBack: () => void;
    formatCurrency: (value: number) => string;
}

const CheckToggle: React.FC<{ label: string; checked: boolean; onChange: (v: boolean) => void }> = ({ label, checked, onChange }) => (
    <label className="flex items-center gap-1.5 cursor-pointer select-none">
        <div
            onClick={() => onChange(!checked)}
            className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${checked ? 'bg-slate-900 border-slate-900' : 'bg-white border-slate-300'}`}
        >
            {checked && <Check size={11} className="text-white" />}
        </div>
        <span className="text-xs text-slate-600">{label}</span>
    </label>
);

export const AdminProductList: React.FC<AdminProductListProps> = ({
    products,
    searchQuery,
    onSearchChange,
    editingProduct,
    onEditClick,
    onUpdateProduct,
    onDeleteProduct,
    onCancelEdit,
    onEditingProductChange,
    onBack,
    formatCurrency
}) => {
    const [pendingDeleteProductId, setPendingDeleteProductId] = useState<string | null>(null);
    const { toast } = useToast();

    const filtered = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.reference.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="p-4 md:p-10 max-w-7xl mx-auto pb-32">
            <button onClick={onBack} className="mb-6 text-slate-500 hover:text-slate-900 flex items-center gap-1 text-sm">
                <ArrowLeft size={16} /> Volver al Panel
            </button>

            <h1 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                <ShoppingBag className="text-slate-400" /> Gestión de Productos
            </h1>

            <div className="mb-6 relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                    type="text"
                    placeholder="Buscar producto..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                />
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                        <tr>
                            <th className="px-6 py-3">Nombre / Referencia</th>
                            <th className="px-6 py-3 text-right">Precio</th>
                            <th className="px-6 py-3">Configuración</th>
                            <th className="px-6 py-3 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filtered.map(product => {
                            const isEditing = editingProduct?.id === product.id;
                            const ep = editingProduct;

                            return (
                                <tr key={product.id} className={isEditing ? 'bg-slate-50' : 'hover:bg-slate-50'}>
                                    {/* Name */}
                                    <td className="px-3 py-2">
                                        {isEditing ? (
                                            <div className="space-y-1">
                                                <input
                                                    type="text"
                                                    value={ep!.name}
                                                    onChange={e => onEditingProductChange({ ...ep!, name: e.target.value })}
                                                    className="w-full border border-slate-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-slate-400 outline-none"
                                                />
                                                <div className="text-xs text-slate-400">{product.reference}</div>
                                                <div className="mt-2 pt-2 border-t border-slate-100">
                                                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Marca</label>
                                                    <input
                                                        type="text"
                                                        placeholder="Marca (ej. Avery, LG, Fedrigoni...)"
                                                        value={ep!.brand || ''}
                                                        onChange={e => onEditingProductChange({ ...ep!, brand: e.target.value })}
                                                        className="w-full border border-slate-300 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-slate-400 outline-none"
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div>
                                                <div className="font-medium text-slate-800">{product.name}</div>
                                                <div className="text-xs text-slate-400">{product.reference}</div>
                                            </div>
                                        )}
                                    </td>

                                    {/* Price */}
                                    <td className="px-3 py-2 text-right">
                                        {isEditing ? (
                                            <div className="flex flex-col items-end gap-1">
                                                {ep!.isFlexible ? (
                                                    <div className="flex items-center gap-1">
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={ep!.pricePerM2 ?? 0}
                                                            onChange={e => onEditingProductChange({ ...ep!, pricePerM2: parseFloat(e.target.value) })}
                                                            className="w-24 border border-slate-300 rounded px-2 py-1 text-right text-sm"
                                                        />
                                                        <span className="text-xs text-slate-500">€/m²</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1">
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={ep!.price}
                                                            onChange={e => onEditingProductChange({ ...ep!, price: parseFloat(e.target.value) })}
                                                            className="w-24 border border-slate-300 rounded px-2 py-1 text-right text-sm"
                                                        />
                                                        <span className="text-xs text-slate-500">€/ud</span>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="font-bold text-slate-900">
                                                {product.isFlexible
                                                    ? `${formatCurrency(product.pricePerM2 ?? 0)}/m²`
                                                    : formatCurrency(product.price)
                                                }
                                            </span>
                                        )}
                                    </td>

                                    {/* Config options — only for flexible */}
                                    <td className="px-3 py-2">
                                        {product.isFlexible ? (
                                            isEditing ? (
                                                <div className="flex flex-col gap-1.5">
                                                    <CheckToggle
                                                        label="Acabado (Brillo/Mate)"
                                                        checked={ep!.allowFinish ?? false}
                                                        onChange={v => onEditingProductChange({ ...ep!, allowFinish: v })}
                                                    />
                                                    <CheckToggle
                                                        label="Trasera (Blanca/Gris)"
                                                        checked={ep!.allowBacking ?? false}
                                                        onChange={v => onEditingProductChange({ ...ep!, allowBacking: v })}
                                                    />
                                                    <CheckToggle
                                                        label="Adhesivo (Perm./Remov.)"
                                                        checked={ep!.allowAdhesive ?? false}
                                                        onChange={v => onEditingProductChange({ ...ep!, allowAdhesive: v })}
                                                    />
                                                </div>
                                            ) : (
                                                <div className="flex flex-wrap gap-1">
                                                    {product.allowFinish && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">Acabado</span>}
                                                    {product.allowBacking && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">Trasera</span>}
                                                    {product.allowAdhesive && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-bold">Adhesivo</span>}
                                                    {!product.allowFinish && !product.allowBacking && !product.allowAdhesive && (
                                                        <span className="text-xs text-slate-400 italic">Solo ancho</span>
                                                    )}
                                                </div>
                                            )
                                        ) : (
                                            <span className="text-xs text-slate-300">—</span>
                                        )}
                                    </td>

                                    {/* Actions */}
                                    <td className="px-3 py-2 text-right">
                                        {isEditing ? (
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => onUpdateProduct(ep!)}
                                                    className="text-green-600 hover:text-green-800 p-1"
                                                    title="Guardar"
                                                >
                                                    <Check size={20} />
                                                </button>
                                                <button
                                                    onClick={onCancelEdit}
                                                    className="text-red-500 hover:text-red-700 p-1"
                                                    title="Cancelar"
                                                >
                                                    <X size={20} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => onEditClick(product)}
                                                    className="text-blue-600 hover:text-blue-800 font-bold text-xs bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded transition-colors"
                                                >
                                                    Editar
                                                </button>
                                                <button
                                                    onClick={() => setPendingDeleteProductId(product.id)}
                                                    className="text-red-600 hover:text-red-800 p-1.5 bg-red-50 hover:bg-red-100 rounded transition-colors"
                                                    title="Eliminar producto"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {filtered.length === 0 && (
                    <div className="p-8 text-center text-slate-400">No se encontraron productos.</div>
                )}
            </div>

            {/* Inline confirm modal for product deletion */}
            {pendingDeleteProductId && (() => {
                const product = products.find(p => p.id === pendingDeleteProductId);
                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 p-6">
                            <h3 className="text-base font-bold text-slate-900 mb-2">¿Eliminar producto?</h3>
                            <p className="text-sm text-slate-600 mb-6">
                                Se eliminará <strong>{product?.name}</strong> permanentemente.
                            </p>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setPendingDeleteProductId(null)}
                                    className="px-4 py-2 text-sm text-slate-500 hover:text-slate-800"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => { onDeleteProduct(pendingDeleteProductId); setPendingDeleteProductId(null); }}
                                    className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-lg transition-colors"
                                >
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};
