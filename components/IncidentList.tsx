import React, { useState } from 'react';
import {
    Plus, Search, Filter, AlertTriangle, Clock, CheckCircle,
    ChevronRight, Calendar, User, Wrench, RefreshCw
} from 'lucide-react';
import { Incident, IncidentStatus, IncidentSeverity, User as UserType } from '../types';

interface IncidentListProps {
    incidents: Incident[];
    loading: boolean;
    currentUser: UserType;
    technicians: UserType[];
    clients: UserType[];
    onRefresh: () => void;
    onNewIncident: () => void;
    onViewIncident: (incident: Incident) => void;
}

const STATUS_CONFIG: Record<IncidentStatus, { label: string; color: string; icon: React.FC<any> }> = {
    pending: { label: 'Pendiente', color: 'bg-orange-100 text-orange-700 border border-orange-200', icon: Clock },
    in_progress: { label: 'En curso', color: 'bg-blue-100 text-blue-700 border border-blue-200', icon: AlertTriangle },
    closed: { label: 'Cerrada', color: 'bg-emerald-100 text-emerald-700 border border-emerald-200', icon: CheckCircle },
};

const SEVERITY_DOT: Record<IncidentSeverity, string> = {
    low: 'bg-slate-400',
    normal: 'bg-blue-500',
    high: 'bg-orange-500',
    urgent: 'bg-red-500',
};

const DATE_RANGES = [
    { label: 'Último mes', days: 30 },
    { label: 'Últimos 3 meses', days: 90 },
    { label: 'Últimos 6 meses', days: 180 },
    { label: 'Este año', days: 365 },
    { label: 'Todo', days: 0 },
];

export const IncidentList: React.FC<IncidentListProps> = ({
    incidents, loading, currentUser, technicians, clients,
    onRefresh, onNewIncident, onViewIncident
}) => {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<IncidentStatus | 'all'>('all');
    const [techFilter, setTechFilter] = useState('all');
    const [dateRange, setDateRange] = useState(180); // days
    const isTechLead = currentUser.role === 'tech_lead' || currentUser.role === 'admin';

    const formatDate = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
            + ' ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    };

    const filtered = incidents.filter(inc => {
        if (statusFilter !== 'all' && inc.status !== statusFilter) return false;
        if (techFilter !== 'all' && inc.assignedTo !== techFilter) return false;
        if (dateRange > 0) {
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - dateRange);
            if (new Date(inc.createdAt) < cutoff) return false;
        }
        if (search) {
            const q = search.toLowerCase();
            return (
                inc.reference.toLowerCase().includes(q) ||
                (inc.clientName || '').toLowerCase().includes(q) ||
                inc.description.toLowerCase().includes(q) ||
                (inc.assignedToName || '').toLowerCase().includes(q)
            );
        }
        return true;
    });

    const counts = {
        all: incidents.length,
        pending: incidents.filter(i => i.status === 'pending').length,
        in_progress: incidents.filter(i => i.status === 'in_progress').length,
        closed: incidents.filter(i => i.status === 'closed').length,
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-4">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-black text-slate-900">Incidencias</h1>
                    <p className="text-slate-400 text-sm mt-0.5">{filtered.length} de {incidents.length} incidencias</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onRefresh}
                        className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                        title="Actualizar"
                    >
                        <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button
                        onClick={onNewIncident}
                        className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-700 transition-colors"
                    >
                        <Plus size={16} />
                        Nueva Incidencia
                    </button>
                </div>
            </div>

            {/* Status tabs */}
            <div className="flex flex-wrap gap-2">
                {([['all', 'Todas'], ['pending', 'Pendiente'], ['in_progress', 'En curso'], ['closed', 'Cerrada']] as const).map(([val, lbl]) => (
                    <button
                        key={val}
                        onClick={() => setStatusFilter(val as any)}
                        className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${statusFilter === val
                                ? 'bg-slate-900 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                    >
                        {lbl} <span className="ml-1 opacity-70">({counts[val] ?? 0})</span>
                    </button>
                ))}
            </div>

            {/* Filters bar */}
            <div className="flex flex-wrap gap-3 items-center">
                {/* Search */}
                <div className="relative flex-1 min-w-52">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                        placeholder="Buscar por referencia, cliente, descripción…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                {/* Date range */}
                <select
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                    value={dateRange}
                    onChange={e => setDateRange(Number(e.target.value))}
                >
                    {DATE_RANGES.map(r => (
                        <option key={r.days} value={r.days}>{r.label}</option>
                    ))}
                </select>
                {/* Tech filter — only for tech_lead/admin */}
                {isTechLead && technicians.length > 0 && (
                    <select
                        className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                        value={techFilter}
                        onChange={e => setTechFilter(e.target.value)}
                    >
                        <option value="all">Todos los técnicos</option>
                        {technicians.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                )}
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {/* Table header */}
                <div className="hidden md:grid grid-cols-[120px_1fr_1fr_140px_1fr_1fr_100px] gap-3 px-5 py-3 bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <div>Referencia</div>
                    <div>Cliente</div>
                    <div>Descripción</div>
                    <div>Estado</div>
                    <div>Asignado a</div>
                    <div>Fecha</div>
                    <div></div>
                </div>

                {loading ? (
                    <div className="py-16 text-center text-slate-400">
                        <RefreshCw size={24} className="animate-spin mx-auto mb-3 opacity-40" />
                        Cargando incidencias…
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="py-16 text-center text-slate-400">
                        <AlertTriangle size={28} className="mx-auto mb-3 opacity-30" />
                        <p className="font-medium">No hay incidencias</p>
                        <p className="text-sm mt-1">Prueba a cambiar los filtros o crea una nueva</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {filtered.map(inc => {
                            const st = STATUS_CONFIG[inc.status];
                            const StatusIcon = st.icon;
                            return (
                                <button
                                    key={inc.id}
                                    onClick={() => onViewIncident(inc)}
                                    className="w-full grid grid-cols-1 md:grid-cols-[120px_1fr_1fr_140px_1fr_1fr_40px] gap-2 md:gap-3 px-5 py-4 text-left hover:bg-slate-50 transition-colors items-center group"
                                >
                                    {/* Reference */}
                                    <div className="flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full shrink-0 ${SEVERITY_DOT[inc.severity]}`} title={inc.severity} />
                                        <span className="font-mono text-xs font-bold text-slate-700">{inc.reference}</span>
                                    </div>
                                    {/* Client */}
                                    <div className="text-sm font-semibold text-slate-900 truncate">
                                        {inc.clientName || <span className="text-slate-400 italic">Sin cliente</span>}
                                    </div>
                                    {/* Description */}
                                    <div className="text-sm text-slate-500 truncate">{inc.description}</div>
                                    {/* Status badge */}
                                    <div>
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${st.color}`}>
                                            <StatusIcon size={11} />
                                            {st.label}
                                        </span>
                                    </div>
                                    {/* Assigned to */}
                                    <div className="flex items-center gap-1.5 text-sm text-slate-500">
                                        {inc.assignedToName
                                            ? <><User size={13} className="shrink-0 text-slate-400" />{inc.assignedToName}</>
                                            : <span className="text-slate-300 italic text-xs">Sin asignar</span>}
                                    </div>
                                    {/* Date */}
                                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                        <Calendar size={12} className="shrink-0" />
                                        {formatDate(inc.createdAt)}
                                    </div>
                                    {/* Arrow */}
                                    <div className="hidden md:flex justify-end">
                                        <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-600 transition-colors" />
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Footer count */}
                {filtered.length > 0 && (
                    <div className="px-5 py-3 border-t border-slate-50 text-xs text-slate-400 text-right">
                        Mostrando {filtered.length} de {incidents.length} incidencias
                    </div>
                )}
            </div>
        </div>
    );
};
