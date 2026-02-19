import React, { useState, useEffect } from 'react';
import { Check, ShoppingCart, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Product, CartItem } from '../types';

interface ProductRowProps {
    product: Product;
    cartItem?: CartItem;
    onAddToCart: (product: Product, quantity: number, options?: any) => void;
    onUpdateQuantity: (id: string, delta: number) => void;
    formatCurrency: (value: number) => string;
}

export const ProductRow: React.FC<ProductRowProps> = ({
    product,
    cartItem,
    onAddToCart,
    onUpdateQuantity,
    formatCurrency
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
        <div className="p-4 bg-slate-50 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Width Selection */}
            {(product.category === 'flexible' || product.subcategory?.includes('lonas')) && (
                <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Medida</label>
                    <select
                        value={width}
                        onChange={(e) => setWidth(parseFloat(e.target.value))}
                        className="w-full p-2 border border-slate-300 rounded text-sm"
                    >
                        {/* Dynamic widths based on type */}
                        {product.subcategory?.includes('lonas') ? (
                            <>
                                <option value={1.05}>1.05m</option>
                                <option value={1.37}>1.37m</option>
                                <option value={1.60}>1.60m</option>
                                <option value={2.20}>2.20m</option>
                                <option value={2.50}>2.50m</option>
                                <option value={3.20}>3.20m</option>
                            </>
                        ) : (
                            <>
                                <option value={1.05}>1.05m</option>
                                <option value={1.37}>1.37m</option>
                                <option value={1.52}>1.52m</option>
                            </>
                        )}
                    </select>
                </div>
            )}

            {/* Finish Selection */}
            {(product.allowFinish || product.subcategory?.includes('vinilos') || product.subcategory?.includes('laminados')) && (
                <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Acabado</label>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setFinish('gloss')}
                            className={`flex-1 py-2 px-3 text-sm rounded border ${finish === 'gloss' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300'}`}
                        >
                            Brillo
                        </button>
                        <button
                            onClick={() => setFinish('matte')}
                            className={`flex-1 py-2 px-3 text-sm rounded border ${finish === 'matte' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300'}`}
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
                                className={`flex-1 py-2 px-3 text-sm rounded border ${backing === 'white' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300'}`}
                            >
                                Blanca
                            </button>
                            <button
                                onClick={() => setBacking('gray')}
                                className={`flex-1 py-2 px-3 text-sm rounded border ${backing === 'gray' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300'}`}
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
                    <select
                        value={adhesive}
                        onChange={(e) => setAdhesive(e.target.value as any)}
                        className="w-full p-2 border border-slate-300 rounded text-sm"
                    >
                        <option value="permanent">Permanente</option>
                        <option value="removable">Removible</option>
                    </select>
                </div>
            )}

            <div className="md:col-span-2 pt-2">
                <button
                    onClick={handleAdd}
                    className="w-full bg-slate-900 text-white py-2 rounded-lg font-medium hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                >
                    <ShoppingCart size={18} />
                    Añadir Configuración al Pedido
                </button>
            </div>
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
            </tr>
            {isExpanded && isConfigurable && (
                <tr>
                    <td colSpan={5} className="p-0">
                        {renderConfigurator()}
                    </td>
                </tr>
            )}
        </>
    );
};
