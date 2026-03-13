import React, { useState, useMemo } from 'react';
import {
  RefreshCcw, Plus, CheckCircle2, PauseCircle, XCircle, Play,
  AlertCircle, Download, Search, TrendingUp, Euro, Users,
  X, Save, Calendar, Building2,
} from 'lucide-react';
import { useRecurrente } from '../hooks/useRecurrente';
import { useEmpresaData } from '../hooks/useEmpresaData';
import { generarSepaPain008, descargarXml, SepaEmpresa, SepaTxn } from '../lib/sepaGenerator';
import {
  ContratoRecurrente, FrecuenciaRecurrente, MetodoCobroContrato,
  SecuenciaSepa, User,
} from '../types';

// ─── Helpers ───────────────────────────────────────────────────────────────────

const fmtEur = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

const FRECUENCIA_LABEL: Record<FrecuenciaRecurrente, string> = {
  mensual: 'Mensual', trimestral: 'Trimestral',
  semestral: 'Semestral', anual: 'Anual',
};
const METODO_LABEL: Record<MetodoCobroContrato, string> = {
  transferencia: 'Transferencia', sepa: 'SEPA / Domiciliación',
  tarjeta: 'Tarjeta', efectivo: 'Efectivo', otro: 'Otro',
};
const ESTADO_COLOR: Record<string, string> = {
  activo:   'bg-green-100 text-green-700',
  pausado:  'bg-amber-100 text-amber-700',
  cancelado:'bg-red-100 text-red-600',
};

// ─── Modal: nuevo contrato ─────────────────────────────────────────────────────

interface ModalProps {
  empresaId: string;
  onSave: (draft: Omit<ContratoRecurrente, 'id'|'created_at'|'updated_at'|'cliente_nombre_completo'|'cliente_email'|'mrr_mensual'|'vencido'>) => Promise<void>;
  onClose: () => void;
}

function NuevoContratoModal({ empresaId, onSave, onClose }: ModalProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [clienteId,       setClienteId]       = useState('');
  const [clienteNombre,   setClienteNombre]   = useState('');
  const [descripcion,     setDescripcion]     = useState('');
  const [importeBase,     setImporteBase]     = useState('');
  const [ivaPct,          setIvaPct]          = useState('21');
  const [frecuencia,      setFrecuencia]      = useState<FrecuenciaRecurrente>('mensual');
  const [serie,           setSerie]           = useState('A');
  const [diaCobro,        setDiaCobro]        = useState('1');
  const [fechaInicio,     setFechaInicio]     = useState(today);
  const [metodoCobro,     setMetodoCobro]     = useState<MetodoCobroContrato>('transferencia');
  const [iban,            setIban]            = useState('');
  const [bic,             setBic]             = useState('');
  const [mandatoId,       setMandatoId]       = useState('');
  const [mandatoFecha,    setMandatoFecha]    = useState(today);
  const [notas,           setNotas]           = useState('');
  const [saving,          setSaving]          = useState(false);
  const [err,             setErr]             = useState<string | null>(null);

  const handleSave = async () => {
    if (!clienteNombre.trim()) { setErr('El nombre del cliente es obligatorio'); return; }
    if (!descripcion.trim())   { setErr('La descripción es obligatoria'); return; }
    if (!importeBase || parseFloat(importeBase) <= 0) { setErr('El importe debe ser mayor que 0'); return; }
    if (metodoCobro === 'sepa' && (!iban || !mandatoId)) {
      setErr('Para SEPA necesitas IBAN y nº de mandato'); return;
    }
    setSaving(true);
    setErr(null);
    await onSave({
      empresa_id: empresaId,
      cliente_id: clienteId || '00000000-0000-0000-0000-000000000000',
      cliente_nombre: clienteNombre,
      descripcion,
      importe_base: parseFloat(importeBase),
      iva_porcentaje: parseFloat(ivaPct),
      frecuencia,
      serie,
      dia_cobro: parseInt(diaCobro),
      fecha_inicio: fechaInicio,
      proxima_facturacion: fechaInicio,
      estado: 'activo',
      metodo_cobro: metodoCobro,
      iban_cliente: iban || undefined,
      bic_cliente: bic || undefined,
      mandato_id: mandatoId || undefined,
      mandato_fecha: mandatoFecha || undefined,
      secuencia_sepa: 'FRST' as SecuenciaSepa,
      notas: notas || undefined,
    });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-slate-800">Nuevo contrato recurrente</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Datos cliente */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">Nombre del cliente *</label>
              <input value={clienteNombre} onChange={e => setClienteNombre(e.target.value)}
                placeholder="Nombre cliente o empresa"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">Descripción del servicio *</label>
              <input value={descripcion} onChange={e => setDescripcion(e.target.value)}
                placeholder="Contrato mantenimiento, suscripción mensual..."
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
          </div>

          {/* Importe + IVA */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Importe base (€) *</label>
              <input type="number" min="0" step="0.01" value={importeBase} onChange={e => setImporteBase(e.target.value)}
                placeholder="0.00"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">IVA (%)</label>
              <select value={ivaPct} onChange={e => setIvaPct(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                <option value="0">0%</option>
                <option value="4">4%</option>
                <option value="10">10%</option>
                <option value="21">21%</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Total con IVA</label>
              <div className="border rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-600 font-semibold">
                {fmtEur((parseFloat(importeBase) || 0) * (1 + (parseFloat(ivaPct) || 0) / 100))}
              </div>
            </div>
          </div>

          {/* Frecuencia + Serie + Día */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Frecuencia</label>
              <select value={frecuencia} onChange={e => setFrecuencia(e.target.value as FrecuenciaRecurrente)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                {Object.entries(FRECUENCIA_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Serie factura</label>
              <select value={serie} onChange={e => setSerie(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                <option value="A">A</option>
                <option value="B">B</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Día de cobro</label>
              <input type="number" min="1" max="28" value={diaCobro} onChange={e => setDiaCobro(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
          </div>

          {/* Fechas + Método cobro */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Primera facturación</label>
              <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Método de cobro</label>
              <select value={metodoCobro} onChange={e => setMetodoCobro(e.target.value as MetodoCobroContrato)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                {Object.entries(METODO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>

          {/* SEPA fields (solo si metodo = sepa) */}
          {metodoCobro === 'sepa' && (
            <div className="bg-blue-50 rounded-xl p-4 space-y-3">
              <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">Datos SEPA / Mandato</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">IBAN cliente *</label>
                  <input value={iban} onChange={e => setIban(e.target.value)} placeholder="ES00 0000 0000 00..."
                    className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">BIC banco cliente</label>
                  <input value={bic} onChange={e => setBic(e.target.value)} placeholder="CAIXESBBXXX"
                    className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Nº mandato *</label>
                  <input value={mandatoId} onChange={e => setMandatoId(e.target.value)} placeholder="MDT-001"
                    className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Fecha firma mandato</label>
                  <input type="date" value={mandatoFecha} onChange={e => setMandatoFecha(e.target.value)}
                    className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
              </div>
            </div>
          )}

          {/* Notas */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Notas internas</label>
            <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>

          {err && (
            <div className="bg-red-50 text-red-700 rounded-lg px-4 py-2 text-sm flex items-center gap-2">
              <AlertCircle size={14} /> {err}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600">Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50">
            <Save size={14} /> {saving ? 'Guardando...' : 'Crear contrato'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main View ─────────────────────────────────────────────────────────────────

interface Props { currentUser: User }

export function FacturacionRecurrenteView({ currentUser }: Props) {
  const { empresas } = useEmpresaData();
  const empresa = empresas[0] ?? null;

  const {
    contratos, mrr, loading, error,
    createContrato, setEstado, facturarContrato, facturarPendientes,
  } = useRecurrente(empresa?.id);

  const [tab,        setTab]        = useState<'contratos' | 'sepa' | 'mrr'>('contratos');
  const [showModal,  setShowModal]  = useState(false);
  const [search,     setSearch]     = useState('');
  const [filterEst,  setFilterEst]  = useState('todos');
  const [sepaSelected, setSepaSelected] = useState<Set<string>>(new Set());
  const [sepaBic,    setSepaBic]    = useState('');
  const [sepaIban,   setSepaIban]   = useState('');
  const [sepaCi,     setSepaCi]     = useState('');
  const [sepaFecha,  setSepaFecha]  = useState(new Date().toISOString().slice(0, 10));
  const [factMsg,    setFactMsg]    = useState<string | null>(null);

  const pendientesCount = contratos.filter(c => c.vencido && c.estado === 'activo').length;

  const filtered = useMemo(() => contratos.filter(c => {
    const matchE = filterEst === 'todos' || c.estado === filterEst;
    const matchS = !search || c.descripcion.toLowerCase().includes(search.toLowerCase()) ||
                   (c.cliente_nombre || c.cliente_nombre_completo || '').toLowerCase().includes(search.toLowerCase());
    return matchE && matchS;
  }), [contratos, filterEst, search]);

  const sepaContratos = contratos.filter(c =>
    c.estado === 'activo' && c.metodo_cobro === 'sepa' && c.iban_cliente && c.mandato_id
  );

  // ─── Tab: Contratos ──────────────────────────────────────────────────────────
  const renderContratos = () => (
    <div className="space-y-4">
      {pendientesCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-800 text-sm font-medium">
            <AlertCircle size={16} />
            {pendientesCount} contrato{pendientesCount > 1 ? 's' : ''} pendiente{pendientesCount > 1 ? 's' : ''} de facturar
          </div>
          <button
            onClick={async () => {
              const n = await facturarPendientes();
              setFactMsg(`✓ ${n} factura${n !== 1 ? 's' : ''} generada${n !== 1 ? 's' : ''}`);
              setTimeout(() => setFactMsg(null), 4000);
            }}
            className="px-3 py-1.5 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-700"
          >
            Facturar todos
          </button>
        </div>
      )}

      {factMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-2 text-sm flex items-center gap-2">
          <CheckCircle2 size={14} /> {factMsg}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar contratos..."
            className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
        </div>
        <select value={filterEst} onChange={e => setFilterEst(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm">
          <option value="todos">Todos los estados</option>
          <option value="activo">Activos</option>
          <option value="pausado">Pausados</option>
          <option value="cancelado">Cancelados</option>
        </select>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700">
          <Plus size={14} /> Nuevo contrato
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Cargando contratos...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <RefreshCcw size={36} className="mx-auto mb-3 opacity-30" />
          <p>No hay contratos recurrentes</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Cliente</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Servicio</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase w-24">Freq.</th>
                <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase w-24">Importe</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase w-28">Próx. factura</th>
                <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase w-24">Estado</th>
                <th className="px-4 py-3 w-28"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(c => {
                const total = c.importe_base * (1 + c.iva_porcentaje / 100);
                return (
                  <tr key={c.id} className={`hover:bg-slate-50 ${c.vencido ? 'bg-amber-50/30' : ''}`}>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {c.cliente_nombre || c.cliente_nombre_completo || '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{c.descripcion}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                        {FRECUENCIA_LABEL[c.frecuencia]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">{fmtEur(total)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${c.vencido ? 'text-amber-700 font-bold' : 'text-slate-600'}`}>
                        {c.proxima_facturacion}
                        {c.vencido && ' ⚠'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ESTADO_COLOR[c.estado]}`}>
                        {c.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {c.estado === 'activo' && (
                          <>
                            <button title="Facturar ahora"
                              onClick={async () => {
                                const fid = await facturarContrato(c.id);
                                if (fid) setFactMsg('✓ Factura generada');
                                setTimeout(() => setFactMsg(null), 3000);
                              }}
                              className="p-1 rounded text-blue-500 hover:bg-blue-50 hover:text-blue-700">
                              <CheckCircle2 size={15} />
                            </button>
                            <button title="Pausar" onClick={() => setEstado(c.id, 'pausado')}
                              className="p-1 rounded text-amber-500 hover:bg-amber-50 hover:text-amber-700">
                              <PauseCircle size={15} />
                            </button>
                          </>
                        )}
                        {c.estado === 'pausado' && (
                          <button title="Reactivar" onClick={() => setEstado(c.id, 'activo')}
                            className="p-1 rounded text-green-500 hover:bg-green-50">
                            <Play size={15} />
                          </button>
                        )}
                        {c.estado !== 'cancelado' && (
                          <button title="Cancelar" onClick={() => setEstado(c.id, 'cancelado')}
                            className="p-1 rounded text-red-400 hover:bg-red-50 hover:text-red-600">
                            <XCircle size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // ─── Tab: SEPA ───────────────────────────────────────────────────────────────
  const renderSepa = () => {
    const toggleSepa = (id: string) => {
      setSepaSelected(prev => {
        const s = new Set(prev);
        s.has(id) ? s.delete(id) : s.add(id);
        return s;
      });
    };

    const handleGenerarSepa = () => {
      if (!sepaIban || !sepaBic || !sepaCi) {
        alert('Completa los datos del acreedor (IBAN, BIC y CI)');
        return;
      }
      const seleccionados = sepaContratos.filter(c => sepaSelected.has(c.id));
      if (seleccionados.length === 0) {
        alert('Selecciona al menos un contrato');
        return;
      }
      const emisora: SepaEmpresa = {
        nombre: empresa?.nombre || 'Digital Market',
        iban: sepaIban,
        bic: sepaBic,
        creditorId: sepaCi,
      };
      const txns: SepaTxn[] = seleccionados.map(c => ({
        endToEndId:    c.id.slice(0, 20),
        importe:       Math.round(c.importe_base * (1 + c.iva_porcentaje / 100) * 100) / 100,
        mandatoId:     c.mandato_id!,
        mandatoFecha:  c.mandato_fecha || new Date().toISOString().slice(0, 10),
        secuencia:     c.secuencia_sepa,
        deudorNombre:  c.cliente_nombre || c.cliente_nombre_completo || '',
        deudorIban:    c.iban_cliente!,
        deudorBic:     c.bic_cliente || 'NOTPROVIDED',
        concepto:      c.descripcion,
      }));
      try {
        const xml = generarSepaPain008(emisora, txns, sepaFecha);
        descargarXml(xml, `SEPA_${sepaFecha}_${Date.now()}.xml`);
      } catch (e) {
        alert(e instanceof Error ? e.message : 'Error generando SEPA');
      }
    };

    return (
      <div className="space-y-6">
        {/* Datos acreedor */}
        <div className="bg-white rounded-xl border p-5 space-y-4">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Building2 size={16} /> Datos del acreedor (tu empresa)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <label className="block text-xs font-medium text-slate-500 mb-1">IBAN acreedor *</label>
              <input value={sepaIban} onChange={e => setSepaIban(e.target.value)} placeholder="ES00 0000..."
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">BIC banco *</label>
              <input value={sepaBic} onChange={e => setSepaBic(e.target.value)} placeholder="CAIXESBBXXX"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Creditor ID (CI) *</label>
              <input value={sepaCi} onChange={e => setSepaCi(e.target.value)} placeholder="ES00ZZZ..."
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Fecha de cobro</label>
              <input type="date" value={sepaFecha} onChange={e => setSepaFecha(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
          </div>
        </div>

        {/* Lista contratos SEPA */}
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="px-5 py-3 bg-slate-50 border-b flex items-center justify-between">
            <h3 className="font-semibold text-slate-700 text-sm">Contratos con domiciliación SEPA</h3>
            <button onClick={handleGenerarSepa}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700">
              <Download size={14} /> Generar XML PAIN.008
            </button>
          </div>

          {sepaContratos.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-sm">
              No hay contratos con SEPA configurado. Crea contratos con método de cobro "SEPA / Domiciliación".
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr className="text-xs text-slate-500">
                  <th className="px-4 py-2 w-8">
                    <input type="checkbox"
                      checked={sepaSelected.size === sepaContratos.length && sepaContratos.length > 0}
                      onChange={e => setSepaSelected(e.target.checked ? new Set(sepaContratos.map(c => c.id)) : new Set())} />
                  </th>
                  <th className="text-left px-4 py-2">Cliente</th>
                  <th className="text-left px-4 py-2">Concepto</th>
                  <th className="text-left px-4 py-2">IBAN</th>
                  <th className="text-left px-4 py-2 w-20">Seq.</th>
                  <th className="text-right px-4 py-2 w-24">Importe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sepaContratos.map(c => {
                  const total = c.importe_base * (1 + c.iva_porcentaje / 100);
                  return (
                    <tr key={c.id} className={sepaSelected.has(c.id) ? 'bg-blue-50' : 'hover:bg-slate-50'}>
                      <td className="px-4 py-2 text-center">
                        <input type="checkbox" checked={sepaSelected.has(c.id)} onChange={() => toggleSepa(c.id)} />
                      </td>
                      <td className="px-4 py-2 font-medium text-slate-800">
                        {c.cliente_nombre || c.cliente_nombre_completo}
                      </td>
                      <td className="px-4 py-2 text-slate-600">{c.descripcion}</td>
                      <td className="px-4 py-2 font-mono text-xs text-slate-500">
                        {c.iban_cliente?.slice(0, 12)}...
                      </td>
                      <td className="px-4 py-2">
                        <span className="text-xs font-bold text-blue-600">{c.secuencia_sepa}</span>
                      </td>
                      <td className="px-4 py-2 text-right font-semibold">{fmtEur(total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  };

  // ─── Tab: MRR ────────────────────────────────────────────────────────────────
  const renderMrr = () => {
    const arr = mrr?.arr ?? 0;
    const m   = mrr?.mrr ?? 0;

    // Distribución por frecuencia
    const byFreq: Record<string, { count: number; mrr: number }> = {};
    for (const c of contratos.filter(c => c.estado === 'activo')) {
      if (!byFreq[c.frecuencia]) byFreq[c.frecuencia] = { count: 0, mrr: 0 };
      byFreq[c.frecuencia].count++;
      byFreq[c.frecuencia].mrr += c.mrr_mensual ?? 0;
    }

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-blue-600 rounded-xl p-5 text-white">
            <p className="text-xs font-bold uppercase tracking-wide opacity-80 mb-1">MRR</p>
            <p className="text-3xl font-bold">{fmtEur(m)}</p>
            <p className="text-xs opacity-70 mt-1">Monthly Recurring Revenue</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-5 text-white">
            <p className="text-xs font-bold uppercase tracking-wide opacity-80 mb-1">ARR</p>
            <p className="text-3xl font-bold">{fmtEur(arr)}</p>
            <p className="text-xs opacity-70 mt-1">Annual Recurring Revenue</p>
          </div>
          <div className="bg-green-600 rounded-xl p-5 text-white">
            <p className="text-xs font-bold uppercase tracking-wide opacity-80 mb-1">Contratos activos</p>
            <p className="text-3xl font-bold">{mrr?.contratos_activos ?? 0}</p>
            <p className="text-xs opacity-70 mt-1">{mrr?.contratos_pausados ?? 0} pausados</p>
          </div>
        </div>

        {/* Desglose por frecuencia */}
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="px-5 py-3 bg-slate-50 border-b">
            <h3 className="font-semibold text-slate-700 text-sm">Desglose por frecuencia</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="border-b">
              <tr className="text-xs text-slate-500">
                <th className="text-left px-5 py-2">Frecuencia</th>
                <th className="text-right px-5 py-2">Contratos</th>
                <th className="text-right px-5 py-2">MRR equivalente</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {Object.entries(byFreq).map(([freq, data]) => (
                <tr key={freq} className="hover:bg-slate-50">
                  <td className="px-5 py-2">
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                      {FRECUENCIA_LABEL[freq as FrecuenciaRecurrente]}
                    </span>
                  </td>
                  <td className="px-5 py-2 text-right font-medium">{data.count}</td>
                  <td className="px-5 py-2 text-right font-semibold text-blue-700">{fmtEur(data.mrr)}</td>
                </tr>
              ))}
              {Object.keys(byFreq).length === 0 && (
                <tr><td colSpan={3} className="px-5 py-8 text-center text-slate-400">No hay contratos activos</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Facturación Recurrente</h1>
          <p className="text-sm text-slate-500 mt-0.5">Contratos periódicos + domiciliación SEPA</p>
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
          { id: 'contratos', label: 'Contratos',     icon: RefreshCcw },
          { id: 'sepa',      label: 'SEPA / Remesas', icon: Download },
          { id: 'mrr',       label: 'MRR & ARR',      icon: TrendingUp },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
              tab === t.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}>
            <t.icon size={15} /> {t.label}
            {t.id === 'contratos' && pendientesCount > 0 && (
              <span className="text-[10px] font-bold bg-amber-500 text-white rounded-full px-1.5 py-0.5">
                {pendientesCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'contratos' && renderContratos()}
      {tab === 'sepa'      && renderSepa()}
      {tab === 'mrr'       && renderMrr()}

      {showModal && empresa && (
        <NuevoContratoModal
          empresaId={empresa.id}
          onSave={async (d) => { await createContrato(d); }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
