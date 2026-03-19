import React, { useState, useRef, useEffect } from 'react';
import {
  ShoppingCart, Truck, Package, ArrowLeftRight,
  Plus, Search, X, ChevronDown, Check, AlertCircle,
  FileText, Pencil, Eye, RefreshCw,
} from 'lucide-react';
import {
  SageToolbar, SageTabStrip, SageFilterInput,
  sageTh, sageThR, sageRowClass,
} from './SageToolbar';
import { useCompras, calcularSubtotalCompraLinea, calcularTotalesCompra } from '../hooks/useCompras';
import {
  Proveedor, PedidoCompra, Recepcion, Traspaso,
  CompraLinea, RecepcionLinea, TraspasoLinea,
  EstadoPedidoCompra, EstadoRecepcion, EstadoTraspaso,
} from '../types';
import { User, Almacen } from '../types';

// ─── Helpers visuales ─────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

const ESTADO_OC_COLOR: Record<EstadoPedidoCompra, string> = {
  borrador: 'bg-slate-100 text-slate-600',
  confirmado: 'bg-blue-100 text-blue-700',
  enviado: 'bg-purple-100 text-purple-700',
  recibido_parcial: 'bg-amber-100 text-amber-700',
  recibido: 'bg-green-100 text-green-700',
  cancelado: 'bg-red-100 text-red-600',
};

const ESTADO_REC_COLOR: Record<EstadoRecepcion, string> = {
  borrador: 'bg-slate-100 text-slate-600',
  confirmada: 'bg-green-100 text-green-700',
  anulada: 'bg-red-100 text-red-600',
};

const ESTADO_TRA_COLOR: Record<EstadoTraspaso, string> = {
  borrador: 'bg-slate-100 text-slate-600',
  en_transito: 'bg-amber-100 text-amber-700',
  confirmado: 'bg-green-100 text-green-700',
  anulado: 'bg-red-100 text-red-600',
};

const EstadoBadge = ({ text, color }: { text: string; color: string }) => (
  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>{text}</span>
);

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type Tab = 'proveedores' | 'pedidos' | 'recepciones' | 'traspasos';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'proveedores', label: 'Proveedores', icon: <Package size={15} /> },
  { id: 'pedidos', label: 'Órdenes de Compra', icon: <ShoppingCart size={15} /> },
  { id: 'recepciones', label: 'Recepciones', icon: <Truck size={15} /> },
  { id: 'traspasos', label: 'Traspasos', icon: <ArrowLeftRight size={15} /> },
];

// ─── Modal Proveedor ──────────────────────────────────────────────────────────

interface ProveedorModalProps {
  proveedor?: Proveedor | null;
  onSave: (data: Omit<Proveedor, 'id' | 'createdAt'>) => Promise<void>;
  onClose: () => void;
}

const ProveedorModal: React.FC<ProveedorModalProps> = ({ proveedor, onSave, onClose }) => {
  const [form, setForm] = useState<Omit<Proveedor, 'id' | 'createdAt'>>({
    nombre: proveedor?.nombre || '',
    razonSocial: proveedor?.razonSocial || '',
    cif: proveedor?.cif || '',
    direccion: proveedor?.direccion || '',
    cp: proveedor?.cp || '',
    ciudad: proveedor?.ciudad || '',
    provincia: proveedor?.provincia || '',
    pais: proveedor?.pais || 'España',
    telefono: proveedor?.telefono || '',
    email: proveedor?.email || '',
    web: proveedor?.web || '',
    iban: proveedor?.iban || '',
    swift: proveedor?.swift || '',
    contacto: proveedor?.contacto || '',
    diasPago: proveedor?.diasPago || 30,
    notas: proveedor?.notas || '',
    activo: proveedor?.activo ?? true,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try { await onSave(form); onClose(); }
    catch (err) { alert(err instanceof Error ? err.message : 'Error guardando'); }
    finally { setSaving(false); }
  };

  const F = ({ label, field, type = 'text', half = false }: {
    label: string; field: keyof typeof form; type?: string; half?: boolean
  }) => (
    <div className={half ? 'col-span-1' : 'col-span-2'}>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <input
        type={type}
        className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-400"
        value={String(form[field] ?? '')}
        onChange={e => setForm(f => ({ ...f, [field]: type === 'number' ? Number(e.target.value) : e.target.value }))}
      />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-slate-700 to-slate-600 shrink-0 rounded-t-2xl">
          <h2 className="text-[13px] font-semibold text-white">
            {proveedor ? 'Editar Proveedor' : 'Nuevo Proveedor'}
          </h2>
          <button onClick={onClose}><X size={16} className="text-slate-300 hover:text-white" /></button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-3 py-2">
          <div className="grid grid-cols-2 gap-4">
            <F label="Nombre comercial *" field="nombre" />
            <F label="Razón social" field="razonSocial" />
            <F label="CIF / NIF" field="cif" half />
            <F label="Persona de contacto" field="contacto" half />
            <F label="Dirección" field="direccion" />
            <F label="CP" field="cp" half />
            <F label="Ciudad" field="ciudad" half />
            <F label="Provincia" field="provincia" half />
            <F label="País" field="pais" half />
            <F label="Teléfono" field="telefono" half />
            <F label="Email" field="email" half />
            <F label="Web" field="web" half />
            <F label="IBAN" field="iban" half />
            <F label="SWIFT / BIC" field="swift" half />
            <F label="Días de pago" field="diasPago" type="number" half />
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Notas</label>
              <textarea
                className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-400 resize-none"
                rows={2}
                value={form.notas || ''}
                onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
              />
            </div>
          </div>
        </form>

        <div className="flex justify-end gap-3 px-3 py-2 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !form.nombre}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Líneas de compra ─────────────────────────────────────────────────────────

interface CompraLineasEditorProps {
  lineas: CompraLinea[];
  onChange: (lineas: CompraLinea[]) => void;
  readonly?: boolean;
}

const CompraLineasEditor: React.FC<CompraLineasEditorProps> = ({ lineas, onChange, readonly }) => {
  const addLinea = () => onChange([...lineas, {
    orden: lineas.length + 1,
    descripcion: '',
    cantidad: 1,
    precioUnitario: 0,
    descuento: 0,
    ivaPorcentaje: 21,
    subtotal: 0,
  }]);

  const update = (i: number, changes: Partial<CompraLinea>) => {
    const updated = lineas.map((l, idx) => {
      if (idx !== i) return l;
      const next = { ...l, ...changes };
      next.subtotal = calcularSubtotalCompraLinea(next);
      return next;
    });
    onChange(updated);
  };

  const total = lineas.reduce((s, l) => s + l.subtotal, 0);

  return (
    <div className="border border-slate-200 rounded-xl overflow-x-auto">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-xs text-slate-500 uppercase">
              <th className="px-3 py-2 text-left w-8">#</th>
              <th className="px-3 py-2 text-left">Descripción</th>
              <th className="px-3 py-2 text-right w-24">Cant.</th>
              <th className="px-3 py-2 text-right w-28">Precio coste</th>
              <th className="px-3 py-2 text-right w-20">Dto %</th>
              <th className="px-3 py-2 text-right w-20">IVA %</th>
              <th className="px-3 py-2 text-right w-28">Subtotal</th>
              {!readonly && <th className="w-8" />}
            </tr>
          </thead>
          <tbody>
            {lineas.map((l, i) => (
              <tr key={i} className="border-t border-slate-100 group hover:bg-slate-50">
                <td className="px-3 py-1.5 text-xs text-slate-400">{i + 1}</td>
                <td className="px-2 py-1.5">
                  {readonly
                    ? <span className="text-sm text-slate-800">{l.descripcion}</span>
                    : <input
                        className="w-full text-sm border-0 bg-transparent outline-none focus:bg-white focus:border focus:border-blue-300 focus:rounded px-1 py-0.5"
                        value={l.descripcion}
                        onChange={e => update(i, { descripcion: e.target.value })}
                        placeholder="Descripción…"
                      />
                  }
                </td>
                {(['cantidad', 'precioUnitario', 'descuento'] as (keyof CompraLinea)[]).map(field => (
                  <td key={field} className="px-2 py-1.5 w-24">
                    {readonly
                      ? <span className="text-sm text-right block">{Number(l[field])}</span>
                      : <input
                          type="number" min="0" step="0.01"
                          className="w-full text-sm text-right border-0 bg-transparent outline-none focus:bg-white focus:border focus:border-blue-300 focus:rounded px-1 py-0.5"
                          value={Number(l[field])}
                          onChange={e => update(i, { [field]: parseFloat(e.target.value) || 0 })}
                        />
                    }
                  </td>
                ))}
                <td className="px-2 py-1.5 w-20">
                  {readonly
                    ? <span className="text-sm text-right block">{l.ivaPorcentaje}%</span>
                    : <select
                        className="w-full text-sm border-0 bg-transparent outline-none focus:bg-white"
                        value={l.ivaPorcentaje}
                        onChange={e => update(i, { ivaPorcentaje: Number(e.target.value) })}
                      >
                        <option value={0}>0%</option>
                        <option value={4}>4%</option>
                        <option value={10}>10%</option>
                        <option value={21}>21%</option>
                      </select>
                  }
                </td>
                <td className="px-3 py-1.5 text-right text-sm font-semibold text-slate-800">{fmt(l.subtotal)}</td>
                {!readonly && (
                  <td className="px-2 py-1.5">
                    <button onClick={() => onChange(lineas.filter((_, idx) => idx !== i))}
                      className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600">
                      <X size={13} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {lineas.length === 0 && (
              <tr><td colSpan={readonly ? 7 : 8} className="px-4 py-8 text-center text-slate-400 text-sm italic">
                Sin líneas.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-t border-slate-200">
        {!readonly
          ? <button onClick={addLinea} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium">
              <Plus size={15} /> Añadir línea
            </button>
          : <div />
        }
        <div className="text-sm font-semibold text-slate-700">
          Subtotal: <span className="text-slate-900 ml-1">{fmt(total)}</span>
        </div>
      </div>
    </div>
  );
};

// ─── Modal Pedido de Compra ───────────────────────────────────────────────────

interface PedidoCompraModalProps {
  pedido?: PedidoCompra | null;
  lineasIniciales?: CompraLinea[];
  proveedores: Proveedor[];
  almacenes: Almacen[];
  currentUser: User;
  onSave: (data: Omit<PedidoCompra, 'id' | 'referencia' | 'createdAt'>, lineas: CompraLinea[]) => Promise<void>;
  onClose: () => void;
}

const PedidoCompraModal: React.FC<PedidoCompraModalProps> = ({
  pedido, lineasIniciales, proveedores, almacenes, currentUser, onSave, onClose,
}) => {
  const [form, setForm] = useState({
    proveedorId: pedido?.proveedorId || '',
    proveedorNombre: pedido?.proveedorNombre || '',
    almacenId: pedido?.almacenId || '',
    fecha: pedido?.fecha || new Date().toISOString().slice(0, 10),
    fechaEntrega: pedido?.fechaEntrega || '',
    estado: (pedido?.estado || 'borrador') as EstadoPedidoCompra,
    descuentoGlobal: pedido?.descuentoGlobal || 0,
    ivaPorcentaje: pedido?.ivaPorcentaje || 21,
    notas: pedido?.notas || '',
  });
  const [lineas, setLineas] = useState<CompraLinea[]>(lineasIniciales || []);
  const [saving, setSaving] = useState(false);

  const totales = calcularTotalesCompra(lineas, form.descuentoGlobal, form.ivaPorcentaje);
  const readonly = pedido?.estado === 'recibido' || pedido?.estado === 'cancelado';

  const handleSave = async () => {
    if (!form.proveedorId) { alert('Selecciona un proveedor'); return; }
    setSaving(true);
    try {
      const prov = proveedores.find(p => p.id === form.proveedorId);
      await onSave({
        ...form,
        proveedorNombre: prov?.nombre,
        empresaId: undefined,
        delegacionId: undefined,
        subtotal: totales.subtotal,
        baseImponible: totales.baseImponible,
        iva: totales.iva,
        total: totales.total,
        createdBy: currentUser.id,
      }, lineas);
      onClose();
    } catch (err) { alert(err instanceof Error ? err.message : 'Error'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-800">
              {pedido ? `OC: ${pedido.referencia}` : 'Nueva Orden de Compra'}
            </h2>
            {pedido && (
              <EstadoBadge text={pedido.estado.replace('_', ' ')} color={ESTADO_OC_COLOR[pedido.estado]} />
            )}
          </div>
          <button onClick={onClose}><X size={18} className="text-slate-400" /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-3 py-2 space-y-4">
          {/* Cabecera */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Proveedor *</label>
              <select
                className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-400"
                value={form.proveedorId}
                disabled={readonly}
                onChange={e => setForm(f => ({ ...f, proveedorId: e.target.value }))}
              >
                <option value="">Seleccionar…</option>
                {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Almacén destino</label>
              <select
                className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-400"
                value={form.almacenId}
                disabled={readonly}
                onChange={e => setForm(f => ({ ...f, almacenId: e.target.value }))}
              >
                <option value="">Sin especificar</option>
                {almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Estado</label>
              <select
                className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-400"
                value={form.estado}
                onChange={e => setForm(f => ({ ...f, estado: e.target.value as EstadoPedidoCompra }))}
              >
                {(Object.keys(ESTADO_OC_COLOR) as EstadoPedidoCompra[]).map(e => (
                  <option key={e} value={e}>{e.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Fecha</label>
              <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-400"
                value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Fecha entrega esperada</label>
              <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-400"
                value={form.fechaEntrega} onChange={e => setForm(f => ({ ...f, fechaEntrega: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Notas</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-400"
                value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} />
            </div>
          </div>

          {/* Líneas */}
          <CompraLineasEditor lineas={lineas} onChange={setLineas} readonly={readonly} />

          {/* Totales */}
          <div className="flex justify-end">
            <div className="w-72 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Subtotal</span>
                <span className="font-medium">{fmt(totales.subtotal)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Dto global %</span>
                <input type="number" min="0" max="100"
                  className="w-20 text-right border border-slate-200 rounded px-1 py-0.5 text-sm outline-none"
                  value={form.descuentoGlobal}
                  onChange={e => setForm(f => ({ ...f, descuentoGlobal: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Base imponible</span>
                <span className="font-medium">{fmt(totales.baseImponible)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">IVA</span>
                <select className="border border-slate-200 rounded px-1 py-0.5 text-sm outline-none"
                  value={form.ivaPorcentaje}
                  onChange={e => setForm(f => ({ ...f, ivaPorcentaje: Number(e.target.value) }))}>
                  <option value={0}>0%</option>
                  <option value={4}>4%</option>
                  <option value={10}>10%</option>
                  <option value={21}>21%</option>
                </select>
                <span className="font-medium">{fmt(totales.iva)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2">
                <span className="font-semibold text-slate-800">TOTAL</span>
                <span className="font-bold text-base text-slate-900">{fmt(totales.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {!readonly && (
          <div className="flex justify-end gap-3 px-3 py-2 border-t border-slate-100">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Guardando…' : 'Guardar OC'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Modal Recepción ──────────────────────────────────────────────────────────

interface RecepcionModalProps {
  recepcion?: Recepcion | null;
  lineasIniciales?: RecepcionLinea[];
  proveedores: Proveedor[];
  almacenes: Almacen[];
  currentUser: User;
  onSave: (data: Omit<Recepcion, 'id' | 'referencia' | 'createdAt'>, lineas: RecepcionLinea[]) => Promise<void>;
  onConfirmar?: (id: string) => Promise<void>;
  onClose: () => void;
}

const RecepcionModal: React.FC<RecepcionModalProps> = ({
  recepcion, lineasIniciales, proveedores, almacenes, currentUser, onSave, onConfirmar, onClose,
}) => {
  const [form, setForm] = useState({
    almacenId: recepcion?.almacenId || '',
    proveedorId: recepcion?.proveedorId || '',
    proveedorNombre: recepcion?.proveedorNombre || '',
    fecha: recepcion?.fecha || new Date().toISOString().slice(0, 10),
    albaranProveedor: recepcion?.albaranProveedor || '',
    notas: recepcion?.notas || '',
  });
  const [lineas, setLineas] = useState<RecepcionLinea[]>(lineasIniciales || []);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const readonly = recepcion?.estado === 'confirmada' || recepcion?.estado === 'anulada';
  const total = lineas.reduce((s, l) => s + l.subtotal, 0);

  const updateLinea = (i: number, changes: Partial<RecepcionLinea>) => {
    setLineas(prev => prev.map((l, idx) => {
      if (idx !== i) return l;
      const next = { ...l, ...changes };
      next.subtotal = next.cantidad * next.precioCoste;
      return next;
    }));
  };

  const handleSave = async () => {
    if (!form.almacenId) { alert('Selecciona un almacén'); return; }
    setSaving(true);
    try {
      const prov = proveedores.find(p => p.id === form.proveedorId);
      await onSave({
        ...form,
        proveedorNombre: prov?.nombre,
        estado: 'borrador',
        total,
        createdBy: currentUser.id,
      }, lineas);
      onClose();
    } catch (err) { alert(err instanceof Error ? err.message : 'Error'); }
    finally { setSaving(false); }
  };

  const handleConfirmar = async () => {
    if (!recepcion || !onConfirmar) return;
    if (!confirm('¿Confirmar la recepción? Se actualizará el stock y no podrá deshacerse.')) return;
    setConfirming(true);
    try { await onConfirmar(recepcion.id); onClose(); }
    catch (err) { alert(err instanceof Error ? err.message : 'Error'); }
    finally { setConfirming(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-800">
              {recepcion ? `Recepción: ${recepcion.referencia}` : 'Nueva Recepción'}
            </h2>
            {recepcion && (
              <EstadoBadge text={recepcion.estado} color={ESTADO_REC_COLOR[recepcion.estado]} />
            )}
          </div>
          <button onClick={onClose}><X size={18} className="text-slate-400" /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-3 py-2 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Almacén *</label>
              <select disabled={readonly}
                className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-400"
                value={form.almacenId}
                onChange={e => setForm(f => ({ ...f, almacenId: e.target.value }))}>
                <option value="">Seleccionar…</option>
                {almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Proveedor</label>
              <select disabled={readonly}
                className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-400"
                value={form.proveedorId}
                onChange={e => setForm(f => ({ ...f, proveedorId: e.target.value }))}>
                <option value="">Sin especificar</option>
                {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Fecha</label>
              <input type="date" disabled={readonly}
                className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-400"
                value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Albarán proveedor</label>
              <input disabled={readonly}
                className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-400"
                value={form.albaranProveedor} onChange={e => setForm(f => ({ ...f, albaranProveedor: e.target.value }))} />
            </div>
          </div>

          {/* Líneas */}
          <div className="border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs text-slate-500 uppercase">
                  <th className="px-3 py-2 text-left w-8">#</th>
                  <th className="px-3 py-2 text-left">Descripción</th>
                  <th className="px-3 py-2 text-right w-24">Cant.</th>
                  <th className="px-3 py-2 text-right w-28">Precio coste</th>
                  <th className="px-3 py-2 text-right w-28">Subtotal</th>
                  {!readonly && <th className="w-8" />}
                </tr>
              </thead>
              <tbody>
                {lineas.map((l, i) => (
                  <tr key={i} className="border-t border-slate-100 group hover:bg-slate-50">
                    <td className="px-3 py-1.5 text-xs text-slate-400">{i + 1}</td>
                    <td className="px-2 py-1.5">
                      {readonly
                        ? <span className="text-sm">{l.descripcion}</span>
                        : <input className="w-full text-sm border-0 bg-transparent outline-none focus:bg-white"
                            value={l.descripcion} onChange={e => updateLinea(i, { descripcion: e.target.value })} />
                      }
                    </td>
                    <td className="px-2 py-1.5 w-24">
                      {readonly
                        ? <span className="text-sm text-right block">{l.cantidad}</span>
                        : <input type="number" min="0" step="0.01"
                            className="w-full text-sm text-right border-0 bg-transparent outline-none focus:bg-white"
                            value={l.cantidad} onChange={e => updateLinea(i, { cantidad: parseFloat(e.target.value) || 0 })} />
                      }
                    </td>
                    <td className="px-2 py-1.5 w-28">
                      {readonly
                        ? <span className="text-sm text-right block">{fmt(l.precioCoste)}</span>
                        : <input type="number" min="0" step="0.0001"
                            className="w-full text-sm text-right border-0 bg-transparent outline-none focus:bg-white"
                            value={l.precioCoste} onChange={e => updateLinea(i, { precioCoste: parseFloat(e.target.value) || 0 })} />
                      }
                    </td>
                    <td className="px-3 py-1.5 text-right text-sm font-semibold">{fmt(l.subtotal)}</td>
                    {!readonly && (
                      <td className="px-2 py-1.5">
                        <button onClick={() => setLineas(prev => prev.filter((_, idx) => idx !== i))}
                          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600">
                          <X size={13} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {lineas.length === 0 && (
                  <tr><td colSpan={readonly ? 5 : 6} className="px-4 py-8 text-center text-slate-400 text-sm italic">Sin líneas.</td></tr>
                )}
              </tbody>
            </table>
            <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-t border-slate-200">
              {!readonly
                ? <button onClick={() => setLineas(prev => [...prev, { orden: prev.length + 1, descripcion: '', cantidad: 1, precioCoste: 0, subtotal: 0 }])}
                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium">
                    <Plus size={15} /> Añadir línea
                  </button>
                : <div />
              }
              <div className="text-sm font-semibold">Total: <span className="text-slate-900 ml-1">{fmt(total)}</span></div>
            </div>
          </div>
        </div>

        <div className="flex justify-between gap-3 px-3 py-2 border-t border-slate-100">
          <div>
            {recepcion?.estado === 'borrador' && onConfirmar && (
              <button onClick={handleConfirmar} disabled={confirming}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                <Check size={15} /> {confirming ? 'Confirmando…' : 'Confirmar y actualizar stock'}
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">
              {readonly ? 'Cerrar' : 'Cancelar'}
            </button>
            {!readonly && (
              <button onClick={handleSave} disabled={saving}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Modal Traspaso ───────────────────────────────────────────────────────────

interface TraspasoModalProps {
  traspaso?: Traspaso | null;
  lineasIniciales?: TraspasoLinea[];
  almacenes: Almacen[];
  currentUser: User;
  onSave: (data: Omit<Traspaso, 'id' | 'referencia' | 'createdAt'>, lineas: TraspasoLinea[]) => Promise<void>;
  onEnviar?: (id: string) => Promise<void>;
  onConfirmar?: (id: string, firma: string, nombre: string) => Promise<void>;
  onClose: () => void;
}

const TraspasoModal: React.FC<TraspasoModalProps> = ({
  traspaso, lineasIniciales, almacenes, currentUser, onSave, onEnviar, onConfirmar, onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [firmaNombre, setFirmaNombre] = useState('');
  const [form, setForm] = useState({
    almacenOrigenId: traspaso?.almacenOrigenId || '',
    almacenDestinoId: traspaso?.almacenDestinoId || '',
    fecha: traspaso?.fecha || new Date().toISOString().slice(0, 10),
    notas: traspaso?.notas || '',
  });
  const [lineas, setLineas] = useState<TraspasoLinea[]>(lineasIniciales || []);
  const [saving, setSaving] = useState(false);

  const readonly = traspaso?.estado === 'confirmado' || traspaso?.estado === 'anulado';
  const canSign = traspaso?.estado === 'en_transito';

  // Canvas firma
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  }, [canSign]);

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const pos = getPos(e, canvas);
    ctx.beginPath(); ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y); ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 2; ctx.stroke();
  };

  const stopDraw = () => setIsDrawing(false);
  const clearFirma = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const handleSave = async () => {
    if (!form.almacenOrigenId || !form.almacenDestinoId) { alert('Selecciona almacenes'); return; }
    if (form.almacenOrigenId === form.almacenDestinoId) { alert('Origen y destino deben ser distintos'); return; }
    setSaving(true);
    try {
      const almOrigen = almacenes.find(a => a.id === form.almacenOrigenId);
      const almDestino = almacenes.find(a => a.id === form.almacenDestinoId);
      await onSave({
        ...form,
        almacenOrigenNombre: almOrigen?.nombre,
        almacenDestinoNombre: almDestino?.nombre,
        estado: 'borrador',
        createdBy: currentUser.id,
      }, lineas);
      onClose();
    } catch (err) { alert(err instanceof Error ? err.message : 'Error'); }
    finally { setSaving(false); }
  };

  const handleConfirmar = async () => {
    if (!traspaso || !onConfirmar) return;
    if (!firmaNombre.trim()) { alert('Introduce el nombre del receptor'); return; }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const firma = canvas.toDataURL('image/png');
    setSaving(true);
    try { await onConfirmar(traspaso.id, firma, firmaNombre); onClose(); }
    catch (err) { alert(err instanceof Error ? err.message : 'Error'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-800">
              {traspaso ? `Traspaso: ${traspaso.referencia}` : 'Nuevo Traspaso'}
            </h2>
            {traspaso && (
              <EstadoBadge text={traspaso.estado.replace('_', ' ')} color={ESTADO_TRA_COLOR[traspaso.estado]} />
            )}
          </div>
          <button onClick={onClose}><X size={18} className="text-slate-400" /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-3 py-2 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Almacén origen *</label>
              <select disabled={readonly || !!traspaso}
                className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-400"
                value={form.almacenOrigenId}
                onChange={e => setForm(f => ({ ...f, almacenOrigenId: e.target.value }))}>
                <option value="">Seleccionar…</option>
                {almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Almacén destino *</label>
              <select disabled={readonly || !!traspaso}
                className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-400"
                value={form.almacenDestinoId}
                onChange={e => setForm(f => ({ ...f, almacenDestinoId: e.target.value }))}>
                <option value="">Seleccionar…</option>
                {almacenes.filter(a => a.id !== form.almacenOrigenId).map(a => (
                  <option key={a.id} value={a.id}>{a.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Fecha</label>
              <input type="date" disabled={readonly}
                className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-400"
                value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Notas</label>
              <input disabled={readonly}
                className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-400"
                value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} />
            </div>
          </div>

          {/* Líneas */}
          <div className="border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs text-slate-500 uppercase">
                  <th className="px-3 py-2 text-left w-8">#</th>
                  <th className="px-3 py-2 text-left">Descripción</th>
                  <th className="px-3 py-2 text-right w-24">Cantidad</th>
                  {!readonly && <th className="w-8" />}
                </tr>
              </thead>
              <tbody>
                {lineas.map((l, i) => (
                  <tr key={i} className="border-t border-slate-100 group hover:bg-slate-50">
                    <td className="px-3 py-1.5 text-xs text-slate-400">{i + 1}</td>
                    <td className="px-2 py-1.5">
                      {readonly
                        ? <span className="text-sm">{l.descripcion}</span>
                        : <input className="w-full text-sm border-0 bg-transparent outline-none focus:bg-white"
                            value={l.descripcion}
                            onChange={e => setLineas(prev => prev.map((li, idx) => idx === i ? { ...li, descripcion: e.target.value } : li))} />
                      }
                    </td>
                    <td className="px-2 py-1.5 w-24">
                      {readonly
                        ? <span className="text-sm text-right block">{l.cantidad}</span>
                        : <input type="number" min="0" step="0.01"
                            className="w-full text-sm text-right border-0 bg-transparent outline-none focus:bg-white"
                            value={l.cantidad}
                            onChange={e => setLineas(prev => prev.map((li, idx) => idx === i ? { ...li, cantidad: parseFloat(e.target.value) || 0 } : li))} />
                      }
                    </td>
                    {!readonly && (
                      <td className="px-2 py-1.5">
                        <button onClick={() => setLineas(prev => prev.filter((_, idx) => idx !== i))}
                          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600">
                          <X size={13} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {lineas.length === 0 && (
                  <tr><td colSpan={readonly ? 3 : 4} className="px-4 py-8 text-center text-slate-400 text-sm italic">Sin líneas.</td></tr>
                )}
              </tbody>
            </table>
            {!readonly && (
              <div className="px-3 py-2 bg-slate-50 border-t border-slate-200">
                <button onClick={() => setLineas(prev => [...prev, { orden: prev.length + 1, descripcion: '', cantidad: 1 }])}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium">
                  <Plus size={15} /> Añadir línea
                </button>
              </div>
            )}
          </div>

          {/* Panel de firma para confirmar recepción en destino */}
          {canSign && (
            <div className="border border-amber-200 rounded-xl p-4 bg-amber-50">
              <p className="text-sm font-medium text-amber-800 mb-3">Firma de recepción en almacén destino</p>
              <div className="mb-3">
                <label className="block text-xs font-medium text-slate-600 mb-1">Nombre del receptor</label>
                <input className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-400"
                  value={firmaNombre} onChange={e => setFirmaNombre(e.target.value)}
                  placeholder="Nombre y apellidos…" />
              </div>
              <canvas
                ref={canvasRef}
                width={500} height={120}
                className="w-full border border-slate-300 rounded-lg bg-white cursor-crosshair touch-none"
                onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
                onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
              />
              <button onClick={clearFirma} className="mt-2 text-xs text-slate-500 hover:text-slate-700 underline">
                Borrar firma
              </button>
            </div>
          )}

          {traspaso?.firmaRecepcion && (
            <div className="border border-green-200 rounded-xl p-4 bg-green-50">
              <p className="text-sm font-medium text-green-800 mb-2">Firmado por: {traspaso.firmaNombre}</p>
              <img src={traspaso.firmaRecepcion} alt="Firma" className="max-h-20 border border-green-300 rounded" />
            </div>
          )}
        </div>

        <div className="flex justify-between gap-3 px-3 py-2 border-t border-slate-100">
          <div className="flex gap-2">
            {traspaso?.estado === 'borrador' && onEnviar && (
              <button onClick={() => onEnviar(traspaso.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600">
                <Truck size={15} /> Enviar en tránsito
              </button>
            )}
            {canSign && onConfirmar && (
              <button onClick={handleConfirmar} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                <Check size={15} /> {saving ? 'Confirmando…' : 'Confirmar recepción'}
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">
              {readonly ? 'Cerrar' : 'Cancelar'}
            </button>
            {!traspaso && (
              <button onClick={handleSave} disabled={saving}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Guardando…' : 'Crear traspaso'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Vista principal ──────────────────────────────────────────────────────────

interface ComprasViewProps {
  currentUser: User;
  almacenes: Almacen[];
}

export const ComprasView: React.FC<ComprasViewProps> = ({ currentUser, almacenes }) => {
  const {
    proveedores, pedidosCompra, recepciones, traspasos,
    loading, error, reload,
    createProveedor, updateProveedor,
    createPedidoCompra, updatePedidoCompra, loadPedidoLineas,
    createRecepcion, confirmarRecepcion, loadRecepcionLineas,
    createTraspaso, updateTraspasoEstado, confirmarTraspaso, loadTraspasoLineas,
  } = useCompras();

  const [tab, setTab] = useState<Tab>('proveedores');
  const [search, setSearch] = useState('');

  // Modals
  const [showProvModal, setShowProvModal] = useState(false);
  const [editProveedor, setEditProveedor] = useState<Proveedor | null>(null);

  const [showOCModal, setShowOCModal] = useState(false);
  const [editOC, setEditOC] = useState<PedidoCompra | null>(null);
  const [editOCLineas, setEditOCLineas] = useState<CompraLinea[]>([]);

  const [showRecModal, setShowRecModal] = useState(false);
  const [editRec, setEditRec] = useState<Recepcion | null>(null);
  const [editRecLineas, setEditRecLineas] = useState<RecepcionLinea[]>([]);

  const [showTraModal, setShowTraModal] = useState(false);
  const [editTra, setEditTra] = useState<Traspaso | null>(null);
  const [editTraLineas, setEditTraLineas] = useState<TraspasoLinea[]>([]);

  const openOC = async (oc?: PedidoCompra) => {
    if (oc) {
      const lineas = await loadPedidoLineas(oc.id);
      setEditOCLineas(lineas);
      setEditOC(oc);
    } else {
      setEditOCLineas([]);
      setEditOC(null);
    }
    setShowOCModal(true);
  };

  const openRec = async (rec?: Recepcion) => {
    if (rec) {
      const lineas = await loadRecepcionLineas(rec.id);
      setEditRecLineas(lineas);
      setEditRec(rec);
    } else {
      setEditRecLineas([]);
      setEditRec(null);
    }
    setShowRecModal(true);
  };

  const openTra = async (tra?: Traspaso) => {
    if (tra) {
      const lineas = await loadTraspasoLineas(tra.id);
      setEditTraLineas(lineas);
      setEditTra(tra);
    } else {
      setEditTraLineas([]);
      setEditTra(null);
    }
    setShowTraModal(true);
  };

  // Filtros de búsqueda
  const q = search.toLowerCase();
  const filteredProv = proveedores.filter(p => p.nombre.toLowerCase().includes(q) || (p.cif || '').toLowerCase().includes(q));
  const filteredOC = pedidosCompra.filter(p =>
    p.referencia.toLowerCase().includes(q) || (p.proveedorNombre || '').toLowerCase().includes(q));
  const filteredRec = recepciones.filter(r =>
    r.referencia.toLowerCase().includes(q) || (r.proveedorNombre || '').toLowerCase().includes(q));
  const filteredTra = traspasos.filter(t =>
    t.referencia.toLowerCase().includes(q) ||
    (t.almacenOrigenNombre || '').toLowerCase().includes(q) ||
    (t.almacenDestinoNombre || '').toLowerCase().includes(q));

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-slate-400 text-sm">Cargando compras…</div>
    </div>
  );

  if (error) return (
    <div className="p-4">
      <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
        <AlertCircle size={18} className="text-red-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-red-800">Error al cargar</p>
          <p className="text-xs text-red-600 mt-1">{error}</p>
          <p className="text-xs text-red-500 mt-2">Si es la primera vez, ejecuta <code className="bg-red-100 px-1 rounded">paso3_compras_almacen.sql</code></p>
        </div>
      </div>
    </div>
  );

  // ─── derived new-button label ────────────────────────────────────────────────
  const newLabel = tab === 'proveedores' ? 'Nuevo proveedor'
    : tab === 'pedidos' ? 'Nueva OC'
    : tab === 'recepciones' ? 'Nueva recepción'
    : 'Nuevo traspaso';

  const handleNew = () => {
    if (tab === 'proveedores') { setEditProveedor(null); setShowProvModal(true); }
    else if (tab === 'pedidos') openOC();
    else if (tab === 'recepciones') openRec();
    else openTra();
  };

  const currentCount = tab === 'proveedores' ? filteredProv.length
    : tab === 'pedidos' ? filteredOC.length
    : tab === 'recepciones' ? filteredRec.length
    : filteredTra.length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Module header ──────────────────────────────────────────────────── */}
      <div className="shrink-0 bg-gradient-to-r from-slate-700 to-slate-600 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingCart size={13} className="text-slate-300" />
          <span className="text-white font-semibold text-[13px]">Compras y Almacén</span>
        </div>
        <button onClick={reload} title="Actualizar" className="text-slate-400 hover:text-white transition-colors">
          <RefreshCw size={13} />
        </button>
      </div>

      {/* ── Tab strip ──────────────────────────────────────────────────────── */}
      <SageTabStrip
        tabs={[
          { id: 'proveedores', label: 'Proveedores',       icon: Package,       count: proveedores.length },
          { id: 'pedidos',     label: 'Órdenes de Compra', icon: ShoppingCart,  count: pedidosCompra.length },
          { id: 'recepciones', label: 'Recepciones',       icon: Truck,         count: recepciones.length },
          { id: 'traspasos',   label: 'Traspasos',         icon: ArrowLeftRight, count: traspasos.length },
        ]}
        active={tab}
        onChange={(id) => setTab(id as Tab)}
      />

      {/* ── Toolbar ────────────────────────────────────────────────────────── */}
      <SageToolbar
        groups={[[
          { label: newLabel, icon: Plus, onClick: handleNew, variant: 'primary' },
        ]]}
        filter={<SageFilterInput value={search} onChange={setSearch} placeholder="Buscar…" />}
        recordCount={currentCount}
      />

      {/* ── Table content ──────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0">

      {/* Tabla Proveedores */}
      {tab === 'proveedores' && (
        <table className="w-full">
          <thead className="sticky top-0 bg-slate-50 border-b border-slate-200">
            <tr>
              <th className={sageTh}>Nombre</th>
              <th className={sageTh}>CIF</th>
              <th className={sageTh}>Contacto</th>
              <th className={sageTh}>Teléfono</th>
              <th className={sageTh}>Email</th>
              <th className={sageThR}>Días pago</th>
              <th className="w-8 px-2"></th>
            </tr>
          </thead>
          <tbody>
            {filteredProv.map((p, idx) => (
              <tr key={p.id} className={sageRowClass(false, idx % 2 === 1)}>
                <td className="px-2 py-1">
                  <div className="text-[12px] font-medium text-slate-800">{p.nombre}</div>
                  {p.codigo && <div className="text-[11px] text-slate-400">{p.codigo}</div>}
                </td>
                <td className="px-2 py-1 text-[12px] text-slate-600">{p.cif || '—'}</td>
                <td className="px-2 py-1 text-[12px] text-slate-600">{p.contacto || '—'}</td>
                <td className="px-2 py-1 text-[12px] text-slate-600">{p.telefono || '—'}</td>
                <td className="px-2 py-1 text-[12px] text-slate-600">{p.email || '—'}</td>
                <td className="px-2 py-1 text-right text-[12px] text-slate-600">{p.diasPago || 30}d</td>
                <td className="px-2 py-1">
                  <button onClick={() => { setEditProveedor(p); setShowProvModal(true); }}
                    className="text-slate-400 hover:text-blue-600">
                    <Pencil size={13} />
                  </button>
                </td>
              </tr>
            ))}
            {filteredProv.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400 text-sm italic">
                Sin proveedores. Pulsa &quot;Nuevo proveedor&quot; para empezar.
              </td></tr>
            )}
          </tbody>
        </table>
      )}

      {/* Tabla Órdenes de Compra */}
      {tab === 'pedidos' && (
        <table className="w-full">
          <thead className="sticky top-0 bg-slate-50 border-b border-slate-200">
            <tr>
              <th className={sageTh}>Referencia</th>
              <th className={sageTh}>Proveedor</th>
              <th className={sageTh}>Fecha</th>
              <th className={sageTh}>Entrega</th>
              <th className={sageTh}>Estado</th>
              <th className={sageThR}>Total</th>
              <th className="w-8 px-2"></th>
            </tr>
          </thead>
          <tbody>
            {filteredOC.map((oc, idx) => (
              <tr key={oc.id} className={sageRowClass(false, idx % 2 === 1)}>
                <td className="px-2 py-1 text-[12px] font-medium text-blue-700">{oc.referencia}</td>
                <td className="px-2 py-1 text-[12px] text-slate-700">{oc.proveedorNombre || '—'}</td>
                <td className="px-2 py-1 text-[12px] text-slate-600 whitespace-nowrap">{oc.fecha}</td>
                <td className="px-2 py-1 text-[12px] text-slate-600 whitespace-nowrap">{oc.fechaEntrega || '—'}</td>
                <td className="px-2 py-1">
                  <EstadoBadge text={oc.estado.replace('_', ' ')} color={ESTADO_OC_COLOR[oc.estado]} />
                </td>
                <td className="px-2 py-1 text-right text-[12px] font-semibold text-slate-800">{fmt(oc.total)}</td>
                <td className="px-2 py-1">
                  <button onClick={() => openOC(oc)} className="text-slate-400 hover:text-blue-600">
                    <Eye size={13} />
                  </button>
                  </td>
                </tr>
              ))}
              {filteredOC.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400 text-sm italic">
                  Sin órdenes de compra.
                </td></tr>
              )}
            </tbody>
          </table>
      )}

      {/* Tabla Recepciones */}
      {tab === 'recepciones' && (
        <table className="w-full">
          <thead className="sticky top-0 bg-slate-50 border-b border-slate-200">
            <tr>
              <th className={sageTh}>Referencia</th>
              <th className={sageTh}>Proveedor</th>
              <th className={sageTh}>Almacén</th>
              <th className={sageTh}>Fecha</th>
              <th className={sageTh}>Estado</th>
              <th className={sageThR}>Total</th>
              <th className="w-8 px-2"></th>
            </tr>
          </thead>
          <tbody>
            {filteredRec.map((rec, idx) => (
              <tr key={rec.id} className={sageRowClass(false, idx % 2 === 1)}>
                <td className="px-2 py-1 text-[12px] font-medium text-blue-700">{rec.referencia}</td>
                <td className="px-2 py-1 text-[12px] text-slate-700">{rec.proveedorNombre || '—'}</td>
                <td className="px-2 py-1 text-[12px] text-slate-600">{rec.almacenNombre || rec.almacenId}</td>
                <td className="px-2 py-1 text-[12px] text-slate-600 whitespace-nowrap">{rec.fecha}</td>
                <td className="px-2 py-1">
                  <EstadoBadge text={rec.estado} color={ESTADO_REC_COLOR[rec.estado]} />
                </td>
                <td className="px-2 py-1 text-right text-[12px] font-semibold text-slate-800">{fmt(rec.total)}</td>
                <td className="px-2 py-1">
                  <button onClick={() => openRec(rec)} className="text-slate-400 hover:text-blue-600">
                    <Eye size={13} />
                  </button>
                </td>
              </tr>
            ))}
            {filteredRec.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400 text-sm italic">
                Sin recepciones.
              </td></tr>
            )}
          </tbody>
        </table>
      )}

      {/* Tabla Traspasos */}
      {tab === 'traspasos' && (
        <table className="w-full">
          <thead className="sticky top-0 bg-slate-50 border-b border-slate-200">
            <tr>
              <th className={sageTh}>Referencia</th>
              <th className={sageTh}>Origen</th>
              <th className={sageTh}>Destino</th>
              <th className={sageTh}>Fecha</th>
              <th className={sageTh}>Estado</th>
              <th className="w-8 px-2"></th>
            </tr>
          </thead>
          <tbody>
            {filteredTra.map((tra, idx) => (
              <tr key={tra.id} className={sageRowClass(false, idx % 2 === 1)}>
                <td className="px-2 py-1 text-[12px] font-medium text-blue-700">{tra.referencia}</td>
                <td className="px-2 py-1 text-[12px] text-slate-700">{tra.almacenOrigenNombre || tra.almacenOrigenId}</td>
                <td className="px-2 py-1 text-[12px] text-slate-700">{tra.almacenDestinoNombre || tra.almacenDestinoId}</td>
                <td className="px-2 py-1 text-[12px] text-slate-600 whitespace-nowrap">{tra.fecha}</td>
                <td className="px-2 py-1">
                  <EstadoBadge text={tra.estado.replace('_', ' ')} color={ESTADO_TRA_COLOR[tra.estado]} />
                </td>
                <td className="px-2 py-1">
                  <button onClick={() => openTra(tra)} className="text-slate-400 hover:text-blue-600">
                    <Eye size={13} />
                  </button>
                </td>
              </tr>
            ))}
            {filteredTra.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400 text-sm italic">
                Sin traspasos.
              </td></tr>
            )}
          </tbody>
        </table>
      )}

      </div>{/* end flex-1 table area */}

      {/* ── Modals ─────────────────────────────────────── */}

      {showProvModal && (
        <ProveedorModal
          proveedor={editProveedor}
          onSave={async (data) => {
            if (editProveedor) await updateProveedor(editProveedor.id, data);
            else await createProveedor(data);
          }}
          onClose={() => setShowProvModal(false)}
        />
      )}

      {showOCModal && (
        <PedidoCompraModal
          pedido={editOC}
          lineasIniciales={editOCLineas}
          proveedores={proveedores}
          almacenes={almacenes}
          currentUser={currentUser}
          onSave={async (data, lineas) => {
            if (editOC) await updatePedidoCompra(editOC.id, data, lineas);
            else await createPedidoCompra(data, lineas);
          }}
          onClose={() => setShowOCModal(false)}
        />
      )}

      {showRecModal && (
        <RecepcionModal
          recepcion={editRec}
          lineasIniciales={editRecLineas}
          proveedores={proveedores}
          almacenes={almacenes}
          currentUser={currentUser}
          onSave={async (data, lineas) => {
            await createRecepcion(data, lineas);
          }}
          onConfirmar={async (id) => {
            await confirmarRecepcion(id, currentUser.id);
          }}
          onClose={() => setShowRecModal(false)}
        />
      )}

      {showTraModal && (
        <TraspasoModal
          traspaso={editTra}
          lineasIniciales={editTraLineas}
          almacenes={almacenes}
          currentUser={currentUser}
          onSave={async (data, lineas) => {
            await createTraspaso(data, lineas);
          }}
          onEnviar={async (id) => {
            await updateTraspasoEstado(id, 'en_transito');
            setEditTra(prev => prev ? { ...prev, estado: 'en_transito' } : prev);
          }}
          onConfirmar={async (id, firma, nombre) => {
            await confirmarTraspaso(id, currentUser.id);
            await updateTraspasoEstado(id, 'confirmado', { firma, nombre });
          }}
          onClose={() => setShowTraModal(false)}
        />
      )}
    </div>
  );
};
