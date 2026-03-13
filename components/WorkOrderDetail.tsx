import React, { useState, useEffect } from 'react';
import {
    ArrowLeft, Save, Loader, Clock, CheckCircle, AlertTriangle,
    User, Calendar, Cpu, Wrench, FileText, ClipboardList, ChevronDown
} from 'lucide-react';
import { WorkOrder } from '../hooks/useWorkOrders';
import { User as UserType, Machine } from '../types';
import { useMachines } from '../hooks/useMachines';
import { useToast } from './Toast';

interface WorkOrderDetailProps {
    workOrder: WorkOrder;
    currentUser: UserType;
    technicians: UserType[];
    machines?: Machine[]; // optional override; will auto-load by client if not provided
    onBack: () => void;
    onSave: (id: string, updates: Record<string, any>) => Promise<void>;
}

type WOStatus = WorkOrder['status'];
type WOPriority = WorkOrder['priority'];

const STATUS_CONFIG: Record<WOStatus, { label: string; color: string; icon: React.FC<any> }> = {
    draft: { label: 'Borrador', color: 'bg-slate-100 text-slate-600 border-slate-200', icon: FileText },
    scheduled: { label: 'Programado', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Calendar },
    in_progress: { label: 'En curso', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Wrench },
    done: { label: 'Finalizado', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle },
    invoiced: { label: 'Facturado', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: ClipboardList },
};

const PRIORITY_CONFIG: Record<WOPriority, { label: string; dot: string }> = {
    low: { label: 'Baja', dot: 'bg-slate-400' },
    normal: { label: 'Normal', dot: 'bg-blue-500' },
    high: { label: 'Alta', dot: 'bg-orange-500' },
    urgent: { label: 'Urgente', dot: 'bg-red-600' },
};

const INCIDENT_TYPES = [
    'Instalación', 'Mantenimiento preventivo', 'Avería', 'Formación',
    'Configuración', 'Sustitución de piezas', 'Visita comercial', 'Otro',
];

const fmtDate = (iso?: string) => iso
    ? new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';

export const WorkOrderDetail: React.FC<WorkOrderDetailProps> = ({
    workOrder, currentUser, technicians, machines: machinesProp, onBack, onSave
}) => {
    const { machines: loadedMachines, loadByClient } = useMachines();
    useEffect(() => { loadByClient(workOrder.clientId); }, [workOrder.clientId]);
    const clientMachines = machinesProp?.length ? machinesProp.filter(m => m.clientId === workOrder.clientId) : loadedMachines;
    const [tab, setTab] = useState<'info' | 'resolution'>('info');
    const [form, setForm] = useState({
        status: workOrder.status,
        priority: workOrder.priority,
        assignedTo: workOrder.assignedTo || '',
        machineId: workOrder.machineId || '',
        description: workOrder.description,
        resolution: workOrder.resolution || '',
        incidentType: workOrder.incidentType || '',
        estimatedHours: Math.floor((workOrder.estimatedMinutes || 0) / 60),
        estimatedMins: (workOrder.estimatedMinutes || 0) % 60,
        scheduledAt: workOrder.scheduledAt ? workOrder.scheduledAt.slice(0, 16) : '',
    });
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();
    const isTechLead = currentUser.role === 'tech_lead' || currentUser.role === 'admin';
    const st = STATUS_CONFIG[form.status];
    const StatusIcon = st.icon;
    const pr = PRIORITY_CONFIG[form.priority];

    const field = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave(workOrder.id, {
                status: form.status,
                priority: form.priority,
                assignedTo: form.assignedTo || undefined,
                machineId: form.machineId || undefined,
                description: form.description,
                resolution: form.resolution || undefined,
                incidentType: form.incidentType || undefined,
                estimatedMinutes: form.estimatedHours * 60 + form.estimatedMins,
                scheduledAt: form.scheduledAt || undefined,
                ...(form.status === 'done' && !workOrder.closedAt ? { closedAt: new Date().toISOString() } : {}),
                ...(form.status === 'in_progress' && !workOrder.startedAt ? { startedAt: new Date().toISOString() } : {}),
            });
            toast('Parte guardado', 'success');
            onBack();
        } catch (err: any) {
            toast('Error al guardar: ' + err.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-4">
            {/* Header */}
            <div className="flex flex-wrap items-start gap-3">
                <button onClick={onBack} className="mt-1 p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0">
                    <ArrowLeft size={18} />
                </button>
                <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="text-xl font-black text-slate-900 font-mono">{workOrder.reference}</h1>
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold border ${st.color}`}>
                            <StatusIcon size={13} />{st.label}
                        </span>
                        <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-500">
                            <span className={`w-2 h-2 rounded-full ${pr.dot}`} />{pr.label}
                        </span>
                    </div>
                    <p className="text-slate-400 text-sm mt-0.5">{workOrder.clientName}</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-700 disabled:opacity-50 transition-colors"
                >
                    {saving ? <Loader size={15} className="animate-spin" /> : <Save size={15} />}
                    {saving ? 'Guardando…' : 'Guardar'}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Main */}
                <div className="md:col-span-2 space-y-4 order-2 md:order-1">
                    {/* Description */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Descripción</label>
                        <textarea
                            rows={4}
                            className="w-full text-sm text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-slate-900 rounded-lg px-2 py-1"
                            value={form.description}
                            onChange={e => field('description', e.target.value)}
                        />
                    </div>

                    {/* Tabs */}
                    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                        <div className="flex border-b border-slate-100">
                            {[
                                { id: 'info', label: 'Más información' },
                                { id: 'resolution', label: 'Resolución' },
                            ].map(t => (
                                <button key={t.id} onClick={() => setTab(t.id as any)}
                                    className={`px-5 py-3 text-sm font-bold transition-colors ${tab === t.id ? 'text-slate-900 border-b-2 border-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>
                                    {t.label}
                                </button>
                            ))}
                        </div>

                        <div className="p-5 space-y-4">
                            {tab === 'info' && (
                                <>
                                    {/* Active / Machine */}
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Activo / Máquina</label>
                                        <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                                            value={form.machineId} onChange={e => field('machineId', e.target.value)}>
                                            <option value="">Sin máquina específica</option>
                                            {clientMachines.map(m => (
                                                <option key={m.id} value={m.id}>
                                                    {m.brand} {m.model} — S/N: {m.serialNumber}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Incident type */}
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Tipo de incidencia</label>
                                        <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                                            value={form.incidentType} onChange={e => field('incidentType', e.target.value)}>
                                            <option value="">Seleccionar tipo…</option>
                                            {INCIDENT_TYPES.map(t => <option key={t}>{t}</option>)}
                                        </select>
                                    </div>

                                    {/* Duration */}
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Duración estimada</label>
                                        <div className="flex items-center gap-2">
                                            <input type="number" min={0} max={99}
                                                className="w-20 border border-slate-200 rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-slate-900"
                                                value={form.estimatedHours}
                                                onChange={e => field('estimatedHours', e.target.value)} />
                                            <span className="text-sm text-slate-500">h</span>
                                            <input type="number" min={0} max={59} step={5}
                                                className="w-20 border border-slate-200 rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-slate-900"
                                                value={form.estimatedMins}
                                                onChange={e => field('estimatedMins', e.target.value)} />
                                            <span className="text-sm text-slate-500">min</span>
                                        </div>
                                    </div>

                                    {/* Scheduled date */}
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Fecha programada</label>
                                        <input type="datetime-local"
                                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                                            value={form.scheduledAt}
                                            onChange={e => field('scheduledAt', e.target.value)} />
                                    </div>
                                </>
                            )}

                            {tab === 'resolution' && (
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Resolución</label>
                                    <textarea
                                        rows={7}
                                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-slate-900"
                                        placeholder="Describe los trabajos realizados, solución aplicada, piezas reemplazadas…"
                                        value={form.resolution}
                                        onChange={e => field('resolution', e.target.value)}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Traceability footer */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                            { label: 'Creado por', val: workOrder.createdByName || '—' },
                            { label: 'Creado', val: fmtDate(workOrder.createdAt) },
                            { label: 'Inicio', val: fmtDate(workOrder.startedAt) },
                            { label: 'Cierre', val: fmtDate(workOrder.closedAt) },
                        ].map(x => (
                            <div key={x.label} className="bg-white rounded-xl border border-slate-100 px-3 py-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{x.label}</p>
                                <p className="text-xs font-semibold text-slate-700 mt-0.5">{x.val}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right sidebar */}
                <div className="space-y-4 order-1 md:order-2">
                    {/* Status */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Estado</label>
                        {(Object.keys(STATUS_CONFIG) as WOStatus[]).map(s => {
                            const cfg = STATUS_CONFIG[s];
                            const Icon = cfg.icon;
                            const active = form.status === s;
                            return (
                                <button key={s} onClick={() => field('status', s)}
                                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-colors border ${active ? cfg.color : 'border-transparent text-slate-500 hover:bg-slate-50'}`}>
                                    <Icon size={13} />
                                    {cfg.label}
                                    {active && <span className="ml-auto text-[10px] font-bold uppercase">Actual</span>}
                                </button>
                            );
                        })}
                    </div>

                    {/* Priority */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Prioridad</label>
                        <div className="grid grid-cols-2 gap-2">
                            {(Object.keys(PRIORITY_CONFIG) as WOPriority[]).map(p => {
                                const cfg = PRIORITY_CONFIG[p];
                                return (
                                    <button key={p} onClick={() => field('priority', p)}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border-2 transition-colors ${form.priority === p ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                                        <span className={`w-2 h-2 rounded-full ${form.priority === p ? 'bg-white' : cfg.dot}`} />
                                        {cfg.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Assigned tech */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Asignado a</label>
                        {isTechLead ? (
                            <select className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                                value={form.assignedTo} onChange={e => field('assignedTo', e.target.value)}>
                                <option value="">Sin asignar</option>
                                {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        ) : (
                            <p className="text-sm font-semibold text-slate-700">{workOrder.assignedToName || <span className="text-slate-400 italic">Sin asignar</span>}</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
