import React from 'react';
import { CheckCircle, Phone } from 'lucide-react';
import { Order, CartItem } from '../types';

interface OrderSuccessViewProps {
    order: Order | null;
    observations: string;
    formatCurrency: (value: number) => string;
    onReset: () => void;
    userEmail: string;
    salesRepPhone: string;
}

export const OrderSuccessView: React.FC<OrderSuccessViewProps> = ({
    order,
    observations,
    formatCurrency,
    onReset,
    userEmail,
    salesRepPhone
}) => {
    return (
        <div className="p-4 md:p-10 max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[80vh] text-center">
            <div className="h-24 w-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                <CheckCircle size={48} />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">¡Pedido Confirmado!</h1>
            <p className="text-slate-500 mb-8 max-w-md">Hemos enviado un correo electrónico con el detalle de tu pedido a <span className="font-bold text-slate-700">{userEmail}</span></p>

            <div className="w-full bg-white border border-slate-200 rounded-xl p-6 text-left mb-8 shadow-sm">
                <h3 className="font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">Resumen Rápido</h3>
                <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                        <span className="text-slate-500">Referencia Pedido:</span>
                        <span className="font-mono font-bold">#{order?.orderNumber || order?.id.slice(-6)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Total:</span>
                        <span className="font-bold text-slate-900">{formatCurrency(order?.total || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Comercial:</span>
                        <span className="font-bold text-slate-900">{order?.salesRep || 'N/A'}</span>
                    </div>
                    {observations && (
                        <div className="pt-2 mt-2 border-t border-slate-100">
                            <span className="text-slate-500 block mb-1 text-xs uppercase">Observaciones:</span>
                            <p className="text-slate-700 italic bg-slate-50 p-2 rounded">{observations}</p>
                        </div>
                    )}
                </div>
            </div>

            {order?.salesRep && (
                <div className="bg-slate-900 text-white rounded-xl p-6 w-full max-w-md mb-6">
                    <p className="text-slate-400 text-xs uppercase tracking-wider font-bold mb-2">Contacto Comercial</p>
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center">
                            <Phone size={24} />
                        </div>
                        <div className="text-left">
                            <p className="font-bold text-base">{order.salesRep}</p>
                            <p className="text-slate-300">{salesRepPhone}</p>
                        </div>
                    </div>
                </div>
            )}

            <button
                onClick={onReset}
                className="px-8 py-3 bg-white border border-slate-300 text-slate-700 font-bold rounded-lg hover:bg-slate-50 transition-colors"
            >
                Volver al Inicio
            </button>
        </div>
    );
};
