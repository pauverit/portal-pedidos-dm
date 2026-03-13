import React, { useState, useEffect, useRef } from 'react';
import {
  X, Save, Send, FileText, Truck, CheckCircle, Printer,
  AlertCircle, Loader2, PenTool
} from 'lucide-react';
import {
  Presupuesto, PedidoVenta, Albaran, Factura,
  DocumentoLinea, User, Empresa, Delegacion, Almacen
} from '../types';
import { LineItemsEditor } from './LineItemsEditor';
import { calcularTotalesLineas, calcularSubtotalLinea } from '../hooks/useVentas';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

// ─── Firma canvas ─────────────────────────────────────────────────────────────

const FirmaCanvas: React.FC<{
  firmaNombre: string;
  onFirmaNombreChange: (v: string) => void;
  onFirma: (base64: string) => void;
}> = ({ firmaNombre, onFirmaNombreChange, onFirma }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawing.current = true;
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e, canvas);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1e293b';
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDraw = () => { drawing.current = false; };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const confirm = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onFirma(canvas.toDataURL('image/png'));
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-slate-600">Nombre del firmante</label>
        <input
          className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
          placeholder="Nombre completo"
          value={firmaNombre}
          onChange={e => onFirmaNombreChange(e.target.value)}
        />
      </div>
      <div>
        <label className="text-xs font-medium text-slate-600">Firma del cliente</label>
        <canvas
          ref={canvasRef}
          width={460}
          height={140}
          className="mt-1 w-full border-2 border-dashed border-slate-300 rounded-xl bg-white cursor-crosshair touch-none"
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
          onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
        />
        <div className="flex gap-2 mt-2">
          <button onClick={clear} className="text-xs text-slate-500 hover:text-slate-700 underline">
            Borrar firma
          </button>
          <button
            onClick={confirm}
            disabled={!firmaNombre.trim()}
            className="ml-auto flex items-center gap-1.5 bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-40"
          >
            <CheckCircle size={14} /> Confirmar firma
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Totales footer ───────────────────────────────────────────────────────────

const TotalesFooter: React.FC<{
  subtotal: number;
  descuentoGlobal: number;
  baseImponible: number;
  ivaPorcentaje: number;
  iva: number;
  total: number;
  onDescuentoChange?: (v: number) => void;
  onIvaChange?: (v: number) => void;
  readonly?: boolean;
}> = ({ subtotal, descuentoGlobal, baseImponible, ivaPorcentaje, iva, total, onDescuentoChange, onIvaChange, readonly }) => (
  <div className="flex justify-end">
    <div className="w-80 space-y-1.5 bg-slate-50 rounded-xl p-4 border border-slate-200">
      <div className="flex justify-between text-sm">
        <span className="text-slate-600">Subtotal</span>
        <span className="font-medium">{fmt(subtotal)}</span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-600">Descuento global</span>
        {!readonly && onDescuentoChange ? (
          <div className="flex items-center gap-1">
            <input
              type="number" min="0" max="100" step="0.5"
              className="w-16 text-right border border-slate-200 rounded px-1.5 py-0.5 text-sm"
              value={descuentoGlobal}
              onChange={e => onDescuentoChange(Number(e.target.value))}
            />
            <span className="text-slate-500 text-xs">%</span>
          </div>
        ) : (
          <span>{descuentoGlobal > 0 ? `−${fmt(subtotal * descuentoGlobal / 100)} (${descuentoGlobal}%)` : '—'}</span>
        )}
      </div>
      <div className="flex justify-between text-sm border-t border-slate-200 pt-1.5">
        <span className="text-slate-600">Base imponible</span>
        <span className="font-medium">{fmt(baseImponible)}</span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-600">IVA</span>
        {!readonly && onIvaChange ? (
          <div className="flex items-center gap-1">
            <select
              className="border border-slate-200 rounded px-1.5 py-0.5 text-sm"
              value={ivaPorcentaje}
              onChange={e => onIvaChange(Number(e.target.value))}
            >
              <option value={0}>0%</option>
              <option value={4}>4%</option>
              <option value={10}>10%</option>
              <option value={21}>21%</option>
            </select>
            <span className="text-slate-500">{fmt(iva)}</span>
          </div>
        ) : (
          <span>{ivaPorcentaje}% — {fmt(iva)}</span>
        )}
      </div>
      <div className="flex justify-between text-base font-bold border-t-2 border-slate-300 pt-2 text-slate-900">
        <span>TOTAL</span>
        <span className="text-green-700">{fmt(total)}</span>
      </div>
    </div>
  </div>
);

// ─── Tipos del modal ──────────────────────────────────────────────────────────

type DocTipo = 'presupuesto' | 'pedido' | 'albaran' | 'factura';

// Tipo base para el documento inicial (unión laxa de los campos posibles)
type DocumentoInicial = {
  id?: string;
  referencia?: string;
  empresaId?: string;
  delegacionId?: string;
  almacenId?: string;
  clienteId?: string;
  clienteNombre?: string;
  fecha?: string;
  fechaValidez?: string;
  fechaEntrega?: string;
  fechaVencimiento?: string;
  estado?: string;
  subtotal?: number;
  descuentoGlobal?: number;
  baseImponible?: number;
  ivaPorcentaje?: number;
  iva?: number;
  total?: number;
  notas?: string;
  condiciones?: string;
  metodoEnvio?: string;
  metodoCobro?: string;
  fechaCobro?: string;
  firmaCliente?: string;
  firmaNombre?: string;
  serie?: string;
  numero?: number;
  verifactuHash?: string;
};

interface DocumentoModalProps {
  tipo: DocTipo;
  inicial?: DocumentoInicial;
  lineasIniciales?: DocumentoLinea[];
  empresas: Empresa[];
  delegaciones: Delegacion[];
  almacenes: Almacen[];
  clientes: User[];
  productos: { id: string; name: string; reference: string; price: number }[];
  currentUser: User;
  onClose: () => void;
  onSave: (data: any, lineas: DocumentoLinea[]) => Promise<void>;
  // Acciones secundarias opcionales
  onConvertirPedido?: () => void;
  onGenerarAlbaran?: () => void;
  onGenerarFactura?: () => void;
  onFirmar?: (base64: string, nombre: string) => Promise<void>;
  onMarcarCobrada?: (metodo: string, fecha: string) => Promise<void>;
  readonly?: boolean;
}

export const DocumentoModal: React.FC<DocumentoModalProps> = ({
  tipo, inicial = {} as DocumentoInicial, lineasIniciales = [], empresas, delegaciones, almacenes,
  clientes, productos, currentUser, onClose, onSave,
  onConvertirPedido, onGenerarAlbaran, onGenerarFactura,
  onFirmar, onMarcarCobrada, readonly = false,
}) => {
  const today = new Date().toISOString().split('T')[0];

  // ── Estado del formulario ─────────────────────────────────
  const [empresaId, setEmpresaId]           = useState(inicial.empresaId || empresas[0]?.id || '');
  const [delegacionId, setDelegacionId]     = useState(inicial.delegacionId || '');
  const [almacenId, setAlmacenId]           = useState((inicial as any).almacenId || '');
  const [clienteId, setClienteId]           = useState(inicial.clienteId || '');
  const [clienteSearch, setClienteSearch]   = useState(inicial.clienteNombre || '');
  const [showClientes, setShowClientes]     = useState(false);
  const [fecha, setFecha]                   = useState(inicial.fecha || today);
  const [fechaExtra, setFechaExtra]         = useState(
    (inicial as any).fechaValidez || (inicial as any).fechaEntrega || (inicial as any).fechaVencimiento || ''
  );
  const [metodoEnvio, setMetodoEnvio]       = useState((inicial as any).metodoEnvio || 'agencia');
  const [metodoCobro, setMetodoCobro]       = useState((inicial as any).metodoCobro || '');
  const [notas, setNotas]                   = useState(inicial.notas || '');
  const [condiciones, setCondiciones]       = useState((inicial as any).condiciones || '');
  const [descuentoGlobal, setDescuentoGlobal] = useState(inicial.descuentoGlobal ?? 0);
  const [ivaPorcentaje, setIvaPorcentaje]   = useState(inicial.ivaPorcentaje ?? 21);
  const [lineas, setLineas]                 = useState<DocumentoLinea[]>(lineasIniciales);
  const [saving, setSaving]                 = useState(false);
  const [error, setError]                   = useState('');
  const [showFirma, setShowFirma]           = useState(false);
  const [firmaNombre, setFirmaNombre]       = useState('');
  const [showCobro, setShowCobro]           = useState(false);
  const [fechaCobro, setFechaCobro]         = useState(today);
  const [signingFirma, setSigningFirma]     = useState(false);

  // Delegaciones filtradas por empresa seleccionada
  const delFiltradas = delegaciones.filter(d => d.empresaId === empresaId);
  const almFiltrados = almacenes.filter(a => {
    const del = delegaciones.find(d => d.id === a.delegacionId);
    return del?.empresaId === empresaId;
  });

  // Serie de factura determinada por empresa
  const seriePorEmpresa = (): string => {
    const emp = empresas.find(e => e.id === empresaId);
    if (!emp) return 'A';
    return emp.cif === 'B73860538' ? 'B' : 'A';
  };

  // Recalcular totales cuando cambien líneas, descuento global o IVA
  const totales = calcularTotalesLineas(lineas, descuentoGlobal, ivaPorcentaje);

  // Búsqueda de clientes
  const clientesFiltrados = clienteSearch.length >= 1
    ? clientes
        .filter(c => c.role === 'client' || c.role === 'admin' || c.role === 'sales')
        .filter(c =>
          c.name.toLowerCase().includes(clienteSearch.toLowerCase()) ||
          (c.email || '').toLowerCase().includes(clienteSearch.toLowerCase())
        )
        .slice(0, 8)
    : [];

  const selectCliente = (c: User) => {
    setClienteId(c.id);
    setClienteSearch(c.name);
    setShowClientes(false);
  };

  const handleSave = async (estadoOverride?: string) => {
    if (!empresaId) { setError('Selecciona una empresa.'); return; }
    if (!clienteId) { setError('Selecciona un cliente.'); return; }
    if (lineas.length === 0) { setError('Añade al menos una línea.'); return; }

    setSaving(true);
    setError('');
    try {
      const base = {
        empresaId,
        delegacionId: delegacionId || undefined,
        clienteId,
        clienteNombre: clienteSearch,
        fecha,
        ...totales,
        descuentoGlobal,
        ivaPorcentaje,
        notas: notas || undefined,
        createdBy: currentUser.id,
      };

      let docData: any = { ...base };
      if (tipo === 'presupuesto') {
        docData = { ...base, fechaValidez: fechaExtra || undefined, condiciones: condiciones || undefined,
          estado: estadoOverride || (inicial as Presupuesto).estado || 'borrador' };
      } else if (tipo === 'pedido') {
        docData = { ...base, fechaEntrega: fechaExtra || undefined, metodoEnvio,
          presupuestoId: (inicial as PedidoVenta).presupuestoId,
          almacenId: almacenId || undefined,
          estado: estadoOverride || (inicial as PedidoVenta).estado || 'confirmado' };
      } else if (tipo === 'albaran') {
        docData = { ...base, pedidoVentaId: (inicial as Albaran).pedidoVentaId,
          almacenId: almacenId || undefined,
          estado: estadoOverride || 'pendiente' };
      } else if (tipo === 'factura') {
        docData = { ...base, fechaVencimiento: fechaExtra || undefined, metodoCobro: metodoCobro || undefined,
          presupuestoId: (inicial as Factura).presupuestoId,
          pedidoVentaId: (inicial as Factura).pedidoVentaId,
          albaranId: (inicial as Factura).albaranId,
          estado: estadoOverride || 'emitida' };
        await onSave(docData, lineas);
        return;
      }

      await onSave(docData, lineas);
    } catch (e: any) {
      setError(e.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleFirmar = async (base64: string) => {
    if (!onFirmar) return;
    setSigningFirma(true);
    try {
      await onFirmar(base64, firmaNombre);
      setShowFirma(false);
    } finally {
      setSigningFirma(false);
    }
  };

  const handleCobrar = async () => {
    if (!onMarcarCobrada || !metodoCobro) return;
    setSaving(true);
    try {
      await onMarcarCobrada(metodoCobro, fechaCobro);
      setShowCobro(false);
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => window.print();

  // ── Titulos por tipo ─────────────────────────────────────
  const titulos: Record<DocTipo, string> = {
    presupuesto: 'Presupuesto',
    pedido: 'Pedido de Venta',
    albaran: 'Albarán',
    factura: 'Factura',
  };

  const isNew = !inicial.id;
  const docReadonly = readonly || (!isNew && tipo === 'factura' && (inicial as Factura).estado === 'cobrada');
  const puedeEditar = !docReadonly;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-5xl my-4 shadow-2xl flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {isNew ? `Nuevo ${titulos[tipo]}` : `${titulos[tipo]} ${(inicial as any).referencia || ''}`}
            </h2>
            {!isNew && (
              <p className="text-xs text-slate-500 mt-0.5">
                Estado: <span className="font-semibold capitalize">{(inicial as any).estado || ''}</span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isNew && (
              <button onClick={handlePrint} className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg px-3 py-1.5">
                <Printer size={14} /> Imprimir
              </button>
            )}
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1">
              <X size={22} />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto">

          {/* Cabecera del documento */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Empresa */}
            <div>
              <label className="text-xs font-medium text-slate-600">Empresa emisora *</label>
              <select
                disabled={!puedeEditar}
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none disabled:bg-slate-50"
                value={empresaId}
                onChange={e => { setEmpresaId(e.target.value); setDelegacionId(''); setAlmacenId(''); }}
              >
                <option value="">— Seleccionar —</option>
                {empresas.map(e => (
                  <option key={e.id} value={e.id}>{e.nombre} ({e.cif})</option>
                ))}
              </select>
            </div>

            {/* Delegación */}
            <div>
              <label className="text-xs font-medium text-slate-600">Delegación</label>
              <select
                disabled={!puedeEditar}
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none disabled:bg-slate-50"
                value={delegacionId}
                onChange={e => setDelegacionId(e.target.value)}
              >
                <option value="">— Todas —</option>
                {delFiltradas.map(d => (
                  <option key={d.id} value={d.id}>{d.nombre}</option>
                ))}
              </select>
            </div>

            {/* Almacén (pedido y albarán) */}
            {(tipo === 'pedido' || tipo === 'albaran') && (
              <div>
                <label className="text-xs font-medium text-slate-600">Almacén</label>
                <select
                  disabled={!puedeEditar}
                  className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none disabled:bg-slate-50"
                  value={almacenId}
                  onChange={e => setAlmacenId(e.target.value)}
                >
                  <option value="">— Sin especificar —</option>
                  {almFiltrados.map(a => (
                    <option key={a.id} value={a.id}>{a.nombre}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Cliente con búsqueda */}
            <div className="relative">
              <label className="text-xs font-medium text-slate-600">Cliente *</label>
              <input
                disabled={!puedeEditar}
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none disabled:bg-slate-50"
                placeholder="Buscar cliente…"
                value={clienteSearch}
                onChange={e => { setClienteSearch(e.target.value); setClienteId(''); setShowClientes(true); }}
                onFocus={() => setShowClientes(true)}
                onBlur={() => setTimeout(() => setShowClientes(false), 150)}
              />
              {showClientes && clientesFiltrados.length > 0 && (
                <div className="absolute z-50 top-full left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg mt-1 overflow-hidden">
                  {clientesFiltrados.map(c => (
                    <button key={c.id} onMouseDown={() => selectCliente(c)}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-blue-50 text-left">
                      <span className="truncate">{c.name}</span>
                      <span className="text-xs text-slate-400 shrink-0 ml-2">{c.email}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Fecha */}
            <div>
              <label className="text-xs font-medium text-slate-600">Fecha *</label>
              <input
                type="date" disabled={!puedeEditar}
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none disabled:bg-slate-50"
                value={fecha}
                onChange={e => setFecha(e.target.value)}
              />
            </div>

            {/* Fecha extra: validez / entrega / vencimiento */}
            <div>
              <label className="text-xs font-medium text-slate-600">
                {tipo === 'presupuesto' ? 'Válido hasta' : tipo === 'pedido' ? 'Entrega prevista' : tipo === 'factura' ? 'Vencimiento' : ''}
              </label>
              {(tipo !== 'albaran') && (
                <input
                  type="date" disabled={!puedeEditar}
                  className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none disabled:bg-slate-50"
                  value={fechaExtra}
                  onChange={e => setFechaExtra(e.target.value)}
                />
              )}
            </div>

            {/* Método envío (pedido) */}
            {tipo === 'pedido' && (
              <div>
                <label className="text-xs font-medium text-slate-600">Método de envío</label>
                <select
                  disabled={!puedeEditar}
                  className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none disabled:bg-slate-50"
                  value={metodoEnvio}
                  onChange={e => setMetodoEnvio(e.target.value)}
                >
                  <option value="agencia">Agencia</option>
                  <option value="propio">Transporte propio</option>
                  <option value="recogida">Recogida en almacén</option>
                </select>
              </div>
            )}
          </div>

          {/* Notas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-600">Notas internas</label>
              <textarea
                rows={2} disabled={!puedeEditar}
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none resize-none disabled:bg-slate-50"
                placeholder="Notas visibles solo internamente…"
                value={notas}
                onChange={e => setNotas(e.target.value)}
              />
            </div>
            {tipo === 'presupuesto' && (
              <div>
                <label className="text-xs font-medium text-slate-600">Condiciones</label>
                <textarea
                  rows={2} disabled={!puedeEditar}
                  className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none resize-none disabled:bg-slate-50"
                  placeholder="Condiciones generales del presupuesto…"
                  value={condiciones}
                  onChange={e => setCondiciones(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Líneas del documento */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Líneas</h3>
            <LineItemsEditor
              lineas={lineas}
              onChange={setLineas}
              productos={productos}
              readonly={docReadonly}
              ivaPorcentajeDefault={ivaPorcentaje}
            />
          </div>

          {/* Totales */}
          <TotalesFooter
            {...totales}
            descuentoGlobal={descuentoGlobal}
            ivaPorcentaje={ivaPorcentaje}
            onDescuentoChange={puedeEditar ? setDescuentoGlobal : undefined}
            onIvaChange={puedeEditar ? setIvaPorcentaje : undefined}
            readonly={docReadonly}
          />

          {/* Panel de firma para albaranes */}
          {tipo === 'albaran' && !readonly && (
            <div className="border border-slate-200 rounded-xl p-4">
              {(inicial as Albaran).firmaCliente ? (
                <div className="flex items-center gap-3">
                  <CheckCircle size={18} className="text-green-600" />
                  <div>
                    <p className="text-sm font-semibold text-green-700">Firmado por {(inicial as Albaran).firmaNombre}</p>
                    <p className="text-xs text-slate-500">{(inicial as Albaran).firmaFecha ? new Date((inicial as Albaran).firmaFecha!).toLocaleString('es-ES') : ''}</p>
                  </div>
                  <img src={(inicial as Albaran).firmaCliente!} alt="firma" className="ml-auto h-12 border rounded" />
                </div>
              ) : showFirma ? (
                <FirmaCanvas
                  firmaNombre={firmaNombre}
                  onFirmaNombreChange={setFirmaNombre}
                  onFirma={handleFirmar}
                />
              ) : (
                <button
                  onClick={() => setShowFirma(true)}
                  disabled={!(inicial as Albaran).id}
                  className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 disabled:opacity-40"
                >
                  <PenTool size={16} /> Solicitar firma del cliente
                </button>
              )}
            </div>
          )}

          {/* Panel de cobro para facturas */}
          {tipo === 'factura' && (inicial as Factura).estado !== 'cobrada' && !readonly && (inicial as Factura).id && (
            <div className="border border-slate-200 rounded-xl p-4">
              {showCobro ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  <div>
                    <label className="text-xs font-medium text-slate-600">Método de cobro</label>
                    <select
                      className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                      value={metodoCobro}
                      onChange={e => setMetodoCobro(e.target.value)}
                    >
                      <option value="">— Seleccionar —</option>
                      <option value="transferencia">Transferencia</option>
                      <option value="sepa">Domiciliación SEPA</option>
                      <option value="tarjeta">Tarjeta</option>
                      <option value="efectivo">Efectivo</option>
                      <option value="cheque">Cheque</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600">Fecha cobro</label>
                    <input type="date"
                      className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                      value={fechaCobro}
                      onChange={e => setFechaCobro(e.target.value)}
                    />
                  </div>
                  <button
                    onClick={handleCobrar}
                    disabled={!metodoCobro || saving}
                    className="flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-40"
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                    Marcar cobrada
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowCobro(true)}
                  className="flex items-center gap-2 text-sm font-medium text-green-700 hover:text-green-900"
                >
                  <CheckCircle size={16} /> Registrar cobro
                </button>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-red-700 text-sm">
              <AlertCircle size={15} />
              {error}
            </div>
          )}
        </div>

        {/* Footer con acciones */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
          {/* Acciones secundarias (conversiones) */}
          <div className="flex flex-wrap gap-2">
            {tipo === 'presupuesto' && onConvertirPedido && (
              <button onClick={onConvertirPedido}
                className="flex items-center gap-1.5 text-sm border border-slate-300 rounded-lg px-3 py-1.5 hover:bg-white text-slate-700">
                <Truck size={14} /> Convertir a Pedido
              </button>
            )}
            {tipo === 'pedido' && onGenerarAlbaran && (
              <button onClick={onGenerarAlbaran}
                className="flex items-center gap-1.5 text-sm border border-slate-300 rounded-lg px-3 py-1.5 hover:bg-white text-slate-700">
                <FileText size={14} /> Generar Albarán
              </button>
            )}
            {(tipo === 'albaran' || tipo === 'pedido') && onGenerarFactura && (
              <button onClick={onGenerarFactura}
                className="flex items-center gap-1.5 text-sm border border-slate-300 rounded-lg px-3 py-1.5 hover:bg-white text-slate-700">
                <FileText size={14} /> Generar Factura
              </button>
            )}
          </div>

          {/* Guardar */}
          <div className="flex gap-2 ml-auto">
            <button onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">
              Cerrar
            </button>
            {puedeEditar && tipo === 'presupuesto' && (
              <button
                onClick={() => handleSave('enviado')}
                disabled={saving}
                className="flex items-center gap-1.5 border border-blue-500 text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40"
              >
                <Send size={14} /> Marcar enviado
              </button>
            )}
            {puedeEditar && (
              <button
                onClick={() => handleSave()}
                disabled={saving}
                className="flex items-center gap-1.5 bg-slate-900 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-slate-700 disabled:opacity-40"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {isNew ? 'Crear' : 'Guardar'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
