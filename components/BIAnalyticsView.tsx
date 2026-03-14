import React, { useState, useMemo } from 'react';
import {
  TrendingUp, DollarSign, AlertCircle, Users, FileText,
  RefreshCw, BarChart2, Clock, CheckCircle, ArrowUpRight,
  ArrowDownRight, Minus, PieChart, Activity,
} from 'lucide-react';
import { useBIAnalytics } from '../hooks/useBIAnalytics';
import { useEmpresa } from '../hooks/useEmpresa';
import { BiSituacionCartera } from '../types';

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmt  = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
const fmtK = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(1)}k €` : `${n.toFixed(0)} €`;
const pct  = (a: number, b: number) => b > 0 ? ((a - b) / b * 100).toFixed(1) : '—';

const mesLabel = (periodo: string) => {
  const [y, m] = periodo.split('-');
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  return `${meses[Number(m) - 1]} ${y.slice(2)}`;
};

// ─── MiniBar chart (CSS puro) ─────────────────────────────────────────────────
function BarChart({ data, colorClass = 'bg-blue-500' }: {
  data: { label: string; value: number }[];
  colorClass?: string;
}) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-1 h-20">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group relative">
          <div
            className={`w-full ${colorClass} rounded-t transition-all`}
            style={{ height: `${Math.max((d.value / max) * 72, 2)}px` }}
          />
          <span className="text-[8px] text-slate-400 truncate w-full text-center">{d.label}</span>
          {/* Tooltip */}
          <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10">
            {d.label}: {fmt(d.value)}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── KPI Card ────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, color, trend }: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color: string;
  trend?: 'up' | 'down' | 'neutral';
}) {
  const TrendIcon = trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : Minus;
  const trendColor = trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-slate-400';

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg bg-${color}-100 flex items-center justify-center`}>
          <Icon size={17} className={`text-${color}-600`} />
        </div>
        {trend && <TrendIcon size={16} className={trendColor} />}
      </div>
      <p className="text-2xl font-bold text-slate-900 leading-none">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Badge situación cartera ──────────────────────────────────────────────────
const situacionBadge: Record<BiSituacionCartera, { label: string; cls: string }> = {
  vencida:      { label: 'Vencida',     cls: 'bg-red-100 text-red-700' },
  vence_pronto: { label: 'Vence pronto',cls: 'bg-amber-100 text-amber-700' },
  al_dia:       { label: 'Al día',      cls: 'bg-green-100 text-green-700' },
  cobrada:      { label: 'Cobrada',     cls: 'bg-slate-100 text-slate-500' },
  anulada:      { label: 'Anulada',     cls: 'bg-slate-100 text-slate-400' },
};

// ─── Vista Principal ──────────────────────────────────────────────────────────
export default function BIAnalyticsView() {
  const { empresa } = useEmpresa();
  const bi = useBIAnalytics(empresa?.id);
  const [tab, setTab] = useState<'overview' | 'ventas' | 'cartera' | 'pyl' | 'margenes'>('overview');

  // Datos para gráficos
  const ventasChartData = bi.ventas.map(v => ({
    label: mesLabel(v.periodo),
    value: v.total_facturado,
  }));

  const pylChartData = bi.pyl.map(p => ({
    label: mesLabel(p.periodo),
    value: Math.max(p.resultado, 0),
  }));

  // Totales cartera
  const totalCartera = bi.cartera.reduce((s, c) => s + c.total, 0);
  const totalVencido = bi.cartera.filter(c => c.situacion === 'vencida').reduce((s, c) => s + c.total, 0);

  // Pipeline comercial
  const pipelineMap = useMemo(() => {
    const m: Record<string, number> = {};
    bi.pipeline.forEach(p => { m[p.estado] = (m[p.estado] || 0) + p.importe_total; });
    return m;
  }, [bi.pipeline]);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart2 size={22} className="text-blue-600" />
          <div>
            <h1 className="text-lg font-bold text-gray-900">Business Intelligence</h1>
            <p className="text-xs text-gray-500">{empresa?.nombre}</p>
          </div>
        </div>
        <button
          onClick={bi.loadAll}
          disabled={bi.loading}
          className="flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={14} className={bi.loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* Error */}
      {bi.error && (
        <div className="mx-6 mt-4 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-red-700 text-sm">
          <AlertCircle size={14} /> {bi.error}
          <span className="text-xs ml-1">— Ejecuta paso8_bi_analytics.sql en Supabase</span>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white border-b px-6">
        <nav className="flex gap-1">
          {([
            { key: 'overview', label: 'Resumen', icon: Activity },
            { key: 'ventas',   label: 'Ventas',  icon: TrendingUp },
            { key: 'cartera',  label: 'Cartera de cobros', icon: Clock },
            { key: 'pyl',      label: 'Cuenta de Resultados', icon: DollarSign },
          { key: 'margenes', label: 'Márgenes',             icon: PieChart },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* ── OVERVIEW ──────────────────────────────────────────── */}
        {tab === 'overview' && (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                label="Ventas este mes"
                value={fmt(bi.kpi?.ventas_mes ?? 0)}
                sub={`${bi.kpi?.facturas_mes ?? 0} facturas`}
                icon={FileText}
                color="blue"
              />
              <KpiCard
                label="Ventas este año"
                value={fmt(bi.kpi?.ventas_año ?? 0)}
                icon={TrendingUp}
                color="green"
              />
              <KpiCard
                label="Pendiente cobro"
                value={fmt(bi.kpi?.pendiente_cobro ?? 0)}
                sub={bi.kpi?.cobros_vencidos ? `${fmt(bi.kpi.cobros_vencidos)} vencido` : undefined}
                icon={Clock}
                color={bi.kpi?.cobros_vencidos ? 'red' : 'amber'}
                trend={bi.kpi?.cobros_vencidos ? 'down' : 'neutral'}
              />
              <KpiCard
                label="MRR (recurrente)"
                value={fmt(bi.kpi?.mrr ?? 0)}
                sub={`ARR: ${fmt((bi.kpi?.mrr ?? 0) * 12)}`}
                icon={Activity}
                color="purple"
                trend="up"
              />
            </div>

            {/* Gráfico ventas + top clientes */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Ventas últimos meses */}
              <div className="bg-white rounded-xl border p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">Facturación últimos 12 meses</h3>
                </div>
                {ventasChartData.length > 0 ? (
                  <BarChart data={ventasChartData} colorClass="bg-blue-500" />
                ) : (
                  <div className="h-20 flex items-center justify-center text-slate-400 text-sm">Sin datos</div>
                )}
              </div>

              {/* Top clientes */}
              <div className="bg-white rounded-xl border p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Top 5 Clientes</h3>
                <div className="space-y-2">
                  {bi.topClientes.slice(0, 5).map((c, i) => {
                    const maxVal = bi.topClientes[0]?.total_facturado || 1;
                    const pctW   = Math.max((c.total_facturado / maxVal) * 100, 2);
                    return (
                      <div key={c.cliente_id} className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 w-4">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs font-medium text-slate-700 truncate">{c.cliente_nombre}</span>
                            <span className="text-xs font-mono font-semibold text-slate-600 ml-2 shrink-0">
                              {fmt(c.total_facturado)}
                            </span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-400 rounded-full"
                              style={{ width: `${pctW}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {bi.topClientes.length === 0 && (
                    <p className="text-sm text-slate-400 text-center py-4">Sin datos</p>
                  )}
                </div>
              </div>
            </div>

            {/* Pipeline + empleados */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Pipeline comercial */}
              <div className="bg-white rounded-xl border p-4 lg:col-span-2">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Pipeline Comercial (90 días)</h3>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { k: 'borrador',  label: 'En borrador', color: 'slate' },
                    { k: 'enviado',   label: 'Enviados',    color: 'blue' },
                    { k: 'aceptado',  label: 'Aceptados',   color: 'green' },
                  ].map(s => (
                    <div key={s.k} className={`rounded-lg bg-${s.color}-50 border border-${s.color}-100 p-3`}>
                      <p className={`text-xs font-medium text-${s.color}-600 mb-1`}>{s.label}</p>
                      <p className={`text-lg font-bold text-${s.color}-700`}>
                        {fmt(pipelineMap[s.k] ?? 0)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Empleados & MRR */}
              <div className="bg-white rounded-xl border p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Plantilla & Recurrente</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Users size={14} className="text-slate-400" />
                      Empleados activos
                    </div>
                    <span className="font-bold text-slate-900">{bi.kpi?.num_empleados ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Activity size={14} className="text-purple-400" />
                      MRR
                    </div>
                    <span className="font-bold text-purple-700">{fmt(bi.kpi?.mrr ?? 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <TrendingUp size={14} className="text-green-400" />
                      ARR
                    </div>
                    <span className="font-bold text-green-700">{fmt((bi.kpi?.mrr ?? 0) * 12)}</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── TAB VENTAS ────────────────────────────────────────── */}
        {tab === 'ventas' && (
          <div className="space-y-4">
            {/* Gráfico ventas mensual */}
            <div className="bg-white rounded-xl border p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Facturación mensual</h3>
              {ventasChartData.length > 0 ? (
                <BarChart data={ventasChartData} colorClass="bg-blue-500" />
              ) : (
                <div className="h-20 flex items-center justify-center text-slate-400">Sin facturas</div>
              )}
            </div>

            {/* Tabla detallada por mes */}
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="px-4 py-3 border-b bg-slate-50">
                <h3 className="text-sm font-semibold text-gray-700">Detalle mensual</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-slate-500 uppercase bg-slate-50">
                    <th className="px-4 py-2 text-left">Periodo</th>
                    <th className="px-4 py-2 text-right">Facturas</th>
                    <th className="px-4 py-2 text-right">Base imp.</th>
                    <th className="px-4 py-2 text-right">Total</th>
                    <th className="px-4 py-2 text-right">Cobrado</th>
                    <th className="px-4 py-2 text-right">Pendiente</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[...bi.ventas].reverse().map(v => (
                    <tr key={v.periodo} className="hover:bg-slate-50">
                      <td className="px-4 py-2 font-medium">{mesLabel(v.periodo)}</td>
                      <td className="px-4 py-2 text-right text-slate-500">{v.num_facturas}</td>
                      <td className="px-4 py-2 text-right font-mono">{fmt(v.base_total)}</td>
                      <td className="px-4 py-2 text-right font-mono font-semibold">{fmt(v.total_facturado)}</td>
                      <td className="px-4 py-2 text-right font-mono text-green-700">{fmt(v.total_cobrado)}</td>
                      <td className="px-4 py-2 text-right font-mono text-amber-600">{fmt(v.total_pendiente)}</td>
                    </tr>
                  ))}
                  {bi.ventas.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Sin facturas registradas</td></tr>
                  )}
                </tbody>
                {bi.ventas.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 bg-slate-50 font-semibold">
                      <td className="px-4 py-2">TOTAL</td>
                      <td className="px-4 py-2 text-right">{bi.ventas.reduce((s, v) => s + v.num_facturas, 0)}</td>
                      <td className="px-4 py-2 text-right font-mono">{fmt(bi.ventas.reduce((s, v) => s + v.base_total, 0))}</td>
                      <td className="px-4 py-2 text-right font-mono">{fmt(bi.ventas.reduce((s, v) => s + v.total_facturado, 0))}</td>
                      <td className="px-4 py-2 text-right font-mono text-green-700">{fmt(bi.ventas.reduce((s, v) => s + v.total_cobrado, 0))}</td>
                      <td className="px-4 py-2 text-right font-mono text-amber-600">{fmt(bi.ventas.reduce((s, v) => s + v.total_pendiente, 0))}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Top clientes */}
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="px-4 py-3 border-b bg-slate-50">
                <h3 className="text-sm font-semibold text-gray-700">Top Clientes por facturación</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-slate-500 uppercase bg-slate-50">
                    <th className="px-4 py-2 text-left w-6">#</th>
                    <th className="px-4 py-2 text-left">Cliente</th>
                    <th className="px-4 py-2 text-right">Facturas</th>
                    <th className="px-4 py-2 text-right">Total</th>
                    <th className="px-4 py-2 text-right">Cobrado</th>
                    <th className="px-4 py-2 text-left">Última factura</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bi.topClientes.map((c, i) => (
                    <tr key={c.cliente_id} className="hover:bg-slate-50">
                      <td className="px-4 py-2 text-slate-400 font-bold text-xs">{i + 1}</td>
                      <td className="px-4 py-2 font-medium">{c.cliente_nombre}</td>
                      <td className="px-4 py-2 text-right text-slate-500">{c.num_facturas}</td>
                      <td className="px-4 py-2 text-right font-mono font-semibold">{fmt(c.total_facturado)}</td>
                      <td className="px-4 py-2 text-right font-mono text-green-700">{fmt(c.total_cobrado)}</td>
                      <td className="px-4 py-2 text-xs text-slate-400">
                        {c.ultima_factura ? new Date(c.ultima_factura).toLocaleDateString('es-ES') : '—'}
                      </td>
                    </tr>
                  ))}
                  {bi.topClientes.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Sin datos</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB CARTERA COBROS ────────────────────────────────── */}
        {tab === 'cartera' && (
          <div className="space-y-4">
            {/* Resumen */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Total pendiente', value: fmt(totalCartera), color: 'slate' },
                { label: 'Vencido',         value: fmt(totalVencido), color: 'red' },
                { label: 'Facturas',        value: String(bi.cartera.length), color: 'blue' },
              ].map(k => (
                <div key={k.label} className={`bg-white rounded-xl border p-4 border-${k.color}-200`}>
                  <p className={`text-2xl font-bold text-${k.color}-700`}>{k.value}</p>
                  <p className="text-xs text-slate-500 mt-1">{k.label}</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="px-4 py-3 border-b bg-slate-50 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">Facturas pendientes de cobro</h3>
                <span className="text-xs text-slate-400">{bi.cartera.length} documentos</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-slate-500 uppercase bg-slate-50">
                    <th className="px-4 py-2 text-left">Referencia</th>
                    <th className="px-4 py-2 text-left">Cliente</th>
                    <th className="px-4 py-2 text-left">Emisión</th>
                    <th className="px-4 py-2 text-left">Vencimiento</th>
                    <th className="px-4 py-2 text-right">Importe</th>
                    <th className="px-4 py-2 text-center">Estado</th>
                    <th className="px-4 py-2 text-right">Retraso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bi.cartera.map(c => {
                    const badge = situacionBadge[c.situacion] ?? situacionBadge.al_dia;
                    return (
                      <tr key={c.factura_id} className="hover:bg-slate-50">
                        <td className="px-4 py-2 font-mono text-xs text-slate-700">{c.referencia}</td>
                        <td className="px-4 py-2 truncate max-w-[160px]">{c.cliente_nombre}</td>
                        <td className="px-4 py-2 text-xs text-slate-400">
                          {new Date(c.fecha_emision).toLocaleDateString('es-ES')}
                        </td>
                        <td className="px-4 py-2 text-xs">
                          <span className={c.situacion === 'vencida' ? 'text-red-600 font-semibold' : 'text-slate-500'}>
                            {new Date(c.fecha_vencimiento).toLocaleDateString('es-ES')}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right font-mono font-semibold">{fmt(c.total)}</td>
                        <td className="px-4 py-2 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${badge.cls}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right text-xs">
                          {c.dias_retraso > 0
                            ? <span className="text-red-600 font-semibold">{c.dias_retraso} días</span>
                            : <span className="text-slate-300">—</span>
                          }
                        </td>
                      </tr>
                    );
                  })}
                  {bi.cartera.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center">
                        <CheckCircle size={28} className="mx-auto mb-2 text-green-400" />
                        <p className="text-slate-400">Sin cobros pendientes</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB P&L ───────────────────────────────────────────── */}
        {tab === 'pyl' && (
          <div className="space-y-4">
            {/* Gráfico resultado */}
            <div className="bg-white rounded-xl border p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Resultado mensual (€)</h3>
              {pylChartData.length > 0 ? (
                <BarChart data={pylChartData} colorClass="bg-green-500" />
              ) : (
                <div className="h-20 flex items-center justify-center text-slate-400">Sin datos</div>
              )}
            </div>

            {/* Tabla P&L */}
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="px-4 py-3 border-b bg-slate-50">
                <h3 className="text-sm font-semibold text-gray-700">Cuenta de Resultados por mes</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-slate-500 uppercase bg-slate-50">
                    <th className="px-4 py-2 text-left">Periodo</th>
                    <th className="px-4 py-2 text-right">Ingresos</th>
                    <th className="px-4 py-2 text-right">Compras</th>
                    <th className="px-4 py-2 text-right">Nóminas</th>
                    <th className="px-4 py-2 text-right">Resultado</th>
                    <th className="px-4 py-2 text-right">Margen %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[...bi.pyl].reverse().map(p => {
                    const margen = p.ingresos > 0
                      ? ((p.resultado / p.ingresos) * 100).toFixed(1)
                      : '—';
                    return (
                      <tr key={p.periodo} className="hover:bg-slate-50">
                        <td className="px-4 py-2 font-medium">{mesLabel(p.periodo)}</td>
                        <td className="px-4 py-2 text-right font-mono text-blue-700">{fmt(p.ingresos)}</td>
                        <td className="px-4 py-2 text-right font-mono text-red-500">- {fmt(p.gastos_compras)}</td>
                        <td className="px-4 py-2 text-right font-mono text-orange-500">- {fmt(p.gastos_nominas)}</td>
                        <td className={`px-4 py-2 text-right font-mono font-bold ${p.resultado >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                          {fmt(p.resultado)}
                        </td>
                        <td className={`px-4 py-2 text-right text-xs font-semibold ${p.resultado >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {margen !== '—' ? `${margen}%` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                  {bi.pyl.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Sin datos</td></tr>
                  )}
                </tbody>
                {bi.pyl.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 bg-slate-50 font-semibold">
                      <td className="px-4 py-2">TOTAL</td>
                      <td className="px-4 py-2 text-right font-mono text-blue-700">{fmt(bi.pyl.reduce((s, p) => s + p.ingresos, 0))}</td>
                      <td className="px-4 py-2 text-right font-mono text-red-500">- {fmt(bi.pyl.reduce((s, p) => s + p.gastos_compras, 0))}</td>
                      <td className="px-4 py-2 text-right font-mono text-orange-500">- {fmt(bi.pyl.reduce((s, p) => s + p.gastos_nominas, 0))}</td>
                      <td className={`px-4 py-2 text-right font-mono ${bi.pyl.reduce((s, p) => s + p.resultado, 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {fmt(bi.pyl.reduce((s, p) => s + p.resultado, 0))}
                      </td>
                      <td className="px-4 py-2 text-right text-xs">
                        {(() => {
                          const tot = bi.pyl.reduce((s, p) => s + p.ingresos, 0);
                          const res = bi.pyl.reduce((s, p) => s + p.resultado, 0);
                          return tot > 0 ? `${((res / tot) * 100).toFixed(1)}%` : '—';
                        })()}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}

        {/* ── TAB MÁRGENES ──────────────────────────────────────── */}
        {tab === 'margenes' && (
          <div className="space-y-4">
            {/* KPIs margen neto */}
            {bi.margenNeto.length > 0 && (() => {
              const ultimo = bi.margenNeto[bi.margenNeto.length - 1];
              const totalVentas = bi.margenNeto.reduce((s, m) => s + m.ventas, 0);
              const totalMgBruto = bi.margenNeto.reduce((s, m) => s + m.margenBruto, 0);
              const totalNeto = bi.margenNeto.reduce((s, m) => s + m.resultadoNeto, 0);
              const margenBrutoPctTotal = totalVentas > 0 ? ((totalMgBruto / totalVentas) * 100).toFixed(1) : '—';
              const margenNetoPctTotal  = totalVentas > 0 ? ((totalNeto  / totalVentas) * 100).toFixed(1) : '—';
              return (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <KpiCard label="Ventas (12 m)"       value={fmt(totalVentas)}   icon={TrendingUp} color="blue"   />
                  <KpiCard label="Margen bruto (12 m)" value={fmt(totalMgBruto)}  sub={`${margenBrutoPctTotal}% sobre ventas`} icon={BarChart2} color="emerald" />
                  <KpiCard label="Gastos totales (12 m)" value={fmt(bi.margenNeto.reduce((s, m) => s + m.gastosTotales, 0))} icon={DollarSign} color="red" />
                  <KpiCard label="Resultado neto (12 m)" value={fmt(totalNeto)} sub={`${margenNetoPctTotal}% margen neto`}
                    icon={Activity} color={totalNeto >= 0 ? 'green' : 'red'} trend={totalNeto >= 0 ? 'up' : 'down'} />
                </div>
              );
            })()}

            {/* Tabla margen neto por mes */}
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="px-4 py-3 border-b bg-slate-50">
                <h3 className="text-sm font-semibold text-gray-700">Margen Neto mensual (últimos 12 meses)</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-slate-500 uppercase bg-slate-50">
                    <th className="px-4 py-2 text-left">Periodo</th>
                    <th className="px-4 py-2 text-right">Ventas</th>
                    <th className="px-4 py-2 text-right">Mg. Bruto</th>
                    <th className="px-4 py-2 text-right">Gastos Op.</th>
                    <th className="px-4 py-2 text-right">Personal</th>
                    <th className="px-4 py-2 text-right">Resultado</th>
                    <th className="px-4 py-2 text-right">Mg. Neto %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[...bi.margenNeto].reverse().map(m => (
                    <tr key={m.periodo} className="hover:bg-slate-50">
                      <td className="px-4 py-2 font-medium">{mesLabel(m.periodo)}</td>
                      <td className="px-4 py-2 text-right font-mono text-blue-700">{fmt(m.ventas)}</td>
                      <td className="px-4 py-2 text-right font-mono text-emerald-700">{fmt(m.margenBruto)}</td>
                      <td className="px-4 py-2 text-right font-mono text-slate-500">- {fmt(m.gastosOperativos)}</td>
                      <td className="px-4 py-2 text-right font-mono text-orange-500">- {fmt(m.gastosPersonal)}</td>
                      <td className={`px-4 py-2 text-right font-mono font-bold ${m.resultadoNeto >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {fmt(m.resultadoNeto)}
                      </td>
                      <td className={`px-4 py-2 text-right text-xs font-semibold ${m.margenNetoPct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {m.margenNetoPct.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                  {bi.margenNeto.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      Sin datos — ejecuta paso11_maestro_materiales.sql y registra gastos en el módulo de Gastos
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Rentabilidad por producto */}
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="px-4 py-3 border-b bg-slate-50 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">Rentabilidad por Producto</h3>
                <span className="text-xs text-slate-400">{bi.rentabilidad.length} artículos con ventas</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-slate-500 uppercase bg-slate-50">
                    <th className="px-4 py-2 text-left">Producto</th>
                    <th className="px-4 py-2 text-left">Familia</th>
                    <th className="px-4 py-2 text-right">Coste</th>
                    <th className="px-4 py-2 text-right">PVP</th>
                    <th className="px-4 py-2 text-right">Mg. Actual %</th>
                    <th className="px-4 py-2 text-right">Uds.</th>
                    <th className="px-4 py-2 text-right">Ingreso</th>
                    <th className="px-4 py-2 text-right">Mg. Real %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bi.rentabilidad.map(r => (
                    <tr key={r.productoId} className="hover:bg-slate-50">
                      <td className="px-4 py-2">
                        <div className="font-medium text-slate-800 truncate max-w-[180px]">{r.productoNombre}</div>
                        {r.reference && <div className="text-[10px] text-slate-400">{r.reference}</div>}
                      </td>
                      <td className="px-4 py-2 text-xs text-slate-500">{r.familia || '—'}</td>
                      <td className="px-4 py-2 text-right font-mono text-xs">{r.costeActual > 0 ? `${r.costeActual.toFixed(2)} €` : '—'}</td>
                      <td className="px-4 py-2 text-right font-mono text-xs">{r.pvpActual > 0 ? `${r.pvpActual.toFixed(2)} €` : '—'}</td>
                      <td className="px-4 py-2 text-right">
                        <span className={`text-xs font-bold ${r.margenActualPct >= 30 ? 'text-green-600' : r.margenActualPct >= 10 ? 'text-amber-600' : 'text-red-600'}`}>
                          {r.margenActualPct > 0 ? `${r.margenActualPct.toFixed(1)}%` : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right text-xs text-slate-500">{r.unidadesVendidas > 0 ? r.unidadesVendidas : '—'}</td>
                      <td className="px-4 py-2 text-right font-mono text-xs">{r.ingresoTotal > 0 ? fmt(r.ingresoTotal) : '—'}</td>
                      <td className="px-4 py-2 text-right">
                        {r.margenMedioPct > 0
                          ? <span className={`text-xs font-bold ${r.margenMedioPct >= 30 ? 'text-green-600' : r.margenMedioPct >= 10 ? 'text-amber-600' : 'text-red-600'}`}>
                              {r.margenMedioPct.toFixed(1)}%
                            </span>
                          : <span className="text-slate-300">—</span>
                        }
                      </td>
                    </tr>
                  ))}
                  {bi.rentabilidad.length === 0 && (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                      Sin datos — añade precio de compra a los productos en el Maestro de Materiales
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
