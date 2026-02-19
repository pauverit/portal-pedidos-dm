import React, { useState } from 'react';
import { Save, AlertCircle, CheckCircle, X, Trash2, Download, FileSpreadsheet } from 'lucide-react';
import { Product, ProductCategory } from '../types';

interface AdminBulkLoadProps {
    onSave: (products: Product[]) => void;
    currentProducts: Product[]; // Need current products for export
}

interface ParsedItem {
    reference: string;
    name: string;
    category: string;
    subcategory: string;
    price: number;
    width: number;
    length: number;
    brand: 'ATP' | 'TMK' | 'FEDRIGONI' | 'DM';
    description: string;
    weight: number;
    // New fields
    finish: 'gloss' | 'matte' | '';
    backing: 'white' | 'gray' | 'black' | '';
    adhesive: 'permanent' | 'removable' | '';
    materialType: string;

    isValid: boolean;
    errors: string[];
}

export const AdminBulkLoad: React.FC<AdminBulkLoadProps> = ({ onSave, currentProducts = [] }) => {
    const [rawInput, setRawInput] = useState('');
    const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
    const [showPreview, setShowPreview] = useState(false);

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

    const calculateWeight = (name: string, subcat: string, description: string, width: number, length: number): number => {
        if (width <= 0 || length <= 0) return 0;
        const areaM2 = width * length;
        let gramsPerM2 = 0;

        const nameLower = name.toLowerCase();
        const subcatLower = subcat.toLowerCase();

        if (nameLower.includes('vinil') || subcatLower.includes('vinil')) {
            gramsPerM2 = 130;
        } else if (nameLower.includes('laminad') || subcatLower.includes('laminad')) {
            gramsPerM2 = 100;
        } else if (nameLower.includes('lona') || subcatLower.includes('lona')) {
            const match = description.match(/(\d+)\s*gr/i);
            gramsPerM2 = match ? parseInt(match[1]) : 0;
        }

        if (gramsPerM2 === 0) return 0;
        return parseFloat(((areaM2 * gramsPerM2) / 1000).toFixed(3));
    };

    const parseData = () => {
        if (!rawInput.trim()) return;

        const rows = rawInput.split('\n').filter(r => r.trim());
        const items: ParsedItem[] = rows.map((row, index) => {
            const cols = row.split('\t').map(c => c.trim());

            // REF | NAME | CAT | SUBCAT | PRICE | WIDTH | LENGTH | BRAND | DESC | FINISH | BACKING | ADHESIVE | MAT_TYPE
            const reference = cols[0] || '';
            const name = cols[1] || '';
            const rawCategory = cols[2] || '';
            const rawSubcategory = cols[3] || 'general';
            const subcategory = normalizeSubcategory(rawSubcategory);

            const priceStr = (cols[4] || '0').replace('€', '').replace(',', '.').trim();
            const price = parseFloat(priceStr) || 0;

            const itemsErrors: string[] = [];
            const category = normalizeCategory(rawCategory);

            if (!reference) itemsErrors.push('Falta referencia');
            if (!name) itemsErrors.push('Falta nombre');
            if (!category) itemsErrors.push(`Categoría desconocida: ${rawCategory}`);

            let width = 0;
            let length = 0;

            if (category === 'flexible') {
                const widthStr = (cols[5] || '0').replace(',', '.').replace('m', '').trim();
                const lengthStr = (cols[6] || '0').replace(',', '.').replace('m', '').trim();
                width = parseFloat(widthStr);
                length = parseFloat(lengthStr);

                if (width > 4) width = width / 100;

                if (width <= 0 || length <= 0) {
                    // itemsErrors.push('Flexible requiere Ancho y Largo'); // Relaxed check if Configurable
                }
            }

            const rawBrand = (cols[7] || '').trim().toUpperCase();
            const brand = (rawBrand as any) || 'DM';
            const description = (cols[8] || '').trim();

            // New Fields
            const finishRaw = (cols[9] || '').toLowerCase();
            const finish = (finishRaw.includes('brillo') || finishRaw.includes('gloss')) ? 'gloss' :
                (finishRaw.includes('mate') || finishRaw.includes('matte')) ? 'matte' : '';

            const backingRaw = (cols[10] || '').toLowerCase();
            const backing = backingRaw.includes('black') || backingRaw.includes('negra') ? 'black' :
                backingRaw.includes('gray') || backingRaw.includes('gris') ? 'gray' :
                    backingRaw.includes('white') || backingRaw.includes('blanca') ? 'white' : '';

            const adhesiveRaw = (cols[11] || '').toLowerCase();
            const adhesive = adhesiveRaw.includes('remov') ? 'removable' :
                adhesiveRaw.includes('perm') ? 'permanent' : '';

            const materialType = (cols[12] || '').toLowerCase();

            const calculatedWeight = category === 'flexible'
                ? calculateWeight(name, subcategory, description, width, length)
                : 0;

            return {
                reference,
                name,
                category: category || 'flexible',
                subcategory,
                price,
                width,
                length,
                brand,
                description,
                finish: finish as any,
                backing: backing as any,
                adhesive: adhesive as any,
                materialType,
                weight: calculatedWeight || (parseFloat((cols[13] || '0').replace(',', '.')) || 0), // Allow manual weight in col 13?
                isValid: itemsErrors.length === 0,
                errors: itemsErrors
            };
        });

        setParsedItems(items);
        setShowPreview(true);
    };

    const handleSave = () => {
        const validItems = parsedItems.filter(i => i.isValid);
        if (validItems.length === 0) {
            alert("No hay productos válidos para guardar.");
            return;
        }

        const newProducts: Product[] = validItems.map((item, i) => ({
            id: `bulk-${Date.now()}-${i}`,
            reference: item.reference,
            name: item.name,
            category: item.category as ProductCategory,
            subcategory: item.subcategory,
            price: item.price,
            pricePerM2: (item.category === 'flexible' && item.width > 0 && item.length > 0)
                ? (item.price / (item.width * item.length))
                : undefined,
            unit: item.category === 'flexible' ? 'bobina' : 'ud',
            isFlexible: item.category === 'flexible',
            width: item.category === 'flexible' ? item.width : undefined,
            length: item.category === 'flexible' ? item.length : undefined,
            inStock: true,
            brand: item.brand,
            description: item.description || '',
            weight: item.weight || 0,

            // New Configurable Props
            finish: item.finish || undefined,
            backing: item.backing || undefined,
            adhesive: item.adhesive || undefined,
            materialType: item.materialType as any || undefined,
            allowFinish: !!item.finish,
            allowBacking: !!item.backing,
            allowAdhesive: !!item.adhesive,
        }));

        onSave(newProducts);
        setRawInput('');
        setParsedItems([]);
        setShowPreview(false);
        alert(`${newProducts.length} productos importados correctamente.`);
    };

    const handleExport = () => {
        if (!currentProducts || currentProducts.length === 0) {
            alert('No hay productos para exportar.');
            return;
        }

        // CSV Header
        const header = [
            'Referencia', 'Nombre', 'Categoría', 'Subcategoría', 'Precio', 'Ancho', 'Largo',
            'Marca', 'Descripción', 'Acabado', 'Trasera', 'Adhesivo', 'Tipo Material', 'Peso'
        ].join('\t');

        const rows = currentProducts.map(p => {
            return [
                p.reference,
                p.name,
                p.category,
                p.subcategory || '',
                p.price.toString().replace('.', ','),
                (p.width || 0).toString().replace('.', ','),
                (p.length || 0).toString().replace('.', ','),
                p.brand || 'DM',
                p.description || '',
                p.finish === 'gloss' ? 'Brillo' : p.finish === 'matte' ? 'Mate' : '',
                p.backing === 'black' ? 'Negra' : p.backing === 'gray' ? 'Gris' : p.backing === 'white' ? 'Blanca' : '',
                p.adhesive === 'permanent' ? 'Permanente' : p.adhesive === 'removable' ? 'Removible' : '',
                p.materialType || '',
                (p.weight || 0).toString().replace('.', ',')
            ].join('\t');
        }).join('\n');

        const content = `${header}\n${rows}`;

        // Create download link
        const blob = new Blob([content], { type: 'text/tab-separated-values;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'catalogo_productos_dm.xls'); // .xls extension to force Excel to open it, even though it's TSV
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="p-6 md:p-10 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                    <Save className="text-slate-400" /> Carga Masiva (Excel)
                </h1>
                <div className="flex gap-3">
                    <button
                        onClick={handleExport}
                        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm font-bold flex items-center gap-2"
                    >
                        <Download size={16} /> Exportar Excel
                    </button>
                    <button
                        onClick={() => {
                            if (confirm('¿ESTÁS SEGURO? Esto eliminará TODOS los productos actuales. Esta acción no se puede deshacer.')) {
                                if (confirm('CONFIRMACIÓN FINAL: ¿Borrar todo el catálogo?')) {
                                    onSave([]);
                                }
                            }
                        }}
                        className="bg-red-100 text-red-600 px-4 py-2 rounded hover:bg-red-200 text-sm font-bold flex items-center gap-2"
                    >
                        <Trash2 size={16} /> Eliminar Catálogo
                    </button>
                </div>
            </div>

            {!showPreview ? (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="mb-4 bg-blue-50 text-blue-800 p-4 rounded-lg text-sm border border-blue-100">
                        <p className="font-bold mb-2">Instrucciones:</p>
                        <p className="mb-2">Copia las columnas de tu Excel y pégalas aquí. El orden <strong>EXACTO</strong> debe ser:</p>
                        <code className="bg-white px-2 py-1 rounded border border-blue-200 block text-xs md:text-sm overflow-x-auto select-all">
                            REF | NOMBRE | CAT | SUBCAT | PRECIO | ANCHO | LARGO | MARCA | DESC | ACABADO | TRASERA | ADHESIVO | TIPO
                        </code>
                        <div className="mt-2 text-xs text-blue-600 space-x-4">
                            <span>* ACABADO: Brillo, Mate</span>
                            <span>* TRASERA: Blanca, Gris, Negra</span>
                            <span>* ADHESIVO: Permanente, Removible</span>
                        </div>
                    </div>

                    <textarea
                        className="w-full h-64 border border-slate-300 rounded-lg p-4 font-mono text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                        placeholder="Pega aquí tus datos..."
                        value={rawInput}
                        onChange={e => setRawInput(e.target.value)}
                    />

                    <div className="mt-4 flex justify-end">
                        <button
                            onClick={parseData}
                            disabled={!rawInput.trim()}
                            className="bg-slate-900 text-white px-6 py-3 rounded-lg font-bold hover:bg-slate-800 transition-colors disabled:bg-slate-300"
                        >
                            Previsualizar Datos
                        </button>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Preview UI similar to before but with more columns if needed */}
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
                                        <th className="px-4 py-3">Estado</th>
                                        <th className="px-4 py-3">Ref</th>
                                        <th className="px-4 py-3">Nombre</th>
                                        <th className="px-4 py-3">Cat.</th>
                                        <th className="px-4 py-3">Precio</th>
                                        <th className="px-4 py-3">Attrs</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {parsedItems.map((item, idx) => (
                                        <tr key={idx} className={!item.isValid ? "bg-red-50" : "hover:bg-slate-50"}>
                                            <td className="px-4 py-2">
                                                {item.isValid ? <CheckCircle size={18} className="text-green-500" /> : <AlertCircle size={18} className="text-red-500" />}
                                            </td>
                                            <td className="px-4 py-2 font-mono text-xs">{item.reference}</td>
                                            <td className="px-4 py-2 truncate max-w-[200px]">{item.name}</td>
                                            <td className="px-4 py-2">{item.category}</td>
                                            <td className="px-4 py-2 font-mono">{item.price} €</td>
                                            <td className="px-4 py-2 text-xs">
                                                {item.finish && <span className="mr-1 bg-gray-100 px-1 rounded">F:{item.finish}</span>}
                                                {item.backing && <span className="mr-1 bg-gray-100 px-1 rounded">B:{item.backing}</span>}
                                                {item.adhesive && <span className="mr-1 bg-gray-100 px-1 rounded">A:{item.adhesive}</span>}
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
        </div>
    );
};
