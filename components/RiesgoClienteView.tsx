import React, { useEffect, useState, useMemo } from 'react';
import { useRiesgoCredito } from '../hooks/useRiesgoCredito';
import type {
  RiesgoCliente,
  LimiteCredito,
  FacturaPendienteRiesgo,
  EstadoRiesgo,
  ClasificacionCoface,
} from '../types';

interface Props {
  empresaId: string;
  currentUserId: string;
  currentUserRole: string;
}

// ─── Helpers ────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

const fmtPct = (n: number | undefined) =>
  n != null ? `${n.toFixed(1)} %` : '—';

const fmtDate = (d: string | undefined) =>
  d ? new Date(d).toLocaleDateString('es-ES') : '—';

// ── Semáforo ─────────────────────────────────────────────────

const ESTADO_CONFIG: Record<EstadoRiesgo, { label: string; bg: string; text: string; dot: string }> = {
  ok:         { label: 'OK',        bg: 'bg-emerald-100', text: 'text-emerald-800', dot: 'bg-emerald-500' },
  alerta:     { label: 'Alerta',    bg: 'bg-yellow-100',  text: 'text-yellow-800',  dot: 'bg-yellow-400' },
  vencido:    { label: 'Vencido',   bg: 'bg-orange-100',  text: 'text-orange-800',  dot: 'bg-orange-500' },
  excedido:   { label: 'Excedido',  bg: 'bg-red-100',     text: 'text-red-800',     dot: 'bg-red-500' },
  bloqueado:  { label: 'Bloqueado', bg: 'bg-red-200',     text: 'text-red-900',     dot: 'bg-red-700' },
  sin_limite: { label: 'Sin límite',bg: 'bg-gray-100',    text: 'text-gray-600',    dot: 'bg-gray-400' },
};

const EstadoBadge = ({ estado }: { estado: EstadoRiesgo }) => {
  const c = ESTADO_CONFIG[estado];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
};

// ── Barra de progreso del límite ─────────────────────────────

const BarraLimite = ({ pct }: { pct: number | undefined }) => {
  if (pct == null) return <span className="text-gray-400 text-xs">Sin límite</span>;
  const color =
    pct >= 100 ? 'bg-red-500' :
    pct >= 80  ? 'bg-orange-400' :
    pct >= 50  ? 'bg-yellow-400' :
    'bg-emerald-500';
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className="text-xs text-gray-600 w-12 text-right">{fmtPct(pct)}</span>
    </div>
  );
};

// ─── Modal: Editar límite COFACE ────────────────────────────

const CLASIFICACIONES: ClasificacionCoface[] = ['A1', 'A2', 'A3', 'A4', 'B', 'C', 'D'];

interface ModalLimiteProps {
  cliente: RiesgoCliente;
  onSave: (clienteId: string, datos: Partial<LimiteCredito>) => Promise<void>;
  onClose: () => void;
}

const ModalLimite = ({ cliente, onSave, onClose }: ModalLimiteProps) => {
  const [form, setForm] = useState({
    limiteCoface:             cliente.limiteCoface?.toString()            ?? '',
    clasificacionCoface:      cliente.clasificacionCoface                 ?? '',
    numeroPolizaCoface:       cliente.numeroPolizaCoface                  ?? '',
    fechaConsultaCoface:      cliente.fechaConsultaCoface?.slice(0, 10)   ?? '',
    fechaVencimientoCoface:   cliente.fechaVencimientoCoface?.slice(0,10) ?? '',
    limiteInterno:            cliente.limiteInterno?.toString()           ?? '',
    notas:                    '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(cliente.clienteId, {
        limiteCoface:             form.limiteCoface ? Number(form.limiteCoface) : undefined,
        clasificacionCoface:      (form.clasificacionCoface || undefined) as ClasificacionCoface | undefined,
        numeroPolizaCoface:       form.numeroPolizaCoface  || undefined,
        fechaConsultaCoface:      form.fechaConsultaCoface || undefined,
        fechaVencimientoCoface:   form.fechaVencimientoCoface || undefined,
        limiteInterno:            form.limiteInterno ? Number(form.limiteInterno) : undefined,
        notas:                    form.notas || undefined,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="font-semibold text-gray-900">Límite de crédito COFACE</h2>
            <p className="text-sm text-gray-500">{cliente.clienteNombre}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        <div className="p-6 space-y-5">
          {/* COFACE */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Cobertura COFACE
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Límite aprobado (€)</label>
                <input type="number" min="0" step="100"
                  value={form.limiteCoface}
                  onChange={e => setForm(p => ({ ...p, limiteCoface: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="p.ej. 15000" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Clasificación @rating</label>
                <select value={form.clasificacionCoface}
                  onChange={e => setForm(p => ({ ...p, clasificacionCoface: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">— Sin clasificación —</option>
                  {CLASIFICACIONES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Nº expediente / póliza</label>
                <input type="text"
                  value={form.numeroPolizaCoface}
                  onChange={e => setForm(p => ({ ...p, numeroPolizaCoface: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="p.ej. COF-2024-00123" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Fecha consulta</label>
                <input type="date"
                  value={form.fechaConsultaCoface}
                  onChange={e => setForm(p => ({ ...p, fechaConsultaCoface: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Vencimiento cobertura</label>
                <input type="date"
                  value={form.fechaVencimientoCoface}
                  onChange={e => setForm(p => ({ ...p, fechaVencimientoCoface: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>

          {/* Límite interno */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Límite interno (si COFACE no cubre o como complemento)
            </p>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Límite interno (€)</label>
              <input type="number" min="0" step="100"
                value={form.limiteInterno}
                onChange={e => setForm(p => ({ ...p, limiteInterno: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="p.ej. 5000" />
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-xs text-gray-600 mb-1">Notas internas</label>
            <textarea rows={2}
              value={form.notas}
              onChange={e => setForm(p => ({ ...p, notas: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Observaciones adicionales..." />
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg disabled:opacity-50">
            {saving ? 'Guardando...' : 'Guardar límite'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Modal: Bloquear cliente ────────────────────────────────

interface ModalBloqueoProps {
  cliente: RiesgoCliente;
  onConfirm: (motivo: string) => Promise<void>;
  onClose: () => void;
}

const ModalBloqueo = ({ cliente, onConfirm, onClose }: ModalBloqueoProps) => {
  const [motivo, setMotivo] = useState('');
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    if (!motivo.trim()) return;
    setSaving(true);
    try { await onConfirm(motivo); onClose(); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b">
          <h2 className="font-semibold text-red-700">Bloquear cliente</h2>
          <p className="text-sm text-gray-500 mt-1">{cliente.clienteNombre}</p>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-700 mb-4">
            Al bloquear este cliente, se mostrará una advertencia en Ventas impidiendo
            crear nuevos pedidos o albaranes hasta que sea desbloqueado manualmente.
          </p>
          <label className="block text-xs text-gray-600 mb-1 font-medium">
            Motivo del bloqueo <span className="text-red-500">*</span>
          </label>
          <textarea rows={3}
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            placeholder="p.ej. Deuda vencida superior a 90 días, pendiente de resolución..." />
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Cancelar</button>
          <button onClick={handleConfirm} disabled={!motivo.trim() || saving}
            className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg disabled:opacity-50">
            {saving ? 'Bloqueando...' : 'Confirmar bloqueo'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Panel lateral de detalle de cliente ────────────────────

interface PanelDetalleProps {
  cliente: RiesgoCliente;
  facturas: FacturaPendienteRiesgo[];
  pedidos: { id: string; referencia: string; fecha: string; estado: string; total: number }[];
  onClose: () => void;
  onBloquear: () => void;
  onDesbloquear: () => Promise<void>;
  onEditarLimite: () => void;
  canManage: boolean;
}

const PanelDetalle = ({
  cliente, facturas, pedidos, onClose, onBloquear, onDesbloquear, onEditarLimite, canManage
}: PanelDetalleProps) => (
  <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-2xl z-40 flex flex-col">
    {/* Header */}
    <div className="px-6 py-4 border-b flex items-start justify-between">
      <div>
        <h2 className="font-semibold text-gray-900">{cliente.clienteNombre}</h2>
        <p className="text-sm text-gray-500">{cliente.email}</p>
      </div>
      <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl mt-0.5">&times;</button>
    </div>

    {/* Resumen riesgo */}
    <div className="px-6 py-4 bg-gray-50 border-b grid grid-cols-3 gap-4 text-center">
      <div>
        <p className="text-xs text-gray-500 mb-0.5">Riesgo vivo</p>
        <p className={`text-lg font-bold ${cliente.riesgoVivo > 0 ? 'text-orange-600' : 'text-gray-700'}`}>
          {fmt(cliente.riesgoVivo)}
        </p>
      </div>
      <div>
        <p className="text-xs text-gray-500 mb-0.5">Deuda vencida</p>
        <p className={`text-lg font-bold ${cliente.deudaVencida > 0 ? 'text-red-600' : 'text-gray-400'}`}>
          {fmt(cliente.deudaVencida)}
        </p>
      </div>
      <div>
        <p className="text-xs text-gray-500 mb-0.5">Límite COFACE</p>
        <p className="text-lg font-bold text-gray-700">
          {cliente.limiteCoface ? fmt(cliente.limiteCoface) : '—'}
        </p>
      </div>
    </div>

    {/* Bloqueo activo */}
    {cliente.bloqueado && (
      <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm">
        <p className="font-semibold text-red-800 flex items-center gap-1.5">
          <span>&#128683;</span> Cliente BLOQUEADO
        </p>
        {cliente.motivoBloqueo && (
          <p className="text-red-700 mt-0.5">Motivo: {cliente.motivoBloqueo}</p>
        )}
        {cliente.fechaBloqueo && (
          <p className="text-red-600 text-xs mt-0.5">Desde: {fmtDate(cliente.fechaBloqueo)}</p>
        )}
      </div>
    )}

    {/* Vencimiento COFACE */}
    {cliente.fechaVencimientoCoface && new Date(cliente.fechaVencimientoCoface) < new Date() && (
      <div className="mx-6 mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
        <span className="font-medium">&#9888; Cobertura COFACE vencida</span> — venció el {fmtDate(cliente.fechaVencimientoCoface)}. Renueva la consulta.
      </div>
    )}

    {/* Scroll content */}
    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
      {/* Facturas pendientes */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center justify-between">
          Facturas pendientes
          <span className="text-xs text-gray-400 font-normal">{facturas.length} doc.</span>
        </h3>
        {facturas.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Sin facturas pendientes</p>
        ) : (
          <div className="space-y-1.5">
            {facturas.map(f => (
              <div key={f.id}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm border ${f.diasVencida > 0 ? 'border-red-200 bg-red-50' : 'border-gray-100 bg-gray-50'}`}>
                <div>
                  <span className="font-medium text-gray-800">{f.referencia}</span>
                  <span className="text-gray-400 ml-2 text-xs">{fmtDate(f.fecha)}</span>
                  {f.diasVencida > 0 && (
                    <span className="ml-2 text-xs text-red-600 font-semibold">
                      +{f.diasVencida}d vencida
                    </span>
                  )}
                </div>
                <span className={`font-semibold ${f.diasVencida > 0 ? 'text-red-700' : 'text-gray-700'}`}>
                  {fmt(f.saldoPendiente)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pedidos sin facturar */}
      {pedidos.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center justify-between">
            Pedidos confirmados sin factura
            <span className="text-xs text-gray-400 font-normal">{pedidos.length} doc.</span>
          </h3>
          <div className="space-y-1.5">
            {pedidos.map(p => (
              <div key={p.id}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-sm border border-blue-100 bg-blue-50">
                <div>
                  <span className="font-medium text-gray-800">{p.referencia}</span>
                  <span className="text-gray-400 ml-2 text-xs">{fmtDate(p.fecha)}</span>
                  <span className="ml-2 text-xs text-blue-600 capitalize">{p.estado}</span>
                </div>
                <span className="font-semibold text-blue-700">{fmt(p.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>

    {/* Acciones */}
    {canManage && (
      <div className="px-6 py-4 border-t bg-gray-50 flex gap-2">
        <button onClick={onEditarLimite}
          className="flex-1 px-3 py-2 text-sm border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50">
          Editar límite COFACE
        </button>
        {cliente.bloqueado ? (
          <button onClick={onDesbloquear}
            className="flex-1 px-3 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg">
            Desbloquear
          </button>
        ) : (
          <button onClick={onBloquear}
            className="flex-1 px-3 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg">
            Bloquear cliente
          </button>
        )}
      </div>
    )}
  </div>
);

// ─── Vista principal ─────────────────────────────────────────

const FILTROS: { key: EstadoRiesgo | 'todos'; label: string }[] = [
  { key: 'todos',     label: 'Todos' },
  { key: 'bloqueado', label: 'Bloqueados' },
  { key: 'excedido',  label: 'Excedidos' },
  { key: 'vencido',   label: 'Vencidos' },
  { key: 'alerta',    label: 'En alerta' },
  { key: 'sin_limite',label: 'Sin límite' },
  { key: 'ok',        label: 'OK' },
];

export default function RiesgoClienteView({ empresaId, currentUserId, currentUserRole }: Props) {
  const {
    riesgos, loading, error,
    fetchRiesgos, fetchFacturasPendientes, fetchPedidosVivos,
    saveLimiteCredito, bloquearCliente, desbloquearCliente, getResumen,
  } = useRiesgoCredito(empresaId);

  const [filtro,      setFiltro]      = useState<EstadoRiesgo | 'todos'>('todos');
  const [busqueda,    setBusqueda]    = useState('');
  const [detalle,     setDetalle]     = useState<RiesgoCliente | null>(null);
  const [factDetalle, setFactDetalle] = useState<FacturaPendienteRiesgo[]>([]);
  const [pedDetalle,  setPedDetalle]  = useState<{ id: string; referencia: string; fecha: string; estado: string; total: number }[]>([]);
  const [modalLimite, setModalLimite] = useState<RiesgoCliente | null>(null);
  const [modalBloqueo,setModalBloqueo]= useState<RiesgoCliente | null>(null);

  const canManage = ['admin', 'administracion', 'direccion'].includes(currentUserRole);

  useEffect(() => { fetchRiesgos(); }, [fetchRiesgos]);

  const resumen = getResumen();

  const riesgosFiltrados = useMemo(() => {
    return riesgos.filter(r => {
      const matchFiltro  = filtro === 'todos' || r.estadoRiesgo === filtro;
      const matchBusqueda = busqueda === '' ||
        r.clienteNombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        r.email.toLowerCase().includes(busqueda.toLowerCase()) ||
        (r.cif ?? '').toLowerCase().includes(busqueda.toLowerCase());
      return matchFiltro && matchBusqueda;
    });
  }, [riesgos, filtro, busqueda]);

  const abrirDetalle = async (r: RiesgoCliente) => {
    setDetalle(r);
    const [facts, peds] = await Promise.all([
      fetchFacturasPendientes(r.clienteId),
      fetchPedidosVivos(r.clienteId),
    ]);
    setFactDetalle(facts);
    setPedDetalle(peds as typeof pedDetalle);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Riesgo de Crédito</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Límites COFACE, deuda vencida y bloqueo de clientes
          </p>
        </div>
        <button onClick={fetchRiesgos}
          className="px-4 py-2 text-sm border rounded-lg text-gray-600 hover:bg-gray-50">
          Actualizar
        </button>
      </div>

      {/* Cards resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-500 mb-1">Riesgo vivo total</p>
          <p className="text-2xl font-bold text-orange-600">{fmt(resumen.totalRiesgoVivo)}</p>
          <p className="text-xs text-gray-400 mt-1">{resumen.totalClientesConRiesgo} clientes con saldo</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-500 mb-1">Deuda vencida</p>
          <p className={`text-2xl font-bold ${resumen.totalDeudaVencida > 0 ? 'text-red-600' : 'text-gray-400'}`}>
            {fmt(resumen.totalDeudaVencida)}
          </p>
          <p className="text-xs text-gray-400 mt-1">{resumen.clientesEnAlerta} clientes en alerta/riesgo</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-500 mb-1">Clientes bloqueados</p>
          <p className={`text-2xl font-bold ${resumen.clientesBloqueados > 0 ? 'text-red-700' : 'text-gray-400'}`}>
            {resumen.clientesBloqueados}
          </p>
          <p className="text-xs text-gray-400 mt-1">Bloqueados para nuevos pedidos</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-500 mb-1">Cobertura COFACE total</p>
          <p className="text-2xl font-bold text-blue-700">{fmt(resumen.limiteCoface_total)}</p>
          {resumen.pctLimiteGlobalUsado != null && (
            <p className="text-xs text-gray-400 mt-1">{resumen.pctLimiteGlobalUsado}% utilizado</p>
          )}
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex gap-1 flex-wrap">
          {FILTROS.map(f => (
            <button key={f.key} onClick={() => setFiltro(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filtro === f.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {f.label}
              {f.key !== 'todos' && (
                <span className="ml-1 opacity-70">
                  ({riesgos.filter(r => r.estadoRiesgo === f.key).length})
                </span>
              )}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar cliente, email o CIF..."
          className="sm:ml-auto border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
        />
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando riesgo de clientes...</div>
      ) : error ? (
        <div className="text-center py-12 text-red-500">{error}</div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Cliente</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Límite COFACE</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Riesgo vivo</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Deuda vencida</th>
                  <th className="px-4 py-3 font-medium text-gray-600">% Límite</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Estado</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {riesgosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-gray-400 italic">
                      No hay clientes que coincidan con el filtro
                    </td>
                  </tr>
                ) : riesgosFiltrados.map(r => (
                  <tr key={r.clienteId}
                    className={`hover:bg-gray-50 transition-colors ${r.bloqueado ? 'bg-red-50/40' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{r.clienteNombre}</div>
                      <div className="text-xs text-gray-400">{r.email}</div>
                      {r.diasMayorVencimiento > 0 && (
                        <div className="text-xs text-red-600 font-medium">
                          Vencida desde hace {r.diasMayorVencimiento}d
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.limiteCoface ? (
                        <div>
                          <div className="font-medium text-gray-800">{fmt(r.limiteCoface)}</div>
                          {r.clasificacionCoface && (
                            <div className="text-xs text-blue-600 font-semibold">{r.clasificacionCoface}</div>
                          )}
                        </div>
                      ) : r.limiteInterno ? (
                        <div>
                          <div className="font-medium text-gray-600">{fmt(r.limiteInterno)}</div>
                          <div className="text-xs text-gray-400">Interno</div>
                        </div>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-semibold ${r.riesgoVivo > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                        {fmt(r.riesgoVivo)}
                      </span>
                      {r.numFacturasPendientes > 0 && (
                        <div className="text-xs text-gray-400">{r.numFacturasPendientes} fact.</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-semibold ${r.deudaVencida > 0 ? 'text-red-600' : 'text-gray-300'}`}>
                        {r.deudaVencida > 0 ? fmt(r.deudaVencida) : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <BarraLimite pct={r.pctLimiteUsado} />
                    </td>
                    <td className="px-4 py-3">
                      <EstadoBadge estado={r.estadoRiesgo} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => abrirDetalle(r)}
                          title="Ver detalle"
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        {canManage && (
                          <>
                            <button
                              onClick={() => setModalLimite(r)}
                              title="Editar límite COFACE"
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            {r.bloqueado ? (
                              <button
                                onClick={() => desbloquearCliente(r.clienteId)}
                                title="Desbloquear"
                                className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                                </svg>
                              </button>
                            ) : (
                              <button
                                onClick={() => setModalBloqueo(r)}
                                title="Bloquear cliente"
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M12 7a4 4 0 00-4 4" />
                                </svg>
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Panel lateral de detalle */}
      {detalle && (
        <>
          <div className="fixed inset-0 bg-black/20 z-30" onClick={() => setDetalle(null)} />
          <PanelDetalle
            cliente={detalle}
            facturas={factDetalle}
            pedidos={pedDetalle}
            onClose={() => setDetalle(null)}
            onBloquear={() => { setModalBloqueo(detalle); }}
            onDesbloquear={async () => { await desbloquearCliente(detalle.clienteId); setDetalle(null); }}
            onEditarLimite={() => setModalLimite(detalle)}
            canManage={canManage}
          />
        </>
      )}

      {/* Modal editar límite */}
      {modalLimite && (
        <ModalLimite
          cliente={modalLimite}
          onSave={saveLimiteCredito}
          onClose={() => setModalLimite(null)}
        />
      )}

      {/* Modal bloquear */}
      {modalBloqueo && (
        <ModalBloqueo
          cliente={modalBloqueo}
          onConfirm={async (motivo) => {
            await bloquearCliente(modalBloqueo.clienteId, motivo, currentUserId);
          }}
          onClose={() => setModalBloqueo(null)}
        />
      )}
    </div>
  );
}
