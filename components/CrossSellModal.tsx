import React from 'react';
import { X, Check, ShoppingCart, Percent } from 'lucide-react';
import { Product } from '../types';

interface CrossSellModalProps {
    isOpen: boolean;
    onClose: () => void;
    mainProduct: Product | null;
    recommendedProduct: Product | null;
    onAddRecommendation: (product: Product) => void;
    formatCurrency: (value: number) => string;
}

export const CrossSellModal: React.FC<CrossSellModalProps> = ({
    isOpen,
    onClose,
    mainProduct,
    recommendedProduct,
    onAddRecommendation,
    formatCurrency
}) => {
    if (!isOpen || !mainProduct || !recommendedProduct) return null;

    // Calculate discounted price (0.05€ discount per m2)
    const discountPerM2 = 0.05;
    const originalPricePerM2 = recommendedProduct.pricePerM2 || 0;
    const discountedPricePerM2 = Math.max(0, originalPricePerM2 - discountPerM2);

    // Create a virtual product with the discounted price
    const discountedProduct = {
        ...recommendedProduct,
        pricePerM2: discountedPricePerM2,
        // We might want to mark it as a special offer in the cart?
        name: `${recommendedProduct.name} (Oferta Pack)`,
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-4 -translate-y-4">
                        <ShoppingCart size={120} />
                    </div>
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white/80 hover:text-white hover:bg-white/20 rounded-full p-1 transition-colors"
                    >
                        <X size={20} />
                    </button>

                    <div className="mx-auto bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm">
                        <Percent size={32} className="text-white" />
                    </div>

                    <h2 className="text-2xl font-bold mb-2">¡Completa tu Pack!</h2>
                    <p className="text-purple-100 text-sm">
                        Has añadido un vinilo. ¿Quieres protegerlo con su laminado a juego?
                    </p>
                </div>

                <div className="p-6">
                    <div className="flex items-start gap-4 mb-6 bg-slate-50 p-4 rounded-lg border border-slate-100">
                        <div className="flex-1">
                            <h4 className="font-bold text-slate-800 text-sm mb-1">Tu selección:</h4>
                            <p className="text-slate-600 text-sm">{mainProduct.name}</p>
                            {mainProduct.width && mainProduct.length && (
                                <p className="text-xs text-slate-400 mt-1">{mainProduct.width}m x {mainProduct.length}m</p>
                            )}
                        </div>
                        <div className="flex items-center justify-center bg-green-100 text-green-700 w-8 h-8 rounded-full">
                            <Check size={16} />
                        </div>
                    </div>

                    <div className="border-t border-slate-100 pt-6">
                        <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            Laminado Recomendado
                            <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold animate-pulse">
                                -0,05€/m²
                            </span>
                        </h4>

                        <div className="flex flex-col gap-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h5 className="font-bold text-slate-900">{recommendedProduct.name}</h5>
                                    <p className="text-sm text-slate-500 line-clamp-2">{recommendedProduct.description}</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-slate-400 line-through decoration-red-400 decoration-2">
                                        {formatCurrency(originalPricePerM2)}/m²
                                    </div>
                                    <div className="font-bold text-lg text-purple-600">
                                        {formatCurrency(discountedPricePerM2)}/m²
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => onAddRecommendation(discountedProduct)}
                                className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg group"
                            >
                                <ShoppingCart size={18} className="group-hover:animate-bounce" />
                                Añadir Laminado con Descuento
                            </button>

                            <button
                                onClick={onClose}
                                className="w-full text-slate-400 hover:text-slate-600 text-sm font-medium py-2"
                            >
                                No, gracias, solo el vinilo
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
