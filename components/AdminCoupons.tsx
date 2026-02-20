import React, { useState } from 'react';
import { Ticket, Plus, Trash2, Copy, Check } from 'lucide-react';

export interface Coupon {
    id?: string;
    code: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    minOrderAmount: number;
    maxUses: number;
    usesCount: number;
    isActive: boolean;
    createdAt: string;
    description?: string;
    expiresAt?: string;
}

interface AdminCouponsProps {
    coupons: Coupon[];
    onAddCoupon: (coupon: Partial<Coupon>) => void;
    onUpdateCoupon: (code: string, updates: Partial<Coupon>) => void;
    onDeleteCoupon: (code: string) => void;
}

export const AdminCoupons: React.FC<AdminCouponsProps> = ({ coupons, onAddCoupon, onUpdateCoupon, onDeleteCoupon }) => {
    const [showModal, setShowModal] = useState(false);
    const [copiedCode, setCopiedCode] = useState<string | null>(null);
    const [newCoupon, setNewCoupon] = useState<Partial<Coupon>>({
        code: '',
        discountType: 'percentage',
        discountValue: 5,
        minOrderAmount: 0,
        maxUses: 1,
        isActive: true,
        description: ''
    });

    const generateCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 8; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setNewCoupon(prev => ({ ...prev, code }));
    };

    const handleAddCoupon = () => {
        if (!newCoupon.code || newCoupon.code.length < 4) {
            alert('El código debe tener al menos 4 caracteres');
            return;
        }
        if (coupons.some(c => c.code.toUpperCase() === newCoupon.code?.toUpperCase())) {
            alert('Ya existe un cupón con ese código');
            return;
        }
        if (!newCoupon.discountValue || newCoupon.discountValue <= 0) {
            alert('El descuento debe ser mayor que 0');
            return;
        }

        onAddCoupon({
            code: newCoupon.code.toUpperCase(),
            discountType: newCoupon.discountType || 'percentage',
            discountValue: newCoupon.discountValue!,
            minOrderAmount: newCoupon.minOrderAmount || 0,
            maxUses: newCoupon.maxUses || 1,
            isActive: newCoupon.isActive ?? true,
            description: newCoupon.description
        });
        setShowModal(false);
        setNewCoupon({
            code: '',
            discountType: 'percentage',
            discountValue: 5,
            minOrderAmount: 0,
            maxUses: 1,
            isActive: true,
            description: ''
        });
    };

    const toggleCouponActive = (code: string, currentActive: boolean) => {
        onUpdateCoupon(code, { isActive: !currentActive });
    };

    const deleteCoupon = (code: string) => {
        if (confirm(`¿Eliminar el cupón ${code}?`)) {
            onDeleteCoupon(code);
        }
    };

    const copyToClipboard = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Códigos Promocionales</h2>
                    <p className="text-slate-500 text-sm mt-1">Genera y gestiona cupones de descuento de un solo uso</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-slate-800 transition-colors"
                >
                    <Plus size={18} /> Nuevo Cupón
                </button>
            </div>

            {coupons.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                    <Ticket className="mx-auto text-slate-300 mb-4" size={48} />
                    <p className="text-slate-500">No hay códigos promocionales creados</p>
                    <button
                        onClick={() => setShowModal(true)}
                        className="mt-4 text-slate-900 font-bold text-sm hover:underline"
                    >
                        Crear el primer cupón
                    </button>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-4 py-3">Código</th>
                                <th className="px-4 py-3">Descuento</th>
                                <th className="px-4 py-3 text-center">Pedido Mínimo</th>
                                <th className="px-4 py-3 text-center">Usos</th>
                                <th className="px-4 py-3 text-center">Estado</th>
                                <th className="px-4 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {coupons.map(coupon => (
                                <tr key={coupon.code} className="hover:bg-slate-50">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <code className="bg-slate-100 px-2 py-1 rounded font-mono font-bold text-slate-900">
                                                {coupon.code}
                                            </code>
                                            <button
                                                onClick={() => copyToClipboard(coupon.code)}
                                                className="text-slate-400 hover:text-slate-600"
                                                title="Copiar código"
                                            >
                                                {copiedCode === coupon.code ? (
                                                    <Check size={14} className="text-green-500" />
                                                ) : (
                                                    <Copy size={14} />
                                                )}
                                            </button>
                                        </div>
                                        {coupon.description && (
                                            <p className="text-xs text-slate-400 mt-0.5">{coupon.description}</p>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="font-bold text-green-600">
                                            {coupon.discountType === 'percentage' 
                                                ? `${coupon.discountValue}%` 
                                                : `${coupon.discountValue}€`}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center text-slate-600">
                                        {coupon.minOrderAmount > 0 
                                            ? `${coupon.minOrderAmount}€` 
                                            : 'Sin mínimo'}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={coupon.usesCount >= coupon.maxUses ? 'text-red-500' : 'text-slate-600'}>
                                            {coupon.usesCount} / {coupon.maxUses}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <button
                                            onClick={() => toggleCouponActive(coupon.code, coupon.isActive)}
                                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
                                                coupon.isActive 
                                                    ? 'bg-green-100 text-green-700' 
                                                    : 'bg-slate-100 text-slate-500'
                                            }`}
                                        >
                                            {coupon.isActive ? 'Activo' : 'Inactivo'}
                                        </button>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            onClick={() => deleteCoupon(coupon.code)}
                                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                            title="Eliminar cupón"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden">
                        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
                            <h2 className="font-bold text-lg">Nuevo Código Promocional</h2>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                                ✕
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Código</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newCoupon.code || ''}
                                        onChange={e => setNewCoupon(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                                        className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono uppercase focus:ring-2 focus:ring-slate-900 outline-none"
                                        placeholder="Ej: PROMO2024"
                                        maxLength={12}
                                    />
                                    <button
                                        onClick={generateCode}
                                        className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200"
                                    >
                                        Generar
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Descripción (opcional)</label>
                                <input
                                    type="text"
                                    value={newCoupon.description || ''}
                                    onChange={e => setNewCoupon(prev => ({ ...prev, description: e.target.value }))}
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                                    placeholder="Ej: Cupón de bienvenida"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Tipo de Descuento</label>
                                    <select
                                        value={newCoupon.discountType || 'percentage'}
                                        onChange={e => setNewCoupon(prev => ({ ...prev, discountType: e.target.value as any }))}
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                                    >
                                        <option value="percentage">Porcentaje (%)</option>
                                        <option value="fixed">Importe fijo (€)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                                        {newCoupon.discountType === 'percentage' ? 'Descuento (%)' : 'Descuento (€)'}
                                    </label>
                                    <input
                                        type="number"
                                        value={newCoupon.discountValue || ''}
                                        onChange={e => setNewCoupon(prev => ({ ...prev, discountValue: Number(e.target.value) }))}
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                                        min={newCoupon.discountType === 'percentage' ? 1 : 0.01}
                                        max={newCoupon.discountType === 'percentage' ? 100 : undefined}
                                        step={newCoupon.discountType === 'percentage' ? 1 : 0.01}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Pedido Mínimo (€)</label>
                                    <input
                                        type="number"
                                        value={newCoupon.minOrderAmount || ''}
                                        onChange={e => setNewCoupon(prev => ({ ...prev, minOrderAmount: Number(e.target.value) }))}
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                                        min={0}
                                        step={50}
                                        placeholder="0 = sin mínimo"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Usos Máximos</label>
                                    <input
                                        type="number"
                                        value={newCoupon.maxUses || ''}
                                        onChange={e => setNewCoupon(prev => ({ ...prev, maxUses: Number(e.target.value) }))}
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                                        min={1}
                                        placeholder="1 = un solo uso"
                                    />
                                </div>
                            </div>

                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={newCoupon.isActive ?? true}
                                    onChange={e => setNewCoupon(prev => ({ ...prev, isActive: e.target.checked }))}
                                    className="w-4 h-4 rounded"
                                />
                                <span className="text-sm text-slate-700">Cupón activo</span>
                            </label>
                        </div>

                        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 text-sm text-slate-500 hover:text-slate-800"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleAddCoupon}
                                className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white font-bold text-sm rounded-lg flex items-center gap-2 transition-colors"
                            >
                                <Ticket size={15} />
                                Crear Cupón
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
