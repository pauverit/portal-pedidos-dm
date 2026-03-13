import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, ShoppingCart, Settings, LogOut, Printer, Database,
  UserCircle, ChevronDown, ChevronRight, Layers, Wrench, UserPlus,
  Upload, X, ShoppingBag, Scroll, Monitor, Eye, EyeOff, ClipboardList,
  ContactRound, Receipt, Building2, TrendingUp, FileText, Truck, BookOpen,
  PackageSearch, BarChart3, Package, Users, Droplets, Download, RefreshCcw,
} from 'lucide-react';
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

type SubItemDef = { id: string; label: string; soon?: boolean };
type MenuItemDef = {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  roles: string[];
  section?: string;   // section header shown above the first item of each new section
  soon?: boolean;
  subItems?: SubItemDef[];
};

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  setCurrentView,
  cartCount,
  currentUser,
  isOpen,
  onClose,
  onLogout,
  onProfileClick,
}) => {
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);

  const toggleMenu = (menuId: string) => {
    setExpandedMenu(prev => (prev === menuId ? null : menuId));
  };

  const menuStructure: MenuItemDef[] = [
    // ── Dashboard (todos) ──────────────────────────────────────────────────
    {
      id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard,
      roles: ['client', 'admin', 'sales', 'tech', 'tech_lead', 'administracion', 'direccion', 'compras', 'almacen'],
    },

    // ── CATÁLOGO (clientes y comerciales) ─────────────────────────────────
    { id: 'flexible', label: 'Materiales Flexibles', icon: Scroll, section: 'Catálogo', roles: ['client', 'sales'], subItems: [
      { id: 'cat_flexible_vinilos',            label: 'Vinilos' },
      { id: 'cat_flexible_laminados',          label: 'Laminados' },
      { id: 'cat_flexible_laminados_wrapping', label: 'Wrapping (Laminados)' },
      { id: 'cat_flexible_lonas',              label: 'Lonas' },
      { id: 'cat_flexible_papeles',            label: 'Papeles' },
      { id: 'cat_flexible_textiles',           label: 'Textiles' },
      { id: 'cat_flexible_lienzos',            label: 'Lienzos' },
      { id: 'cat_flexible_wrapping',           label: 'Wrapping (Vinilos)' },
      { id: 'cat_flexible_corte_colores',      label: 'Corte Colores' },
      { id: 'cat_flexible_otros',              label: 'Otros' },
    ]},
    { id: 'rigid', label: 'Rígidos', icon: Layers, section: 'Catálogo', roles: ['client', 'sales'], subItems: [
      { id: 'cat_rigid_pvc',          label: 'PVC' },
      { id: 'cat_rigid_composite',    label: 'Composite' },
      { id: 'cat_rigid_carton_pluma', label: 'Cartón Pluma' },
      { id: 'cat_rigid_metacrilato',  label: 'Metacrilato' },
      { id: 'cat_rigid_otros',        label: 'Otros' },
    ]},
    { id: 'accessory', label: 'Accesorios', icon: Wrench, section: 'Catálogo', roles: ['client', 'sales'], subItems: [
      { id: 'cat_accessory_herramientas', label: 'Herramientas' },
      { id: 'cat_accessory_ollados',      label: 'Ollados' },
      { id: 'cat_accessory_refuerzos',    label: 'Refuerzos' },
      { id: 'cat_accessory_adhesivos',    label: 'Adhesivos' },
      { id: 'cat_accessory_otros',        label: 'Otros' },
    ]},
    { id: 'display', label: 'Displays', icon: Monitor, section: 'Catálogo', roles: ['client', 'sales'], subItems: [
      { id: 'cat_display_rollups',     label: 'Roll-ups' },
      { id: 'cat_display_xban',        label: 'X-Banners' },
      { id: 'cat_display_muros',       label: 'Muros Pop-up' },
      { id: 'cat_display_mostradores', label: 'Mostradores' },
      { id: 'cat_display_otros',       label: 'Otros' },
    ]},
    { id: 'cat_ink_all', label: 'Tintas & Consumibles', icon: Printer, section: 'Catálogo', roles: ['client', 'sales'], subItems: [
      { id: 'cat_ink_l600_700',  label: 'L600 / L700 Series' },
      { id: 'cat_ink_l800',      label: 'L800 Series / R530' },
      { id: 'cat_ink_l300',      label: 'L300 Series' },
      { id: 'cat_ink_l570_375',  label: 'L570 / 375' },
      { id: 'cat_ink_r1000',     label: 'R1000' },
      { id: 'cat_ink_r2000',     label: 'R2000' },
      { id: 'cat_ink_l1500',     label: 'L1500' },
      { id: 'cat_ink_fs50',      label: 'FS50' },
      { id: 'cat_ink_fs70',      label: 'FS70' },
      { id: 'cat_ink_dtf',       label: 'DTF' },
      { id: 'cat_ink_otros',     label: 'Otros' },
    ]},
    { id: 'client_orders', label: 'Mis Pedidos', icon: ShoppingBag, section: 'Catálogo', roles: ['client'] },

    // ── VENTAS ────────────────────────────────────────────────────────────
    { id: 'ventas_presupuestos',    label: 'Presupuestos',           icon: FileText,    section: 'Ventas', roles: ['admin', 'sales', 'administracion', 'direccion'] },
    { id: 'ventas_pedidos',         label: 'Pedidos de Venta',       icon: ShoppingCart,section: 'Ventas', roles: ['admin', 'sales', 'administracion', 'direccion'] },
    { id: 'ventas_albaranes',       label: 'Albaranes',              icon: Truck,       section: 'Ventas', roles: ['admin', 'sales', 'administracion', 'direccion'] },
    { id: 'ventas_facturas',        label: 'Facturas',               icon: Receipt,     section: 'Ventas', roles: ['admin', 'sales', 'administracion', 'direccion'] },
    { id: 'libro_facturas',         label: 'Libro & VeriFactu',      icon: BookOpen,    section: 'Ventas', roles: ['admin', 'administracion', 'direccion'] },
    { id: 'facturacion_recurrente', label: 'Facturación Recurrente', icon: RefreshCcw,  section: 'Ventas', roles: ['admin', 'administracion', 'direccion'], soon: true },

    // ── CLIENTES ──────────────────────────────────────────────────────────
    { id: 'crm',               label: 'CRM',           icon: ContactRound, section: 'Clientes', roles: ['admin', 'sales', 'administracion', 'direccion'] },
    { id: 'admin_client_list', label: 'Clientes',      icon: Users,        section: 'Clientes', roles: ['admin', 'sales', 'administracion', 'direccion'] },
    { id: 'admin_new_client',  label: 'Nuevo Cliente', icon: UserPlus,     section: 'Clientes', roles: ['admin', 'sales'] },

    // ── COMPRAS ───────────────────────────────────────────────────────────
    { id: 'compras', label: 'Compras', icon: PackageSearch, section: 'Compras',
      roles: ['admin', 'compras', 'almacen', 'administracion', 'direccion'], subItems: [
        { id: 'compras_proveedores', label: 'Proveedores' },
        { id: 'compras_oc',          label: 'Órdenes de Compra' },
        { id: 'compras_recepciones', label: 'Recepciones' },
        { id: 'compras_traspasos',   label: 'Traspasos' },
    ]},
    { id: 'stock',    label: 'Almacén & Stocks', icon: BarChart3, section: 'Compras', roles: ['admin', 'compras', 'almacen', 'administracion', 'direccion'] },
    { id: 'expenses', label: 'Gastos',            icon: Receipt,   section: 'Compras', roles: ['admin', 'sales', 'tech', 'tech_lead', 'administracion', 'direccion'] },

    // ── CONTABILIDAD (próximamente) ───────────────────────────────────────
    { id: 'contabilidad',          label: 'Contabilidad',          icon: BookOpen,   section: 'Contabilidad', roles: ['admin', 'administracion', 'direccion'], soon: true },
    { id: 'analisis_rentabilidad', label: 'Análisis Rentabilidad', icon: TrendingUp, section: 'Contabilidad', roles: ['admin', 'administracion', 'direccion'], soon: true },
    { id: 'remesas_sepa',          label: 'Remesas SEPA',          icon: Building2,  section: 'Contabilidad', roles: ['admin', 'administracion', 'direccion'], soon: true },

    // ── SAT / SOPORTE ─────────────────────────────────────────────────────
    { id: 'tech_lead_dashboard',   label: 'Dashboard Técnico',   icon: LayoutDashboard, section: 'SAT / Soporte', roles: ['tech_lead'] },
    { id: 'sat_dashboard',         label: 'SAT — Panel',          icon: Wrench,          section: 'SAT / Soporte', roles: ['tech', 'admin'] },
    { id: 'sat_parts',             label: 'Incidencias & Partes', icon: ClipboardList,   section: 'SAT / Soporte', roles: ['tech', 'tech_lead', 'admin', 'client'] },
    { id: 'sat_machines',          label: 'Máquinas',             icon: Database,        section: 'SAT / Soporte', roles: ['tech_lead', 'admin'] },
    { id: 'admin_tech_management', label: 'Gestión Técnicos',     icon: UserPlus,        section: 'SAT / Soporte', roles: ['tech_lead', 'admin'] },
    { id: 'admin_bulk_import_sat', label: 'Carga Masiva SAT',     icon: Upload,          section: 'SAT / Soporte', roles: ['admin'] },

    // ── CONFIGURACIÓN ─────────────────────────────────────────────────────
    { id: 'admin_empresa',          label: 'Empresa & Sedes',     icon: Building2,  section: 'Configuración', roles: ['admin', 'administracion', 'direccion'] },
    { id: 'admin_sales_management', label: 'Gestión Comerciales', icon: UserCircle, section: 'Configuración', roles: ['admin'] },
    { id: 'admin_products',         label: 'Gestión Productos',   icon: Package,    section: 'Configuración', roles: ['admin'] },
    { id: 'admin_load',             label: 'Importar CSV',        icon: Download,   section: 'Configuración', roles: ['admin'] },
    { id: 'admin_bulk_edit',        label: 'Edición Masiva',      icon: Settings,   section: 'Configuración', roles: ['admin'] },
    { id: 'admin_coupons',          label: 'Cupones',             icon: Droplets,   section: 'Configuración', roles: ['admin'] },
    { id: 'admin_dashboard',        label: 'Panel Admin',         icon: Settings,   section: 'Configuración', roles: ['admin'] },
  ];

  const filteredItems = menuStructure.filter(item => {
    if (!currentUser || !item.roles.includes(currentUser.role)) return false;
    if (currentUser.role === 'client' && (currentUser.hiddenCategories || []).includes(item.id)) return false;
    return true;
  });

  // Auto-expand parent menu when active sub-item changes
  useEffect(() => {
    const parentItem = filteredItems.find(item =>
      item.subItems?.some(sub => sub.id === currentView)
    );
    if (parentItem) setExpandedMenu(parentItem.id);
  }, [currentView]); // eslint-disable-line react-hooks/exhaustive-deps

  const roleLabel = (role: string) =>
    role === 'admin'           ? 'Administrador'
    : role === 'sales'         ? 'Comercial'
    : role === 'tech_lead'     ? 'Jefe de Técnicos'
    : role === 'tech'          ? 'Técnico'
    : role === 'direccion'     ? 'Dirección'
    : role === 'administracion'? 'Administración'
    : role === 'compras'       ? 'Compras'
    : role === 'almacen'       ? 'Almacén'
    : 'Cliente B2B';

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onClose} />
      )}

      <div className={`
        fixed md:sticky top-0 h-[100dvh] md:h-screen bg-white border-r border-slate-200 z-50 w-64
        transition-transform duration-300 ease-in-out flex flex-col
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <img src="/logo.png" alt="DigitalMarket" className="max-h-12 w-auto" />
          <button onClick={onClose} className="md:hidden text-slate-400 hover:text-slate-900">
            <X size={22} />
          </button>
        </div>

        {/* Profile */}
        <div className="px-3 py-2">
          <button
            onClick={onProfileClick}
            className="w-full flex items-center gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100 hover:bg-slate-100 hover:border-slate-200 transition-all group text-left"
          >
            <UserCircle className="text-slate-400 group-hover:text-slate-700 flex-shrink-0" size={22} />
            <div className="overflow-hidden flex-1">
              <p className="text-xs font-bold text-slate-900 truncate">{currentUser?.name}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                {roleLabel(currentUser?.role || '')}
              </p>
            </div>
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-1 overflow-y-auto no-scrollbar">
          {filteredItems.map((item, idx) => {
            const prevItem = idx > 0 ? filteredItems[idx - 1] : null;
            const showSectionHeader = item.section && item.section !== prevItem?.section;
            const hasSubItems = !!(item.subItems && item.subItems.length > 0);
            const isActive = !item.soon && (
              currentView === item.id ||
              (hasSubItems && item.subItems?.some(sub => sub.id === currentView))
            );
            const isExpanded = expandedMenu === item.id;

            return (
              <div key={item.id}>
                {showSectionHeader && (
                  <div className="px-1 pt-4 pb-1">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                      {item.section}
                    </p>
                  </div>
                )}

                <button
                  onClick={() => {
                    if (item.soon) return;
                    if (hasSubItems) {
                      toggleMenu(item.id);
                    } else {
                      setCurrentView(item.id);
                      onClose();
                    }
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-0.5 ${
                    item.soon
                      ? 'text-slate-300 cursor-default'
                      : isActive && !hasSubItems
                        ? 'bg-slate-900 text-white shadow-sm'
                        : isActive && hasSubItems
                          ? 'text-slate-900 bg-slate-100'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <item.icon size={17} className="flex-shrink-0" />
                    <span className="truncate">{item.label}</span>
                    {item.soon && (
                      <span className="ml-1 text-[8px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-400 uppercase tracking-wider flex-shrink-0">
                        soon
                      </span>
                    )}
                  </div>
                  {hasSubItems && !item.soon && (
                    isExpanded
                      ? <ChevronDown size={13} className="flex-shrink-0" />
                      : <ChevronRight size={13} className="flex-shrink-0" />
                  )}
                </button>

                {/* Submenu */}
                {hasSubItems && isExpanded && !item.soon && (
                  <div className="ml-7 mb-1 border-l border-slate-200 pl-2 space-y-0.5">
                    {item.subItems?.map(sub => (
                      <button
                        key={sub.id}
                        onClick={() => {
                          if (sub.soon) return;
                          setCurrentView(sub.id);
                          onClose();
                        }}
                        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-sm transition-colors ${
                          sub.soon
                            ? 'text-slate-300 cursor-default'
                            : currentView === sub.id
                              ? 'text-slate-900 font-bold bg-slate-100'
                              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                      >
                        <span>{sub.label}</span>
                        {sub.soon && (
                          <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-slate-100 text-slate-300 uppercase">
                            soon
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Bottom: Cart + Logout */}
        <div className="p-3 border-t border-slate-100 space-y-1">
          {(['client', 'admin', 'sales', 'administracion', 'direccion'] as string[]).includes(currentUser?.role || '') && (
            <button
              onClick={() => { setCurrentView('cart'); onClose(); }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentView === 'cart' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="relative">
                <ShoppingCart size={17} />
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
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut size={17} />
            Cerrar Sesión
          </button>
        </div>
      </div>
    </>
  );
};
