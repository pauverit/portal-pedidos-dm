import React from 'react';
import { ShoppingCart, Plus, Minus, Check, CheckCircle, ArrowLeft, Truck, ShoppingBag } from 'lucide-react';
import { CartItem, User, Order } from '../types';

interface CheckoutViewProps {
    currentUser: User;
    cart: CartItem[];
    onContinueShopping: () => void;
    onUpdateQuantity: (id: string, delta: number) => void;
    onAddToCart: (item: CartItem) => void;
    formatCurrency: (value: number) => string;
    couponCode: string;
    onCouponCodeChange: (code: string) => void;
    appliedCoupon: { code: string; discount: number } | null;
    onApplyCoupon: () => void;
    onRemoveCoupon: () => void;
    activeRep: string | null;
    activeRepPhone: string;
    totalWeight: number;
    shippingMethod: 'agency' | 'own';
    onShippingMethodChange: (method: 'agency' | 'own') => void;
    agencyCost: number;
    observations: string;
    onObservationsChange: (obs: string) => void;
    useAccumulatedRappel: boolean;
    onUseAccumulatedRappelChange: (use: boolean) => void;
    rappelDiscount: number;
    cartTotal: number;
    shippingCost: number;
    tax: number;
    finalTotal: number;
    newRappelGenerated: number;
    onFinalizeOrder: () => void;
}

export const CheckoutView: React.FC<CheckoutViewProps> = ({
    currentUser,
    cart,
    onContinueShopping,
    onUpdateQuantity,
    onAddToCart,
    formatCurrency,
    couponCode,
    onCouponCodeChange,
    appliedCoupon,
    onApplyCoupon,
    onRemoveCoupon,
    activeRep,
    activeRepPhone,
    totalWeight,
    shippingMethod,
    onShippingMethodChange,
    agencyCost,
    observations,
    onObservationsChange,
    useAccumulatedRappel,
    onUseAccumulatedRappelChange,
    rappelDiscount,
    cartTotal,
    shippingCost,
    tax,
    finalTotal,
    newRappelGenerated,
    onFinalizeOrder
}) => {
    const earningThreshold = currentUser.rappelThreshold || 800;
    const redemptionThreshold = earningThreshold * 1.5;
    const canRedeem = cartTotal >= redemptionThreshold;
    const missingForRedemption = redemptionThreshold - cartTotal;

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto w-full pb-32">
            <button onClick={onContinueShopping} className="mb-6 text-slate-500 hover:text-slate-900 flex items-center gap-1 text-sm">
                <ArrowLeft size={16} /> Seguir comprando
            </button>

            <h1 className="text-2xl font-bold text-slate-900 mb-6">Finalizar Pedido</h1>

            <div className="bg-slate-50 rounded-xl p-4 md:p-6 border border-slate-200 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                        <ShoppingCart size={18} />
                        Resumen del Carrito ({cart.length} {cart.length === 1 ? 'producto' : 'productos'})
                    </h3>
                    <button
                        onClick={onContinueShopping}
                        className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 bg-white px-3 py-2 rounded-lg border border-slate-200"
                    >
                        <Plus size={14} />
                        Añadir más productos
                    </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                    {cart.map(item => (
                        <div key={item.id} className="bg-white rounded-lg p-3 flex items-center justify-between border border-slate-100">
                            <div className="flex-1">
                                <p className="text-sm font-bold text-slate-900">{item.name}</p>
                                <p className="text-xs text-slate-500 font-mono flex items-center gap-2">
                                    <span className="text-slate-400 font-normal">{(item.weight || 0) * item.quantity} kg</span>
                                </p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center bg-slate-100 rounded-full px-3 py-1">
                                    <button onClick={() => onUpdateQuantity(item.id, -1)} className="text-slate-600 hover:text-slate-900 w-5 h-5 flex items-center justify-center">
                                        <Minus size={12} />
                                    </button>
                                    <span className="mx-2 font-bold text-sm min-w-[20px] text-center">{item.quantity}</span>
                                    <button onClick={() => onAddToCart(item)} className="text-slate-600 hover:text-slate-900 w-5 h-5 flex items-center justify-center">
                                        <Plus size={12} />
                                    </button>
                                </div>
                                {!currentUser.hidePrices && (
                                    <span className="font-bold text-slate-900 text-sm min-w-[80px] text-right">
                                        {formatCurrency(item.calculatedPrice * item.quantity)}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-6">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-xs">1</div>
                    Cupones y Descuentos
                </h3>
                <div className="flex gap-3">
                    <input
                        type="text"
                        placeholder="Código Promocional (Opcional)"
                        value={couponCode}
                        onChange={(e) => onCouponCodeChange(e.target.value)}
                        disabled={!!appliedCoupon}
                        className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none uppercase text-slate-900"
                    />
                    {!appliedCoupon ? (
                        <button onClick={onApplyCoupon} className="bg-slate-900 text-white px-6 font-bold rounded-lg hover:bg-slate-800">
                            Aplicar
                        </button>
                    ) : (
                        <button onClick={onRemoveCoupon} className="bg-green-100 text-green-700 px-6 font-bold rounded-lg flex items-center gap-2">
                            <Check size={18} /> {appliedCoupon.code}
                        </button>
                    )}
                </div>
                {appliedCoupon && <p className="text-green-600 text-sm mt-2 font-bold">Descuento aplicado: -{formatCurrency(appliedCoupon.discount)}</p>}
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 flex items-center justify-between">
                <div>
                    <p className="text-xs font-bold text-blue-800 uppercase">Comercial Asignado</p>
                    <p className="text-blue-900 font-bold text-lg">{activeRep || 'Sin asignar'}</p>
                </div>
                {activeRep && <div className="bg-white px-3 py-1 rounded text-blue-900 font-mono text-sm">{activeRepPhone}</div>}
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-6">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-xs">2</div>
                    Método de Envío
                </h3>

                <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-700 uppercase">Peso Total del Pedido</span>
                        <span className="font-bold text-slate-900">{totalWeight.toFixed(2)} kg</span>
                    </div>
                    {totalWeight > 25 && (
                        <p className="text-xs text-orange-600 mt-1">
                            ⚠️ Este pedido supera los 25kg, no aplica envío gratuito.
                        </p>
                    )}
                </div>

                <div className="space-y-3">
                    <label className="block relative cursor-pointer">
                        <input type="radio" name="shipping" checked={shippingMethod === 'agency'} onChange={() => onShippingMethodChange('agency')} className="peer sr-only" />
                        <div className="p-4 rounded-xl border border-slate-200 bg-white peer-checked:border-slate-900 peer-checked:bg-slate-50 transition-all flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Truck className="text-slate-400" size={24} />
                                <div>
                                    <p className="font-bold text-slate-900 text-sm">ENVÍO POR AGENCIA 24H</p>
                                    {cartTotal > 400 && totalWeight <= 25 && (
                                        <p className="text-xs text-green-600 font-bold mt-1">✓ Envío GRATIS (Pedido &gt; 400€ y ≤25kg)</p>
                                    )}
                                </div>
                            </div>
                            <span className={`font-bold text-sm ${agencyCost === 0 ? 'text-green-600' : 'text-slate-900'}`}>
                                {agencyCost === 0 ? 'GRATIS' : `+ ${formatCurrency(agencyCost)}`}
                            </span>
                        </div>
                    </label>
                    <label className="block relative cursor-pointer">
                        <input type="radio" name="shipping" checked={shippingMethod === 'own'} onChange={() => onShippingMethodChange('own')} className="peer sr-only" />
                        <div className="p-4 rounded-xl border border-slate-200 bg-white peer-checked:border-slate-900 peer-checked:bg-slate-50 transition-all flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Truck className="text-slate-400" size={24} />
                                <div>
                                    <p className="font-bold text-slate-900 text-sm">REPARTO PROPIO</p>
                                    <p className="text-xs text-slate-500">Próxima ruta programada</p>
                                </div>
                            </div>
                            <span className="font-bold text-green-600 text-sm">GRATIS</span>
                        </div>
                    </label>
                </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-6">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-xs">3</div>
                    Observaciones
                </h3>
                <textarea
                    value={observations}
                    onChange={(e) => onObservationsChange(e.target.value)}
                    placeholder="Indica aquí si necesitas algo extra..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none text-slate-900 h-24 resize-none"
                />
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-100 space-y-4 mb-12">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-xs">4</div>
                    Resumen Económico
                </h3>

                {currentUser.hidePrices ? (
                    <div className="bg-slate-50 p-6 text-center border border-slate-200 rounded-lg">
                        <p className="font-bold text-slate-900 mb-2">Precios Ocultos</p>
                        <p className="text-sm text-slate-500">Internal management pricing applies.</p>
                    </div>
                ) : (
                    <>
                        {appliedCoupon?.code === 'RAPPEL3' && (
                            <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg flex justify-between items-center text-blue-800 text-sm">
                                <span className="font-medium">Beneficio generado (3%):</span>
                                <span className="font-bold">+{formatCurrency(newRappelGenerated)}</span>
                            </div>
                        )}

                        {currentUser.rappelAccumulated > 0 && (
                            <div className="border-t border-slate-100 pt-4">
                                {canRedeem ? (
                                    <label className="flex items-center justify-between cursor-pointer p-2 hover:bg-slate-50 rounded select-none">
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                checked={useAccumulatedRappel}
                                                onChange={(e) => onUseAccumulatedRappelChange(e.target.checked)}
                                                className="w-5 h-5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                                            />
                                            <div>
                                                <p className="text-sm font-bold text-slate-700">Canjear saldo acumulado</p>
                                                <p className="text-xs text-slate-500">Disponible: {formatCurrency(currentUser.rappelAccumulated)}</p>
                                            </div>
                                        </div>
                                        {useAccumulatedRappel && <span className="text-green-600 font-bold">-{formatCurrency(rappelDiscount)}</span>}
                                    </label>
                                ) : (
                                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-500">
                                        <div className="flex justify-between items-center mb-1">
                                            <p className="text-xs font-bold text-slate-700 uppercase">Saldo Rappel Disponible</p>
                                            <span className="font-bold text-slate-900">{formatCurrency(currentUser.rappelAccumulated)}</span>
                                        </div>
                                        <p className="text-xs">
                                            Pedido mínimo para canje: <strong>{formatCurrency(redemptionThreshold)}</strong>.
                                            Faltan: {formatCurrency(missingForRedemption)}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="h-px bg-slate-200 my-2"></div>

                        <div className="space-y-2">
                            <div className="flex justify-between text-sm text-slate-500"><span>Subtotal Productos</span> <span>{formatCurrency(cartTotal)}</span></div>
                            {shippingCost > 0 && <div className="flex justify-between text-sm text-slate-500"><span>Envío</span> <span>{formatCurrency(shippingCost)}</span></div>}
                            {useAccumulatedRappel && <div className="flex justify-between text-sm text-green-600 font-medium"><span>Descuento Rappel</span> <span>-{formatCurrency(rappelDiscount)}</span></div>}
                            <div className="flex justify-between text-sm text-slate-500"><span>IVA (21%)</span> <span>{formatCurrency(tax)}</span></div>
                        </div>

                        <div className="h-px bg-slate-900 my-2"></div>
                        <div className="flex justify-between items-end">
                            <span className="font-bold text-slate-900">TOTAL A PAGAR</span>
                            <span className="text-3xl font-black text-slate-900">{formatCurrency(finalTotal)}</span>
                        </div>
                    </>
                )}
            </div>

            {/* Aumentamos el padding inferior del contenedor principal y el margen del resumen para asegurar visibilidad */}
            <div className="h-40"></div>

            <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-white/80 backdrop-blur-md border-t border-slate-200 p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-40">
                <div className="max-w-3xl mx-auto">
                    <button
                        onClick={onFinalizeOrder}
                        disabled={cart.length === 0}
                        className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                    >
                        CONFIRMAR PEDIDO <CheckCircle size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};
