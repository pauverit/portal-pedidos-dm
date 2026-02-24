import React from 'react';
import { Users, ShoppingBag, TrendingUp, ChevronRight } from 'lucide-react';
import { User, Order } from '../types';

interface SalesDashboardProps {
    currentUser: User;
    clients: User[];
    orders: Order[];
    onNavigate: (view: string) => void;
    formatCurrency: (value: number) => string;
}

export const SalesDashboard: React.FC<SalesDashboardProps> = ({
    currentUser,
    clients,
    orders,
    onNavigate,
    formatCurrency
}) => {
    // Filter clients assigned to this sales rep
    // We use both name match (legacy) and code match (new)
    const myClients = clients.filter(c =>
        c.role === 'client' &&
        (c.salesRep === currentUser.name || c.salesRepCode === currentUser.salesRepCode)
    );

    const myClientIds = new Set(myClients.map(c => c.id));
    const myOrders = orders.filter(o => myClientIds.has(o.userId));

    const totalSales = myOrders.reduce((sum, o) => sum + o.total, 0);
    const totalRappel = myClients.reduce((sum, c) => sum + (c.rappelAccumulated || 0), 0);

    const stats = [
        { label: 'Mis Clientes', value: myClients.length, icon: Users, color: 'bg-blue-500' },
        { label: 'Pedidos Totales', value: myOrders.length, icon: ShoppingBag, color: 'bg-emerald-500' },
        { label: 'Ventas Totales', value: formatCurrency(totalSales), icon: TrendingUp, color: 'bg-indigo-500' },
        { label: 'Rappels Acumulados', value: formatCurrency(totalRappel), icon: TrendingUp, color: 'bg-purple-500' },
    ];

    return (
        <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Bienvenido, {currentUser.name}</h1>
                <p className="text-slate-500 mt-1">Aquí tienes un resumen de tu actividad comercial.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                        <div className={`${stat.color} p-3 rounded-xl text-white`}>
                            <stat.icon size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Orders */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                        <h2 className="font-bold text-slate-900">Últimos Pedidos de Mis Clientes</h2>
                        <button
                            onClick={() => onNavigate('client_orders')}
                            className="text-sm text-slate-500 hover:text-slate-900 flex items-center gap-1"
                        >
                            Ver todos <ChevronRight size={14} />
                        </button>
                    </div>
                    <div className="divide-y divide-slate-50">
                        {myOrders.slice(0, 5).map(order => {
                            const client = myClients.find(c => c.id === order.userId);
                            return (
                                <div key={order.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                    <div>
                                        <p className="font-bold text-slate-900">{client?.name || 'Cliente Desconocido'}</p>
                                        <p className="text-xs text-slate-500">{new Date(order.date).toLocaleDateString('es-ES')}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-slate-900">{formatCurrency(order.total)}</p>
                                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                                            {order.status}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                        {myOrders.length === 0 && (
                            <div className="px-6 py-10 text-center text-slate-400">
                                Aún no hay pedidos de tus clientes.
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="space-y-6">
                    <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-lg">
                        <h2 className="text-xl font-bold mb-4">Acciones Rápidas</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <button
                                onClick={() => onNavigate('admin_new_client')}
                                className="bg-white/10 hover:bg-white/20 p-4 rounded-xl flex flex-col items-center gap-2 transition-colors border border-white/10"
                            >
                                <Users size={24} />
                                <span className="text-sm font-medium">Nuevo Cliente</span>
                            </button>
                            <button
                                onClick={() => onNavigate('admin_client_list')}
                                className="bg-white/10 hover:bg-white/20 p-4 rounded-xl flex flex-col items-center gap-2 transition-colors border border-white/10"
                            >
                                <Users size={24} />
                                <span className="text-sm font-medium">Mis Clientes</span>
                            </button>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                        <h2 className="font-bold text-slate-900 mb-4">Recordatorio</h2>
                        <p className="text-sm text-slate-600 leading-relaxed">
                            Recuerda que todos los pedidos realizados a través del portal generan rappel automático para el cliente si superan el umbral configurado.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
