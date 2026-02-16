import React, { useState } from 'react';
import { Save, AlertCircle, CheckCircle, X, Trash2 } from 'lucide-react';
import { Product, ProductCategory } from '../types';

interface AdminBulkLoadProps {
    onSave: (products: Product[]) => void;
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
    isValid: boolean;
    errors: string[];
}

export const AdminBulkLoad: React.FC<AdminBulkLoadProps> = ({ onSave }) => {
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
        // Replace spaces and special chars with underscores
        normalized = normalized.replace(/[\s\/\\]+/g, '_');
        // Remove accents
        normalized = normalized.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        // Custom mappings for specific known cases
        if (normalized.includes('corte') && normalized.includes('color')) return 'corte_colores';
        if (normalized.includes('l600') || normalized.includes('l700')) return 'l600_700';
        if (normalized.includes('l800') || normalized.includes('r530')) return 'l800'; // Merged category
        if (normalized.includes('l570') || normalized.includes('375')) return 'l570_375';

        return normalized;
    };

    const parseData = () => {
        if (!rawInput.trim()) return;

        const rows = rawInput.split('\n').filter(r => r.trim());
        const items: ParsedItem[] = rows.map((row, index) => {
            // Split by tab primarily, but handle potential issues
            const cols = row.split('\t').map(c => c.trim());

            // Expected format: Ref | Name | Cat | Subcat | Price | Width? | Length?
            const reference = cols[0] || '';
            const name = cols[1] || '';
            const rawCategory = cols[2] || '';
            const rawSubcategory = cols[3] || 'general';
            const subcategory = normalizeSubcategory(rawSubcategory);

            // Price parsing: handle "25,50 €" or "25.50"
            const priceStr = (cols[4] || '0').replace('€', '').replace(',', '.').trim();
            const price = parseFloat(priceStr) || 0;

            const itemsErrors: string[] = [];
            const category = normalizeCategory(rawCategory);

            if (!reference) itemsErrors.push('Falta referencia');
            if (!name) itemsErrors.push('Falta nombre');
            if (!category) itemsErrors.push(`Categoría desconocida: ${rawCategory}`);
            if (price <= 0) itemsErrors.push('Precio inválido');

            // Conditional Logic based on Category
            let width = 0;
            let length = 0;

            if (category === 'flexible') {
                const widthStr = (cols[5] || '0').replace(',', '.').replace('m', '').trim();
                const lengthStr = (cols[6] || '0').replace(',', '.').replace('m', '').trim();
                width = parseFloat(widthStr);
                length = parseFloat(lengthStr);

                // Normalization: Width is usually in cm (e.g. 137, 106, 160). Convert to meters if > 4
                // Length is usually in meters (e.g. 50, 100). Keep as is.
                if (width > 4) width = width / 100;

                if (width <= 0 || length <= 0) {
                    itemsErrors.push('Flexible requiere Ancho y Largo');
                }
            } else {
                // Non-flexible items ignore width/length
                length = 0;
            }

            const rawBrand = (cols[7] || '').trim().toUpperCase();
            // Allow any brand, simplified logic
            const brand = rawBrand || 'DM';

            return {
                reference,
                name,
                category: category || 'flexible', // Default to avoid crash, but marked error
                subcategory,
                price,
                width,
                length,
                brand,
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

            // For flexible, price is per m2. For others, it's just price.
            // But in our Product model:
            // Flexible: pricePerM2 = price (from input), unit = 'bobina'
            // calculated price in logic uses width*length*pricePerM2
            // Wait, standard Product model has 'price' field.
            // In App.tsx logic: quantity * (isFlexible ? width*length*pricePerM2 : price)
            // So checking implementation plan:
            // "If Flexible: Price is treated as €/m2" -> Map input price to pricePerM2
            // "If Not Flexible: Price is treated as Unitary" -> Map input price to price

            // Logic Change per User Request:
            // Excel Price = Unit Price (Total Roll Price)
            // Price per m² = Unit Price / (Width * Length)

            price: item.price,
            pricePerM2: (item.category === 'flexible' && item.width > 0 && item.length > 0)
                ? (item.price / (item.width * item.length))
                : undefined,

            unit: item.category === 'flexible' ? 'bobina' : 'ud',
            isFlexible: item.category === 'flexible',
            width: item.category === 'flexible' ? item.width : undefined,
            length: item.category === 'flexible' ? item.length : undefined,
            inStock: true,
            brand: item.brand
        }));

        onSave(newProducts);
        setRawInput('');
        setParsedItems([]);
        setShowPreview(false);
        alert(`${newProducts.length} productos importados correctamente.`);
    };

    return (
        <div className="p-6 md:p-10 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                    <Save className="text-slate-400" /> Carga Masiva (Excel)
                </h1>
                <button
                    onClick={() => {
                        if (confirm('¿ESTÁS SEGURO? Esto eliminará TODOS los productos actuales. Esta acción no se puede deshacer.')) {
                            if (confirm('CONFIRMACIÓN FINAL: ¿Borrar todo el catálogo?')) {
                                onSave([]); // Empty array triggers deletion in parent handleBulkSave special logic
                            }
                        }
                    }}
                    className="bg-red-100 text-red-600 px-4 py-2 rounded hover:bg-red-200 text-sm font-bold flex items-center gap-2"
                >
                    <Trash2 size={16} /> Eliminar Catálogo Completo
                </button>
            </div>

            {!showPreview ? (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="mb-4 bg-blue-50 text-blue-800 p-4 rounded-lg text-sm border border-blue-100">
                        <p className="font-bold mb-2">Instrucciones:</p>
                        <p className="mb-2">Copia las columnas de tu Excel y pégalas aquí. El orden <strong>EXACTO</strong> debe ser:</p>
                        <code className="bg-white px-2 py-1 rounded border border-blue-200 block text-xs md:text-sm overflow-x-auto select-all">
                            REF | NOMBRE | CATEGORÍA | SUBCATEGORÍA | PRECIO | ANCHO | LARGO | MARCA
                        </code>
                        <p className="text-xs text-blue-600 mt-2">
                            * Copia la cabecera anterior para usarla como guía en tu Excel.
                        </p>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li><strong>Categoría:</strong> Flexible, Rígido, Tinta, Accesorio.</li>
                            <li><strong>Precio:</strong> Para flexibles es el <strong>PRECIO TOTAL DE LA BOBINA</strong>. El sistema calculará el precio m².</li>
                            <li><strong>Ancho/Largo:</strong> Solo obligatorio para Flexibles (en cm o m).</li>
                            <li><strong>Marca:</strong> (Opcional) ATP, TMK, FEDRIGONI. Si se omite, se asigna DM.</li>
                        </ul>
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
                                        <th className="px-4 py-3">Dim.</th>
                                        <th className="px-4 py-3">Marca</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {parsedItems.map((item, idx) => (
                                        <tr key={idx} className={!item.isValid ? "bg-red-50" : "hover:bg-slate-50"}>
                                            <td className="px-4 py-2">
                                                {item.isValid ? (
                                                    <CheckCircle size={18} className="text-green-500" />
                                                ) : (
                                                    <div className="group relative">
                                                        <AlertCircle size={18} className="text-red-500 cursor-help" />
                                                        <div className="absolute left-6 top-0 w-48 bg-red-800 text-white text-xs p-2 rounded shadow-lg hidden group-hover:block z-50">
                                                            {item.errors.join(', ')}
                                                        </div>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-2 font-mono text-xs">{item.reference}</td>
                                            <td className="px-4 py-2 truncate max-w-[200px]">{item.name}</td>
                                            <td className="px-4 py-2">
                                                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${item.category === 'flexible' ? 'bg-blue-100 text-blue-700' :
                                                    item.category === 'rigid' ? 'bg-purple-100 text-purple-700' :
                                                        item.category === 'ink' ? 'bg-yellow-100 text-yellow-700' :
                                                            'bg-gray-100 text-gray-700'
                                                    }`}>
                                                    {item.category}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2 font-mono text-xs">
                                                {item.category === 'flexible' ? (
                                                    <div>
                                                        <span className="font-bold">{item.price.toFixed(2)} €</span>
                                                        <br />
                                                        <span className="text-slate-500">
                                                            {((item.price) / (item.width * item.length)).toFixed(2)} €/m²
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span>{item.price.toFixed(2)} €</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-2 text-xs">
                                                {item.category === 'flexible' ? `${item.width}x${item.length}m` : '-'}
                                            </td>
                                            <td className="px-4 py-2 text-xs font-bold text-slate-600">{item.brand}</td>
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

