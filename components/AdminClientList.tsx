import React, { useState } from 'react';
import { Edit2, CheckCircle, AlertCircle, Clock, ShoppingBag, TrendingUp, X, Save, Eye, EyeOff } from 'lucide-react';
import { User, Order } from '../types';
import { SALES_REPS } from '../constants';

interface AdminClientListProps {
    clients: User[];
    orders: Order[];
    onEditClient: (client: User) => void;
    onSaveClient: (client: User) => Promise<void>;
    formatCurrency: (value: number) => string;
}

export const AdminClientList: React.FC<AdminClientListProps> = ({
    clients,
    orders,
    onEditClient,
    onSaveClient,
    formatCurrency
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [editingClient, setEditingClient] = useState<User | null>(null);
    const [editForm, setEditForm] = useState<Partial<User>>({});
    const [showPassword, setShowPassword] = useState(false);
    const [saving, setSaving] = useState(false);

    const filteredClients = clients
        .filter(c => c.role === 'client')
        .filter(c =>
            !searchQuery ||
            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (c.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (c.salesRep || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (c.delegation || '').toLowerCase().includes(searchQuery.toLowerCase())
        );

    const getClientOrders = (clientId: string) =>
        orders.filter(o => o.userId === clientId);

    const startEdit = (client: User) => {
        setEditingClient(client);
        setEditForm({
            name: client.name,
            email: client.email,
            phone: client.phone || '',
            salesRep: client.salesRep || '',
            delegation: client.delegation || '',
            rappelThreshold: client.rappelThreshold || 800,
            hidePrices: client.hidePrices || false,
            isActive: client.isActive ?? true,
            mustChangePassword: client.mustChangePassword ?? false,
        });
    };

    const handleSave = async () => {
        if (!editingClient) return;
        if (!editForm.salesRep) {
            alert('El comercial asignado es obligatorio.');
            return;
        }
        setSaving(true);
        try {
            await onSaveClient({ ...editingClient, ...editForm });
            setEditingClient(null);
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="relative">
            {/* Search */}
            <div className="mb-4">
                <input
                    type="text"
                    placeholder="Buscar por empresa, usuario, comercial o delegación..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full max-w-md pl-4 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                />
            </div>

            {/* Client Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-4 py-3">Empresa / Usuario</th>
                                <th className="px-4 py-3">Comercial</th>
                                <th className="px-4 py-3 text-center">Estado</th>
                                <th className="px-4 py-3 text-center">Contraseña</th>
                                <th className="px-4 py-3 text-center">Pedidos</th>
                                <th className="px-4 py-3 text-center">Cupones</th>
                                <th className="px-4 py-3 text-right">Rappel</th>
                                <th className="px-4 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredClients.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-4 py-8 text-center text-slate-400 text-sm">
                                        No hay clientes registrados
                                    </td>
                                </tr>
                            )}
                            {filteredClients.map(client => {
                                const clientOrders = getClientOrders(client.id);
                                const totalSpent = clientOrders.reduce((s, o) => s + o.total, 0);
                                const isActive = client.isActive ?? !client.mustChangePassword;
                                const passwordChanged = !(client.mustChangePassword ?? false);

                                return (
                                    <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="font-semibold text-slate-900">{client.name}</div>
                                            <div className="text-xs text-slate-400">@{client.username}</div>
                                            {client.delegation && (
                                                <div className="text-xs text-slate-400">{client.delegation}</div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {client.salesRep ? (
                                                <span className="text-slate-700 font-medium">{client.salesRep}</span>
                                            ) : (
                                                <span className="text-red-500 text-xs font-bold">Sin asignar ⚠️</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {isActive ? (
                                                <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full">
                                                    <CheckCircle size={11} /> Activo
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded-full">
                                                    <Clock size={11} /> Pendiente
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {passwordChanged ? (
                                                <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full">
                                                    <CheckCircle size={11} /> Cambiada
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 text-xs font-bold px-2 py-1 rounded-full">
                                                    <AlertCircle size={11} /> Temporal
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="font-bold text-slate-900">{clientOrders.length}</div>
                                            {totalSpent > 0 && (
                                                <div className="text-xs text-slate-400">{formatCurrency(totalSpent)}</div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {client.usedCoupons && client.usedCoupons.length > 0 ? (
                                                <div className="flex flex-col gap-0.5">
                                                    {client.usedCoupons.map(coupon => (
                                                        <span key={coupon} className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 text-[10px] font-bold px-1.5 py-0.5 rounded">
                                                            {coupon}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-slate-300 text-xs">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className={`font-bold ${client.rappelAccumulated > 0 ? 'text-green-600' : 'text-slate-400'}`}>
                                                {formatCurrency(client.rappelAccumulated)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => startEdit(client)}
                                                className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                                                title="Editar cliente"
                                            >
                                                <Edit2 size={15} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Modal */}
            {editingClient && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden">
                        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
                            <div>
                                <h2 className="font-bold text-lg">Editar Cliente</h2>
                                <p className="text-slate-400 text-sm">{editingClient.name}</p>
                            </div>
                            <button onClick={() => setEditingClient(null)} className="text-slate-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Empresa *</label>
                                    <input
                                        value={editForm.name || ''}
                                        onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Email</label>
                                    <input
                                        value={editForm.email || ''}
                                        onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))}
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Teléfono</label>
                                    <input
                                        value={editForm.phone || ''}
                                        onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))}
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Delegación</label>
                                    <input
                                        value={editForm.delegation || ''}
                                        onChange={e => setEditForm(p => ({ ...p, delegation: e.target.value }))}
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Comercial Asignado *</label>
                                <select
                                    value={editForm.salesRep || ''}
                                    onChange={e => setEditForm(p => ({ ...p, salesRep: e.target.value }))}
                                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none ${!editForm.salesRep ? 'border-red-300 bg-red-50' : 'border-slate-300'}`}
                                >
                                    <option value="">— Seleccionar Comercial —</option>
                                    {Object.entries(SALES_REPS).map(([code, name]) => (
                                        <option key={code} value={name}>{name}</option>
                                    ))}
                                </select>
                                {!editForm.salesRep && (
                                    <p className="text-xs text-red-500 mt-1">⚠️ El comercial es obligatorio</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Rappel Umbral (€)</label>
                                <input
                                    type="number"
                                    value={editForm.rappelThreshold || 800}
                                    onChange={e => setEditForm(p => ({ ...p, rappelThreshold: Number(e.target.value) }))}
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                                />
                            </div>

                            <div className="flex gap-4 flex-wrap pt-1">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={editForm.hidePrices || false}
                                        onChange={e => setEditForm(p => ({ ...p, hidePrices: e.target.checked }))}
                                        className="w-4 h-4 rounded"
                                    />
                                    <span className="text-sm text-slate-700">Ocultar precios</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={editForm.isActive || false}
                                        onChange={e => setEditForm(p => ({ ...p, isActive: e.target.checked }))}
                                        className="w-4 h-4 rounded"
                                    />
                                    <span className="text-sm text-slate-700">Cuenta activa</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={editForm.mustChangePassword || false}
                                        onChange={e => setEditForm(p => ({ ...p, mustChangePassword: e.target.checked }))}
                                        className="w-4 h-4 rounded"
                                    />
                                    <span className="text-sm text-slate-700">Forzar cambio de clave</span>
                                </label>
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
                            <button
                                onClick={() => setEditingClient(null)}
                                className="px-4 py-2 text-sm text-slate-500 hover:text-slate-800"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving || !editForm.salesRep}
                                className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white font-bold text-sm rounded-lg flex items-center gap-2 disabled:opacity-50 transition-colors"
                            >
                                <Save size={15} />
                                {saving ? 'Guardando...' : 'Guardar Cambios'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
