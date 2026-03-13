import React, { useState, useEffect } from 'react';
import { Wrench, AlertTriangle, ClipboardList, CheckCircle, Clock, Users, ChevronDown, ChevronUp, Calendar, AlertCircle, Plus, ShieldCheck } from 'lucide-react';
import { User } from '../types';
import { supabase } from '../lib/supabase';

interface TechLeadDashboardProps {
    currentUser: User;
    technicians: User[];
    onNavigate: (view: string) => void;
}

const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

interface TechStats {
    techId: string;
    openIncidents: number;
    inProgressWO: number;
    closedWOMonth: number;
    totalWOMonth: number;
}

export const TechLeadDashboard: React.FC<TechLeadDashboardProps> = ({
    currentUser, technicians, onNavigate
}) => {
    const now = new Date();
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
    const [selectedYear, setSelectedYear] = useState(now.getFullYear());
    const [expandedTech, setExpandedTech] = useState<string | null>(null);
    const [stats, setStats] = useState<TechStats[]>([]);
    const [loading, setLoading] = useState(true);

    const isCurrentMonth = selectedMonth === now.getMonth() && selectedYear === now.getFullYear();

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const monthStart = new Date(selectedYear, selectedMonth, 1).toISOString();
                const monthEnd = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59).toISOString();

                const [woRes, incRes] = await Promise.all([
                    supabase.from('work_orders').select('assigned_to, status, closed_at, created_at'),
                    supabase.from('incidents').select('assigned_to, status, closed_at, created_at'),
                ]);

                const workOrders = woRes.data || [];
                const incidents = incRes.data || [];

                const techMap: Record<string, TechStats> = {};
                technicians.forEach(t => {
                    techMap[t.id] = { techId: t.id, openIncidents: 0, inProgressWO: 0, closedWOMonth: 0, totalWOMonth: 0 };
                });

                incidents.forEach(i => {
                    if (!techMap[i.assigned_to]) return;
                    if (i.status === 'pending' || i.status === 'in_progress') {
                        techMap[i.assigned_to].openIncidents++;
                    }
                });

                workOrders.forEach(w => {
                    if (!techMap[w.assigned_to]) return;
                    const inMonth = w.created_at >= monthStart && w.created_at <= monthEnd;
                    if (inMonth) techMap[w.assigned_to].totalWOMonth++;
                    if (w.status === 'in_progress') techMap[w.assigned_to].inProgressWO++;
                    if ((w.status === 'done' || w.status === 'invoiced') && w.closed_at >= monthStart && w.closed_at <= monthEnd) {
                        techMap[w.assigned_to].closedWOMonth++;
                    }
                });

                setStats(Object.values(techMap));
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [selectedMonth, selectedYear, technicians]);

    const goToPrev = () => {
        if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y - 1); }
        else setSelectedMonth(m => m - 1);
    };
    const goToNext = () => {
        if (isCurrentMonth) return;
        if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y + 1); }
        else setSelectedMonth(m => m + 1);
    };

    const totalOpenIncidents = stats.reduce((s, t) => s + t.openIncidents, 0);
    const totalInProgress = stats.reduce((s, t) => s + t.inProgressWO, 0);
    const totalClosedMonth = stats.reduce((s, t) => s + t.closedWOMonth, 0);
    const totalTechs = technicians.filter(t => t.role === 'tech').length;

    return (
        <div className="p-4 md:p-10 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Dashboard Técnico</h1>
                    <p className="text-slate-500 mt-1">Actividad y partes del equipo técnico.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => onNavigate('sat_parts')}
                        className="flex items-center gap-2 bg-slate-900 hover:bg-slate-700 text-white px-3 py-2 rounded-xl font-semibold text-sm transition-colors shadow-sm"
                    >
                        <Plus size={16} />
                        <span>Nuevo Parte</span>
                    </button>
                    <button
                        onClick={() => onNavigate('sat_parts')}
                        className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-xl font-semibold text-sm transition-colors shadow-sm"
                    >
                        <ClipboardList size={16} />
                        <span>Ver Todos</span>
                    </button>
                </div>
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

            {/* Global KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: 'Técnicos activos', value: totalTechs, icon: Users, color: 'bg-blue-500' },
                    { label: 'Incidencias abiertas', value: loading ? '…' : totalOpenIncidents, icon: AlertTriangle, color: 'bg-orange-500' },
                    { label: 'Partes en curso', value: loading ? '…' : totalInProgress, icon: Clock, color: 'bg-indigo-500' },
                    { label: 'Cerrados este mes', value: loading ? '…' : totalClosedMonth, icon: CheckCircle, color: 'bg-emerald-500' },
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

            {/* Per-tech breakdown */}
            <div className="space-y-3">
                <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Por Técnico</h2>
                {technicians.map(tech => {
                    const s = stats.find(x => x.techId === tech.id) || { openIncidents: 0, inProgressWO: 0, closedWOMonth: 0, totalWOMonth: 0 };
                    const isExpanded = expandedTech === tech.id;
                    const noActivity = s.openIncidents === 0 && s.inProgressWO === 0 && s.closedWOMonth === 0;

                    return (
                        <div key={tech.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                            <button
                                className="w-full px-5 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors"
                                onClick={() => setExpandedTech(isExpanded ? null : tech.id)}
                            >
                                {/* Avatar */}
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${tech.role === 'tech_lead' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-white'}`}>
                                    {tech.role === 'tech_lead' ? <ShieldCheck size={16} /> : tech.name.charAt(0).toUpperCase()}
                                </div>

                                {/* Name */}
                                <div className="flex-1 text-left">
                                    <div className="flex items-center gap-2">
                                        <p className="font-bold text-slate-900">{tech.name}</p>
                                        {tech.role === 'tech_lead' && (
                                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">Jefe</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-400">@{tech.username}{tech.zone ? ` · ${tech.zone}` : ''}</p>
                                </div>

                                {/* Stats pills */}
                                <div className="hidden sm:flex items-center gap-4 text-sm">
                                    <span className="flex items-center gap-1 text-orange-600 font-bold" title="Incidencias abiertas">
                                        <AlertTriangle size={13} /> {loading ? '…' : s.openIncidents}
                                    </span>
                                    <span className="flex items-center gap-1 text-indigo-700 font-bold" title="Partes en curso">
                                        <Clock size={13} /> {loading ? '…' : s.inProgressWO}
                                    </span>
                                    <span className="flex items-center gap-1 text-emerald-700 font-bold" title="Cerrados este mes">
                                        <CheckCircle size={13} /> {loading ? '…' : s.closedWOMonth}
                                    </span>
                                </div>

                                {!loading && noActivity && (
                                    <AlertCircle size={16} className="text-amber-400 shrink-0" title="Sin actividad" />
                                )}

                                {isExpanded ? <ChevronUp size={16} className="text-slate-400 shrink-0" /> : <ChevronDown size={16} className="text-slate-400 shrink-0" />}
                            </button>

                            {isExpanded && (
                                <div className="border-t border-slate-100 px-5 py-4 bg-slate-50">
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        {[
                                            { label: 'Incidencias abiertas', val: s.openIncidents, icon: AlertTriangle, color: 'text-orange-600' },
                                            { label: 'Partes en curso', val: s.inProgressWO, icon: Clock, color: 'text-indigo-600' },
                                            { label: 'Cerrados este mes', val: s.closedWOMonth, icon: CheckCircle, color: 'text-emerald-600' },
                                            { label: 'Total partes mes', val: s.totalWOMonth, icon: Wrench, color: 'text-slate-600' },
                                        ].map(m => (
                                            <div key={m.label} className="bg-white rounded-xl border border-slate-100 p-3 text-center">
                                                <m.icon size={14} className={`${m.color} mx-auto mb-1`} />
                                                <p className="font-black text-slate-900 text-base leading-none">{m.val}</p>
                                                <p className="text-[10px] text-slate-400 uppercase font-bold mt-0.5">{m.label}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-3 flex gap-2">
                                        <button
                                            onClick={() => onNavigate('sat_parts')}
                                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                                        >
                                            <ClipboardList size={12} /> Ver partes
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Quick access to own work */}
            <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-lg">
                <h2 className="text-base font-bold mb-4">Mis acciones rápidas</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: 'Mis Partes', view: 'sat_parts', icon: ClipboardList },
                        { label: 'Mis Incidencias', view: 'sat_parts', icon: AlertTriangle },
                        { label: 'Máquinas', view: 'sat_machines', icon: Wrench },
                        { label: 'Gestión Técnicos', view: 'admin_tech_management', icon: Users },
                    ].map((action, idx) => (
                        <button
                            key={idx}
                            onClick={() => onNavigate(action.view)}
                            className="bg-white/10 hover:bg-white/20 p-4 rounded-xl flex flex-col items-center gap-2 transition-colors border border-white/10"
                        >
                            <action.icon size={20} />
                            <span className="text-xs font-semibold text-center">{action.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
