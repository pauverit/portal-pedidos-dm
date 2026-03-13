import React, { useState } from 'react';
import { Users, ShoppingBag, TrendingUp, ChevronRight, ChevronLeft, Calendar, UserPlus, ContactRound, Receipt } from 'lucide-react';
import { User, Order } from '../types';

interface SalesDashboardProps {
    currentUser: User;
    clients: User[];
    orders: Order[];
    onNavigate: (view: string) => void;
    formatCurrency: (value: number) => string;
}

const MONTH_NAMES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export const SalesDashboard: React.FC<SalesDashboardProps> = ({
    currentUser,
    clients,
    orders,
    onNavigate,
    formatCurrency
}) => {
    const now = new Date();
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
    const [selectedYear, setSelectedYear] = useState(now.getFullYear());

    // Filter clients assigned to this sales rep
    const myClients = clients.filter(c =>
        c.role === 'client' &&
        (c.salesRep === currentUser.name || c.salesRepCode === currentUser.salesRepCode)
    );
    const myClientIds = new Set(myClients.map(c => c.id));
    const myOrders = orders.filter(o => myClientIds.has(o.userId));

    // Monthly filter
    const monthOrders = myOrders.filter(o => {
        const d = new Date(o.date);
        return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });

    const monthTotal = monthOrders.reduce((s, o) => s + o.total, 0);

    // 1. Commission rate (5% as agreed in plan)
    const COMMISSION_RATE = 0.05;

    // 2. Year-to-Date (YTD) Sales
    const currentYear = now.getFullYear();
    const ytdSales = myOrders
        .filter(o => new Date(o.date).getFullYear() === currentYear)
        .reduce((sum, o) => sum + o.total, 0);

    // 3. Current Month Commission
    const currentMonthComm = monthTotal * COMMISSION_RATE;

    // 4. Same Month Previous Year — for billing comparison
    const lastYearMonthOrders = myOrders.filter(o => {
        const d = new Date(o.date);
        return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear - 1;
    });
    const lastYearMonthTotal = lastYearMonthOrders.reduce((s, o) => s + o.total, 0);

    // Current month label
    const isCurrentMonth = selectedMonth === now.getMonth() && selectedYear === now.getFullYear();

    const goToPrevMonth = () => {
        if (selectedMonth === 0) {
            setSelectedMonth(11);
            setSelectedYear(y => y - 1);
        } else {
            setSelectedMonth(m => m - 1);
        }
    };
    const goToNextMonth = () => {
        const nextIsAfterNow =
            selectedYear > now.getFullYear() ||
            (selectedYear === now.getFullYear() && selectedMonth >= now.getMonth());
        if (nextIsAfterNow) return;
        if (selectedMonth === 11) {
            setSelectedMonth(0);
            setSelectedYear(y => y + 1);
        } else {
            setSelectedMonth(m => m + 1);
        }
    };



    const stats = [
        { label: 'Mis Clientes', value: myClients.length, icon: Users, color: 'bg-blue-500' },
        { label: 'Pedidos Totales', value: myOrders.length, icon: ShoppingBag, color: 'bg-emerald-500' },
        { label: `Ventas ${currentYear}`, value: formatCurrency(ytdSales), icon: TrendingUp, color: 'bg-indigo-500' },
        { label: `Comisión ${MONTH_NAMES[selectedMonth]}`, value: formatCurrency(currentMonthComm), icon: TrendingUp, color: 'bg-orange-500' },
    ];

    return (
        <div className="p-4 md:p-10 max-w-7xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Bienvenido, {currentUser.name}</h1>
                <p className="text-slate-500 mt-1">Resumen de tu actividad comercial.</p>
            </div>

            {/* Global Stats - Simplified for maximum impact */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
                        <div className={`${stat.color} p-4 rounded-xl text-white shadow-lg shadow-${stat.color.split('-')[1]}-200`}>
                            <stat.icon size={28} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{stat.label}</p>
                            <p className="text-3xl font-black text-slate-900">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Monthly Orders Panel */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                {/* Month Navigator */}
                <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <button
                        onClick={goToPrevMonth}
                        className="p-2 rounded-lg hover:bg-slate-200 transition-colors text-slate-600"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <div className="flex items-center gap-3">
                        <Calendar size={18} className="text-slate-400" />
                        <h2 className="font-bold text-slate-900 text-base">
                            {MONTH_NAMES[selectedMonth]} {selectedYear}
                        </h2>
                        {isCurrentMonth && (
                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                                Mes actual
                            </span>
                        )}
                    </div>
                    <button
                        onClick={goToNextMonth}
                        disabled={isCurrentMonth}
                        className="p-2 rounded-lg hover:bg-slate-200 transition-colors text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>

                {/* Month Summary Bar */}
                <div className="px-4 py-4 flex flex-wrap items-center gap-x-12 gap-y-6 border-b border-slate-100 bg-white">
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Pedidos del mes</p>
                        <p className="text-3xl font-black text-slate-900">{monthOrders.length}</p>
                    </div>
                    <div className="hidden md:block h-12 w-px bg-slate-100" />
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Facturación del mes</p>
                        <p className="text-3xl font-black text-emerald-600 leading-none">{formatCurrency(monthTotal)}</p>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Mismo mes {selectedYear - 1}</p>
                        <p className="text-3xl font-black text-slate-300 leading-none">{formatCurrency(lastYearMonthTotal)}</p>
                    </div>
                </div>

                {/* Order List for Month */}
                <div className="divide-y divide-slate-50">
                    {monthOrders.length === 0 ? (
                        <div className="px-6 py-10 text-center text-slate-400">
                            No hay pedidos en {MONTH_NAMES[selectedMonth]} {selectedYear}.
                        </div>
                    ) : (
                        monthOrders.map(order => {
                            const client = myClients.find(c => c.id === order.userId);
                            const statusLabels: Record<string, { label: string; className: string }> = {
                                tramitado: { label: 'Tramitado', className: 'bg-blue-100 text-blue-700' },
                                processing: { label: 'En proceso', className: 'bg-amber-100 text-amber-700' },
                                completed: { label: 'Completado', className: 'bg-green-100 text-green-700' },
                                cancelled: { label: 'Cancelado', className: 'bg-red-100 text-red-700' },
                                pending: { label: 'Pendiente', className: 'bg-slate-100 text-slate-600' },
                            };
                            const statusInfo = statusLabels[order.status] || statusLabels['tramitado'];
                            return (
                                <div key={order.id} className="px-3 py-2 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                    <div>
                                        <p className="font-bold text-slate-900">{client?.name || 'Cliente Desconocido'}</p>
                                        <p className="text-xs text-slate-500">{new Date(order.date).toLocaleDateString('es-ES')}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-slate-900">{formatCurrency(order.total)}</p>
                                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${statusInfo.className}`}>
                                            {statusInfo.label}
                                        </span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-lg">
                <h2 className="text-lg font-bold mb-4">Acciones Rápidas</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <button
                        onClick={() => onNavigate('admin_new_client')}
                        className="bg-white/10 hover:bg-white/20 p-4 rounded-xl flex flex-col items-center gap-2 transition-colors border border-white/10"
                    >
                        <UserPlus size={24} />
                        <span className="text-sm font-medium">Nuevo Cliente</span>
                    </button>
                    <button
                        onClick={() => onNavigate('admin_client_list')}
                        className="bg-white/10 hover:bg-white/20 p-4 rounded-xl flex flex-col items-center gap-2 transition-colors border border-white/10"
                    >
                        <Users size={24} />
                        <span className="text-sm font-medium">Mis Clientes</span>
                    </button>
                    <button
                        onClick={() => onNavigate('crm')}
                        className="bg-white/10 hover:bg-white/20 p-4 rounded-xl flex flex-col items-center gap-2 transition-colors border border-white/10"
                    >
                        <ContactRound size={24} />
                        <span className="text-sm font-medium">CRM</span>
                    </button>
                    <button
                        onClick={() => onNavigate('expenses')}
                        className="bg-white/10 hover:bg-white/20 p-4 rounded-xl flex flex-col items-center gap-2 transition-colors border border-white/10"
                    >
                        <Receipt size={24} />
                        <span className="text-sm font-medium">Gastos</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
