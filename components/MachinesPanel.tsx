import React, { useState, useRef, useEffect } from 'react';
import {
    Plus, Search, Cpu, ShieldCheck, ShieldOff, ArrowLeft,
    Camera, Loader, Save, X, Trash2, AlertTriangle, CheckCircle,
    Calendar, User, Edit2, ExternalLink
} from 'lucide-react';
import { Machine, User as UserType } from '../types';
import { useMachines } from '../hooks/useMachines';
import { compressImage } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { useToast } from './Toast';
import { ClientSearchInput } from './ClientSearchInput';

interface MachinesPanelProps {
    currentUser: UserType;
    clients: UserType[];
    onNewIncident?: (machineId: string, clientId: string) => void;
}

const isWarrantyValid = (d?: string) => d ? new Date(d) >= new Date() : false;

const EMPTY_FORM = {
    clientId: '', brand: '', model: '', serialNumber: '',
    installDate: '', warrantyExpires: '', notes: '',
};

// ─── Image upload helper ────────────────────────────────────────────────────

const uploadMachineImage = async (file: File, machineId: string): Promise<string> => {
    const compressed = await compressImage(file, 1024, 0.72);
    const ext = 'jpg';
    const path = `${machineId}.${ext}`;
    const { error } = await supabase.storage
        .from('machine-images')
        .upload(path, compressed, { upsert: true, contentType: 'image/jpeg' });
    if (error) throw error;
    const { data } = supabase.storage.from('machine-images').getPublicUrl(path);
    return data.publicUrl + `?t=${Date.now()}`;
};

// ─── Machine card thumbnail ─────────────────────────────────────────────────

const MachineThumbnail: React.FC<{ src?: string; size?: number }> = ({ src, size = 48 }) => (
    src
        ? <img src={src} alt="activo" className="rounded-lg object-cover bg-slate-100" style={{ width: size, height: size }} />
        : <div className="rounded-lg bg-slate-100 flex items-center justify-center" style={{ width: size, height: size }}>
            <Cpu size={size * 0.45} className="text-slate-300" />
        </div>
);

// ─── Detail / Edit form ─────────────────────────────────────────────────────

interface MachineDetailProps {
    machine?: Machine;              // undefined = new machine
    clients: UserType[];
    currentUser: UserType;
    isAdmin: boolean;
    onBack: () => void;
    onSaved: () => void;
    onNewIncident?: (machineId: string, clientId: string) => void;
}

const MachineDetail: React.FC<MachineDetailProps> = ({
    machine, clients, currentUser, isAdmin, onBack, onSaved, onNewIncident
}) => {
    const [form, setForm] = useState({
        clientId: machine?.clientId || '',
        brand: machine?.brand || '',
        model: machine?.model || '',
        serialNumber: machine?.serialNumber || '',
        installDate: machine?.installDate || '',
        warrantyExpires: machine?.warrantyExpires || '',
        notes: machine?.notes || '',
    });
    const [imagePreview, setImagePreview] = useState<string | undefined>(machine?.imageUrl);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [saving, setSaving] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();
    const { createMachine, updateMachine } = useMachines();
    const isNew = !machine;
    const clientList = clients.filter(u => u.role === 'client');

    const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setImageFile(f);
        setImagePreview(URL.createObjectURL(f));
        e.target.value = '';
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.clientId) { toast('Selecciona un cliente', 'error'); return; }
        if (!form.serialNumber.trim()) { toast('El número de serie es obligatorio', 'error'); return; }
        setSaving(true);
        try {
            let imageUrl: string | undefined;

            if (isNew) {
                await createMachine({
                    clientId: form.clientId,
                    brand: form.brand,
                    model: form.model,
                    serialNumber: form.serialNumber,
                    installDate: form.installDate || undefined,
                    warrantyExpires: form.warrantyExpires || undefined,
                    notes: form.notes || undefined,
                });
                // After create, fetch the new machine id to upload image
                if (imageFile) {
                    const { data: newRow } = await supabase
                        .from('machines')
                        .select('id')
                        .eq('serial_number', form.serialNumber)
                        .single();
                    if (newRow?.id) {
                        imageUrl = await uploadMachineImage(imageFile, newRow.id);
                        await supabase.from('machines').update({ image_url: imageUrl }).eq('id', newRow.id);
                    }
                }
                toast('Activo registrado correctamente', 'success');
            } else {
                if (imageFile) {
                    imageUrl = await uploadMachineImage(imageFile, machine.id);
                }
                await updateMachine(machine.id, {
                    brand: form.brand,
                    model: form.model,
                    serialNumber: form.serialNumber,
                    installDate: form.installDate || undefined,
                    warrantyExpires: form.warrantyExpires || undefined,
                    notes: form.notes || undefined,
                    ...(imageUrl ? { imageUrl } : {}),
                });
                if (imageUrl) {
                    await supabase.from('machines').update({ image_url: imageUrl }).eq('id', machine.id);
                }
                toast('Activo actualizado', 'success');
            }
            onSaved();
        } catch (err: any) {
            toast('Error al guardar: ' + err.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const warrantyOk = isWarrantyValid(form.warrantyExpires);

    return (
        <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-4">
            <div className="flex items-center gap-3">
                <button onClick={onBack} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 shrink-0">
                    <ArrowLeft size={18} />
                </button>
                <div>
                    <h1 className="text-lg font-black text-slate-900">{isNew ? 'Nuevo Activo' : `${machine.brand} ${machine.model}`}</h1>
                    {!isNew && <p className="text-xs text-slate-400 font-mono mt-0.5">S/N {machine.serialNumber}</p>}
                </div>
                {!isNew && onNewIncident && (
                    <button
                        onClick={() => onNewIncident(machine.id, machine.clientId)}
                        className="ml-auto flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-orange-600 transition-colors"
                    >
                        <AlertTriangle size={14} />
                        Nueva Incidencia
                    </button>
                )}
            </div>

            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Photo */}
                <div className="md:col-span-1 flex flex-col items-center gap-3">
                    <div
                        className="w-full aspect-square max-w-[200px] rounded-2xl border-2 border-dashed border-slate-200 overflow-hidden cursor-pointer hover:border-slate-400 transition-colors relative group bg-slate-50"
                        onClick={() => fileRef.current?.click()}
                    >
                        {imagePreview
                            ? <img src={imagePreview} alt="activo" className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 gap-2">
                                <Camera size={32} />
                                <p className="text-xs">Añadir foto</p>
                            </div>}
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Camera size={28} className="text-white" />
                        </div>
                    </div>
                    <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImage} />
                    <p className="text-[10px] text-slate-400 text-center">Se comprime automáticamente<br />antes de subir (máx. ~200 KB)</p>
                </div>

                {/* Fields */}
                <div className="md:col-span-2 space-y-4">
                    {/* Client */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Cliente *</label>
                        <ClientSearchInput
                            clients={clients}
                            value={form.clientId}
                            onChange={id => setForm(f => ({ ...f, clientId: id }))}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { label: 'Marca', key: 'brand', placeholder: 'HP, Canon…' },
                            { label: 'Modelo', key: 'model', placeholder: 'DesignJet T650' },
                        ].map(f => (
                            <div key={f.key}>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">{f.label}</label>
                                <input className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                                    placeholder={f.placeholder}
                                    value={(form as any)[f.key]}
                                    onChange={e => setForm(fo => ({ ...fo, [f.key]: e.target.value }))} />
                            </div>
                        ))}
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Nº de Serie *</label>
                        <input className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-900"
                            placeholder="SN12345678"
                            value={form.serialNumber}
                            onChange={e => setForm(f => ({ ...f, serialNumber: e.target.value }))}
                            required />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Fecha instalación</label>
                            <input type="date" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                                value={form.installDate} onChange={e => setForm(f => ({ ...f, installDate: e.target.value }))} />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Final garantía</label>
                            <input type="date" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                                value={form.warrantyExpires} onChange={e => setForm(f => ({ ...f, warrantyExpires: e.target.value }))} />
                        </div>
                    </div>

                    {form.warrantyExpires && (
                        <div className={`flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl ${warrantyOk ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>
                            {warrantyOk ? <ShieldCheck size={14} /> : <ShieldOff size={14} />}
                            {warrantyOk ? 'En garantía' : 'Garantía expirada'} — {new Date(form.warrantyExpires).toLocaleDateString('es-ES')}
                        </div>
                    )}

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Descripción / Notas</label>
                        <textarea rows={3} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-slate-900"
                            placeholder="Observaciones, accesorios instalados, configuración especial…"
                            value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onBack} className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors">
                            Cancelar
                        </button>
                        <button type="submit" disabled={saving}
                            className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-700 disabled:opacity-50 transition-colors">
                            {saving ? <Loader size={15} className="animate-spin" /> : <Save size={15} />}
                            {saving ? 'Guardando…' : 'Guardar Activo'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

// ─── List view ───────────────────────────────────────────────────────────────

export const MachinesPanel: React.FC<MachinesPanelProps> = ({ currentUser, clients, onNewIncident }) => {
    const [view, setView] = useState<'list' | 'detail'>('list');
    const [selected, setSelected] = useState<Machine | null>(null);
    const [search, setSearch] = useState('');
    const [clientFilter, setClientFilter] = useState('');
    const { machines, loading, loadAll } = useMachines();
    const isAdmin = currentUser.role === 'admin' || currentUser.role === 'tech_lead';
    const clientMap: Record<string, string> = {};
    clients.forEach(c => { clientMap[c.id] = c.name; });
    useEffect(() => { loadAll(); }, []);

    const filtered = machines.filter(m => {
        if (clientFilter && m.clientId !== clientFilter) return false;
        const q = search.toLowerCase();
        return !q || [m.brand, m.model, m.serialNumber, clientMap[m.clientId] || ''].some(v => v.toLowerCase().includes(q));
    });

    if (view === 'detail') {
        return <MachineDetail
            machine={selected || undefined}
            clients={clients}
            currentUser={currentUser}
            isAdmin={isAdmin}
            onBack={() => { setView('list'); setSelected(null); }}
            onSaved={() => { setView('list'); loadAll(); }}
            onNewIncident={onNewIncident}
        />;
    }

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-black text-slate-900">Activos</h1>
                    <p className="text-slate-400 text-sm mt-0.5">{filtered.length} activo{filtered.length !== 1 ? 's' : ''} registrado{filtered.length !== 1 ? 's' : ''}</p>
                </div>
                <button
                    onClick={() => { setSelected(null); setView('detail'); }}
                    className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-700 transition-colors"
                >
                    <Plus size={16} /> Nuevo Activo
                </button>
            </div>

            {/* Search + Client filter */}
            <div className="flex flex-wrap gap-2">
                <div className="relative flex-1 min-w-[200px]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        className="w-full pl-8 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                        placeholder="Buscar por marca, modelo, nº serie…"
                        value={search} onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div className="min-w-[220px] flex-1 md:flex-none">
                    <ClientSearchInput
                        clients={clients}
                        value={clientFilter}
                        onChange={setClientFilter}
                        placeholder="Filtrar por cliente…"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="hidden md:grid grid-cols-[56px_80px_1fr_1fr_1fr_1fr_80px] gap-3 px-5 py-3 bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <div></div>
                    <div>Ref.</div>
                    <div>Nombre / Modelo</div>
                    <div>Nº Serie</div>
                    <div>Cliente</div>
                    <div>Garantía</div>
                    <div></div>
                </div>

                {loading ? (
                    <div className="py-16 text-center text-slate-400">
                        <Loader size={22} className="animate-spin mx-auto mb-2 opacity-40" />Cargando activos…
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="py-16 text-center text-slate-400">
                        <Cpu size={28} className="mx-auto mb-3 opacity-30" />
                        <p className="font-medium">Sin activos registrados</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {filtered.map((m, idx) => {
                            const wok = isWarrantyValid(m.warrantyExpires);
                            return (
                                <button
                                    key={m.id}
                                    onClick={() => { setSelected(m); setView('detail'); }}
                                    className="w-full text-left hover:bg-slate-50 transition-colors"
                                >
                                    {/* Mobile: tarjeta compacta */}
                                    <div className="md:hidden flex items-center gap-3 px-3 py-2">
                                        <MachineThumbnail src={m.imageUrl} size={36} />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="font-bold text-slate-900 text-sm truncate">{m.brand} {m.model}</span>
                                                {m.warrantyExpires ? (
                                                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold shrink-0 ${wok ? 'text-blue-600' : 'text-slate-400'}`}>
                                                        {wok ? <ShieldCheck size={11} /> : <ShieldOff size={11} />}
                                                        {new Date(m.warrantyExpires).toLocaleDateString('es-ES')}
                                                    </span>
                                                ) : null}
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="font-mono text-xs text-slate-400">{m.serialNumber}</span>
                                                <span className="text-slate-300">·</span>
                                                <span className="text-xs text-slate-500 truncate">{clientMap[m.clientId] || '—'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Desktop: fila en grid */}
                                    <div className="hidden md:grid grid-cols-[56px_80px_1fr_1fr_1fr_1fr_80px] gap-3 px-5 py-3 items-center group">
                                        <MachineThumbnail src={m.imageUrl} size={40} />
                                        <span className="font-mono text-[11px] text-slate-400">ACT{String(idx + 1).padStart(5, '0')}</span>
                                        <div>
                                            <p className="font-bold text-slate-900 text-sm">{m.brand} {m.model}</p>
                                        </div>
                                        <span className="font-mono text-xs text-slate-500">{m.serialNumber}</span>
                                        <span className="text-sm text-slate-600 truncate">{clientMap[m.clientId] || '—'}</span>
                                        <div>
                                            {m.warrantyExpires ? (
                                                <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${wok ? 'text-blue-600' : 'text-slate-400'}`}>
                                                    {wok ? <ShieldCheck size={12} /> : <ShieldOff size={12} />}
                                                    {new Date(m.warrantyExpires).toLocaleDateString('es-ES')}
                                                </span>
                                            ) : <span className="text-[11px] text-slate-300">—</span>}
                                        </div>
                                        <div className="flex justify-end">
                                            <Edit2 size={14} className="text-slate-200 group-hover:text-slate-500 transition-colors" />
                                        </div>
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
