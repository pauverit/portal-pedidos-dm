import React, { useState } from 'react';
import { UserPlus, Edit2, TrendingUp, Users, ShoppingBag, Save, X, Eye, EyeOff, Search, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { User, Order } from '../types';
import { supabase } from '../lib/supabase';
import { useToast } from './Toast';

interface AdminSalesManagementProps {
    salesReps: User[];
    clients: User[];
    orders: Order[];
    onRefresh: () => Promise<void>;
    formatCurrency: (value: number) => string;
}

export const AdminSalesManagement: React.FC<AdminSalesManagementProps> = ({
    salesReps,
    clients,
    orders,
    onRefresh,
    formatCurrency
}) => {
    const [isAdding, setIsAdding] = useState(false);
    const [editingRep, setEditingRep] = useState<User | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedRep, setExpandedRep] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [saving, setSaving] = useState(false);
    const [pendingDeleteRep, setPendingDeleteRep] = useState<User | null>(null);
    const { toast } = useToast();

    const [formData, setFormData] = useState({
        name: '',
        username: '',
        password: '',
        email: '',
        phone: '',
        salesRepCode: ''
    });

    const filteredReps = salesReps.filter(r =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.salesRepCode || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getRepStats = (rep: User) => {
        const repClients = clients.filter(c =>
            c.role === 'client' &&
            (c.salesRep === rep.name || c.salesRepCode === rep.salesRepCode)
        );
        const repClientIds = new Set(repClients.map(c => c.id));
        const repOrders = orders.filter(o => repClientIds.has(o.userId));

        return {
            clientsCount: repClients.length,
            ordersCount: repOrders.length,
            totalSales: repOrders.reduce((sum, o) => sum + o.total, 0),
            totalRappel: repClients.reduce((sum, c) => sum + (c.rappelAccumulated || 0), 0),
            clientList: repClients
        };
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const dataToSave = {
                company_name: formData.name,
                username: formData.username,
                password: formData.password,
                email: formData.email,
                phone: formData.phone,
                sales_rep_code: formData.salesRepCode,
                role: 'sales'
            };

            if (editingRep) {
                const { error } = await supabase
                    .from('clients')
                    .update(dataToSave)
                    .eq('id', editingRep.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('clients')
                    .insert([dataToSave]);
                if (error) throw error;
            }

            await onRefresh();
            setIsAdding(false);
            setEditingRep(null);
            setFormData({ name: '', username: '', password: '', email: '', phone: '', salesRepCode: '' });
            toast(editingRep ? 'Comercial actualizado' : 'Comercial creado correctamente', 'success');
        } catch (error: any) {
            toast('Error: ' + error.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (rep: User) => {
        setPendingDeleteRep(rep);
    };

    const confirmDelete = async () => {
        if (!pendingDeleteRep) return;
        try {
            const { error } = await supabase
                .from('clients')
                .delete()
                .eq('id', pendingDeleteRep.id);
            if (error) throw error;
            await onRefresh();
            toast('Comercial eliminado', 'success');
        } catch (error: any) {
            toast('Error al eliminar comercial: ' + error.message, 'error');
        } finally {
            setPendingDeleteRep(null);
        }
    };

    const startEdit = (rep: User) => {
        setEditingRep(rep);
        setFormData({
            name: rep.name,
            username: rep.username || '',
            password: rep.password || '',
            email: rep.email || '',
            phone: rep.phone || '',
            salesRepCode: rep.salesRepCode || ''
        });
        setIsAdding(true);
    };

    return (
        <div className="p-4 md:p-10 max-w-7xl mx-auto space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-slate-900">Gestión de Comerciales</h1>
                    <p className="text-slate-500 text-sm">Administra el equipo de ventas y supervisa su rendimiento.</p>
                </div>
                <button
                    onClick={() => {
                        setEditingRep(null);
                        setFormData({ name: '', username: '', password: '', email: '', phone: '', salesRepCode: '' });
                        setIsAdding(true);
                    }}
                    className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-800 transition-colors"
                >
                    <UserPlus size={18} />
                    Nuevo Comercial
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o código..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-bold">
                            <tr>
                                <th className="px-3 py-2">Nombre / Código</th>
                                <th className="px-3 py-2">Usuario</th>
                                <th className="px-4 py-4 text-center">Clientes</th>
                                <th className="px-4 py-4 text-center">Pedidos</th>
                                <th className="px-3 py-2 text-right">Ventas</th>
                                <th className="px-3 py-2 text-right">Rappels</th>
                                <th className="px-3 py-2 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredReps.map(rep => {
                                const stats = getRepStats(rep);
                                const isExpanded = expandedRep === rep.id;

                                return (
                                    <React.Fragment key={rep.id}>
                                        <tr className="hover:bg-slate-50/80 transition-colors">
                                            <td className="px-3 py-2">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => setExpandedRep(isExpanded ? null : rep.id)}
                                                        className="text-slate-400 hover:text-slate-900"
                                                    >
                                                        {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                                    </button>
                                                    <div>
                                                        <p className="font-bold text-slate-900">{rep.name}</p>
                                                        <p className="text-xs text-slate-400 font-mono">{rep.salesRepCode || 'SIN CÓDIGO'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 text-slate-600">@{rep.username}</td>
                                            <td className="px-4 py-4 text-center">
                                                <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs font-bold">
                                                    <Users size={12} /> {stats.clientsCount}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full text-xs font-bold">
                                                    <ShoppingBag size={12} /> {stats.ordersCount}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-right font-bold text-slate-900">{formatCurrency(stats.totalSales)}</td>
                                            <td className="px-3 py-2 text-right">
                                                <span className="text-purple-600 font-bold">{formatCurrency(stats.totalRappel)}</span>
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                                <div className="flex justify-end gap-1">
                                                    <button
                                                        onClick={() => startEdit(rep)}
                                                        className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                                                        title="Editar"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(rep)}
                                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        {isExpanded && (
                                            <tr className="bg-slate-50/30">
                                                <td colSpan={7} className="px-12 py-4">
                                                    <div className="border-l-2 border-slate-200 pl-6 space-y-4">
                                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Clientes Asignados</h4>
                                                        {stats.clientList.length > 0 ? (
                                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                                {stats.clientList.map(client => (
                                                                    <div key={client.id} className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm flex justify-between items-center">
                                                                        <div>
                                                                            <p className="text-sm font-bold text-slate-900">{client.name}</p>
                                                                            <p className="text-xs text-slate-400">@{client.username}</p>
                                                                        </div>
                                                                        <div className="text-right">
                                                                            <p className="text-xs font-bold text-green-600">{formatCurrency(client.rappelAccumulated)}</p>
                                                                            <p className="text-[10px] text-slate-400 uppercase">Rappel</p>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <p className="text-xs text-slate-400">Este comercial no tiene clientes asignados.</p>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                            {filteredReps.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                                        No se han encontrado comerciales que coincidan con la búsqueda.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isAdding && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden">
                        <div className="bg-slate-900 text-white px-3 py-2 flex items-center justify-between">
                            <h2 className="font-bold text-base">{editingRep ? 'Editar Comercial' : 'Nuevo Comercial'}</h2>
                            <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-4 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Nombre Completo *</label>
                                    <input
                                        required
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                                        placeholder="Ej: Javier García"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Código Comercial *</label>
                                    <input
                                        required
                                        value={formData.salesRepCode}
                                        onChange={e => setFormData({ ...formData, salesRepCode: e.target.value })}
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                                        placeholder="Ej: javi5"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Usuario (Login) *</label>
                                    <input
                                        required
                                        value={formData.username}
                                        onChange={e => setFormData({ ...formData, username: e.target.value.toLowerCase() })}
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                                        placeholder="Ej: javi5"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Contraseña *</label>
                                    <div className="relative">
                                        <input
                                            required
                                            type={showPassword ? 'text' : 'password'}
                                            value={formData.password}
                                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none"
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
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsAdding(false)}
                                    className="px-4 py-2 text-sm text-slate-500 hover:text-slate-800 font-bold"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-green-700 disabled:opacity-50 transition-colors shadow-lg shadow-green-600/20"
                                >
                                    <Save size={18} />
                                    {saving ? 'Guardando...' : 'Guardar Comercial'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Inline confirm modal for rep deletion */}
            {pendingDeleteRep && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 p-6">
                        <h3 className="text-base font-bold text-slate-900 mb-2">¿Eliminar comercial?</h3>
                        <p className="text-sm text-slate-600 mb-6">
                            Esto eliminará a <strong>{pendingDeleteRep.name}</strong> permanentemente. Esta acción no se puede deshacer.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setPendingDeleteRep(null)}
                                className="px-4 py-2 text-sm text-slate-500 hover:text-slate-800 font-bold"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-lg transition-colors"
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
