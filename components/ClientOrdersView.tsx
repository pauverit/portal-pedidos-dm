import React, { useState } from 'react';
import { User, Order } from '../types';
import { ShoppingBag, ChevronLeft, ChevronRight } from 'lucide-react';

interface ClientOrdersViewProps {
    currentUser: User | null;
    orders: Order[];
    formatCurrency: (value: number) => string;
    allUsers?: User[];
}

export const ClientOrdersView: React.FC<ClientOrdersViewProps> = ({
    currentUser,
    orders,
    formatCurrency,
    allUsers = []
}) => {
    const [page, setPage] = useState(0);
    const PAGE_SIZE = 10;

    const STATUS_LABELS: Record<string, { label: string; className: string }> = {
        tramitado: { label: 'Tramitado', className: 'bg-blue-100 text-blue-700' },
        processing: { label: 'En proceso', className: 'bg-amber-100 text-amber-700' },
        completed: { label: 'Completado', className: 'bg-green-100 text-green-700' },
        cancelled: { label: 'Cancelado', className: 'bg-red-100 text-red-700' },
        pending: { label: 'Pendiente', className: 'bg-slate-100 text-slate-600' },
    };

    // For clients, filter to only their orders; for admin/sales orders are pre-filtered by App.tsx
    const userOrders = currentUser?.role === 'client'
        ? orders.filter(o => o.userId === currentUser.id)
        : orders;
    const isManagerView = currentUser?.role === 'admin' || currentUser?.role === 'sales';
    const getUserName = (userId: string) => allUsers.find(u => u.id === userId)?.name || userId.slice(-6);

    const totalPages = Math.ceil(userOrders.length / PAGE_SIZE);
    const pagedOrders = userOrders.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    return (
        <div className="p-4 md:p-10 max-w-7xl mx-auto">
            <h1 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                <ShoppingBag className="text-slate-400" /> Mis Pedidos
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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
                    {!isManagerView ? (
                        <>
                            <p className="text-slate-500 text-xs uppercase font-bold mb-1">Saldo Rappel Acumulado</p>
                            <p className="text-3xl font-bold text-green-600">{formatCurrency(currentUser?.rappelAccumulated || 0)}</p>
                        </>
                    ) : (
                        <>
                            <p className="text-slate-500 text-xs uppercase font-bold mb-1">Ticket Medio</p>
                            <p className="text-3xl font-bold text-slate-900">
                                {userOrders.length > 0
                                    ? formatCurrency(userOrders.reduce((s, o) => s + o.total, 0) / userOrders.length)
                                    : '—'}
                            </p>
                        </>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                        <tr>
                            <th className="px-6 py-3">Referencia</th>
                            {isManagerView && <th className="px-6 py-3">Cliente</th>}
                            <th className="px-6 py-3">Fecha</th>
                            <th className="px-6 py-3">Estado</th>
                            <th className="px-6 py-3">Artículos</th>
                            <th className="px-6 py-3 text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {userOrders.length === 0 ? (
                            <tr>
                                <td colSpan={isManagerView ? 6 : 5} className="px-6 py-8 text-center text-slate-500">No hay pedidos registrados aún.</td>
                            </tr>
                        ) : (
                            pagedOrders.map((order) => {
                                const statusInfo = STATUS_LABELS[order.status] || STATUS_LABELS['tramitado'];
                                return (
                                    <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-3 py-2 font-mono font-bold text-slate-900">#{order.orderNumber || order.id.slice(-6)}</td>
                                        {isManagerView && (
                                            <td className="px-3 py-2 font-medium text-slate-700">{getUserName(order.userId)}</td>
                                        )}
                                        <td className="px-3 py-2 text-slate-500">{new Date(order.date).toLocaleDateString('es-ES')}</td>
                                        <td className="px-3 py-2">
                                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${statusInfo.className}`}>
                                                {statusInfo.label}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 text-slate-600">
                                            {order.items.length} artículos
                                            <div className="text-xs text-slate-400 mt-1 truncate max-w-[200px]">
                                                {order.items.map(i => i.name).join(', ')}
                                            </div>
                                        </td>
                                        <td className="px-3 py-2 text-right font-bold text-slate-900">{formatCurrency(order.total)}</td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 text-sm">
                    <span className="text-slate-500">
                        {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, userOrders.length)} de {userOrders.length} pedidos
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage(p => p - 1)}
                            disabled={page === 0}
                            className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span className="font-medium text-slate-700">{page + 1} / {totalPages}</span>
                        <button
                            onClick={() => setPage(p => p + 1)}
                            disabled={page >= totalPages - 1}
                            className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
