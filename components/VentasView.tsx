import React, { useState, useEffect } from 'react';
import {
  FileText, Truck, ClipboardList, Receipt,
  Plus, Search, RefreshCw, AlertCircle, Loader2,
  ChevronRight, CheckCircle, Clock, XCircle, Send,
  Eye, Pencil
} from 'lucide-react';
import {
  Presupuesto, PedidoVenta, Albaran, Factura,
  DocumentoLinea, User, Empresa, Delegacion, Almacen, Product
} from '../types';
import { useVentas } from '../hooks/useVentas';
import { useEmpresaData } from '../hooks/useEmpresaData';
import { DocumentoModal } from './DocumentoModal';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

// ─── Badge de estado ──────────────────────────────────────────────────────────

const COLORES_ESTADO: Record<string, string> = {
  borrador:    'bg-slate-100 text-slate-600',
  enviado:     'bg-blue-100 text-blue-700',
  aceptado:    'bg-green-100 text-green-700',
  rechazado:   'bg-red-100 text-red-700',
  facturado:   'bg-purple-100 text-purple-700',
  cancelado:   'bg-red-50 text-red-400',
  confirmado:  'bg-blue-100 text-blue-700',
  en_proceso:  'bg-amber-100 text-amber-700',
  entregado:   'bg-teal-100 text-teal-700',
  pendiente:   'bg-slate-100 text-slate-600',
  firmado:     'bg-green-100 text-green-700',
  emitida:     'bg-blue-100 text-blue-700',
  enviada:     'bg-indigo-100 text-indigo-700',
  cobrada:     'bg-green-100 text-green-700',
};

const EstadoBadge: React.FC<{ estado: string }> = ({ estado }) => (
  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${COLORES_ESTADO[estado] || 'bg-slate-100 text-slate-600'}`}>
    {estado.replace('_', ' ')}
  </span>
);

// ─── Tabla genérica de documentos ────────────────────────────────────────────

interface TablaDocumentosProps<T> {
  docs: T[];
  cols: { key: string; label: string; render: (d: T) => React.ReactNode }[];
  onOpen: (d: T) => void;
  loading: boolean;
  emptyMsg: string;
}

function TablaDocumentos<T extends { id: string }>({ docs, cols, onOpen, loading, emptyMsg }: TablaDocumentosProps<T>) {
  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="animate-spin text-slate-400" size={28} />
    </div>
  );

  if (docs.length === 0) return (
    <div className="text-center py-16 text-slate-400">
      <FileText size={36} className="mx-auto mb-3 opacity-40" />
      <p>{emptyMsg}</p>
    </div>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
            {cols.map(c => (
              <th key={c.key} className="px-3 py-2 text-left">{c.label}</th>
            ))}
            <th className="px-3 py-2 w-16" />
          </tr>
        </thead>
        <tbody>
          {docs.map(d => (
            <tr key={d.id} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => onOpen(d)}>
              {cols.map(c => (
                <td key={c.key} className="px-3 py-2">{c.render(d)}</td>
              ))}
              <td className="px-3 py-2 text-right">
                <ChevronRight size={16} className="text-slate-400 inline" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Vista principal ──────────────────────────────────────────────────────────

type TabId = 'presupuestos' | 'pedidos' | 'albaranes' | 'facturas';

interface VentasViewProps {
  currentUser: User;
  clientes: User[];
  productos: Product[];
}

export const VentasView: React.FC<VentasViewProps> = ({ currentUser, clientes, productos }) => {
  const [activeTab, setActiveTab] = useState<TabId>('presupuestos');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<{
    tipo: 'presupuesto' | 'pedido' | 'albaran' | 'factura';
    doc?: any;
    lineas?: DocumentoLinea[];
    readonly?: boolean;
  } | null>(null);

  const ventas = useVentas();
  const empresaData = useEmpresaData();

  useEffect(() => { ventas.loadAll(); }, []);

  // ── Productos adaptados para LineItemsEditor ──────────────
  const productosEditor = productos.map(p => ({
    id: p.id, name: p.name, reference: p.reference, price: p.price,
  }));

  // ── Abrir para ver/editar ─────────────────────────────────

  const openPresupuesto = async (doc?: Presupuesto) => {
    if (doc) {
      const full = await ventas.getPresupuestoConLineas(doc.id);
      setModal({ tipo: 'presupuesto', doc: full, lineas: full?.lineas || [] });
    } else {
      setModal({ tipo: 'presupuesto', doc: undefined, lineas: [] });
    }
  };

  const openPedido = async (doc?: PedidoVenta, draft?: any) => {
    if (draft) {
      setModal({ tipo: 'pedido', doc: draft.pedido, lineas: draft.lineas });
      return;
    }
    if (doc) {
      const full = await ventas.getPedidoConLineas(doc.id);
      setModal({ tipo: 'pedido', doc: full, lineas: full?.lineas || [] });
    } else {
      setModal({ tipo: 'pedido', doc: undefined, lineas: [] });
    }
  };

  const openAlbaran = async (doc?: Albaran, draft?: any) => {
    if (draft) {
      setModal({ tipo: 'albaran', doc: draft.albaran, lineas: draft.lineas });
      return;
    }
    if (doc) {
      const full = await ventas.getAlbaranConLineas(doc.id);
      setModal({ tipo: 'albaran', doc: full, lineas: full?.lineas || [] });
    } else {
      setModal({ tipo: 'albaran', doc: undefined, lineas: [] });
    }
  };

  const openFactura = async (doc?: Factura, draft?: any) => {
    if (draft) {
      setModal({ tipo: 'factura', doc: draft.factura, lineas: draft.lineas });
      return;
    }
    if (doc) {
      const full = await ventas.getFacturaConLineas(doc.id);
      setModal({ tipo: 'factura', doc: full, lineas: full?.lineas || [] });
    } else {
      setModal({ tipo: 'factura', doc: undefined, lineas: [] });
    }
  };

  // ── Conversiones desde modal ──────────────────────────────

  const handleConvertirPedido = async () => {
    if (!modal?.doc?.id) return;
    const draft = await ventas.presupuestoToPedidoDraft(modal.doc.id);
    if (draft) { setModal(null); setTimeout(() => openPedido(undefined, draft), 100); }
  };

  const handleGenerarAlbaran = async () => {
    if (!modal?.doc?.id) return;
    const draft = await ventas.pedidoToAlbaranDraft(modal.doc.id);
    if (draft) { setModal(null); setTimeout(() => openAlbaran(undefined, draft), 100); }
  };

  const handleGenerarFacturaDesdeAlbaran = async () => {
    if (!modal?.doc?.id) return;
    const draft = await ventas.albaranToFacturaDraft(modal.doc.id);
    if (draft) { setModal(null); setTimeout(() => openFactura(undefined, draft), 100); }
  };

  const handleGenerarFacturaDesdePedido = async () => {
    if (!modal?.doc?.id) return;
    // Construir draft desde pedido
    const ped = await ventas.getPedidoConLineas(modal.doc.id);
    if (!ped) return;
    const draft = {
      factura: {
        empresaId: ped.empresaId,
        delegacionId: ped.delegacionId,
        clienteId: ped.clienteId,
        clienteNombre: ped.clienteNombre,
        pedidoVentaId: ped.id,
        fecha: new Date().toISOString().split('T')[0],
        estado: 'emitida' as const,
        subtotal: ped.subtotal,
        descuentoGlobal: ped.descuentoGlobal,
        baseImponible: ped.baseImponible,
        ivaPorcentaje: ped.ivaPorcentaje,
        iva: ped.iva,
        total: ped.total,
      },
      lineas: ped.lineas || [],
    };
    setModal(null);
    setTimeout(() => openFactura(undefined, draft), 100);
  };

  // ── Guardar cada tipo ─────────────────────────────────────

  const handleSavePresupuesto = async (data: any, lineas: DocumentoLinea[]) => {
    if (modal?.doc?.id) {
      await ventas.updatePresupuesto(modal.doc.id, data, lineas);
    } else {
      await ventas.createPresupuesto(data, lineas);
    }
    setModal(null);
  };

  const handleSavePedido = async (data: any, lineas: DocumentoLinea[]) => {
    if (modal?.doc?.id) {
      await ventas.updatePedido(modal.doc.id, data, lineas);
    } else {
      await ventas.createPedido(data, lineas);
    }
    setModal(null);
  };

  const handleSaveAlbaran = async (data: any, lineas: DocumentoLinea[]) => {
    if (modal?.doc?.id) {
      // albaranes no se editan una vez creados (solo firma)
    } else {
      await ventas.createAlbaran(data, lineas);
    }
    setModal(null);
  };

  const handleSaveFactura = async (data: any, lineas: DocumentoLinea[]) => {
    const serie = empresaData.empresas.find(e => e.id === data.empresaId)?.cif === 'B73860538' ? 'B' : 'A';
    await ventas.createFactura(data, lineas, serie);
    setModal(null);
  };

  const handleFirmarAlbaran = async (base64: string, nombre: string) => {
    if (!modal?.doc?.id) return;
    await ventas.firmarAlbaran(modal.doc.id, base64, nombre);
    setModal(null);
  };

  const handleMarcarCobrada = async (metodo: string, fecha: string) => {
    if (!modal?.doc?.id) return;
    await ventas.marcarCobrada(modal.doc.id, metodo, fecha);
    setModal(null);
  };

  // ── Filtros de búsqueda ───────────────────────────────────

  const filterDocs = <T extends { id: string; referencia: string; clienteNombre?: string }>(docs: T[]) =>
    search.length < 2
      ? docs
      : docs.filter(d =>
          d.referencia.toLowerCase().includes(search.toLowerCase()) ||
          (d.clienteNombre || '').toLowerCase().includes(search.toLowerCase())
        );

  // ── Columnas por tipo ─────────────────────────────────────

  const colsPresupuesto = [
    { key: 'ref', label: 'Referencia', render: (d: Presupuesto) => <span className="font-mono font-semibold text-slate-800">{d.referencia}</span> },
    { key: 'cliente', label: 'Cliente', render: (d: Presupuesto) => <span className="truncate max-w-[180px] block">{d.clienteNombre || '—'}</span> },
    { key: 'fecha', label: 'Fecha', render: (d: Presupuesto) => d.fecha },
    { key: 'validez', label: 'Válido hasta', render: (d: Presupuesto) => d.fechaValidez || '—' },
    { key: 'total', label: 'Total', render: (d: Presupuesto) => <span className="font-semibold">{fmt(d.total)}</span> },
    { key: 'estado', label: 'Estado', render: (d: Presupuesto) => <EstadoBadge estado={d.estado} /> },
  ];

  const colsPedido = [
    { key: 'ref', label: 'Referencia', render: (d: PedidoVenta) => <span className="font-mono font-semibold text-slate-800">{d.referencia}</span> },
    { key: 'cliente', label: 'Cliente', render: (d: PedidoVenta) => <span className="truncate max-w-[180px] block">{d.clienteNombre || '—'}</span> },
    { key: 'fecha', label: 'Fecha', render: (d: PedidoVenta) => d.fecha },
    { key: 'entrega', label: 'Entrega', render: (d: PedidoVenta) => d.fechaEntrega || '—' },
    { key: 'total', label: 'Total', render: (d: PedidoVenta) => <span className="font-semibold">{fmt(d.total)}</span> },
    { key: 'estado', label: 'Estado', render: (d: PedidoVenta) => <EstadoBadge estado={d.estado} /> },
  ];

  const colsAlbaran = [
    { key: 'ref', label: 'Referencia', render: (d: Albaran) => <span className="font-mono font-semibold text-slate-800">{d.referencia}</span> },
    { key: 'cliente', label: 'Cliente', render: (d: Albaran) => <span className="truncate max-w-[180px] block">{d.clienteNombre || '—'}</span> },
    { key: 'fecha', label: 'Fecha', render: (d: Albaran) => d.fecha },
    { key: 'firmado', label: 'Firma', render: (d: Albaran) => d.firmaCliente
      ? <span className="flex items-center gap-1 text-green-700 text-xs"><CheckCircle size={12} /> {d.firmaNombre}</span>
      : <span className="text-slate-400 text-xs">Sin firmar</span> },
    { key: 'estado', label: 'Estado', render: (d: Albaran) => <EstadoBadge estado={d.estado} /> },
  ];

  const colsFactura = [
    { key: 'ref', label: 'Referencia', render: (d: Factura) => <span className="font-mono font-semibold text-slate-800">{d.referencia}</span> },
    { key: 'cliente', label: 'Cliente', render: (d: Factura) => <span className="truncate max-w-[180px] block">{d.clienteNombre || '—'}</span> },
    { key: 'fecha', label: 'Fecha', render: (d: Factura) => d.fecha },
    { key: 'vencimiento', label: 'Vence', render: (d: Factura) => d.fechaVencimiento || '—' },
    { key: 'total', label: 'Total', render: (d: Factura) => <span className="font-semibold">{fmt(d.total)}</span> },
    { key: 'cobro', label: 'Cobro', render: (d: Factura) => d.estado === 'cobrada'
      ? <span className="flex items-center gap-1 text-green-700 text-xs"><CheckCircle size={12} />{d.metodoCobro}</span>
      : <span className="text-slate-400 text-xs">Pendiente</span> },
    { key: 'estado', label: 'Estado', render: (d: Factura) => <EstadoBadge estado={d.estado} /> },
  ];

  // ── Tabs ──────────────────────────────────────────────────

  const tabs: { id: TabId; label: string; icon: React.ElementType; count: number }[] = [
    { id: 'presupuestos', label: 'Presupuestos', icon: FileText, count: ventas.presupuestos.length },
    { id: 'pedidos',      label: 'Pedidos',      icon: Truck,      count: ventas.pedidos.length },
    { id: 'albaranes',    label: 'Albaranes',    icon: ClipboardList, count: ventas.albaranes.length },
    { id: 'facturas',     label: 'Facturas',     icon: Receipt,    count: ventas.facturas.length },
  ];

  const canEdit = ['admin', 'sales', 'sales_lead', 'administracion', 'direccion'].includes(currentUser.role);

  return (
    <div className="flex flex-col h-full">
      {/* Error global */}
      {ventas.error && (
        <div className="mx-4 mt-4 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-red-700 text-sm">
          <AlertCircle size={16} />
          <span>{ventas.error}</span>
          <span className="text-xs ml-1">— Ejecuta <code>paso2_ciclo_ventas.sql</code> en Supabase</span>
        </div>
      )}

      {/* Header */}
      <div className="px-4 pt-4 pb-0 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Ventas</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-400 w-52"
              placeholder="Buscar referencia o cliente…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={ventas.loadAll}
            className="p-1.5 text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg"
          >
            <RefreshCw size={15} />
          </button>
          {canEdit && (
            <button
              onClick={() => {
                if (activeTab === 'presupuestos') openPresupuesto();
                else if (activeTab === 'pedidos') openPedido();
                else if (activeTab === 'albaranes') openAlbaran();
                else openFactura();
              }}
              className="flex items-center gap-1.5 bg-slate-900 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-700"
            >
              <Plus size={15} /> Nuevo
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 mt-4 border-b border-slate-200 flex gap-0">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === tab.id
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon size={15} />
              {tab.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                activeTab === tab.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-auto bg-white rounded-b-xl">
        {activeTab === 'presupuestos' && (
          <TablaDocumentos
            docs={filterDocs(ventas.presupuestos)}
            cols={colsPresupuesto}
            onOpen={openPresupuesto}
            loading={ventas.loading}
            emptyMsg={'No hay presupuestos. Pulsa "+ Nuevo" para crear el primero.'}
          />
        )}
        {activeTab === 'pedidos' && (
          <TablaDocumentos
            docs={filterDocs(ventas.pedidos)}
            cols={colsPedido}
            onOpen={openPedido}
            loading={ventas.loading}
            emptyMsg="No hay pedidos de venta."
          />
        )}
        {activeTab === 'albaranes' && (
          <TablaDocumentos
            docs={filterDocs(ventas.albaranes)}
            cols={colsAlbaran}
            onOpen={openAlbaran}
            loading={ventas.loading}
            emptyMsg="No hay albaranes."
          />
        )}
        {activeTab === 'facturas' && (
          <TablaDocumentos
            docs={filterDocs(ventas.facturas)}
            cols={colsFactura}
            onOpen={openFactura}
            loading={ventas.loading}
            emptyMsg="No hay facturas."
          />
        )}
      </div>

      {/* Modal */}
      {modal && (
        <DocumentoModal
          tipo={modal.tipo}
          inicial={modal.doc || {}}
          lineasIniciales={modal.lineas || []}
          empresas={empresaData.empresas}
          delegaciones={empresaData.delegaciones}
          almacenes={empresaData.almacenes}
          clientes={clientes}
          productos={productosEditor}
          currentUser={currentUser}
          onClose={() => setModal(null)}
          onSave={
            modal.tipo === 'presupuesto' ? handleSavePresupuesto :
            modal.tipo === 'pedido'      ? handleSavePedido      :
            modal.tipo === 'albaran'     ? handleSaveAlbaran     :
                                           handleSaveFactura
          }
          onConvertirPedido={modal.tipo === 'presupuesto' && modal.doc?.id ? handleConvertirPedido : undefined}
          onGenerarAlbaran={modal.tipo === 'pedido' && modal.doc?.id ? handleGenerarAlbaran : undefined}
          onGenerarFactura={
            modal.tipo === 'albaran' && modal.doc?.id ? handleGenerarFacturaDesdeAlbaran :
            modal.tipo === 'pedido'  && modal.doc?.id ? handleGenerarFacturaDesdePedido  : undefined
          }
          onFirmar={modal.tipo === 'albaran' ? handleFirmarAlbaran : undefined}
          onMarcarCobrada={modal.tipo === 'factura' && modal.doc?.id ? handleMarcarCobrada : undefined}
          readonly={modal.readonly}
        />
      )}
    </div>
  );
};
