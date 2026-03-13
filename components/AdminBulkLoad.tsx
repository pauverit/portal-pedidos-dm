import React, { useState } from 'react';
import { Save, AlertCircle, CheckCircle, X, Trash2, Download, FileSpreadsheet } from 'lucide-react';
import { Product, ProductCategory } from '../types';
import { useToast } from './Toast';

interface AdminBulkLoadProps {
    onSave: (products: Product[]) => void;
    currentProducts: Product[];
}

interface ParsedItem {
    reference: string;
    name: string;
    category: string;
    subcategory: string;
    price: number;          // for flexible: price per m²; for others: unit price
    length: number;         // for flexible: roll length in meters (default 50)
    brand: string;
    description: string;
    weight: number;
    volume: string;
    materialType: string;
    // Flexible config flags
    allowFinish: boolean;
    allowBacking: boolean;
    allowAdhesive: boolean;
    isValid: boolean;
    errors: string[];
}

const parseYN = (val: string) => {
    const v = val.trim().toUpperCase();
    return v === 'S' || v === 'SI' || v === 'Y' || v === 'YES' || v === '1';
};

export const AdminBulkLoad: React.FC<AdminBulkLoadProps> = ({ onSave, currentProducts = [] }) => {
    const [rawInput, setRawInput] = useState('');
    const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
    const [showPreview, setShowPreview] = useState(false);
    const [showDeleteCatalogConfirm, setShowDeleteCatalogConfirm] = useState(false);
    const { toast } = useToast();

    const normalizeCategory = (cat: string): ProductCategory | null => {
        const lower = cat.toLowerCase().trim();
        if (lower.includes('flex')) return 'flexible';
        if (lower.includes('rigid') || lower.includes('rígid')) return 'rigid';
        if (lower.includes('tinta') || lower.includes('ink')) return 'ink';
        if (lower.includes('acce') || lower.includes('herr')) return 'accessory';
        if (lower.includes('display') || lower.includes('expo')) return 'display';
        return null;
    };

    const normalizeSubcategory = (sub: string): string => {
        let normalized = sub.toLowerCase().trim();
        normalized = normalized.replace(/[\s\/\\]+/g, '_');
        normalized = normalized.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (normalized.includes('corte') && normalized.includes('color')) return 'corte_colores';
        if (normalized.includes('l600') || normalized.includes('l700')) return 'l600_700';
        if (normalized.includes('l800') || normalized.includes('r530')) return 'l800';
        if (normalized.includes('l570') || normalized.includes('375')) return 'l570_375';
        return normalized;
    };

    const parseData = () => {
        if (!rawInput.trim()) return;
        const rows = rawInput.split('\n').filter(r => r.trim());
        const items: ParsedItem[] = rows.map((row) => {
            const cols = row.split('\t').map(c => c.trim());

            // REF | NOMBRE | CAT | SUBCAT | PRECIO | LARGO | MARCA | DESC | ACABADO | TRASERA | ADHESIVO | TIPO | PESO | VOLUMEN
            const reference = cols[0] || '';
            const name = cols[1] || '';
            const rawCategory = cols[2] || '';
            const subcategory = normalizeSubcategory(cols[3] || 'general');
            const priceStr = (cols[4] || '0').replace('€', '').replace(',', '.').trim();
            const price = parseFloat(priceStr) || 0;
            // Roll length: default 50m if not specified
            const lengthStr = (cols[5] || '').replace(',', '.').replace('m', '').trim();
            const length = parseFloat(lengthStr) || 50;
            const brand = (cols[6] || '').trim().toUpperCase() || 'DM';
            const description = (cols[7] || '').trim();
            // Flex config flags (S/N)
            const allowFinish = parseYN(cols[8] || '');
            const allowBacking = parseYN(cols[9] || '');
            const allowAdhesive = parseYN(cols[10] || '');
            const materialType = (cols[11] || '').toLowerCase();
            const weight = parseFloat((cols[12] || '0').replace(',', '.')) || 0;
            const volume = cols[13] || '';

            const errors: string[] = [];
            const category = normalizeCategory(rawCategory);
            if (!reference) errors.push('Falta referencia');
            if (!name) errors.push('Falta nombre');
            if (!category) errors.push(`Categoría desconocida: ${rawCategory}`);
            if (price <= 0) errors.push('Precio inválido');

            return {
                reference, name,
                category: category || 'flexible',
                subcategory, price, length, brand, description,
                allowFinish, allowBacking, allowAdhesive,
                materialType, weight, volume,
                isValid: errors.length === 0,
                errors
            };
        });

        setParsedItems(items);
        setShowPreview(true);
    };

    const handleSave = () => {
        const validItems = parsedItems.filter(i => i.isValid);
        if (validItems.length === 0) { toast('No hay productos válidos para guardar', 'error'); return; }

        const newProducts: Product[] = validItems.map((item, i) => {
            const isFlexible = item.category === 'flexible';
            return {
                id: `bulk-${Date.now()}-${i}`,
                reference: item.reference,
                name: item.name,
                category: item.category as ProductCategory,
                subcategory: item.subcategory,
                price: isFlexible ? 0 : item.price,
                pricePerM2: isFlexible ? item.price : undefined,
                unit: isFlexible ? 'bobina' : 'ud',
                isFlexible,
                width: undefined,
                length: isFlexible ? item.length : undefined,
                inStock: true,
                brand: item.brand as any,
                description: item.description || '',
                weight: item.weight || 0,
                volume: item.volume || undefined,
                materialType: item.materialType as any || undefined,
                allowFinish: item.allowFinish,
                allowBacking: item.allowBacking,
                allowAdhesive: item.allowAdhesive,
            };
        });

        onSave(newProducts);
        setRawInput('');
        setParsedItems([]);
        setShowPreview(false);
        toast(`${newProducts.length} producto${newProducts.length !== 1 ? 's' : ''} importado${newProducts.length !== 1 ? 's' : ''} correctamente`, 'success');
    };

    const handleExport = () => {
        if (!currentProducts || currentProducts.length === 0) { toast('No hay productos para exportar', 'info'); return; }

        const header = [
            'Referencia', 'Nombre', 'Categoría', 'Subcategoría',
            'Precio (€/m² si flexible, €/ud si no)',
            'Largo bobina (m, solo flex)',
            'Marca', 'Descripción',
            'Acabado (S/N)', 'Trasera (S/N)', 'Adhesivo (S/N)',
            'Tipo Material', 'Peso (kg)', 'Volumen'
        ].join('\t');

        const rows = currentProducts.map(p => {
            const isFlexible = p.isFlexible;
            return [
                p.reference,
                p.name,
                p.category,
                p.subcategory || '',
                // Price: for flexible use pricePerM2, for others use price
                isFlexible
                    ? (p.pricePerM2 ?? 0).toString().replace('.', ',')
                    : p.price.toString().replace('.', ','),
                // Roll length (only meaningful for flexible)
                isFlexible ? (p.length ?? 50).toString() : '',
                p.brand || 'DM',
                p.description || '',
                isFlexible ? (p.allowFinish ? 'S' : 'N') : '',
                isFlexible ? (p.allowBacking ? 'S' : 'N') : '',
                isFlexible ? (p.allowAdhesive ? 'S' : 'N') : '',
                p.materialType || '',
                (p.weight || 0).toString().replace('.', ','),
                p.volume || ''
            ].join('\t');
        }).join('\n');

        const content = `${header}\n${rows}`;
        const blob = new Blob([content], { type: 'text/tab-separated-values;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'catalogo_productos_dm.xls');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="p-4 md:p-10 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                    <FileSpreadsheet className="text-slate-400" /> Carga Masiva (Excel)
                </h1>
                <div className="flex gap-3">
                    <button onClick={handleExport} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm font-bold flex items-center gap-2">
                        <Download size={16} /> Exportar Excel
                    </button>
                    <button
                        onClick={() => setShowDeleteCatalogConfirm(true)}
                        className="bg-red-100 text-red-600 px-4 py-2 rounded hover:bg-red-200 text-sm font-bold flex items-center gap-2"
                    >
                        <Trash2 size={16} /> Eliminar Catálogo
                    </button>
                </div>
            </div>

            {!showPreview ? (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="mb-4 bg-blue-50 text-blue-800 p-4 rounded-lg text-sm border border-blue-100">
                        <p className="font-bold mb-2">Formato de columnas (separadas por tabulador):</p>
                        <div className="overflow-x-auto">
                            <table className="text-xs w-full border-collapse">
                                <thead>
                                    <tr className="bg-blue-100">
                                        {['REF', 'NOMBRE', 'CAT', 'SUBCAT', 'PRECIO', 'LARGO', 'MARCA', 'DESC', 'ACABADO', 'TRASERA', 'ADHESIVO', 'TIPO', 'PESO', 'VOLUMEN'].map(h => (
                                            <th key={h} className="px-2 py-1 border border-blue-200 text-left font-bold">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className="px-2 py-1 border border-blue-200 text-blue-600" colSpan={4}>Obligatorio</td>
                                        <td className="px-2 py-1 border border-blue-200 text-blue-600">€/m² si flex<br />€/ud si no</td>
                                        <td className="px-2 py-1 border border-blue-200 text-orange-600">Solo flex.<br />Default: 50m</td>
                                        <td className="px-2 py-1 border border-blue-200 text-slate-500">ATP/TMK/...</td>
                                        <td className="px-2 py-1 border border-blue-200 text-slate-500">Texto libre</td>
                                        <td className="px-2 py-1 border border-blue-200 text-orange-600" colSpan={3}>Solo flex:<br />S o N</td>
                                        <td className="px-2 py-1 border border-blue-200 text-slate-500">monomeric/<br />polymeric/cast</td>
                                        <td className="px-2 py-1 border border-blue-200 text-slate-500">kg</td>
                                        <td className="px-2 py-1 border border-blue-200 text-slate-500">p.ej. 500ml</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <p className="mt-2 text-xs text-blue-600">
                            💡 <strong>Materiales flexibles:</strong> el ancho y largo se seleccionan en el portal por el cliente — no hace falta indicarlos aquí. El precio es siempre €/m².
                        </p>
                    </div>

                    <textarea
                        className="w-full h-64 border border-slate-300 rounded-lg p-4 font-mono text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                        placeholder="Pega aquí los datos copiados de Excel..."
                        value={rawInput}
                        onChange={e => setRawInput(e.target.value)}
                    />

                    <div className="mt-4 flex justify-end">
                        <button
                            onClick={parseData}
                            disabled={!rawInput.trim()}
                            className="bg-slate-900 text-white px-3 py-2 rounded-lg font-bold hover:bg-slate-800 transition-colors disabled:bg-slate-300"
                        >
                            Previsualizar Datos
                        </button>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <button onClick={() => setShowPreview(false)} className="text-slate-500 hover:text-slate-900 font-medium">
                            ← Volver a editar
                        </button>
                        <div className="flex gap-4">
                            <span className="text-sm text-slate-500 flex items-center gap-2">
                                <CheckCircle size={16} className="text-green-500" /> {parsedItems.filter(i => i.isValid).length} válidos
                            </span>
                            <span className="text-sm text-slate-500 flex items-center gap-2">
                                <AlertCircle size={16} className="text-red-500" /> {parsedItems.filter(i => !i.isValid).length} errores
                            </span>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                                    <tr>
                                        <th className="px-3 py-2">Estado</th>
                                        <th className="px-3 py-2">Nombre</th>
                                        <th className="px-3 py-2">Cat.</th>
                                        <th className="px-3 py-2">Precio</th>
                                        <th className="px-3 py-2">Opciones config.</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {parsedItems.map((item, idx) => (
                                        <tr key={idx} className={!item.isValid ? "bg-red-50" : "hover:bg-slate-50"}>
                                            <td className="px-3 py-1.5">
                                                {item.isValid
                                                    ? <CheckCircle size={18} className="text-green-500" />
                                                    : <div className="flex flex-col gap-0.5">
                                                        <AlertCircle size={18} className="text-red-500" />
                                                        {item.errors.map((e, i) => <span key={i} className="text-[10px] text-red-500">{e}</span>)}
                                                    </div>
                                                }
                                            </td>
                                            <td className="px-3 py-1.5">
                                                <div className="font-bold">{item.name}</div>
                                                <div className="text-[10px] text-slate-400">{item.reference}</div>
                                            </td>
                                            <td className="px-4 py-2 text-slate-600">{item.category}</td>
                                            <td className="px-4 py-2 font-mono">
                                                {item.price} {item.category === 'flexible' ? '€/m²' : '€/ud'}
                                            </td>
                                            <td className="px-4 py-2 text-xs space-x-1">
                                                {item.category === 'flexible' ? (
                                                    <>
                                                        {item.allowFinish && <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">Acabado</span>}
                                                        {item.allowBacking && <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">Trasera</span>}
                                                        {item.allowAdhesive && <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-bold">Adhesivo</span>}
                                                        {!item.allowFinish && !item.allowBacking && !item.allowAdhesive && (
                                                            <span className="text-slate-400 italic">Solo ancho</span>
                                                        )}
                                                    </>
                                                ) : '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button
                            onClick={handleSave}
                            className="bg-slate-900 text-white px-8 py-3 rounded-lg font-bold hover:bg-slate-800 transition-colors shadow-lg"
                        >
                            Confirmar Importación
                        </button>
                    </div>
                </div>
            )}

            {/* Inline confirm modal for catalog deletion */}
            {showDeleteCatalogConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 p-6">
                        <h3 className="text-base font-bold text-red-600 mb-2">⚠️ ¿Eliminar catálogo completo?</h3>
                        <p className="text-sm text-slate-600 mb-6">
                            Esto eliminará <strong>TODOS los productos actuales</strong> de forma permanente. Esta acción no se puede deshacer.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowDeleteCatalogConfirm(false)}
                                className="px-4 py-2 text-sm text-slate-500 hover:text-slate-800 font-bold"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => { onSave([]); setShowDeleteCatalogConfirm(false); toast('Catálogo eliminado', 'success'); }}
                                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-lg transition-colors"
                            >
                                Sí, borrar todo
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
