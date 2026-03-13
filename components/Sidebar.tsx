import React, { useState, useEffect } from 'react';
import { LayoutDashboard, ShoppingCart, Settings, LogOut, Printer, Database, UserCircle, ChevronDown, ChevronRight, Layers, Box, Wrench, UserPlus, Upload, X, ShoppingBag, Scroll, Monitor, Eye, EyeOff, AlertTriangle, ClipboardList, ContactRound, Receipt, Building2, TrendingUp, FileText, Truck, BookOpen, PackageSearch, BarChart3 } from 'lucide-react';
import { User } from '../types';

interface SidebarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  cartCount: number;
  currentUser: User | null;
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  onProfileClick: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  setCurrentView,
  cartCount,
  currentUser,
  isOpen,
  onClose,
  onLogout,
  onProfileClick
}) => {
  // State to track which menu is expanded
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);

  // Admin-only: hidden items control
  const [hiddenItems, setHiddenItems] = useState<Set<string>>(new Set());
  const [showVisibilityPanel, setShowVisibilityPanel] = useState(false);

  const toggleHidden = (id: string) => {
    setHiddenItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleMenu = (menuId: string) => {
    setExpandedMenu(expandedMenu === menuId ? 'none' : menuId);
  };

  // Auto-expand menu when view changes, but only if not manually collapsed
  useEffect(() => {
    const parentItem = menuStructure.find(item =>
      item.subItems?.some(sub => sub.id === currentView)
    );
    if (parentItem && expandedMenu !== 'none') {
      setExpandedMenu(parentItem.id);
    } else if (!parentItem && expandedMenu !== 'none') {
      setExpandedMenu(null);
    }
  }, [currentView]);


  const menuStructure = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['client', 'admin', 'sales']
    },
    {
      id: 'flexible',
      label: 'Materiales Flexibles',
      icon: Scroll,
      roles: ['client', 'admin', 'sales'],
      subItems: [
        { id: 'cat_flexible_vinilos', label: 'Vinilos' },
        { id: 'cat_flexible_laminados', label: 'Laminados' },
        { id: 'cat_flexible_laminados_wrapping', label: 'Wrapping' }, // Moved wrapping family under Laminados
        { id: 'cat_flexible_lonas', label: 'Lonas' },
        { id: 'cat_flexible_papeles', label: 'Papeles' },
        { id: 'cat_flexible_textiles', label: 'Textiles' },
        { id: 'cat_flexible_lienzos', label: 'Lienzos' },
        { id: 'cat_flexible_wrapping', label: 'Wrapping' }, // Moved here as per request (Family inside Vinyls? User said "CREAR LA FAMILIA WRAPPING DENTRO DE VINILOS")
        { id: 'cat_flexible_corte_colores', label: 'Corte Colores' },
        { id: 'cat_flexible_otros', label: 'Otros' },
      ]
    },
    {
      id: 'rigid',
      label: 'Rígidos',
      icon: Layers,
      roles: ['client', 'admin', 'sales'],
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
      roles: ['client', 'admin', 'sales'],
      subItems: [
        { id: 'cat_accessory_herramientas', label: 'Herramientas' },
        { id: 'cat_accessory_ollados', label: 'Ollados' },
        { id: 'cat_accessory_refuerzos', label: 'Refuerzos' },
        { id: 'cat_accessory_adhesivos', label: 'Adhesivos' },
        { id: 'cat_accessory_otros', label: 'Otros' },
      ]
    },
    {
      id: 'display',
      label: 'Displays',
      icon: Monitor,
      roles: ['client', 'admin', 'sales'],
      subItems: [
        { id: 'cat_display_rollups', label: 'Roll-ups' },
        { id: 'cat_display_xban', label: 'X-Banners' },
        { id: 'cat_display_muros', label: 'Muros Pop-up' },
        { id: 'cat_display_mostradores', label: 'Mostradores' },
        { id: 'cat_display_otros', label: 'Otros' },
      ]
    },
    {
      id: 'cat_ink_all',
      label: 'Tintas & Consumibles',
      icon: Printer,
      roles: ['client', 'admin', 'sales'],
      subItems: [
        { id: 'cat_ink_l600_700', label: 'L600 / L700 Series' },
        { id: 'cat_ink_l800', label: 'L800 Series / R530' },
        { id: 'cat_ink_l300', label: 'L300 Series' },
        { id: 'cat_ink_l570_375', label: 'L570 / 375' },
        { id: 'cat_ink_r1000', label: 'R1000' },
        { id: 'cat_ink_r2000', label: 'R2000' },
        { id: 'cat_ink_l1500', label: 'L1500' },
        { id: 'cat_ink_fs50', label: 'FS50' },
        { id: 'cat_ink_fs70', label: 'FS70' },
        { id: 'cat_ink_dtf', label: 'DTF' },
        { id: 'cat_ink_otros', label: 'Otros' },
      ]
    },
    // ── Módulo Ventas ──────────────────────────────────────────
    {
      id: 'ventas',
      label: 'Ventas',
      icon: TrendingUp,
      roles: ['admin', 'sales', 'administracion', 'direccion'],
      subItems: [
        { id: 'ventas_presupuestos', label: 'Presupuestos' },
        { id: 'ventas_pedidos',      label: 'Pedidos de Venta' },
        { id: 'ventas_albaranes',    label: 'Albaranes' },
        { id: 'ventas_facturas',     label: 'Facturas' },
        { id: 'libro_facturas',      label: 'Libro & VeriFactu' },
      ],
    },
    {
      id: 'admin_dashboard',
      label: 'Panel de Administración',
      icon: Settings,
      roles: ['admin']
    },
    {
      id: 'admin_sales_management',
      label: 'Gestión de Comerciales',
      icon: UserCircle,
      roles: ['admin']
    },
    {
      id: 'admin_new_client',
      label: 'Alta Nuevo Cliente',
      icon: UserPlus,
      roles: ['sales']
    },
    {
      id: 'admin_client_list',
      label: 'Mis Clientes',
      icon: UserCircle,
      roles: ['sales']
    },
    {
      id: 'crm',
      label: 'CRM',
      icon: ContactRound,
      roles: ['sales']
    },
    {
      id: 'expenses',
      label: 'Gastos',
      icon: Receipt,
      roles: ['sales', 'tech', 'tech_lead', 'admin']
    },
    {
      id: 'client_orders',
      label: 'Mis Pedidos',
      icon: ShoppingBag,
      roles: ['client', 'admin']
    },
    // ── SAT module ────────────────────────────────────────────────
    {
      id: 'tech_lead_dashboard',
      label: 'Dashboard Técnico',
      icon: LayoutDashboard,
      roles: ['tech_lead'],
    },
    {
      id: 'sat_dashboard',
      label: 'SAT — Panel',
      icon: Wrench,
      roles: ['tech', 'admin'],
    },
    {
      id: 'sat_parts',
      label: 'Incidencias & Partes',
      icon: ClipboardList,
      roles: ['tech', 'tech_lead', 'admin', 'client'],
    },
    {
      id: 'sat_machines',
      label: 'Máquinas',
      icon: Database,
      roles: ['tech_lead', 'admin'],
    },
    {
      id: 'admin_tech_management',
      label: 'Gestión de Técnicos',
      icon: UserPlus,
      roles: ['tech_lead', 'admin'],
    },
    {
      id: 'admin_bulk_import_sat',
      label: 'Carga Masiva SAT',
      icon: Upload,
      roles: ['admin'],
    },
    // ── Módulo Compras ─────────────────────────────────────────
    {
      id: 'compras',
      label: 'Compras',
      icon: PackageSearch,
      roles: ['admin', 'compras', 'almacen', 'administracion', 'direccion'],
      subItems: [
        { id: 'compras_proveedores', label: 'Proveedores' },
        { id: 'compras_oc',          label: 'Órdenes de Compra' },
        { id: 'compras_recepciones', label: 'Recepciones' },
        { id: 'compras_traspasos',   label: 'Traspasos' },
      ],
    },
    // ── Módulo Stock ───────────────────────────────────────────
    {
      id: 'stock',
      label: 'Stock',
      icon: BarChart3,
      roles: ['admin', 'compras', 'almacen', 'administracion', 'direccion'],
    },
    // ── Módulo Empresa ─────────────────────────────────────────
    {
      id: 'admin_empresa',
      label: 'Empresa & Delegaciones',
      icon: Building2,
      roles: ['admin', 'administracion', 'direccion'],
    },
  ];

  // Items visible to current user role (admins also apply their hidden-items filter)
  const filteredItems = menuStructure.filter(item => {
    if (!currentUser || !item.roles.includes(currentUser.role)) return false;
    if (currentUser.role === 'admin' && hiddenItems.has(item.id)) return false;
    if (currentUser.role === 'client' && (currentUser.hiddenCategories || []).includes(item.id)) return false;
    return true;
  });

  // Items that admin can toggle visibility for (catalog families + shopping cart)
  const visibilityControllable = menuStructure.filter(item =>
    ['flexible', 'rigid', 'accessory', 'display', 'cat_ink_all'].includes(item.id)
  );

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <div className={`
            fixed md:sticky top-0 h-[100dvh] md:h-screen bg-white border-r border-slate-200 z-50 w-64 transition-transform duration-300 ease-in-out flex flex-col
            ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <img src="/logo.png" alt="DigitalMarket" className="max-h-12 w-auto" />
          <button onClick={onClose} className="md:hidden text-slate-400 hover:text-slate-900">
            <X size={24} />
          </button>
        </div>

        <div className="px-3 py-2">
          <button
            onClick={onProfileClick}
            className="w-full flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100 hover:bg-slate-100 hover:border-slate-200 transition-all group text-left"
            title="Editar mi perfil"
          >
            <div className="p-1 bgColor-white rounded-md shadow-sm group-hover:shadow transition-all">
              <UserCircle className="text-slate-400 group-hover:text-slate-900 transition-colors" size={24} />
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-xs font-bold text-slate-900 truncate group-hover:text-black">{currentUser?.name}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                {currentUser?.role === 'admin'          ? 'Administrador'
                  : currentUser?.role === 'sales'       ? 'Comercial'
                  : currentUser?.role === 'tech_lead'   ? 'Jefe de Técnicos'
                  : currentUser?.role === 'tech'        ? 'Técnico'
                  : currentUser?.role === 'direccion'   ? 'Dirección'
                  : currentUser?.role === 'administracion' ? 'Administración'
                  : currentUser?.role === 'compras'     ? 'Compras'
                  : currentUser?.role === 'almacen'     ? 'Almacén'
                  : 'Cliente B2B'}
              </p>
            </div>
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto no-scrollbar">
          {filteredItems.map((item) => {
            const hasSubItems = item.subItems && item.subItems.length > 0;
            const isActive = currentView === item.id || (hasSubItems && item.subItems?.some(sub => sub.id === currentView));
            const isExpanded = expandedMenu === item.id;

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
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-1 ${isActive && !hasSubItems
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon size={20} />
                    {item.label}
                  </div>
                  {hasSubItems && (
                    isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />
                  )}
                </button>

                {/* Submenu */}
                {hasSubItems && isExpanded && (
                  <div className="ml-9 space-y-1 mb-2 border-l border-slate-200 pl-2">
                    {item.subItems?.map(sub => (
                      <button
                        key={sub.id}
                        onClick={() => {
                          setCurrentView(sub.id);
                          onClose();
                        }}
                        className={`w-full flex items-center px-4 py-2 rounded-lg text-sm transition-colors ${currentView === sub.id
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

          {/* Admin visibility control panel */}
          {currentUser?.role === 'admin' && (
            <div className="mt-4 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowVisibilityPanel(v => !v)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${showVisibilityPanel
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                title="Controlar visibilidad del menú"
              >
                {showVisibilityPanel ? <EyeOff size={14} /> : <Eye size={14} />}
                Ocultar / Mostrar secciones
              </button>

              {showVisibilityPanel && (
                <div className="mt-2 space-y-1 px-1">
                  {/* Cart / Venta */}
                  <label className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-50 group">
                    <input
                      type="checkbox"
                      checked={!hiddenItems.has('cart_section')}
                      onChange={() => toggleHidden('cart_section')}
                      className="accent-slate-800 w-3.5 h-3.5"
                    />
                    <ShoppingCart size={13} className="text-slate-400 group-hover:text-slate-700" />
                    <span className="text-xs text-slate-600 group-hover:text-slate-900">Mi Pedido (Venta)</span>
                  </label>

                  {visibilityControllable.map(item => (
                    <label key={item.id} className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-50 group">
                      <input
                        type="checkbox"
                        checked={!hiddenItems.has(item.id)}
                        onChange={() => toggleHidden(item.id)}
                        className="accent-slate-800 w-3.5 h-3.5"
                      />
                      <item.icon size={13} className="text-slate-400 group-hover:text-slate-700" />
                      <span className="text-xs text-slate-600 group-hover:text-slate-900">{item.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-slate-100">
          {(['client', 'admin', 'sales', 'administracion', 'direccion'] as string[]).includes(currentUser?.role || '') &&
            !hiddenItems.has('cart_section') && (
              <button
                onClick={() => {
                  setCurrentView('cart');
                  onClose();
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-2 ${currentView === 'cart' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
                  }`}
              >
                <div className="relative">
                  <ShoppingCart size={20} />
                  {cartCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">
                      {cartCount}
                    </span>
                  )}
                </div>
                Mi Pedido
              </button>
            )}
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors">
            <LogOut size={20} />
            Cerrar Sesión
          </button>
        </div>
      </div>
    </>
  );
};



