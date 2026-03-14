import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { TrazaProducto, TipoDocTraza, StockAlmacenDetalle } from '../types';

// ─── Mappers ──────────────────────────────────────────────────────────────────

const mapTraza = (r: any): TrazaProducto => ({
  tipoDoc:       r.tipo_doc as TipoDocTraza,
  docId:         r.doc_id,
  referencia:    r.referencia || '—',
  empresaId:     r.empresa_id,
  clienteNombre: r.cliente_nombre,
  fecha:         r.fecha,
  estado:        r.estado,
  total:         r.total != null ? Number(r.total) : undefined,
  productoId:    r.producto_id,
  cantidad:      Number(r.cantidad),
  precioUnitario: Number(r.precio_unitario),
  subtotal:      Number(r.subtotal),
});

const mapStock = (r: any): StockAlmacenDetalle => ({
  productoId:   r.producto_id,
  almacenId:    r.almacen_id,
  almacenNombre: r.almacen_nombre,
  almacenTipo:  r.almacen_tipo,
  cantidad:     Number(r.cantidad),
  pmp:          r.pmp != null ? Number(r.pmp) : undefined,
  updatedAt:    r.updated_at,
});

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useMateriales() {
  const [traza,       setTraza]       = useState<TrazaProducto[]>([]);
  const [stock,       setStock]       = useState<StockAlmacenDetalle[]>([]);
  const [loadingTraza, setLoadingTraza] = useState(false);
  const [loadingStock, setLoadingStock] = useState(false);

  /**
   * Carga todos los documentos donde aparece el producto dado.
   * Requiere que v_traza_producto exista (paso13_materiales_activos.sql).
   */
  const loadTraza = useCallback(async (productoId: string) => {
    setLoadingTraza(true);
    const { data, error } = await supabase
      .from('v_traza_producto')
      .select('*')
      .eq('producto_id', productoId)
      .order('fecha', { ascending: false });
    setLoadingTraza(false);
    if (error) return; // tabla no creada aún → ignorar
    setTraza((data || []).map(mapTraza));
  }, []);

  /**
   * Carga el stock del producto en todos los almacenes.
   * Requiere que v_stock_producto exista (paso13_materiales_activos.sql).
   * Si la vista no existe, cae back a stock_almacen directo.
   */
  const loadStock = useCallback(async (productoId: string) => {
    setLoadingStock(true);
    // Intentar con la vista enriquecida primero
    let { data, error } = await supabase
      .from('v_stock_producto')
      .select('*')
      .eq('producto_id', productoId);

    if (error) {
      // Fallback: tabla stock base sin nombre de almacén
      const fallback = await supabase
        .from('stock')
        .select('*')
        .eq('producto_id', productoId);
      data = (fallback.data || []).map((r: any) => ({
        ...r,
        almacen_nombre: r.almacen_id,
        almacen_tipo: null,
      }));
    }
    setLoadingStock(false);
    setStock((data || []).map(mapStock));
  }, []);

  /** Carga traza y stock en paralelo para el producto seleccionado */
  const loadDetalleProducto = useCallback(async (productoId: string) => {
    await Promise.all([loadTraza(productoId), loadStock(productoId)]);
  }, [loadTraza, loadStock]);

  /** Resetea al cambiar de producto */
  const clearDetalle = useCallback(() => {
    setTraza([]);
    setStock([]);
  }, []);

  return {
    traza, stock,
    loadingTraza, loadingStock,
    loadTraza, loadStock, loadDetalleProducto, clearDetalle,
  };
}
