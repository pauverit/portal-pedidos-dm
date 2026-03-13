import React, { useState } from 'react';
import { X, Printer, Receipt, Car, Hotel, Package, TrendingUp, FileText } from 'lucide-react';
import { Expense, ExpenseMonthlyReport, ExpenseType } from '../types';

interface ExpenseReportModalProps {
    userId: string;
    userName: string;
    expenses: Expense[];
    onClose: () => void;
    getMonthlyReport: (month: number, year: number, expenses?: Expense[]) => ExpenseMonthlyReport;
    formatCurrency: (v: number) => string;
}

const MONTH_NAMES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const TYPE_META: Record<ExpenseType, { label: string; icon: React.ElementType; color: string }> = {
    restaurant: { label: 'Restaurante / Comida', icon: Receipt, color: 'text-orange-600' },
    km: { label: 'Kilómetros', icon: Car, color: 'text-blue-600' },
    hotel: { label: 'Alojamiento / Hotel', icon: Hotel, color: 'text-indigo-600' },
    other: { label: 'Otros gastos', icon: Package, color: 'text-slate-600' },
};

export const ExpenseReportModal: React.FC<ExpenseReportModalProps> = ({
    userName, expenses, onClose, getMonthlyReport, formatCurrency
}) => {
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth());
    const [year, setYear] = useState(now.getFullYear());

    const report = getMonthlyReport(month, year, expenses);

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden-backdrop">
            <style>{`
                @media print {
                    body > *:not(#expense-report-print) { display: none !important; }
                    #expense-report-print { display: block !important; position: fixed; inset: 0; z-index: 9999; background: white; padding: 40px; }
                    .no-print { display: none !important; }
                }
            `}</style>

            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100 no-print sticky top-0 bg-white z-10">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-100 p-2 rounded-xl">
                            <FileText size={18} className="text-indigo-700" />
                        </div>
                        <h2 className="text-base font-bold text-slate-900">Informe de Gastos</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-900 no-print"><X size={20} /></button>
                </div>

                <div id="expense-report-print" className="p-4 space-y-4">
                    {/* Month selector */}
                    <div className="flex gap-3 no-print">
                        <select
                            value={month}
                            onChange={e => setMonth(parseInt(e.target.value))}
                            className="border border-slate-200 rounded-xl px-4 py-2 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900 flex-1"
                        >
                            {MONTH_NAMES.map((m, i) => <option key={i} value={i}>{m}</option>)}
                        </select>
                        <select
                            value={year}
                            onChange={e => setYear(parseInt(e.target.value))}
                            className="border border-slate-200 rounded-xl px-4 py-2 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900 w-28"
                        >
                            {[now.getFullYear() - 1, now.getFullYear()].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>

                    {/* Report title (visible on print) */}
                    <div className="text-center border-b border-slate-200 pb-4">
                        <p className="text-xs text-slate-400 uppercase tracking-widest">Informe de Gastos</p>
                        <h1 className="text-xl font-black text-slate-900 mt-1">{MONTH_NAMES[month]} {year}</h1>
                        <p className="text-sm text-slate-500 mt-0.5">{userName}</p>
                    </div>

                    {/* KPI tiles */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-slate-50 rounded-xl p-4 text-center">
                            <p className="text-xl font-black text-slate-900">{formatCurrency(report.totalAmount)}</p>
                            <p className="text-xs font-bold text-slate-400 uppercase mt-1">Total Mes</p>
                        </div>
                        <div className="bg-orange-50 rounded-xl p-4 text-center">
                            <p className="text-xl font-black text-orange-700">{report.byType.restaurant.count}</p>
                            <p className="text-xs font-bold text-orange-400 uppercase mt-1">Tickets</p>
                        </div>
                        <div className="bg-blue-50 rounded-xl p-4 text-center">
                            <p className="text-xl font-black text-blue-700">{report.totalKm.toFixed(0)} km</p>
                            <p className="text-xs font-bold text-blue-400 uppercase mt-1">Kilómetros</p>
                        </div>
                    </div>

                    {/* By type breakdown */}
                    <div>
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Desglose por categoría</h3>
                        <div className="space-y-2">
                            {(Object.keys(TYPE_META) as ExpenseType[]).map(t => {
                                const meta = TYPE_META[t];
                                const data = report.byType[t];
                                if (data.count === 0) return null;
                                return (
                                    <div key={t} className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2">
                                        <div className="flex items-center gap-3">
                                            <meta.icon size={16} className={meta.color} />
                                            <div>
                                                <p className="text-sm font-semibold text-slate-900">{meta.label}</p>
                                                <p className="text-xs text-slate-400">
                                                    {data.count} {data.count === 1 ? 'registro' : 'registros'}
                                                    {t === 'km' && data.km !== undefined ? ` · ${data.km.toFixed(1)} km` : ''}
                                                </p>
                                            </div>
                                        </div>
                                        <p className="font-bold text-slate-900">{formatCurrency(data.amount)}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Expense list */}
                    {report.expenses.length > 0 && (
                        <div>
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Detalle de gastos</h3>
                            <div className="border border-slate-100 rounded-xl overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="text-left px-4 py-2 text-xs font-bold text-slate-500 uppercase">Fecha</th>
                                            <th className="text-left px-4 py-2 text-xs font-bold text-slate-500 uppercase">Tipo</th>
                                            <th className="text-left px-4 py-2 text-xs font-bold text-slate-500 uppercase">Descripción</th>
                                            <th className="text-right px-4 py-2 text-xs font-bold text-slate-500 uppercase">Importe</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {report.expenses.map(e => {
                                            const meta = TYPE_META[e.type];
                                            return (
                                                <tr key={e.id} className="hover:bg-slate-50">
                                                    <td className="px-3 py-2 text-slate-500">{new Date(e.expenseDate).toLocaleDateString('es-ES')}</td>
                                                    <td className="px-3 py-2">
                                                        <div className="flex items-center gap-1.5">
                                                            <meta.icon size={12} className={meta.color} />
                                                            <span className="text-slate-700">{meta.label}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2 text-slate-500">
                                                        {e.description || (e.type === 'km' ? `${e.km?.toFixed(1)} km` : '—')}
                                                    </td>
                                                    <td className="px-3 py-2 text-right font-bold text-slate-900">{formatCurrency(e.amount)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot className="bg-slate-900 text-white">
                                        <tr>
                                            <td colSpan={3} className="px-3 py-2 font-bold text-sm">TOTAL</td>
                                            <td className="px-3 py-2 text-right font-black text-base">{formatCurrency(report.totalAmount)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    )}

                    {report.expenses.length === 0 && (
                        <div className="py-10 text-center">
                            <TrendingUp size={36} className="text-slate-200 mx-auto mb-2" />
                            <p className="text-slate-400 text-sm">No hay gastos en {MONTH_NAMES[month]} {year}</p>
                        </div>
                    )}
                </div>

                {/* Footer actions */}
                <div className="flex gap-3 p-6 border-t border-slate-100 no-print">
                    <button onClick={onClose} className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                        Cerrar
                    </button>
                    <button
                        onClick={handlePrint}
                        className="flex-1 bg-slate-900 text-white rounded-xl py-2.5 text-sm font-bold hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                    >
                        <Printer size={14} />
                        Imprimir / PDF
                    </button>
                </div>
            </div>
        </div>
    );
};
