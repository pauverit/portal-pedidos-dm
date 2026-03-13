import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen, Plus, CheckCircle2, XCircle, Clock, Search,
  ChevronDown, ChevronRight, Download, AlertCircle, X, Save,
  BarChart3, FileText, List,
} from 'lucide-react';
import { useContabilidad } from '../hooks/useContabilidad';
import { useEmpresaData } from '../hooks/useEmpresaData';
import {
  CuentaContable, Asiento, AsientoLinea, User, TipoAsiento,
} from '../types';

// ─── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const fmtEur = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

const ESTADO_COLOR: Record<string, string> = {
  borrador:   'bg-amber-100 text-amber-700',
  confirmado: 'bg-green-100 text-green-700',
  cancelado:  'bg-red-100 text-red-600',
};

const TIPO_LABEL: Record<TipoAsiento, string> = {
  manual:       'Manual',
  venta:        'Venta',
  compra:       'Compra',
  nomina:       'Nómina',
  amortizacion: 'Amortización',
  apertura:     'Apertura',
  cierre:       'Cierre',
};

const GRUPO_NOMBRE: Record<number, string> = {
  1: 'Grupo 1 — Financiación básica',
  2: 'Grupo 2 — Activo no corriente',
  3: 'Grupo 3 — Existencias',
  4: 'Grupo 4 — Acreedores y deudores',
  5: 'Grupo 5 — Cuentas financieras',
  6: 'Grupo 6 — Compras y gastos',
  7: 'Grupo 7 — Ventas e ingresos',
  8: 'Grupo 8 — Gastos imputados al patrimonio neto',
  9: 'Grupo 9 — Ingresos imputados al patrimonio neto',
};

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  currentUser: User;
}

interface LineaDraft {
  cuenta_id: string;
  descripcion: string;
  debe: string;
  haber: string;
}

const LINEA_VACIA: LineaDraft = { cuenta_id: '', descripcion: '', debe: '', haber: '' };

// ─── Subcomponent: Asiento modal ───────────────────────────────────────────────

function AsientoModal({
  planCuentas,
  onCreate,
  onClose,
}: {
  planCuentas: CuentaContable[];
  onCreate: (draft: {
    fecha: string;
    descripcion: string;
    tipo: TipoAsiento;
    referencia?: string;
    notas?: string;
    lineas: { cuenta_id: string; descripcion?: string; debe: number; haber: number; orden?: number }[];
  }) => Promise<void>;
  onClose: () => void;
}) {
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [descripcion, setDescripcion] = useState('');
  const [tipo, setTipo] = useState<TipoAsiento>('manual');
  const [referencia, setReferencia] = useState('');
  const [lineas, setLineas] = useState<LineaDraft[]>([
    { ...LINEA_VACIA },
    { ...LINEA_VACIA },
  ]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const totalDebe  = lineas.reduce((s, l) => s + (parseFloat(l.debe)  || 0), 0);
  const totalHaber = lineas.reduce((s, l) => s + (parseFloat(l.haber) || 0), 0);
  const cuadra     = Math.abs(totalDebe - totalHaber) < 0.01;

  const addLinea = () => setLineas(prev => [...prev, { ...LINEA_VACIA }]);
  const removeLinea = (i: number) => setLineas(prev => prev.filter((_, idx) => idx !== i));
  const setLinea = (i: number, field: keyof LineaDraft, value: string) => {
    setLineas(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l));
  };

  const handleSave = async () => {
    if (!descripcion.trim()) { setErr('La descripción es obligatoria'); return; }
    if (!cuadra) { setErr(`El asiento no cuadra: Debe ${fmt(totalDebe)} ≠ Haber ${fmt(totalHaber)}`); return; }
    const lineasValidas = lineas.filter(l => l.cuenta_id && (parseFloat(l.debe) > 0 || parseFloat(l.haber) > 0));
    if (lineasValidas.length < 2) { setErr('Añade al menos 2 líneas con importe'); return; }
    setSaving(true);
    setErr(null);
    await onCreate({
      fecha, descripcion, tipo,
      referencia: referencia || undefined,
      lineas: lineasValidas.map((l, i) => ({
        cuenta_id: l.cuenta_id,
        descripcion: l.descripcion || undefined,
        debe: parseFloat(l.debe) || 0,
        haber: parseFloat(l.haber) || 0,
        orden: i + 1,
      })),
    });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-slate-800">Nuevo asiento</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Cabecera del asiento */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">Descripción *</label>
              <input
                value={descripcion}
                onChange={e => setDescripcion(e.target.value)}
                placeholder="Concepto del asiento"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Fecha *</label>
              <input
                type="date"
                value={fecha}
                onChange={e => setFecha(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Tipo</label>
              <select
                value={tipo}
                onChange={e => setTipo(e.target.value as TipoAsiento)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                {Object.entries(TIPO_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Referencia</label>
            <input
              value={referencia}
              onChange={e => setReferencia(e.target.value)}
              placeholder="Nº factura, documento..."
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* Líneas */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Líneas del asiento</span>
              <button
                onClick={addLinea}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                <Plus size={13} /> Añadir línea
              </button>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b">
                  <th className="pb-1 w-32">Cuenta</th>
                  <th className="pb-1">Descripción</th>
                  <th className="pb-1 w-24 text-right">Debe</th>
                  <th className="pb-1 w-24 text-right">Haber</th>
                  <th className="pb-1 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {lineas.map((linea, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-1 pr-2">
                      <select
                        value={linea.cuenta_id}
                        onChange={e => setLinea(i, 'cuenta_id', e.target.value)}
                        className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                      >
                        <option value="">-- cuenta --</option>
                        {planCuentas.map(c => (
                          <option key={c.id} value={c.id}>{c.codigo} {c.nombre}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1 pr-2">
                      <input
                        value={linea.descripcion}
                        onChange={e => setLinea(i, 'descripcion', e.target.value)}
                        placeholder="Concepto..."
                        className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={linea.debe}
                        onChange={e => setLinea(i, 'debe', e.target.value)}
                        className="w-full border rounded px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-400"
                        placeholder="0.00"
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={linea.haber}
                        onChange={e => setLinea(i, 'haber', e.target.value)}
                        className="w-full border rounded px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-400"
                        placeholder="0.00"
                      />
                    </td>
                    <td className="py-1">
                      {lineas.length > 2 && (
                        <button onClick={() => removeLinea(i)} className="text-slate-300 hover:text-red-400">
                          <X size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-bold text-sm">
                  <td colSpan={2} className="pt-2 text-right text-slate-500">Totales:</td>
                  <td className={`pt-2 text-right ${cuadra ? 'text-green-700' : 'text-red-600'}`}>
                    {fmt(totalDebe)}
                  </td>
                  <td className={`pt-2 text-right ${cuadra ? 'text-green-700' : 'text-red-600'}`}>
                    {fmt(totalHaber)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>

            {!cuadra && totalDebe + totalHaber > 0 && (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                <AlertCircle size={12} /> Diferencia: {fmt(Math.abs(totalDebe - totalHaber))}
              </p>
            )}
            {cuadra && totalDebe > 0 && (
              <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
                <CheckCircle2 size={12} /> El asiento cuadra
              </p>
            )}
          </div>

          {err && (
            <div className="bg-red-50 text-red-700 rounded-lg px-4 py-2 text-sm flex items-center gap-2">
              <AlertCircle size={14} /> {err}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Save size={14} /> {saving ? 'Guardando...' : 'Guardar borrador'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main view ─────────────────────────────────────────────────────────────────

export function ContabilidadView({ currentUser }: Props) {
  const { empresas } = useEmpresaData();
  const empresa = empresas[0] ?? null;

  const {
    planCuentas, asientos, sumasSaldos, loading, error,
    loadAsientos, loadSumasSaldos, createAsiento, confirmarAsiento, cancelarAsiento,
  } = useContabilidad(empresa?.id);

  const [tab, setTab] = useState<'diario' | 'plan' | 'informes'>('diario');
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState<string>('todos');
  const [showModal, setShowModal] = useState(false);
  const [expandedGrupos, setExpandedGrupos] = useState<Set<number>>(new Set([4, 6, 7]));
  const [selectedAsiento, setSelectedAsiento] = useState<Asiento | null>(null);

  // Dates for Modelo 303
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentQ = Math.floor(now.getMonth() / 3) + 1;
  const [mod303Year, setMod303Year] = useState(currentYear);
  const [mod303Q, setMod303Q] = useState(currentQ > 1 ? currentQ - 1 : 4);

  useEffect(() => {
    if (tab === 'informes') loadSumasSaldos();
  }, [tab, loadSumasSaldos]);

  // ─── Filtered asientos ─────────────────────────────────────────────────────
  const filteredAsientos = useMemo(() => {
    return asientos.filter(a => {
      const matchEstado = filterEstado === 'todos' || a.estado === filterEstado;
      const matchSearch = !search ||
        a.descripcion.toLowerCase().includes(search.toLowerCase()) ||
        a.referencia?.toLowerCase().includes(search.toLowerCase()) ||
        String(a.num_asiento).includes(search);
      return matchEstado && matchSearch;
    });
  }, [asientos, filterEstado, search]);

  // ─── Plan cuentas grouped ──────────────────────────────────────────────────
  const cuentasPorGrupo = useMemo(() => {
    const grupos: Record<number, CuentaContable[]> = {};
    planCuentas.forEach(c => {
      if (!grupos[c.grupo]) grupos[c.grupo] = [];
      grupos[c.grupo].push(c);
    });
    return grupos;
  }, [planCuentas]);

  // ─── Modelo 303 data ───────────────────────────────────────────────────────
  const mod303Data = useMemo(() => {
    const c477 = sumasSaldos.find(s => s.codigo === '477');
    const c472 = sumasSaldos.find(s => s.codigo === '472');
    const base477 = c477 ? c477.total_haber : 0;
    const base472 = c472 ? c472.total_debe  : 0;
    const diferencia = base477 - base472;
    return { ivaRepercutido: base477, ivaSoportado: base472, resultado: diferencia };
  }, [sumasSaldos]);

  const handleCreate = async (draft: Parameters<typeof createAsiento>[0]) => {
    await createAsiento(draft);
    setShowModal(false);
  };

  const toggleGrupo = (g: number) => {
    setExpandedGrupos(prev => {
      const s = new Set(prev);
      s.has(g) ? s.delete(g) : s.add(g);
      return s;
    });
  };

  // ─── TAB: Libro Diario ─────────────────────────────────────────────────────
  const renderDiario = () => (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar asientos..."
            className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
        <select
          value={filterEstado}
          onChange={e => setFilterEstado(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="todos">Todos los estados</option>
          <option value="borrador">Borrador</option>
          <option value="confirmado">Confirmado</option>
          <option value="cancelado">Cancelado</option>
        </select>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700"
        >
          <Plus size={14} /> Nuevo asiento
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Cargando asientos...</div>
      ) : filteredAsientos.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
          <p>No hay asientos registrados</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide w-16">Nº</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide w-28">Fecha</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Descripción</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide w-24">Tipo</th>
                <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide w-24">Debe</th>
                <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide w-24">Haber</th>
                <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide w-24">Estado</th>
                <th className="px-4 py-3 w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAsientos.map(a => {
                const totalDebe  = a.lineas?.reduce((s, l) => s + l.debe, 0) ?? 0;
                const totalHaber = a.lineas?.reduce((s, l) => s + l.haber, 0) ?? 0;
                return (
                  <React.Fragment key={a.id}>
                    <tr
                      className="hover:bg-slate-50 cursor-pointer"
                      onClick={() => setSelectedAsiento(selectedAsiento?.id === a.id ? null : a)}
                    >
                      <td className="px-4 py-3 font-mono font-bold text-slate-600">{a.num_asiento}</td>
                      <td className="px-4 py-3 text-slate-600">{a.fecha}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{a.descripcion}</div>
                        {a.referencia && <div className="text-xs text-slate-400">{a.referencia}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                          {TIPO_LABEL[a.tipo]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">{fmt(totalDebe)}</td>
                      <td className="px-4 py-3 text-right font-mono">{fmt(totalHaber)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${ESTADO_COLOR[a.estado]}`}>
                          {a.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {a.estado === 'borrador' && (
                            <>
                              <button
                                onClick={e => { e.stopPropagation(); confirmarAsiento(a.id); }}
                                title="Confirmar"
                                className="text-green-500 hover:text-green-700 p-1 rounded"
                              >
                                <CheckCircle2 size={15} />
                              </button>
                              <button
                                onClick={e => { e.stopPropagation(); cancelarAsiento(a.id); }}
                                title="Cancelar"
                                className="text-red-400 hover:text-red-600 p-1 rounded"
                              >
                                <XCircle size={15} />
                              </button>
                            </>
                          )}
                          <button className="text-slate-300 hover:text-slate-500 p-1 rounded">
                            {selectedAsiento?.id === a.id ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {/* Expanded lines */}
                    {selectedAsiento?.id === a.id && a.lineas && (
                      <tr>
                        <td colSpan={8} className="bg-slate-50 px-6 pb-3 pt-1">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-slate-400 border-b">
                                <th className="text-left pb-1 w-28">Cuenta</th>
                                <th className="text-left pb-1">Descripción</th>
                                <th className="text-right pb-1 w-24">Debe</th>
                                <th className="text-right pb-1 w-24">Haber</th>
                              </tr>
                            </thead>
                            <tbody>
                              {a.lineas.map(l => (
                                <tr key={l.id} className="border-b last:border-0">
                                  <td className="py-1 font-mono font-bold text-slate-600">
                                    {l.cuenta?.codigo ?? l.cuenta_id.slice(0, 8)}
                                  </td>
                                  <td className="py-1 text-slate-600">
                                    {l.cuenta?.nombre}
                                    {l.descripcion && <span className="text-slate-400"> — {l.descripcion}</span>}
                                  </td>
                                  <td className="py-1 text-right font-mono">{l.debe > 0 ? fmt(l.debe) : ''}</td>
                                  <td className="py-1 text-right font-mono">{l.haber > 0 ? fmt(l.haber) : ''}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // ─── TAB: Plan de Cuentas ──────────────────────────────────────────────────
  const renderPlan = () => (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5, 6, 7].map(g => {
        const cuentas = cuentasPorGrupo[g] ?? [];
        if (cuentas.length === 0) return null;
        const expanded = expandedGrupos.has(g);
        return (
          <div key={g} className="bg-white rounded-xl border overflow-hidden">
            <button
              onClick={() => toggleGrupo(g)}
              className="w-full flex items-center justify-between px-5 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                  {g}
                </span>
                <span className="font-semibold text-slate-700 text-sm">{GRUPO_NOMBRE[g]}</span>
                <span className="text-xs text-slate-400">({cuentas.length} cuentas)</span>
              </div>
              {expanded ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
            </button>
            {expanded && (
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr className="text-xs text-slate-400">
                    <th className="text-left px-5 py-2 w-20">Código</th>
                    <th className="text-left px-5 py-2">Nombre</th>
                    <th className="text-center px-5 py-2 w-16">Nat.</th>
                    <th className="text-left px-5 py-2 w-24">Tipo</th>
                    <th className="text-center px-5 py-2 w-16">PGC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {cuentas.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="px-5 py-2 font-mono font-bold text-slate-600">{c.codigo}</td>
                      <td className="px-5 py-2 text-slate-700">{c.nombre}</td>
                      <td className="px-5 py-2 text-center">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${c.naturaleza === 'D' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}`}>
                          {c.naturaleza}
                        </span>
                      </td>
                      <td className="px-5 py-2 text-xs text-slate-500 capitalize">{c.tipo}</td>
                      <td className="px-5 py-2 text-center">
                        {c.es_pgc && <span className="text-xs text-green-600 font-medium">PGC</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );
      })}
    </div>
  );

  // ─── TAB: Informes ─────────────────────────────────────────────────────────
  const renderInformes = () => {
    const qLabels = ['1T (Ene-Mar)', '2T (Abr-Jun)', '3T (Jul-Sep)', '4T (Oct-Dic)'];
    return (
      <div className="space-y-6">
        {/* Modelo 303 */}
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b">
            <div>
              <h3 className="font-bold text-slate-800">Modelo 303 — IVA Trimestral</h3>
              <p className="text-xs text-slate-500 mt-0.5">Declaración-liquidación periódica del IVA</p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={mod303Q}
                onChange={e => setMod303Q(Number(e.target.value))}
                className="border rounded-lg px-3 py-1.5 text-sm"
              >
                {qLabels.map((l, i) => <option key={i + 1} value={i + 1}>{l}</option>)}
              </select>
              <select
                value={mod303Year}
                onChange={e => setMod303Year(Number(e.target.value))}
                className="border rounded-lg px-3 py-1.5 text-sm"
              >
                {[currentYear - 1, currentYear].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <button
                onClick={loadSumasSaldos}
                className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Actualizar
              </button>
            </div>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-blue-50 rounded-xl p-5">
              <p className="text-xs font-bold text-blue-500 uppercase tracking-wide mb-1">IVA repercutido (477)</p>
              <p className="text-3xl font-bold text-blue-800">{fmtEur(mod303Data.ivaRepercutido)}</p>
              <p className="text-xs text-blue-500 mt-1">IVA de ventas emitidas</p>
            </div>
            <div className="bg-orange-50 rounded-xl p-5">
              <p className="text-xs font-bold text-orange-500 uppercase tracking-wide mb-1">IVA soportado (472)</p>
              <p className="text-3xl font-bold text-orange-800">{fmtEur(mod303Data.ivaSoportado)}</p>
              <p className="text-xs text-orange-500 mt-1">IVA de compras recibidas</p>
            </div>
            <div className={`rounded-xl p-5 ${mod303Data.resultado >= 0 ? 'bg-red-50' : 'bg-green-50'}`}>
              <p className={`text-xs font-bold uppercase tracking-wide mb-1 ${mod303Data.resultado >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                Resultado
              </p>
              <p className={`text-3xl font-bold ${mod303Data.resultado >= 0 ? 'text-red-800' : 'text-green-800'}`}>
                {fmtEur(mod303Data.resultado)}
              </p>
              <p className={`text-xs mt-1 ${mod303Data.resultado >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                {mod303Data.resultado >= 0 ? 'A ingresar a Hacienda' : 'A devolver por Hacienda'}
              </p>
            </div>
          </div>
          <div className="px-6 pb-4 text-xs text-slate-400 italic">
            * Los importes reflejan los saldos acumulados en el plan de cuentas con asientos confirmados.
            Para declaración oficial, filtrar por fecha del trimestre correspondiente.
          </div>
        </div>

        {/* Balance sumas y saldos */}
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800">Balance de Sumas y Saldos</h3>
              <p className="text-xs text-slate-500 mt-0.5">Acumulado de todas las cuentas con movimiento</p>
            </div>
          </div>
          {sumasSaldos.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-sm">
              No hay asientos confirmados. Confirma asientos para ver el balance.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr className="text-xs text-slate-500">
                  <th className="text-left px-5 py-2 w-20">Código</th>
                  <th className="text-left px-5 py-2">Cuenta</th>
                  <th className="text-right px-5 py-2 w-28">Debe</th>
                  <th className="text-right px-5 py-2 w-28">Haber</th>
                  <th className="text-right px-5 py-2 w-28">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sumasSaldos.filter(s => s.total_debe + s.total_haber > 0).map(s => (
                  <tr key={s.codigo} className="hover:bg-slate-50">
                    <td className="px-5 py-2 font-mono font-bold text-slate-600">{s.codigo}</td>
                    <td className="px-5 py-2 text-slate-700">{s.nombre}</td>
                    <td className="px-5 py-2 text-right font-mono">{fmt(s.total_debe)}</td>
                    <td className="px-5 py-2 text-right font-mono">{fmt(s.total_haber)}</td>
                    <td className={`px-5 py-2 text-right font-mono font-bold ${s.saldo > 0 ? 'text-slate-800' : s.saldo < 0 ? 'text-red-600' : 'text-slate-400'}`}>
                      {fmt(s.saldo)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Contabilidad</h1>
          {empresa && <p className="text-sm text-slate-500 mt-0.5">Plan General Contable — {empresa.nombre}</p>}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {([
          { id: 'diario',   label: 'Libro Diario',    icon: List },
          { id: 'plan',     label: 'Plan de Cuentas', icon: BookOpen },
          { id: 'informes', label: 'Informes / Mod.303', icon: BarChart3 },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
              tab === t.id
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'diario'   && renderDiario()}
      {tab === 'plan'     && renderPlan()}
      {tab === 'informes' && renderInformes()}

      {/* Modal */}
      {showModal && (
        <AsientoModal
          planCuentas={planCuentas}
          onCreate={handleCreate}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
