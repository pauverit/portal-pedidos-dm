import React, { useState } from 'react';
import { X, Save, Eye, EyeOff, UserCircle } from 'lucide-react';
import { User } from '../types';
import { useToast } from './Toast';

interface ProfileEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser: User;
    onSaveProfile: (updatedData: Partial<User>) => Promise<void>;
}

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({
    isOpen,
    onClose,
    currentUser,
    onSaveProfile
}) => {
    const [editForm, setEditForm] = useState<Partial<User>>({
        name: currentUser.name || '',
        email: currentUser.email || '',
        phone: currentUser.phone || '',
        delegation: currentUser.delegation || '',
        password: currentUser.password || '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();

    if (!isOpen) return null;

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSaveProfile(editForm);
            onClose();
        } catch (e) {
            console.error(e);
            toast('Error al guardar el perfil', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden">
                <div className="bg-slate-900 text-white px-3 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-slate-800 p-2 rounded-lg">
                            <UserCircle size={24} className="text-slate-400" />
                        </div>
                        <div>
                            <h2 className="font-bold text-base leading-tight">Editar Perfil</h2>
                            <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold">
                                {currentUser.role === 'admin' ? 'Administrador' : currentUser.role === 'sales' ? 'Comercial' : 'Cliente B2B'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className={`p-6 space-y-4 max-h-[70vh] overflow-y-auto relative ${saving ? 'opacity-50 pointer-events-none' : ''}`}>
                    {saving && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/20 z-10">
                            <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="col-span-1 md:col-span-2">
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Empresa / Nombre *</label>
                            <input
                                value={editForm.name || ''}
                                onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                                placeholder="Nombre de la empresa o usuario"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Email</label>
                            <input
                                type="email"
                                value={editForm.email || ''}
                                onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                                placeholder="ejemplo@correo.com"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Teléfono</label>
                            <input
                                value={editForm.phone || ''}
                                onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                                placeholder="600 000 000"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Delegación</label>
                            <input
                                value={editForm.delegation || ''}
                                onChange={e => setEditForm(p => ({ ...p, delegation: e.target.value }))}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                                placeholder="Granada, Madrid, etc."
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Contraseña</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={editForm.password || ''}
                                    onChange={e => setEditForm(p => ({ ...p, password: e.target.value }))}
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none transition-all pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mt-2">
                        <p className="text-xs font-bold text-slate-500 uppercase mb-2 tracking-wider">Información de cuenta</p>
                        <div className="grid grid-cols-2 gap-y-2">
                            <div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">Usuario</p>
                                <p className="text-sm font-medium text-slate-700">@{currentUser.username}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">Comercial</p>
                                <p className="text-sm font-medium text-slate-700">{currentUser.salesRep || 'No asignado'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-3 py-2 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || !editForm.name}
                        className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-lg flex items-center gap-2 disabled:opacity-50 transition-all shadow-md active:scale-95"
                    >
                        <Save size={16} />
                        {saving ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </div>
        </div>
    );
};
