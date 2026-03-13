import React from 'react';
import { Plus, MonitorSmartphone, FileText, Award, MessageCircle, ExternalLink } from 'lucide-react';
import { User } from '../types';

interface DashboardViewProps {
    currentUser: User;
    onNewOrder: () => void;
    formatCurrency: (value: number) => string;
}

const PRINT_OS_URL = 'https://login3.id.hp.com/login3?flow=https://directory.id.hp.com/directory/v1/authentication/login/AWGh19gjTkfe4BkNCgWKH1qxUBTzAAAAAAAAAADZDnGxsRUIv8pGWgQ6zmmhBWAvEnLCzVDZZPIoJ5LOz9J1Og_cvBOEu_DTKNfUnV1FhpnbhwxJiWkPCCGESi0J0s2kahSi_qdKA6nIKhndO4pIRareriNBzdM9ArmrEBaBnFOSHKj5pxVCxBOJwTGyb_FtKR3DQVKrOUKcGlJkAABeSqCpNgTvtOWRO0HSraMx-RxUiY8TdiU_RD780Yh-1LlYrzuTdXciEuVV2h4igoDZja7K4XU5gLYaFmSxT9f0WX32cxQlf5Zw6VtczGPT6hy7g2PVvpb0xj7UelqnN33TRpNJEZ7oKwV5BgSLINApOAoAmU0EHuj9sQoo0hETC1iIj7Hx9LCD6huJTVNvkTWDob_pLTAIEGnnY963zD-EmDn5oRpfKkYE2tc7BEbWUhHIA1eiKCsDIFlmW1Ni9hbHQ_dU0-APP3ofdrr1EbEHRbD7uJ9k5fIZ8EmaJNHQ0KAI2ZXDpD3S343RxH_qO4RQH_Rf0MnPwiQr9rRvgXFgPef9iIioF5rhG63J8wXJ&hide_create=true&locale=en-US';
const WHATSAPP_URL = 'https://wa.me/34611855866?text=Hola%2C%20necesito%20soporte%20t%C3%A9cnico';

interface QuickAccessItem {
    icon: React.ElementType;
    label: string;
    description: string;
    badge?: string;
    color: string;
    iconBg: string;
    onClick?: () => void;
    href?: string;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ currentUser, onNewOrder, formatCurrency }) => {
    const quickAccess: QuickAccessItem[] = [
        {
            icon: MonitorSmartphone,
            label: 'HP PrintOS',
            description: 'Accede al portal de gestión de impresión de HP',
            badge: 'Externo',
            color: 'text-blue-600',
            iconBg: 'bg-blue-50',
            href: PRINT_OS_URL,
        },
        {
            icon: FileText,
            label: 'Fichas Técnicas',
            description: 'Repositorio de fichas técnicas de materiales en PDF',
            badge: 'Próximamente',
            color: 'text-emerald-600',
            iconBg: 'bg-emerald-50',
        },
        {
            icon: Award,
            label: 'Certificados HP',
            description: 'Repositorio de certificados y homologaciones HP',
            badge: 'Próximamente',
            color: 'text-indigo-600',
            iconBg: 'bg-indigo-50',
        },
        {
            icon: MessageCircle,
            label: 'Soporte Técnico',
            description: 'Contacta con nuestro servicio técnico por WhatsApp',
            badge: 'WhatsApp',
            color: 'text-green-600',
            iconBg: 'bg-green-50',
            href: WHATSAPP_URL,
        },
    ];

    return (
        <div className="p-4 md:p-10 max-w-7xl mx-auto space-y-10">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-slate-900 mb-1">Hola, {currentUser.name}</h1>
                <p className="text-slate-500">Bienvenido a tu área privada B2B.</p>
            </div>

            {/* Main cards: rappel + new order */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
                    <div className="relative z-10">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Saldo Rappel Disponible</h3>
                        <p className="text-5xl font-black">{formatCurrency(currentUser.rappelAccumulated || 0)}</p>

                        <div className="mt-6 pt-4 border-t border-white/10 space-y-2">
                            <p className="text-sm font-medium flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-green-400 rounded-full shadow-[0_0_8px_rgba(74,222,128,0.5)]" />
                                Acumulas un <span className="text-green-400 font-bold">3%</span> en pedidos {'>'} <span className="font-bold">{formatCurrency(currentUser.rappelThreshold || 300)}</span>
                            </p>
                            <p className="text-[11px] text-slate-400">
                                * Canjeable en pedidos superiores a {formatCurrency((currentUser.rappelThreshold || 300) * 1.5)}
                            </p>
                            <p className="text-[10px] text-slate-500 italic">
                                La caducidad es de 12 meses desde su generación.
                            </p>
                        </div>
                    </div>
                </div>

                <div
                    className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col justify-center items-center text-center cursor-pointer hover:border-slate-900 hover:bg-slate-50 transition-all group"
                    onClick={onNewOrder}
                >
                    <div className="bg-slate-100 group-hover:bg-slate-900 p-4 rounded-full mb-3 transition-colors">
                        <Plus className="text-slate-900 group-hover:text-white transition-colors" size={28} />
                    </div>
                    <h3 className="font-bold text-slate-900 text-base">Nuevo Pedido</h3>
                    <p className="text-slate-500 text-sm mt-1">Acceder al catálogo completo</p>
                </div>
            </div>

            {/* Quick Access Section */}
            <div>
                <h2 className="text-base font-bold text-slate-900 mb-4">Accesos Rápidos</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {quickAccess.map((item) => {
                        const isComingSoon = item.badge === 'Próximamente';
                        const content = (
                            <div className={`bg-white rounded-2xl border border-slate-100 p-5 flex flex-col gap-4 shadow-sm transition-all h-full ${isComingSoon ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-md hover:border-slate-300 cursor-pointer'}`}>
                                <div className="flex items-start justify-between">
                                    <div className={`${item.iconBg} p-3 rounded-xl`}>
                                        <item.icon className={item.color} size={22} />
                                    </div>
                                    {item.badge && (
                                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full tracking-wider ${item.badge === 'Próximamente' ? 'bg-slate-100 text-slate-400' :
                                            item.badge === 'WhatsApp' ? 'bg-green-100 text-green-700' :
                                                'bg-blue-100 text-blue-700'
                                            }`}>
                                            {item.badge}
                                        </span>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-slate-900 mb-1">{item.label}</h4>
                                    <p className="text-xs text-slate-500 leading-relaxed">{item.description}</p>
                                </div>
                                {!isComingSoon && (
                                    <div className={`flex items-center gap-1 text-xs font-bold ${item.color}`}>
                                        <ExternalLink size={12} />
                                        Abrir
                                    </div>
                                )}
                            </div>
                        );

                        if (item.href && !isComingSoon) {
                            return (
                                <a key={item.label} href={item.href} target="_blank" rel="noopener noreferrer" className="no-underline h-full">
                                    {content}
                                </a>
                            );
                        }
                        return <div key={item.label} className="h-full">{content}</div>;
                    })}
                </div>
            </div>
        </div>
    );
};
