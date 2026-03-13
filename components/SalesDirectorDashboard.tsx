import React, { useState, useEffect } from 'react';
import { Users, ShoppingBag, TrendingUp, MapPin, Phone, ChevronDown, ChevronUp, Calendar, AlertCircle } from 'lucide-react';
import { User, Order } from '../types';
import { supabase } from '../lib/supabase';

interface SalesDirectorDashboardProps {
    salesReps: User[];
    clients: User[];
    orders: Order[];
    formatCurrency: (value: number) => string;
}

const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

interface RepActivity {
    repId: string;
    visitsThisMonth: number;
    callsThisMonth: number;
    visitsTotal: number;
    callsTotal: number;
}

export const SalesDirectorDashboard: React.FC<SalesDirectorDashboardProps> = ({
    salesReps, clients, orders, formatCurrency
}) => {
    const now = new Date();
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
    const [selectedYear, setSelectedYear] = useState(now.getFullYear());
    const [expandedRep, setExpandedRep] = useState<string | null>(null);
    const [activity, setActivity] = useState<RepActivity[]>([]);
    const [loadingCRM, setLoadingCRM] = useState(true);

    const isCurrentMonth = selectedMonth === now.getMonth() && selectedYear === now.getFullYear();

    // Load all CRM activity for all sales reps
    useEffect(() => {
        const load = async () => {
            setLoadingCRM(true);
            try {
                const [visitsRes, callsRes] = await Promise.all([
                    supabase.from('client_visits').select('sales_rep_id, visit_date'),
                    supabase.from('client_calls').select('sales_rep_id, call_date'),
                ]);
                const visits = visitsRes.data || [];
                const calls = callsRes.data || [];

                const monthStart = new Date(selectedYear, selectedMonth, 1);
                const monthEnd = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);

                const repMap: Record<string, RepActivity> = {};
                salesReps.forEach(r => {
                    repMap[r.id] = { repId: r.id, visitsThisMonth: 0, callsThisMonth: 0, visitsTotal: 0, callsTotal: 0 };
                });

                visits.forEach(v => {
                    if (!repMap[v.sales_rep_id]) return;
                    repMap[v.sales_rep_id].visitsTotal++;
                    const d = new Date(v.visit_date);
                    if (d >= monthStart && d <= monthEnd) repMap[v.sales_rep_id].visitsThisMonth++;
                });
                calls.forEach(c => {
                    if (!repMap[c.sales_rep_id]) return;
                    repMap[c.sales_rep_id].callsTotal++;
                    const d = new Date(c.call_date);
                    if (d >= monthStart && d <= monthEnd) repMap[c.sales_rep_id].callsThisMonth++;
                });

                setActivity(Object.values(repMap));
            } finally {
                setLoadingCRM(false);
            }
        };
        load();
    }, [selectedMonth, selectedYear, salesReps]);

    const allClients = clients.filter(c => c.role === 'client');
    const totalMonthSales = orders
        .filter(o => {
            const d = new Date(o.date);
            return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
        })
        .reduce((s, o) => s + o.total, 0);

    const getRepStats = (rep: User) => {
        const repClients = allClients.filter(c =>
            c.salesRep === rep.name || c.salesRepCode === rep.salesRepCode
        );
        const repClientIds = new Set(repClients.map(c => c.id));
        const repOrders = orders.filter(o => repClientIds.has(o.userId));

        const monthOrders = repOrders.filter(o => {
            const d = new Date(o.date);
            return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
        });
        const monthSales = monthOrders.reduce((s, o) => s + o.total, 0);

        const ytdSales = repOrders
            .filter(o => new Date(o.date).getFullYear() === selectedYear)
            .reduce((s, o) => s + o.total, 0);

        const crm = activity.find(a => a.repId === rep.id);

        return {
            clients: repClients.length,
            monthOrders: monthOrders.length,
            monthSales,
            ytdSales,
            visitsMonth: crm?.visitsThisMonth ?? 0,
            callsMonth: crm?.callsThisMonth ?? 0,
            activityMonth: (crm?.visitsThisMonth ?? 0) + (crm?.callsThisMonth ?? 0),
            recentOrders: monthOrders.slice(0, 5).map(o => ({
                ...o,
                clientName: repClients.find(c => c.id === o.userId)?.name || 'Cliente',
            })),
        };
    };

    // Global totals
    const totalClients = allClients.length;
    const totalOrders = orders.filter(o => {
        const d = new Date(o.date);
        return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    }).length;
    const totalActivity = activity.reduce((s, a) => s + a.visitsThisMonth + a.callsThisMonth, 0);

    const goToPrev = () => {
        if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y - 1); }
        else setSelectedMonth(m => m - 1);
    };
    const goToNext = () => {
        if (isCurrentMonth) return;
        if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y + 1); }
        else setSelectedMonth(m => m + 1);
    };

    return (
        <div className="p-4 md:p-10 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Dashboard Comercial</h1>
                <p className="text-slate-500 mt-1">Actividad y ventas del equipo de comerciales.</p>
            </div>

            {/* Month selector */}
            <div className="flex items-center gap-4">
                <button onClick={goToPrev} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600">
                    <ChevronDown size={18} className="rotate-90" />
                </button>
                <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-slate-400" />
                    <span className="font-bold text-slate-900 text-base">{MONTH_NAMES[selectedMonth]} {selectedYear}</span>
                    {isCurrentMonth && (
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Actual</span>
                    )}
                </div>
                <button onClick={goToNext} disabled={isCurrentMonth} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 disabled:opacity-30">
                    <ChevronDown size={18} className="-rotate-90" />
                </button>
            </div>

            {/* Global summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: 'Total clientes', value: totalClients, icon: Users, color: 'bg-blue-500' },
                    { label: 'Ventas del mes', value: formatCurrency(totalMonthSales), icon: TrendingUp, color: 'bg-emerald-500' },
                    { label: 'Pedidos del mes', value: totalOrders, icon: ShoppingBag, color: 'bg-indigo-500' },
                    { label: 'Acciones CRM', value: loadingCRM ? '…' : totalActivity, icon: Calendar, color: 'bg-orange-500' },
                ].map(s => (
                    <div key={s.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
                        <div className={`${s.color} p-2.5 rounded-xl text-white`}><s.icon size={20} /></div>
                        <div>
                            <p className="text-xl font-black text-slate-900">{s.value}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{s.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Reps breakdown */}
            <div className="space-y-3">
                <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Por Comercial</h2>
                {salesReps.map(rep => {
                    const s = getRepStats(rep);
                    const isExpanded = expandedRep === rep.id;
                    const noActivity = s.activityMonth === 0 && s.monthOrders === 0;

                    return (
                        <div key={rep.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                            {/* Rep header row */}
                            <button
                                className="w-full px-5 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors"
                                onClick={() => setExpandedRep(isExpanded ? null : rep.id)}
                            >
                                {/* Avatar */}
                                <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm shrink-0">
                                    {rep.name.charAt(0).toUpperCase()}
                                </div>

                                {/* Name */}
                                <div className="flex-1 text-left">
                                    <p className="font-bold text-slate-900">{rep.name}</p>
                                    <p className="text-xs text-slate-400">@{rep.username} · {s.clients} clientes</p>
                                </div>

                                {/* Stats pills */}
                                <div className="hidden sm:flex items-center gap-3 text-sm">
                                    <span className="flex items-center gap-1 text-emerald-700 font-bold">
                                        <MapPin size={13} /> {s.visitsMonth}
                                    </span>
                                    <span className="flex items-center gap-1 text-blue-700 font-bold">
                                        <Phone size={13} /> {s.callsMonth}
                                    </span>
                                    <span className="flex items-center gap-1 text-indigo-700 font-bold">
                                        <ShoppingBag size={13} /> {s.monthOrders}
                                    </span>
                                    <span className="font-black text-slate-900 min-w-[80px] text-right">
                                        {formatCurrency(s.monthSales)}
                                    </span>
                                </div>

                                {noActivity && !loadingCRM && (
                                    <AlertCircle size={16} className="text-amber-400" title="Sin actividad este mes" />
                                )}

                                {isExpanded ? <ChevronUp size={16} className="text-slate-400 shrink-0" /> : <ChevronDown size={16} className="text-slate-400 shrink-0" />}
                            </button>

                            {/* Expanded detail */}
                            {isExpanded && (
                                <div className="border-t border-slate-100 px-5 py-4 bg-slate-50 space-y-4">
                                    {/* Mini stats */}
                                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                        {[
                                            { label: 'Clientes', val: s.clients, icon: Users, color: 'text-blue-600' },
                                            { label: 'Visitas mes', val: s.visitsMonth, icon: MapPin, color: 'text-emerald-600' },
                                            { label: 'Llamadas mes', val: s.callsMonth, icon: Phone, color: 'text-sky-600' },
                                            { label: 'Pedidos mes', val: s.monthOrders, icon: ShoppingBag, color: 'text-indigo-600' },
                                            { label: `Ventas ${selectedYear}`, val: formatCurrency(s.ytdSales), icon: TrendingUp, color: 'text-orange-600' },
                                        ].map(m => (
                                            <div key={m.label} className="bg-white rounded-xl border border-slate-100 p-3 text-center">
                                                <m.icon size={14} className={`${m.color} mx-auto mb-1`} />
                                                <p className="font-black text-slate-900 text-base leading-none">{m.val}</p>
                                                <p className="text-[10px] text-slate-400 uppercase font-bold mt-0.5">{m.label}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Recent orders */}
                                    {s.recentOrders.length > 0 && (
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase mb-2">Pedidos recientes del mes</p>
                                            <div className="space-y-1.5">
                                                {s.recentOrders.map(o => (
                                                    <div key={o.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-slate-100 text-sm">
                                                        <span className="font-medium text-slate-700 truncate max-w-[60%]">{o.clientName}</span>
                                                        <span className="font-bold text-slate-900">{formatCurrency(o.total)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {s.recentOrders.length === 0 && (
                                        <p className="text-sm text-slate-400 text-center py-2">Sin pedidos este mes</p>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
