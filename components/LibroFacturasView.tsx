import React, { useState, useEffect } from 'react';
import {
  BookOpen, Download, Search, Filter, CheckCircle2,
  AlertCircle, Clock, QrCode, Plus, Trash2, X, Printer,
  ShieldCheck, Eye,
} from 'lucide-react';
import { useVerifactu } from '../hooks/useVerifactu';
import { useVentas } from '../hooks/useVentas';
import { useEmpresaData } from '../hooks/useEmpresaData';
import {
  LibroFacturaEmitida, Cobro, MetodoCobro, Factura, User, Empresa,
} from '../types';
import { FacturaPDFView } from './FacturaPDFView';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

const METODO_LABEL: Record<MetodoCobro, string> = {
  transferencia: 'Transferencia',
  tarjeta: 'Tarjeta',
  cheque: 'Cheque',
  efectivo: 'Efectivo',
  sepa: 'SEPA/Domiciliación',
  otro: 'Otro',
};

const ESTADO_COLOR: Record<string, string> = {
  borrador: 'bg-slate-100 text-slate-600',
  emitida: 'bg-blue-100 text-blue-700',
  enviada: 'bg-indigo-100 text-indigo-700',
  cobrada: 'bg-green-100 text-green-700',
  cancelada: 'bg-red-100 text-red-600',
};

const VERIFACTU_COLOR: Record<string, string> = {
  pendiente: 'bg-amber-100 text-amber-700',
  enviado: 'bg-blue-100 text-blue-700',
  aceptado: 'bg-green-100 text-green-700',
  rechazado: 'bg-red-100 text-red-600',
  anulado: 'bg-slate-100 text-slate-500',
};

// ─── Modal de cobro ───────────────────────────────────────────────────────────

interface CobrosModalProps {
  factura: Factura;
  currentUser: User;
  cobros: Cobro[];
  onAddCobro: (data: { fecha: string; importe: number; metodo: MetodoCobro; referencia?: string }) => Promise<void>;
  onDeleteCobro: (id: string) => Promise<void>;
  onClose: () => void;
}

const CobrosModal: React.FC<CobrosModalProps> = ({
  factura, cobros, onAddCobro, onDeleteCobro, onClose,
}) => {
  const [form, setForm] = useState({
    fecha: new Date().toISOString().slice(0, 10),
    importe: factura.total - cobros.reduce((s, c) => s + c.importe, 0),
    metodo: 'transferencia' as MetodoCobro,
    referencia: '',
  });
  const [saving, setSaving] = useState(false);
  const totalCobrado = cobros.reduce((s, c) => s + c.importe, 0);
  const pendiente = factura.total - totalCobrado;

  const handleAdd = async () => {
    if (form.importe <= 0) { alert('Importe debe ser mayor que 0'); return; }
    setSaving(true);
    try { await onAddCobro(form); setForm(f => ({ ...f, importe: Math.max(0, pendiente - form.importe), referencia: '' })); }
    catch (e) { alert(e instanceof Error ? e.message : 'Error'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">
            Cobros — {factura.referencia}
          </h2>
          <button onClick={onClose}><X size={16} className="text-slate-400" /></button>
        </div>

        <div className="px-4 py-3 space-y-4">
          {/* Resumen */}
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="bg-slate-50 rounded-lg p-3 text-center">
              <div className="text-xs text-slate-500 mb-1">Total factura</div>
              <div className="font-bold text-slate-900">{fmt(factura.total)}</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <div className="text-xs text-green-600 mb-1">Cobrado</div>
              <div className="font-bold text-green-700">{fmt(totalCobrado)}</div>
            </div>
            <div className={`${pendiente > 0 ? 'bg-amber-50' : 'bg-green-50'} rounded-lg p-3 text-center`}>
              <div className={`text-xs mb-1 ${pendiente > 0 ? 'text-amber-600' : 'text-green-600'}`}>Pendiente</div>
              <div className={`font-bold ${pendiente > 0 ? 'text-amber-700' : 'text-green-700'}`}>{fmt(pendiente)}</div>
            </div>
          </div>

          {/* Lista cobros existentes */}
          {cobros.length > 0 && (
            <div className="border border-slate-200 rounded-xl overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs text-slate-500 uppercase">
                    <th className="px-3 py-2 text-left">Fecha</th>
                    <th className="px-3 py-2 text-left">Método</th>
                    <th className="px-3 py-2 text-right">Importe</th>
                    <th className="px-3 py-2 w-8" />
                  </tr>
                </thead>
                <tbody>
                  {cobros.map(c => (
                    <tr key={c.id} className="border-t border-slate-100">
                      <td className="px-3 py-2">{c.fecha}</td>
                      <td className="px-3 py-2 text-slate-600">{METODO_LABEL[c.metodo]}</td>
                      <td className="px-3 py-2 text-right font-semibold text-green-700">{fmt(c.importe)}</td>
                      <td className="px-3 py-2">
                        <button onClick={() => onDeleteCobro(c.id)}
                          className="text-red-400 hover:text-red-600">
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Añadir cobro */}
          {pendiente > 0 && (
            <div className="border border-blue-200 rounded-xl p-3 bg-blue-50 space-y-3">
              <div className="text-sm font-medium text-blue-800">Registrar nuevo cobro</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Fecha</label>
                  <input type="date"
                    className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-blue-400"
                    value={form.fecha}
                    onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Importe</label>
                  <input type="number" min="0" step="0.01"
                    className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-blue-400"
                    value={form.importe}
                    onChange={e => setForm(f => ({ ...f, importe: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Método</label>
                  <select
                    className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-blue-400"
                    value={form.metodo}
                    onChange={e => setForm(f => ({ ...f, metodo: e.target.value as MetodoCobro }))}>
                    {(Object.keys(METODO_LABEL) as MetodoCobro[]).map(m => (
                      <option key={m} value={m}>{METODO_LABEL[m]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Referencia</label>
                  <input
                    className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-blue-400"
                    value={form.referencia}
                    onChange={e => setForm(f => ({ ...f, referencia: e.target.value }))}
                    placeholder="Nº operación…" />
                </div>
              </div>
              <button onClick={handleAdd} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
                <Plus size={14} /> {saving ? 'Registrando…' : 'Registrar cobro'}
              </button>
            </div>
          )}

          {pendiente <= 0 && (
            <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-xl px-4 py-3 text-sm">
              <CheckCircle2 size={16} />
              Factura completamente cobrada
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-slate-100 flex justify-end">
          <button onClick={onClose}
            className="px-4 py-2 border border-slate-200 text-sm rounded-lg hover:bg-slate-50">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Vista principal ──────────────────────────────────────────────────────────

interface LibroFacturasViewProps {
  currentUser: User;
}

export const LibroFacturasView: React.FC<LibroFacturasViewProps> = ({ currentUser }) => {
  const {
    libro, cobros, registros, loading, error, reload,
    registrarFactura, getCobrosByFactura, createCobro, deleteCobro,
    calcularResumenIva,
  } = useVerifactu();
  const ventas = useVentas();
  const { empresas } = useEmpresaData();

  const [tab, setTab] = useState<'libro' | 'verifactu' | 'iva'>('libro');
  const [search, setSearch] = useState('');
  const [filtroEmpresa, setFiltroEmpresa] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  // Modals
  const [cobrosFactura, setCobrosFactura] = useState<Factura | null>(null);
  const [cobrosData, setCobrosData] = useState<Cobro[]>([]);
  const [pdfFacturaId, setPdfFacturaId] = useState<string | null>(null);

  // Resumen IVA
  const [trimestreIva, setTrimestreIva] = useState({ t: 1, anio: new Date().getFullYear() });

  const openCobros = async (entrada: LibroFacturaEmitida) => {
    // Buscar la factura completa
    const factura = ventas.facturas.find(f => f.id === entrada.id);
    if (!factura) return;
    const cobrosList = await getCobrosByFactura(entrada.id);
    setCobrosData(cobrosList);
    setCobrosFactura(factura);
  };

  const handleAddCobro = async (data: { fecha: string; importe: number; metodo: MetodoCobro; referencia?: string }) => {
    if (!cobrosFactura) return;
    const emp = empresas.find(e => e.id === cobrosFactura.empresaId);
    const cobro = await createCobro(cobrosFactura.id, cobrosFactura.empresaId, data, currentUser.id);
    setCobrosData(prev => [...prev, cobro]);
    const totalCobrado = [...cobrosData, cobro].reduce((s, c) => s + c.importe, 0);
    if (totalCobrado >= cobrosFactura.total) {
      // Marcar como cobrada
      await import('../hooks/useVentas').then(m => {
        // No tenemos acceso directo al marcarCobrada aquí — haremos reload
      });
      reload();
    }
  };

  const handleDeleteCobro = async (id: string) => {
    await deleteCobro(id);
    setCobrosData(prev => prev.filter(c => c.id !== id));
  };

  const handleRegistrarVerifactu = async (facturaId: string) => {
    try {
      await registrarFactura(facturaId);
      alert('Factura registrada en VeriFactu correctamente.');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al registrar');
    }
  };

  // Filtros
  const q = search.toLowerCase();
  const filteredLibro = libro.filter(f => {
    if (filtroEstado && f.estado !== filtroEstado) return false;
    if (desde && f.fecha < desde) return false;
    if (hasta && f.fecha > hasta) return false;
    if (q && !f.referencia.toLowerCase().includes(q) &&
        !(f.clienteNombre || '').toLowerCase().includes(q)) return false;
    return true;
  });

  const resumenIva = calcularResumenIva(libro, { trimestre: trimestreIva.t, anio: trimestreIva.anio });
  const totalBaseIva = resumenIva.reduce((s, r) => s + r.baseImponible, 0);
  const totalCuotaIva = resumenIva.reduce((s, r) => s + r.cuotaIva, 0);

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Cargando libro de facturas…</div>
  );

  if (error) return (
    <div className="p-4">
      <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
        <AlertCircle size={18} className="text-red-500 shrink-0" />
        <div>
          <p className="text-sm font-medium text-red-800">Error</p>
          <p className="text-xs text-red-600">{error}</p>
          <p className="text-xs text-red-500 mt-1">Ejecuta <code className="bg-red-100 px-1 rounded">paso4_verifactu.sql</code></p>
        </div>
      </div>
    </div>
  );

  // Si se está viendo el PDF
  if (pdfFacturaId) {
    return <FacturaPDFView facturaId={pdfFacturaId} onClose={() => setPdfFacturaId(null)} />;
  }

  return (
    <div className="p-2 sm:p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-slate-900">Libro de Facturas</h1>
          <p className="text-xs text-slate-500 mt-0.5">Registro legal · VeriFactu AEAT · Cobros</p>
        </div>
        <button onClick={reload} className="text-xs text-slate-400 hover:text-slate-600 underline">Actualizar</button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200">
        {([
          { id: 'libro', label: 'Libro emitidas', icon: <BookOpen size={13} /> },
          { id: 'verifactu', label: 'VeriFactu', icon: <ShieldCheck size={13} /> },
          { id: 'iva', label: 'Resumen IVA', icon: <Filter size={13} /> },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
              tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── LIBRO DE FACTURAS ─────────────────────────────── */}
      {tab === 'libro' && (
        <>
          {/* Filtros */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-2 text-slate-400" />
              <input
                className="pl-7 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-400 w-44"
                placeholder="Buscar…"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select
              className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-blue-400"
              value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
              <option value="">Todos los estados</option>
              {Object.keys(ESTADO_COLOR).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input type="date" className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-blue-400"
              value={desde} onChange={e => setDesde(e.target.value)} placeholder="Desde" />
            <input type="date" className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-blue-400"
              value={hasta} onChange={e => setHasta(e.target.value)} placeholder="Hasta" />
            <button
              onClick={() => {
                const rows = filteredLibro.map(f =>
                  [f.referencia, f.fecha, f.clienteNombre || '', f.baseImponible, f.ivaPorcentaje, f.iva, f.total, f.estado, f.huellaVerifactu || ''].join(';')
                );
                const csv = ['Referencia;Fecha;Cliente;Base;IVA%;Cuota;Total;Estado;Hash', ...rows].join('\n');
                const a = document.createElement('a');
                a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
                a.download = `libro_facturas_${new Date().toISOString().slice(0, 10)}.csv`;
                a.click();
              }}
              className="flex items-center gap-1 text-xs text-slate-600 border border-slate-200 rounded-lg px-2 py-1.5 hover:bg-slate-50">
              <Download size={13} /> CSV
            </button>
          </div>

          {/* KPIs rápidos */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: 'Total emitido', val: fmt(filteredLibro.reduce((s, f) => s + f.total, 0)), color: 'text-slate-900' },
              { label: 'Base imponible', val: fmt(filteredLibro.reduce((s, f) => s + f.baseImponible, 0)), color: 'text-slate-700' },
              { label: 'IVA total', val: fmt(filteredLibro.reduce((s, f) => s + f.iva, 0)), color: 'text-blue-700' },
              { label: 'Pendientes cobro', val: filteredLibro.filter(f => f.estado !== 'cobrada' && f.estado !== 'cancelada').length.toString(), color: 'text-amber-600' },
            ].map(k => (
              <div key={k.label} className="bg-white border border-slate-200 rounded-xl p-3">
                <div className="text-xs text-slate-500">{k.label}</div>
                <div className={`text-base font-bold ${k.color} mt-0.5`}>{k.val}</div>
              </div>
            ))}
          </div>

          {/* Tabla */}
          <div className="border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase tracking-wide">
                  <th className="px-3 py-2 text-left">Ref</th>
                  <th className="px-3 py-2 text-left">Fecha</th>
                  <th className="px-3 py-2 text-left">Cliente</th>
                  <th className="px-3 py-2 text-right">Base</th>
                  <th className="px-3 py-2 text-right">IVA</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2 text-left">Estado</th>
                  <th className="px-3 py-2 text-left">VeriFactu</th>
                  <th className="px-3 py-2 w-24" />
                </tr>
              </thead>
              <tbody>
                {filteredLibro.map(f => (
                  <tr key={f.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2 font-medium text-blue-700 whitespace-nowrap">{f.referencia}</td>
                    <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{f.fecha}</td>
                    <td className="px-3 py-2 text-slate-700 max-w-[150px] truncate">{f.clienteNombre || '—'}</td>
                    <td className="px-3 py-2 text-right">{fmt(f.baseImponible)}</td>
                    <td className="px-3 py-2 text-right text-slate-500">{fmt(f.iva)}</td>
                    <td className="px-3 py-2 text-right font-semibold">{fmt(f.total)}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] font-medium ${ESTADO_COLOR[f.estado] || 'bg-slate-100 text-slate-600'}`}>
                        {f.estado}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {f.huellaVerifactu ? (
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${VERIFACTU_COLOR[f.estadoVerifactu || 'pendiente']}`}>
                          <ShieldCheck size={9} /> {f.estadoVerifactu || 'ok'}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleRegistrarVerifactu(f.id)}
                          className="text-[10px] text-amber-600 hover:text-amber-800 underline whitespace-nowrap">
                          Registrar
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => openCobros(f)}
                          title="Cobros"
                          className="text-slate-400 hover:text-green-600">
                          <CheckCircle2 size={13} />
                        </button>
                        <button onClick={() => setPdfFacturaId(f.id)}
                          title="Ver PDF"
                          className="text-slate-400 hover:text-blue-600">
                          <Printer size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredLibro.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-10 text-center text-slate-400 italic">Sin facturas.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── VERIFACTU ─────────────────────────────────────── */}
      {tab === 'verifactu' && (
        <div className="space-y-3">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm">
            <div className="flex items-start gap-2">
              <ShieldCheck size={18} className="text-blue-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-blue-800">VeriFactu — Verificación de facturas AEAT</p>
                <p className="text-blue-600 text-xs mt-1">
                  Cada factura emitida genera un hash SHA-256 encadenado. El QR permite verificar la autenticidad en la sede de la AEAT.
                  Las facturas pendientes deben ser registradas antes de enviarse al cliente.
                </p>
              </div>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase">
                  <th className="px-3 py-2 text-left">Nº Reg.</th>
                  <th className="px-3 py-2 text-left">Factura</th>
                  <th className="px-3 py-2 text-left">Fecha</th>
                  <th className="px-3 py-2 text-left">NIF Emisor</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2 text-left">Estado</th>
                  <th className="px-3 py-2 text-left">Hash</th>
                  <th className="px-3 py-2 w-8" />
                </tr>
              </thead>
              <tbody>
                {registros.map(r => (
                  <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2 font-mono font-semibold">{r.numRegistro}</td>
                    <td className="px-3 py-2 text-blue-700 font-medium">{r.numSerie}</td>
                    <td className="px-3 py-2 text-slate-600">{r.fechaFactura}</td>
                    <td className="px-3 py-2 font-mono text-slate-600">{r.nifEmisor}</td>
                    <td className="px-3 py-2 text-right font-semibold">{fmt(r.importeTotal)}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] font-medium ${VERIFACTU_COLOR[r.estadoEnvio]}`}>
                        {r.estadoEnvio}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-[9px] text-slate-400 max-w-[120px] truncate">
                      {r.hashActual.slice(0, 16)}…
                    </td>
                    <td className="px-3 py-2">
                      {r.qrUrl && (
                        <button onClick={() => window.open(r.qrUrl, '_blank')}
                          className="text-slate-400 hover:text-blue-600">
                          <QrCode size={13} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {registros.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400 italic">
                    Sin registros VeriFactu. Registra una factura desde el libro.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── RESUMEN IVA / MOD. 303 ────────────────────────── */}
      {tab === 'iva' && (
        <div className="space-y-4">
          {/* Selector de trimestre */}
          <div className="flex items-center gap-3">
            <select
              className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-blue-400"
              value={trimestreIva.t}
              onChange={e => setTrimestreIva(f => ({ ...f, t: Number(e.target.value) }))}>
              <option value={1}>1T (Ene-Mar)</option>
              <option value={2}>2T (Abr-Jun)</option>
              <option value={3}>3T (Jul-Sep)</option>
              <option value={4}>4T (Oct-Dic)</option>
            </select>
            <input type="number" min="2020" max="2099"
              className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-blue-400 w-24"
              value={trimestreIva.anio}
              onChange={e => setTrimestreIva(f => ({ ...f, anio: Number(e.target.value) }))} />
          </div>

          {/* Tabla IVA repercutido */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">IVA repercutido (Facturas emitidas)</h3>
            <div className="border border-slate-200 rounded-xl overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs text-slate-500 uppercase">
                    <th className="px-4 py-2 text-left">Tipo IVA</th>
                    <th className="px-4 py-2 text-right">Facturas</th>
                    <th className="px-4 py-2 text-right">Base imponible</th>
                    <th className="px-4 py-2 text-right">Cuota IVA</th>
                  </tr>
                </thead>
                <tbody>
                  {resumenIva.map(r => (
                    <tr key={r.ivaPorcentaje} className="border-t border-slate-100">
                      <td className="px-4 py-2 font-medium">{r.ivaPorcentaje}%</td>
                      <td className="px-4 py-2 text-right text-slate-600">{r.numFacturas}</td>
                      <td className="px-4 py-2 text-right font-semibold">{fmt(r.baseImponible)}</td>
                      <td className="px-4 py-2 text-right font-semibold text-blue-700">{fmt(r.cuotaIva)}</td>
                    </tr>
                  ))}
                  {resumenIva.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400 italic">Sin facturas en este período.</td></tr>
                  )}
                </tbody>
                {resumenIva.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-50 border-t-2 border-slate-300 font-bold">
                      <td className="px-4 py-2">TOTAL</td>
                      <td className="px-4 py-2 text-right text-slate-600">{resumenIva.reduce((s, r) => s + r.numFacturas, 0)}</td>
                      <td className="px-4 py-2 text-right">{fmt(totalBaseIva)}</td>
                      <td className="px-4 py-2 text-right text-blue-700">{fmt(totalCuotaIva)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Nota Mod. 303 */}
          {resumenIva.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm">
              <div className="font-medium text-amber-800 mb-2">Modelo 303 — Liquidación de IVA</div>
              <div className="space-y-1 text-amber-700">
                <div className="flex justify-between">
                  <span>Base imponible total (casilla 01/03/05…):</span>
                  <span className="font-semibold">{fmt(totalBaseIva)}</span>
                </div>
                <div className="flex justify-between">
                  <span>IVA devengado (casilla 02/04/06…):</span>
                  <span className="font-semibold">{fmt(totalCuotaIva)}</span>
                </div>
              </div>
              <p className="text-xs text-amber-600 mt-2">
                Nota: Para el Mod. 303 completo también se debe incluir el IVA soportado de compras.
                Este resumen cubre solo las facturas emitidas.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modal cobros */}
      {cobrosFactura && (
        <CobrosModal
          factura={cobrosFactura}
          currentUser={currentUser}
          cobros={cobrosData}
          onAddCobro={handleAddCobro}
          onDeleteCobro={handleDeleteCobro}
          onClose={() => setCobrosFactura(null)}
        />
      )}
    </div>
  );
};
