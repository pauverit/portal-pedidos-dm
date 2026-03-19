import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, ShoppingCart, Settings, LogOut, Printer, Database,
  UserCircle, ChevronDown, ChevronRight, Layers, Wrench, UserPlus,
  Upload, X, ShoppingBag, Scroll, Monitor, ClipboardList,
  ContactRound, Receipt, Building2, TrendingUp, FileText, Truck, BookOpen,
  PackageSearch, BarChart3, Package, Users, Droplets, Download, RefreshCcw,
  Boxes, ShieldAlert, ScanSearch, ArrowRightLeft, CalendarDays,
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
  section?: string;
  soon?: boolean;
  subItems?: SubItemDef[];
};

// ─── Grupos de roles ────────────────────────────────────────────────────────────
// CLIENTES:        client
// COMERCIALES:     sales, sales_lead
// TÉCNICOS:        tech, tech_lead
// ADMINISTRACIÓN:  admin, administracion, direccion, compras, almacen

const ROLES_ADMIN  = ['admin', 'administracion', 'direccion'];
const ROLES_VENTAS = ['admin', 'sales', 'sales_lead', 'administracion', 'direccion'];
const ROLES_COMERCIAL = ['sales', 'sales_lead'];

// ─── Color del punto de sección (estilo SAGE) ───────────────────────────────
const SECTION_DOT: Record<string, string> = {
  'Catálogo':       'bg-amber-400',
  'Ventas':         'bg-blue-500',
  'Clientes':       'bg-cyan-500',
  'Compras':        'bg-green-500',
  'Gastos':         'bg-orange-500',
  'Contabilidad':   'bg-indigo-500',
  'SAT / Soporte':  'bg-orange-400',
  'RRHH':           'bg-violet-500',
  'Configuración':  'bg-slate-400',
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
    // ── Dashboard (todos) ─────────────────────────────────────────────────────
    {
      id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard,
      roles: ['client', 'admin', 'sales', 'sales_lead', 'tech', 'tech_lead',
              'administracion', 'direccion', 'compras', 'almacen'],
    },

    // ── CATÁLOGO — solo clientes + comerciales (para gestionar pedidos) ───────
    { id: 'flexible', label: 'Materiales Flexibles', icon: Scroll,
      section: 'Catálogo', roles: ['client', 'sales', 'sales_lead'],
      subItems: [
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
    { id: 'rigid', label: 'Rígidos', icon: Layers,
      section: 'Catálogo', roles: ['client', 'sales', 'sales_lead'],
      subItems: [
        { id: 'cat_rigid_pvc',          label: 'PVC' },
        { id: 'cat_rigid_composite',    label: 'Composite' },
        { id: 'cat_rigid_carton_pluma', label: 'Cartón Pluma' },
        { id: 'cat_rigid_metacrilato',  label: 'Metacrilato' },
        { id: 'cat_rigid_otros',        label: 'Otros' },
      ]},
    { id: 'accessory', label: 'Accesorios', icon: Wrench,
      section: 'Catálogo', roles: ['client', 'sales', 'sales_lead'],
      subItems: [
        { id: 'cat_accessory_herramientas', label: 'Herramientas' },
        { id: 'cat_accessory_ollados',      label: 'Ollados' },
        { id: 'cat_accessory_refuerzos',    label: 'Refuerzos' },
        { id: 'cat_accessory_adhesivos',    label: 'Adhesivos' },
        { id: 'cat_accessory_otros',        label: 'Otros' },
      ]},
    { id: 'display', label: 'Displays', icon: Monitor,
      section: 'Catálogo', roles: ['client', 'sales', 'sales_lead'],
      subItems: [
        { id: 'cat_display_rollups',     label: 'Roll-ups' },
        { id: 'cat_display_xban',        label: 'X-Banners' },
        { id: 'cat_display_muros',       label: 'Muros Pop-up' },
        { id: 'cat_display_mostradores', label: 'Mostradores' },
        { id: 'cat_display_otros',       label: 'Otros' },
      ]},
    { id: 'cat_ink_all', label: 'Tintas & Consumibles', icon: Printer,
      section: 'Catálogo', roles: ['client', 'sales', 'sales_lead'],
      subItems: [
        { id: 'cat_ink_l600_700', label: 'L600 / L700 Series' },
        { id: 'cat_ink_l800',     label: 'L800 Series / R530' },
        { id: 'cat_ink_l300',     label: 'L300 Series' },
        { id: 'cat_ink_l570_375', label: 'L570 / 375' },
        { id: 'cat_ink_r1000',    label: 'R1000' },
        { id: 'cat_ink_r2000',    label: 'R2000' },
        { id: 'cat_ink_l1500',    label: 'L1500' },
        { id: 'cat_ink_fs50',     label: 'FS50' },
        { id: 'cat_ink_fs70',     label: 'FS70' },
        { id: 'cat_ink_dtf',      label: 'DTF' },
        { id: 'cat_ink_otros',    label: 'Otros' },
      ]},
    // Mis Pedidos: solo clientes (los comerciales usan ventas_pedidos)
    { id: 'client_orders', label: 'Mis Pedidos', icon: ShoppingBag,
      section: 'Catálogo', roles: ['client'] },

    // ── VENTAS — comerciales + administración ─────────────────────────────────
    { id: 'ventas_presupuestos',    label: 'Presupuestos',           icon: FileText,     section: 'Ventas', roles: ROLES_VENTAS },
    { id: 'ventas_pedidos',         label: 'Pedidos de Venta',       icon: ShoppingCart, section: 'Ventas', roles: ROLES_VENTAS },
    { id: 'ventas_albaranes',       label: 'Albaranes',              icon: Truck,        section: 'Ventas', roles: ROLES_VENTAS },
    { id: 'ventas_facturas',        label: 'Facturas',               icon: Receipt,      section: 'Ventas', roles: ROLES_VENTAS },
    { id: 'libro_facturas',         label: 'Libro & VeriFactu',      icon: BookOpen,     section: 'Ventas', roles: [...ROLES_ADMIN, 'sales_lead'] },
    { id: 'facturacion_recurrente', label: 'Facturación Recurrente', icon: RefreshCcw,   section: 'Ventas', roles: ROLES_ADMIN },

    // ── CLIENTES — comerciales + administración ───────────────────────────────
    { id: 'crm',               label: 'CRM',              icon: ContactRound,  section: 'Clientes', roles: ROLES_VENTAS },
    { id: 'admin_client_list', label: 'Clientes',         icon: Users,         section: 'Clientes', roles: ROLES_VENTAS },
    { id: 'admin_new_client',  label: 'Nuevo Cliente',    icon: UserPlus,      section: 'Clientes', roles: [...ROLES_COMERCIAL, 'admin'] },
    { id: 'cliente_360',       label: 'Centro 360° Cliente', icon: ScanSearch,  section: 'Clientes', roles: ROLES_VENTAS },
    { id: 'riesgo_credito',    label: 'Riesgo de Crédito',icon: ShieldAlert,   section: 'Clientes', roles: ROLES_ADMIN },

    // ── COMPRAS — administración + compras/almacén ────────────────────────────
    { id: 'compras', label: 'Compras', icon: PackageSearch,
      section: 'Compras',
      roles: ['admin', 'compras', 'almacen', 'administracion', 'direccion'],
      subItems: [
        { id: 'compras_proveedores', label: 'Proveedores' },
        { id: 'compras_oc',          label: 'Órdenes de Compra' },
        { id: 'compras_recepciones', label: 'Recepciones' },
        { id: 'compras_traspasos',   label: 'Traspasos' },
      ]},
    { id: 'stock',    label: 'Almacén & Stocks', icon: BarChart3,
      section: 'Compras', roles: ['admin', 'compras', 'almacen', 'administracion', 'direccion'] },
    { id: 'materiales', label: 'Materiales',      icon: Boxes,
      section: 'Compras', roles: ['admin', 'compras', 'almacen', 'administracion', 'direccion', 'sales_lead'] },

    // ── GASTOS — todos los internos ───────────────────────────────────────────
    { id: 'expenses', label: 'Gastos', icon: Receipt,
      section: 'Gastos',
      roles: ['admin', 'sales', 'sales_lead', 'tech', 'tech_lead',
              'administracion', 'direccion'] },

    // ── CONTABILIDAD — administración ─────────────────────────────────────────
    { id: 'contabilidad',          label: 'Contabilidad',          icon: BookOpen,   section: 'Contabilidad', roles: ROLES_ADMIN },
    { id: 'impresos_fiscales',     label: 'Impresos Fiscales',     icon: FileText,   section: 'Contabilidad', roles: ROLES_ADMIN },
    { id: 'gastos_empresa',        label: 'Gastos de Empresa',     icon: Receipt,    section: 'Contabilidad', roles: ROLES_ADMIN },
    { id: 'conciliacion_bancaria', label: 'Conciliación Bancaria', icon: ArrowRightLeft, section: 'Contabilidad', roles: ROLES_ADMIN },
    { id: 'libros_oficiales',      label: 'Libros Oficiales',      icon: BookOpen,       section: 'Contabilidad', roles: ROLES_ADMIN },
    { id: 'analisis_rentabilidad', label: 'Business Intelligence', icon: TrendingUp, section: 'Contabilidad', roles: ROLES_ADMIN },
    { id: 'remesas_sepa',          label: 'Remesas SEPA',          icon: Building2,  section: 'Contabilidad', roles: ROLES_ADMIN },

    // ── SAT / SOPORTE ─────────────────────────────────────────────────────────
    { id: 'tech_lead_dashboard',   label: 'Dashboard Técnico',   icon: LayoutDashboard, section: 'SAT / Soporte', roles: ['tech_lead'] },
    { id: 'sat_dashboard',         label: 'SAT — Panel',          icon: Wrench,          section: 'SAT / Soporte', roles: ['tech', 'tech_lead', 'admin'] },
    { id: 'sat_parts',             label: 'Incidencias & Partes', icon: ClipboardList,   section: 'SAT / Soporte', roles: ['tech', 'tech_lead', 'admin', 'client'] },
    { id: 'sat_machines',          label: 'Máquinas',             icon: Database,        section: 'SAT / Soporte', roles: ['tech_lead', 'admin'] },
    { id: 'admin_tech_management', label: 'Gestión Técnicos',     icon: UserPlus,        section: 'SAT / Soporte', roles: ['tech_lead', 'admin'] },
    { id: 'admin_bulk_import_sat', label: 'Carga Masiva SAT',     icon: Upload,          section: 'SAT / Soporte', roles: ['admin'] },

    // ── AGENDA ────────────────────────────────────────────────────────────────
    { id: 'agenda', label: 'Agenda & Calendario', icon: CalendarDays, section: 'Agenda',
      roles: ['admin','sales','sales_lead','tech','tech_lead','administracion','direccion','compras'] },

    // ── RRHH — administración ─────────────────────────────────────────────────
    { id: 'rrhh', label: 'RRHH & Nóminas', icon: Users, section: 'RRHH', roles: ROLES_ADMIN },

    // ── CONFIGURACIÓN — solo admin ────────────────────────────────────────────
    { id: 'admin_empresa',          label: 'Empresa & Sedes',     icon: Building2,  section: 'Configuración', roles: ROLES_ADMIN },
    { id: 'admin_sales_management', label: 'Gestión Comerciales', icon: UserCircle, section: 'Configuración', roles: ['admin', 'sales_lead'] },
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
    role === 'admin'         ? 'Administrador'
    : role === 'sales_lead'  ? 'Jefe de Comerciales'
    : role === 'sales'       ? 'Comercial'
    : role === 'tech_lead'   ? 'Jefe de Técnicos'
    : role === 'tech'        ? 'Técnico'
    : role === 'direccion'   ? 'Dirección'
    : role === 'administracion' ? 'Administración'
    : role === 'compras'     ? 'Compras'
    : role === 'almacen'     ? 'Almacén'
    : 'Cliente B2B';

  // Carrito solo para clientes y comerciales (para gestionar pedidos de cliente)
  const showCart = (['client', 'sales', 'sales_lead'] as string[]).includes(currentUser?.role || '');

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onClose} />
      )}

      <div className={`
        fixed md:sticky top-0 h-[100dvh] md:h-screen bg-white border-r border-slate-200 z-50 w-56
        transition-transform duration-300 ease-in-out flex flex-col
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="p-3 border-b border-slate-100 flex items-center justify-between">
          <img src="/logo.png" alt="DigitalMarket" className="max-h-10 w-auto" />
          <button onClick={onClose} className="md:hidden text-slate-400 hover:text-slate-900">
            <X size={20} />
          </button>
        </div>

        {/* Profile */}
        <div className="px-2.5 py-2">
          <button
            onClick={onProfileClick}
            className="w-full flex items-center gap-2.5 bg-slate-50 px-2.5 py-2 rounded-lg border border-slate-100 hover:bg-slate-100 hover:border-slate-200 transition-all group text-left"
          >
            <UserCircle className="text-slate-400 group-hover:text-slate-700 flex-shrink-0" size={20} />
            <div className="overflow-hidden flex-1">
              <p className="text-[11px] font-bold text-slate-900 truncate">{currentUser?.name}</p>
              <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">
                {roleLabel(currentUser?.role || '')}
              </p>
            </div>
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-2.5 py-1 overflow-y-auto no-scrollbar">
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
                  <div className="px-1 pt-3.5 pb-1 flex items-center gap-1.5">
                    {item.section && SECTION_DOT[item.section] && (
                      <span className={`w-1.5 h-1.5 rounded-full ${SECTION_DOT[item.section]} flex-shrink-0`} />
                    )}
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
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
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-colors mb-0.5 ${
                    item.soon
                      ? 'text-slate-300 cursor-default'
                      : isActive && !hasSubItems
                        ? 'bg-blue-600 text-white shadow-sm'
                        : isActive && hasSubItems
                          ? 'text-blue-700 bg-blue-50'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <item.icon size={15} className="flex-shrink-0" />
                    <span className="truncate">{item.label}</span>
                    {item.soon && (
                      <span className="ml-1 text-[7px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-400 uppercase tracking-wider flex-shrink-0">
                        soon
                      </span>
                    )}
                  </div>
                  {hasSubItems && !item.soon && (
                    isExpanded
                      ? <ChevronDown size={12} className="flex-shrink-0" />
                      : <ChevronRight size={12} className="flex-shrink-0" />
                  )}
                </button>

                {/* Submenu */}
                {hasSubItems && isExpanded && !item.soon && (
                  <div className="ml-6 mb-1 border-l border-slate-200 pl-2 space-y-0.5">
                    {item.subItems?.map(sub => (
                      <button
                        key={sub.id}
                        onClick={() => {
                          if (sub.soon) return;
                          setCurrentView(sub.id);
                          onClose();
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1 rounded-lg text-[11px] transition-colors ${
                          sub.soon
                            ? 'text-slate-300 cursor-default'
                            : currentView === sub.id
                              ? 'text-blue-700 font-semibold bg-blue-50'
                              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                      >
                        <span>{sub.label}</span>
                        {sub.soon && (
                          <span className="text-[7px] font-bold px-1 py-0.5 rounded bg-slate-100 text-slate-300 uppercase">
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

        {/* Bottom: Cart (solo clientes y comerciales) + Logout */}
        <div className="p-2.5 border-t border-slate-100 space-y-0.5">
          {showCart && (
            <button
              onClick={() => { setCurrentView('cart'); onClose(); }}
              className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
                currentView === 'cart' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="relative">
                <ShoppingCart size={15} />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] w-3.5 h-3.5 flex items-center justify-center rounded-full">
                    {cartCount}
                  </span>
                )}
              </div>
              Mi Pedido
            </button>
          )}
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut size={15} />
            Cerrar Sesión
          </button>
        </div>
      </div>
    </>
  );
};
