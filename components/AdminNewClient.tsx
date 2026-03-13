import React, { useState } from 'react';
import { UserPlus, Save, Eye, EyeOff, Tag, X } from 'lucide-react';
import { User, Product } from '../types';
import { useToast } from './Toast';
import { ClientCustomPricesEditor } from './ClientCustomPricesEditor';

interface AdminNewClientProps {
    onSave: (clientData: any) => Promise<void>;
    onBack: () => void;
    isAdmin?: boolean;
    salesReps: User[];
    products: Product[];
}

export const AdminNewClient: React.FC<AdminNewClientProps> = ({ onSave, onBack, isAdmin = true, salesReps, products }) => {
    const CATALOG_FAMILIES = [
        { id: 'flexible', label: 'Materiales Flexibles' },
        { id: 'rigid', label: 'Rígidos' },
        { id: 'accessory', label: 'Accesorios' },
        { id: 'display', label: 'Displays' },
        { id: 'cat_ink_all', label: 'Tintas & Consumibles' },
    ];

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        username: '',
        password: '',
        salesRep: '',
        zone: '',
        rappelThreshold: 300,
        hidePrices: false,
        hiddenCategories: [] as string[],
        customPrices: {} as Record<string, number>,
    });

    const [activeTab, setActiveTab] = useState<'general' | 'prices'>('general');

    const toggleCategory = (id: string) => {
        setFormData(prev => {
            const hidden = prev.hiddenCategories.includes(id)
                ? prev.hiddenCategories.filter(c => c !== id)
                : [...prev.hiddenCategories, id];
            return { ...prev, hiddenCategories: hidden };
        });
    };
    const [showPassword, setShowPassword] = useState(false);
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.username || !formData.password || (isAdmin && !formData.salesRep)) {
            toast('Usuario, contraseña y comercial son obligatorios', 'error');
            return;
        }
        setSaving(true);
        try {
            await onSave(formData);
            onBack();
        } catch (error: any) {
            toast('Error: ' + error.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-4 md:p-10 max-w-4xl mx-auto">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Alta de Nuevo Cliente</h2>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {/* Tabs */}
                <div className="flex border-b border-slate-200">
                    <button
                        type="button"
                        onClick={() => setActiveTab('general')}
                        className={`flex-1 py-4 text-sm font-semibold transition-colors ${activeTab === 'general' ? 'text-slate-900 border-b-2 border-slate-900' : 'text-slate-400 hover:text-slate-700'}`}
                    >
                        Datos generales
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('prices')}
                        className={`flex-1 py-4 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${activeTab === 'prices' ? 'text-amber-700 border-b-2 border-amber-500' : 'text-slate-400 hover:text-slate-700'}`}
                    >
                        <Tag size={14} />
                        Precios especiales
                        {Object.keys(formData.customPrices).length > 0 && (
                            <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                {Object.keys(formData.customPrices).length}
                            </span>
                        )}
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    {activeTab === 'general' ? (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Provincia / Zona</label>
                                    <input
                                        type="text"
                                        value={formData.zone}
                                        onChange={e => setFormData({ ...formData, zone: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
                                        placeholder="Ej: Valencia"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Umbral Rappel (€) *</label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="range"
                                            min="300"
                                            max="1000"
                                            step="50"
                                            value={formData.rappelThreshold}
                                            onChange={e => setFormData({ ...formData, rappelThreshold: Number(e.target.value) })}
                                            className="flex-1 accent-slate-800"
                                        />
                                        <input
                                            type="number"
                                            required
                                            min="300"
                                            max="1000"
                                            step="50"
                                            value={formData.rappelThreshold}
                                            onChange={e => setFormData({ ...formData, rappelThreshold: Number(e.target.value) })}
                                            className="w-24 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none text-center font-bold"
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-tight">Mín. 300€ / Máx. 1000€ · pasos de 50€</p>
                                </div>
                            </div>

                            {/* Catalog access control */}
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Acceso al catálogo</p>
                                <p className="text-xs text-slate-500 mb-3">Desactiva las familias que este cliente NO podrá ver en su portal.</p>
                                <div className="flex flex-wrap gap-3">
                                    {CATALOG_FAMILIES.map(family => (
                                        <label key={family.id} className="flex items-center gap-2 cursor-pointer select-none bg-white border border-slate-200 rounded-lg px-3 py-2 hover:bg-slate-50 transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={!formData.hiddenCategories.includes(family.id)}
                                                onChange={() => toggleCategory(family.id)}
                                                className="accent-slate-800 w-3.5 h-3.5"
                                            />
                                            <span className="text-sm text-slate-700 font-medium">{family.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
                                <p className="font-bold mb-1">Información sobre Rappel:</p>
                                <ul className="list-disc list-inside space-y-1 text-xs">
                                    <li>El cliente acumula un <strong>3% de beneficio</strong> en cada pedido superior al umbral establecido.</li>
                                    <li>Para canjear el saldo acumulado, el pedido debe superar <strong>1.5 veces</strong> su umbral.</li>
                                    <li>Ejemplo: Con umbral de 300€, acumula desde 300€ y canjea en pedidos de 450€ o más.</li>
                                </ul>
                            </div>
                        </div>
                    ) : (
                        <ClientCustomPricesEditor
                            products={products}
                            customPrices={formData.customPrices}
                            onChange={prices => setFormData({ ...formData, customPrices: prices })}
                        />
                    )}

                    <div className="pt-4 flex items-center justify-end gap-4 border-t border-slate-100">
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
                            className="px-8 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50 transition-colors shadow-sm"
                        >
                            <Save size={18} />
                            {saving ? 'Creando...' : 'Registrar Cliente'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
