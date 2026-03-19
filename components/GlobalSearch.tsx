import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Search, LayoutDashboard, ShoppingCart, Package, FileText,
  Truck, BookOpen, RefreshCcw, ContactRound, Users, UserPlus,
  ShieldAlert, Boxes, PackageSearch, BarChart3, Receipt, Building2,
  TrendingUp, Database, Wrench, ClipboardList, UserCircle,
  Settings, Upload, Download, Droplets, Monitor, Scroll,
  ScanSearch, ChevronRight,
} from 'lucide-react';

// ── Tipos ──────────────────────────────────────────────────────────────────────
interface NavItem {
  id: string;
  label: string;
  section: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  keywords?: string[];
  roles: string[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  onNavigate: (view: string) => void;
  currentUserRole: string;
}

// ── Catálogo de navegación (espejo del Sidebar) ────────────────────────────────
const ALL_ITEMS: NavItem[] = [
  // Dashboard
  { id: 'dashboard',       label: 'Dashboard',          section: 'Inicio',        icon: LayoutDashboard, keywords: ['inicio','home','panel'], roles: ['client','admin','sales','sales_lead','tech','tech_lead','administracion','direccion','compras','almacen'] },
  // Catálogo
  { id: 'cat_flexible',    label: 'Vinilos & Textiles',  section: 'Catálogo',      icon: Package,  roles: ['client','admin','sales','sales_lead'] },
  { id: 'cat_rigid',       label: 'Materiales Rígidos',  section: 'Catálogo',      icon: Package,  roles: ['client','admin','sales','sales_lead'] },
  { id: 'cat_ink',         label: 'Tintas & Consumibles',section: 'Catálogo',      icon: Monitor,  roles: ['client','admin','sales','sales_lead'] },
  { id: 'cat_accessory',   label: 'Accesorios',          section: 'Catálogo',      icon: Package,  roles: ['client','admin','sales','sales_lead'] },
  { id: 'cat_display',     label: 'Displays',            section: 'Catálogo',      icon: Scroll,   roles: ['client','admin','sales','sales_lead'] },
  { id: 'cart',            label: 'Carrito de Compra',   section: 'Catálogo',      icon: ShoppingCart, keywords: ['pedido','comprar'], roles: ['client'] },
  // Ventas
  { id: 'ventas_presupuestos', label: 'Presupuestos',    section: 'Ventas',        icon: FileText,     keywords: ['oferta','cotizacion'], roles: ['admin','sales','sales_lead','administracion','direccion'] },
  { id: 'ventas_pedidos',  label: 'Pedidos de Venta',    section: 'Ventas',        icon: ShoppingCart, keywords: ['orden','pedido'], roles: ['admin','sales','sales_lead','administracion','direccion'] },
  { id: 'ventas_albaranes',label: 'Albaranes',           section: 'Ventas',        icon: Truck,        keywords: ['entrega','envio'], roles: ['admin','sales','sales_lead','administracion','direccion'] },
  { id: 'ventas_facturas', label: 'Facturas de Venta',   section: 'Ventas',        icon: Receipt,      keywords: ['factura','cobro'], roles: ['admin','sales','sales_lead','administracion','direccion'] },
  { id: 'libro_facturas',  label: 'Libro & VeriFactu',   section: 'Ventas',        icon: BookOpen,     keywords: ['libro','verifactu','registro'], roles: ['admin','administracion','direccion','sales_lead'] },
  { id: 'facturacion_recurrente', label: 'Facturación Recurrente', section: 'Ventas', icon: RefreshCcw, keywords: ['suscripcion','contrato','recurrente'], roles: ['admin','administracion','direccion'] },
  // Clientes
  { id: 'crm',             label: 'CRM',                 section: 'Clientes',      icon: ContactRound, keywords: ['visitas','llamadas','agenda'], roles: ['admin','sales','sales_lead','administracion','direccion'] },
  { id: 'admin_client_list', label: 'Listado de Clientes', section: 'Clientes',   icon: Users,    roles: ['admin','sales','sales_lead','administracion','direccion'] },
  { id: 'admin_new_client', label: 'Nuevo Cliente',      section: 'Clientes',      icon: UserPlus, roles: ['admin','sales','sales_lead'] },
  { id: 'cliente_360',     label: 'Centro 360° Cliente', section: 'Clientes',      icon: ScanSearch, keywords: ['360','ficha','informacion cliente'], roles: ['admin','sales','sales_lead','administracion','direccion'] },
  { id: 'riesgo_credito',  label: 'Riesgo de Crédito',   section: 'Clientes',      icon: ShieldAlert, keywords: ['coface','bloqueo','limite'], roles: ['admin','administracion','direccion'] },
  // Compras
  { id: 'compras',         label: 'Pedidos de Compra',   section: 'Compras',       icon: Boxes,    keywords: ['proveedor','orden compra'], roles: ['admin','compras','almacen','administracion','direccion'] },
  { id: 'stock',           label: 'Stock & Almacén',      section: 'Compras',       icon: PackageSearch, keywords: ['inventario','existencias'], roles: ['admin','compras','almacen','administracion','direccion'] },
  { id: 'materiales',      label: 'Materiales Activos',  section: 'Compras',       icon: Package,  roles: ['admin','compras','almacen','administracion','direccion','sales_lead'] },
  // Gastos
  { id: 'gastos_empresa',  label: 'Gastos de Empresa',   section: 'Gastos',        icon: Receipt,  keywords: ['nota gasto','dietas','vehiculo'], roles: ['admin','administracion','direccion'] },
  // Contabilidad
  { id: 'contabilidad',    label: 'Contabilidad',         section: 'Contabilidad',  icon: BookOpen, keywords: ['asiento','cuenta','pge'], roles: ['admin','administracion','direccion'] },
  { id: 'impresos_fiscales', label: 'Impresos Fiscales',  section: 'Contabilidad',  icon: FileText, keywords: ['modelo 303','iva','347','190','aeat'], roles: ['admin','administracion','direccion'] },
  { id: 'conciliacion_bancaria', label: 'Conciliación Bancaria', section: 'Contabilidad', icon: Building2, keywords: ['extracto','banco','tesoreria'], roles: ['admin','administracion','direccion'] },
  { id: 'libros_oficiales', label: 'Libros Oficiales',   section: 'Contabilidad',  icon: BookOpen, keywords: ['balance','pyg','mayor','diario'], roles: ['admin','administracion','direccion'] },
  { id: 'analisis_rentabilidad', label: 'Business Intelligence', section: 'Contabilidad', icon: TrendingUp, keywords: ['bi','analisis','kpi'], roles: ['admin','administracion','direccion'] },
  { id: 'remesas_sepa',    label: 'Remesas SEPA',         section: 'Contabilidad',  icon: Building2, keywords: ['sepa','cobro','domiciliacion'], roles: ['admin','administracion','direccion'] },
  // SAT
  { id: 'tech_lead_dashboard', label: 'Dashboard Técnico', section: 'SAT / Soporte', icon: LayoutDashboard, roles: ['tech_lead'] },
  { id: 'sat_dashboard',   label: 'SAT — Panel',          section: 'SAT / Soporte', icon: Wrench,   roles: ['tech','tech_lead','admin'] },
  { id: 'sat_parts',       label: 'Incidencias & Partes', section: 'SAT / Soporte', icon: ClipboardList, keywords: ['averia','incidencia','parte'], roles: ['tech','tech_lead','admin','client'] },
  { id: 'sat_machines',    label: 'Máquinas',             section: 'SAT / Soporte', icon: Database, keywords: ['maquina','equipo'], roles: ['tech_lead','admin'] },
  { id: 'admin_tech_management', label: 'Gestión Técnicos', section: 'SAT / Soporte', icon: UserPlus, roles: ['tech_lead','admin'] },
  // RRHH
  { id: 'rrhh',            label: 'RRHH & Nóminas',       section: 'RRHH',          icon: Users,    keywords: ['empleado','nomina','vacaciones'], roles: ['admin','administracion','direccion'] },
  // Configuración
  { id: 'admin_empresa',   label: 'Empresa & Sedes',      section: 'Configuración', icon: Building2, roles: ['admin','administracion','direccion'] },
  { id: 'admin_sales_management', label: 'Gestión Comerciales', section: 'Configuración', icon: UserCircle, roles: ['admin','sales_lead'] },
  { id: 'admin_products',  label: 'Gestión Productos',    section: 'Configuración', icon: Package,  roles: ['admin'] },
  { id: 'admin_load',      label: 'Importar CSV',         section: 'Configuración', icon: Download, roles: ['admin'] },
  { id: 'admin_bulk_edit', label: 'Edición Masiva',       section: 'Configuración', icon: Settings, roles: ['admin'] },
  { id: 'admin_coupons',   label: 'Cupones',              section: 'Configuración', icon: Droplets, keywords: ['descuento','promo'], roles: ['admin'] },
  { id: 'admin_dashboard', label: 'Panel Admin',          section: 'Configuración', icon: Settings, roles: ['admin'] },
  { id: 'admin_bulk_import_sat', label: 'Carga Masiva SAT', section: 'Configuración', icon: Upload, roles: ['admin'] },
];

// ── Colores por sección ────────────────────────────────────────────────────────
const SECTION_COLORS: Record<string, string> = {
  'Inicio':        'bg-slate-500',
  'Catálogo':      'bg-amber-500',
  'Ventas':        'bg-blue-500',
  'Clientes':      'bg-cyan-500',
  'Compras':       'bg-green-500',
  'Gastos':        'bg-orange-500',
  'Contabilidad':  'bg-indigo-500',
  'SAT / Soporte': 'bg-orange-400',
  'RRHH':          'bg-violet-500',
  'Configuración': 'bg-slate-400',
};

// ═══════════════════════════════════════════════════════════════════════════════
//  COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export const GlobalSearch: React.FC<Props> = ({ open, onClose, onNavigate, currentUserRole }) => {
  const [query, setQuery] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef  = useRef<HTMLUListElement>(null);

  // Opciones filtradas por rol
  const roleItems = useMemo(
    () => ALL_ITEMS.filter(item => item.roles.includes(currentUserRole)),
    [currentUserRole]
  );

  // Resultados de búsqueda
  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return roleItems;
    return roleItems.filter(item =>
      item.label.toLowerCase().includes(q) ||
      item.section.toLowerCase().includes(q) ||
      (item.keywords ?? []).some(k => k.includes(q))
    );
  }, [query, roleItems]);

  // Agrupar por sección
  const grouped = useMemo(() => {
    const map = new Map<string, NavItem[]>();
    results.forEach(item => {
      const arr = map.get(item.section) ?? [];
      arr.push(item);
      map.set(item.section, arr);
    });
    return map;
  }, [results]);

  // Lista plana (para navegación con teclas)
  const flatList = useMemo(() => results, [results]);

  // Reset al abrir
  useEffect(() => {
    if (open) {
      setQuery('');
      setHighlighted(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Scroll del item resaltado
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(`[data-idx="${highlighted}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlighted]);

  const handleSelect = useCallback((id: string) => {
    onNavigate(id);
    onClose();
  }, [onNavigate, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape')     { e.preventDefault(); onClose(); }
    if (e.key === 'ArrowDown')  { e.preventDefault(); setHighlighted(h => Math.min(h + 1, flatList.length - 1)); }
    if (e.key === 'ArrowUp')    { e.preventDefault(); setHighlighted(h => Math.max(h - 1, 0)); }
    if (e.key === 'Enter' && flatList[highlighted]) {
      e.preventDefault();
      handleSelect(flatList[highlighted].id);
    }
  };

  if (!open) return null;

  let globalIdx = 0;

  return (
    // Overlay
    <div
      className="fixed inset-0 z-[500] flex items-start justify-center pt-[10vh] px-4"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">

        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100">
          <Search size={18} className="text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setHighlighted(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Buscar pantalla o módulo…"
            className="flex-1 text-[15px] placeholder:text-slate-400 focus:outline-none bg-transparent"
          />
          <kbd className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[11px] rounded border border-slate-200 font-mono">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <ul
          ref={listRef}
          className="max-h-[420px] overflow-y-auto py-2"
          role="listbox"
        >
          {flatList.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-slate-400">
              Sin resultados para "<strong>{query}</strong>"
            </li>
          ) : (
            Array.from(grouped.entries()).map(([section, items]) => (
              <React.Fragment key={section}>
                {/* Section header */}
                <li className="px-4 pt-3 pb-1">
                  <span className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <span className={`w-2 h-2 rounded-full ${SECTION_COLORS[section] ?? 'bg-slate-400'}`} />
                    {section}
                  </span>
                </li>
                {/* Items */}
                {items.map(item => {
                  const idx = flatList.indexOf(item);
                  const isHighlighted = idx === highlighted;
                  const Icon = item.icon;
                  globalIdx++;
                  return (
                    <li
                      key={item.id}
                      data-idx={idx}
                      role="option"
                      aria-selected={isHighlighted}
                      onMouseDown={() => handleSelect(item.id)}
                      onMouseEnter={() => setHighlighted(idx)}
                      className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                        isHighlighted ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`p-1.5 rounded-lg ${isHighlighted ? 'bg-white/15' : 'bg-slate-100'}`}>
                        <Icon size={14} className={isHighlighted ? 'text-white' : 'text-slate-500'} />
                      </div>
                      <span className="flex-1 text-sm font-medium">{item.label}</span>
                      {isHighlighted && <ChevronRight size={14} className="text-white/60" />}
                    </li>
                  );
                })}
              </React.Fragment>
            ))
          )}
        </ul>

        {/* Footer hint */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center gap-4 text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px]">↑↓</kbd>
            Navegar
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px]">↵</kbd>
            Abrir
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px]">ESC</kbd>
            Cerrar
          </span>
          <span className="ml-auto">{flatList.length} resultados</span>
        </div>
      </div>
    </div>
  );
};

// ── Hook helper para abrir con Ctrl+K ──────────────────────────────────────────
export function useGlobalSearch() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return { open, setOpen };
}
