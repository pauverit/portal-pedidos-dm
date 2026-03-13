import React, { useEffect, useState } from 'react';
import { Plus, Receipt, Car, Hotel, Package, Trash2, FileText, Calendar, ChevronLeft, ChevronRight, Image, TrendingUp } from 'lucide-react';
import { User, Expense, ExpenseType } from '../types';
import { NewExpenseModal } from './NewExpenseModal';
import { ExpenseReportModal } from './ExpenseReportModal';
import { useExpenses } from '../hooks/useExpenses';

interface ExpensesViewProps {
    currentUser: User;
    formatCurrency: (v: number) => string;
}

const MONTH_NAMES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const TYPE_META: Record<ExpenseType, { label: string; icon: React.ElementType; bg: string; text: string }> = {
    restaurant: { label: 'Restaurante', icon: Receipt, bg: 'bg-orange-100', text: 'text-orange-700' },
    km: { label: 'Kilómetros', icon: Car, bg: 'bg-blue-100', text: 'text-blue-700' },
    hotel: { label: 'Hotel', icon: Hotel, bg: 'bg-indigo-100', text: 'text-indigo-700' },
    other: { label: 'Otro', icon: Package, bg: 'bg-slate-100', text: 'text-slate-700' },
};

export const ExpensesView: React.FC<ExpensesViewProps> = ({ currentUser, formatCurrency }) => {
    const now = new Date();
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
    const [selectedYear, setSelectedYear] = useState(now.getFullYear());
    const [showNewExpense, setShowNewExpense] = useState(false);
    const [showReport, setShowReport] = useState(false);
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

    const { expenses, loading, load, createExpense, deleteExpense, getMonthlyReport } = useExpenses({ userId: currentUser.id });

    useEffect(() => {
        load(selectedMonth, selectedYear);
    }, [selectedMonth, selectedYear]);

    const isCurrentMonth = selectedMonth === now.getMonth() && selectedYear === now.getFullYear();

    const goToPrevMonth = () => {
        if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y - 1); }
        else setSelectedMonth(m => m - 1);
    };
    const goToNextMonth = () => {
        const nextIsAfterNow = selectedYear > now.getFullYear() ||
            (selectedYear === now.getFullYear() && selectedMonth >= now.getMonth());
        if (nextIsAfterNow) return;
        if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y + 1); }
        else setSelectedMonth(m => m + 1);
    };

    const report = getMonthlyReport(selectedMonth, selectedYear, expenses);

    return (
        <div className="p-4 md:p-10 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Gastos</h1>
                    <p className="text-slate-500 mt-1">Registra tus gastos y genera informes mensuales.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowReport(true)}
                        className="flex items-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-xl font-semibold text-sm transition-colors shadow-sm"
                    >
                        <FileText size={16} />
                        <span>Informe</span>
                    </button>
                    <button
                        onClick={() => setShowNewExpense(true)}
                        className="flex items-center gap-2 bg-slate-900 hover:bg-slate-700 text-white px-3 py-2 rounded-xl font-semibold text-sm transition-colors shadow-sm"
                    >
                        <Plus size={16} />
                        <span>Nuevo Gasto</span>
                    </button>
                </div>
            </div>

            {/* Month navigator */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <button onClick={goToPrevMonth} className="p-2 rounded-lg hover:bg-slate-200 transition-colors text-slate-600">
                        <ChevronLeft size={18} />
                    </button>
                    <div className="flex items-center gap-3">
                        <Calendar size={18} className="text-slate-400" />
                        <h2 className="font-bold text-slate-900 text-base">{MONTH_NAMES[selectedMonth]} {selectedYear}</h2>
                        {isCurrentMonth && (
                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Mes actual</span>
                        )}
                    </div>
                    <button onClick={goToNextMonth} disabled={isCurrentMonth} className="p-2 rounded-lg hover:bg-slate-200 transition-colors text-slate-600 disabled:opacity-30">
                        <ChevronRight size={18} />
                    </button>
                </div>

                {/* KPI bar */}
                <div className="px-4 py-4 grid grid-cols-2 md:grid-cols-4 gap-4 border-b border-slate-100">
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total mes</p>
                        <p className="text-3xl font-black text-slate-900">{formatCurrency(report.totalAmount)}</p>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Tickets</p>
                        <p className="text-3xl font-black text-orange-600">{report.byType.restaurant.count + report.byType.hotel.count + report.byType.other.count}</p>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Kilómetros</p>
                        <p className="text-3xl font-black text-blue-600">{report.totalKm.toFixed(0)} km</p>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">€ por km</p>
                        <p className="text-3xl font-black text-blue-400">{formatCurrency(report.totalKmAmount)}</p>
                    </div>
                </div>

                {/* Expense list */}
                <div className="divide-y divide-slate-50">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-700 rounded-full animate-spin" />
                        </div>
                    ) : expenses.length === 0 ? (
                        <div className="py-16 text-center">
                            <TrendingUp size={40} className="text-slate-200 mx-auto mb-3" />
                            <p className="text-slate-400 text-sm font-medium">Sin gastos en {MONTH_NAMES[selectedMonth]}</p>
                            <button onClick={() => setShowNewExpense(true)} className="mt-4 text-sm text-slate-900 font-bold underline hover:no-underline">
                                Añadir primer gasto
                            </button>
                        </div>
                    ) : (
                        expenses.map(expense => {
                            const meta = TYPE_META[expense.type];
                            return (
                                <div key={expense.id} className="px-3 py-2 flex items-center gap-4 hover:bg-slate-50 group transition-colors">
                                    <div className={`${meta.bg} ${meta.text} p-2.5 rounded-xl flex-shrink-0`}>
                                        <meta.icon size={18} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-slate-900 text-sm">
                                                {expense.description || meta.label}
                                            </span>
                                            <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${meta.bg} ${meta.text}`}>
                                                {meta.label}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            {new Date(expense.expenseDate).toLocaleDateString('es-ES')}
                                            {expense.type === 'km' && expense.km ? ` · ${expense.km.toFixed(1)} km` : ''}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        {expense.ticketImageUrl && (
                                            <button
                                                onClick={() => setLightboxUrl(expense.ticketImageUrl!)}
                                                className="text-slate-300 hover:text-orange-500 transition-colors"
                                                title="Ver ticket"
                                            >
                                                <Image size={16} />
                                            </button>
                                        )}
                                        <span className="font-bold text-slate-900">{formatCurrency(expense.amount)}</span>
                                        <button
                                            onClick={() => deleteExpense(expense.id)}
                                            className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Modals */}
            {showNewExpense && (
                <NewExpenseModal
                    currentUser={currentUser}
                    onClose={() => setShowNewExpense(false)}
                    onSave={async (data) => {
                        await createExpense(data);
                        setShowNewExpense(false);
                    }}
                />
            )}

            {showReport && (
                <ExpenseReportModal
                    userId={currentUser.id}
                    userName={currentUser.name}
                    expenses={expenses}
                    onClose={() => setShowReport(false)}
                    getMonthlyReport={getMonthlyReport}
                    formatCurrency={formatCurrency}
                />
            )}

            {/* Ticket image lightbox */}
            {lightboxUrl && (
                <div
                    className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
                    onClick={() => setLightboxUrl(null)}
                >
                    <img src={lightboxUrl} alt="Ticket" className="max-w-full max-h-full rounded-xl shadow-2xl" />
                </div>
            )}
        </div>
    );
};
