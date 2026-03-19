import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen, Plus, CheckCircle2, XCircle, Search,
  ChevronDown, ChevronRight, AlertCircle, X, Save,
  BarChart3, List, RefreshCw, FileDown,
} from 'lucide-react';
import { useContabilidad } from '../hooks/useContabilidad';
import { useEmpresaData } from '../hooks/useEmpresaData';
import {
  CuentaContable, Asiento, AsientoLinea, User, TipoAsiento,
} from '../types';
import {
  SageToolbar, SageTabStrip, SageFilterInput, SageSelect,
  sageTh, sageThR, sageRowClass,
} from './SageToolbar';

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
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header SAGE-style */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-blue-700 to-blue-600 shrink-0">
          <h2 className="text-sm font-semibold text-white">Nuevo asiento contable</h2>
          <button onClick={onClose} className="text-blue-200 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Cabecera del asiento */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-medium text-slate-500 mb-1 uppercase tracking-wide">Descripción *</label>
              <input
                value={descripcion}
                onChange={e => setDescripcion(e.target.value)}
                placeholder="Concepto del asiento"
                className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1 uppercase tracking-wide">Fecha *</label>
              <input
                type="date"
                value={fecha}
                onChange={e => setFecha(e.target.value)}
                className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1 uppercase tracking-wide">Tipo</label>
              <select
                value={tipo}
                onChange={e => setTipo(e.target.value as TipoAsiento)}
                className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
              >
                {Object.entries(TIPO_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1 uppercase tracking-wide">Referencia</label>
            <input
              value={referencia}
              onChange={e => setReferencia(e.target.value)}
              placeholder="Nº factura, documento..."
              className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>

          {/* Líneas */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Líneas del asiento</span>
              <button
                onClick={addLinea}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                <Plus size={12} /> Añadir línea
              </button>
            </div>

            <div className="border border-slate-200 rounded overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className={`${sageTh} w-36`}>Cuenta</th>
                    <th className={sageTh}>Descripción</th>
                    <th className={`${sageThR} w-24`}>Debe</th>
                    <th className={`${sageThR} w-24`}>Haber</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {lineas.map((linea, i) => (
                    <tr key={i} className="border-b border-slate-100 last:border-0">
                      <td className="px-2 py-1 pr-2">
                        <select
                          value={linea.cuenta_id}
                          onChange={e => setLinea(i, 'cuenta_id', e.target.value)}
                          className="w-full border border-slate-200 rounded px-1.5 py-0.5 text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-400"
                        >
                          <option value="">— cuenta —</option>
                          {planCuentas.map(c => (
                            <option key={c.id} value={c.id}>{c.codigo} {c.nombre}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-1">
                        <input
                          value={linea.descripcion}
                          onChange={e => setLinea(i, 'descripcion', e.target.value)}
                          placeholder="Concepto..."
                          className="w-full border border-slate-200 rounded px-1.5 py-0.5 text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="number" min="0" step="0.01"
                          value={linea.debe}
                          onChange={e => setLinea(i, 'debe', e.target.value)}
                          className="w-full border border-slate-200 rounded px-1.5 py-0.5 text-[12px] text-right focus:outline-none focus:ring-1 focus:ring-blue-400"
                          placeholder="0.00"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="number" min="0" step="0.01"
                          value={linea.haber}
                          onChange={e => setLinea(i, 'haber', e.target.value)}
                          className="w-full border border-slate-200 rounded px-1.5 py-0.5 text-[12px] text-right focus:outline-none focus:ring-1 focus:ring-blue-400"
                          placeholder="0.00"
                        />
                      </td>
                      <td className="px-1 py-1 text-center">
                        {lineas.length > 2 && (
                          <button onClick={() => removeLinea(i)} className="text-slate-300 hover:text-red-400">
                            <X size={13} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 border-t border-slate-200">
                    <td colSpan={2} className="px-2 py-1.5 text-right text-[11px] font-bold text-slate-500 uppercase">Totales:</td>
                    <td className={`px-2 py-1.5 text-right text-[12px] font-bold font-mono ${cuadra ? 'text-green-700' : 'text-red-600'}`}>
                      {fmt(totalDebe)}
                    </td>
                    <td className={`px-2 py-1.5 text-right text-[12px] font-bold font-mono ${cuadra ? 'text-green-700' : 'text-red-600'}`}>
                      {fmt(totalHaber)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

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
            <div className="bg-red-50 text-red-700 rounded px-3 py-2 text-xs flex items-center gap-2">
              <AlertCircle size={13} /> {err}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-3 border-t bg-slate-50 shrink-0">
          <button onClick={onClose} className="px-4 py-1.5 text-sm text-slate-600 hover:text-slate-800 border border-slate-200 rounded hover:bg-slate-100">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white text-sm font-semibold rounded hover:bg-blue-700 disabled:opacity-50"
          >
            <Save size={13} /> {saving ? 'Guardando...' : 'Guardar borrador'}
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
    <>
      <SageToolbar
        groups={[[
          { label: 'Nuevo asiento', icon: Plus, onClick: () => setShowModal(true), variant: 'primary' },
        ], [
          { label: 'Actualizar', icon: RefreshCw, onClick: loadAsientos },
          { label: 'Exportar', icon: FileDown, onClick: () => {} },
        ]]}
        filter={<>
          <SageFilterInput value={search} onChange={setSearch} placeholder="Buscar asientos…" />
          <SageSelect
            value={filterEstado}
            onChange={setFilterEstado}
            options={[
              { value: 'todos', label: 'Todos los estados' },
              { value: 'borrador', label: 'Borrador' },
              { value: 'confirmado', label: 'Confirmado' },
              { value: 'cancelado', label: 'Cancelado' },
            ]}
          />
        </>}
        recordCount={filteredAsientos.length}
        recordLabel="asientos"
      />

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Cargando asientos...</div>
      ) : filteredAsientos.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <BookOpen size={36} className="mx-auto mb-3 opacity-25" />
          <p className="text-sm">No hay asientos registrados</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-slate-50 border-b border-slate-200">
              <tr>
                <th className={`${sageTh} w-12`}>Nº</th>
                <th className={`${sageTh} w-24`}>Fecha</th>
                <th className={sageTh}>Descripción</th>
                <th className={`${sageTh} w-20`}>Tipo</th>
                <th className={`${sageThR} w-24`}>Debe</th>
                <th className={`${sageThR} w-24`}>Haber</th>
                <th className={`${sageTh} w-24 text-center`}>Estado</th>
                <th className="w-16 px-2"></th>
              </tr>
            </thead>
            <tbody>
              {filteredAsientos.map((a, idx) => {
                const totalDebe  = a.lineas?.reduce((s, l) => s + l.debe, 0) ?? 0;
                const totalHaber = a.lineas?.reduce((s, l) => s + l.haber, 0) ?? 0;
                const isSelected = selectedAsiento?.id === a.id;
                return (
                  <React.Fragment key={a.id}>
                    <tr
                      className={sageRowClass(isSelected, idx % 2 === 1)}
                      onClick={() => setSelectedAsiento(isSelected ? null : a)}
                    >
                      <td className="px-2 py-1 font-mono font-bold text-[12px] text-slate-600">{a.num_asiento}</td>
                      <td className="px-2 py-1 text-[12px] text-slate-600 whitespace-nowrap">{a.fecha}</td>
                      <td className="px-2 py-1">
                        <div className="text-[12px] font-medium text-slate-800">{a.descripcion}</div>
                        {a.referencia && <div className="text-[11px] text-slate-400">{a.referencia}</div>}
                      </td>
                      <td className="px-2 py-1">
                        <span className="text-[11px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                          {TIPO_LABEL[a.tipo]}
                        </span>
                      </td>
                      <td className="px-2 py-1 text-right font-mono text-[12px] text-slate-700">{fmt(totalDebe)}</td>
                      <td className="px-2 py-1 text-right font-mono text-[12px] text-slate-700">{fmt(totalHaber)}</td>
                      <td className="px-2 py-1 text-center">
                        <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${ESTADO_COLOR[a.estado]}`}>
                          {a.estado}
                        </span>
                      </td>
                      <td className="px-2 py-1">
                        <div className="flex items-center justify-end gap-0.5">
                          {a.estado === 'borrador' && (
                            <>
                              <button
                                onClick={e => { e.stopPropagation(); confirmarAsiento(a.id); }}
                                title="Confirmar"
                                className="text-green-500 hover:text-green-700 p-0.5 rounded"
                              >
                                <CheckCircle2 size={13} />
                              </button>
                              <button
                                onClick={e => { e.stopPropagation(); cancelarAsiento(a.id); }}
                                title="Cancelar"
                                className="text-red-400 hover:text-red-600 p-0.5 rounded"
                              >
                                <XCircle size={13} />
                              </button>
                            </>
                          )}
                          <button className="text-slate-300 hover:text-slate-500 p-0.5 rounded">
                            {isSelected ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {/* Expanded lines */}
                    {isSelected && a.lineas && (
                      <tr>
                        <td colSpan={8} className="bg-blue-50/40 px-6 pb-2 pt-1 border-b border-blue-100">
                          <table className="w-full">
                            <thead>
                              <tr className="text-[10px] text-slate-400 uppercase border-b border-slate-200">
                                <th className="text-left pb-0.5 w-28 font-semibold tracking-wide">Cuenta</th>
                                <th className="text-left pb-0.5 font-semibold tracking-wide">Descripción</th>
                                <th className="text-right pb-0.5 w-24 font-semibold tracking-wide">Debe</th>
                                <th className="text-right pb-0.5 w-24 font-semibold tracking-wide">Haber</th>
                              </tr>
                            </thead>
                            <tbody>
                              {a.lineas.map(l => (
                                <tr key={l.id} className="border-b border-slate-100 last:border-0">
                                  <td className="py-0.5 font-mono font-bold text-[11px] text-blue-700">
                                    {l.cuenta?.codigo ?? l.cuenta_id.slice(0, 8)}
                                  </td>
                                  <td className="py-0.5 text-[11px] text-slate-600">
                                    {l.cuenta?.nombre}
                                    {l.descripcion && <span className="text-slate-400"> — {l.descripcion}</span>}
                                  </td>
                                  <td className="py-0.5 text-right font-mono text-[11px]">{l.debe > 0 ? fmt(l.debe) : ''}</td>
                                  <td className="py-0.5 text-right font-mono text-[11px]">{l.haber > 0 ? fmt(l.haber) : ''}</td>
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
    </>
  );

  // ─── TAB: Plan de Cuentas ──────────────────────────────────────────────────
  const renderPlan = () => (
    <div className="p-4 space-y-2">
      {[1, 2, 3, 4, 5, 6, 7].map(g => {
        const cuentas = cuentasPorGrupo[g] ?? [];
        if (cuentas.length === 0) return null;
        const expanded = expandedGrupos.has(g);
        return (
          <div key={g} className="bg-white border border-slate-200 overflow-hidden">
            <button
              onClick={() => toggleGrupo(g)}
              className="w-full flex items-center justify-between px-4 py-2 bg-slate-50 hover:bg-slate-100 transition-colors border-b border-slate-200"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded bg-blue-100 text-blue-700 text-[11px] font-bold flex items-center justify-center">
                  {g}
                </span>
                <span className="font-semibold text-slate-700 text-[12px]">{GRUPO_NOMBRE[g]}</span>
                <span className="text-[11px] text-slate-400">({cuentas.length} cuentas)</span>
              </div>
              {expanded ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
            </button>
            {expanded && (
              <table className="w-full">
                <thead className="bg-slate-50/60 border-b border-slate-100">
                  <tr>
                    <th className={`${sageTh} w-20`}>Código</th>
                    <th className={sageTh}>Nombre</th>
                    <th className={`${sageTh} w-12 text-center`}>Nat.</th>
                    <th className={`${sageTh} w-24`}>Tipo</th>
                    <th className={`${sageTh} w-14 text-center`}>PGC</th>
                  </tr>
                </thead>
                <tbody>
                  {cuentas.map((c, idx) => (
                    <tr key={c.id} className={sageRowClass(false, idx % 2 === 1)}>
                      <td className="px-2 py-1 font-mono font-bold text-[12px] text-slate-600">{c.codigo}</td>
                      <td className="px-2 py-1 text-[12px] text-slate-700">{c.nombre}</td>
                      <td className="px-2 py-1 text-center">
                        <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${c.naturaleza === 'D' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}`}>
                          {c.naturaleza}
                        </span>
                      </td>
                      <td className="px-2 py-1 text-[11px] text-slate-500 capitalize">{c.tipo}</td>
                      <td className="px-2 py-1 text-center">
                        {c.es_pgc && <span className="text-[11px] text-green-600 font-medium">PGC</span>}
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
      <div className="p-4 space-y-4">
        {/* Modelo 303 */}
        <div className="bg-white border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
            <div>
              <h3 className="font-bold text-[13px] text-slate-800">Modelo 303 — IVA Trimestral</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Declaración-liquidación periódica del IVA</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={mod303Q}
                onChange={e => setMod303Q(Number(e.target.value))}
                className="border border-slate-300 rounded px-2 py-1 text-[12px] focus:outline-none focus:border-blue-400"
              >
                {qLabels.map((l, i) => <option key={i + 1} value={i + 1}>{l}</option>)}
              </select>
              <select
                value={mod303Year}
                onChange={e => setMod303Year(Number(e.target.value))}
                className="border border-slate-300 rounded px-2 py-1 text-[12px] focus:outline-none focus:border-blue-400"
              >
                {[currentYear - 1, currentYear].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <button
                onClick={loadSumasSaldos}
                className="flex items-center gap-1 text-[12px] text-blue-600 hover:text-blue-800 font-medium border border-blue-200 rounded px-2 py-1 hover:bg-blue-50"
              >
                <RefreshCw size={11} /> Actualizar
              </button>
            </div>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-blue-50 border border-blue-100 rounded p-4">
              <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wide mb-1">IVA repercutido (477)</p>
              <p className="text-2xl font-bold text-blue-800">{fmtEur(mod303Data.ivaRepercutido)}</p>
              <p className="text-[11px] text-blue-500 mt-1">IVA de ventas emitidas</p>
            </div>
            <div className="bg-orange-50 border border-orange-100 rounded p-4">
              <p className="text-[10px] font-bold text-orange-500 uppercase tracking-wide mb-1">IVA soportado (472)</p>
              <p className="text-2xl font-bold text-orange-800">{fmtEur(mod303Data.ivaSoportado)}</p>
              <p className="text-[11px] text-orange-500 mt-1">IVA de compras recibidas</p>
            </div>
            <div className={`border rounded p-4 ${mod303Data.resultado >= 0 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
              <p className={`text-[10px] font-bold uppercase tracking-wide mb-1 ${mod303Data.resultado >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                Resultado
              </p>
              <p className={`text-2xl font-bold ${mod303Data.resultado >= 0 ? 'text-red-800' : 'text-green-800'}`}>
                {fmtEur(mod303Data.resultado)}
              </p>
              <p className={`text-[11px] mt-1 ${mod303Data.resultado >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                {mod303Data.resultado >= 0 ? 'A ingresar a Hacienda' : 'A devolver por Hacienda'}
              </p>
            </div>
          </div>
          <div className="px-4 pb-3 text-[11px] text-slate-400 italic">
            * Saldos acumulados en cuentas PGC con asientos confirmados. Filtrar por fecha del trimestre para declaración oficial.
          </div>
        </div>

        {/* Balance sumas y saldos */}
        <div className="bg-white border border-slate-200 overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
            <h3 className="font-bold text-[13px] text-slate-800">Balance de Sumas y Saldos</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Acumulado de todas las cuentas con movimiento</p>
          </div>
          {sumasSaldos.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-sm">
              No hay asientos confirmados. Confirma asientos para ver el balance.
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className={`${sageTh} w-20`}>Código</th>
                  <th className={sageTh}>Cuenta</th>
                  <th className={`${sageThR} w-28`}>Debe</th>
                  <th className={`${sageThR} w-28`}>Haber</th>
                  <th className={`${sageThR} w-28`}>Saldo</th>
                </tr>
              </thead>
              <tbody>
                {sumasSaldos.filter(s => s.total_debe + s.total_haber > 0).map((s, idx) => (
                  <tr key={s.codigo} className={sageRowClass(false, idx % 2 === 1)}>
                    <td className="px-2 py-1 font-mono font-bold text-[12px] text-slate-600">{s.codigo}</td>
                    <td className="px-2 py-1 text-[12px] text-slate-700">{s.nombre}</td>
                    <td className="px-2 py-1 text-right font-mono text-[12px]">{fmt(s.total_debe)}</td>
                    <td className="px-2 py-1 text-right font-mono text-[12px]">{fmt(s.total_haber)}</td>
                    <td className={`px-2 py-1 text-right font-mono text-[12px] font-bold ${s.saldo > 0 ? 'text-slate-800' : s.saldo < 0 ? 'text-red-600' : 'text-slate-400'}`}>
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
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Module header ────────────────────────────────────────────────── */}
      <div className="shrink-0 bg-gradient-to-r from-slate-700 to-slate-600 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen size={13} className="text-slate-300" />
          <span className="text-white font-semibold text-[13px]">Contabilidad</span>
          {empresa && <span className="text-slate-400 text-[12px]">— {empresa.nombre}</span>}
        </div>
        <span className="text-slate-400 text-[11px]">Plan General Contable</span>
      </div>

      {/* ── Tab strip ────────────────────────────────────────────────────── */}
      <SageTabStrip
        tabs={[
          { id: 'diario',   label: 'Libro Diario',        icon: List },
          { id: 'plan',     label: 'Plan de Cuentas',     icon: BookOpen },
          { id: 'informes', label: 'Informes / Mod. 303', icon: BarChart3 },
        ]}
        active={tab}
        onChange={(id) => setTab(id as typeof tab)}
      />

      {error && (
        <div className="shrink-0 bg-red-50 border-b border-red-200 text-red-700 px-4 py-2 text-[12px] flex items-center gap-2">
          <AlertCircle size={13} /> {error}
        </div>
      )}

      {/* ── Tab content ──────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {tab === 'diario'   && renderDiario()}
        {tab === 'plan'     && renderPlan()}
        {tab === 'informes' && renderInformes()}
      </div>

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
