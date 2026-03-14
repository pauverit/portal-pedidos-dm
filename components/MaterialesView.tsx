import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, Package, Tag, Layers, TrendingUp, Warehouse,
  FileText, ChevronRight, Loader2, AlertCircle, BarChart2,
  BookOpen, RefreshCw, X, ArrowUpRight, ArrowDownLeft,
  ShoppingCart, Truck, Receipt, RotateCcw, PackageSearch,
  Boxes, Info,
} from 'lucide-react';
import { Product, ProductCategory, TrazaProducto, StockAlmacenDetalle } from '../types';
import { useMateriales } from '../hooks/useMateriales';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

const fmtPct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;

const CAT_LABELS: Record<ProductCategory, string> = {
  rigid:     'Rígido',
  flexible:  'Flexible',
  ink:       'Tinta/Consumible',
  accessory: 'Accesorio',
  display:   'Display',
};

const CAT_COLORS: Record<ProductCategory, string> = {
  rigid:     'bg-blue-100 text-blue-700',
  flexible:  'bg-violet-100 text-violet-700',
  ink:       'bg-cyan-100 text-cyan-700',
  accessory: 'bg-amber-100 text-amber-700',
  display:   'bg-emerald-100 text-emerald-700',
};

const DOC_ICON: Record<string, React.ReactNode> = {
  presupuesto: <FileText  size={13} className="text-violet-500" />,
  pedido:      <ShoppingCart size={13} className="text-blue-500" />,
  albaran:     <Truck      size={13} className="text-amber-500" />,
  factura:     <Receipt    size={13} className="text-emerald-500" />,
  devolucion:  <RotateCcw  size={13} className="text-rose-500" />,
  compra:      <PackageSearch size={13} className="text-indigo-500" />,
  recepcion:   <Boxes      size={13} className="text-teal-500" />,
};

const DOC_LABEL: Record<string, string> = {
  presupuesto: 'Presupuesto',
  pedido:      'Pedido',
  albaran:     'Albarán',
  factura:     'Factura',
  devolucion:  'Devolución',
  compra:      'Compra',
  recepcion:   'Recepción',
};

const ESTADO_CHIP: Record<string, string> = {
  borrador:    'bg-slate-100 text-slate-500',
  enviado:     'bg-sky-100 text-sky-700',
  aceptado:    'bg-green-100 text-green-700',
  confirmado:  'bg-blue-100 text-blue-700',
  entregado:   'bg-teal-100 text-teal-700',
  facturado:   'bg-purple-100 text-purple-700',
  cobrada:     'bg-emerald-100 text-emerald-700',
  emitida:     'bg-blue-100 text-blue-700',
  pendiente:   'bg-slate-100 text-slate-500',
  procesada:   'bg-green-100 text-green-700',
  recibida:    'bg-amber-100 text-amber-700',
  cancelado:   'bg-red-50 text-red-400',
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface MaterialesViewProps {
  productos: Product[];
}

// ─── Detalle del producto (panel derecho) ────────────────────────────────────

type DetalleTab = 'general' | 'costes' | 'stock' | 'historial';

interface DetalleProps {
  producto: Product;
  onClose: () => void;
}

const DetalleProducto: React.FC<DetalleProps> = ({ producto, onClose }) => {
  const [tab, setTab] = useState<DetalleTab>('general');
  const mat = useMateriales();

  useEffect(() => {
    mat.loadDetalleProducto(producto.id);
    return () => mat.clearDetalle();
  }, [producto.id]);

  const stockTotal = mat.stock.reduce((s, a) => s + a.cantidad, 0);
  const margen = producto.precioCompra && producto.price
    ? ((producto.price - producto.precioCompra) / producto.price * 100)
    : (producto.margenBrutoPct ?? null);

  const TABS: { id: DetalleTab; label: string; icon: React.ReactNode }[] = [
    { id: 'general',  label: 'General',      icon: <Info size={13} /> },
    { id: 'costes',   label: 'Costes',        icon: <TrendingUp size={13} /> },
    { id: 'stock',    label: `Stock (${stockTotal})`, icon: <Warehouse size={13} /> },
    { id: 'historial',label: `Historial (${mat.traza.length})`, icon: <FileText size={13} /> },
  ];

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 border-b border-slate-100">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${CAT_COLORS[producto.category]}`}>
                {CAT_LABELS[producto.category]}
              </span>
              {producto.familia && (
                <span className="text-[11px] text-slate-400 font-medium">{producto.familia}</span>
              )}
            </div>
            <h2 className="font-bold text-slate-900 text-base leading-tight truncate">{producto.name}</h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">{producto.reference}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 flex-shrink-0">
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 mt-3 -mb-3">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5">

        {/* ── GENERAL ── */}
        {tab === 'general' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nombre"       value={producto.name} />
              <Field label="Referencia"   value={producto.reference} mono />
              <Field label="Categoría"    value={CAT_LABELS[producto.category]} />
              <Field label="Subcategoría" value={producto.subcategory || '—'} />
              <Field label="Unidad"       value={producto.unit} />
              <Field label="Marca"        value={producto.brand || '—'} />
              {producto.isFlexible && <>
                <Field label="Ancho"   value={producto.width ? `${producto.width} m` : '—'} />
                <Field label="Precio/m²" value={producto.pricePerM2 ? fmt(producto.pricePerM2) : '—'} />
              </>}
              {producto.volume && <Field label="Volumen" value={producto.volume} />}
              <Field label="Estado" value={producto.activo !== false ? 'Activo' : 'Inactivo'} />
            </div>
            {producto.description && (
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Descripción</div>
                <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">{producto.description}</p>
              </div>
            )}
            {producto.notasInternas && (
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Notas internas</div>
                <p className="text-sm text-slate-600 bg-amber-50 rounded-lg p-3">{producto.notasInternas}</p>
              </div>
            )}
          </div>
        )}

        {/* ── COSTES ── */}
        {tab === 'costes' && (
          <div className="space-y-5">
            {/* Precios */}
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                Precios y Márgenes
              </div>
              <div className="p-4 grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-xs text-slate-500 mb-1">Precio Compra</div>
                  <div className="text-lg font-bold text-slate-800">{producto.precioCompra != null ? fmt(producto.precioCompra) : '—'}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-slate-500 mb-1">PVP / Venta</div>
                  <div className="text-lg font-bold text-slate-800">{fmt(producto.pvp ?? producto.price)}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-slate-500 mb-1">Margen Bruto</div>
                  <div className={`text-lg font-bold ${margen != null ? (margen > 30 ? 'text-emerald-600' : margen > 15 ? 'text-amber-600' : 'text-red-600') : 'text-slate-400'}`}>
                    {margen != null ? fmtPct(margen) : '—'}
                  </div>
                </div>
              </div>
            </div>
            {/* Familia */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Familia" value={producto.familia || '—'} />
            </div>
            {/* Cuentas PGC */}
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 flex items-center gap-2">
                <BookOpen size={13} /> Cuentas PGC
              </div>
              <div className="p-4 grid grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-slate-500 mb-1">Ventas</div>
                  <div className="font-mono font-bold text-slate-700">{producto.cuentaVentas || '700'}</div>
                  <div className="text-[10px] text-slate-400">Ventas mercaderías</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">Compras</div>
                  <div className="font-mono font-bold text-slate-700">{producto.cuentaCompras || '600'}</div>
                  <div className="text-[10px] text-slate-400">Compras mercaderías</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">Existencias</div>
                  <div className="font-mono font-bold text-slate-700">{producto.cuentaExistencias || '300'}</div>
                  <div className="text-[10px] text-slate-400">Mercaderías</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── STOCK ── */}
        {tab === 'stock' && (
          <div>
            {mat.loadingStock ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="animate-spin text-indigo-500" size={24} />
              </div>
            ) : mat.stock.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                <Warehouse size={32} className="mb-2 opacity-40" />
                <p className="text-sm">Sin stock registrado</p>
                <p className="text-xs mt-1 opacity-70">Ejecuta paso13_materiales_activos.sql para activar esta vista</p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Total stock */}
                <div className="rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-3 flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold text-indigo-700">Stock total consolidado</span>
                  <span className="text-xl font-bold text-indigo-800">{stockTotal} {producto.unit}</span>
                </div>
                {mat.stock.map(a => (
                  <div key={a.almacenId} className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 hover:bg-slate-50 transition-colors">
                    <div>
                      <div className="font-semibold text-slate-800 text-sm">{a.almacenNombre}</div>
                      {a.almacenTipo && <div className="text-xs text-slate-400 capitalize">{a.almacenTipo}</div>}
                    </div>
                    <div className="text-right">
                      <div className={`font-bold text-base ${a.cantidad > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {a.cantidad} {producto.unit}
                      </div>
                      {a.pmp != null && <div className="text-xs text-slate-400">PMP: {fmt(a.pmp)}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── HISTORIAL ── */}
        {tab === 'historial' && (
          <div>
            {mat.loadingTraza ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="animate-spin text-indigo-500" size={24} />
              </div>
            ) : mat.traza.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                <FileText size={32} className="mb-2 opacity-40" />
                <p className="text-sm">Sin historial de documentos</p>
                <p className="text-xs mt-1 opacity-70">Los documentos aparecerán aquí automáticamente</p>
              </div>
            ) : (
              <div className="space-y-1">
                {mat.traza.map((t, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2.5 hover:bg-slate-50 transition-colors">
                    <div className="flex-shrink-0">{DOC_ICON[t.tipoDoc] || <FileText size={13} />}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-700">{DOC_LABEL[t.tipoDoc]}</span>
                        <span className="font-mono text-xs text-slate-500">{t.referencia}</span>
                        {t.estado && (
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${ESTADO_CHIP[t.estado] || 'bg-slate-100 text-slate-500'}`}>
                            {t.estado}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5 truncate">
                        {t.clienteNombre || '—'} · {t.fecha}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs font-semibold text-slate-700">{t.cantidad} {producto.unit}</div>
                      <div className="text-xs text-slate-400">{fmt(t.subtotal)}</div>
                    </div>
                  </div>
                ))}
                {/* Resumen */}
                <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 mt-3 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-xs text-slate-500">Documentos</div>
                    <div className="font-bold text-slate-800">{mat.traza.length}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Uds. vendidas</div>
                    <div className="font-bold text-emerald-700">
                      {mat.traza.filter(t => ['pedido','albaran','factura'].includes(t.tipoDoc)).reduce((s, t) => s + t.cantidad, 0).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Importe total</div>
                    <div className="font-bold text-slate-800">
                      {fmt(mat.traza.reduce((s, t) => s + t.subtotal, 0))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/** Pequeño campo de datos */
const Field: React.FC<{ label: string; value: string | number; mono?: boolean }> = ({ label, value, mono }) => (
  <div>
    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">{label}</div>
    <div className={`text-sm font-medium text-slate-700 ${mono ? 'font-mono' : ''}`}>{value}</div>
  </div>
);

// ─── Vista principal ───────────────────────────────────────────────────────────

export const MaterialesView: React.FC<MaterialesViewProps> = ({ productos }) => {
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<ProductCategory | ''>('');
  const [filterFamilia, setFilterFamilia] = useState('');
  const [selected, setSelected] = useState<Product | null>(null);

  // Familias únicas
  const familias = useMemo(() => {
    const set = new Set(productos.map(p => p.familia).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [productos]);

  // Productos filtrados
  const filtrados = useMemo(() => {
    const q = search.toLowerCase();
    return productos.filter(p => {
      if (filterCat && p.category !== filterCat) return false;
      if (filterFamilia && p.familia !== filterFamilia) return false;
      if (q.length >= 2 && !p.name.toLowerCase().includes(q) && !(p.reference || '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [productos, search, filterCat, filterFamilia]);

  // KPIs globales
  const totalActivos = productos.filter(p => p.activo !== false).length;
  const conCoste     = productos.filter(p => p.precioCompra != null && p.precioCompra > 0).length;
  const conStock     = 0; // no disponible sin query
  const categorias   = Object.keys(CAT_LABELS) as ProductCategory[];

  return (
    <div className="flex h-full gap-4 p-4 bg-slate-50">

      {/* ── Panel izquierdo: lista ─────────────────────────────── */}
      <div className={`flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-200 ${selected ? 'w-[42%] min-w-[320px]' : 'flex-1'}`}>

        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow">
              <Package size={18} />
            </div>
            <div>
              <h1 className="font-bold text-slate-900">Materiales</h1>
              <p className="text-xs text-slate-500">{filtrados.length} de {productos.length} productos</p>
            </div>
          </div>

          {/* KPIs */}
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
            {[
              { label: 'Activos', value: totalActivos, color: 'bg-indigo-50 text-indigo-800' },
              { label: 'Con coste', value: conCoste,   color: 'bg-emerald-50 text-emerald-800' },
              { label: 'Familias', value: familias.length, color: 'bg-violet-50 text-violet-800' },
            ].map((k, i) => (
              <div key={i} className={`rounded-xl px-3 py-1.5 ${k.color} text-xs font-semibold flex-shrink-0`}>
                <span className="opacity-70">{k.label} </span>{k.value}
              </div>
            ))}
          </div>

          {/* Filtros */}
          <div className="flex flex-col gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-xl w-full outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="Buscar por nombre o referencia…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"><X size={13} /></button>}
            </div>
            <div className="flex gap-2">
              <select
                className="flex-1 text-xs border border-slate-200 rounded-xl px-2 py-1.5 bg-white outline-none focus:ring-2 focus:ring-indigo-300"
                value={filterCat}
                onChange={e => setFilterCat(e.target.value as ProductCategory | '')}
              >
                <option value="">Todas las categorías</option>
                {categorias.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
              </select>
              {familias.length > 0 && (
                <select
                  className="flex-1 text-xs border border-slate-200 rounded-xl px-2 py-1.5 bg-white outline-none focus:ring-2 focus:ring-indigo-300"
                  value={filterFamilia}
                  onChange={e => setFilterFamilia(e.target.value)}
                >
                  <option value="">Todas las familias</option>
                  {familias.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              )}
            </div>
          </div>
        </div>

        {/* Lista de productos */}
        <div className="flex-1 overflow-y-auto">
          {filtrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <PackageSearch size={36} className="mb-3 opacity-40" />
              <p className="text-sm">No se encontraron productos</p>
            </div>
          ) : (
            filtrados.map(p => {
              const isSelected = selected?.id === p.id;
              const margen = p.precioCompra && p.price
                ? ((p.price - p.precioCompra) / p.price * 100)
                : p.margenBrutoPct;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelected(isSelected ? null : p)}
                  className={`w-full text-left flex items-center gap-3 px-4 py-3 border-b border-slate-50 transition-colors group ${
                    isSelected ? 'bg-indigo-50' : 'hover:bg-slate-50/70'
                  }`}
                >
                  {/* Color stripe */}
                  <div className={`w-1 h-10 rounded-full flex-shrink-0 ${isSelected ? 'bg-indigo-500' : 'bg-slate-200 group-hover:bg-indigo-300'} transition-colors`} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${CAT_COLORS[p.category]}`}>
                        {CAT_LABELS[p.category]}
                      </span>
                      {p.familia && <span className="text-[10px] text-slate-400">{p.familia}</span>}
                    </div>
                    <div className="font-semibold text-sm text-slate-800 truncate">{p.name}</div>
                    <div className="text-xs text-slate-400 font-mono">{p.reference}</div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-sm text-slate-800">{fmt(p.pvp ?? p.price)}</div>
                    {margen != null && (
                      <div className={`text-[11px] font-semibold ${margen > 30 ? 'text-emerald-600' : margen > 15 ? 'text-amber-600' : 'text-red-500'}`}>
                        {fmtPct(margen)}
                      </div>
                    )}
                  </div>

                  <ChevronRight size={14} className={`flex-shrink-0 transition-colors ${isSelected ? 'text-indigo-500' : 'text-slate-300 group-hover:text-slate-500'}`} />
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Panel derecho: detalle ─────────────────────────────── */}
      {selected && (
        <div className="flex-1 min-w-0 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <DetalleProducto
            producto={selected}
            onClose={() => setSelected(null)}
          />
        </div>
      )}

      {/* ── Placeholder sin selección ─────────────────────────── */}
      {!selected && (
        <div className="hidden lg:flex flex-1 items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white/50 text-slate-400">
          <div className="text-center">
            <Package size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">Selecciona un producto</p>
            <p className="text-xs mt-1 opacity-60">para ver todos sus detalles y trazabilidad</p>
          </div>
        </div>
      )}
    </div>
  );
};
