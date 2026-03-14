import React, { useState, useEffect } from 'react';
import {
  Receipt, Plus, CheckCircle, AlertTriangle, Clock,
  RefreshCw, X, ChevronDown, TrendingDown, Users,
  Calendar, Filter, RotateCcw, Repeat, Building
} from 'lucide-react';
import { useEmpresa } from '../hooks/useEmpresa';
import { useGastos } from '../hooks/useGastos';
import { Gasto, GastoRecurrente, Acreedor, CategoriaGasto, FormaPagoGasto, FrecuenciaGasto } from '../types';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
const fmtDate = (s?: string) => s ? new Date(s).toLocaleDateString('es-ES') : '—';

const FORMAS_PAGO: { val: FormaPagoGasto; label: string }[] = [
  { val: 'transferencia', label: 'Transferencia' },
  { val: 'domiciliacion', label: 'Domiciliación' },
  { val: 'tarjeta',       label: 'Tarjeta' },
  { val: 'efectivo',      label: 'Efectivo' },
  { val: 'cheque',        label: 'Cheque' },
];

const ESTADO_BADGE: Record<string, string> = {
  pendiente:  'bg-amber-100 text-amber-700',
  pagado:     'bg-green-100 text-green-700',
  vencido:    'bg-red-100 text-red-700',
  anulado:    'bg-slate-100 text-slate-500',
  vence_pronto: 'bg-orange-100 text-orange-700',
};

function Badge({ estado }: { estado: string }) {
  const labels: Record<string, string> = {
    pendiente: 'Pendiente', pagado: 'Pagado', vencido: 'Vencido',
    anulado: 'Anulado', vence_pronto: 'Vence pronto',
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ESTADO_BADGE[estado] ?? 'bg-slate-100 text-slate-600'}`}>
      {labels[estado] ?? estado}
    </span>
  );
}

// ── Modal Nuevo Gasto ─────────────────────────────────────────────────────────

const GastoModal: React.FC<{
  gasto?: Gasto;
  categorias: CategoriaGasto[];
  acreedores: Acreedor[];
  empresaId: string;
  onSave: (g: any) => Promise<void>;
  onClose: () => void;
}> = ({ gasto, categorias, acreedores, empresaId, onSave, onClose }) => {
  const hoy = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    acreedorNombre:  gasto?.acreedorNombre ?? '',
    acreedorId:      gasto?.acreedorId ?? '',
    categoriaId:     gasto?.categoriaId ?? '',
    categoriaNombre: gasto?.categoriaNombre ?? '',
    numeroFactura:   gasto?.numeroFactura ?? '',
    fecha:           gasto?.fecha ?? hoy,
    fechaVencimiento: gasto?.fechaVencimiento ?? '',
    concepto:        gasto?.concepto ?? '',
    baseImponible:   gasto?.baseImponible ?? 0,
    ivaPorcentaje:   gasto?.ivaPorcentaje ?? 21,
    irpfPorcentaje:  gasto?.irpfPorcentaje ?? 0,
    formaPago:       gasto?.formaPago ?? 'transferencia' as FormaPagoGasto,
    notas:           gasto?.notas ?? '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleAcreedor = (id: string) => {
    const a = acreedores.find(x => x.id === id);
    if (a) {
      set('acreedorId', a.id);
      set('acreedorNombre', a.nombre);
      if (a.categoriaId) {
        const cat = categorias.find(c => c.id === a.categoriaId);
        if (cat) { set('categoriaId', cat.id); set('categoriaNombre', cat.nombre); }
      }
    } else {
      set('acreedorId', '');
    }
  };

  const handleCategoria = (id: string) => {
    const cat = categorias.find(c => c.id === id);
    set('categoriaId', id);
    set('categoriaNombre', cat?.nombre ?? '');
  };

  const base = Number(form.baseImponible) || 0;
  const iva  = Math.round(base * Number(form.ivaPorcentaje) / 100 * 100) / 100;
  const irpf = Math.round(base * Number(form.irpfPorcentaje) / 100 * 100) / 100;
  const total = base + iva - irpf;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await onSave({ ...form, empresaId, estado: 'pendiente', esRecurrente: false });
      onClose();
    } catch (err: any) { alert(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white">
          <h2 className="text-lg font-semibold text-slate-800">{gasto ? 'Editar gasto' : 'Nuevo gasto'}</h2>
          <button onClick={onClose}><X size={18} className="text-slate-400 hover:text-slate-600" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-2 gap-4">
          {/* Acreedor */}
          <div className="col-span-2">
            <label className="text-sm font-medium text-slate-700">Acreedor / Proveedor de servicio</label>
            <div className="flex gap-2 mt-1">
              <select
                className="w-40 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={form.acreedorId}
                onChange={e => handleAcreedor(e.target.value)}
              >
                <option value="">— Seleccionar —</option>
                {acreedores.filter(a => a.activo).map(a => (
                  <option key={a.id} value={a.id}>{a.nombre}</option>
                ))}
              </select>
              <input
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={form.acreedorNombre}
                onChange={e => set('acreedorNombre', e.target.value)}
                placeholder="o escribe el nombre directamente"
                required
              />
            </div>
          </div>

          {/* Categoría */}
          <div>
            <label className="text-sm font-medium text-slate-700">Categoría</label>
            <select
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={form.categoriaId}
              onChange={e => handleCategoria(e.target.value)}
            >
              <option value="">— Sin categoría —</option>
              {categorias.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>

          {/* Nº Factura */}
          <div>
            <label className="text-sm font-medium text-slate-700">Nº Factura / Referencia</label>
            <input
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={form.numeroFactura}
              onChange={e => set('numeroFactura', e.target.value)}
              placeholder="FRA-2024-001"
            />
          </div>

          {/* Concepto */}
          <div className="col-span-2">
            <label className="text-sm font-medium text-slate-700">Concepto</label>
            <input
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={form.concepto}
              onChange={e => set('concepto', e.target.value)}
              placeholder="Alquiler nave industrial — enero 2025"
              required
            />
          </div>

          {/* Fecha */}
          <div>
            <label className="text-sm font-medium text-slate-700">Fecha factura</label>
            <input type="date"
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={form.fecha} onChange={e => set('fecha', e.target.value)} required />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Fecha vencimiento</label>
            <input type="date"
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={form.fechaVencimiento} onChange={e => set('fechaVencimiento', e.target.value)} />
          </div>

          {/* Importes */}
          <div>
            <label className="text-sm font-medium text-slate-700">Base imponible (€)</label>
            <input type="number" min="0" step="0.01"
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono"
              value={form.baseImponible} onChange={e => set('baseImponible', e.target.value)} required />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-sm font-medium text-slate-700">IVA %</label>
              <select className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={form.ivaPorcentaje} onChange={e => set('ivaPorcentaje', Number(e.target.value))}>
                <option value={0}>0%</option>
                <option value={4}>4%</option>
                <option value={10}>10%</option>
                <option value={21}>21%</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium text-slate-700">IRPF %</label>
              <select className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={form.irpfPorcentaje} onChange={e => set('irpfPorcentaje', Number(e.target.value))}>
                <option value={0}>0%</option>
                <option value={7}>7%</option>
                <option value={15}>15%</option>
                <option value={19}>19%</option>
              </select>
            </div>
          </div>

          {/* Total calculado */}
          <div className="col-span-2 bg-slate-50 rounded-xl p-4">
            <div className="flex justify-between text-sm text-slate-600">
              <span>Base imponible</span><span className="font-mono">{fmt(base)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-600 mt-1">
              <span>IVA ({form.ivaPorcentaje}%)</span><span className="font-mono">{fmt(iva)}</span>
            </div>
            {irpf > 0 && (
              <div className="flex justify-between text-sm text-red-600 mt-1">
                <span>IRPF (-{form.irpfPorcentaje}%)</span><span className="font-mono">-{fmt(irpf)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-slate-900 mt-2 pt-2 border-t border-slate-200">
              <span>Total a pagar</span><span className="font-mono">{fmt(total)}</span>
            </div>
          </div>

          {/* Forma pago */}
          <div>
            <label className="text-sm font-medium text-slate-700">Forma de pago</label>
            <select className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={form.formaPago} onChange={e => set('formaPago', e.target.value as FormaPagoGasto)}>
              {FORMAS_PAGO.map(f => <option key={f.val} value={f.val}>{f.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Notas</label>
            <input className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={form.notas} onChange={e => set('notas', e.target.value)} />
          </div>

          <div className="col-span-2 flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Guardando…' : gasto ? 'Guardar cambios' : 'Registrar gasto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Modal Gasto Recurrente ────────────────────────────────────────────────────

const RecurrenteModal: React.FC<{
  categorias: CategoriaGasto[];
  acreedores: Acreedor[];
  empresaId: string;
  onSave: (r: any) => Promise<void>;
  onClose: () => void;
}> = ({ categorias, acreedores, empresaId, onSave, onClose }) => {
  const [form, setForm] = useState({
    acreedorNombre: '', acreedorId: '',
    categoriaId: '', categoriaNombre: '',
    concepto: '', baseImponible: 0, ivaPorcentaje: 21, irpfPorcentaje: 0,
    diaVencimiento: 1, frecuencia: 'mensual' as FrecuenciaGasto,
    formaPago: 'domiciliacion' as FormaPagoGasto,
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleAcreedor = (id: string) => {
    const a = acreedores.find(x => x.id === id);
    if (a) { set('acreedorId', a.id); set('acreedorNombre', a.nombre); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const cat = categorias.find(c => c.id === form.categoriaId);
      await onSave({ ...form, empresaId, categoriaNombre: cat?.nombre ?? '', activo: true });
      onClose();
    } catch (err: any) { alert(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">Nuevo gasto recurrente</h2>
          <button onClick={onClose}><X size={18} className="text-slate-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Acreedor</label>
            <div className="flex gap-2 mt-1">
              <select className="w-40 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={form.acreedorId} onChange={e => handleAcreedor(e.target.value)}>
                <option value="">— Seleccionar —</option>
                {acreedores.filter(a => a.activo).map(a => (
                  <option key={a.id} value={a.id}>{a.nombre}</option>
                ))}
              </select>
              <input className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={form.acreedorNombre} onChange={e => set('acreedorNombre', e.target.value)}
                placeholder="Nombre" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Categoría</label>
              <select className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={form.categoriaId} onChange={e => set('categoriaId', e.target.value)}>
                <option value="">— Sin categoría —</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Frecuencia</label>
              <select className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={form.frecuencia} onChange={e => set('frecuencia', e.target.value as FrecuenciaGasto)}>
                <option value="mensual">Mensual</option>
                <option value="trimestral">Trimestral</option>
                <option value="semestral">Semestral</option>
                <option value="anual">Anual</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Concepto</label>
            <input className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={form.concepto} onChange={e => set('concepto', e.target.value)}
              placeholder="Alquiler nave industrial" required />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="text-sm font-medium text-slate-700">Base (€)</label>
              <input type="number" min="0" step="0.01"
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono"
                value={form.baseImponible} onChange={e => set('baseImponible', e.target.value)} required />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">IVA %</label>
              <select className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={form.ivaPorcentaje} onChange={e => set('ivaPorcentaje', Number(e.target.value))}>
                <option value={0}>0%</option><option value={10}>10%</option><option value={21}>21%</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Día vcto.</label>
              <input type="number" min="1" max="31"
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={form.diaVencimiento} onChange={e => set('diaVencimiento', Number(e.target.value))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700">Forma de pago</label>
              <select className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={form.formaPago} onChange={e => set('formaPago', e.target.value as FormaPagoGasto)}>
                {FORMAS_PAGO.map(f => <option key={f.val} value={f.val}>{f.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">IRPF %</label>
              <select className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={form.irpfPorcentaje} onChange={e => set('irpfPorcentaje', Number(e.target.value))}>
                <option value={0}>0%</option><option value={7}>7%</option>
                <option value={15}>15%</option><option value={19}>19%</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Modal Nuevo Acreedor ──────────────────────────────────────────────────────

const AcreedorModal: React.FC<{
  categorias: CategoriaGasto[];
  empresaId: string;
  onSave: (a: any) => Promise<void>;
  onClose: () => void;
}> = ({ categorias, empresaId, onSave, onClose }) => {
  const [form, setForm] = useState({
    nombre: '', nif: '', iban: '', email: '', telefono: '',
    direccion: '', categoriaId: '', notas: '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await onSave({ ...form, empresaId, activo: true });
      onClose();
    } catch (err: any) { alert(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">Nuevo acreedor</h2>
          <button onClick={onClose}><X size={18} className="text-slate-400 hover:text-slate-600" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-sm font-medium text-slate-700">Nombre / Razón social *</label>
            <input className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={form.nombre} onChange={e => set('nombre', e.target.value)} required
              placeholder="Endesa Energía S.A." />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">NIF / CIF</label>
            <input className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono"
              value={form.nif} onChange={e => set('nif', e.target.value)} placeholder="A12345678" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Categoría habitual</label>
            <select className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={form.categoriaId} onChange={e => set('categoriaId', e.target.value)}>
              <option value="">— Sin categoría —</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-sm font-medium text-slate-700">IBAN (para domiciliación / transferencia)</label>
            <input className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono"
              value={form.iban} onChange={e => set('iban', e.target.value)}
              placeholder="ES00 0000 0000 0000 0000 0000" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Email</label>
            <input type="email" className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={form.email} onChange={e => set('email', e.target.value)} placeholder="facturacion@acreedor.com" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Teléfono</label>
            <input className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={form.telefono} onChange={e => set('telefono', e.target.value)} placeholder="900 000 000" />
          </div>
          <div className="col-span-2">
            <label className="text-sm font-medium text-slate-700">Dirección fiscal</label>
            <input className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={form.direccion} onChange={e => set('direccion', e.target.value)}
              placeholder="Calle Ejemplo 1, 28001 Madrid" />
          </div>
          <div className="col-span-2">
            <label className="text-sm font-medium text-slate-700">Notas</label>
            <textarea className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none" rows={2}
              value={form.notas} onChange={e => set('notas', e.target.value)} />
          </div>
          <div className="col-span-2 flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Guardando…' : 'Crear acreedor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Vista principal ───────────────────────────────────────────────────────────

export default function GastosView() {
  const { empresa } = useEmpresa();
  const hooks = useGastos(empresa?.id);
  const [tab, setTab] = useState<'gastos' | 'recurrentes' | 'acreedores' | 'resumen'>('gastos');
  const [showGastoModal, setShowGastoModal] = useState(false);
  const [showRecurrenteModal, setShowRecurrenteModal] = useState(false);
  const [showAcreedorModal, setShowAcreedorModal] = useState(false);
  const [editGasto, setEditGasto] = useState<Gasto | undefined>();
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroCat, setFiltroCat] = useState('');
  const [working, setWorking] = useState(false);

  const periodoActual = new Date().toISOString().slice(0, 7);

  useEffect(() => {
    if (empresa?.id) {
      hooks.loadCategorias();
      hooks.loadAcreedores();
      hooks.loadGastos();
      hooks.loadRecurrentes();
      hooks.loadResumen();
    }
  }, [empresa?.id]);

  const handleGenerarMes = async () => {
    setWorking(true);
    try {
      const n = await hooks.generarGastosMes(periodoActual);
      alert(n > 0 ? `${n} gasto${n > 1 ? 's' : ''} generado${n > 1 ? 's' : ''} para ${periodoActual}` : 'No hay gastos recurrentes pendientes para este mes.');
    } catch (e: any) { alert(e.message); }
    finally { setWorking(false); }
  };

  const gastosFiltrados = hooks.gastos.filter(g => {
    if (filtroEstado !== 'todos' && g.estado !== filtroEstado) return false;
    if (filtroCat && g.categoriaId !== filtroCat) return false;
    return true;
  });

  // KPIs
  const totalPendiente = hooks.gastos.filter(g => g.estado === 'pendiente').reduce((s, g) => s + g.total, 0);
  const totalMes = hooks.gastos.filter(g => g.fecha?.startsWith(periodoActual)).reduce((s, g) => s + g.total, 0);
  const totalVencido = hooks.gastos.filter(g => g.estado === 'pendiente' && g.fechaVencimiento && g.fechaVencimiento < new Date().toISOString().split('T')[0]).reduce((s, g) => s + g.total, 0);

  if (!empresa) {
    return <div className="flex items-center justify-center h-64 text-slate-400"><Building size={32} className="mr-3 opacity-30" /> Sin empresa</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gastos de Empresa</h1>
          <p className="text-sm text-slate-500 mt-0.5">Alquileres, suministros, servicios y más — {empresa.nombre}</p>
        </div>
        <div className="flex gap-2">
          {tab === 'recurrentes' && (
            <>
              <button onClick={handleGenerarMes} disabled={working}
                className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-200 bg-white rounded-xl hover:bg-slate-50 disabled:opacity-50">
                <Repeat size={14} /> Generar mes actual
              </button>
              <button onClick={() => setShowRecurrenteModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700">
                <Plus size={15} /> Nuevo recurrente
              </button>
            </>
          )}
          {tab === 'gastos' && (
            <button onClick={() => { setEditGasto(undefined); setShowGastoModal(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700">
              <Plus size={15} /> Nuevo gasto
            </button>
          )}
          {tab === 'acreedores' && (
            <button onClick={() => setShowAcreedorModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700">
              <Plus size={15} /> Nuevo acreedor
            </button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Pendiente de pago', val: fmt(totalPendiente), icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Vencido', val: fmt(totalVencido), icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Este mes', val: fmt(totalMes), icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Gastos recurrentes', val: hooks.recurrentes.filter(r => r.activo).length + ' activos', icon: Repeat, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map(k => (
          <div key={k.label} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
            <div className={`w-10 h-10 ${k.bg} rounded-xl flex items-center justify-center shrink-0`}>
              <k.icon size={18} className={k.color} />
            </div>
            <div>
              <p className="text-xs text-slate-500">{k.label}</p>
              <p className="text-lg font-bold text-slate-900">{k.val}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {([
          ['gastos', 'Gastos', Receipt],
          ['recurrentes', 'Recurrentes', Repeat],
          ['acreedores', 'Acreedores', Users],
          ['resumen', 'Por categoría', TrendingDown],
        ] as const).map(([id, label, Icon]) => (
          <button key={id} onClick={() => setTab(id as any)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              tab === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* Tab: Gastos */}
      {tab === 'gastos' && (
        <div className="space-y-3">
          {/* Filtros */}
          <div className="flex gap-3 items-center">
            <select className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
              value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
              <option value="todos">Todos los estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="pagado">Pagado</option>
              <option value="vencido">Vencido</option>
            </select>
            <select className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
              value={filtroCat} onChange={e => setFiltroCat(e.target.value)}>
              <option value="">Todas las categorías</option>
              {hooks.categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            <span className="text-sm text-slate-500">{gastosFiltrados.length} registros</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            {hooks.loading ? (
              <div className="flex items-center justify-center py-16 text-slate-400">
                <RefreshCw size={20} className="animate-spin mr-2" /> Cargando…
              </div>
            ) : gastosFiltrados.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Receipt size={36} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium">Sin gastos registrados</p>
                <p className="text-sm mt-1">Registra el primero con el botón de arriba</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide border-b border-slate-200">
                    <th className="px-4 py-3 text-left">Fecha</th>
                    <th className="px-4 py-3 text-left">Acreedor</th>
                    <th className="px-4 py-3 text-left">Concepto</th>
                    <th className="px-4 py-3 text-left">Categoría</th>
                    <th className="px-4 py-3 text-left">Forma pago</th>
                    <th className="px-4 py-3 text-right">Base</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-center">Estado</th>
                    <th className="w-20" />
                  </tr>
                </thead>
                <tbody>
                  {gastosFiltrados.map(g => (
                    <tr key={g.id} className="border-t border-slate-100 hover:bg-slate-50 group">
                      <td className="px-4 py-2.5 text-slate-500">{fmtDate(g.fecha)}</td>
                      <td className="px-4 py-2.5 font-medium text-slate-800">{g.acreedorNombre}</td>
                      <td className="px-4 py-2.5 text-slate-600 max-w-[200px] truncate">{g.concepto}</td>
                      <td className="px-4 py-2.5">
                        {g.categoriaNombre && (
                          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                            {g.categoriaNombre}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500 capitalize">{g.formaPago}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-700">{fmt(g.baseImponible)}</td>
                      <td className="px-4 py-2.5 text-right font-bold font-mono">{fmt(g.total)}</td>
                      <td className="px-4 py-2.5 text-center">
                        <Badge estado={
                          g.estado === 'pendiente' && g.fechaVencimiento && g.fechaVencimiento < new Date().toISOString().split('T')[0]
                            ? 'vencido' : g.estado
                        } />
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {g.estado === 'pendiente' && (
                            <button onClick={() => hooks.marcarPagado(g.id)} title="Marcar pagado"
                              className="p-1 text-green-500 hover:bg-green-50 rounded"><CheckCircle size={14} /></button>
                          )}
                          <button onClick={() => { setEditGasto(g); setShowGastoModal(true); }} title="Editar"
                            className="p-1 text-slate-400 hover:bg-slate-100 rounded text-xs">✏️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-slate-50">
                    <td colSpan={5} className="px-4 py-2 text-sm font-semibold text-slate-700">Total</td>
                    <td className="px-4 py-2 text-right font-mono font-semibold">{fmt(gastosFiltrados.reduce((s,g)=>s+g.baseImponible,0))}</td>
                    <td className="px-4 py-2 text-right font-mono font-bold text-slate-900">{fmt(gastosFiltrados.reduce((s,g)=>s+g.total,0))}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Tab: Recurrentes */}
      {tab === 'recurrentes' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {hooks.recurrentes.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Repeat size={36} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">Sin gastos recurrentes</p>
              <p className="text-sm mt-1">Añade alquileres, suministros fijos, renting…</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide border-b border-slate-200">
                  <th className="px-4 py-3 text-left">Acreedor</th>
                  <th className="px-4 py-3 text-left">Concepto</th>
                  <th className="px-4 py-3 text-left">Categoría</th>
                  <th className="px-4 py-3 text-center">Frecuencia</th>
                  <th className="px-4 py-3 text-center">Día vcto.</th>
                  <th className="px-4 py-3 text-right">Base (€)</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="w-12" />
                </tr>
              </thead>
              <tbody>
                {hooks.recurrentes.map(r => (
                  <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50 group">
                    <td className="px-4 py-2.5 font-medium text-slate-800">{r.acreedorNombre}</td>
                    <td className="px-4 py-2.5 text-slate-600">{r.concepto}</td>
                    <td className="px-4 py-2.5">
                      {r.categoriaNombre && (
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{r.categoriaNombre}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center capitalize">{r.frecuencia}</td>
                    <td className="px-4 py-2.5 text-center">{r.diaVencimiento}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold">{fmt(r.baseImponible)}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.activo ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {r.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <button
                        onClick={() => hooks.toggleRecurrente(r.id, !r.activo)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:bg-slate-100 rounded text-xs"
                        title={r.activo ? 'Desactivar' : 'Activar'}
                      >
                        {r.activo ? <X size={13} /> : <CheckCircle size={13} />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab: Acreedores */}
      {tab === 'acreedores' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center">
            <p className="text-sm text-slate-500">{hooks.acreedores.length} acreedores registrados</p>
          </div>
          {hooks.acreedores.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Users size={36} className="mx-auto mb-3 opacity-30" />
              <p>Sin acreedores. Se añaden automáticamente al crear gastos.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide border-b border-slate-200">
                  <th className="px-4 py-3 text-left">Nombre</th>
                  <th className="px-4 py-3 text-left">NIF</th>
                  <th className="px-4 py-3 text-left">IBAN</th>
                  <th className="px-4 py-3 text-left">Teléfono</th>
                  <th className="px-4 py-3 text-left">Categoría</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody>
                {hooks.acreedores.map(a => (
                  <tr key={a.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium text-slate-800">{a.nombre}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{a.nif ?? '—'}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{a.iban ? a.iban.replace(/(.{4})/g, '$1 ').trim() : '—'}</td>
                    <td className="px-4 py-2.5 text-slate-500">{a.telefono ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      {hooks.categorias.find(c => c.id === a.categoriaId)?.nombre && (
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                          {hooks.categorias.find(c => c.id === a.categoriaId)?.nombre}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${a.activo ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {a.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab: Resumen por categoría */}
      {tab === 'resumen' && (
        <div className="space-y-4">
          {/* Agrupar por categoría del período más reciente */}
          {(() => {
            const periodoMax = hooks.resumen.reduce((m, r) => r.periodo > m ? r.periodo : m, '');
            const porCat = hooks.resumen.filter(r => r.periodo === periodoMax);
            const otrosMeses = [...new Set(hooks.resumen.map(r => r.periodo))].sort().reverse().slice(1, 6);

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Mes actual por categoría */}
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <h3 className="font-semibold text-slate-800 mb-4">
                    Gastos por categoría — {periodoMax || periodoActual}
                  </h3>
                  {porCat.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-8">Sin datos</p>
                  ) : (
                    <div className="space-y-3">
                      {porCat.sort((a, b) => b.totalGastos - a.totalGastos).map(c => {
                        const pct = porCat.reduce((s, x) => s + x.totalGastos, 0);
                        const w = pct > 0 ? Math.round(c.totalGastos / pct * 100) : 0;
                        const cat = hooks.categorias.find(x => x.id === c.categoriaId);
                        return (
                          <div key={c.categoriaId ?? c.categoriaNombre}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-slate-700 font-medium">{c.categoriaNombre ?? 'Sin categoría'}</span>
                              <span className="font-mono font-semibold">{fmt(c.totalGastos)}</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-2 rounded-full" style={{ width: `${w}%`, backgroundColor: cat?.color ?? '#6366f1' }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Evolución mensual total */}
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <h3 className="font-semibold text-slate-800 mb-4">Evolución últimos 6 meses</h3>
                  {(() => {
                    const periodos = [...new Set(hooks.resumen.map(r => r.periodo))].sort().reverse().slice(0, 6).reverse();
                    const maxVal = Math.max(...periodos.map(p => hooks.resumen.filter(r => r.periodo === p).reduce((s, r) => s + r.totalGastos, 0)), 1);
                    return (
                      <div className="flex items-end gap-3 h-40">
                        {periodos.map(p => {
                          const total = hooks.resumen.filter(r => r.periodo === p).reduce((s, r) => s + r.totalGastos, 0);
                          const h = Math.round(total / maxVal * 100);
                          return (
                            <div key={p} className="flex-1 flex flex-col items-center gap-1">
                              <span className="text-[10px] text-slate-500 font-mono">{fmt(total).replace('€','').trim()}</span>
                              <div className="w-full rounded-t-sm bg-indigo-500" style={{ height: `${h}%`, minHeight: total > 0 ? '4px' : '0' }} />
                              <span className="text-[10px] text-slate-400">{p.slice(5)}</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Modales */}
      {showGastoModal && (
        <GastoModal
          gasto={editGasto}
          categorias={hooks.categorias}
          acreedores={hooks.acreedores}
          empresaId={empresa.id}
          onSave={editGasto ? (g) => hooks.updateGasto(editGasto.id, g) : hooks.createGasto}
          onClose={() => { setShowGastoModal(false); setEditGasto(undefined); }}
        />
      )}
      {showRecurrenteModal && (
        <RecurrenteModal
          categorias={hooks.categorias}
          acreedores={hooks.acreedores}
          empresaId={empresa.id}
          onSave={hooks.createRecurrente}
          onClose={() => setShowRecurrenteModal(false)}
        />
      )}
      {showAcreedorModal && (
        <AcreedorModal
          categorias={hooks.categorias}
          empresaId={empresa.id}
          onSave={hooks.createAcreedor}
          onClose={() => setShowAcreedorModal(false)}
        />
      )}
    </div>
  );
}
