import React, { useState } from 'react';
import { X, MapPin, Loader } from 'lucide-react';
import { User } from '../types';
import { ClientSearchInput } from './ClientSearchInput';

interface NewVisitModalProps {
    clients: User[];
    currentUser: User;
    preselectedClientId?: string;
    onClose: () => void;
    onSave: (data: { clientId: string; visitDate: string; notes?: string; nextAction?: string }) => Promise<void>;
}

export const NewVisitModal: React.FC<NewVisitModalProps> = ({
    clients, currentUser, preselectedClientId, onClose, onSave
}) => {
    const myClients = clients.filter(c =>
        c.role === 'client' &&
        (c.salesRep === currentUser.name || c.salesRepCode === currentUser.salesRepCode)
    );

    const [clientId, setClientId] = useState(preselectedClientId || '');
    const [visitDate, setVisitDate] = useState(() => new Date().toISOString().slice(0, 16));
    const [notes, setNotes] = useState('');
    const [nextAction, setNextAction] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!clientId) { setError('Selecciona un cliente'); return; }
        setSaving(true);
        setError('');
        try {
            await onSave({ clientId, visitDate, notes: notes || undefined, nextAction: nextAction || undefined });
        } catch (err: any) {
            setError(err.message || 'Error al guardar');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="bg-emerald-100 p-2 rounded-xl">
                            <MapPin size={18} className="text-emerald-700" />
                        </div>
                        <h2 className="text-base font-bold text-slate-900">Registrar Visita</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-900 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    {/* Client selector */}
                    <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Cliente *</label>
                        <ClientSearchInput
                            clients={clients}
                            value={clientId}
                            onChange={setClientId}
                            filterFn={c => c.role === 'client' && (c.salesRep === currentUser.name || c.salesRepCode === currentUser.salesRepCode)}
                            required
                        />
                    </div>

                    {/* Date & time */}
                    <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Fecha y hora *</label>
                        <input
                            type="datetime-local"
                            value={visitDate}
                            onChange={e => setVisitDate(e.target.value)}
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50"
                            required
                        />
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Notas / Resumen</label>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            rows={3}
                            placeholder="¿Qué se trató en la visita?"
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50 resize-none"
                        />
                    </div>

                    {/* Next action */}
                    <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Próxima acción</label>
                        <input
                            type="text"
                            value={nextAction}
                            onChange={e => setNextAction(e.target.value)}
                            placeholder="Ej: Enviar presupuesto el viernes"
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50"
                        />
                    </div>

                    {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex-1 bg-slate-900 text-white rounded-xl py-2.5 text-sm font-bold hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                        >
                            {saving ? <Loader size={14} className="animate-spin" /> : <MapPin size={14} />}
                            {saving ? 'Guardando...' : 'Guardar Visita'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
