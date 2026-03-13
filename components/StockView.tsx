import React, { useState, useEffect } from 'react';
import { BarChart3, Search, AlertCircle, ArrowUpDown, Sliders, History, Plus, Minus } from 'lucide-react';
import { useCompras } from '../hooks/useCompras';
import { StockItem, MovimientoStock, TipoMovimientoStock } from '../types';
import { User, Almacen } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

const fmtNum = (n: number) =>
  new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(n);

const TIPO_MOVIMIENTO_LABEL: Record<TipoMovimientoStock, { label: string; color: string; sign: '+' | '-' }> = {
  entrada_compra: { label: 'Compra', color: 'bg-green-100 text-green-700', sign: '+' },
  salida_venta: { label: 'Venta', color: 'bg-blue-100 text-blue-700', sign: '-' },
  entrada_traspaso: { label: 'Traspaso entrada', color: 'bg-teal-100 text-teal-700', sign: '+' },
  salida_traspaso: { label: 'Traspaso salida', color: 'bg-teal-100 text-teal-700', sign: '-' },
  ajuste_positivo: { label: 'Ajuste +', color: 'bg-amber-100 text-amber-700', sign: '+' },
  ajuste_negativo: { label: 'Ajuste -', color: 'bg-amber-100 text-amber-700', sign: '-' },
  devolucion_cliente: { label: 'Dev. cliente', color: 'bg-purple-100 text-purple-700', sign: '+' },
  devolucion_proveedor: { label: 'Dev. proveedor', color: 'bg-red-100 text-red-700', sign: '-' },
};

// ─── Modal de ajuste de stock ─────────────────────────────────────────────────

interface AjusteModalProps {
  item: StockItem;
  currentUser: User;
  almacenNombre: string;
  onAjustar: (
    productoId: string,
    almacenId: string,
    cantidad: number,
    tipo: 'ajuste_positivo' | 'ajuste_negativo',
    notas: string,
    userId: string
  ) => Promise<void>;
  onClose: () => void;
}

const AjusteModal: React.FC<AjusteModalProps> = ({ item, currentUser, almacenNombre, onAjustar, onClose }) => {
  const [tipo, setTipo] = useState<'ajuste_positivo' | 'ajuste_negativo'>('ajuste_positivo');
  const [cantidad, setCantidad] = useState(0);
  const [notas, setNotas] = useState('');
  const [saving, setSaving] = useState(false);

  const stockFinal = tipo === 'ajuste_positivo'
    ? item.cantidad + cantidad
    : Math.max(0, item.cantidad - cantidad);

  const handleSave = async () => {
    if (cantidad <= 0) { alert('Introduce una cantidad mayor que 0'); return; }
    setSaving(true);
    try {
      await onAjustar(item.productoId, item.almacenId, cantidad, tipo, notas, currentUser.id);
      onClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">Ajuste de stock</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg leading-none">&times;</button>
        </div>

        <div className="px-3 py-2 space-y-4">
          <div className="bg-slate-50 rounded-xl p-3 text-sm space-y-1">
            <div className="font-medium text-slate-800">
              {item.productoNombre || item.productoId}
            </div>
            <div className="text-slate-500">Almacén: {almacenNombre}</div>
            <div className="flex gap-4">
              <span>Stock actual: <strong>{fmtNum(item.cantidad)}</strong></span>
              <span>PMP: <strong>{fmt(item.pmp)}</strong></span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-2">Tipo de ajuste</label>
            <div className="flex gap-2">
              <button
                onClick={() => setTipo('ajuste_positivo')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  tipo === 'ajuste_positivo'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Plus size={15} /> Entrada / Positivo
              </button>
              <button
                onClick={() => setTipo('ajuste_negativo')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  tipo === 'ajuste_negativo'
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Minus size={15} /> Salida / Negativo
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Cantidad</label>
            <input
              type="number" min="0" step="0.01"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
              value={cantidad}
              onChange={e => setCantidad(parseFloat(e.target.value) || 0)}
            />
          </div>

          <div className="bg-slate-50 rounded-lg px-3 py-2 text-sm flex justify-between">
            <span className="text-slate-600">Stock resultante:</span>
            <span className={`font-bold ${stockFinal < 0 ? 'text-red-600' : 'text-slate-900'}`}>
              {fmtNum(stockFinal)}
            </span>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Motivo / Notas *</label>
            <textarea
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 resize-none"
              rows={2}
              value={notas}
              onChange={e => setNotas(e.target.value)}
              placeholder="Inventario mensual, rotura, corrección…"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 px-3 py-2 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || cantidad <= 0 || !notas.trim()}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Aplicando…' : 'Aplicar ajuste'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Panel de movimientos ─────────────────────────────────────────────────────

interface MovimientosProps {
  productoId?: string;
  almacenId?: string;
  onLoad: (productoId?: string, almacenId?: string) => Promise<MovimientoStock[]>;
  onClose: () => void;
}

const MovimientosPanel: React.FC<MovimientosProps> = ({ productoId, almacenId, onLoad, onClose }) => {
  const [movimientos, setMovimientos] = useState<MovimientoStock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    onLoad(productoId, almacenId).then(data => { setMovimientos(data); setLoading(false); });
  }, [productoId, almacenId, onLoad]);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <History size={16} /> Historial de movimientos
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg leading-none">&times;</button>
        </div>
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-slate-400 text-sm">Cargando…</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs text-slate-500 uppercase sticky top-0">
                  <th className="px-4 py-2 text-left">Fecha</th>
                  <th className="px-4 py-2 text-left">Tipo</th>
                  <th className="px-4 py-2 text-left">Almacén</th>
                  <th className="px-4 py-2 text-right">Cantidad</th>
                  <th className="px-4 py-2 text-right">P. Coste</th>
                  <th className="px-4 py-2 text-left">Doc</th>
                </tr>
              </thead>
              <tbody>
                {movimientos.map(m => {
                  const meta = TIPO_MOVIMIENTO_LABEL[m.tipo];
                  return (
                    <tr key={m.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-2 text-slate-600">
                        {new Date(m.createdAt).toLocaleDateString('es-ES')}
                      </td>
                      <td className="px-3 py-1.5">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${meta.color}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-slate-600">{m.almacenNombre || m.almacenId}</td>
                      <td className={`px-4 py-2 text-right font-semibold ${
                        meta.sign === '+' ? 'text-green-700' : 'text-red-600'
                      }`}>
                        {meta.sign}{fmtNum(m.cantidad)}
                      </td>
                      <td className="px-4 py-2 text-right text-slate-600">
                        {m.precioCoste ? fmt(m.precioCoste) : '—'}
                      </td>
                      <td className="px-4 py-2 text-slate-500 text-xs">{m.referenciaDoc || '—'}</td>
                    </tr>
                  );
                })}
                {movimientos.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400 text-sm italic">
                    Sin movimientos registrados.
                  </td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Vista principal ──────────────────────────────────────────────────────────

interface StockViewProps {
  currentUser: User;
  almacenes: Almacen[];
}

export const StockView: React.FC<StockViewProps> = ({ currentUser, almacenes }) => {
  const { stock, loading, error, reload, ajustarStock, loadMovimientos } = useCompras();

  const [search, setSearch] = useState('');
  const [filtroAlmacen, setFiltroAlmacen] = useState('');
  const [soloConStock, setSoloConStock] = useState(false);
  const [sortField, setSortField] = useState<'productoId' | 'cantidad' | 'pmp' | 'valorTotal'>('productoId');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [ajusteItem, setAjusteItem] = useState<StockItem | null>(null);
  const [movProductoId, setMovProductoId] = useState<string | null>(null);
  const [movAlmacenId, setMovAlmacenId] = useState<string | null>(null);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const q = search.toLowerCase();
  const filtered = stock
    .filter(s => {
      if (filtroAlmacen && s.almacenId !== filtroAlmacen) return false;
      if (soloConStock && s.cantidad <= 0) return false;
      if (q && !s.productoId.toLowerCase().includes(q) &&
          !(s.productoNombre || '').toLowerCase().includes(q) &&
          !(s.productoReferencia || '').toLowerCase().includes(q) &&
          !(s.almacenNombre || '').toLowerCase().includes(q)) return false;
      return true;
    })
    .map(s => ({ ...s, valorTotal: s.cantidad * s.pmp }))
    .sort((a, b) => {
      let cmp = 0;
      if (sortField === 'productoId') cmp = a.productoId.localeCompare(b.productoId);
      else if (sortField === 'cantidad') cmp = a.cantidad - b.cantidad;
      else if (sortField === 'pmp') cmp = a.pmp - b.pmp;
      else cmp = a.valorTotal - b.valorTotal;
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const totalValor = filtered.reduce((s, item) => s + item.valorTotal, 0);

  const SortBtn = ({ field, label }: { field: typeof sortField; label: string }) => (
    <button
      className="flex items-center gap-1 group"
      onClick={() => toggleSort(field)}
    >
      {label}
      <ArrowUpDown size={11} className={`transition-colors ${sortField === field ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
    </button>
  );

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-slate-400 text-sm">Cargando stock…</div>
    </div>
  );

  if (error) return (
    <div className="p-4">
      <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
        <AlertCircle size={18} className="text-red-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-red-800">Error al cargar stock</p>
          <p className="text-xs text-red-600 mt-1">{error}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-2 sm:p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Stock por Almacén</h1>
          <p className="text-sm text-slate-500 mt-0.5">Inventario en tiempo real con Precio Medio Ponderado</p>
        </div>
        <button onClick={reload} className="text-xs text-slate-400 hover:text-slate-600 underline">Actualizar</button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Referencias</div>
          <div className="text-xl font-bold text-slate-900">{stock.length}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Con stock</div>
          <div className="text-xl font-bold text-green-700">{stock.filter(s => s.cantidad > 0).length}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Sin stock</div>
          <div className="text-xl font-bold text-red-500">{stock.filter(s => s.cantidad <= 0).length}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Valor total</div>
          <div className="text-lg font-bold text-slate-900">
            {fmt(stock.reduce((s, item) => s + item.cantidad * item.pmp, 0))}
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            className="pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400 w-56"
            placeholder="Buscar producto…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Sliders size={14} className="text-slate-400" />
          <select
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
            value={filtroAlmacen}
            onChange={e => setFiltroAlmacen(e.target.value)}
          >
            <option value="">Todos los almacenes</option>
            {almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
          <input
            type="checkbox"
            checked={soloConStock}
            onChange={e => setSoloConStock(e.target.checked)}
            className="w-4 h-4 rounded"
          />
          Solo con stock
        </label>

        {filtered.length !== stock.length && (
          <span className="text-xs text-slate-400">{filtered.length} resultados</span>
        )}
      </div>

      {/* Tabla */}
      <div className="border border-slate-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
              <th className="px-3 py-2 text-left">
                <SortBtn field="productoId" label="Producto" />
              </th>
              <th className="px-3 py-2 text-left">Almacén</th>
              <th className="px-3 py-2 text-right">
                <SortBtn field="cantidad" label="Cantidad" />
              </th>
              <th className="px-3 py-2 text-right">
                <SortBtn field="pmp" label="PMP" />
              </th>
              <th className="px-3 py-2 text-right">
                <SortBtn field="valorTotal" label="Valor total" />
              </th>
              <th className="px-3 py-2 text-left">Actualizado</th>
              <th className="px-3 py-2 w-20" />
            </tr>
          </thead>
          <tbody>
            {filtered.map(item => (
              <tr
                key={item.id}
                className={`border-t border-slate-100 hover:bg-slate-50 ${item.cantidad <= 0 ? 'opacity-60' : ''}`}
              >
                <td className="px-3 py-2">
                  <div className="font-medium text-slate-800">
                    {item.productoNombre || <span className="text-slate-400 text-xs font-mono">{item.productoId.slice(0, 8)}…</span>}
                  </div>
                  {item.productoReferencia && (
                    <div className="text-xs text-slate-400">{item.productoReferencia}</div>
                  )}
                </td>
                <td className="px-3 py-2 text-slate-600">{item.almacenNombre || item.almacenId}</td>
                <td className="px-3 py-2 text-right">
                  <span className={`font-semibold ${item.cantidad <= 0 ? 'text-red-500' : 'text-slate-900'}`}>
                    {fmtNum(item.cantidad)}
                  </span>
                </td>
                <td className="px-3 py-2 text-right text-slate-700">{fmt(item.pmp)}</td>
                <td className="px-3 py-2 text-right font-semibold text-slate-800">
                  {fmt(item.valorTotal)}
                </td>
                <td className="px-3 py-2 text-xs text-slate-400">
                  {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('es-ES') : '—'}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      onClick={() => setAjusteItem(item)}
                      title="Ajustar stock"
                      className="text-slate-400 hover:text-amber-600 transition-colors"
                    >
                      <Sliders size={14} />
                    </button>
                    <button
                      onClick={() => { setMovProductoId(item.productoId); setMovAlmacenId(item.almacenId); }}
                      title="Ver movimientos"
                      className="text-slate-400 hover:text-blue-600 transition-colors"
                    >
                      <History size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-400 text-sm italic">
                  {stock.length === 0
                    ? 'Sin registros de stock. Se generarán automáticamente al confirmar recepciones.'
                    : 'No hay productos que coincidan con los filtros.'}
                </td>
              </tr>
            )}
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr className="bg-slate-50 border-t border-slate-200">
                <td colSpan={4} className="px-3 py-2 text-sm font-semibold text-slate-700">
                  Total ({filtered.length} líneas)
                </td>
                <td className="px-3 py-2 text-right text-sm font-bold text-slate-900">
                  {fmt(totalValor)}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Modal ajuste */}
      {ajusteItem && (
        <AjusteModal
          item={ajusteItem}
          currentUser={currentUser}
          almacenNombre={almacenes.find(a => a.id === ajusteItem.almacenId)?.nombre || ajusteItem.almacenId}
          onAjustar={ajustarStock}
          onClose={() => setAjusteItem(null)}
        />
      )}

      {/* Panel movimientos */}
      {movProductoId && (
        <MovimientosPanel
          productoId={movProductoId}
          almacenId={movAlmacenId || undefined}
          onLoad={loadMovimientos}
          onClose={() => { setMovProductoId(null); setMovAlmacenId(null); }}
        />
      )}
    </div>
  );
};
