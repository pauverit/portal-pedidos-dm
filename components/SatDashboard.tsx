import React from 'react';
import { Wrench, AlertTriangle, ClipboardList, CheckCircle, Clock, TrendingUp, Users, Receipt } from 'lucide-react';
import { User } from '../types';

interface SatDashboardProps {
    currentUser: User;
    onNavigate: (view: string) => void;
}

export const SatDashboard: React.FC<SatDashboardProps> = ({ currentUser, onNavigate }) => {
    const isTechLead = currentUser.role === 'tech_lead' || currentUser.role === 'admin';

    const stats = [
        { label: 'Partes Abiertas', value: '—', icon: AlertTriangle, color: 'bg-orange-500', view: 'sat_parts' },
        { label: 'En Curso', value: '—', icon: Clock, color: 'bg-blue-500', view: 'sat_parts' },
        { label: 'Resueltas Hoy', value: '—', icon: CheckCircle, color: 'bg-emerald-500', view: 'sat_parts' },
        ...(isTechLead ? [{ label: 'Activos /Máquinas', value: '—', icon: TrendingUp, color: 'bg-red-500', view: 'sat_machines' }] : []),
    ];

    const quickActions = [
        { label: 'Nuevo Parte / Incidencia', view: 'sat_parts', icon: ClipboardList },
        { label: 'Mis Máquinas', view: 'sat_machines', icon: Wrench },
        { label: 'Gastos', view: 'expenses', icon: Receipt },
        ...(isTechLead ? [{ label: 'Gestión de Técnicos', view: 'admin_tech_management', icon: Users }] : []),
    ];

    return (
        <div className="p-4 md:p-10 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Servicio Técnico</h1>
                    <p className="text-slate-500 mt-1">
                        {isTechLead
                            ? 'Panel de jefe de técnicos — visión completa del equipo.'
                            : `Bienvenido, ${currentUser.name}. Aquí están tus partes e incidencias.`}
                    </p>
                </div>
                <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-700 px-4 py-2 rounded-xl text-sm font-bold">
                    <Wrench size={16} />
                    {currentUser.role === 'tech_lead' ? 'Jefe de Técnicos' : 'Técnico'}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, idx) => (
                    <button key={idx} onClick={() => onNavigate(stat.view)}
                        className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-all text-left w-full">
                        <div className={`${stat.color} p-4 rounded-xl text-white shadow-lg`}>
                            <stat.icon size={26} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{stat.label}</p>
                            <p className="text-3xl font-black text-slate-900">{stat.value}</p>
                        </div>
                    </button>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-lg">
                <h2 className="text-lg font-bold mb-4">Acciones Rápidas</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {quickActions.map((action, idx) => (
                        <button key={idx} onClick={() => onNavigate(action.view)}
                            className="bg-white/10 hover:bg-white/20 p-4 rounded-xl flex flex-col items-center gap-2 transition-colors border border-white/10">
                            <action.icon size={22} />
                            <span className="text-sm font-medium">{action.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
