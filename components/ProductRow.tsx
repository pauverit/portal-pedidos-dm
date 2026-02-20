import React, { useState, useEffect } from 'react';
import { Check, ShoppingCart, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Product, CartItem } from '../types';

interface ProductRowProps {
    product: Product;
    cartItem?: CartItem;
    onAddToCart: (product: Product, quantity: number, options?: any) => void;
    onUpdateQuantity: (id: string, delta: number) => void;
    formatCurrency: (value: number) => string;
    isAdmin?: boolean;
    onEdit?: (product: Product) => void;
}

export const ProductRow: React.FC<ProductRowProps> = ({
    product,
    cartItem,
    onAddToCart,
    onUpdateQuantity,
    formatCurrency,
    isAdmin,
    onEdit
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [quantity, setQuantity] = useState(1);

    // Configuration State
    const [width, setWidth] = useState<number>(product.width || 1.05);
    const [finish, setFinish] = useState<'gloss' | 'matte'>(product.finish || 'gloss');
    const [backing, setBacking] = useState<'white' | 'gray' | 'black'>(product.backing || 'white');
    const [adhesive, setAdhesive] = useState<'permanent' | 'removable'>(product.adhesive || 'permanent');

    // A product is "flexible" (has format/width to configure) if it's in the flexible category
    const isFlexible = product.category === 'flexible';

    // Fedrigoni backing rule
    useEffect(() => {
        if (product.materialType === 'monomeric' && (product.brand?.toLowerCase().includes('fedrigoni') || product.name.toLowerCase().includes('fedrigoni'))) {
            setBacking('black');
        }
    }, [product, finish]);

    const handleAdd = () => {
        let options: any = undefined;

        if (isFlexible) {
            options = {};
            options.width = width;

            if (product.allowFinish || product.subcategory?.includes('vinilos') || product.subcategory?.includes('laminados')) {
                options.finish = finish;
            }
            if (product.allowBacking || (product.subcategory?.includes('vinilos') && !product.subcategory?.includes('laminados'))) {
                options.backing = backing;
            }
            if (product.allowAdhesive || (product.materialType === 'monomeric' && product.subcategory?.includes('vinilos'))) {
                options.adhesive = adhesive;
            }
        }

        onAddToCart(product, quantity, options);
        setQuantity(1);
        setIsExpanded(false);
    };

    // Width options per subcategory
    const widthOptions = product.subcategory?.includes('lonas')
        ? [1.05, 1.37, 1.60, 2.20, 2.50, 3.20]
        : [1.05, 1.37, 1.52, 1.60];

    const renderConfigurator = () => (
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-100">
            <div className="flex flex-wrap items-end gap-x-5 gap-y-3">

                {/* Width Selection */}
                <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Ancho</label>
                    <div className="flex flex-wrap gap-1.5">
                        {widthOptions.map((w) => (
                            <button
                                key={w}
                                onClick={() => setWidth(w)}
                                className={`px-2.5 py-1 text-xs rounded-full border font-medium transition-all ${width === w ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-500'}`}
                            >
                                {w}m
                            </button>
                        ))}
                    </div>
                </div>

                {/* Finish */}
                {(product.allowFinish || product.subcategory?.includes('vinilos') || product.subcategory?.includes('laminados')) && (
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">Acabado</label>
                        <div className="flex gap-1.5">
                            {(['gloss', 'matte'] as const).map(f => (
                                <button key={f} onClick={() => setFinish(f)}
                                    className={`px-2.5 py-1 text-xs rounded-full border font-medium transition-all ${finish === f ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-500'}`}>
                                    {f === 'gloss' ? 'Brillo' : 'Mate'}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Backing (vinyls only) */}
                {(product.allowBacking || (product.subcategory?.includes('vinilos') && !product.subcategory?.includes('laminados'))) && (
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">Trasera</label>
                        {product.materialType === 'monomeric' && (product.brand?.toLowerCase().includes('fedrigoni') || product.name.toLowerCase().includes('fedrigoni')) ? (
                            <div className="text-xs p-1.5 bg-slate-200 rounded text-slate-600">Negra (Fedrigoni)</div>
                        ) : (
                            <div className="flex gap-1.5">
                                {(['white', 'gray'] as const).map(b => (
                                    <button key={b} onClick={() => setBacking(b)}
                                        className={`px-2.5 py-1 text-xs rounded-full border font-medium transition-all ${backing === b ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-500'}`}>
                                        {b === 'white' ? 'Blanca' : 'Gris'}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Adhesive (monomeric vinyls) */}
                {(product.allowAdhesive || (product.materialType === 'monomeric' && product.subcategory?.includes('vinilos'))) && (
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">Adhesivo</label>
                        <div className="flex gap-1.5">
                            {(['permanent', 'removable'] as const).map(a => (
                                <button key={a} onClick={() => setAdhesive(a)}
                                    className={`px-2.5 py-1 text-xs rounded-full border font-medium transition-all ${adhesive === a ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-500'}`}>
                                    {a === 'permanent' ? 'Permanente' : 'Removible'}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Quantity + Add button */}
                <div className="ml-auto flex items-end gap-2">
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">Cantidad</label>
                        <input
                            type="number"
                            min="1"
                            value={quantity}
                            onChange={e => setQuantity(parseInt(e.target.value) || 1)}
                            className="w-16 px-2 py-1.5 border border-slate-200 rounded-lg text-sm text-center focus:ring-2 focus:ring-slate-900 outline-none"
                        />
                    </div>
                    <button
                        onClick={handleAdd}
                        className="bg-slate-900 text-white py-1.5 px-4 rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors flex items-center gap-1.5"
                    >
                        <ShoppingCart size={13} />
                        Añadir
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <>
            <tr className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${isExpanded ? 'bg-slate-50' : ''}`}>
                {/* Ref */}
                <td className="px-4 py-3 font-medium text-slate-900">{product.reference}</td>

                {/* Name / Description */}
                <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{product.name}</div>
                    {product.description && <div className="text-xs text-slate-500 truncate max-w-xs">{product.description}</div>}
                    <div className="flex flex-wrap gap-1 mt-1">
                        {isFlexible && (
                            <span className="inline-flex items-center gap-1 text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                                Desglosable
                            </span>
                        )}
                        {product.brand && (
                            <span className="inline-flex items-center gap-1 text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                                {product.brand}
                            </span>
                        )}
                    </div>
                </td>

                {/* Formato — Configurar button goes HERE for flexible materials */}
                <td className="px-4 py-3 text-slate-600">
                    {isFlexible ? (
                        cartItem ? (
                            // Already in cart: show chosen format
                            <span className="text-sm text-slate-700">
                                {cartItem.width ? `${cartItem.width}m` : '—'}
                                {product.length ? ` × ${product.length}m` : ''}
                            </span>
                        ) : (
                            // Not in cart: show Configurar button in this cell
                            <button
                                onClick={() => setIsExpanded(!isExpanded)}
                                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${isExpanded
                                        ? 'bg-slate-900 text-white border-slate-900'
                                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 hover:border-slate-500'
                                    }`}
                            >
                                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                {isExpanded ? 'Cerrar' : 'Configurar'}
                            </button>
                        )
                    ) : (
                        // Non-flexible: show static format
                        <>
                            {product.width ? `${product.width}m` : product.unit}
                            {product.length ? ` x ${product.length}m` : ''}
                        </>
                    )}
                </td>

                {/* Precio */}
                <td className="px-4 py-3 text-right font-medium text-slate-900 w-28">
                    {product.price > 0
                        ? formatCurrency(product.price)
                        : <span className="text-slate-400 italic">Consultar</span>}
                    {product.unit && <span className="text-xs text-slate-400 font-normal"> / {product.unit}</span>}
                </td>

                {/* Cantidad */}
                <td className="px-4 py-3">
                    {cartItem ? (
                        // In cart: show +/- controls
                        <div className="flex items-center justify-center gap-2">
                            <button
                                onClick={() => onUpdateQuantity(cartItem.id, -1)}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                            >
                                -
                            </button>
                            <span className="w-8 text-center font-medium">{cartItem.quantity}</span>
                            <button
                                onClick={() => onUpdateQuantity(cartItem.id, 1)}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                            >
                                +
                            </button>
                        </div>
                    ) : isFlexible ? (
                        // Flexible not in cart: empty (button is in Formato column)
                        null
                    ) : (
                        // Non-flexible: add to cart controls
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                min="1"
                                value={quantity}
                                onChange={e => setQuantity(parseInt(e.target.value) || 1)}
                                className="w-16 px-2 py-1 border border-slate-200 rounded-lg text-sm text-center focus:ring-2 focus:ring-slate-900 outline-none"
                            />
                            <button
                                onClick={handleAdd}
                                disabled={product.price === 0}
                                className={`flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-white text-sm font-medium transition-colors ${product.price === 0
                                        ? 'bg-slate-300 cursor-not-allowed'
                                        : 'bg-slate-900 hover:bg-slate-800 shadow-sm hover:shadow'
                                    }`}
                            >
                                <ShoppingCart size={16} />
                                <span className="hidden sm:inline">Añadir</span>
                            </button>
                        </div>
                    )}
                </td>

                {/* Admin edit button */}
                {isAdmin && (
                    <td className="px-4 py-3 text-center">
                        <button
                            onClick={() => onEdit?.(product)}
                            className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"
                            title="Editar producto"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                    </td>
                )}
            </tr>

            {/* Expanded configurator row — spans all columns */}
            {isExpanded && isFlexible && (
                <tr>
                    <td colSpan={isAdmin ? 6 : 5} className="p-0">
                        {renderConfigurator()}
                    </td>
                </tr>
            )}
        </>
    );
};
