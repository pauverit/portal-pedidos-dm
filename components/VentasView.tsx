import React, { useState, useEffect } from 'react';
import {
  FileText, ShoppingCart, Truck, Receipt, RotateCcw,
  Plus, Search, RefreshCw, AlertCircle, Loader2,
  ChevronRight, CheckCircle, Clock, ArrowRight,
  X, Check,
} from 'lucide-react';
import { ModuleHeader } from './ModuleHeader';
import {
  Presupuesto, PedidoVenta, Albaran, Factura, DevolucionVenta, DevolucionLinea,
  DocumentoLinea, User, Empresa, Delegacion, Almacen, Product,
  MotivoDevolucion, TipoAbono,
} from '../types';
import { useVentas, calcularSubtotalLinea } from '../hooks/useVentas';
import { useEmpresaData } from '../hooks/useEmpresaData';
import { DocumentoModal } from './DocumentoModal';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

// ─── Configuración de colores por tipo de documento ────────────────────────────

const DOC_CONFIG = {
  presupuestos: {
    label: 'Presupuestos', abbr: 'PRE',
    color: 'violet', icon: FileText,
    bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700',
    active: 'bg-violet-600 text-white border-violet-600',
    ring: 'ring-violet-400', accent: 'bg-violet-600',
    gradient: 'from-violet-500 to-purple-600',
    light: 'bg-violet-100', pill: 'bg-violet-100 text-violet-700',
    dotColor: 'bg-violet-500',
  },
  pedidos: {
    label: 'Pedidos', abbr: 'PED',
    color: 'blue', icon: ShoppingCart,
    bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700',
    active: 'bg-blue-600 text-white border-blue-600',
    ring: 'ring-blue-400', accent: 'bg-blue-600',
    gradient: 'from-blue-500 to-indigo-600',
    light: 'bg-blue-100', pill: 'bg-blue-100 text-blue-700',
    dotColor: 'bg-blue-500',
  },
  albaranes: {
    label: 'Albaranes', abbr: 'ALB',
    color: 'amber', icon: Truck,
    bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700',
    active: 'bg-amber-500 text-white border-amber-500',
    ring: 'ring-amber-400', accent: 'bg-amber-500',
    gradient: 'from-amber-500 to-orange-500',
    light: 'bg-amber-100', pill: 'bg-amber-100 text-amber-700',
    dotColor: 'bg-amber-500',
  },
  facturas: {
    label: 'Facturas', abbr: 'FAC',
    color: 'emerald', icon: Receipt,
    bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700',
    active: 'bg-emerald-600 text-white border-emerald-600',
    ring: 'ring-emerald-400', accent: 'bg-emerald-600',
    gradient: 'from-emerald-500 to-teal-600',
    light: 'bg-emerald-100', pill: 'bg-emerald-100 text-emerald-700',
    dotColor: 'bg-emerald-500',
  },
  devoluciones: {
    label: 'Devoluciones', abbr: 'DEV',
    color: 'rose', icon: RotateCcw,
    bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700',
    active: 'bg-rose-600 text-white border-rose-600',
    ring: 'ring-rose-400', accent: 'bg-rose-600',
    gradient: 'from-rose-500 to-pink-600',
    light: 'bg-rose-100', pill: 'bg-rose-100 text-rose-700',
    dotColor: 'bg-rose-500',
  },
} as const;

// ─── Colores de estado ─────────────────────────────────────────────────────────

const ESTADO_CONFIG: Record<string, { bg: string; text: string; dot: string }> = {
  borrador:    { bg: 'bg-slate-100',   text: 'text-slate-600',   dot: 'bg-slate-400' },
  enviado:     { bg: 'bg-sky-100',     text: 'text-sky-700',     dot: 'bg-sky-500' },
  aceptado:    { bg: 'bg-green-100',   text: 'text-green-700',   dot: 'bg-green-500' },
  rechazado:   { bg: 'bg-red-100',     text: 'text-red-700',     dot: 'bg-red-500' },
  facturado:   { bg: 'bg-purple-100',  text: 'text-purple-700',  dot: 'bg-purple-500' },
  cancelado:   { bg: 'bg-red-50',      text: 'text-red-400',     dot: 'bg-red-300' },
  confirmado:  { bg: 'bg-blue-100',    text: 'text-blue-700',    dot: 'bg-blue-500' },
  en_proceso:  { bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-500' },
  entregado:   { bg: 'bg-teal-100',    text: 'text-teal-700',    dot: 'bg-teal-500' },
  pendiente:   { bg: 'bg-slate-100',   text: 'text-slate-600',   dot: 'bg-slate-400' },
  firmado:     { bg: 'bg-green-100',   text: 'text-green-700',   dot: 'bg-green-500' },
  emitida:     { bg: 'bg-blue-100',    text: 'text-blue-700',    dot: 'bg-blue-500' },
  enviada:     { bg: 'bg-indigo-100',  text: 'text-indigo-700',  dot: 'bg-indigo-500' },
  cobrada:     { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  recibida:    { bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-500' },
  procesada:   { bg: 'bg-green-100',   text: 'text-green-700',   dot: 'bg-green-500' },
  anulada:     { bg: 'bg-red-50',      text: 'text-red-400',     dot: 'bg-red-300' },
};

const EstadoBadge: React.FC<{ estado: string }> = ({ estado }) => {
  const cfg = ESTADO_CONFIG[estado] || ESTADO_CONFIG.pendiente;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {estado.replace(/_/g, ' ')}
    </span>
  );
};

// ─── Flujo de documentos (pipeline banner) ─────────────────────────────────────

const FLOW_STEPS = [
  { key: 'presupuestos', label: 'Presupuesto' },
  { key: 'pedidos',      label: 'Pedido' },
  { key: 'albaranes',    label: 'Albarán' },
  { key: 'facturas',     label: 'Factura' },
  { key: 'devoluciones', label: 'Devolución' },
] as const;

type TabId = 'presupuestos' | 'pedidos' | 'albaranes' | 'facturas' | 'devoluciones';

const FlowBanner: React.FC<{ active: TabId; onChange: (t: TabId) => void }> = ({ active, onChange }) => (
  <div className="flex items-center gap-0 px-4 py-3">
    {FLOW_STEPS.map((step, i) => {
      const cfg = DOC_CONFIG[step.key];
      const Icon = cfg.icon;
      const isActive = active === step.key;
      const isPast = FLOW_STEPS.findIndex(s => s.key === active) > i;
      return (
        <React.Fragment key={step.key}>
          <button
            onClick={() => onChange(step.key)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 border ${
              isActive
                ? `${cfg.active} shadow-sm`
                : isPast
                  ? `bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200`
                  : `bg-white text-slate-500 border-slate-200 hover:${cfg.bg} hover:${cfg.text}`
            }`}
          >
            <Icon size={13} />
            {step.label}
          </button>
          {i < FLOW_STEPS.length - 1 && (
            <ArrowRight size={14} className={`mx-1 flex-shrink-0 ${isPast || isActive ? 'text-slate-400' : 'text-slate-200'}`} />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

// ─── KPI Cards ──────────────────────────────────────────────────────────────

interface KpiData { label: string; value: string | number; sub?: string; color: string }

const KpiCard: React.FC<KpiData> = ({ label, value, sub, color }) => (
  <div className={`rounded-xl p-3 ${color} flex flex-col gap-1 min-w-[110px]`}>
    <div className="text-xs font-medium opacity-70">{label}</div>
    <div className="text-lg font-bold leading-tight">{value}</div>
    {sub && <div className="text-[10px] opacity-60">{sub}</div>}
  </div>
);

// ─── Tabla mejorada ────────────────────────────────────────────────────────────

interface ColDef<T> { key: string; label: string; render: (d: T) => React.ReactNode; right?: boolean }

interface TablaProps<T extends { id: string }> {
  docs: T[];
  cols: ColDef<T>[];
  onOpen: (d: T) => void;
  loading: boolean;
  emptyMsg: string;
  tabColor: typeof DOC_CONFIG[TabId];
  actions?: (d: T) => React.ReactNode;
}

function TablaDocumentos<T extends { id: string }>({
  docs, cols, onOpen, loading, emptyMsg, tabColor, actions,
}: TablaProps<T>) {
  const Icon = tabColor.icon;
  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className={`animate-spin ${tabColor.text}`} size={28} />
    </div>
  );
  if (docs.length === 0) return (
    <div className={`flex flex-col items-center justify-center py-20 gap-3 ${tabColor.text} opacity-50`}>
      <Icon size={40} />
      <p className="text-sm">{emptyMsg}</p>
    </div>
  );
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-600 font-semibold">
            <th className="w-1 p-0" />
            {cols.map(c => (
              <th key={c.key} className={`px-3 py-2 text-left ${c.right ? 'text-right' : ''}`}>{c.label}</th>
            ))}
            <th className="px-3 py-2 w-24 text-right">Acción</th>
          </tr>
        </thead>
        <tbody>
          {docs.map(d => (
            <tr
              key={d.id}
              className="border-b border-slate-100 hover:bg-slate-50/70 cursor-pointer transition-colors group"
              onClick={() => onOpen(d)}
            >
              <td className={`w-1 p-0`}>
                <div className={`w-1 h-full min-h-[44px] ${tabColor.dotColor} rounded-l opacity-60 group-hover:opacity-100 transition-opacity`} />
              </td>
              {cols.map(c => (
                <td key={c.key} className={`px-3 py-2 ${c.right ? 'text-right' : ''}`}>{c.render(d)}</td>
              ))}
              <td className="px-3 py-2 text-right">
                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {actions ? actions(d) : null}
                  <span className={`p-1 rounded-lg ${tabColor.light} ${tabColor.text}`}>
                    <ChevronRight size={14} />
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Modal de devolución ───────────────────────────────────────────────────────

interface DevolucionModalProps {
  empresas: any[];
  almacenes: any[];
  clientes: User[];
  productos: { id: string; name: string; reference?: string; price: number }[];
  onClose: () => void;
  onSave: (data: Omit<DevolucionVenta, 'id' | 'referencia' | 'lineas'>, lineas: DevolucionLinea[]) => Promise<void>;
  facturas: Factura[];
  albaranes: Albaran[];
}

const DevolucionModal: React.FC<DevolucionModalProps> = ({
  empresas, almacenes, clientes, productos, onClose, onSave, facturas, albaranes,
}) => {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    empresaId: empresas[0]?.id || '',
    clienteNombre: '',
    clienteId: '',
    facturaId: '',
    albaranId: '',
    almacenId: '',
    fecha: new Date().toISOString().split('T')[0],
    motivo: 'defecto' as MotivoDevolucion,
    estado: 'pendiente' as const,
    tipoAbono: 'nota_credito' as TipoAbono,
    notas: '',
  });
  const [lineas, setLineas] = useState<DevolucionLinea[]>([
    { orden: 1, descripcion: '', cantidad: 1, precioUnitario: 0, descuento: 0, ivaPorcentaje: 21, subtotal: 0 },
  ]);

  const totales = lineas.reduce((acc, l) => {
    const sub = calcularSubtotalLinea(l);
    return { subtotal: acc.subtotal + sub, iva: acc.iva + sub * l.ivaPorcentaje / 100 };
  }, { subtotal: 0, iva: 0 });

  const updateLinea = (i: number, field: keyof DevolucionLinea, val: any) => {
    setLineas(prev => {
      const updated = [...prev];
      const l = { ...updated[i], [field]: val };
      l.subtotal = calcularSubtotalLinea(l as any);
      updated[i] = l;
      return updated;
    });
  };

  const addLinea = () => setLineas(prev => [
    ...prev,
    { orden: prev.length + 1, descripcion: '', cantidad: 1, precioUnitario: 0, descuento: 0, ivaPorcentaje: 21, subtotal: 0 },
  ]);

  const removeLinea = (i: number) => setLineas(prev => prev.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    if (!form.clienteNombre.trim()) { setError('Indica el nombre del cliente'); return; }
    if (lineas.some(l => !l.descripcion.trim())) { setError('Todas las líneas deben tener descripción'); return; }
    setSaving(true);
    setError('');
    try {
      const data: Omit<DevolucionVenta, 'id' | 'referencia' | 'lineas'> = {
        empresaId: form.empresaId,
        clienteNombre: form.clienteNombre,
        clienteId: form.clienteId || undefined,
        facturaId: form.facturaId || undefined,
        albaranId: form.albaranId || undefined,
        almacenId: form.almacenId || undefined,
        fecha: form.fecha,
        motivo: form.motivo,
        estado: form.estado,
        tipoAbono: form.tipoAbono,
        notas: form.notas,
        subtotal: totales.subtotal,
        baseImponible: totales.subtotal,
        ivaPorcentaje: 21,
        iva: totales.iva,
        total: totales.subtotal + totales.iva,
      };
      await onSave(data, lineas.map((l, i) => ({ ...l, orden: i + 1, subtotal: calcularSubtotalLinea(l as any) })));
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-rose-100 bg-gradient-to-r from-rose-500 to-pink-600 rounded-t-2xl text-white">
          <div className="flex items-center gap-3">
            <RotateCcw size={20} />
            <div>
              <h2 className="font-bold text-lg">Nueva Devolución</h2>
              <p className="text-rose-100 text-xs">Registro de devolución de cliente</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-700 text-sm">
              <AlertCircle size={15} /> {error}
            </div>
          )}

          {/* Datos básicos */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Empresa *</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400 outline-none"
                value={form.empresaId} onChange={e => setForm(f => ({ ...f, empresaId: e.target.value }))}>
                {empresas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Fecha *</label>
              <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400 outline-none"
                value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Cliente *</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400 outline-none"
                placeholder="Nombre del cliente"
                value={form.clienteNombre} onChange={e => setForm(f => ({ ...f, clienteNombre: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Almacén de destino</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400 outline-none"
                value={form.almacenId} onChange={e => setForm(f => ({ ...f, almacenId: e.target.value }))}>
                <option value="">— Sin almacén —</option>
                {almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Motivo</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400 outline-none"
                value={form.motivo} onChange={e => setForm(f => ({ ...f, motivo: e.target.value as MotivoDevolucion }))}>
                <option value="defecto">Defecto</option>
                <option value="error_pedido">Error en pedido</option>
                <option value="cambio">Cambio</option>
                <option value="no_deseado">No deseado</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Tipo de abono</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400 outline-none"
                value={form.tipoAbono} onChange={e => setForm(f => ({ ...f, tipoAbono: e.target.value as TipoAbono }))}>
                <option value="nota_credito">Nota de crédito</option>
                <option value="devolucion_efectivo">Devolución efectivo</option>
                <option value="canje">Canje</option>
                <option value="saldo">Saldo a favor</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Factura origen</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400 outline-none"
                value={form.facturaId} onChange={e => setForm(f => ({ ...f, facturaId: e.target.value }))}>
                <option value="">— Ninguna —</option>
                {facturas.map(f => <option key={f.id} value={f.id}>{f.referencia} — {f.clienteNombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Albarán origen</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400 outline-none"
                value={form.albaranId} onChange={e => setForm(f => ({ ...f, albaranId: e.target.value }))}>
                <option value="">— Ninguno —</option>
                {albaranes.map(a => <option key={a.id} value={a.id}>{a.referencia} — {a.clienteNombre}</option>)}
              </select>
            </div>
          </div>

          {/* Líneas */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Artículos devueltos</label>
              <button onClick={addLinea}
                className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 font-semibold border border-rose-200 rounded-lg px-2 py-1">
                <Plus size={12} /> Añadir línea
              </button>
            </div>
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-2 py-2 text-left text-slate-500 font-semibold">Descripción</th>
                    <th className="px-2 py-2 text-right text-slate-500 font-semibold w-16">Cant.</th>
                    <th className="px-2 py-2 text-right text-slate-500 font-semibold w-24">Precio</th>
                    <th className="px-2 py-2 text-right text-slate-500 font-semibold w-16">Dto%</th>
                    <th className="px-2 py-2 text-right text-slate-500 font-semibold w-16">IVA%</th>
                    <th className="px-2 py-2 text-right text-slate-500 font-semibold w-24">Subtotal</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {lineas.map((l, i) => (
                    <tr key={i} className="border-b border-slate-100 last:border-0">
                      <td className="px-2 py-1.5">
                        <input className="w-full border border-slate-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-rose-400 outline-none"
                          placeholder="Descripción del artículo"
                          value={l.descripcion} onChange={e => updateLinea(i, 'descripcion', e.target.value)} />
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" min="0" step="0.001" className="w-full border border-slate-200 rounded px-2 py-1 text-xs text-right focus:ring-1 focus:ring-rose-400 outline-none"
                          value={l.cantidad} onChange={e => updateLinea(i, 'cantidad', Number(e.target.value))} />
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" min="0" step="0.01" className="w-full border border-slate-200 rounded px-2 py-1 text-xs text-right focus:ring-1 focus:ring-rose-400 outline-none"
                          value={l.precioUnitario} onChange={e => updateLinea(i, 'precioUnitario', Number(e.target.value))} />
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" min="0" max="100" step="0.1" className="w-full border border-slate-200 rounded px-2 py-1 text-xs text-right focus:ring-1 focus:ring-rose-400 outline-none"
                          value={l.descuento} onChange={e => updateLinea(i, 'descuento', Number(e.target.value))} />
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" min="0" max="100" step="1" className="w-full border border-slate-200 rounded px-2 py-1 text-xs text-right focus:ring-1 focus:ring-rose-400 outline-none"
                          value={l.ivaPorcentaje} onChange={e => updateLinea(i, 'ivaPorcentaje', Number(e.target.value))} />
                      </td>
                      <td className="px-2 py-1.5 text-right font-semibold text-rose-700">
                        {fmt(l.subtotal)}
                      </td>
                      <td className="px-1 py-1.5">
                        {lineas.length > 1 && (
                          <button onClick={() => removeLinea(i)}
                            className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors">
                            <X size={13} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Notas internas</label>
            <textarea rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400 outline-none resize-none"
              value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} />
          </div>
        </div>

        {/* Footer con totales */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl flex items-center justify-between">
          <div className="flex items-center gap-6 text-sm">
            <div className="text-slate-600">Base: <span className="font-bold text-slate-900">{fmt(totales.subtotal)}</span></div>
            <div className="text-slate-600">IVA: <span className="font-bold text-slate-900">{fmt(totales.iva)}</span></div>
            <div className="text-rose-700 font-bold text-base">Total: {fmt(totales.subtotal + totales.iva)}</div>
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-rose-600 text-white rounded-lg hover:bg-rose-700 font-semibold disabled:opacity-50 transition-colors">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
              Guardar devolución
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Vista principal ───────────────────────────────────────────────────────────

interface VentasViewProps {
  currentUser: User;
  clientes: User[];
  productos: Product[];
}

export const VentasView: React.FC<VentasViewProps> = ({ currentUser, clientes, productos }) => {
  const [activeTab, setActiveTab] = useState<TabId>('presupuestos');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<{
    tipo: 'presupuesto' | 'pedido' | 'albaran' | 'factura';
    doc?: any;
    lineas?: DocumentoLinea[];
    readonly?: boolean;
  } | null>(null);
  const [devModal, setDevModal] = useState(false);

  const ventas = useVentas();
  const empresaData = useEmpresaData();

  useEffect(() => { ventas.loadAll(); }, []);

  const productosEditor = productos.map(p => ({
    id: p.id,
    name: p.name,
    reference: p.reference,
    price: p.price > 0 ? p.price : (p.pricePerM2 ?? 0),
  }));

  const canEdit = ['admin', 'sales', 'sales_lead', 'administracion', 'direccion'].includes(currentUser.role);

  // ── Abrir modales de documento ──────────────────────────────

  const openPresupuesto = async (doc?: Presupuesto) => {
    if (doc) {
      const full = await ventas.getPresupuestoConLineas(doc.id);
      setModal({ tipo: 'presupuesto', doc: full, lineas: full?.lineas || [] });
    } else {
      setModal({ tipo: 'presupuesto', doc: undefined, lineas: [] });
    }
  };

  const openPedido = async (doc?: PedidoVenta, draft?: any) => {
    if (draft) { setModal({ tipo: 'pedido', doc: draft.pedido, lineas: draft.lineas }); return; }
    if (doc) {
      const full = await ventas.getPedidoConLineas(doc.id);
      setModal({ tipo: 'pedido', doc: full, lineas: full?.lineas || [] });
    } else {
      setModal({ tipo: 'pedido', doc: undefined, lineas: [] });
    }
  };

  const openAlbaran = async (doc?: Albaran, draft?: any) => {
    if (draft) { setModal({ tipo: 'albaran', doc: draft.albaran, lineas: draft.lineas }); return; }
    if (doc) {
      const full = await ventas.getAlbaranConLineas(doc.id);
      setModal({ tipo: 'albaran', doc: full, lineas: full?.lineas || [] });
    } else {
      setModal({ tipo: 'albaran', doc: undefined, lineas: [] });
    }
  };

  const openFactura = async (doc?: Factura, draft?: any) => {
    if (draft) { setModal({ tipo: 'factura', doc: draft.factura, lineas: draft.lineas }); return; }
    if (doc) {
      const full = await ventas.getFacturaConLineas(doc.id);
      setModal({ tipo: 'factura', doc: full, lineas: full?.lineas || [] });
    } else {
      setModal({ tipo: 'factura', doc: undefined, lineas: [] });
    }
  };

  // ── Conversiones ──────────────────────────────────────────

  const handleConvertirPedido = async () => {
    if (!modal?.doc?.id) return;
    const draft = await ventas.presupuestoToPedidoDraft(modal.doc.id);
    if (draft) { setModal(null); setTimeout(() => openPedido(undefined, draft), 100); }
  };

  const handleGenerarAlbaran = async () => {
    if (!modal?.doc?.id) return;
    const draft = await ventas.pedidoToAlbaranDraft(modal.doc.id);
    if (draft) { setModal(null); setTimeout(() => openAlbaran(undefined, draft), 100); }
  };

  const handleGenerarFacturaDesdeAlbaran = async () => {
    if (!modal?.doc?.id) return;
    const draft = await ventas.albaranToFacturaDraft(modal.doc.id);
    if (draft) { setModal(null); setTimeout(() => openFactura(undefined, draft), 100); }
  };

  const handleGenerarFacturaDesdePedido = async () => {
    if (!modal?.doc?.id) return;
    const ped = await ventas.getPedidoConLineas(modal.doc.id);
    if (!ped) return;
    const draft = {
      factura: {
        empresaId: ped.empresaId, delegacionId: ped.delegacionId,
        clienteId: ped.clienteId, clienteNombre: ped.clienteNombre,
        pedidoVentaId: ped.id, fecha: new Date().toISOString().split('T')[0],
        estado: 'emitida' as const,
        subtotal: ped.subtotal, descuentoGlobal: ped.descuentoGlobal,
        baseImponible: ped.baseImponible, ivaPorcentaje: ped.ivaPorcentaje,
        iva: ped.iva, total: ped.total,
      },
      lineas: ped.lineas || [],
    };
    setModal(null);
    setTimeout(() => openFactura(undefined, draft), 100);
  };

  // ── Guardar ────────────────────────────────────────────────

  const handleSavePresupuesto = async (data: any, lineas: DocumentoLinea[]) => {
    if (modal?.doc?.id) await ventas.updatePresupuesto(modal.doc.id, data, lineas);
    else await ventas.createPresupuesto(data, lineas);
    setModal(null);
  };

  const handleSavePedido = async (data: any, lineas: DocumentoLinea[]) => {
    if (modal?.doc?.id) await ventas.updatePedido(modal.doc.id, data, lineas);
    else await ventas.createPedido(data, lineas);
    setModal(null);
  };

  const handleSaveAlbaran = async (data: any, lineas: DocumentoLinea[]) => {
    if (!modal?.doc?.id) await ventas.createAlbaran(data, lineas);
    setModal(null);
  };

  const handleSaveFactura = async (data: any, lineas: DocumentoLinea[]) => {
    const serie = empresaData.empresas.find(e => e.id === data.empresaId)?.cif === 'B73860538' ? 'B' : 'A';
    await ventas.createFactura(data, lineas, serie);
    setModal(null);
  };

  const handleFirmarAlbaran = async (base64: string, nombre: string) => {
    if (!modal?.doc?.id) return;
    await ventas.firmarAlbaran(modal.doc.id, base64, nombre);
    setModal(null);
  };

  const handleMarcarCobrada = async (metodo: string, fecha: string) => {
    if (!modal?.doc?.id) return;
    await ventas.marcarCobrada(modal.doc.id, metodo, fecha);
    setModal(null);
  };

  const handleSaveDevolucion = async (data: Omit<DevolucionVenta, 'id' | 'referencia' | 'lineas'>, lineas: DevolucionLinea[]) => {
    await ventas.createDevolucion(data, lineas);
    setDevModal(false);
  };

  // ── Filtro ─────────────────────────────────────────────────

  const filterDocs = <T extends { id: string; referencia?: string; clienteNombre?: string }>(docs: T[]) =>
    search.length < 2
      ? docs
      : docs.filter(d =>
          (d.referencia || '').toLowerCase().includes(search.toLowerCase()) ||
          (d.clienteNombre || '').toLowerCase().includes(search.toLowerCase())
        );

  // ── KPIs por tab ───────────────────────────────────────────

  const kpis: Record<TabId, KpiData[]> = {
    presupuestos: [
      { label: 'Total', value: ventas.presupuestos.length, color: 'bg-violet-50 text-violet-800' },
      { label: 'Pendientes', value: ventas.presupuestos.filter(d => d.estado === 'enviado').length, color: 'bg-sky-50 text-sky-800' },
      { label: 'Aceptados', value: ventas.presupuestos.filter(d => d.estado === 'aceptado').length, color: 'bg-green-50 text-green-800' },
      { label: 'Importe total', value: fmt(ventas.presupuestos.reduce((s, d) => s + d.total, 0)), color: 'bg-violet-100 text-violet-800' },
    ],
    pedidos: [
      { label: 'Total', value: ventas.pedidos.length, color: 'bg-blue-50 text-blue-800' },
      { label: 'Confirmados', value: ventas.pedidos.filter(d => d.estado === 'confirmado').length, color: 'bg-indigo-50 text-indigo-800' },
      { label: 'En proceso', value: ventas.pedidos.filter(d => d.estado === 'en_proceso').length, color: 'bg-amber-50 text-amber-800' },
      { label: 'Importe total', value: fmt(ventas.pedidos.reduce((s, d) => s + d.total, 0)), color: 'bg-blue-100 text-blue-800' },
    ],
    albaranes: [
      { label: 'Total', value: ventas.albaranes.length, color: 'bg-amber-50 text-amber-800' },
      { label: 'Sin firmar', value: ventas.albaranes.filter(d => !d.firmaCliente).length, color: 'bg-orange-50 text-orange-800' },
      { label: 'Firmados', value: ventas.albaranes.filter(d => !!d.firmaCliente).length, color: 'bg-green-50 text-green-800' },
      { label: 'Entregados', value: ventas.albaranes.filter(d => d.estado === 'entregado').length, color: 'bg-teal-50 text-teal-800' },
    ],
    facturas: [
      { label: 'Total', value: ventas.facturas.length, color: 'bg-emerald-50 text-emerald-800' },
      { label: 'Pendientes cobro', value: ventas.facturas.filter(d => d.estado !== 'cobrada' && d.estado !== 'anulada').length, color: 'bg-amber-50 text-amber-800' },
      { label: 'Cobradas', value: ventas.facturas.filter(d => d.estado === 'cobrada').length, color: 'bg-green-50 text-green-800' },
      { label: 'Importe pendiente', value: fmt(ventas.facturas.filter(d => d.estado !== 'cobrada').reduce((s, d) => s + d.total, 0)), color: 'bg-emerald-100 text-emerald-800' },
    ],
    devoluciones: [
      { label: 'Total', value: ventas.devoluciones.length, color: 'bg-rose-50 text-rose-800' },
      { label: 'Pendientes', value: ventas.devoluciones.filter(d => d.estado === 'pendiente').length, color: 'bg-orange-50 text-orange-800' },
      { label: 'Procesadas', value: ventas.devoluciones.filter(d => d.estado === 'procesada').length, color: 'bg-green-50 text-green-800' },
      { label: 'Importe abonado', value: fmt(ventas.devoluciones.filter(d => d.estado === 'procesada').reduce((s, d) => s + d.total, 0)), color: 'bg-rose-100 text-rose-800' },
    ],
  };

  // ── Columnas por tipo ──────────────────────────────────────

  const colsPresupuesto: ColDef<Presupuesto>[] = [
    { key: 'ref',      label: 'Referencia',  render: d => <span className="font-mono font-bold text-violet-700">{d.referencia}</span> },
    { key: 'cliente',  label: 'Cliente',     render: d => <span className="truncate max-w-[180px] block font-medium">{d.clienteNombre || '—'}</span> },
    { key: 'fecha',    label: 'Fecha',       render: d => <span className="text-slate-500">{d.fecha}</span> },
    { key: 'validez',  label: 'Válido hasta', render: d => <span className="text-slate-500">{d.fechaValidez || '—'}</span> },
    { key: 'total',    label: 'Total',       render: d => <span className="font-bold text-slate-800">{fmt(d.total)}</span>, right: true },
    { key: 'estado',   label: 'Estado',      render: d => <EstadoBadge estado={d.estado} /> },
  ];

  const colsPedido: ColDef<PedidoVenta>[] = [
    { key: 'ref',     label: 'Referencia', render: d => <span className="font-mono font-bold text-blue-700">{d.referencia}</span> },
    { key: 'cliente', label: 'Cliente',    render: d => <span className="truncate max-w-[180px] block font-medium">{d.clienteNombre || '—'}</span> },
    { key: 'fecha',   label: 'Fecha',      render: d => <span className="text-slate-500">{d.fecha}</span> },
    { key: 'entrega', label: 'Entrega',    render: d => <span className="text-slate-500">{d.fechaEntrega || '—'}</span> },
    { key: 'total',   label: 'Total',      render: d => <span className="font-bold text-slate-800">{fmt(d.total)}</span>, right: true },
    { key: 'estado',  label: 'Estado',     render: d => <EstadoBadge estado={d.estado} /> },
  ];

  const colsAlbaran: ColDef<Albaran>[] = [
    { key: 'ref',     label: 'Referencia', render: d => <span className="font-mono font-bold text-amber-700">{d.referencia}</span> },
    { key: 'cliente', label: 'Cliente',    render: d => <span className="truncate max-w-[180px] block font-medium">{d.clienteNombre || '—'}</span> },
    { key: 'fecha',   label: 'Fecha',      render: d => <span className="text-slate-500">{d.fecha}</span> },
    { key: 'firma',   label: 'Firma',      render: d => d.firmaCliente
        ? <span className="flex items-center gap-1 text-green-700 text-xs font-semibold"><CheckCircle size={12} /> {d.firmaNombre}</span>
        : <span className="text-slate-400 text-xs">Sin firmar</span> },
    { key: 'estado',  label: 'Estado',     render: d => <EstadoBadge estado={d.estado} /> },
  ];

  const colsFactura: ColDef<Factura>[] = [
    { key: 'ref',        label: 'Referencia', render: d => <span className="font-mono font-bold text-emerald-700">{d.referencia}</span> },
    { key: 'cliente',    label: 'Cliente',    render: d => <span className="truncate max-w-[160px] block font-medium">{d.clienteNombre || '—'}</span> },
    { key: 'fecha',      label: 'Fecha',      render: d => <span className="text-slate-500">{d.fecha}</span> },
    { key: 'vencimiento',label: 'Vence',      render: d => <span className="text-slate-500">{d.fechaVencimiento || '—'}</span> },
    { key: 'total',      label: 'Total',      render: d => <span className="font-bold text-slate-800">{fmt(d.total)}</span>, right: true },
    { key: 'cobro',      label: 'Cobro',      render: d => d.estado === 'cobrada'
        ? <span className="flex items-center gap-1 text-emerald-700 text-xs font-semibold"><CheckCircle size={12} />{d.metodoCobro}</span>
        : <span className="text-slate-400 text-xs flex items-center gap-1"><Clock size={11} /> Pendiente</span> },
    { key: 'estado',     label: 'Estado',     render: d => <EstadoBadge estado={d.estado} /> },
  ];

  const colsDevolucion: ColDef<DevolucionVenta>[] = [
    { key: 'ref',     label: 'Referencia', render: d => <span className="font-mono font-bold text-rose-700">{d.referencia || '—'}</span> },
    { key: 'cliente', label: 'Cliente',    render: d => <span className="truncate max-w-[160px] block font-medium">{d.clienteNombre}</span> },
    { key: 'fecha',   label: 'Fecha',      render: d => <span className="text-slate-500">{d.fecha}</span> },
    { key: 'motivo',  label: 'Motivo',     render: d => <span className="text-slate-600 capitalize">{(d.motivo || '').replace('_', ' ')}</span> },
    { key: 'origen',  label: 'Origen',     render: d => <span className="text-xs text-slate-400">{d.facturaRef || d.albaranRef || '—'}</span> },
    { key: 'total',   label: 'Total',      render: d => <span className="font-bold text-rose-700">{fmt(d.total)}</span>, right: true },
    { key: 'abono',   label: 'Abono',      render: d => <span className="text-xs text-slate-500 capitalize">{(d.tipoAbono || '').replace('_', ' ')}</span> },
    { key: 'estado',  label: 'Estado',     render: d => <EstadoBadge estado={d.estado} /> },
  ];

  const cfg = DOC_CONFIG[activeTab];

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Error global */}
      {ventas.error && (
        <div className="mx-4 mt-4 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-red-700 text-sm">
          <AlertCircle size={16} />
          <span>{ventas.error}</span>
        </div>
      )}

      {/* Header SAGE */}
      <ModuleHeader
        icon={ShoppingCart}
        title="Ventas"
        subtitle="Gestión del ciclo completo de documentos"
        color="blue"
        actions={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-blue-300" />
              <input
                className="pl-8 pr-3 py-1.5 text-sm border border-blue-600 bg-blue-700/50 text-white placeholder-blue-300 rounded-lg outline-none focus:bg-blue-700 w-48"
                placeholder="Buscar ref. o cliente…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <button onClick={ventas.loadAll}
              className="p-1.5 text-blue-200 hover:text-white border border-blue-600 bg-blue-700/50 rounded-lg transition-colors">
              <RefreshCw size={14} className={ventas.loading ? 'animate-spin' : ''} />
            </button>
            {canEdit && (
              <button
                onClick={() => {
                  if (activeTab === 'presupuestos') openPresupuesto();
                  else if (activeTab === 'pedidos') openPedido();
                  else if (activeTab === 'albaranes') openAlbaran();
                  else if (activeTab === 'facturas') openFactura();
                  else setDevModal(true);
                }}
                className="flex items-center gap-1.5 bg-white text-blue-700 px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-blue-50 shadow-sm transition-colors"
              >
                <Plus size={14} /> Nuevo {cfg.abbr}
              </button>
            )}
          </div>
        }
      />

      {/* Pipeline de documentos */}
      <div className="mx-4 mb-2 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <FlowBanner active={activeTab} onChange={setActiveTab} />
      </div>

      {/* KPIs */}
      <div className="mx-4 mb-3 flex gap-3 overflow-x-auto pb-1">
        {kpis[activeTab].map((k, i) => <KpiCard key={i} {...k} />)}
      </div>

      {/* Tabla de documentos */}
      <div className="mx-4 flex-1 overflow-auto bg-white rounded-2xl border border-slate-200 shadow-sm">
        {activeTab === 'presupuestos' && (
          <TablaDocumentos
            docs={filterDocs(ventas.presupuestos)}
            cols={colsPresupuesto}
            onOpen={openPresupuesto}
            loading={ventas.loading}
            emptyMsg="No hay presupuestos. Pulsa «Nuevo PRE» para crear el primero."
            tabColor={DOC_CONFIG.presupuestos}
          />
        )}
        {activeTab === 'pedidos' && (
          <TablaDocumentos
            docs={filterDocs(ventas.pedidos)}
            cols={colsPedido}
            onOpen={openPedido}
            loading={ventas.loading}
            emptyMsg="No hay pedidos de venta."
            tabColor={DOC_CONFIG.pedidos}
          />
        )}
        {activeTab === 'albaranes' && (
          <TablaDocumentos
            docs={filterDocs(ventas.albaranes)}
            cols={colsAlbaran}
            onOpen={openAlbaran}
            loading={ventas.loading}
            emptyMsg="No hay albaranes."
            tabColor={DOC_CONFIG.albaranes}
          />
        )}
        {activeTab === 'facturas' && (
          <TablaDocumentos
            docs={filterDocs(ventas.facturas)}
            cols={colsFactura}
            onOpen={openFactura}
            loading={ventas.loading}
            emptyMsg="No hay facturas."
            tabColor={DOC_CONFIG.facturas}
          />
        )}
        {activeTab === 'devoluciones' && (
          <TablaDocumentos
            docs={filterDocs(ventas.devoluciones) as DevolucionVenta[]}
            cols={colsDevolucion}
            onOpen={async (d) => {
              const full = await ventas.getDevolucionConLineas(d.id);
              // Solo vista (no hay modal de edición de devoluciones aún)
            }}
            loading={ventas.loading}
            emptyMsg="No hay devoluciones registradas."
            tabColor={DOC_CONFIG.devoluciones}
            actions={(d) => (
              d.estado === 'pendiente' ? (
                <button
                  onClick={async (e) => { e.stopPropagation(); await ventas.updateDevolucionEstado(d.id, 'recibida'); }}
                  className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-lg font-semibold hover:bg-amber-200 transition-colors"
                >
                  Marcar recibida
                </button>
              ) : d.estado === 'recibida' ? (
                <button
                  onClick={async (e) => { e.stopPropagation(); await ventas.updateDevolucionEstado(d.id, 'procesada'); }}
                  className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-lg font-semibold hover:bg-green-200 transition-colors"
                >
                  Procesar
                </button>
              ) : null
            )}
          />
        )}
      </div>

      {/* Margen inferior */}
      <div className="h-4" />

      {/* Modal documentos */}
      {modal && (
        <DocumentoModal
          tipo={modal.tipo}
          inicial={modal.doc || {}}
          lineasIniciales={modal.lineas || []}
          empresas={empresaData.empresas}
          delegaciones={empresaData.delegaciones}
          almacenes={empresaData.almacenes}
          clientes={clientes}
          productos={productosEditor}
          currentUser={currentUser}
          onClose={() => setModal(null)}
          onSave={
            modal.tipo === 'presupuesto' ? handleSavePresupuesto :
            modal.tipo === 'pedido'      ? handleSavePedido      :
            modal.tipo === 'albaran'     ? handleSaveAlbaran     :
                                           handleSaveFactura
          }
          onConvertirPedido={modal.tipo === 'presupuesto' && modal.doc?.id ? handleConvertirPedido : undefined}
          onGenerarAlbaran={modal.tipo === 'pedido' && modal.doc?.id ? handleGenerarAlbaran : undefined}
          onGenerarFactura={
            modal.tipo === 'albaran' && modal.doc?.id ? handleGenerarFacturaDesdeAlbaran :
            modal.tipo === 'pedido'  && modal.doc?.id ? handleGenerarFacturaDesdePedido  : undefined
          }
          onFirmar={modal.tipo === 'albaran' ? handleFirmarAlbaran : undefined}
          onMarcarCobrada={modal.tipo === 'factura' && modal.doc?.id ? handleMarcarCobrada : undefined}
          readonly={modal.readonly}
        />
      )}

      {/* Modal devolución */}
      {devModal && (
        <DevolucionModal
          empresas={empresaData.empresas}
          almacenes={empresaData.almacenes}
          clientes={clientes}
          productos={productosEditor}
          facturas={ventas.facturas}
          albaranes={ventas.albaranes}
          onClose={() => setDevModal(false)}
          onSave={handleSaveDevolucion}
        />
      )}
    </div>
  );
};
