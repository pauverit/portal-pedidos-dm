import React, { useState } from 'react';
import { UserPlus, Edit2, Wrench, Users, Save, X, Eye, EyeOff, Search, Trash2, ClipboardList, MapPin, ShieldCheck } from 'lucide-react';
import { User } from '../types';
import { supabase } from '../lib/supabase';
import { useToast } from './Toast';

interface AdminTechManagementProps {
    technicians: User[];
    onRefresh: () => Promise<void>;
}

export const AdminTechManagement: React.FC<AdminTechManagementProps> = ({
    technicians,
    onRefresh,
}) => {
    const [isAdding, setIsAdding] = useState(false);
    const [editingTech, setEditingTech] = useState<User | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [saving, setSaving] = useState(false);
    const [pendingDelete, setPendingDelete] = useState<User | null>(null);
    const { toast } = useToast();

    const [formData, setFormData] = useState({
        name: '',
        username: '',
        password: '',
        email: '',
        phone: '',
        zone: '',
        role: 'tech' as 'tech' | 'tech_lead',
    });

    const resetForm = () => {
        setFormData({ name: '', username: '', password: '', email: '', phone: '', zone: '', role: 'tech' });
        setIsAdding(false);
        setEditingTech(null);
        setShowPassword(false);
    };

    const startEdit = (tech: User) => {
        setEditingTech(tech);
        setFormData({
            name: tech.name,
            username: tech.username || '',
            password: '',
            email: tech.email,
            phone: tech.phone || '',
            zone: tech.zone || '',
            role: (tech.role === 'tech_lead' ? 'tech_lead' : 'tech'),
        });
        setIsAdding(true);
    };

    const filteredTechs = technicians.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.zone || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim() || !formData.username.trim()) {
            toast('Nombre y usuario son obligatorios', 'error');
            return;
        }
        setSaving(true);
        try {
            // If no email provided, generate an internal one to satisfy NOT NULL/UNIQUE constraint
            const email = formData.email.trim() || `${formData.username.trim()}@tech.internal`;

            const dataToSave: any = {
                company_name: formData.name,
                username: formData.username,
                email,
                phone: formData.phone || null,
                zone: formData.zone || null,
                role: formData.role,
                rappel_accumulated: 0,
            };
            if (formData.password) {
                dataToSave.password = formData.password;
            }

            if (editingTech) {
                const { error } = await supabase
                    .from('clients')
                    .update(dataToSave)
                    .eq('id', editingTech.id);
                if (error) throw error;
                toast('Técnico actualizado correctamente', 'success');
            } else {
                if (!formData.password) {
                    toast('La contraseña es obligatoria para nuevos técnicos', 'error');
                    setSaving(false);
                    return;
                }
                const { error } = await supabase
                    .from('clients')
                    .insert(dataToSave);
                if (error) throw error;
                toast('Técnico creado correctamente', 'success');
            }
            await onRefresh();
            resetForm();
        } catch (err: any) {
            toast('Error al guardar: ' + err.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!pendingDelete) return;
        try {
            const { error } = await supabase.from('clients').delete().eq('id', pendingDelete.id);
            if (error) throw error;
            toast(`${pendingDelete.name} eliminado`, 'success');
            await onRefresh();
        } catch (err: any) {
            toast('Error al eliminar: ' + err.message, 'error');
        } finally {
            setPendingDelete(null);
        }
    };

    const roleLabel = (role: string) => role === 'tech_lead' ? 'Jefe de Técnicos' : 'Técnico';
    const roleBadge = (role: string) =>
        role === 'tech_lead'
            ? 'bg-indigo-100 text-indigo-700'
            : 'bg-slate-100 text-slate-700';

    return (
        <div className="p-4 md:p-10 max-w-5xl mx-auto space-y-4">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Gestión de Técnicos</h1>
                    <p className="text-slate-500 mt-1">{technicians.length} técnico{technicians.length !== 1 ? 's' : ''} registrado{technicians.length !== 1 ? 's' : ''}</p>
                </div>
                {!isAdding && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-slate-700 transition-colors"
                    >
                        <UserPlus size={18} />
                        Nuevo Técnico
                    </button>
                )}
            </div>

            {/* Add / Edit Form */}
            {isAdding && (
                <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-base font-bold text-slate-900">
                            {editingTech ? `Editar — ${editingTech.name}` : 'Nuevo Técnico'}
                        </h2>
                        <button type="button" onClick={resetForm} className="text-slate-400 hover:text-slate-900">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Nombre completo *</label>
                            <input
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                                required
                                value={formData.name}
                                onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                                placeholder="Jose Luis Sánchez"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Usuario *</label>
                            <input
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                                required
                                value={formData.username}
                                onChange={e => setFormData(f => ({ ...f, username: e.target.value }))}
                                placeholder="jlsanchez"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                Contraseña {editingTech ? '(dejar vacío = no cambiar)' : '*'}
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                    value={formData.password}
                                    onChange={e => setFormData(f => ({ ...f, password: e.target.value }))}
                                    placeholder={editingTech ? 'Sin cambios' : 'Contraseña inicial'}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(s => !s)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Email</label>
                            <input
                                type="email"
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                                value={formData.email}
                                onChange={e => setFormData(f => ({ ...f, email: e.target.value }))}
                                placeholder="tecnico@empresa.com"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Teléfono</label>
                            <input
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                                value={formData.phone}
                                onChange={e => setFormData(f => ({ ...f, phone: e.target.value }))}
                                placeholder="600 000 000"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Zona / Delegación</label>
                            <input
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                                value={formData.zone}
                                onChange={e => setFormData(f => ({ ...f, zone: e.target.value }))}
                                placeholder="Andalucía, Levante…"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Rol</label>
                            <select
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                                value={formData.role}
                                onChange={e => setFormData(f => ({ ...f, role: e.target.value as 'tech' | 'tech_lead' }))}
                            >
                                <option value="tech">Técnico</option>
                                <option value="tech_lead">Jefe de Técnicos</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={resetForm} className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors">
                            Cancelar
                        </button>
                        <button type="submit" disabled={saving} className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-slate-700 disabled:opacity-50 transition-colors">
                            <Save size={16} />
                            {saving ? 'Guardando…' : 'Guardar'}
                        </button>
                    </div>
                </form>
            )}

            {/* Search */}
            <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                    className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                    placeholder="Buscar técnico por nombre, usuario o zona…"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Technician List */}
            <div className="space-y-3">
                {filteredTechs.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center text-slate-400">
                        No hay técnicos registrados aún.
                    </div>
                ) : (
                    filteredTechs.map(tech => (
                        <div key={tech.id} className="bg-white rounded-2xl border border-slate-100 p-5 flex flex-wrap items-center justify-between gap-4 hover:shadow-sm transition-shadow">
                            <div className="flex items-center gap-4">
                                <div className="bg-indigo-100 p-3 rounded-xl text-indigo-600">
                                    {tech.role === 'tech_lead' ? <ShieldCheck size={22} /> : <Wrench size={22} />}
                                </div>
                                <div>
                                    <p className="font-bold text-slate-900">{tech.name}</p>
                                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${roleBadge(tech.role)}`}>
                                            {roleLabel(tech.role)}
                                        </span>
                                        {tech.username && (
                                            <span className="text-xs text-slate-500">@{tech.username}</span>
                                        )}
                                        {tech.zone && (
                                            <span className="flex items-center gap-1 text-xs text-slate-500">
                                                <MapPin size={11} /> {tech.zone}
                                            </span>
                                        )}
                                        {tech.phone && (
                                            <span className="text-xs text-slate-500">{tech.phone}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => startEdit(tech)}
                                    className="p-2 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                                    title="Editar técnico"
                                >
                                    <Edit2 size={16} />
                                </button>
                                <button
                                    onClick={() => setPendingDelete(tech)}
                                    className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                    title="Eliminar técnico"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {pendingDelete && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
                        <h3 className="font-bold text-slate-900 text-base mb-2">¿Eliminar técnico?</h3>
                        <p className="text-slate-500 text-sm mb-5">
                            <span className="font-bold text-slate-900">{pendingDelete.name}</span> se eliminará del sistema. Esta acción no se puede deshacer.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setPendingDelete(null)} className="px-4 py-2 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors">
                                Cancelar
                            </button>
                            <button onClick={handleDelete} className="px-4 py-2 rounded-lg text-sm font-bold bg-red-600 text-white hover:bg-red-700 transition-colors">
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
