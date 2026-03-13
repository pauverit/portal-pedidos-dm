import React, { useState, useEffect } from 'react';
import { X, ClipboardList, Loader } from 'lucide-react';
import { User as UserType, Machine } from '../types';
import { useMachines } from '../hooks/useMachines';
import { ClientSearchInput } from './ClientSearchInput';

interface NewWorkOrderModalProps {
    clients: UserType[];
    technicians: UserType[];
    currentUser: UserType;
    preselectedClientId?: string;
    preselectedMachineId?: string;
    preselectedIncidentId?: string;
    onClose: () => void;
    onSave: (data: {
        clientId: string;
        machineId?: string;
        incidentId?: string;
        assignedTo?: string;
        description: string;
        priority: string;
        incidentType?: string;
        estimatedMinutes?: number;
        scheduledAt?: string;
        createdBy: string;
    }) => Promise<void>;
}

const INCIDENT_TYPES = [
    'Instalación', 'Mantenimiento preventivo', 'Avería', 'Formación',
    'Configuración', 'Sustitución de piezas', 'Visita comercial', 'Otro',
];

export const NewWorkOrderModal: React.FC<NewWorkOrderModalProps> = ({
    clients, technicians, currentUser, preselectedClientId, preselectedMachineId, preselectedIncidentId,
    onClose, onSave
}) => {
    const [clientId, setClientId] = useState(preselectedClientId || '');
    const [machineId, setMachineId] = useState(preselectedMachineId || '');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState('normal');
    const [assignedTo, setAssignedTo] = useState('');
    const [incidentType, setIncidentType] = useState('');
    const [estimatedHours, setEstimatedHours] = useState(0);
    const [estimatedMins, setEstimatedMins] = useState(0);
    const [scheduledAt, setScheduledAt] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const { machines, loading: loadingMachines, loadByClient } = useMachines();
    const isTechLead = currentUser.role === 'tech_lead' || currentUser.role === 'admin';
    const clientList = clients.filter(u => u.role === 'client');

    useEffect(() => {
        if (clientId) loadByClient(clientId);
    }, [clientId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!clientId) { setError('Selecciona un cliente'); return; }
        if (!description.trim()) { setError('La descripción es obligatoria'); return; }
        setSaving(true);
        setError('');
        try {
            await onSave({
                clientId,
                machineId: machineId || undefined,
                incidentId: preselectedIncidentId || undefined,
                assignedTo: assignedTo || undefined,
                description: description.trim(),
                priority,
                incidentType: incidentType || undefined,
                estimatedMinutes: estimatedHours * 60 + estimatedMins || undefined,
                scheduledAt: scheduledAt || undefined,
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
                <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl z-10">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-indigo-100 rounded-lg"><ClipboardList size={16} className="text-indigo-600" /></div>
                        <h2 className="font-bold text-slate-900">Nuevo Parte de Trabajo</h2>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    {/* Client */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Cliente *</label>
                        <ClientSearchInput
                            clients={clients}
                            value={clientId}
                            onChange={id => { setClientId(id); setMachineId(''); }}
                            required
                        />
                    </div>

                    {/* Machine */}
                    {clientId && (
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                Activo / Máquina
                                {loadingMachines && <Loader size={11} className="inline ml-2 animate-spin text-slate-400" />}
                            </label>
                            <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                                value={machineId} onChange={e => setMachineId(e.target.value)}>
                                <option value="">Sin máquina específica</option>
                                {machines.map(m => <option key={m.id} value={m.id}>{m.brand} {m.model} — S/N: {m.serialNumber}</option>)}
                            </select>
                        </div>
                    )}

                    {/* Description */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Descripción *</label>
                        <textarea rows={3} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-slate-900"
                            placeholder="Trabajos a realizar…"
                            value={description} onChange={e => setDescription(e.target.value)} required />
                    </div>

                    {/* Incident type + Priority */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Tipo</label>
                            <select className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                                value={incidentType} onChange={e => setIncidentType(e.target.value)}>
                                <option value="">Seleccionar…</option>
                                {INCIDENT_TYPES.map(t => <option key={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Prioridad</label>
                            <select className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                                value={priority} onChange={e => setPriority(e.target.value)}>
                                <option value="low">Baja</option>
                                <option value="normal">Normal</option>
                                <option value="high">Alta</option>
                                <option value="urgent">Urgente</option>
                            </select>
                        </div>
                    </div>

                    {/* Duration */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Duración estimada</label>
                        <div className="flex items-center gap-2">
                            <input type="number" min={0} max={99}
                                className="w-20 border border-slate-200 rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-slate-900"
                                value={estimatedHours} onChange={e => setEstimatedHours(+e.target.value)} />
                            <span className="text-sm text-slate-500">h</span>
                            <input type="number" min={0} max={59} step={5}
                                className="w-20 border border-slate-200 rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-slate-900"
                                value={estimatedMins} onChange={e => setEstimatedMins(+e.target.value)} />
                            <span className="text-sm text-slate-500">min</span>
                        </div>
                    </div>

                    {/* Scheduled + Technician (tech_lead only) */}
                    <div className="grid grid-cols-1 gap-3">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Fecha programada</label>
                            <input type="datetime-local"
                                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                                value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
                        </div>
                        {isTechLead && (
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Asignar técnico</label>
                                <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                                    value={assignedTo} onChange={e => setAssignedTo(e.target.value)}>
                                    <option value="">Sin asignar</option>
                                    {technicians.map(t => <option key={t.id} value={t.id}>{t.name}{t.zone ? ` — ${t.zone}` : ''}</option>)}
                                </select>
                            </div>
                        )}
                    </div>

                    {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

                    <div className="flex justify-end gap-3 pt-1">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors">
                            Cancelar
                        </button>
                        <button type="submit" disabled={saving}
                            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                            <ClipboardList size={15} />
                            {saving ? 'Creando…' : 'Crear Parte'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
