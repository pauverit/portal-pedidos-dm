import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Cpu, ShieldCheck, ShieldOff, Loader, Plus, Check } from 'lucide-react';
import { IncidentSeverity, User as UserType } from '../types';
import { useMachines } from '../hooks/useMachines';
import { ClientSearchInput } from './ClientSearchInput';

interface NewIncidentModalProps {
    clients: UserType[];
    technicians: UserType[];
    currentUser: UserType;
    preselectedClientId?: string;
    preselectedMachineId?: string;
    onClose: () => void;
    onSave: (data: {
        clientId: string;
        machineId?: string;
        description: string;
        severity: IncidentSeverity;
        assignedTo?: string;
        createdBy: string;
    }) => Promise<void>;
}

const SEVERITY_OPTIONS: { value: IncidentSeverity; label: string }[] = [
    { value: 'low', label: 'Baja' },
    { value: 'normal', label: 'Normal' },
    { value: 'high', label: 'Alta' },
    { value: 'urgent', label: 'Urgente' },
];

const isWarrantyValid = (expires?: string) => expires ? new Date(expires) >= new Date() : false;

export const NewIncidentModal: React.FC<NewIncidentModalProps> = ({
    clients, technicians, currentUser, preselectedClientId, preselectedMachineId,
    onClose, onSave
}) => {
    const [clientId, setClientId] = useState(preselectedClientId || '');
    const [machineId, setMachineId] = useState(preselectedMachineId || '');
    const [description, setDescription] = useState('');
    const [severity, setSeverity] = useState<IncidentSeverity>('normal');
    const [assignedTo, setAssignedTo] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // Inline quick-register machine
    const [showAddMachine, setShowAddMachine] = useState(false);
    const [newMachine, setNewMachine] = useState({ brand: '', model: '', serialNumber: '', warrantyExpires: '' });
    const [savingMachine, setSavingMachine] = useState(false);

    const { machines, loading: loadingMachines, loadByClient, createMachine } = useMachines();
    const isTechLead = currentUser.role === 'tech_lead' || currentUser.role === 'admin';
    const isClient = currentUser.role === 'client';
    const istech = currentUser.role === 'tech' || isTechLead;

    const clientList = isClient ? [] : clients.filter(u => u.role === 'client');
    const effectiveClientId = isClient ? currentUser.id : clientId;

    useEffect(() => {
        if (clientId) { setMachineId(''); loadByClient(clientId); setShowAddMachine(false); }
    }, [clientId]);

    useEffect(() => {
        if (isClient) loadByClient(currentUser.id);
    }, []);

    const handleQuickAddMachine = async () => {
        if (!newMachine.brand.trim() || !newMachine.model.trim() || !newMachine.serialNumber.trim()) {
            setError('Marca, modelo y número de serie son obligatorios para registrar el activo');
            return;
        }
        setSavingMachine(true);
        setError('');
        try {
            await createMachine({
                clientId: effectiveClientId,
                brand: newMachine.brand.trim(),
                model: newMachine.model.trim(),
                serialNumber: newMachine.serialNumber.trim(),
                warrantyExpires: newMachine.warrantyExpires || undefined,
            });
            setNewMachine({ brand: '', model: '', serialNumber: '', warrantyExpires: '' });
            setShowAddMachine(false);
            await loadByClient(effectiveClientId);
        } catch (err: any) {
            setError('Error al registrar activo: ' + err.message);
        } finally {
            setSavingMachine(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!effectiveClientId) { setError('Selecciona un cliente'); return; }
        if (!description.trim()) { setError('La descripción es obligatoria'); return; }
        setSaving(true);
        setError('');
        try {
            await onSave({
                clientId: effectiveClientId,
                machineId: machineId || undefined,
                description: description.trim(),
                severity,
                assignedTo: assignedTo || undefined,
                createdBy: currentUser.id,
            });
            onClose();
        } catch (err: any) {
            setError('Error al crear: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl z-10">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-orange-100 rounded-lg"><AlertTriangle size={16} className="text-orange-600" /></div>
                        <h2 className="font-bold text-slate-900">Nueva Incidencia</h2>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    {/* Client selector — hidden for clients */}
                    {!isClient && (
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Cliente *</label>
                            <ClientSearchInput
                                clients={clients}
                                value={clientId}
                                onChange={id => { setClientId(id); setMachineId(''); }}
                                required
                            />
                        </div>
                    )}

                    {/* Machine/Asset selector */}
                    {effectiveClientId && (
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    Activo / Máquina
                                    {loadingMachines && <Loader size={11} className="inline ml-2 animate-spin text-slate-400" />}
                                </label>
                                {/* Any tech can add a machine */}
                                {istech && (
                                    <button
                                        type="button"
                                        onClick={() => setShowAddMachine(s => !s)}
                                        className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                                    >
                                        <Plus size={13} />
                                        {showAddMachine ? 'Cancelar' : 'Nuevo activo'}
                                    </button>
                                )}
                            </div>

                            {/* Quick-add machine form */}
                            {showAddMachine && (
                                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-3 mb-3">
                                    <p className="text-xs font-bold text-indigo-700">Registrar nuevo activo</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Marca *</label>
                                            <input
                                                className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                                placeholder="HP, Canon…"
                                                value={newMachine.brand}
                                                onChange={e => setNewMachine(m => ({ ...m, brand: e.target.value }))}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Modelo *</label>
                                            <input
                                                className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                                placeholder="DesignJet T650"
                                                value={newMachine.model}
                                                onChange={e => setNewMachine(m => ({ ...m, model: e.target.value }))}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Nº Serie *</label>
                                            <input
                                                className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                                placeholder="SN12345678"
                                                value={newMachine.serialNumber}
                                                onChange={e => setNewMachine(m => ({ ...m, serialNumber: e.target.value }))}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Garantía hasta</label>
                                            <input
                                                type="date"
                                                className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                                value={newMachine.warrantyExpires}
                                                onChange={e => setNewMachine(m => ({ ...m, warrantyExpires: e.target.value }))}
                                            />
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        disabled={savingMachine}
                                        onClick={handleQuickAddMachine}
                                        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                                    >
                                        <Check size={14} />
                                        {savingMachine ? 'Guardando…' : 'Guardar activo'}
                                    </button>
                                </div>
                            )}

                            {/* Machine list */}
                            {machines.length === 0 && !loadingMachines ? (
                                <div className="border border-dashed border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-400 text-center">
                                    Sin activos registrados.
                                    {istech && <span className="ml-1">Pulsa <strong>Nuevo activo</strong> para añadir uno.</span>}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${machineId === '' ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:border-slate-300'}`}>
                                        <input type="radio" name="machine" value="" checked={machineId === ''} onChange={() => setMachineId('')} className="accent-slate-900" />
                                        <span className="text-sm text-slate-500 italic">Sin máquina específica</span>
                                    </label>
                                    {machines.map(m => {
                                        const wok = isWarrantyValid(m.warrantyExpires);
                                        return (
                                            <label key={m.id} className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${machineId === m.id ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:border-slate-300'}`}>
                                                <input type="radio" name="machine" value={m.id} checked={machineId === m.id} onChange={() => setMachineId(m.id)} className="accent-slate-900 mt-0.5" />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <Cpu size={13} className="text-slate-400 shrink-0" />
                                                        <span className="text-sm font-bold text-slate-900">{m.brand} {m.model}</span>
                                                        {m.hasActiveContract && (
                                                            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                                                <ShieldCheck size={9} /> Contrato
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                                                        <span className="text-xs text-slate-500 font-mono">S/N: {m.serialNumber}</span>
                                                        {m.warrantyExpires && (
                                                            <span className={`flex items-center gap-1 text-[10px] font-semibold ${wok ? 'text-blue-600' : 'text-slate-400'}`}>
                                                                {wok ? <><ShieldCheck size={10} />En garantía</> : <><ShieldOff size={10} />Expirada</>}
                                                                <span className="text-slate-400">({new Date(m.warrantyExpires).toLocaleDateString('es-ES')})</span>
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Description */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Descripción del problema *</label>
                        <textarea
                            rows={3}
                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-slate-900"
                            placeholder="Describe brevemente la incidencia…"
                            value={description} onChange={e => setDescription(e.target.value)} required
                        />
                    </div>

                    {/* Severity */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Prioridad</label>
                        <div className="flex gap-2 flex-wrap">
                            {SEVERITY_OPTIONS.map(opt => (
                                <button key={opt.value} type="button" onClick={() => setSeverity(opt.value)}
                                    className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-colors ${severity === opt.value ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'}`}>
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tech assignment — tech_lead/admin only */}
                    {isTechLead && technicians.length > 0 && (
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Asignar técnico</label>
                            <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                                value={assignedTo} onChange={e => setAssignedTo(e.target.value)}>
                                <option value="">Sin asignar</option>
                                {technicians.map(t => <option key={t.id} value={t.id}>{t.name}{t.zone ? ` — ${t.zone}` : ''}</option>)}
                            </select>
                        </div>
                    )}

                    {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

                    <div className="flex justify-end gap-3 pt-1">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors">
                            Cancelar
                        </button>
                        <button type="submit" disabled={saving}
                            className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-700 disabled:opacity-50 transition-colors">
                            <AlertTriangle size={15} />
                            {saving ? 'Creando…' : 'Crear Incidencia'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
