import React, { useState, useMemo } from 'react';
import { Search, X, Package, Check, ChevronRight, Filter, ArrowUpDown } from 'lucide-react';
import { Product, ProductCategory, StockItem } from '../types';

interface MaterialSelectorModalProps {
    productos: Product[];
    stock?: StockItem[];
    onClose: () => void;
    onSelect: (productos: Product[]) => void;
    isOpen: boolean;
    initialQuery?: string;
}

const CAT_LABELS: Record<ProductCategory, string> = {
    rigid: 'Rígido',
    flexible: 'Flexible',
    ink: 'Tinta/Consumible',
    accessory: 'Accesorio',
    display: 'Display',
};

const fmt = (n: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

const fmtNum = (n: number) =>
    new Intl.NumberFormat('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);

export const MaterialSelectorModal: React.FC<MaterialSelectorModalProps> = ({
    productos,
    stock = [],
    onClose,
    onSelect,
    isOpen,
    initialQuery = ''
}) => {
    const [searchRef, setSearchRef] = useState('');
    const [searchName, setSearchName] = useState(initialQuery);
    const [filterCat, setFilterCat] = useState<ProductCategory | ''>('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [sortField, setSortField] = useState<'reference' | 'name' | 'stock' | 'price'>('name');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

    // Mapear stock por productoId (sumando todos los almacenes)
    const stockMap = useMemo(() => {
        const map: Record<string, number> = {};
        stock.forEach(s => {
            map[s.productoId] = (map[s.productoId] || 0) + s.cantidad;
        });
        return map;
    }, [stock]);

    // Productos filtrados
    const filtrados = useMemo(() => {
        const qr = searchRef.toLowerCase();
        const qn = searchName.toLowerCase();

        return productos
            .filter(p => {
                if (p.activo === false) return false;
                if (filterCat && p.category !== filterCat) return false;
                if (qr && !(p.reference || '').toLowerCase().includes(qr)) return false;
                if (qn && !p.name.toLowerCase().includes(qn)) return false;
                return true;
            })
            .sort((a, b) => {
                let cmp = 0;
                if (sortField === 'reference') cmp = (a.reference || '').localeCompare(b.reference || '');
                else if (sortField === 'name') cmp = a.name.localeCompare(b.name);
                else if (sortField === 'stock') cmp = (stockMap[a.id] || 0) - (stockMap[b.id] || 0);
                else cmp = (a.pvp || a.price) - (b.pvp || b.price);
                return sortDir === 'asc' ? cmp : -cmp;
            });
    }, [productos, searchRef, searchName, filterCat, sortField, sortDir, stockMap]);

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleConfirm = () => {
        const selected = productos.filter(p => selectedIds.has(p.id));
        onSelect(selected);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden border border-slate-200">

                {/* Header */}
                <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-sm">
                            <Package size={18} />
                        </div>
                        <h2 className="text-base font-bold text-slate-800 uppercase tracking-tight">Selección de elemento del catálogo</h2>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Search & Global Filters */}
                <div className="px-5 py-3 bg-slate-50/50 border-b border-slate-100 flex items-center gap-4">
                    <div className="flex-1 flex gap-2">
                        <button className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-indigo-600 hover:bg-indigo-50 transition-colors shadow-sm">
                            + Nuevo producto
                        </button>
                        <button className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-indigo-600 hover:bg-indigo-50 transition-colors shadow-sm">
                            + Nuevo servicio
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <select
                            value={filterCat}
                            onChange={e => setFilterCat(e.target.value as ProductCategory | '')}
                            className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-200 transition-all font-medium"
                        >
                            <option value="">Filtrar Categoría</option>
                            {Object.entries(CAT_LABELS).map(([k, v]) => (
                                <option key={k} value={k}>{v}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Table View */}
                <div className="flex-1 overflow-auto bg-white">
                    <table className="w-full text-sm border-separate border-spacing-0">
                        <thead className="sticky top-0 z-10 bg-white">
                            <tr className="bg-slate-50/80 backdrop-blur">
                                <th className="px-4 py-3 text-left w-12 border-b border-slate-200"></th>
                                <th className="px-4 py-3 text-left w-12 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">Imagen</th>
                                <th
                                    className="px-4 py-3 text-left border-b border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors"
                                    onClick={() => { setSortField('reference'); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}
                                >
                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Referencia <ArrowUpDown size={12} />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Buscar..."
                                        value={searchRef}
                                        autoFocus={!!initialQuery && searchRef === '' && searchName === ''}
                                        onClick={e => e.stopPropagation()}
                                        onChange={e => setSearchRef(e.target.value)}
                                        className="mt-1 w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-medium outline-none focus:border-indigo-400"
                                    />
                                </th>
                                <th
                                    className="px-4 py-3 text-left border-b border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors"
                                    onClick={() => { setSortField('name'); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}
                                >
                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Nombre <ArrowUpDown size={12} />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Buscar..."
                                        value={searchName}
                                        autoFocus={initialQuery !== ''}
                                        onClick={e => e.stopPropagation()}
                                        onChange={e => setSearchName(e.target.value)}
                                        className="mt-1 w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-medium outline-none focus:border-indigo-400"
                                    />
                                </th>
                                <th className="px-4 py-3 text-right border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">Stock Real</th>
                                <th className="px-4 py-3 text-right border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">Stock Virtual</th>
                                <th className="px-4 py-3 text-right border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">Precio Venta</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filtrados.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-20 text-center text-slate-400 italic bg-white">
                                        No se han encontrado productos que coincidan con la búsqueda.
                                    </td>
                                </tr>
                            ) : (
                                filtrados.map(p => {
                                    const sCount = stockMap[p.id] || 0;
                                    const isSelected = selectedIds.has(p.id);
                                    return (
                                        <tr
                                            key={p.id}
                                            className={`hover:bg-slate-50 cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50/50' : ''}`}
                                            onClick={() => toggleSelect(p.id)}
                                        >
                                            <td className="px-4 py-3 text-center border-b border-slate-100">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => { }} // handled by row click
                                                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                />
                                            </td>
                                            <td className="px-4 py-3 border-b border-slate-100">
                                                <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-400">
                                                    <Package size={16} />
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 border-b border-slate-100 font-medium text-slate-700 font-mono text-xs">{p.reference || '—'}</td>
                                            <td className="px-4 py-3 border-b border-slate-100 font-bold text-slate-900">{p.name}</td>
                                            <td className={`px-4 py-3 border-b border-slate-100 text-right font-bold ${sCount <= 0 ? 'text-red-500' : 'text-slate-700'}`}>
                                                {fmtNum(sCount)}
                                            </td>
                                            <td className="px-4 py-3 border-b border-slate-100 text-right font-bold text-slate-400">
                                                {fmtNum(sCount)} {/* Mock virtual as real for now */}
                                            </td>
                                            <td className="px-4 py-3 border-b border-slate-100 text-right font-bold text-slate-900 font-mono">
                                                {fmt(p.pvp || p.price)}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-slate-50/30">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                        {selectedIds.size === 0
                            ? `Mostrando ${filtrados.length} de ${productos.length} artículos`
                            : `${selectedIds.size} seleccionados`
                        }
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 text-sm font-bold text-slate-500 hover:bg-slate-200 rounded-xl transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={selectedIds.size === 0}
                            className="bg-indigo-600 text-white px-8 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-indigo-100 transition-all flex items-center gap-2"
                        >
                            <Check size={18} /> Seleccionar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
