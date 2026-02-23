import React from 'react';
import { Product } from '../types';
import { ArrowLeft, ShoppingBag, Search, Check, X } from 'lucide-react';

interface AdminProductListProps {
    products: Product[];
    searchQuery: string;
    onSearchChange: (query: string) => void;
    editingProduct: Product | null;
    onEditClick: (product: Product) => void;
    onUpdateProduct: () => void;
    onCancelEdit: () => void;
    onEditingProductChange: (product: Product) => void;
    onBack: () => void;
    formatCurrency: (value: number) => string;
}

export const AdminProductList: React.FC<AdminProductListProps> = ({
    products,
    searchQuery,
    onSearchChange,
    editingProduct,
    onEditClick,
    onUpdateProduct,
    onCancelEdit,
    onEditingProductChange,
    onBack,
    formatCurrency
}) => {
    return (
        <div className="p-6 md:p-10 max-w-7xl mx-auto pb-32">
            <button onClick={onBack} className="mb-6 text-slate-500 hover:text-slate-900 flex items-center gap-1 text-sm">
                <ArrowLeft size={16} /> Volver al Panel
            </button>

            <h1 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
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
                            <th className="px-6 py-3">Nombre</th>
                            <th className="px-6 py-3 text-right">Precio Base</th>
                            <th className="px-6 py-3 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {products
                            .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.reference.toLowerCase().includes(searchQuery.toLowerCase()))
                            .map(product => (
                                <tr key={product.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4">
                                        {editingProduct?.id === product.id ? (
                                            <input
                                                type="text"
                                                value={editingProduct.name}
                                                onChange={e => onEditingProductChange({ ...editingProduct, name: e.target.value })}
                                                className="w-full border border-slate-300 rounded px-2 py-1"
                                            />
                                        ) : (
                                            <span className="text-slate-700">{product.name}</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {editingProduct?.id === product.id ? (
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={editingProduct.price}
                                                onChange={e => onEditingProductChange({ ...editingProduct, price: parseFloat(e.target.value) })}
                                                className="w-24 border border-slate-300 rounded px-2 py-1 text-right"
                                            />
                                        ) : (
                                            <span className="font-bold text-slate-900">{formatCurrency(product.price)}</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {editingProduct?.id === product.id ? (
                                            <div className="flex justify-end gap-2">
                                                <button onClick={onUpdateProduct} className="text-green-600 hover:text-green-800"><Check size={20} /></button>
                                                <button onClick={onCancelEdit} className="text-red-500 hover:text-red-700"><X size={20} /></button>
                                            </div>
                                        ) : (
                                            <button onClick={() => onEditClick(product)} className="text-blue-600 hover:text-blue-800 font-bold text-xs bg-blue-50 px-3 py-1 rounded">
                                                Editar
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
