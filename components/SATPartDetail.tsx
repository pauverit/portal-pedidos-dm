import React, { useState, useEffect } from 'react';
import {
    ArrowLeft, Save, Loader, CheckCircle, XCircle,
    Wrench, FileText, ClipboardList, PenLine,
    User, ShieldCheck, ShieldOff, Plus, Check, Cpu
} from 'lucide-react';
import { User as UserType } from '../types';
import { useMachines } from '../hooks/useMachines';
import { useToast } from './Toast';
import { SignatureModal } from './SignatureModal';
import { supabase } from '../lib/supabase';

// ─── Types ─────────────────────────────────────────────────────────────────

export type PartStatus =
    | 'open'
    | 'assigned'
    | 'in_progress'
    | 'resolved'
    | 'signed'
    | 'cancelled'
    | 'invoiced';

export interface SATPartDoc {
    id: string;
    reference: string;
    clientId: string;
    clientName?: string;
    machinery?: string;
    machineId?: string;
    machineName?: string;
    assignedTo?: string;
    assignedToName?: string;
    status: PartStatus;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    description: string;
    resolution?: string;
    incidentType?: string;
    estimatedMinutes?: number;
    scheduledAt?: string;
    startedAt?: string;
    closedAt?: string;
    cancelledReason?: string;
    signatureUrl?: string;
    createdBy?: string;
    createdByName?: string;
    createdAt: string;
}

const STATUS_CONFIG: Record<PartStatus, { label: string; color: string; icon: React.FC<any>; next: PartStatus[] }> = {
    open: { label: 'Nueva', color: 'bg-slate-100 text-slate-700 border-slate-200', icon: FileText, next: ['assigned', 'cancelled'] },
    assigned: { label: 'Asignada', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: User, next: ['in_progress', 'cancelled'] },
    in_progress: { label: 'En curso', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Wrench, next: ['resolved', 'cancelled'] },
    resolved: { label: 'Resuelta', color: 'bg-teal-100 text-teal-700 border-teal-200', icon: CheckCircle, next: ['signed', 'in_progress'] },
    signed: { label: 'Firmada', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: PenLine, next: ['invoiced'] },
    cancelled: { label: 'Anulada', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle, next: [] },
    invoiced: { label: 'Facturada', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: ClipboardList, next: [] },
};

const PRIORITY_CFG: Record<string, { label: string; dot: string }> = {
    low: { label: 'Baja', dot: 'bg-slate-400' },
    normal: { label: 'Normal', dot: 'bg-blue-500' },
    high: { label: 'Alta', dot: 'bg-orange-500' },
    urgent: { label: 'Urgente', dot: 'bg-red-600' },
};

const INCIDENT_TYPES = [
    'Instalación', 'Mantenimiento preventivo', 'Avería', 'Formación',
    'Configuración', 'Sustitución de piezas', 'Visita comercial', 'Otro',
];

const isWarrantyValid = (expires?: string) => expires ? new Date(expires) >= new Date() : false;

const fmtDate = (iso?: string) => iso
    ? new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';

const uploadSignature = async (partId: string, dataUrl: string): Promise<string> => {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const path = `${partId}.png`;
    const { error } = await supabase.storage.from('sat-signatures').upload(path, blob, { upsert: true, contentType: 'image/png' });
    if (error) throw error;
    return supabase.storage.from('sat-signatures').getPublicUrl(path).data.publicUrl + `?t=${Date.now()}`;
};

// ─── Tech avatar initials helper ───────────────────────────────────────────
const initials = (name: string) => name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();

// ─── Component ────────────────────────────────────────────────────────────

interface Props {
    part: SATPartDoc;
    currentUser: UserType;
    technicians: UserType[];
    clients: UserType[];
    onBack: () => void;
    onSave: (id: string, updates: Partial<SATPartDoc>) => Promise<void>;
    onRefresh: () => void;
}

export const SATPartDetail: React.FC<Props> = ({
    part, currentUser, technicians, clients, onBack, onSave, onRefresh
}) => {
    const [tab, setTab] = useState<'info' | 'resolution'>('info');
    const [form, setForm] = useState({
        status: part.status,
        priority: part.priority,
        assignedTo: part.assignedTo || '',
        machineId: part.machineId || '',
        description: part.description,
        resolution: part.resolution || '',
        incidentType: part.incidentType || '',
        estimatedHours: Math.floor((part.estimatedMinutes || 0) / 60),
        estimatedMins: (part.estimatedMinutes || 0) % 60,
        scheduledAt: part.scheduledAt ? part.scheduledAt.slice(0, 16) : '',
        cancelledReason: part.cancelledReason || '',
    });
    const [showCancel, setShowCancel] = useState(false);
    const [showSign, setShowSign] = useState(false);
    const [saving, setSaving] = useState(false);

    // Inline machine creation state
    const [showAddMachine, setShowAddMachine] = useState(false);
    const [newMachine, setNewMachine] = useState({ brand: '', model: '', serialNumber: '', warrantyExpires: '' });
    const [savingMachine, setSavingMachine] = useState(false);

    const { toast } = useToast();
    const { machines, loading: loadingMachines, loadByClient, createMachine } = useMachines();

    const isTechLead = currentUser.role === 'tech_lead' || currentUser.role === 'admin';
    const isTech = currentUser.role === 'tech' || isTechLead;
    const isClient = currentUser.role === 'client';
    const client = clients.find(c => c.id === part.clientId);
    const st = STATUS_CONFIG[form.status];
    const StatusIcon = st.icon;
    const isFinal = ['cancelled', 'signed', 'invoiced'].includes(form.status);

    useEffect(() => { if (part.clientId) loadByClient(part.clientId); }, [part.clientId]);

    const f = (key: string, val: any) => setForm(prev => ({ ...prev, [key]: val }));

    // ── Handlers ────────────────────────────────────────────────────────────

    const handleSave = async () => {
        setSaving(true);
        try {
            const updates: Partial<SATPartDoc> = {
                status: form.status,
                priority: form.priority as any,
                assignedTo: form.assignedTo || undefined,
                machineId: form.machineId || undefined,
                description: form.description,
                resolution: form.resolution || undefined,
                incidentType: form.incidentType || undefined,
                estimatedMinutes: form.estimatedHours * 60 + form.estimatedMins || undefined,
                scheduledAt: form.scheduledAt || undefined,
                cancelledReason: form.cancelledReason || undefined,
                ...(form.status === 'in_progress' && !part.startedAt ? { startedAt: new Date().toISOString() } : {}),
                ...((['resolved', 'signed', 'invoiced'].includes(form.status)) && !part.closedAt
                    ? { closedAt: new Date().toISOString() } : {}),
            };
            await onSave(part.id, updates);
            toast('Parte guardado', 'success');
            onBack();
        } catch (err: any) {
            toast('Error: ' + err.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = async () => {
        if (!form.cancelledReason.trim()) { toast('Indica el motivo de anulación', 'error'); return; }
        setSaving(true);
        try {
            await onSave(part.id, { status: 'cancelled', cancelledReason: form.cancelledReason });
            toast('Parte anulado', 'success');
            onBack();
        } finally { setSaving(false); }
    };

    const handleSign = async (dataUrl: string) => {
        try {
            const url = await uploadSignature(part.id, dataUrl);
            await onSave(part.id, { status: 'signed', signatureUrl: url, closedAt: new Date().toISOString() });
            toast('¡Parte firmado y cerrado!', 'success');
            setShowSign(false);
            onRefresh();
            onBack();
        } catch (err: any) {
            toast('Error al guardar firma: ' + err.message, 'error');
        }
    };

    const handleAddMachine = async () => {
        if (!newMachine.brand.trim() || !newMachine.model.trim() || !newMachine.serialNumber.trim()) {
            toast('Marca, modelo y número de serie son obligatorios', 'error');
            return;
        }
        setSavingMachine(true);
        try {
            const created = await createMachine({
                clientId: part.clientId,
                brand: newMachine.brand.trim(),
                model: newMachine.model.trim(),
                serialNumber: newMachine.serialNumber.trim(),
                warrantyExpires: newMachine.warrantyExpires || undefined,
            });
            setNewMachine({ brand: '', model: '', serialNumber: '', warrantyExpires: '' });
            setShowAddMachine(false);
            await loadByClient(part.clientId);
            if (created?.id) f('machineId', created.id);
            toast('Activo registrado y seleccionado', 'success');
        } catch (err: any) {
            toast('Error al registrar activo: ' + err.message, 'error');
        } finally {
            setSavingMachine(false);
        }
    };

    const pr = PRIORITY_CFG[form.priority] || PRIORITY_CFG.normal;

    // ── Render ────────────────────────────────────────────────────────────

    return (
        <>
            {showSign && (
                <SignatureModal
                    technicianName={form.assignedTo ? technicians.find(t => t.id === form.assignedTo)?.name || '' : currentUser.name}
                    clientName={client?.name || part.clientName || ''}
                    workDescription={form.description}
                    onSign={handleSign}
                    onClose={() => setShowSign(false)}
                />
            )}

            <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-4">
                {/* Header */}
                <div className="flex flex-wrap items-start gap-3">
                    <button onClick={onBack} className="mt-1 p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 shrink-0">
                        <ArrowLeft size={18} />
                    </button>
                    <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2.5">
                            <h1 className="text-lg font-black text-slate-900 font-mono">{part.reference}</h1>
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${st.color}`}>
                                <StatusIcon size={12} />{st.label}
                            </span>
                            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                                <span className={`w-2 h-2 rounded-full ${pr.dot}`} />{pr.label}
                            </span>
                        </div>
                        <p className="text-slate-500 text-sm mt-0.5">
                            {client?.name || part.clientName}
                            {client?.phone && <span className="text-slate-400"> · {client.phone}</span>}
                        </p>
                    </div>

                    <div className="flex gap-2">
                        {isTech && !isFinal && (
                            <button onClick={() => setShowCancel(c => !c)}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                                <XCircle size={14} /> Anular
                            </button>
                        )}
                        {form.status === 'resolved' && isTech && (
                            <button onClick={() => setShowSign(true)}
                                className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-500 transition-colors">
                                <PenLine size={14} /> Obtener firma
                            </button>
                        )}
                        {!isFinal && !isClient && (
                            <button onClick={handleSave} disabled={saving}
                                className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-slate-700 disabled:opacity-50 transition-colors">
                                {saving ? <Loader size={14} className="animate-spin" /> : <Save size={14} />}
                                {saving ? 'Guardando…' : 'Guardar'}
                            </button>
                        )}
                    </div>
                </div>

                {/* Annul panel */}
                {showCancel && (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-3">
                        <p className="font-bold text-red-700 text-sm flex items-center gap-2"><XCircle size={15} />Anular parte</p>
                        <textarea rows={2}
                            className="w-full border border-red-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                            placeholder="Motivo de anulación (obligatorio)…"
                            value={form.cancelledReason} onChange={e => f('cancelledReason', e.target.value)} />
                        <div className="flex gap-2">
                            <button onClick={() => setShowCancel(false)} className="px-4 py-2 rounded-xl font-bold text-sm text-slate-600 hover:bg-red-100 transition-colors">Cancelar</button>
                            <button onClick={handleCancel} disabled={saving}
                                className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-red-700 disabled:opacity-50 transition-colors">
                                <XCircle size={14} />Confirmar anulación
                            </button>
                        </div>
                    </div>
                )}

                {/* Signature image */}
                {part.signatureUrl && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                        <p className="text-xs font-bold text-emerald-700 mb-2 flex items-center gap-1"><PenLine size={12} /> Firmado el {fmtDate(part.closedAt)}</p>
                        <img src={part.signatureUrl} alt="Firma" className="h-20 border border-emerald-200 rounded-lg bg-white" />
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Main column */}
                    <div className="md:col-span-2 space-y-4">
                        {/* Description */}
                        <div className="bg-white rounded-2xl border border-slate-100 p-5">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Descripción del problema</label>
                            <textarea rows={3}
                                className="w-full text-sm text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-slate-900 rounded-lg px-2 py-1"
                                value={form.description} readOnly={isFinal || isClient}
                                onChange={e => f('description', e.target.value)} />
                        </div>

                        {/* Tabs */}
                        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                            <div className="flex border-b border-slate-100">
                                {[{ id: 'info' as const, label: 'Más información' }, { id: 'resolution' as const, label: 'Resolución / Trabajos' }].map(t => (
                                    <button key={t.id} onClick={() => setTab(t.id)}
                                        className={`px-5 py-3 text-sm font-bold transition-colors ${tab === t.id ? 'text-slate-900 border-b-2 border-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>
                                        {t.label}
                                    </button>
                                ))}
                            </div>

                            <div className="p-5 space-y-4">
                                {tab === 'info' && (
                                    <>
                                        {/* Machine selector + inline create */}
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                                    Activo / Máquina
                                                    {loadingMachines && <Loader size={10} className="inline ml-1.5 animate-spin text-slate-400" />}
                                                </label>
                                                {isTech && !isFinal && (
                                                    <button type="button" onClick={() => setShowAddMachine(s => !s)}
                                                        className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
                                                        <Plus size={12} />
                                                        {showAddMachine ? 'Cancelar' : 'Nuevo activo'}
                                                    </button>
                                                )}
                                            </div>

                                            {/* Inline machine creation form */}
                                            {showAddMachine && (
                                                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-3 mb-3">
                                                    <p className="text-xs font-bold text-indigo-700">Registrar nuevo activo para este cliente</p>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div>
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Marca *</label>
                                                            <input className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                                                placeholder="HP, Canon…" value={newMachine.brand}
                                                                onChange={e => setNewMachine(m => ({ ...m, brand: e.target.value }))} />
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Modelo *</label>
                                                            <input className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                                                placeholder="DesignJet T650" value={newMachine.model}
                                                                onChange={e => setNewMachine(m => ({ ...m, model: e.target.value }))} />
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Nº Serie *</label>
                                                            <input className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                                                placeholder="SN12345678" value={newMachine.serialNumber}
                                                                onChange={e => setNewMachine(m => ({ ...m, serialNumber: e.target.value }))} />
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Garantía hasta</label>
                                                            <input type="date" className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                                                value={newMachine.warrantyExpires}
                                                                onChange={e => setNewMachine(m => ({ ...m, warrantyExpires: e.target.value }))} />
                                                        </div>
                                                    </div>
                                                    <button type="button" disabled={savingMachine} onClick={handleAddMachine}
                                                        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                                                        <Check size={14} />
                                                        {savingMachine ? 'Guardando…' : 'Guardar activo'}
                                                    </button>
                                                </div>
                                            )}

                                            <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                                                value={form.machineId} onChange={e => f('machineId', e.target.value)} disabled={isFinal}>
                                                <option value="">Sin máquina específica</option>
                                                {machines.map(m => {
                                                    const wok = isWarrantyValid(m.warrantyExpires);
                                                    return (
                                                        <option key={m.id} value={m.id}>
                                                            {m.brand} {m.model} — S/N {m.serialNumber}{wok ? ' ✓ Garantía' : ''}
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Tipo de incidencia</label>
                                                <select className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                                                    value={form.incidentType} onChange={e => f('incidentType', e.target.value)}>
                                                    <option value="">Seleccionar…</option>
                                                    {INCIDENT_TYPES.map(t => <option key={t}>{t}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Duración estimada</label>
                                                <div className="flex items-center gap-1">
                                                    <input type="number" min={0} max={99}
                                                        className="w-16 border border-slate-200 rounded-xl px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-slate-900"
                                                        value={form.estimatedHours} onChange={e => f('estimatedHours', +e.target.value)} />
                                                    <span className="text-xs text-slate-400">h</span>
                                                    <input type="number" min={0} max={59} step={5}
                                                        className="w-16 border border-slate-200 rounded-xl px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-slate-900"
                                                        value={form.estimatedMins} onChange={e => f('estimatedMins', +e.target.value)} />
                                                    <span className="text-xs text-slate-400">min</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Fecha programada</label>
                                            <input type="datetime-local"
                                                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                                                value={form.scheduledAt} onChange={e => f('scheduledAt', e.target.value)} />
                                        </div>
                                    </>
                                )}

                                {tab === 'resolution' && (
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Resolución y trabajos realizados</label>
                                        <textarea rows={7}
                                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-slate-900"
                                            placeholder="Describe los trabajos realizados, piezas cambiadas, solución aplicada…"
                                            value={form.resolution} readOnly={isFinal || isClient}
                                            onChange={e => {
                                                const val = e.target.value;
                                                // Auto-transition to in_progress when tech starts writing
                                                if (val && ['open', 'assigned'].includes(form.status)) {
                                                    setForm(prev => ({ ...prev, resolution: val, status: 'in_progress' }));
                                                } else {
                                                    f('resolution', val);
                                                }
                                            }} />
                                        {!isClient && !['resolved', 'signed', 'invoiced', 'cancelled'].includes(form.status) && form.resolution && (
                                            <button onClick={() => f('status', 'resolved')}
                                                className="mt-3 flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-teal-500 transition-colors">
                                                <CheckCircle size={14} /> Marcar como Resuelta
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Traceability */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {[
                                { label: 'Creado por', val: part.createdByName || '—' },
                                { label: 'Creado', val: fmtDate(part.createdAt) },
                                { label: 'Inicio', val: fmtDate(part.startedAt) },
                                { label: 'Cierre', val: fmtDate(part.closedAt) },
                            ].map(x => (
                                <div key={x.label} className="bg-white rounded-xl border border-slate-100 px-3 py-2">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{x.label}</p>
                                    <p className="text-xs font-semibold text-slate-700 mt-0.5">{x.val}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right sidebar */}
                    <div className="space-y-4">
                        {/* Status */}
                        <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-1.5">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Estado</label>
                            {isClient ? (
                                // Read-only status badge for clients
                                <span className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold border ${st.color}`}>
                                    <StatusIcon size={13} />{st.label}
                                </span>
                            ) : (
                                (Object.keys(STATUS_CONFIG) as PartStatus[]).map(s => {
                                    const cfg = STATUS_CONFIG[s];
                                    const Icon = cfg.icon;
                                    const isActive = form.status === s;
                                    const isReachable = STATUS_CONFIG[form.status].next.includes(s) || isActive;
                                    return (
                                        <button key={s}
                                            disabled={!isReachable || isFinal}
                                            onClick={() => form.status !== s && isReachable && f('status', s)}
                                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-colors border ${isActive ? cfg.color
                                                : isReachable ? 'border-transparent text-slate-500 hover:bg-slate-50'
                                                    : 'border-transparent text-slate-300 cursor-not-allowed'
                                                }`}>
                                            <Icon size={13} />
                                            {cfg.label}
                                            {isActive && <span className="ml-auto text-[10px] font-bold uppercase opacity-60">Actual</span>}
                                        </button>
                                    );
                                })
                            )}
                        </div>

                        {/* Priority */}
                        {!isClient && (
                            <div className="bg-white rounded-2xl border border-slate-100 p-5">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Prioridad</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {Object.entries(PRIORITY_CFG).map(([k, v]) => (
                                        <button key={k} onClick={() => f('priority', k)}
                                            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border-2 transition-colors ${form.priority === k ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                                                }`}>
                                            <span className={`w-2 h-2 rounded-full ${form.priority === k ? 'bg-white' : v.dot}`} />
                                            {v.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Technician assignment */}
                        <div className="bg-white rounded-2xl border border-slate-100 p-5">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3">Asignado a</label>

                            {isTechLead ? (
                                <div className="space-y-2">
                                    {/* "Sin asignar" chip */}
                                    <button onClick={() => setForm(prev => ({
                                        ...prev, assignedTo: '',
                                        status: prev.status === 'assigned' ? 'open' : prev.status
                                    }))}
                                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm font-semibold transition-colors ${!form.assignedTo ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                                            }`}>
                                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black ${!form.assignedTo ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>
                                            —
                                        </span>
                                        Sin asignar
                                    </button>

                                    {/* Technician chips */}
                                    {technicians.map(t => {
                                        const isSelected = form.assignedTo === t.id;
                                        return (
                                            <button key={t.id}
                                                onClick={() => setForm(prev => ({
                                                    ...prev,
                                                    assignedTo: t.id,
                                                    status: prev.status === 'open' ? 'assigned' : prev.status,
                                                }))}
                                                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border-2 text-sm font-semibold transition-colors ${isSelected ? 'border-indigo-600 bg-indigo-50 text-indigo-900' : 'border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50'
                                                    }`}>
                                                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                                                    }`}>
                                                    {initials(t.name)}
                                                </span>
                                                <span className="truncate">{t.name}</span>
                                                {t.zone && <span className="ml-auto text-[10px] text-slate-400 shrink-0">{t.zone}</span>}
                                                {isSelected && <Check size={14} className="text-indigo-600 shrink-0 ml-auto" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-sm font-semibold text-slate-700">
                                    {part.assignedToName || <span className="text-slate-400 italic text-xs">Sin asignar</span>}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};
