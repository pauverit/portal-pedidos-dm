import React, { useState } from 'react';
import { UserPlus, Save, Eye, EyeOff } from 'lucide-react';
import { User } from '../types';

interface AdminNewClientProps {
    onSave: (clientData: any) => Promise<void>;
    onBack: () => void;
    isAdmin?: boolean;
    salesReps: User[];
}

export const AdminNewClient: React.FC<AdminNewClientProps> = ({ onSave, onBack, isAdmin = true, salesReps }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        username: '',
        password: '',
        salesRep: '',
        delegation: '',
        rappelThreshold: 800,
        hidePrices: false
    });
    const [showPassword, setShowPassword] = useState(false);
    const [saving, setSaving] = useState(false);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.username || !formData.password || (isAdmin && !formData.salesRep)) {
            alert('Usuario, contraseña y comercial son obligatorios');
            return;
        }
        setSaving(true);
        try {
            await onSave(formData);
            onBack();
        } catch (error: any) {
            alert('Error: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-6 md:p-10 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Alta de Nuevo Cliente</h2>
            <form onSubmit={handleSave} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Nombre de Empresa *</label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
                            placeholder="Ej: Impresiones Digitales SL"
                        />
                    </div>
                    {isAdmin && (
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Comercial Asignado *</label>
                            <select
                                required
                                value={formData.salesRep}
                                onChange={e => setFormData({ ...formData, salesRep: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none bg-white"
                            >
                                <option value="">— Seleccionar Comercial —</option>
                                {salesReps.map(rep => (
                                    <option key={rep.id} value={rep.name}>{rep.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Usuario (Login) *</label>
                        <input
                            type="text"
                            required
                            value={formData.username}
                            onChange={e => setFormData({ ...formData, username: e.target.value.toLowerCase().trim() })}
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
                            placeholder="Ej: imp_digital"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Contraseña Temporal *</label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                required
                                value={formData.password}
                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
                                placeholder="Min. 6 caracteres"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Email de contacto</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Teléfono</label>
                        <input
                            type="text"
                            value={formData.phone}
                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
                        />
                    </div>
                </div>

                <div className="pt-4 flex items-center justify-end gap-4">
                    <button
                        type="button"
                        onClick={onBack}
                        className="px-6 py-2 text-slate-500 font-bold hover:text-slate-900"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-8 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
                    >
                        <Save size={18} />
                        {saving ? 'Creando...' : 'Registrar Cliente'}
                    </button>
                </div>
            </form>
        </div>
    );
};
