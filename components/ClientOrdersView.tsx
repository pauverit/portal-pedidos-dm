import React from 'react';
import { User, Order, CartItem } from '../types';
import { ShoppingBag } from 'lucide-react';

interface ClientOrdersViewProps {
    currentUser: User | null;
    orders: Order[];
    formatCurrency: (value: number) => string;
}

export const ClientOrdersView: React.FC<ClientOrdersViewProps> = ({
    currentUser,
    orders,
    formatCurrency
}) => {
    const userOrders = orders.filter(o => o.userId === currentUser?.id);

    return (
        <div className="p-6 md:p-10 max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                <ShoppingBag className="text-slate-400" /> Mis Pedidos
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-slate-500 text-xs uppercase font-bold mb-1">Pedidos Totales</p>
                    <p className="text-3xl font-bold text-slate-900">{userOrders.length}</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-slate-500 text-xs uppercase font-bold mb-1">Inversión Total</p>
                    <p className="text-3xl font-bold text-slate-900">
                        {formatCurrency(userOrders.reduce((sum, o) => sum + o.total, 0))}
                    </p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-slate-500 text-xs uppercase font-bold mb-1">Saldo Rappel Acumulado</p>
                    <p className="text-3xl font-bold text-green-600">{formatCurrency(currentUser?.rappelAccumulated || 0)}</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                        <tr>
                            <th className="px-6 py-3">Referencia</th>
                            <th className="px-6 py-3">Fecha</th>
                            <th className="px-6 py-3">Estado</th>
                            <th className="px-6 py-3">Artículos</th>
                            <th className="px-6 py-3 text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {userOrders.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No tienes pedidos registrados aún.</td>
                            </tr>
                        ) : (
                            userOrders.map((order) => (
                                <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 font-mono font-bold text-slate-900">#{order.id.slice(-6)}</td>
                                    <td className="px-6 py-4 text-slate-500">{new Date(order.date).toLocaleDateString()}</td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 rounded text-xs font-bold uppercase bg-blue-100 text-blue-700">
                                            TRAMITADO
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">
                                        {order.items.length} artículos
                                        <div className="text-xs text-slate-400 mt-1 truncate max-w-[200px]">
                                            {order.items.map(i => i.name).join(', ')}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-slate-900">{formatCurrency(order.total)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
