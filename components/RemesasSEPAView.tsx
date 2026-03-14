import React, { useState, useEffect } from 'react';
import {
  Building2, Plus, Download, RefreshCw, CheckCircle,
  AlertTriangle, Clock, FileText, Trash2, ChevronDown,
  ChevronRight, CreditCard, Users, X, RotateCcw
} from 'lucide-react';
import { useEmpresa } from '../hooks/useEmpresa';
import { useRemesasSEPA } from '../hooks/useRemesasSEPA';
import { RemesaSEPA, RemesaLinea, MandatoSEPA } from '../types';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

const fmtDate = (s: string) =>
  s ? new Date(s).toLocaleDateString('es-ES') : '—';

// ── Badges ───────────────────────────────────────────────────────────────────

const ESTADO_REMESA: Record<string, { label: string; cls: string }> = {
  borrador:  { label: 'Borrador',  cls: 'bg-slate-100 text-slate-600' },
  enviada:   { label: 'Enviada',   cls: 'bg-blue-100 text-blue-700' },
  aceptada:  { label: 'Aceptada',  cls: 'bg-green-100 text-green-700' },
  parcial:   { label: 'Parcial',   cls: 'bg-amber-100 text-amber-700' },
  rechazada: { label: 'Rechazada', cls: 'bg-red-100 text-red-700' },
};

const ESTADO_LINEA: Record<string, { label: string; cls: string }> = {
  pendiente: { label: 'Pendiente', cls: 'bg-amber-100 text-amber-700' },
  aceptada:  { label: 'Aceptada',  cls: 'bg-green-100 text-green-700' },
  devuelta:  { label: 'Devuelta',  cls: 'bg-red-100 text-red-700' },
  cancelada: { label: 'Cancelada', cls: 'bg-slate-100 text-slate-500' },
};

function Badge({ estado, map }: { estado: string; map: Record<string, { label: string; cls: string }> }) {
  const s = map[estado] ?? { label: estado, cls: 'bg-slate-100 text-slate-600' };
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>;
}

// ── Modal Nueva Remesa ────────────────────────────────────────────────────────

const NuevaRemesaModal: React.FC<{
  onClose: () => void;
  onCreate: (nombre: string, fechaCobro: string, notas: string) => Promise<void>;
}> = ({ onClose, onCreate }) => {
  const [nombre, setNombre] = useState(`Remesa ${new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`);
  const [fechaCobro, setFechaCobro] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 5);
    return d.toISOString().split('T')[0];
  });
  const [notas, setNotas] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try { await onCreate(nombre, fechaCobro, notas); onClose(); }
    catch (err: any) { alert(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">Nueva Remesa SEPA</h2>
          <button onClick={onClose}><X size={18} className="text-slate-400 hover:text-slate-600" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Nombre / descripción</label>
            <input className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={nombre} onChange={e => setNombre(e.target.value)} required />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Fecha de cobro</label>
            <input type="date" className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={fechaCobro} onChange={e => setFechaCobro(e.target.value)} required />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Notas</label>
            <textarea className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none" rows={2}
              value={notas} onChange={e => setNotas(e.target.value)} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Creando…' : 'Crear remesa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Modal Nuevo Mandato ───────────────────────────────────────────────────────

const NuevoMandatoModal: React.FC<{
  onClose: () => void;
  onCreate: (m: any) => Promise<void>;
}> = ({ onClose, onCreate }) => {
  const [form, setForm] = useState({
    clienteNombre: '', referencia: '', tipo: 'CORE' as 'CORE' | 'B2B',
    ibanDeudor: '', bicDeudor: '', secuencia: 'RCUR' as any,
    fechaFirma: new Date().toISOString().split('T')[0], notas: '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try { await onCreate({ ...form, empresaId: '', estado: 'activo' }); onClose(); }
    catch (err: any) { alert(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">Nuevo Mandato SEPA</h2>
          <button onClick={onClose}><X size={18} className="text-slate-400 hover:text-slate-600" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-sm font-medium text-slate-700">Cliente / Deudor</label>
            <input className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={form.clienteNombre} onChange={e => set('clienteNombre', e.target.value)} required placeholder="Nombre del deudor" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Referencia Mandato (RUM)</label>
            <input className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={form.referencia} onChange={e => set('referencia', e.target.value)} required placeholder="MND-001" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Fecha de firma</label>
            <input type="date" className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={form.fechaFirma} onChange={e => set('fechaFirma', e.target.value)} required />
          </div>
          <div className="col-span-2">
            <label className="text-sm font-medium text-slate-700">IBAN deudor</label>
            <input className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono"
              value={form.ibanDeudor} onChange={e => set('ibanDeudor', e.target.value)} required placeholder="ES00 0000 0000 0000 0000 0000" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">BIC (opcional)</label>
            <input className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono"
              value={form.bicDeudor} onChange={e => set('bicDeudor', e.target.value)} placeholder="XXXXESXX" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Tipo</label>
            <select className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={form.tipo} onChange={e => set('tipo', e.target.value)}>
              <option value="CORE">CORE (particulares/pymes)</option>
              <option value="B2B">B2B (empresas)</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Secuencia</label>
            <select className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={form.secuencia} onChange={e => set('secuencia', e.target.value)}>
              <option value="FRST">FRST — Primer cobro</option>
              <option value="RCUR">RCUR — Recurrente</option>
              <option value="OOFF">OOFF — Único</option>
              <option value="FNAL">FNAL — Último</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-sm font-medium text-slate-700">Notas</label>
            <input className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={form.notas} onChange={e => set('notas', e.target.value)} />
          </div>
          <div className="col-span-2 flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Guardando…' : 'Guardar mandato'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Panel de detalle de remesa ────────────────────────────────────────────────

const RemesaDetalle: React.FC<{
  remesa: RemesaSEPA;
  hooks: ReturnType<typeof useRemesasSEPA>;
  onClose: () => void;
}> = ({ remesa, hooks, onClose }) => {
  const [lineas, setLineas] = useState<RemesaLinea[]>([]);
  const [loadingLineas, setLoadingLineas] = useState(false);
  const [working, setWorking] = useState(false);

  const reload = async () => {
    setLoadingLineas(true);
    const l = await hooks.getLineas(remesa.id);
    setLineas(l);
    setLoadingLineas(false);
  };

  useEffect(() => { reload(); }, [remesa.id]);

  const handleAñadirFacturas = async () => {
    setWorking(true);
    try {
      const n = await hooks.añadirFacturasPendientes(remesa.id);
      await reload();
      if (n === 0) alert('No hay facturas pendientes con mandato activo.');
    } catch (e: any) { alert(e.message); }
    finally { setWorking(false); }
  };

  const handleGenerarXML = async () => {
    setWorking(true);
    try {
      const xml = await hooks.generarXML(remesa.id);
      const blob = new Blob([xml], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `remesa_${remesa.nombre.replace(/\s+/g,'_')}.xml`;
      a.click(); URL.revokeObjectURL(url);
      await reload();
    } catch (e: any) { alert(e.message); }
    finally { setWorking(false); }
  };

  const handleDevolucion = async (linea: RemesaLinea) => {
    const motivo = prompt('Código de devolución (p.ej. MD01 = falta fondos, AC13 = cuenta inexistente):', 'MD01');
    if (!motivo) return;
    setWorking(true);
    try {
      await hooks.registrarDevolucion(linea.id, motivo);
      await reload();
    } catch (e: any) { alert(e.message); }
    finally { setWorking(false); }
  };

  const handleDeleteLinea = async (id: string) => {
    if (!confirm('¿Eliminar esta línea?')) return;
    setWorking(true);
    try { await hooks.deleteLinea(id); await reload(); }
    catch (e: any) { alert(e.message); }
    finally { setWorking(false); }
  };

  const estadoR = ESTADO_REMESA[remesa.estado];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">{remesa.nombre}</h2>
            <p className="text-sm text-slate-500">Fecha de cobro: {fmtDate(remesa.fechaCobro)}</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge estado={remesa.estado} map={ESTADO_REMESA} />
            <span className="text-base font-bold text-slate-800">{fmt(remesa.importeTotal)}</span>
            <button onClick={onClose}><X size={18} className="text-slate-400 hover:text-slate-600" /></button>
          </div>
        </div>

        {/* Acciones */}
        {remesa.estado === 'borrador' && (
          <div className="flex items-center gap-3 px-6 py-3 bg-slate-50 border-b border-slate-100">
            <button
              onClick={handleAñadirFacturas} disabled={working}
              className="flex items-center gap-2 text-sm px-3 py-1.5 bg-white border border-slate-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors disabled:opacity-50"
            >
              <Plus size={14} /> Añadir facturas pendientes
            </button>
            <button
              onClick={handleGenerarXML} disabled={working || lineas.length === 0}
              className="flex items-center gap-2 text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Download size={14} /> Generar XML PAIN.008
            </button>
          </div>
        )}
        {remesa.estado === 'enviada' && (
          <div className="flex items-center gap-3 px-6 py-3 bg-slate-50 border-b border-slate-100">
            <button
              onClick={() => hooks.updateEstadoRemesa(remesa.id, 'aceptada')} disabled={working}
              className="flex items-center gap-2 text-sm px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <CheckCircle size={14} /> Marcar como aceptada
            </button>
            <button
              onClick={() => hooks.updateEstadoRemesa(remesa.id, 'rechazada')} disabled={working}
              className="flex items-center gap-2 text-sm px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              <AlertTriangle size={14} /> Rechazada
            </button>
          </div>
        )}

        {/* Líneas */}
        <div className="flex-1 overflow-auto p-6">
          {loadingLineas ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <RefreshCw size={20} className="animate-spin mr-2" /> Cargando líneas…
            </div>
          ) : lineas.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <CreditCard size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Sin líneas. Usa "Añadir facturas pendientes" o añade manualmente.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide border-b border-slate-200">
                  <th className="px-3 py-2 text-left">Cliente</th>
                  <th className="px-3 py-2 text-left">IBAN</th>
                  <th className="px-3 py-2 text-left">Concepto</th>
                  <th className="px-3 py-2 text-left">Seq.</th>
                  <th className="px-3 py-2 text-right">Importe</th>
                  <th className="px-3 py-2 text-center">Estado</th>
                  <th className="w-16" />
                </tr>
              </thead>
              <tbody>
                {lineas.map(l => (
                  <tr key={l.id} className="border-t border-slate-100 hover:bg-slate-50 group">
                    <td className="px-3 py-2 font-medium text-slate-800">{l.clienteNombre}</td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-500">{l.ibanDeudor}</td>
                    <td className="px-3 py-2 text-slate-600 truncate max-w-[180px]">{l.concepto}</td>
                    <td className="px-3 py-2">
                      <span className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded">{l.secuencia}</span>
                    </td>
                    <td className="px-3 py-2 text-right font-semibold font-mono">{fmt(l.importe)}</td>
                    <td className="px-3 py-2 text-center">
                      <Badge estado={l.estado} map={ESTADO_LINEA} />
                      {l.motivoDevolucion && <span className="ml-1 text-xs text-red-500">{l.motivoDevolucion}</span>}
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {l.estado === 'aceptada' && (
                          <button onClick={() => handleDevolucion(l)} title="Registrar devolución"
                            className="p-1 text-amber-500 hover:bg-amber-50 rounded">
                            <RotateCcw size={13} />
                          </button>
                        )}
                        {remesa.estado === 'borrador' && (
                          <button onClick={() => handleDeleteLinea(l.id)} title="Eliminar línea"
                            className="p-1 text-red-400 hover:bg-red-50 rounded">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50">
                  <td colSpan={4} className="px-3 py-2 text-sm font-semibold text-slate-700">Total</td>
                  <td className="px-3 py-2 text-right font-bold font-mono text-slate-900">
                    {fmt(lineas.reduce((s, l) => s + l.importe, 0))}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Vista principal ───────────────────────────────────────────────────────────

export default function RemesasSEPAView() {
  const { empresa } = useEmpresa();
  const hooks = useRemesasSEPA(empresa?.id);
  const [tab, setTab] = useState<'remesas' | 'mandatos'>('remesas');
  const [showNuevaRemesa, setShowNuevaRemesa] = useState(false);
  const [showNuevoMandato, setShowNuevoMandato] = useState(false);
  const [selectedRemesa, setSelectedRemesa] = useState<RemesaSEPA | null>(null);

  useEffect(() => {
    if (empresa?.id) {
      hooks.loadRemesas();
      hooks.loadMandatos();
    }
  }, [empresa?.id]);

  const handleCreateRemesa = async (nombre: string, fechaCobro: string, notas: string) => {
    await hooks.createRemesa({ nombre, fechaCobro, notas });
    setShowNuevaRemesa(false);
  };

  const handleCreateMandato = async (m: any) => {
    await hooks.createMandato({ ...m, empresaId: empresa!.id });
    setShowNuevoMandato(false);
  };

  if (!empresa) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <Building2 size={32} className="mr-3 opacity-30" /> Sin empresa seleccionada
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Remesas SEPA</h1>
          <p className="text-sm text-slate-500 mt-0.5">Adeudos directos SEPA — {empresa.nombre}</p>
        </div>
        <button
          onClick={() => tab === 'remesas' ? setShowNuevaRemesa(true) : setShowNuevoMandato(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
        >
          <Plus size={15} />
          {tab === 'remesas' ? 'Nueva remesa' : 'Nuevo mandato'}
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Remesas totales',  val: hooks.remesas.length, sub: 'histórico' },
          { label: 'En borrador',      val: hooks.remesas.filter(r => r.estado === 'borrador').length, sub: 'pendientes de enviar' },
          { label: 'Importe pendiente',val: fmt(hooks.remesas.filter(r => r.estado === 'borrador').reduce((s,r)=>s+r.importeTotal,0)), sub: 'borradores' },
          { label: 'Mandatos activos', val: hooks.mandatos.filter(m => m.estado === 'activo').length, sub: 'clientes con adeudo' },
        ].map(k => (
          <div key={k.label} className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide">{k.label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{k.val}</p>
            <p className="text-xs text-slate-400 mt-0.5">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {([['remesas', 'Remesas', FileText], ['mandatos', 'Mandatos', Users]] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              tab === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* Tab: Remesas */}
      {tab === 'remesas' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {hooks.loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <RefreshCw size={20} className="animate-spin mr-2" /> Cargando…
            </div>
          ) : hooks.remesas.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <FileText size={36} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">Sin remesas</p>
              <p className="text-sm mt-1">Crea la primera remesa con el botón de arriba</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide border-b border-slate-200">
                  <th className="px-4 py-3 text-left">Nombre</th>
                  <th className="px-4 py-3 text-left">Creación</th>
                  <th className="px-4 py-3 text-left">Fecha cobro</th>
                  <th className="px-4 py-3 text-right">Operaciones</th>
                  <th className="px-4 py-3 text-right">Importe</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="w-12" />
                </tr>
              </thead>
              <tbody>
                {hooks.remesas.map(r => (
                  <tr key={r.id}
                    className="border-t border-slate-100 hover:bg-blue-50/30 cursor-pointer transition-colors"
                    onClick={() => setSelectedRemesa(r)}
                  >
                    <td className="px-4 py-3 font-medium text-slate-800">{r.nombre}</td>
                    <td className="px-4 py-3 text-slate-500">{fmtDate(r.fechaCreacion)}</td>
                    <td className="px-4 py-3 text-slate-700 font-medium">{fmtDate(r.fechaCobro)}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{r.numOperaciones}</td>
                    <td className="px-4 py-3 text-right font-semibold font-mono">{fmt(r.importeTotal)}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge estado={r.estado} map={ESTADO_REMESA} />
                    </td>
                    <td className="px-3 py-3 text-center">
                      <ChevronRight size={14} className="text-slate-400 inline" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab: Mandatos */}
      {tab === 'mandatos' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {hooks.mandatos.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Users size={36} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">Sin mandatos</p>
              <p className="text-sm mt-1">Añade mandatos SEPA de tus clientes</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide border-b border-slate-200">
                  <th className="px-4 py-3 text-left">Cliente</th>
                  <th className="px-4 py-3 text-left">RUM</th>
                  <th className="px-4 py-3 text-left">IBAN</th>
                  <th className="px-4 py-3 text-center">Tipo</th>
                  <th className="px-4 py-3 text-center">Seq.</th>
                  <th className="px-4 py-3 text-left">Firma</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="w-12" />
                </tr>
              </thead>
              <tbody>
                {hooks.mandatos.map(m => (
                  <tr key={m.id} className="border-t border-slate-100 hover:bg-slate-50 group">
                    <td className="px-4 py-3 font-medium text-slate-800">{m.clienteNombre}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{m.referencia}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {m.ibanDeudor.replace(/(.{4})/g, '$1 ').trim()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs font-medium bg-slate-100 px-1.5 py-0.5 rounded">{m.tipo}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs font-mono bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{m.secuencia}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{fmtDate(m.fechaFirma)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        m.estado === 'activo' ? 'bg-green-100 text-green-700' :
                        m.estado === 'cancelado' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>{m.estado}</span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                        {m.estado === 'activo' && (
                          <button
                            onClick={() => hooks.updateMandato(m.id, { estado: 'cancelado' })}
                            className="p-1 text-red-400 hover:bg-red-50 rounded text-xs"
                            title="Cancelar mandato"
                          ><X size={13} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modales */}
      {showNuevaRemesa && (
        <NuevaRemesaModal onClose={() => setShowNuevaRemesa(false)} onCreate={handleCreateRemesa} />
      )}
      {showNuevoMandato && (
        <NuevoMandatoModal onClose={() => setShowNuevoMandato(false)} onCreate={handleCreateMandato} />
      )}
      {selectedRemesa && (
        <RemesaDetalle
          remesa={selectedRemesa}
          hooks={hooks}
          onClose={() => { setSelectedRemesa(null); hooks.loadRemesas(); }}
        />
      )}
    </div>
  );
}
