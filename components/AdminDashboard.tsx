import React from 'react';
import { UserPlus, Download, Settings, Droplets, Package, Users, Database } from 'lucide-react';

interface AdminDashboardProps {
    onNavigate: (view: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
    return (
        <div className="p-4 md:p-10 max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-slate-900 mb-8">Panel de Administración</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div onClick={() => onNavigate('admin_client_list')} className="bg-white p-8 rounded-xl shadow-lg border border-slate-200 cursor-pointer hover:border-blue-300 hover:shadow-blue-100 transition-all group">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <UserPlus className="text-blue-600" size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Gestión de Clientes</h3>
                    <p className="text-slate-500">Ver estado, pedidos, rappels e informe de todos los clientes.</p>
                </div>

                <div onClick={() => onNavigate('admin_new_client')} className="bg-white p-8 rounded-xl shadow-lg border border-slate-200 cursor-pointer hover:border-green-300 hover:shadow-green-100 transition-all group">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <UserPlus className="text-green-600" size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Alta de Cliente</h3>
                    <p className="text-slate-500">Registrar un nuevo cliente, asignar comercial y configurar precios.</p>
                </div>

                <div onClick={() => onNavigate('admin_load')} className="bg-white p-8 rounded-xl shadow-lg border border-slate-200 cursor-pointer hover:border-slate-400 transition-all group">
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Download className="text-orange-600" size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Carga Masiva</h3>
                    <p className="text-slate-500">Importar productos desde CSV o gestionar el stock masivamente.</p>
                </div>

                <div onClick={() => onNavigate('admin_bulk_edit')} className="bg-white p-8 rounded-xl shadow-lg border border-slate-200 cursor-pointer hover:border-slate-400 transition-all group">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Settings className="text-green-600" size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Edición Masiva</h3>
                    <p className="text-slate-500">Modificar descripción, precio y peso de múltiples productos simultáneamente.</p>
                </div>

                <div onClick={() => onNavigate('admin_coupons')} className="bg-white p-8 rounded-xl shadow-lg border border-slate-200 cursor-pointer hover:border-purple-300 hover:shadow-purple-100 transition-all group">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Droplets className="text-purple-600" size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Cupones Promocionales</h3>
                    <p className="text-slate-500">Crear y gestionar códigos de descuento de un solo uso.</p>
                </div>

                <div onClick={() => onNavigate('admin_products')} className="bg-white p-8 rounded-xl shadow-lg border border-slate-200 cursor-pointer hover:border-teal-300 hover:shadow-teal-100 transition-all group">
                    <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Package className="text-teal-600" size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Gestión de Productos</h3>
                    <p className="text-slate-500">Ver, editar y eliminar productos del catálogo individualmente.</p>
                </div>

                <div onClick={() => onNavigate('admin_sales_management')} className="bg-white p-8 rounded-xl shadow-lg border border-slate-200 cursor-pointer hover:border-indigo-300 hover:shadow-indigo-100 transition-all group">
                    <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Users className="text-indigo-600" size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Gestión de Comerciales</h3>
                    <p className="text-slate-500">Supervisar la cartera de clientes y ventas de cada comercial.</p>
                </div>

                <div onClick={() => onNavigate('sat_machines')} className="bg-white p-8 rounded-xl shadow-lg border border-slate-200 cursor-pointer hover:border-orange-300 hover:shadow-orange-100 transition-all group">
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Database className="text-orange-600" size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Gestión de Máquinas</h3>
                    <p className="text-slate-500">Administrar el parque de máquinas, garantías y documentos técnicos.</p>
                </div>
            </div>
        </div>
    );
};
