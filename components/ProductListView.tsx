import React from 'react';
import { Search, X } from 'lucide-react';
import { Product, CartItem } from '../types';
import { ProductRow } from './ProductRow';

interface ProductListViewProps {
    products: Product[];
    cart: CartItem[];
    currentView: string;
    searchQuery: string;
    onSearchQueryChange: (query: string) => void;
    sortOrder: 'default' | 'price_asc' | 'price_desc';
    onSortOrderChange: (order: 'default' | 'price_asc' | 'price_desc') => void;
    onAddToCart: (product: Product, quantity?: number, options?: any) => void;
    onUpdateQuantity: (id: string, delta: number) => void;
    onEditProduct: (product: Product) => void;
    isAdmin: boolean;
    formatCurrency: (value: number) => string;
}

export const ProductListView: React.FC<ProductListViewProps> = ({
    products,
    cart,
    currentView,
    searchQuery,
    onSearchQueryChange,
    sortOrder,
    onSortOrderChange,
    onAddToCart,
    onUpdateQuantity,
    onEditProduct,
    isAdmin,
    formatCurrency
}) => {
    const filteredProducts = products.filter(p => {
        if (searchQuery.trim().length > 0) {
            const query = searchQuery.toLowerCase();
            return (
                p.name.toLowerCase().includes(query) ||
                p.reference.toLowerCase().includes(query) ||
                (p.brand || '').toLowerCase().includes(query) ||
                (p.subcategory || '').toLowerCase().includes(query)
            );
        }

        let targetCategory = '';
        let targetSubCategory = '';

        if (currentView.startsWith('cat_')) {
            const parts = currentView.split('_');
            targetCategory = parts[1];
            if (parts.length > 2) {
                const sub = parts.slice(2).join('_');
                if (sub !== 'all') {
                    targetSubCategory = sub;
                }
            }
        } else {
            return false;
        }

        const matchCategory = p.category === targetCategory;
        const matchSub = targetSubCategory ? p.subcategory === targetSubCategory : true;

        return matchCategory && matchSub;
    });

    const sortedProducts = [...filteredProducts].sort((a, b) => {
        if (sortOrder === 'default') return 0;
        const priceA = a.isFlexible ? (a.pricePerM2 || 0) : (a.price || 0);
        const priceB = b.isFlexible ? (b.pricePerM2 || 0) : (b.price || 0);
        if (sortOrder === 'price_asc') return priceA - priceB;
        return priceB - priceA;
    });

    let title = '';
    if (searchQuery) {
        title = `Resultados de búsqueda: "${searchQuery}"`;
    } else {
        const parts = currentView.split('_');
        const targetCategory = parts[1];
        let targetSubCategory = '';
        if (parts.length > 2) {
            const sub = parts.slice(2).join('_');
            if (sub !== 'all') targetSubCategory = sub;
        }
        switch (targetCategory) {
            case 'flexible': title = 'Materiales Flexibles'; break;
            case 'rigid': title = 'Soportes Rígidos'; break;
            case 'accessory': title = 'Accesorios & Herramientas'; break;
            case 'ink': title = 'Tintas & Consumibles'; break;
            case 'display': title = 'Displays & Expositores'; break;
            default: title = 'Catálogo';
        }
        if (targetSubCategory) {
            title += ` / ${targetSubCategory.charAt(0).toUpperCase() + targetSubCategory.slice(1).replace(/_/g, ' ')}`;
        }
    }

    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto w-full pb-32">
            <div className="mb-6">
                <h1 className="text-lg md:text-xl font-bold text-slate-900">{title}</h1>
                <div className="mt-2 flex items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por referencia o descripción..."
                            value={searchQuery}
                            onChange={(e) => onSearchQueryChange(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => onSearchQueryChange('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                    <select
                        value={sortOrder}
                        onChange={(e) => onSortOrderChange(e.target.value as any)}
                        className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none bg-white"
                    >
                        <option value="default">Orden: Por defecto</option>
                        <option value="price_asc">Precio: Menor a Mayor</option>
                        <option value="price_desc">Precio: Mayor a Menor</option>
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                            <tr>
                                <th className="px-3 py-2">Nombre / Descripción</th>
                                <th className="px-3 py-2 w-32">Formato</th>
                                <th className="px-3 py-2 w-28 text-right">Precio</th>
                                <th className="px-3 py-2 w-32 text-center">Cantidad</th>
                                {isAdmin && <th className="px-3 py-2 w-20 text-center">Admin</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {sortedProducts.map(product => (
                                <ProductRow
                                    key={product.id}
                                    product={product}
                                    cartItem={cart.find(item => item.id === product.id)}
                                    onAddToCart={onAddToCart}
                                    onUpdateQuantity={onUpdateQuantity}
                                    formatCurrency={formatCurrency}
                                    isAdmin={isAdmin}
                                    onEdit={onEditProduct}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
                {sortedProducts.length === 0 && (
                    <div className="p-8 text-center text-slate-500">
                        No hay productos en esta categoría.
                    </div>
                )}
            </div>
        </div>
    );
};
