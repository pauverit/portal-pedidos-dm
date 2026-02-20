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

    // Determine if product is configurable
    // We treat it as configurable if it has 'allow...' flags or is in specific categories and we want to prevent multiple rows
    const isConfigurable = product.allowFinish || product.allowBacking || product.allowAdhesive ||
        ['vinilos', 'laminados', 'lonas'].includes(product.subcategory || '') ||
        product.category === 'flexible'; // Broad check, refine as needed

    // Fedrigoni rule: If Monomeric + Fedrigoni -> Backing must be Black?
    // User said: "SI EL VINILO MONOMERICO SELECCIONADO ES DE LA MARCA FEDRIGONI LA TRASERA HA DE SER NEGRA EN VEZ DE GRIS."
    useEffect(() => {
        if (product.materialType === 'monomeric' && (product.brand?.toLowerCase().includes('fedrigoni') || product.name.toLowerCase().includes('fedrigoni'))) {
            setBacking('black');
        }
    }, [product, finish]); // Re-run if relevant

    const handleAdd = () => {
        let options: any = undefined;

        if (isConfigurable) {
            options = {};

            // Width
            if (product.category === 'flexible' || product.subcategory?.includes('lonas')) {
                options.width = width;
            }

            // Finish
            if (product.allowFinish || product.subcategory?.includes('vinilos') || product.subcategory?.includes('laminados')) {
                options.finish = finish;
            }

            // Backing
            if (product.allowBacking || (product.subcategory?.includes('vinilos') && !product.subcategory?.includes('laminados'))) {
                options.backing = backing;
            }

            // Adhesive
            if (product.allowAdhesive || (product.materialType === 'monomeric' && product.subcategory?.includes('vinilos'))) {
                options.adhesive = adhesive;
            }
        }

        onAddToCart(product, quantity, options);
        setQuantity(1);
        setIsExpanded(false);
    };

    const renderConfigurator = () => (
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex flex-wrap items-end gap-x-5 gap-y-2">
            {/* Width Selection */}
            {(product.category === 'flexible' || product.subcategory?.includes('lonas')) && (
                <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Medida</label>
                    <div className="flex flex-wrap gap-2">
                        {product.subcategory?.includes('lonas') ? (
                            <>
                                {[1.05, 1.37, 1.60, 2.20, 2.50, 3.20].map((w) => (
                                    <button
                                        key={w}
                                        onClick={() => setWidth(w)}
                                        className={`px-2.5 py-1 text-xs rounded-full border font-medium transition-all ${width === w ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-500'}`}
                                    >
                                        {w}m
                                    </button>
                                ))}
                            </>
                        ) : (
                            <>
                                {[1.05, 1.37, 1.52].map((w) => (
                                    <button
                                        key={w}
                                        onClick={() => setWidth(w)}
                                        className={`px-2.5 py-1 text-xs rounded-full border font-medium transition-all ${width === w ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-500'}`}
                                    >
                                        {w}m
                                    </button>
                                ))}
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Finish Selection */}
            {(product.allowFinish || product.subcategory?.includes('vinilos') || product.subcategory?.includes('laminados')) && (
                <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Acabado</label>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setFinish('gloss')}
                            className={`px-2.5 py-1 text-xs rounded-full border font-medium transition-all ${finish === 'gloss' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-500'}`}
                        >
                            Brillo
                        </button>
                        <button
                            onClick={() => setFinish('matte')}
                            className={`px-2.5 py-1 text-xs rounded-full border font-medium transition-all ${finish === 'matte' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-500'}`}
                        >
                            Mate
                        </button>
                    </div>
                </div>
            )}

            {/* Backing Selection (Only for Vinyls) */}
            {(product.allowBacking || (product.subcategory?.includes('vinilos') && !product.subcategory?.includes('laminados'))) && (
                <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Trasera</label>
                    {product.materialType === 'monomeric' && (product.brand?.toLowerCase().includes('fedrigoni') || product.name.toLowerCase().includes('fedrigoni')) ? (
                        <div className="text-sm p-2 bg-slate-200 rounded text-slate-600">Negra (Fedrigoni)</div>
                    ) : (
                        <div className="flex gap-2">
                            <button
                                onClick={() => setBacking('white')}
                                className={`px-2.5 py-1 text-xs rounded-full border font-medium transition-all ${backing === 'white' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-500'}`}
                            >
                                Blanca
                            </button>
                            <button
                                onClick={() => setBacking('gray')}
                                className={`px-2.5 py-1 text-xs rounded-full border font-medium transition-all ${backing === 'gray' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-500'}`}
                            >
                                Gris
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Adhesive Selection (Monomeric Vinyls) */}
            {(product.allowAdhesive || (product.materialType === 'monomeric' && product.subcategory?.includes('vinilos'))) && (
                <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Adhesivo</label>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setAdhesive('permanent')}
                            className={`px-2.5 py-1 text-xs rounded-full border font-medium transition-all ${adhesive === 'permanent' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-500'}`}
                        >
                            Permanente
                        </button>
                        <button
                            onClick={() => setAdhesive('removable')}
                            className={`px-2.5 py-1 text-xs rounded-full border font-medium transition-all ${adhesive === 'removable' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-500'}`}
                        >
                            Removible
                        </button>
                    </div>
                </div>
            )}

            <button
                onClick={handleAdd}
                className="ml-auto bg-slate-900 text-white py-1.5 px-4 rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors flex items-center gap-1.5 self-end"
            >
                <ShoppingCart size={13} />
                Añadir
            </button>
        </div>
    );

    return (
        <>
            <tr className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${isExpanded ? 'bg-slate-50' : ''}`}>
                <td className="px-4 py-3 font-medium text-slate-900">{product.reference}</td>
                <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{product.name}</div>
                    {product.description && <div className="text-xs text-slate-500 truncate max-w-xs">{product.description}</div>}
                    {/* Badge for configurable */}
                    {isConfigurable && (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full mt-1">
                            Desglosable
                        </span>
                    )}
                    {product.brand && (
                        <span className="ml-2 inline-flex items-center gap-1 text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full mt-1">
                            {product.brand}
                        </span>
                    )}
                </td>
                <td className="px-4 py-3 text-slate-600">
                    {product.width ? `${product.width}m` : product.unit}
                    {product.length && ` x ${product.length}m`}
                </td>
                <td className="px-4 py-3 text-right font-medium text-slate-900 w-28">
                    {product.price > 0 ? formatCurrency(product.price) : <span className="text-slate-400 italic">Consultar</span>}
                    {product.unit && <span className="text-xs text-slate-400 font-normal"> / {product.unit}</span>}
                </td>
                <td className="px-4 py-3">
                    {cartItem ? (
                        <div className="flex items-center justify-center gap-2">
                            <button
                                onClick={() => onUpdateQuantity(cartItem.id, -1)}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                                title="Reducir cantidad"
                            >
                                -
                            </button>
                            <span className="w-8 text-center font-medium">{cartItem.quantity}</span>
                            <button
                                onClick={() => onUpdateQuantity(cartItem.id, 1)}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                                title="Aumentar cantidad"
                            >
                                +
                            </button>
                        </div>
                    ) : (
                        isConfigurable ? (
                            <button
                                onClick={() => setIsExpanded(!isExpanded)}
                                className="w-full flex items-center justify-center gap-2 bg-white border border-slate-300 text-slate-700 py-1.5 px-3 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
                            >
                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                {isExpanded ? 'Cerrar' : 'Configurar'}
                            </button>
                        ) : (
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    min="1"
                                    value={quantity}
                                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
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
                        )
                    )}
                </td>
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
            {isExpanded && isConfigurable && (
                <tr>
                    <td colSpan={isAdmin ? 6 : 5} className="p-0">
                        {renderConfigurator()}
                    </td>
                </tr>
            )}
        </>
    );
};
