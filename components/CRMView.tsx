import React, { useState } from 'react';
import { X, MapPin, Phone, Calendar, ChevronRight, Clock, User, Plus, Trash2, Target, TrendingUp, ShoppingBag, Search } from 'lucide-react';
import { User as UserType, ClientVisit, ClientCall, Order } from '../types';

interface CRMViewProps {
    currentUser: UserType;
    clients: UserType[];
    visits: ClientVisit[];
    calls: ClientCall[];
    loading: boolean;
    onRefresh: () => void;
    onNewVisit: (clientId?: string) => void;
    onNewCall: (clientId?: string) => void;
    onDeleteVisit: (id: string) => void;
    onDeleteCall: (id: string) => void;
    orders?: Order[];
    formatCurrency?: (value: number) => string;
}

type ActivityItem =
    | { kind: 'visit'; date: string; data: ClientVisit }
    | { kind: 'call'; date: string; data: ClientCall };

const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const CRMView: React.FC<CRMViewProps> = ({
    currentUser, clients, visits, calls, loading, onRefresh, onNewVisit, onNewCall, onDeleteVisit, onDeleteCall,
    orders = [], formatCurrency
}) => {
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
    const [tab, setTab] = useState<'all' | 'visits' | 'calls'>('all');
    const [clientSearch, setClientSearch] = useState('');

    const hasOwnClients = clients.some(c =>
        c.role === 'client' &&
        (c.salesRep === currentUser.name || (currentUser.salesRepCode && c.salesRepCode === currentUser.salesRepCode))
    );
    const myClients = clients.filter(c =>
        c.role === 'client' &&
        (hasOwnClients
            ? (c.salesRep === currentUser.name || c.salesRepCode === currentUser.salesRepCode)
            : true)
    );

    const selectedClient = selectedClientId ? myClients.find(c => c.id === selectedClientId) : null;

    const clientVisits = visits.filter(v => !selectedClientId || v.clientId === selectedClientId);
    const clientCalls = calls.filter(c => !selectedClientId || c.clientId === selectedClientId);

    const activity: ActivityItem[] = [
        ...clientVisits.map(v => ({ kind: 'visit' as const, date: v.visitDate, data: v })),
        ...clientCalls.map(c => ({ kind: 'call' as const, date: c.callDate, data: c })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const filtered = activity.filter(a => tab === 'all' || a.kind === tab.slice(0, -1));

    const getClientName = (id: string) => myClients.find(c => c.id === id)?.name || 'Cliente';

    return (
        <div className="p-4 md:p-10 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">CRM — Seguimiento de Clientes</h1>
                    <p className="text-slate-500 mt-1">Registra visitas y llamadas con tus clientes.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => onNewCall(selectedClientId || undefined)}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-xl font-semibold text-sm transition-colors shadow-sm"
                    >
                        <Phone size={16} />
                        <span>Llamada</span>
                    </button>
                    <button
                        onClick={() => onNewVisit(selectedClientId || undefined)}
                        className="flex items-center gap-2 bg-slate-900 hover:bg-slate-700 text-white px-3 py-2 rounded-xl font-semibold text-sm transition-colors shadow-sm"
                    >
                        <MapPin size={16} />
                        <span>Visita</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {/* Client List Sidebar */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-3 py-2 border-b border-slate-100 bg-slate-50">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Mis Clientes ({myClients.length})</p>
                            <div className="relative">
                                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={clientSearch}
                                    onChange={e => setClientSearch(e.target.value)}
                                    placeholder="Buscar cliente…"
                                    className="w-full pl-7 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                                />
                                {clientSearch && (
                                    <button onClick={() => setClientSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                                        <X size={12} />
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="divide-y divide-slate-50 max-h-[60vh] overflow-y-auto">
                            {/* "All" entry — solo visible sin búsqueda activa */}
                            {!clientSearch && (
                            <button
                                onClick={() => setSelectedClientId(null)}
                                className={`w-full px-3 py-2 flex items-center justify-between text-sm transition-colors ${!selectedClientId ? 'bg-slate-900 text-white' : 'hover:bg-slate-50 text-slate-700'}`}
                            >
                                <div className="flex items-center gap-2">
                                    <User size={14} />
                                    <span className="font-medium">Todos los clientes</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${!selectedClientId ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                        {activity.length}
                                    </span>
                                    <ChevronRight size={14} />
                                </div>
                            </button>
                            )}
                            {myClients.filter(c =>
                                !clientSearch || c.name.toLowerCase().includes(clientSearch.toLowerCase())
                            ).map(client => {
                                const clientActivity = activity.filter(a =>
                                    a.kind === 'visit' ? a.data.clientId === client.id : (a.data as ClientCall).clientId === client.id
                                );
                                const isActive = selectedClientId === client.id;
                                return (
                                    <button
                                        key={client.id}
                                        onClick={() => setSelectedClientId(client.id)}
                                        className={`w-full px-3 py-2 flex items-center justify-between text-sm transition-colors ${isActive ? 'bg-slate-900 text-white' : 'hover:bg-slate-50 text-slate-700'}`}
                                    >
                                        <div className="text-left">
                                            <div className="font-medium truncate max-w-[140px]">{client.name}</div>
                                            {client.delegation && (
                                                <div className={`text-xs truncate ${isActive ? 'text-slate-300' : 'text-slate-400'}`}>{client.delegation}</div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            {clientActivity.length > 0 && (
                                                <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                                    {clientActivity.length}
                                                </span>
                                            )}
                                            <ChevronRight size={14} />
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Activity Feed */}
                <div className="lg:col-span-3">
                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        {[
                            { label: 'Visitas', count: clientVisits.length, icon: MapPin, color: 'bg-emerald-500' },
                            { label: 'Llamadas', count: clientCalls.length, icon: Phone, color: 'bg-blue-500' },
                            { label: 'Total actividad', count: activity.length, icon: Calendar, color: 'bg-indigo-500' },
                        ].map(stat => (
                            <div key={stat.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
                                <div className={`${stat.color} p-2.5 rounded-xl text-white`}>
                                    <stat.icon size={18} />
                                </div>
                                <div>
                                    <p className="text-xl font-black text-slate-900">{stat.count}</p>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">{stat.label}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Context header */}
                    {selectedClient && (
                        <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-5 py-3 mb-4 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-bold text-indigo-900">{selectedClient.name}</p>
                                <p className="text-xs text-indigo-500">{selectedClient.email} · {selectedClient.phone}</p>
                            </div>
                            <button onClick={() => setSelectedClientId(null)} className="text-indigo-400 hover:text-indigo-700"><X size={16} /></button>
                        </div>
                    )}

                    {/* Tab filter */}
                    <div className="flex gap-2 mb-4">
                        {(['all', 'visits', 'calls'] as const).map(t => (
                            <button
                                key={t}
                                onClick={() => setTab(t)}
                                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${tab === t ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-400'}`}
                            >
                                {t === 'all' ? 'Todo' : t === 'visits' ? 'Visitas' : 'Llamadas'}
                            </button>
                        ))}
                    </div>

                    {/* Activity list */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        {loading ? (
                            <div className="flex justify-center py-12">
                                <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-700 rounded-full animate-spin" />
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="py-16 text-center">
                                <Calendar size={40} className="text-slate-200 mx-auto mb-3" />
                                <p className="text-slate-400 text-sm font-medium">No hay actividad registrada</p>
                                <p className="text-slate-300 text-xs mt-1">Añade una visita o llamada para empezar</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-50">
                                {filtered.map((item) => {
                                    const isVisit = item.kind === 'visit';
                                    const visit = isVisit ? item.data as ClientVisit : null;
                                    const call = !isVisit ? item.data as ClientCall : null;
                                    const id = item.data.id;
                                    const clientName = isVisit ? getClientName(visit!.clientId) : getClientName(call!.clientId);
                                    return (
                                        <div key={id} className="px-3 py-2 flex items-start gap-4 hover:bg-slate-50 group transition-colors">
                                            <div className={`mt-0.5 p-2 rounded-xl flex-shrink-0 ${isVisit ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                                                {isVisit ? <MapPin size={16} /> : <Phone size={16} />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-bold text-slate-900 text-sm">{clientName}</span>
                                                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${isVisit ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                                                        {isVisit ? 'Visita' : call?.direction === 'inbound' ? 'Llamada entrada' : 'Llamada salida'}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                                    <Clock size={11} />
                                                    {formatDateTime(item.date)}
                                                </p>
                                                {isVisit && visit?.notes && (
                                                    <p className="text-sm text-slate-600 mt-1.5 leading-snug">{visit.notes}</p>
                                                )}
                                                {!isVisit && call?.summary && (
                                                    <p className="text-sm text-slate-600 mt-1.5 leading-snug">{call.summary}</p>
                                                )}
                                                {isVisit && visit?.nextAction && (
                                                    <div className="flex items-center gap-1.5 mt-2">
                                                        <Target size={12} className="text-orange-500 flex-shrink-0" />
                                                        <p className="text-xs text-orange-600 font-medium">{visit.nextAction}</p>
                                                    </div>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => isVisit ? onDeleteVisit(id) : onDeleteCall(id)}
                                                className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all flex-shrink-0"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Sales stats — secondary, below CRM activity */}
            {formatCurrency && orders.length >= 0 && (() => {
                const now = new Date();
                const myClientIds = new Set(myClients.map(c => c.id));
                const myOrders = orders.filter(o => myClientIds.has(o.userId));
                const monthOrders = myOrders.filter(o => {
                    const d = new Date(o.date);
                    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                });
                const monthSales = monthOrders.reduce((s, o) => s + o.total, 0);
                const ytdSales = myOrders
                    .filter(o => new Date(o.date).getFullYear() === now.getFullYear())
                    .reduce((s, o) => s + o.total, 0);
                return (
                    <div className="mt-2">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Ventas</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {[
                                { label: 'Pedidos este mes', value: monthOrders.length, icon: ShoppingBag, color: 'bg-indigo-500' },
                                { label: 'Ventas este mes', value: formatCurrency(monthSales), icon: TrendingUp, color: 'bg-emerald-500' },
                                { label: `Ventas ${now.getFullYear()}`, value: formatCurrency(ytdSales), icon: TrendingUp, color: 'bg-orange-500' },
                            ].map(s => (
                                <div key={s.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
                                    <div className={`${s.color} p-2.5 rounded-xl text-white`}><s.icon size={18} /></div>
                                    <div>
                                        <p className="text-lg font-black text-slate-900">{s.value}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{s.label}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};
