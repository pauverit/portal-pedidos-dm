import React, { useState, useEffect } from 'react';
import {
  User, Building2, Phone, Mail, MapPin, Calendar,
  ShieldAlert, TrendingUp, ShoppingCart, FileText,
  Wrench, PhoneCall, CalendarCheck, AlertTriangle,
  CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp,
  BarChart2, Package, Star,
} from 'lucide-react';
import { ModuleHeader } from './ModuleHeader';
import { ClientSearchInput } from './ClientSearchInput';
import { useClienteInfo360 } from '../hooks/useClienteInfo360';
import type { User as UserType } from '../types';

// ─── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  empresaId: string;
  clients: UserType[];
  currentUserRole: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

const fmtDate = (d?: string) =>
  d ? new Date(d + (d.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('es-ES') : '—';

// ─── Semáforo riesgo ───────────────────────────────────────────────────────────
const RIESGO_CFG: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
  ok:         { label: 'OK',          bg: 'bg-emerald-50',  text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  alerta:     { label: 'Alerta',      bg: 'bg-yellow-50',   text: 'text-yellow-700',  border: 'border-yellow-200',  dot: 'bg-yellow-400' },
  vencido:    { label: 'Vencido',     bg: 'bg-orange-50',   text: 'text-orange-700',  border: 'border-orange-200',  dot: 'bg-orange-500' },
  excedido:   { label: 'Excedido',    bg: 'bg-red-50',      text: 'text-red-700',     border: 'border-red-200',     dot: 'bg-red-500'    },
  bloqueado:  { label: 'BLOQUEADO',   bg: 'bg-red-100',     text: 'text-red-900',     border: 'border-red-300',     dot: 'bg-red-700'    },
  sin_limite: { label: 'Sin límite',  bg: 'bg-slate-50',    text: 'text-slate-600',   border: 'border-slate-200',   dot: 'bg-slate-400'  },
};

const estadoBadge = (estado: string) => {
  const c = RIESGO_CFG[estado] ?? RIESGO_CFG.sin_limite;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${c.bg} ${c.text} ${c.border}`}>
      <span className={`w-2 h-2 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
};

// ─── Estado pedido / factura ───────────────────────────────────────────────────
const estadoPedido = (estado: string) => {
  const map: Record<string, string> = {
    confirmado: 'bg-blue-100 text-blue-700', en_proceso: 'bg-yellow-100 text-yellow-700',
    entregado: 'bg-emerald-100 text-emerald-700', cancelado: 'bg-slate-100 text-slate-500',
    presupuesto: 'bg-purple-100 text-purple-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${map[estado] ?? 'bg-slate-100 text-slate-600'}`}>
      {estado}
    </span>
  );
};

const estadoFactura = (estado: string, diasVencida: number) => {
  if (diasVencida > 0) return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-700">Vencida {diasVencida}d</span>;
  const map: Record<string, string> = {
    emitida: 'bg-blue-100 text-blue-700', cobrada: 'bg-emerald-100 text-emerald-700',
    cancelada: 'bg-slate-100 text-slate-500', borrador: 'bg-slate-100 text-slate-500',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${map[estado] ?? 'bg-slate-100 text-slate-600'}`}>
      {estado}
    </span>
  );
};

// ─── KPI card ──────────────────────────────────────────────────────────────────
const KpiCard = ({ icon: Icon, label, value, sub, color = 'blue' }: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string; value: string; sub?: string; color?: string;
}) => {
  const colors: Record<string, string> = {
    blue:   'bg-blue-50   text-blue-600',
    green:  'bg-emerald-50 text-emerald-600',
    orange: 'bg-orange-50 text-orange-600',
    red:    'bg-red-50    text-red-600',
    slate:  'bg-slate-50  text-slate-600',
  };
  return (
    <div className="bg-white border border-slate-100 rounded-xl p-4 flex items-start gap-3 shadow-sm">
      <div className={`p-2.5 rounded-lg ${colors[color] ?? colors.blue}`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        <p className="text-lg font-bold text-slate-900 leading-tight">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
};

// ─── Collapsible section ───────────────────────────────────────────────────────
const Section = ({ title, icon: Icon, count, children, defaultOpen = true, accent = 'blue' }: {
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  count?: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
  accent?: string;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const accents: Record<string, string> = {
    blue: 'border-blue-500', green: 'border-emerald-500', orange: 'border-orange-500',
    red: 'border-red-400', purple: 'border-violet-500', slate: 'border-slate-400',
  };
  return (
    <div className={`bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm border-t-2 ${accents[accent] ?? accents.blue}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Icon size={16} className="text-slate-500" />
          <span className="font-semibold text-slate-800 text-sm">{title}</span>
          {count !== undefined && (
            <span className="bg-slate-100 text-slate-600 text-[11px] font-bold px-2 py-0.5 rounded-full">{count}</span>
          )}
        </div>
        {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>
      {open && <div className="px-5 pb-5 pt-1">{children}</div>}
    </div>
  );
};

// ─── Tabla compacta ────────────────────────────────────────────────────────────
const Tabla = ({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) => (
  <div className="overflow-x-auto -mx-1">
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-slate-100">
          {headers.map((h, i) => (
            <th key={i} className="text-left py-2 px-1 text-[11px] font-bold text-slate-400 uppercase tracking-wide whitespace-nowrap">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr><td colSpan={headers.length} className="py-6 text-center text-sm text-slate-400">Sin registros</td></tr>
        ) : (
          rows.map((row, i) => (
            <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
              {row.map((cell, j) => (
                <td key={j} className="py-2.5 px-1 text-slate-700 whitespace-nowrap">{cell}</td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export const ClienteInfo360View: React.FC<Props> = ({ empresaId, clients, currentUserRole }) => {
  const [selectedClientId, setSelectedClientId] = useState('');
  const { info, loading, error, fetch360, clear } = useClienteInfo360();

  useEffect(() => {
    if (selectedClientId && empresaId) {
      fetch360(selectedClientId, empresaId);
    } else {
      clear();
    }
  }, [selectedClientId, empresaId, fetch360, clear]);

  const ALLOWED = ['admin', 'sales', 'sales_lead', 'administracion', 'direccion'];
  if (!ALLOWED.includes(currentUserRole)) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center text-slate-400">
          <XCircle size={40} className="mx-auto mb-3" />
          <p className="font-semibold">Sin acceso</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full">
      <ModuleHeader
        icon={User}
        title="Centro de Información 360°"
        subtitle="Vista unificada de cliente: datos, financiero, ventas, SAT y CRM"
        color="cyan"
      />

      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-5">

          {/* ── Selector de cliente ─────────────────────────────────────── */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
              Selecciona un cliente
            </label>
            <ClientSearchInput
              clients={clients}
              value={selectedClientId}
              onChange={setSelectedClientId}
              placeholder="Buscar cliente por nombre o email…"
              className="max-w-lg"
            />
          </div>

          {/* ── Estado carga ────────────────────────────────────────────── */}
          {loading && (
            <div className="flex items-center justify-center py-16 text-slate-400 gap-3">
              <div className="w-5 h-5 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
              <span className="text-sm font-medium">Cargando información del cliente…</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 flex items-center gap-2">
              <AlertTriangle size={16} /> {error}
            </div>
          )}

          {!selectedClientId && !loading && (
            <div className="text-center py-20 text-slate-400">
              <User size={48} className="mx-auto mb-4 opacity-30" />
              <p className="font-semibold text-slate-500">Ningún cliente seleccionado</p>
              <p className="text-sm mt-1">Busca un cliente arriba para ver su ficha completa</p>
            </div>
          )}

          {/* ── FICHA COMPLETA ──────────────────────────────────────────── */}
          {info && !loading && (
            <div className="space-y-4">

              {/* ── HEADER CLIENTE ──────────────────────────────────────── */}
              <div className="bg-gradient-to-r from-slate-900 to-slate-700 rounded-xl p-5 text-white">
                <div className="flex flex-col md:flex-row md:items-start gap-4">
                  {/* Avatar */}
                  <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                    <Building2 size={28} className="text-white/70" />
                  </div>
                  {/* Info principal */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h2 className="text-xl font-bold text-white">{info.cliente.name}</h2>
                      {info.riesgo && estadoBadge(info.riesgo.estadoRiesgo)}
                      {!info.cliente.isActive && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-500/20 text-red-300 border border-red-400/30">
                          INACTIVO
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-white/70">
                      <span className="flex items-center gap-1.5"><Mail size={13} /> {info.cliente.email}</span>
                      {info.cliente.phone && <span className="flex items-center gap-1.5"><Phone size={13} /> {info.cliente.phone}</span>}
                      {info.cliente.cif && <span className="flex items-center gap-1.5"><FileText size={13} /> CIF: {info.cliente.cif}</span>}
                      {info.cliente.delegation && <span className="flex items-center gap-1.5"><MapPin size={13} /> {info.cliente.delegation}</span>}
                      {info.cliente.salesRep && <span className="flex items-center gap-1.5"><User size={13} /> Comercial: {info.cliente.salesRep}</span>}
                      {info.cliente.registrationDate && <span className="flex items-center gap-1.5"><Calendar size={13} /> Cliente desde {fmtDate(info.cliente.registrationDate)}</span>}
                    </div>
                  </div>
                  {/* Rappel */}
                  <div className="flex flex-col items-center bg-white/10 rounded-xl px-4 py-3 shrink-0">
                    <Star size={16} className="text-amber-300 mb-1" />
                    <span className="text-2xl font-bold text-amber-300">{info.cliente.rappelAccumulated ?? 0}</span>
                    <span className="text-[11px] text-white/60 mt-0.5">puntos rappel</span>
                  </div>
                </div>
              </div>

              {/* ── KPIs ────────────────────────────────────────────────── */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KpiCard
                  icon={TrendingUp} label="Facturado (12 meses)"
                  value={fmt(info.totalFacturadoUltimos12m)} color="blue"
                />
                <KpiCard
                  icon={ShoppingCart} label="Pedidos (12 meses)"
                  value={String(info.numPedidosUltimos12m)} color="green"
                />
                <KpiCard
                  icon={AlertTriangle} label="Deuda vencida"
                  value={info.riesgo ? fmt(info.riesgo.deudaVencida) : '—'}
                  color={info.riesgo && info.riesgo.deudaVencida > 0 ? 'red' : 'green'}
                />
                <KpiCard
                  icon={ShieldAlert} label="Riesgo vivo"
                  value={info.riesgo ? fmt(info.riesgo.riesgoVivo) : '—'}
                  sub={info.riesgo?.pctLimiteUsado != null ? `${info.riesgo.pctLimiteUsado}% del límite` : undefined}
                  color="orange"
                />
              </div>

              {/* ── FINANCIERO ──────────────────────────────────────────── */}
              {info.riesgo && (
                <Section title="Riesgo de Crédito / COFACE" icon={ShieldAlert} accent="red">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      { label: 'Límite COFACE',      value: info.riesgo.limiteCoface != null ? fmt(info.riesgo.limiteCoface) : '—' },
                      { label: 'Límite interno',     value: info.riesgo.limiteInterno != null ? fmt(info.riesgo.limiteInterno) : '—' },
                      { label: 'Límite efectivo',    value: fmt(info.riesgo.limiteEfectivo) },
                      { label: 'Crédito disponible', value: fmt(info.riesgo.creditoDisponible) },
                      { label: 'Deuda total',        value: fmt(info.riesgo.deudaTotal) },
                      { label: 'Deuda vencida',      value: fmt(info.riesgo.deudaVencida) },
                    ].map((item, i) => (
                      <div key={i} className="bg-slate-50 rounded-lg p-3">
                        <p className="text-[11px] text-slate-500 font-medium">{item.label}</p>
                        <p className="text-base font-bold text-slate-900 mt-0.5">{item.value}</p>
                      </div>
                    ))}
                  </div>
                  {info.riesgo.bloqueado && (
                    <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                      <XCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-red-700">Cliente bloqueado</p>
                        {info.riesgo.motivoBloqueo && <p className="text-xs text-red-600 mt-0.5">{info.riesgo.motivoBloqueo}</p>}
                      </div>
                    </div>
                  )}
                  {/* Barra límite */}
                  {info.riesgo.pctLimiteUsado != null && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-slate-500 mb-1">
                        <span>Uso del límite</span>
                        <span className="font-bold">{info.riesgo.pctLimiteUsado}%</span>
                      </div>
                      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            info.riesgo.pctLimiteUsado >= 100 ? 'bg-red-500' :
                            info.riesgo.pctLimiteUsado >= 80  ? 'bg-orange-400' :
                            info.riesgo.pctLimiteUsado >= 50  ? 'bg-yellow-400' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(info.riesgo.pctLimiteUsado, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </Section>
              )}

              {/* ── FACTURAS PENDIENTES ─────────────────────────────────── */}
              <Section title="Facturas (pendientes / últimas)" icon={FileText}
                count={info.facturas.length} accent="blue">
                <Tabla
                  headers={['Referencia', 'Fecha', 'Vencimiento', 'Estado', 'Total', 'Pendiente']}
                  rows={info.facturas.map(f => [
                    <span className="font-mono text-xs font-semibold">{f.referencia}</span>,
                    fmtDate(f.fecha),
                    fmtDate(f.fechaVencimiento),
                    estadoFactura(f.estado, f.diasVencida),
                    <span className="font-semibold">{fmt(f.total)}</span>,
                    <span className={`font-bold ${f.saldoPendiente > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {fmt(f.saldoPendiente)}
                    </span>,
                  ])}
                />
              </Section>

              {/* ── PEDIDOS ─────────────────────────────────────────────── */}
              <Section title="Pedidos de Venta" icon={ShoppingCart}
                count={info.pedidos.length} accent="blue" defaultOpen={false}>
                <Tabla
                  headers={['Referencia', 'Fecha', 'Estado', 'Total']}
                  rows={info.pedidos.map(p => [
                    <span className="font-mono text-xs font-semibold">{p.referencia ?? '—'}</span>,
                    fmtDate(p.fecha),
                    estadoPedido(p.estado),
                    <span className="font-semibold">{fmt(p.total)}</span>,
                  ])}
                />
              </Section>

              {/* ── MÁQUINAS ────────────────────────────────────────────── */}
              {info.maquinas.length > 0 && (
                <Section title="Máquinas instaladas" icon={Package}
                  count={info.maquinas.length} accent="orange" defaultOpen={false}>
                  <Tabla
                    headers={['Modelo', 'Marca', 'Nº serie', 'Estado', 'Garantía hasta']}
                    rows={info.maquinas.map(m => [
                      <span className="font-semibold">{m.model}</span>,
                      m.brand,
                      <span className="font-mono text-xs">{m.serialNumber}</span>,
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        m.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                        m.status === 'inactive' ? 'bg-slate-100 text-slate-500' : 'bg-red-100 text-red-600'
                      }`}>{m.status}</span>,
                      fmtDate(m.warrantyExpires),
                    ])}
                  />
                </Section>
              )}

              {/* ── INCIDENCIAS SAT ─────────────────────────────────────── */}
              <Section title="Incidencias SAT" icon={Wrench}
                count={info.incidencias.length} accent="orange" defaultOpen={false}>
                <Tabla
                  headers={['Referencia', 'Título', 'Estado', 'Severidad', 'Fecha']}
                  rows={info.incidencias.map(inc => {
                    const sevColor: Record<string, string> = {
                      urgent: 'bg-red-100 text-red-700', high: 'bg-orange-100 text-orange-700',
                      normal: 'bg-blue-100 text-blue-700', low: 'bg-slate-100 text-slate-600',
                    };
                    const stColor: Record<string, string> = {
                      pending: 'bg-yellow-100 text-yellow-700',
                      in_progress: 'bg-blue-100 text-blue-700',
                      closed: 'bg-emerald-100 text-emerald-700',
                    };
                    return [
                      <span className="font-mono text-xs font-semibold text-slate-600">{inc.reference}</span>,
                      <span className="max-w-[200px] truncate block text-sm">{inc.title}</span>,
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${stColor[inc.status] ?? 'bg-slate-100 text-slate-600'}`}>{inc.status}</span>,
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${sevColor[inc.severity] ?? 'bg-slate-100 text-slate-600'}`}>{inc.severity}</span>,
                      fmtDate(inc.createdAt.slice(0, 10)),
                    ];
                  })}
                />
              </Section>

              {/* ── CRM ─────────────────────────────────────────────────── */}
              <div className="grid md:grid-cols-2 gap-4">
                <Section title="Visitas comerciales" icon={CalendarCheck}
                  count={info.visitas.length} accent="purple" defaultOpen={false}>
                  {info.visitas.length === 0 ? (
                    <p className="text-sm text-slate-400 py-3">Sin visitas registradas</p>
                  ) : (
                    <div className="space-y-2 mt-1">
                      {info.visitas.map(v => (
                        <div key={v.id} className="bg-slate-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Calendar size={13} className="text-slate-400" />
                            <span className="text-xs font-bold text-slate-600">{fmtDate(v.visitDate)}</span>
                          </div>
                          {v.notes && <p className="text-xs text-slate-600 leading-relaxed">{v.notes}</p>}
                          {v.nextAction && (
                            <div className="mt-1.5 flex items-center gap-1.5">
                              <CheckCircle2 size={12} className="text-blue-500" />
                              <p className="text-xs text-blue-600 font-medium">{v.nextAction}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </Section>

                <Section title="Llamadas" icon={PhoneCall}
                  count={info.llamadas.length} accent="slate" defaultOpen={false}>
                  {info.llamadas.length === 0 ? (
                    <p className="text-sm text-slate-400 py-3">Sin llamadas registradas</p>
                  ) : (
                    <div className="space-y-2 mt-1">
                      {info.llamadas.map(c => (
                        <div key={c.id} className="bg-slate-50 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-slate-600">{fmtDate(c.callDate)}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                              c.direction === 'outbound' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                            }`}>
                              {c.direction === 'outbound' ? '📞 Saliente' : '📲 Entrante'}
                            </span>
                          </div>
                          {c.summary && <p className="text-xs text-slate-600 leading-relaxed">{c.summary}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </Section>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
};
