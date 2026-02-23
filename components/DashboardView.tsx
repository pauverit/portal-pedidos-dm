import React from 'react';
import { Plus } from 'lucide-react';
import { User } from '../types';

interface DashboardViewProps {
    currentUser: User;
    onNewOrder: () => void;
    formatCurrency: (value: number) => string;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ currentUser, onNewOrder, formatCurrency }) => {
    return (
        <div className="p-6 md:p-10 max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Hola, {currentUser.name}</h1>
            <p className="text-slate-500 mb-8">Bienvenido a tu área privada B2B.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-slate-900 rounded-xl p-6 text-white shadow-xl relative overflow-hidden">
                    <div className="relative z-10">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Saldo Rappel Disponible</h3>
                        <p className="text-4xl font-bold">{formatCurrency(currentUser.rappelAccumulated || 0)}</p>
                        <p className="text-xs text-slate-400 mt-4">* Caducidad 12 meses desde generación.</p>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-center items-center text-center cursor-pointer hover:border-slate-400 transition-colors" onClick={onNewOrder}>
                    <div className="bg-slate-50 p-4 rounded-full mb-3">
                        <Plus className="text-slate-900" size={24} />
                    </div>
                    <h3 className="font-bold text-slate-900">Nuevo Pedido</h3>
                    <p className="text-slate-500 text-sm">Acceder al catálogo completo</p>
                </div>
            </div>
        </div>
    );
};
