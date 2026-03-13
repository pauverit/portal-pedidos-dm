import React, { useState, useEffect } from 'react';
import {
    Plus, Search, Loader, FileText, User, Wrench,
    CheckCircle, PenLine, XCircle, ClipboardList, Clock
} from 'lucide-react';
import { SATPartDoc, PartStatus } from './SATPartDetail';
import { User as UserType } from '../types';

interface SATPartsListProps {
    parts: SATPartDoc[];
    loading: boolean;
    currentUser: UserType;
    technicians: UserType[];
    onRefresh: () => void;
    onNewPart: () => void;
    onViewPart: (part: SATPartDoc) => void;
}

const STATUS_CFG: Record<PartStatus, { label: string; color: string; dot: string; icon: React.FC<any> }> = {
    open: { label: 'Nueva', color: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400', icon: FileText },
    assigned: { label: 'Asignada', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500', icon: User },
    in_progress: { label: 'En curso', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500', icon: Wrench },
    resolved: { label: 'Resuelta', color: 'bg-teal-100 text-teal-700', dot: 'bg-teal-500', icon: CheckCircle },
    signed: { label: 'Firmada', color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500', icon: PenLine },
    cancelled: { label: 'Anulada', color: 'bg-red-100 text-red-700', dot: 'bg-red-400', icon: XCircle },
    invoiced: { label: 'Facturada', color: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500', icon: ClipboardList },
};

const TABS = [
    { key: 'all', label: 'Todos' },
    { key: 'open', label: 'Nuevas' },
    { key: 'assigned', label: 'Asignadas' },
    { key: 'in_progress', label: 'En curso' },
    { key: 'resolved', label: 'Resueltas' },
    { key: 'signed', label: 'Firmadas' },
    { key: 'cancelled', label: 'Anuladas' },
    { key: 'invoiced', label: 'Facturadas' },
];

const fmtDate = (iso?: string) => iso
    ? new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '—';

const fmtDur = (m?: number) => {
    if (!m) return '';
    const h = Math.floor(m / 60), mm = m % 60;
    return h > 0 ? `${h}h${mm > 0 ? ` ${mm}m` : ''}` : `${mm}m`;
};

const PRIORITY_DOT: Record<string, string> = {
    low: 'bg-slate-400', normal: 'bg-blue-500', high: 'bg-orange-500', urgent: 'bg-red-600'
};

export const SATPartsList: React.FC<SATPartsListProps> = ({
    parts, loading, currentUser, technicians, onRefresh, onNewPart, onViewPart
}) => {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [techFilter, setTechFilter] = useState('');
    const isTechLead = currentUser.role === 'tech_lead' || currentUser.role === 'admin';

    useEffect(() => { onRefresh(); }, []);

    const counts: Record<string, number> = { all: parts.length };
    parts.forEach(p => { counts[p.status] = (counts[p.status] || 0) + 1; });

    const filtered = parts.filter(p => {
        if (statusFilter !== 'all' && p.status !== statusFilter) return false;
        if (techFilter && p.assignedTo !== techFilter) return false;
        if (search) {
            const q = search.toLowerCase();
            if (![p.reference, p.clientName, p.assignedToName, p.description, p.incidentType].some(v => v?.toLowerCase().includes(q))) return false;
        }
        return true;
    });

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-4">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-black text-slate-900">Incidencias &amp; Partes</h1>
                    <p className="text-slate-400 text-sm mt-0.5">{parts.length} parte{parts.length !== 1 ? 's' : ''} en total</p>
                </div>
                {currentUser.role !== 'client' ? (
                    <button onClick={onNewPart}
                        className="flex items-center gap-2 bg-slate-900 text-white px-3 py-2 rounded-xl text-sm font-bold hover:bg-slate-700 transition-colors">
                        <Plus size={16} /> Nuevo Parte
                    </button>
                ) : (
                    <button onClick={onNewPart}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors">
                        <Plus size={16} /> Abrir Incidencia
                    </button>
                )}
            </div>

            {/* Status tabs */}
            <div className="flex gap-1 overflow-x-auto pb-1 snap-x">
                {TABS.map(t => (
                    <button key={t.key} onClick={() => setStatusFilter(t.key)}
                        className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold transition-colors snap-start ${statusFilter === t.key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}>
                        {t.label}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${statusFilter === t.key ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'
                            }`}>{counts[t.key] || 0}</span>
                    </button>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
                <div className="relative flex-1 min-w-[220px]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input className="w-full pl-8 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                        placeholder="Buscar por referencia, cliente, tipo…"
                        value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                {isTechLead && technicians.length > 0 && (
                    <select className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                        value={techFilter} onChange={e => setTechFilter(e.target.value)}>
                        <option value="">Todos los técnicos</option>
                        {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                )}
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="hidden md:grid grid-cols-[110px_1fr_1fr_110px_60px_90px_90px] gap-3 px-5 py-3 bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <div>Referencia</div>
                    <div>Cliente</div>
                    <div>Descripción</div>
                    <div>Técnico</div>
                    <div>Durac.</div>
                    <div>Fecha</div>
                    <div>Estado</div>
                </div>

                {loading ? (
                    <div className="py-16 text-center text-slate-400">
                        <Loader size={22} className="animate-spin mx-auto mb-2 opacity-40" />Cargando partes…
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="py-16 text-center text-slate-400">
                        <ClipboardList size={28} className="mx-auto mb-3 opacity-30" />
                        <p className="font-medium">Sin partes en esta categoría</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {filtered.map(p => {
                            const st = STATUS_CFG[p.status];
                            const StatusIcon = st.icon;
                            return (
                                <button key={p.id} onClick={() => onViewPart(p)}
                                    className="w-full text-left hover:bg-slate-50 transition-colors">

                                    {/* Mobile: tarjeta compacta 2 líneas */}
                                    <div className="md:hidden px-3 py-2">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[p.priority] || 'bg-slate-300'}`} />
                                                <span className="font-mono text-xs font-bold text-slate-700">{p.reference}</span>
                                                <span className="text-sm text-slate-700 font-semibold truncate">{p.clientName}</span>
                                            </div>
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold shrink-0 ${st.color}`}>
                                                <StatusIcon size={10} />{st.label}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between mt-0.5 pl-4">
                                            <span className="text-xs text-slate-400 truncate">
                                                {p.incidentType ? `${p.incidentType} · ${p.description}` : p.description}
                                            </span>
                                            <span className="text-xs text-slate-400 shrink-0 ml-2">{fmtDate(p.scheduledAt || p.createdAt)}</span>
                                        </div>
                                    </div>

                                    {/* Desktop: fila en grid */}
                                    <div className="hidden md:grid grid-cols-[110px_1fr_1fr_110px_60px_90px_90px] gap-3 px-5 py-3.5 items-center">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[p.priority] || 'bg-slate-300'}`} />
                                            <span className="font-mono text-xs font-bold text-slate-700">{p.reference}</span>
                                        </div>
                                        <span className="text-sm text-slate-700 font-medium truncate">{p.clientName}</span>
                                        <div>
                                            <p className="text-xs text-slate-600 truncate">{p.description}</p>
                                            {p.incidentType && <p className="text-[10px] text-slate-400">{p.incidentType}</p>}
                                        </div>
                                        <span className="text-xs text-slate-500 truncate">
                                            {p.assignedToName || <span className="italic text-slate-300">Sin asignar</span>}
                                        </span>
                                        <span className="text-xs text-slate-400">{fmtDur(p.estimatedMinutes)}</span>
                                        <span className="text-xs text-slate-400">{fmtDate(p.scheduledAt || p.createdAt)}</span>
                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold ${st.color}`}>
                                            <StatusIcon size={10} />{st.label}
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
