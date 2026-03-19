import React from 'react';
import { ChevronRight, Search } from 'lucide-react';

// ── Mapa view-id → {section, label} ───────────────────────────────────────────
const VIEW_MAP: Record<string, { section: string; label: string }> = {
  dashboard:              { section: 'Inicio',        label: 'Dashboard' },
  cat_flexible:           { section: 'Catálogo',      label: 'Vinilos & Textiles' },
  cat_rigid:              { section: 'Catálogo',      label: 'Materiales Rígidos' },
  cat_ink:                { section: 'Catálogo',      label: 'Tintas & Consumibles' },
  cat_accessory:          { section: 'Catálogo',      label: 'Accesorios' },
  cat_display:            { section: 'Catálogo',      label: 'Displays' },
  cart:                   { section: 'Catálogo',      label: 'Carrito' },
  ventas_presupuestos:    { section: 'Ventas',        label: 'Presupuestos' },
  ventas_pedidos:         { section: 'Ventas',        label: 'Pedidos de Venta' },
  ventas_albaranes:       { section: 'Ventas',        label: 'Albaranes' },
  ventas_facturas:        { section: 'Ventas',        label: 'Facturas' },
  libro_facturas:         { section: 'Ventas',        label: 'Libro & VeriFactu' },
  facturacion_recurrente: { section: 'Ventas',        label: 'Facturación Recurrente' },
  crm:                    { section: 'Clientes',      label: 'CRM' },
  admin_client_list:      { section: 'Clientes',      label: 'Clientes' },
  admin_new_client:       { section: 'Clientes',      label: 'Nuevo Cliente' },
  cliente_360:            { section: 'Clientes',      label: 'Centro 360°' },
  riesgo_credito:         { section: 'Clientes',      label: 'Riesgo de Crédito' },
  compras:                { section: 'Compras',       label: 'Pedidos de Compra' },
  stock:                  { section: 'Compras',       label: 'Stock & Almacén' },
  materiales:             { section: 'Compras',       label: 'Materiales' },
  gastos_empresa:         { section: 'Gastos',        label: 'Gastos de Empresa' },
  contabilidad:           { section: 'Contabilidad',  label: 'Contabilidad' },
  impresos_fiscales:      { section: 'Contabilidad',  label: 'Impresos Fiscales' },
  conciliacion_bancaria:  { section: 'Contabilidad',  label: 'Conciliación Bancaria' },
  libros_oficiales:       { section: 'Contabilidad',  label: 'Libros Oficiales' },
  analisis_rentabilidad:  { section: 'Contabilidad',  label: 'Business Intelligence' },
  remesas_sepa:           { section: 'Contabilidad',  label: 'Remesas SEPA' },
  rrhh:                   { section: 'RRHH',          label: 'RRHH & Nóminas' },
  sat_dashboard:          { section: 'SAT / Soporte', label: 'Panel SAT' },
  sat_parts:              { section: 'SAT / Soporte', label: 'Incidencias & Partes' },
  sat_machines:           { section: 'SAT / Soporte', label: 'Máquinas' },
  sat_incidents:          { section: 'SAT / Soporte', label: 'Incidencias' },
  tech_lead_dashboard:    { section: 'SAT / Soporte', label: 'Dashboard Técnico' },
  admin_tech_management:  { section: 'SAT / Soporte', label: 'Gestión Técnicos' },
  admin_bulk_import_sat:  { section: 'SAT / Soporte', label: 'Carga Masiva SAT' },
  admin_empresa:          { section: 'Configuración', label: 'Empresa & Sedes' },
  admin_sales_management: { section: 'Configuración', label: 'Gestión Comerciales' },
  admin_products:         { section: 'Configuración', label: 'Productos' },
  admin_load:             { section: 'Configuración', label: 'Importar CSV' },
  admin_bulk_edit:        { section: 'Configuración', label: 'Edición Masiva' },
  admin_coupons:          { section: 'Configuración', label: 'Cupones' },
  admin_dashboard:        { section: 'Configuración', label: 'Panel Admin' },
  sales_dashboard:        { section: 'Ventas',        label: 'Dashboard Comercial' },
  sales_director_dashboard:{ section: 'Ventas',       label: 'Dashboard Director' },
};

interface Props {
  currentView: string;
  onOpenSearch: () => void;
}

export const Breadcrumb: React.FC<Props> = ({ currentView, onOpenSearch }) => {
  const info = VIEW_MAP[currentView];
  if (!info) return null;

  return (
    <div className="flex items-center justify-between px-4 py-1.5 bg-white border-b border-slate-100 text-[12px] text-slate-500 sticky top-0 z-20 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      {/* Ruta */}
      <nav className="flex items-center gap-1">
        <span className="text-slate-400">{info.section}</span>
        <ChevronRight size={12} className="text-slate-300" />
        <span className="font-semibold text-slate-700">{info.label}</span>
      </nav>

      {/* Botón buscador */}
      <button
        onClick={onOpenSearch}
        className="hidden md:flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
        title="Buscar módulo (Ctrl+K)"
      >
        <Search size={12} />
        <span>Buscar módulo…</span>
        <kbd className="ml-1 px-1 bg-white border border-slate-200 rounded text-[10px] font-mono">Ctrl K</kbd>
      </button>
    </div>
  );
};
