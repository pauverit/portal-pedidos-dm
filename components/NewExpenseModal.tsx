import React, { useState, useRef } from 'react';
import { X, Receipt, Car, Hotel, Package, Upload, Loader, Calculator, Image } from 'lucide-react';
import { User, ExpenseType } from '../types';

interface NewExpenseModalProps {
    currentUser: User;
    onClose: () => void;
    onSave: (data: {
        expenseDate: string;
        type: ExpenseType;
        description?: string;
        amount: number;
        km?: number;
        kmRate?: number;
        userRole: string;
        ticketFile?: File;
    }) => Promise<void>;
}

const KM_RATE = 0.19;

const EXPENSE_TYPES: { value: ExpenseType; label: string; icon: React.ElementType; color: string }[] = [
    { value: 'restaurant', label: 'Restaurante', icon: Receipt, color: 'orange' },
    { value: 'km', label: 'Kilómetros', icon: Car, color: 'blue' },
    { value: 'hotel', label: 'Hotel', icon: Hotel, color: 'indigo' },
    { value: 'other', label: 'Otro', icon: Package, color: 'slate' },
];

export const NewExpenseModal: React.FC<NewExpenseModalProps> = ({ currentUser, onClose, onSave }) => {
    const [type, setType] = useState<ExpenseType>('restaurant');
    const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [km, setKm] = useState('');
    const [kmRate] = useState(KM_RATE);
    const [ticketFile, setTicketFile] = useState<File | null>(null);
    const [ticketPreview, setTicketPreview] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const fileRef = useRef<HTMLInputElement>(null);

    // Auto-calculate amount from km
    const computedKmAmount = type === 'km' && km ? (parseFloat(km) * kmRate) : 0;
    const finalAmount = type === 'km' ? computedKmAmount : (parseFloat(amount) || 0);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setTicketFile(file);
        const reader = new FileReader();
        reader.onload = ev => setTicketPreview(ev.target?.result as string);
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (finalAmount <= 0 && !(type === 'km' && parseFloat(km) > 0)) {
            setError('Introduce un importe o km válido');
            return;
        }
        setSaving(true);
        setError('');
        try {
            await onSave({
                expenseDate,
                type,
                description: description || undefined,
                amount: finalAmount,
                km: type === 'km' ? parseFloat(km) : undefined,
                kmRate: type === 'km' ? kmRate : undefined,
                userRole: currentUser.role,
                ticketFile: ticketFile || undefined,
            });
        } catch (err: any) {
            setError(err.message || 'Error al guardar el gasto');
        } finally {
            setSaving(false);
        }
    };

    const selected = EXPENSE_TYPES.find(t => t.value === type)!;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100 sticky top-0 bg-white z-10">
                    <div className="flex items-center gap-3">
                        <div className="bg-orange-100 p-2 rounded-xl">
                            <Receipt size={18} className="text-orange-700" />
                        </div>
                        <h2 className="text-base font-bold text-slate-900">Nuevo Gasto</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-900 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    {/* Expense Type */}
                    <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Tipo de gasto</label>
                        <div className="grid grid-cols-4 gap-2">
                            {EXPENSE_TYPES.map(opt => {
                                const isSelected = type === opt.value;
                                const colorMap: Record<string, string> = {
                                    orange: isSelected ? 'border-orange-500 bg-orange-50 text-orange-800' : 'border-slate-200 text-slate-500 hover:border-orange-300',
                                    blue: isSelected ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-slate-200 text-slate-500 hover:border-blue-300',
                                    indigo: isSelected ? 'border-indigo-500 bg-indigo-50 text-indigo-800' : 'border-slate-200 text-slate-500 hover:border-indigo-300',
                                    slate: isSelected ? 'border-slate-700 bg-slate-100 text-slate-900' : 'border-slate-200 text-slate-500 hover:border-slate-400',
                                };
                                return (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setType(opt.value)}
                                        className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 text-xs font-semibold transition-all ${colorMap[opt.color]}`}
                                    >
                                        <opt.icon size={18} />
                                        {opt.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Date */}
                    <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Fecha *</label>
                        <input
                            type="date"
                            value={expenseDate}
                            onChange={e => setExpenseDate(e.target.value)}
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50"
                            required
                        />
                    </div>

                    {/* KM input */}
                    {type === 'km' && (
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-blue-700 uppercase tracking-wider mb-1.5">Kilómetros *</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.1"
                                    value={km}
                                    onChange={e => setKm(e.target.value)}
                                    placeholder="Ej: 150"
                                    className="w-full border border-blue-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                    required
                                />
                            </div>
                            {km && parseFloat(km) > 0 && (
                                <div className="flex items-center gap-2 text-sm text-blue-700">
                                    <Calculator size={14} />
                                    <span className="font-medium">
                                        {parseFloat(km).toFixed(1)} km × {kmRate.toFixed(2)} €/km = <strong className="text-blue-900">{computedKmAmount.toFixed(2)} €</strong>
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Amount (for non-km) */}
                    {type !== 'km' && (
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Importe (€) *</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                placeholder="0.00"
                                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50"
                                required
                            />
                        </div>
                    )}

                    {/* Description */}
                    <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Descripción</label>
                        <input
                            type="text"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder={type === 'km' ? 'Ej: Visita cliente en Almería' : type === 'restaurant' ? 'Ej: Comida con cliente' : 'Descripción opcional'}
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50"
                        />
                    </div>

                    {/* Photo upload (for restaurant/hotel/other) */}
                    {type !== 'km' && (
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Foto del ticket</label>
                            <input
                                ref={fileRef}
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                            {ticketPreview ? (
                                <div className="relative">
                                    <img src={ticketPreview} alt="Ticket" className="w-full h-48 object-cover rounded-xl border border-slate-200" />
                                    <button
                                        type="button"
                                        onClick={() => { setTicketFile(null); setTicketPreview(null); if (fileRef.current) fileRef.current.value = ''; }}
                                        className="absolute top-2 right-2 bg-white/90 text-slate-700 rounded-full p-1 shadow hover:bg-red-50 hover:text-red-600"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => fileRef.current?.click()}
                                    className="w-full border-2 border-dashed border-slate-200 rounded-xl py-8 flex flex-col items-center gap-2 text-slate-400 hover:border-orange-300 hover:text-orange-500 transition-colors"
                                >
                                    <div className="flex gap-2">
                                        <Upload size={20} />
                                        <Image size={20} />
                                    </div>
                                    <span className="text-sm font-medium">Adjuntar foto del ticket</span>
                                    <span className="text-xs">JPG, PNG, WEBP · máx. 5MB</span>
                                </button>
                            )}
                        </div>
                    )}

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
                            {saving ? <Loader size={14} className="animate-spin" /> : <Receipt size={14} />}
                            {saving ? 'Guardando...' : 'Guardar Gasto'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
