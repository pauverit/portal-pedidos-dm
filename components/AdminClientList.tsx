import React, { useState } from 'react';
import { Edit2, Trash2, CheckCircle, AlertCircle, Clock, ShoppingBag, TrendingUp, X, Save, Eye, EyeOff, Tag, UserCheck, Monitor, Info } from 'lucide-react';
import { User, Order, Product } from '../types';
import { SALES_REPS } from '../constants';
import { useToast } from './Toast';
import { ClientCustomPricesEditor } from './ClientCustomPricesEditor';
import { supabase } from '../lib/supabase';

interface AdminClientListProps {
    clients: User[];
    orders: Order[];
    products: Product[];
    onEditClient: (client: User) => void;
    onSaveClient: (client: User) => Promise<void>;
    onDeleteClient?: (clientId: string) => Promise<void>;
    formatCurrency: (value: number) => string;
    isAdmin?: boolean;
    salesRepsData: User[];
    initialSalesRepFilter?: string;
}

export const AdminClientList: React.FC<AdminClientListProps> = ({
    clients,
    orders,
    products,
    onEditClient,
    onSaveClient,
    onDeleteClient,
    formatCurrency,
    isAdmin = true,
    salesRepsData,
    initialSalesRepFilter = ''
}) => {
    const CATALOG_FAMILIES = [
        { id: 'flexible', label: 'Materiales Flexibles' },
        { id: 'rigid', label: 'Rígidos' },
        { id: 'accessory', label: 'Accesorios' },
        { id: 'display', label: 'Displays' },
        { id: 'cat_ink_all', label: 'Tintas & Consumibles' },
    ];

    const toggleEditCategory = (id: string) => {
        setEditForm(prev => {
            const current = (prev.hiddenCategories || []);
            const updated = current.includes(id)
                ? current.filter(c => c !== id)
                : [...current, id];
            return { ...prev, hiddenCategories: updated };
        });
    };
    const PAGE_SIZE = 100;
    const [currentPage, setCurrentPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [showPendingOnly, setShowPendingOnly] = useState(false);
    const [filterSalesRep, setFilterSalesRep] = useState(initialSalesRepFilter);
    const [filterStatus, setFilterStatus] = useState(''); // '' | 'active' | 'pending'
    const [filterZone, setFilterZone] = useState('');
    const [editingClient, setEditingClient] = useState<User | null>(null);
    const [editForm, setEditForm] = useState<Partial<User>>({});
    const [showPassword, setShowPassword] = useState(false);
    const [saving, setSaving] = useState(false);
    const [activatingId, setActivatingId] = useState<string | null>(null);
    const [pendingDeleteClientId, setPendingDeleteClientId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'general' | 'prices' | 'machines'>('general');
    const [clientMachines, setClientMachines] = useState<any[]>([]);
    const [loadingMachines, setLoadingMachines] = useState(false);
    const { toast } = useToast();

    React.useEffect(() => {
        if (activeTab === 'machines' && editingClient) {
            const fetchMachines = async () => {
                setLoadingMachines(true);
                try {
                    const { data, error } = await supabase
                        .from('machines')
                        .select('*')
                        .eq('client_id', editingClient.id);
                    if (error) throw error;
                    setClientMachines(data || []);
                } catch (error: any) {
                    toast('Error al cargar máquinas: ' + error.message, 'error');
                } finally {
                    setLoadingMachines(false);
                }
            };
            fetchMachines();
        }
    }, [activeTab, editingClient]);

    const handleQuickActivate = async (client: User) => {
        setActivatingId(client.id);
        try {
            await onSaveClient({ ...client, isActive: true, mustChangePassword: false });
            toast(`✅ ${client.name} activado correctamente`, 'success');
        } catch {
            toast('Error al activar el cliente', 'error');
        } finally {
            setActivatingId(null);
        }
    };

    const allClients = clients.filter(c => c.role === 'client');

    // Filter options from official sales reps list
    const salesRepOptions = salesRepsData.map(r => r.name);
    const zoneOptions = [...new Set(allClients.map(c => c.zone).filter(Boolean))] as string[];

    const filteredClients = allClients
        .filter(c => !showPendingOnly || !(c.isActive ?? !c.mustChangePassword))
        .filter(c => {
            if (!filterSalesRep) return true;
            if (filterSalesRep === '__none__') return !c.salesRep;
            return c.salesRep === filterSalesRep;
        })
        .filter(c => {
            if (!filterStatus) return true;
            const active = c.isActive ?? !c.mustChangePassword;
            return filterStatus === 'active' ? active : !active;
        })
        .filter(c => !filterZone || c.zone === filterZone)
        .filter(c =>
            !searchQuery ||
            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (c.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (c.salesRep || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (c.delegation || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (c.zone || '').toLowerCase().includes(searchQuery.toLowerCase())
        );

    const pendingCount = allClients.filter(c => !(c.isActive ?? !c.mustChangePassword)).length;
    const activeFilterCount = [filterSalesRep, filterStatus, filterZone, showPendingOnly ? '1' : ''].filter(Boolean).length;

    // Reset to page 1 whenever filters or search change
    React.useEffect(() => { setCurrentPage(1); }, [searchQuery, showPendingOnly, filterSalesRep, filterStatus, filterZone]);

    const totalPages = Math.max(1, Math.ceil(filteredClients.length / PAGE_SIZE));
    const paginatedClients = filteredClients.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    const clearAllFilters = () => {
        setSearchQuery('');
        setShowPendingOnly(false);
        setFilterSalesRep('');
        setFilterStatus('');
        setFilterZone('');
    };

    const getClientOrders = (clientId: string) =>
        orders.filter(o => o.userId === clientId);

    const startEdit = (client: User) => {
        setEditingClient(client);
        setEditForm({
            name: client.name,
            email: client.email,
            phone: client.phone || '',
            salesRep: client.salesRep || '',
            zone: client.zone || '',
            username: client.username || '',
            password: '',
            rappelThreshold: client.rappelThreshold || 800,
            hidePrices: client.hidePrices || false,
            isActive: client.isActive ?? true,
            mustChangePassword: client.mustChangePassword ?? false,
            hiddenCategories: client.hiddenCategories || [],
            customPrices: client.customPrices || {},
        });
        setActiveTab('general');
    };

    const handleSave = async () => {
        if (!editingClient) return;
        setSaving(true);
        try {
            await onSaveClient({ ...editingClient, ...editForm });
            setEditingClient(null);
            toast('Cliente guardado correctamente', 'success');
        } catch (e) {
            console.error(e);
            toast('Error al guardar el cliente', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="relative">
            {/* Filter toolbar */}
            <div className="mb-4 space-y-2">
                {/* Row 1: search + dropdowns + pending */}
                <div className="flex flex-wrap items-center gap-2">
                    <input
                        type="text"
                        placeholder="Buscar empresa, usuario…"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="flex-1 min-w-[180px] max-w-xs pl-4 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                    />

                    {/* Comercial */}
                    <select
                        value={filterSalesRep}
                        onChange={e => setFilterSalesRep(e.target.value)}
                        className={`border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none cursor-pointer ${filterSalesRep ? 'border-indigo-400 bg-indigo-50 text-indigo-800 font-semibold' : 'border-slate-200 text-slate-600'
                            }`}
                    >
                        <option value="">Todos los comerciales</option>
                        <option value="__none__">Sin asignar</option>
                        {salesRepOptions.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>

                    {/* Estado */}
                    <select
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                        className={`border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none cursor-pointer ${filterStatus ? 'border-indigo-400 bg-indigo-50 text-indigo-800 font-semibold' : 'border-slate-200 text-slate-600'
                            }`}
                    >
                        <option value="">Todos los estados</option>
                        <option value="active">✅ Activo</option>
                        <option value="pending">⏳ Pendiente</option>
                    </select>

                    {/* Zona / Provincia */}
                    {zoneOptions.length > 0 && (
                        <select
                            value={filterZone}
                            onChange={e => setFilterZone(e.target.value)}
                            className={`border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none cursor-pointer ${filterZone ? 'border-indigo-400 bg-indigo-50 text-indigo-800 font-semibold' : 'border-slate-200 text-slate-600'
                                }`}
                        >
                            <option value="">Todas las provincias</option>
                            {zoneOptions.map(z => <option key={z} value={z}>{z}</option>)}
                        </select>
                    )}

                    {/* Pendientes */}
                    <button
                        onClick={() => setShowPendingOnly(p => !p)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold border-2 transition-colors ${showPendingOnly
                            ? 'bg-amber-50 border-amber-400 text-amber-800'
                            : 'border-slate-200 text-slate-500 hover:border-slate-300'
                            }`}
                    >
                        <Clock size={13} />
                        Pendientes
                        {pendingCount > 0 && (
                            <span className="bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">{pendingCount}</span>
                        )}
                    </button>

                    {/* Clear all */}
                    {activeFilterCount > 0 && (
                        <button
                            onClick={clearAllFilters}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-slate-500 hover:text-red-600 hover:bg-red-50 border border-slate-200 transition-colors"
                        >
                            <X size={13} /> Limpiar ({activeFilterCount})
                        </button>
                    )}
                </div>

                {/* Results count */}
                <p className="text-xs text-slate-400">
                    Mostrando <strong className="text-slate-700">{paginatedClients.length}</strong> de <strong className="text-slate-700">{filteredClients.length}</strong> clientes
                    {filteredClients.length !== allClients.length && <> (total: {allClients.length})</>}
                    {totalPages > 1 && <> · Página {currentPage} de {totalPages}</>}
                </p>
            </div>

            {/* Client Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-3 py-2">Empresa / Usuario</th>
                                <th className="px-3 py-2">Comercial</th>
                                <th className="px-3 py-2 text-center">Estado</th>
                                <th className="px-3 py-2 text-center">Contraseña</th>
                                <th className="px-3 py-2 text-center">Pedidos</th>
                                <th className="px-3 py-2 text-center">Cupones</th>
                                <th className="px-3 py-2 text-right">Mín. Rappel</th>
                                <th className="px-3 py-2 text-right">Rappel</th>
                                <th className="px-3 py-2 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedClients.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="px-4 py-8 text-center text-slate-400 text-sm">
                                        No hay clientes registrados
                                    </td>
                                </tr>
                            )}
                            {paginatedClients.map(client => {
                                const clientOrders = getClientOrders(client.id);
                                const totalSpent = clientOrders.reduce((s, o) => s + o.total, 0);
                                const isActive = client.isActive ?? !client.mustChangePassword;
                                const passwordChanged = !(client.mustChangePassword ?? false);

                                return (
                                    <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-3 py-2">
                                            <div className="font-semibold text-slate-900">{client.name}</div>
                                            <div className="text-xs text-slate-400">@{client.username}</div>
                                            {client.zone && (
                                                <div className="text-xs text-slate-500 font-medium italic">{client.zone}</div>
                                            )}
                                        </td>
                                        <td className="px-3 py-2">
                                            {client.salesRep ? (
                                                <span className="text-slate-700 font-medium">{client.salesRep}</span>
                                            ) : (
                                                <span className="text-red-500 text-xs font-bold">Sin asignar ⚠️</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-2 text-center">
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
                                        <td className="px-3 py-2 text-center">
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
                                        <td className="px-3 py-2 text-center">
                                            <div className="font-bold text-slate-900">{clientOrders.length}</div>
                                            {totalSpent > 0 && (
                                                <div className="text-xs text-slate-400">{formatCurrency(totalSpent)}</div>
                                            )}
                                        </td>
                                        <td className="px-3 py-2 text-center">
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
                                        <td className="px-3 py-2 text-right">
                                            <div className="font-semibold text-slate-700">{client.rappelThreshold || 300}€</div>
                                            <div className="text-[10px] text-slate-400 uppercase tracking-tight">mín. pedido</div>
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                            <span className={`font-bold ${client.rappelAccumulated > 0 ? 'text-green-600' : 'text-slate-400'}`}>
                                                {formatCurrency(client.rappelAccumulated)}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                {!isActive && (
                                                    <button
                                                        onClick={() => handleQuickActivate(client)}
                                                        disabled={activatingId === client.id}
                                                        className="flex items-center gap-1 px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                                                        title="Activar cliente"
                                                    >
                                                        {activatingId === client.id
                                                            ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                                                            : <UserCheck size={12} />}
                                                        Activar
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => startEdit(client)}
                                                    className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                                                    title="Editar cliente"
                                                >
                                                    <Edit2 size={15} />
                                                </button>
                                                {isAdmin && onDeleteClient && (
                                                    <button
                                                        onClick={() => setPendingDeleteClientId(client.id)}
                                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Eliminar cliente"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 text-sm font-semibold border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                        ← Anterior
                    </button>
                    <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                            .reduce<(number | '...')[]>((acc, p, i, arr) => {
                                if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('...');
                                acc.push(p);
                                return acc;
                            }, [])
                            .map((p, i) =>
                                p === '...' ? (
                                    <span key={`ellipsis-${i}`} className="px-2 text-slate-400 text-sm">…</span>
                                ) : (
                                    <button
                                        key={p}
                                        onClick={() => setCurrentPage(p as number)}
                                        className={`w-8 h-8 text-sm font-semibold rounded-lg transition-colors ${currentPage === p ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                                    >
                                        {p}
                                    </button>
                                )
                            )}
                    </div>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 text-sm font-semibold border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                        Siguiente →
                    </button>
                </div>
            )}

            {/* Edit Modal */}
            {editingClient && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="bg-slate-900 text-white px-3 py-2 flex items-center justify-between shrink-0">
                            <div>
                                <h2 className="font-bold text-base">Editar Cliente</h2>
                                <p className="text-slate-400 text-sm">{editingClient.name}</p>
                            </div>
                            <button onClick={() => setEditingClient(null)} className="text-slate-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-slate-200 shrink-0">
                            <button
                                onClick={() => setActiveTab('general')}
                                className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === 'general' ? 'text-slate-900 border-b-2 border-slate-900' : 'text-slate-400 hover:text-slate-700'}`}
                            >
                                Datos generales
                            </button>
                            <button
                                onClick={() => setActiveTab('prices')}
                                className={`flex-1 py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${activeTab === 'prices' ? 'text-amber-700 border-b-2 border-amber-500' : 'text-slate-400 hover:text-slate-700'}`}
                            >
                                <Tag size={14} />
                                Precios especiales
                                {Object.keys(editForm.customPrices || {}).length > 0 && (
                                    <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                        {Object.keys(editForm.customPrices || {}).length}
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={() => setActiveTab('machines')}
                                className={`flex-1 py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${activeTab === 'machines' ? 'text-blue-700 border-b-2 border-blue-500' : 'text-slate-400 hover:text-slate-700'}`}
                            >
                                <Monitor size={14} />
                                Máquinas
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 relative">
                            {saving && (
                                <div className="absolute inset-0 flex items-center justify-center bg-white/20 z-10">
                                    <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            )}

                            {/* TAB: General */}
                            {activeTab === 'general' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Nombre de Empresa *</label>
                                            <input
                                                value={editForm.name || ''}
                                                onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Usuario (Login) *</label>
                                            <input
                                                value={editForm.username || ''}
                                                onChange={e => setEditForm(p => ({ ...p, username: e.target.value.toLowerCase().trim() }))}
                                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Provincia / Zona</label>
                                            <input
                                                value={editForm.zone || ''}
                                                onChange={e => setEditForm(p => ({ ...p, zone: e.target.value }))}
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
                                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Nueva Contraseña</label>
                                            <div className="relative">
                                                <input
                                                    type={showPassword ? 'text' : 'password'}
                                                    value={editForm.password || ''}
                                                    onChange={e => setEditForm(p => ({ ...p, password: e.target.value }))}
                                                    placeholder="Dejar vacío para no cambiar"
                                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 pr-9 text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(v => !v)}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                                                >
                                                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {isAdmin && (
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Comercial Asignado *</label>
                                            <select
                                                value={editForm.salesRep || ''}
                                                onChange={e => setEditForm(p => ({ ...p, salesRep: e.target.value }))}
                                                className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none ${!editForm.salesRep ? 'border-red-300 bg-red-50' : 'border-slate-300'}`}
                                            >
                                                <option value="">— Seleccionar Comercial —</option>
                                                {salesRepsData.map(rep => (
                                                    <option key={rep.id} value={rep.name}>{rep.name}</option>
                                                ))}
                                            </select>
                                            {!editForm.salesRep && (
                                                <p className="text-xs text-red-500 mt-1">⚠️ El comercial es obligatorio</p>
                                            )}
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Rappel Umbral (€) *</label>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="range"
                                                min="300"
                                                max="1000"
                                                step="50"
                                                value={editForm.rappelThreshold || 300}
                                                onChange={e => setEditForm(p => ({ ...p, rappelThreshold: Number(e.target.value) }))}
                                                className="flex-1 accent-slate-800"
                                            />
                                            <input
                                                type="number"
                                                min="300"
                                                max="1000"
                                                step="50"
                                                value={editForm.rappelThreshold || 300}
                                                onChange={e => setEditForm(p => ({ ...p, rappelThreshold: Number(e.target.value) }))}
                                                className="w-24 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none text-center font-bold"
                                            />
                                        </div>
                                        <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-tight">Mín. 300€ / Máx. 1000€ · pasos de 50€</p>
                                    </div>

                                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-800">
                                        <p className="font-bold mb-1">Información de Rappel:</p>
                                        <ul className="list-disc list-inside space-y-0.5">
                                            <li>Acumula <strong>3% de beneficio</strong> &gt; umbral.</li>
                                            <li>Canjea en pedidos &gt; <strong>1.5x umbral</strong>.</li>
                                        </ul>
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

                                    {/* Catalog access control */}
                                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                                        <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Acceso al catálogo</p>
                                        <p className="text-xs text-slate-500 mb-3">Desactiva las familias que este cliente NO podrá ver en su portal.</p>
                                        <div className="flex flex-wrap gap-2">
                                            {CATALOG_FAMILIES.map(family => (
                                                <label key={family.id} className="flex items-center gap-2 cursor-pointer select-none bg-white border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-colors">
                                                    <input
                                                        type="checkbox"
                                                        checked={!(editForm.hiddenCategories || []).includes(family.id)}
                                                        onChange={() => toggleEditCategory(family.id)}
                                                        className="accent-slate-800 w-3.5 h-3.5"
                                                    />
                                                    <span className="text-xs text-slate-700 font-medium">{family.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB: Prices */}
                            {activeTab === 'prices' && (
                                <ClientCustomPricesEditor
                                    products={products}
                                    customPrices={editForm.customPrices || {}}
                                    onChange={(newPrices) => setEditForm(p => ({ ...p, customPrices: newPrices }))}
                                    formatCurrency={formatCurrency}
                                />
                            )}

                            {/* TAB: Machines */}
                            {activeTab === 'machines' && (
                                <div className="space-y-4">
                                    {loadingMachines ? (
                                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
                                            <p className="text-sm font-medium">Cargando máquinas...</p>
                                        </div>
                                    ) : clientMachines.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                            <Monitor size={48} className="mb-4 opacity-20" />
                                            <p className="font-semibold text-slate-900">Sin máquinas instaladas</p>
                                            <p className="text-xs max-w-[200px] text-center mt-1">Este cliente no tiene activos registrados en el sistema.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase px-1">
                                                <Monitor size={14} />
                                                Activos Instalados ({clientMachines.length})
                                            </div>
                                            <div className="grid gap-3">
                                                {clientMachines.map(m => (
                                                    <div key={m.id} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm hover:border-blue-200 transition-colors">
                                                        <div className="flex items-start justify-between mb-2">
                                                            <div>
                                                                <div className="font-bold text-slate-900 leading-tight">{m.brand} {m.model}</div>
                                                                <div className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded inline-block font-mono mt-1">SN: {m.serial_number}</div>
                                                            </div>
                                                            <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                                                {m.status === 'active' ? 'ACTIVA' : m.status.toUpperCase()}
                                                            </div>
                                                        </div>
                                                        {m.warranty_expires && (
                                                            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-2 bg-slate-50 p-2 rounded-lg">
                                                                <AlertCircle size={12} className={new Date(m.warranty_expires) < new Date() ? "text-red-500" : "text-emerald-500"} />
                                                                <span className="font-medium">Garantía: {new Date(m.warranty_expires).toLocaleDateString('es-ES')}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex gap-3 text-blue-800">
                                                <Info size={16} className="shrink-0 mt-0.5" />
                                                <div className="text-xs leading-relaxed">
                                                    Para crear nuevas incidencias o partes técnicos, usa el buscador global de activos.
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Modal footer */}
                        <div className="px-3 py-2 border-t border-slate-100 flex justify-end gap-3 shrink-0">
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

            {/* Inline confirm modal for client deletion */}
            {pendingDeleteClientId && onDeleteClient && (() => {
                const target = clients.find(c => c.id === pendingDeleteClientId);
                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 p-6">
                            <h3 className="text-base font-bold text-slate-900 mb-2">¿Eliminar cliente?</h3>
                            <p className="text-sm text-slate-600 mb-6">
                                Esto eliminará a <strong>{target?.name}</strong> permanentemente. Esta acción no se puede deshacer.
                            </p>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setPendingDeleteClientId(null)}
                                    className="px-4 py-2 text-sm text-slate-500 hover:text-slate-800"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={async () => {
                                        await onDeleteClient(pendingDeleteClientId);
                                        setPendingDeleteClientId(null);
                                    }}
                                    className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-lg transition-colors"
                                >
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};
