import React, { useState } from 'react';
import { LayoutDashboard, ShoppingCart, Settings, LogOut, Printer, Database, UserCircle, ChevronDown, ChevronRight, Layers, Box, Wrench, UserPlus, X, ShoppingBag, Scroll } from 'lucide-react';
import { User } from '../types';

interface SidebarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  cartCount: number;
  currentUser: User | null;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView, cartCount, currentUser, isOpen, onClose }) => {
  // State to track which menu is expanded
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);

  const toggleMenu = (menuId: string) => {
    setExpandedMenu(expandedMenu === menuId ? null : menuId);
  };

  const menuStructure = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['client', 'admin']
    },
    {
      id: 'flexible',
      label: 'Materiales Flexibles',
      icon: Scroll,
      roles: ['client', 'admin'],
      subItems: [
        { id: 'cat_flexible_vinilos', label: 'Vinilos' },
        { id: 'cat_flexible_laminados', label: 'Laminados' },
        { id: 'cat_flexible_lonas', label: 'Lonas' },
        { id: 'cat_flexible_papeles', label: 'Papeles' },
        { id: 'cat_flexible_textiles', label: 'Textiles' },
      ]
    },
    {
      id: 'rigid',
      label: 'Rígidos',
      icon: Layers,
      roles: ['client', 'admin'],
      subItems: [
        { id: 'cat_rigid_pvc', label: 'PVC' },
        { id: 'cat_rigid_composite', label: 'Composite' },
        { id: 'cat_rigid_carton_pluma', label: 'Cartón Pluma' },
        { id: 'cat_rigid_metacrilato', label: 'Metacrilato' },
        { id: 'cat_rigid_otros', label: 'Otros' },
      ]
    },
    {
      id: 'accessory',
      label: 'Accesorios',
      icon: Wrench,
      roles: ['client', 'admin'],
      subItems: [
        { id: 'cat_accessory_herramientas', label: 'Herramientas' },
        { id: 'cat_accessory_ollados', label: 'Ollados' },
        { id: 'cat_accessory_refuerzos', label: 'Refuerzos' },
        { id: 'cat_accessory_adhesivos', label: 'Adhesivos' },
        { id: 'cat_accessory_otros', label: 'Otros' },
      ]
    },
    {
      id: 'cat_ink_all',
      label: 'Tintas & Consumibles',
      icon: Printer,
      roles: ['client', 'admin']
    },
    {
      id: 'admin_load',
      label: 'Cargar Materiales',
      icon: Database,
      roles: ['admin']
    },
    {
      id: 'admin_users',
      label: 'Alta Clientes',
      icon: UserPlus,
      roles: ['admin']
    },
    {
      id: 'client_orders',
      label: 'Mis Pedidos',
      icon: ShoppingBag, // Need to import ShoppingBag
      roles: ['client']
    },
  ];

  const filteredItems = menuStructure.filter(item => currentUser && item.roles.includes(currentUser.role));

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          class="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <div class={`
            fixed md:sticky top-0 h-screen bg-white border-r border-slate-200 z-50 w-64 transition-transform duration-300 ease-in-out
            ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
        <div class="p-6 border-b border-slate-100 flex items-center justify-between">
          <img src="/logo.png" alt="DigitalMarket" class="max-h-12 w-auto" />
          <button onClick={onClose} class="md:hidden text-slate-400 hover:text-slate-900">
            <X size={24} />
          </button>
        </div>

        <div class="px-6 py-4">
          <div class="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
            <UserCircle class="text-slate-400" size={24} />
            <div class="overflow-hidden">
              <p class="text-xs font-bold text-slate-900 truncate">{currentUser?.name}</p>
              <p class="text-[10px] text-slate-500 uppercase tracking-wider">{currentUser?.role === 'admin' ? 'Administrador' : 'Cliente B2B'}</p>
            </div>
          </div>
        </div>

        <nav class="flex-1 px-4 space-y-1 overflow-y-auto no-scrollbar">
          {filteredItems.map((item) => {
            const hasSubItems = item.subItems && item.subItems.length > 0;
            const isActive = currentView === item.id || (hasSubItems && item.subItems?.some(sub => sub.id === currentView));
            const isExpanded = expandedMenu === item.id || (hasSubItems && isActive);

            return (
              <div key={item.id}>
                <button
                  onClick={() => {
                    if (hasSubItems) {
                      toggleMenu(item.id);
                    } else {
                      setCurrentView(item.id);
                    }
                  }}
                  class={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors mb-1 ${isActive && !hasSubItems
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                >
                  <div class="flex items-center gap-3">
                    <item.icon size={20} />
                    {item.label}
                  </div>
                  {hasSubItems && (
                    isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />
                  )}
                </button>

                {/* Submenu */}
                {hasSubItems && isExpanded && (
                  <div class="ml-9 space-y-1 mb-2 border-l border-slate-200 pl-2">
                    {item.subItems?.map(sub => (
                      <button
                        key={sub.id}
                        onClick={() => {
                          setCurrentView(sub.id);
                          onClose();
                        }}
                        class={`w-full flex items-center px-4 py-2 rounded-lg text-sm transition-colors ${currentView === sub.id
                          ? 'text-slate-900 font-bold bg-slate-100'
                          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                          }`}
                      >
                        {sub.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div class="p-4 border-t border-slate-100">
          {currentUser?.role === 'client' && (
            <button
              onClick={() => {
                setCurrentView('cart');
                onClose();
              }}
              class={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors mb-2 ${currentView === 'cart' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
                }`}
            >
              <div class="relative">
                <ShoppingCart size={20} />
                {cartCount > 0 && (
                  <span class="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">
                    {cartCount}
                  </span>
                )}
              </div>
              Mi Pedido
            </button>
          )}
          <button
            onClick={() => setCurrentView('login')}
            class="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors">
            <LogOut size={20} />
            Cerrar Sesión
          </button>
        </div>
      </div>
    </>
  );
};


