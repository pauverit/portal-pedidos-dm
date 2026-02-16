import React, { useState } from 'react';
import { Save, AlertCircle, CheckCircle, X } from 'lucide-react';
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
        return null;
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
            const subcategory = cols[3] || 'general';

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

                if (width <= 0 || length <= 0) {
                    itemsErrors.push('Flexible requiere Ancho y Largo');
                }
            } else {
                // Non-flexible items ignore width/length
                length = 0;
            }

            const rawBrand = (cols[7] || '').trim().toUpperCase();
            let brand: 'ATP' | 'TMK' | 'FEDRIGONI' | 'DM' = 'DM';
            if (['ATP', 'TMK', 'FEDRIGONI'].includes(rawBrand)) {
                brand = rawBrand as any;
            }

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

            pricePerM2: item.category === 'flexible' ? item.price : undefined,
            price: item.category === 'flexible' ? 0 : item.price, // Base price 0 for flexible? calculating on fly?
            // Actually standard 'product.price' is usually the unit price. 
            // In App.tsx: calculatedPrice = product.isFlexible ? (...) : product.price
            // So for flexible, 'price' property might be irrelevant OR it might be the roll price.
            // Let's set 'price' to calculated roll price for consistency if needed, but App.tsx seems to ignore it for flexible.
            // Let's safe-guard it.

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
            <h1 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                <Save className="text-slate-400" /> Carga Masiva (Excel)
            </h1>

            {!showPreview ? (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="mb-4 bg-blue-50 text-blue-800 p-4 rounded-lg text-sm border border-blue-100">
                        <p className="font-bold mb-2">Instrucciones:</p>
                        <p className="mb-2">Copia las columnas de tu Excel y pégalas aquí. El orden <strong>EXACTO</strong> debe ser:</p>
                        <code className="bg-white px-2 py-1 rounded border border-blue-200 block text-xs md:text-sm overflow-x-auto">
                            REF | NOMBRE | CATEGORÍA | SUBCATEGORÍA | PRECIO | ANCHO | LARGO
                        </code>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li><strong>Categoría:</strong> Flexible, Rígido, Tinta, Accesorio.</li>
                            <li><strong>Precio:</strong> Para flexibles es €/m². Para el resto es precio unidad.</li>
                            <li><strong>Ancho/Largo:</strong> Solo obligatorio para Flexibles.</li>
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
                                            <td className="px-4 py-2 font-mono">
                                                {item.price.toFixed(2)} {item.category === 'flexible' ? '€/m²' : '€'}
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
