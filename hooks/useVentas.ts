import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
  Presupuesto, PedidoVenta, Albaran, Factura,
  DocumentoLinea, EstadoPresupuesto, EstadoPedidoVenta, EstadoAlbaran, EstadoFactura,
  DevolucionVenta, DevolucionLinea, EstadoDevolucion, MotivoDevolucion, TipoAbono,
} from '../types';

// ─── Helpers de mapeo DB → TS ─────────────────────────────────────────────────

const mapLinea = (r: any): DocumentoLinea => ({
  id: r.id,
  orden: r.orden,
  productoId: r.producto_id,
  descripcion: r.descripcion,
  cantidad: Number(r.cantidad),
  precioUnitario: Number(r.precio_unitario),
  descuento: Number(r.descuento),
  ivaPorcentaje: Number(r.iva_porcentaje),
  subtotal: Number(r.subtotal),
});

const mapPresupuesto = (r: any): Presupuesto => ({
  id: r.id,
  referencia: r.referencia,
  empresaId: r.empresa_id,
  delegacionId: r.delegacion_id,
  clienteId: r.cliente_id,
  clienteNombre: r.cliente_nombre,
  fecha: r.fecha,
  fechaValidez: r.fecha_validez,
  estado: r.estado as EstadoPresupuesto,
  subtotal: Number(r.subtotal),
  descuentoGlobal: Number(r.descuento_global),
  baseImponible: Number(r.base_imponible),
  ivaPorcentaje: Number(r.iva_porcentaje),
  iva: Number(r.iva),
  total: Number(r.total),
  notas: r.notas,
  condiciones: r.condiciones,
  createdBy: r.created_by,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const mapPedido = (r: any): PedidoVenta => ({
  id: r.id,
  referencia: r.referencia,
  presupuestoId: r.presupuesto_id,
  empresaId: r.empresa_id,
  delegacionId: r.delegacion_id,
  almacenId: r.almacen_id,
  clienteId: r.cliente_id,
  clienteNombre: r.cliente_nombre,
  fecha: r.fecha,
  fechaEntrega: r.fecha_entrega,
  estado: r.estado as EstadoPedidoVenta,
  subtotal: Number(r.subtotal),
  descuentoGlobal: Number(r.descuento_global),
  baseImponible: Number(r.base_imponible),
  ivaPorcentaje: Number(r.iva_porcentaje),
  iva: Number(r.iva),
  total: Number(r.total),
  metodoEnvio: r.metodo_envio,
  notas: r.notas,
  createdBy: r.created_by,
  createdAt: r.created_at,
});

const mapAlbaran = (r: any): Albaran => ({
  id: r.id,
  referencia: r.referencia,
  pedidoVentaId: r.pedido_venta_id,
  empresaId: r.empresa_id,
  delegacionId: r.delegacion_id,
  almacenId: r.almacen_id,
  clienteId: r.cliente_id,
  clienteNombre: r.cliente_nombre,
  fecha: r.fecha,
  estado: r.estado as EstadoAlbaran,
  firmaCliente: r.firma_cliente,
  firmaFecha: r.firma_fecha,
  firmaNombre: r.firma_nombre,
  notas: r.notas,
  createdBy: r.created_by,
  createdAt: r.created_at,
});

const mapDevolucion = (r: any): DevolucionVenta => ({
  id: r.id,
  referencia: r.referencia,
  empresaId: r.empresa_id,
  delegacionId: r.delegacion_id,
  facturaId: r.factura_id,
  facturaRef: r.factura_ref,
  albaranId: r.albaran_id,
  albaranRef: r.albaran_ref,
  clienteId: r.cliente_id,
  clienteNombre: r.cliente_nombre,
  almacenId: r.almacen_id,
  almacenNombre: r.almacen_nombre,
  fecha: r.fecha,
  motivo: r.motivo as MotivoDevolucion,
  estado: r.estado as EstadoDevolucion,
  subtotal: Number(r.subtotal),
  baseImponible: Number(r.base_imponible),
  ivaPorcentaje: Number(r.iva_porcentaje),
  iva: Number(r.iva),
  total: Number(r.total),
  tipoAbono: r.tipo_abono as TipoAbono,
  notaCreditoRef: r.nota_credito_ref,
  notas: r.notas,
  createdAt: r.created_at,
});

const mapDevolucionLinea = (r: any): DevolucionLinea => ({
  id: r.id,
  devolucionId: r.devolucion_id,
  orden: r.orden,
  productoId: r.producto_id,
  descripcion: r.descripcion,
  cantidad: Number(r.cantidad),
  precioUnitario: Number(r.precio_unitario),
  descuento: Number(r.descuento),
  ivaPorcentaje: Number(r.iva_porcentaje),
  subtotal: Number(r.subtotal),
});

const mapFactura = (r: any): Factura => ({
  id: r.id,
  serie: r.serie,
  numero: r.numero,
  referencia: r.referencia,
  empresaId: r.empresa_id,
  delegacionId: r.delegacion_id,
  clienteId: r.cliente_id,
  clienteNombre: r.cliente_nombre,
  presupuestoId: r.presupuesto_id,
  pedidoVentaId: r.pedido_venta_id,
  albaranId: r.albaran_id,
  fecha: r.fecha,
  fechaVencimiento: r.fecha_vencimiento,
  estado: r.estado as EstadoFactura,
  subtotal: Number(r.subtotal),
  descuentoGlobal: Number(r.descuento_global),
  baseImponible: Number(r.base_imponible),
  ivaPorcentaje: Number(r.iva_porcentaje),
  iva: Number(r.iva),
  total: Number(r.total),
  metodoCobro: r.metodo_cobro,
  fechaCobro: r.fecha_cobro,
  notas: r.notas,
  verifactuHash: r.verifactu_hash,
  createdBy: r.created_by,
  createdAt: r.created_at,
});

// ─── Cálculo de totales de líneas ─────────────────────────────────────────────

export interface TotalesDocumento {
  subtotal: number;
  baseImponible: number;
  iva: number;
  total: number;
}

export function calcularTotalesLineas(
  lineas: DocumentoLinea[],
  descuentoGlobal = 0,
  ivaPorcentaje = 21
): TotalesDocumento {
  const subtotal = lineas.reduce((s, l) => s + l.subtotal, 0);
  const baseImponible = subtotal * (1 - descuentoGlobal / 100);
  const iva = baseImponible * (ivaPorcentaje / 100);
  const total = baseImponible + iva;
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    baseImponible: Math.round(baseImponible * 100) / 100,
    iva: Math.round(iva * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

export function calcularSubtotalLinea(l: Pick<DocumentoLinea, 'cantidad' | 'precioUnitario' | 'descuento'>): number {
  return Math.round(l.cantidad * l.precioUnitario * (1 - l.descuento / 100) * 100) / 100;
}

// ─── Hook principal ───────────────────────────────────────────────────────────

export function useVentas() {
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [pedidos, setPedidos] = useState<PedidoVenta[]>([]);
  const [albaranes, setAlbaranes] = useState<Albaran[]>([]);
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [devoluciones, setDevoluciones] = useState<DevolucionVenta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Cargas ──────────────────────────────────────────────────

  const loadPresupuestos = useCallback(async () => {
    const { data, error } = await supabase
      .from('presupuestos')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    setPresupuestos((data || []).map(mapPresupuesto));
  }, []);

  const loadPedidos = useCallback(async () => {
    const { data, error } = await supabase
      .from('pedidos_venta')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    setPedidos((data || []).map(mapPedido));
  }, []);

  const loadAlbaranes = useCallback(async () => {
    const { data, error } = await supabase
      .from('albaranes')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    setAlbaranes((data || []).map(mapAlbaran));
  }, []);

  const loadFacturas = useCallback(async () => {
    const { data, error } = await supabase
      .from('facturas')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    setFacturas((data || []).map(mapFactura));
  }, []);

  const loadDevoluciones = useCallback(async () => {
    const { data, error } = await supabase
      .from('devoluciones_venta')
      .select('*')
      .order('created_at', { ascending: false });
    // Si la tabla aún no existe (PASO 12 pendiente), ignorar silenciosamente
    if (error) return;
    setDevoluciones((data || []).map(mapDevolucion));
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([loadPresupuestos(), loadPedidos(), loadAlbaranes(), loadFacturas(), loadDevoluciones()]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [loadPresupuestos, loadPedidos, loadAlbaranes, loadFacturas, loadDevoluciones]);

  // ── Cargar líneas de un documento ────────────────────────────

  const loadLineas = async (tabla: string, fkCol: string, docId: string): Promise<DocumentoLinea[]> => {
    const { data, error } = await supabase
      .from(tabla)
      .select('*')
      .eq(fkCol, docId)
      .order('orden');
    if (error) throw new Error(error.message);
    return (data || []).map(mapLinea);
  };

  const getPresupuestoConLineas = async (id: string): Promise<Presupuesto | null> => {
    const { data, error } = await supabase.from('presupuestos').select('*').eq('id', id).single();
    if (error || !data) return null;
    const lineas = await loadLineas('presupuesto_lineas', 'presupuesto_id', id);
    return { ...mapPresupuesto(data), lineas };
  };

  const getPedidoConLineas = async (id: string): Promise<PedidoVenta | null> => {
    const { data, error } = await supabase.from('pedidos_venta').select('*').eq('id', id).single();
    if (error || !data) return null;
    const lineas = await loadLineas('pedido_venta_lineas', 'pedido_venta_id', id);
    return { ...mapPedido(data), lineas };
  };

  const getAlbaranConLineas = async (id: string): Promise<Albaran | null> => {
    const { data, error } = await supabase.from('albaranes').select('*').eq('id', id).single();
    if (error || !data) return null;
    const lineas = await loadLineas('albaran_lineas', 'albaran_id', id);
    return { ...mapAlbaran(data), lineas };
  };

  const getFacturaConLineas = async (id: string): Promise<Factura | null> => {
    const { data, error } = await supabase.from('facturas').select('*').eq('id', id).single();
    if (error || !data) return null;
    const lineas = await loadLineas('factura_lineas', 'factura_id', id);
    return { ...mapFactura(data), lineas };
  };

  // ── CRUD Presupuestos ────────────────────────────────────────

  const saveLineas = async (
    tabla: string, fkCol: string, docId: string, lineas: DocumentoLinea[]
  ) => {
    await supabase.from(tabla).delete().eq(fkCol, docId);
    if (lineas.length === 0) return;
    const rows = lineas.map((l, i) => ({
      [fkCol]: docId,
      orden: i + 1,
      producto_id: l.productoId || null,
      descripcion: l.descripcion,
      cantidad: l.cantidad,
      precio_unitario: l.precioUnitario,
      descuento: l.descuento,
      iva_porcentaje: l.ivaPorcentaje,
      subtotal: l.subtotal,
    }));
    const { error } = await supabase.from(tabla).insert(rows);
    if (error) throw new Error(error.message);
  };

  const createPresupuesto = async (
    data: Omit<Presupuesto, 'id' | 'referencia' | 'lineas'>,
    lineas: DocumentoLinea[]
  ): Promise<Presupuesto> => {
    const row = {
      empresa_id: data.empresaId,
      delegacion_id: data.delegacionId || null,
      cliente_id: data.clienteId,
      cliente_nombre: data.clienteNombre || null,
      fecha: data.fecha,
      fecha_validez: data.fechaValidez || null,
      estado: data.estado || 'borrador',
      subtotal: data.subtotal,
      descuento_global: data.descuentoGlobal,
      base_imponible: data.baseImponible,
      iva_porcentaje: data.ivaPorcentaje,
      iva: data.iva,
      total: data.total,
      notas: data.notas || null,
      condiciones: data.condiciones || null,
      created_by: data.createdBy || null,
    };
    const { data: created, error } = await supabase
      .from('presupuestos').insert(row).select().single();
    if (error || !created) throw new Error(error?.message || 'Error creando presupuesto');
    await saveLineas('presupuesto_lineas', 'presupuesto_id', created.id, lineas);
    await loadPresupuestos();
    return mapPresupuesto(created);
  };

  const updatePresupuesto = async (
    id: string,
    data: Partial<Omit<Presupuesto, 'id' | 'referencia' | 'lineas'>>,
    lineas?: DocumentoLinea[]
  ) => {
    const row: any = { updated_at: new Date().toISOString() };
    if (data.estado          !== undefined) row.estado           = data.estado;
    if (data.fechaValidez    !== undefined) row.fecha_validez    = data.fechaValidez;
    if (data.fecha           !== undefined) row.fecha            = data.fecha;
    if (data.clienteId       !== undefined) row.cliente_id       = data.clienteId;
    if (data.clienteNombre   !== undefined) row.cliente_nombre   = data.clienteNombre;
    if (data.delegacionId    !== undefined) row.delegacion_id    = data.delegacionId;
    if (data.subtotal        !== undefined) row.subtotal         = data.subtotal;
    if (data.descuentoGlobal !== undefined) row.descuento_global = data.descuentoGlobal;
    if (data.baseImponible   !== undefined) row.base_imponible   = data.baseImponible;
    if (data.ivaPorcentaje   !== undefined) row.iva_porcentaje   = data.ivaPorcentaje;
    if (data.iva             !== undefined) row.iva              = data.iva;
    if (data.total           !== undefined) row.total            = data.total;
    if (data.notas           !== undefined) row.notas            = data.notas;
    if (data.condiciones     !== undefined) row.condiciones      = data.condiciones;
    const { error } = await supabase.from('presupuestos').update(row).eq('id', id);
    if (error) throw new Error(error.message);
    if (lineas !== undefined) await saveLineas('presupuesto_lineas', 'presupuesto_id', id, lineas);
    await loadPresupuestos();
  };

  // ── CRUD Pedidos ─────────────────────────────────────────────

  const createPedido = async (
    data: Omit<PedidoVenta, 'id' | 'referencia' | 'lineas'>,
    lineas: DocumentoLinea[]
  ): Promise<PedidoVenta> => {
    const row = {
      presupuesto_id: data.presupuestoId || null,
      empresa_id: data.empresaId,
      delegacion_id: data.delegacionId || null,
      almacen_id: data.almacenId || null,
      cliente_id: data.clienteId,
      cliente_nombre: data.clienteNombre || null,
      fecha: data.fecha,
      fecha_entrega: data.fechaEntrega || null,
      estado: data.estado || 'confirmado',
      subtotal: data.subtotal,
      descuento_global: data.descuentoGlobal,
      base_imponible: data.baseImponible,
      iva_porcentaje: data.ivaPorcentaje,
      iva: data.iva,
      total: data.total,
      metodo_envio: data.metodoEnvio || 'agencia',
      notas: data.notas || null,
      created_by: data.createdBy || null,
    };
    const { data: created, error } = await supabase
      .from('pedidos_venta').insert(row).select().single();
    if (error || !created) throw new Error(error?.message || 'Error creando pedido');
    await saveLineas('pedido_venta_lineas', 'pedido_venta_id', created.id, lineas);
    if (data.presupuestoId) {
      await supabase.from('presupuestos')
        .update({ estado: 'facturado', updated_at: new Date().toISOString() })
        .eq('id', data.presupuestoId);
    }
    await Promise.all([loadPedidos(), loadPresupuestos()]);
    return mapPedido(created);
  };

  const updatePedido = async (
    id: string,
    data: Partial<Omit<PedidoVenta, 'id' | 'referencia' | 'lineas'>>,
    lineas?: DocumentoLinea[]
  ) => {
    const row: any = { updated_at: new Date().toISOString() };
    if (data.estado          !== undefined) row.estado           = data.estado;
    if (data.fechaEntrega    !== undefined) row.fecha_entrega    = data.fechaEntrega;
    if (data.almacenId       !== undefined) row.almacen_id       = data.almacenId;
    if (data.subtotal        !== undefined) row.subtotal         = data.subtotal;
    if (data.descuentoGlobal !== undefined) row.descuento_global = data.descuentoGlobal;
    if (data.baseImponible   !== undefined) row.base_imponible   = data.baseImponible;
    if (data.ivaPorcentaje   !== undefined) row.iva_porcentaje   = data.ivaPorcentaje;
    if (data.iva             !== undefined) row.iva              = data.iva;
    if (data.total           !== undefined) row.total            = data.total;
    if (data.metodoEnvio     !== undefined) row.metodo_envio     = data.metodoEnvio;
    if (data.notas           !== undefined) row.notas            = data.notas;
    const { error } = await supabase.from('pedidos_venta').update(row).eq('id', id);
    if (error) throw new Error(error.message);
    if (lineas !== undefined) await saveLineas('pedido_venta_lineas', 'pedido_venta_id', id, lineas);
    await loadPedidos();
  };

  // ── CRUD Albaranes ───────────────────────────────────────────

  const createAlbaran = async (
    data: Omit<Albaran, 'id' | 'referencia' | 'lineas'>,
    lineas: DocumentoLinea[]
  ): Promise<Albaran> => {
    const row = {
      pedido_venta_id: data.pedidoVentaId || null,
      empresa_id: data.empresaId,
      delegacion_id: data.delegacionId || null,
      almacen_id: data.almacenId || null,
      cliente_id: data.clienteId,
      cliente_nombre: data.clienteNombre || null,
      fecha: data.fecha,
      estado: 'pendiente',
      notas: data.notas || null,
      created_by: data.createdBy || null,
    };
    const { data: created, error } = await supabase
      .from('albaranes').insert(row).select().single();
    if (error || !created) throw new Error(error?.message || 'Error creando albarán');
    await saveLineas('albaran_lineas', 'albaran_id', created.id, lineas);
    if (data.pedidoVentaId) {
      await supabase.from('pedidos_venta')
        .update({ estado: 'entregado', updated_at: new Date().toISOString() })
        .eq('id', data.pedidoVentaId);
    }
    await Promise.all([loadAlbaranes(), loadPedidos()]);
    return mapAlbaran(created);
  };

  const firmarAlbaran = async (id: string, firmaBase64: string, firmaNombre: string) => {
    const { error } = await supabase.from('albaranes').update({
      firma_cliente: firmaBase64,
      firma_nombre: firmaNombre,
      firma_fecha: new Date().toISOString(),
      estado: 'firmado',
    }).eq('id', id);
    if (error) throw new Error(error.message);
    await loadAlbaranes();
  };

  // ── CRUD Facturas ────────────────────────────────────────────

  const createFactura = async (
    data: Omit<Factura, 'id' | 'serie' | 'numero' | 'referencia' | 'lineas'>,
    lineas: DocumentoLinea[],
    serie: string
  ): Promise<Factura> => {
    // Obtener siguiente número vía función de BD
    const anio = new Date(data.fecha).getFullYear();
    const { data: numData, error: numErr } = await supabase
      .rpc('next_factura_number', { p_empresa_id: data.empresaId, p_serie: serie, p_anio: anio });
    if (numErr) throw new Error(numErr.message);
    const numero = numData as number;
    const referencia = `${serie}-${String(numero).padStart(4, '0')}`;

    const row = {
      serie,
      numero,
      referencia,
      empresa_id: data.empresaId,
      delegacion_id: data.delegacionId || null,
      cliente_id: data.clienteId,
      cliente_nombre: data.clienteNombre || null,
      presupuesto_id: data.presupuestoId || null,
      pedido_venta_id: data.pedidoVentaId || null,
      albaran_id: data.albaranId || null,
      fecha: data.fecha,
      fecha_vencimiento: data.fechaVencimiento || null,
      estado: data.estado || 'emitida',
      subtotal: data.subtotal,
      descuento_global: data.descuentoGlobal,
      base_imponible: data.baseImponible,
      iva_porcentaje: data.ivaPorcentaje,
      iva: data.iva,
      total: data.total,
      metodo_cobro: data.metodoCobro || null,
      notas: data.notas || null,
      created_by: data.createdBy || null,
    };
    const { data: created, error } = await supabase.from('facturas').insert(row).select().single();
    if (error || !created) throw new Error(error?.message || 'Error creando factura');
    await saveLineas('factura_lineas', 'factura_id', created.id, lineas);

    // Marcar documentos origen como facturados
    if (data.albaranId) {
      await supabase.from('albaranes').update({ estado: 'facturado' }).eq('id', data.albaranId);
    }
    if (data.pedidoVentaId) {
      await supabase.from('pedidos_venta')
        .update({ estado: 'facturado', updated_at: new Date().toISOString() })
        .eq('id', data.pedidoVentaId);
    }
    await Promise.all([loadFacturas(), loadAlbaranes(), loadPedidos()]);
    return mapFactura(created);
  };

  const marcarCobrada = async (id: string, metodoCobro: string, fechaCobro: string) => {
    const { error } = await supabase.from('facturas').update({
      estado: 'cobrada',
      metodo_cobro: metodoCobro,
      fecha_cobro: fechaCobro,
      updated_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) throw new Error(error.message);
    await loadFacturas();
  };

  const updateFactura = async (
    id: string,
    data: Partial<Omit<Factura, 'id' | 'referencia' | 'lineas'>>
  ) => {
    const row: any = { updated_at: new Date().toISOString() };
    if (data.estado          !== undefined) row.estado           = data.estado;
    if (data.fechaVencimiento!== undefined) row.fecha_vencimiento= data.fechaVencimiento;
    if (data.metodoCobro     !== undefined) row.metodo_cobro     = data.metodoCobro;
    if (data.fechaCobro      !== undefined) row.fecha_cobro      = data.fechaCobro;
    if (data.notas           !== undefined) row.notas            = data.notas;
    const { error } = await supabase.from('facturas').update(row).eq('id', id);
    if (error) throw new Error(error.message);
    await loadFacturas();
  };

  // ── Conversiones entre documentos ────────────────────────────

  /** Devuelve un PedidoVenta draft pre-relleno desde un presupuesto (sin guardarlo) */
  const presupuestoToPedidoDraft = async (presupuestoId: string): Promise<{
    pedido: Omit<PedidoVenta, 'id' | 'referencia'>;
    lineas: DocumentoLinea[];
  } | null> => {
    const pres = await getPresupuestoConLineas(presupuestoId);
    if (!pres) return null;
    return {
      pedido: {
        presupuestoId: pres.id,
        empresaId: pres.empresaId,
        delegacionId: pres.delegacionId,
        clienteId: pres.clienteId,
        clienteNombre: pres.clienteNombre,
        fecha: new Date().toISOString().split('T')[0],
        estado: 'confirmado',
        subtotal: pres.subtotal,
        descuentoGlobal: pres.descuentoGlobal,
        baseImponible: pres.baseImponible,
        ivaPorcentaje: pres.ivaPorcentaje,
        iva: pres.iva,
        total: pres.total,
        notas: pres.notas,
      },
      lineas: pres.lineas || [],
    };
  };

  /** Devuelve un Albaran draft pre-relleno desde un pedido (sin guardarlo) */
  const pedidoToAlbaranDraft = async (pedidoId: string): Promise<{
    albaran: Omit<Albaran, 'id' | 'referencia'>;
    lineas: DocumentoLinea[];
  } | null> => {
    const ped = await getPedidoConLineas(pedidoId);
    if (!ped) return null;
    return {
      albaran: {
        pedidoVentaId: ped.id,
        empresaId: ped.empresaId,
        delegacionId: ped.delegacionId,
        almacenId: ped.almacenId,
        clienteId: ped.clienteId,
        clienteNombre: ped.clienteNombre,
        fecha: new Date().toISOString().split('T')[0],
        estado: 'pendiente',
        notas: ped.notas,
      },
      lineas: ped.lineas || [],
    };
  };

  /** Devuelve una Factura draft pre-rellena desde un albarán (sin guardarla) */
  const albaranToFacturaDraft = async (albaranId: string): Promise<{
    factura: Omit<Factura, 'id' | 'serie' | 'numero' | 'referencia'>;
    lineas: DocumentoLinea[];
  } | null> => {
    const alb = await getAlbaranConLineas(albaranId);
    if (!alb) return null;
    return {
      factura: {
        empresaId: alb.empresaId,
        delegacionId: alb.delegacionId,
        clienteId: alb.clienteId,
        clienteNombre: alb.clienteNombre,
        albaranId: alb.id,
        fecha: new Date().toISOString().split('T')[0],
        estado: 'emitida',
        subtotal: alb.lineas?.reduce((s, l) => s + l.subtotal, 0) || 0,
        descuentoGlobal: 0,
        baseImponible: alb.lineas?.reduce((s, l) => s + l.subtotal, 0) || 0,
        ivaPorcentaje: 21,
        iva: 0,
        total: 0,
        notas: alb.notas,
      },
      lineas: alb.lineas || [],
    };
  };

  // ── CRUD Devoluciones ────────────────────────────────────────

  const getDevolucionConLineas = async (id: string): Promise<DevolucionVenta | null> => {
    const { data, error } = await supabase.from('devoluciones_venta').select('*').eq('id', id).single();
    if (error || !data) return null;
    const { data: linData } = await supabase
      .from('devolucion_lineas').select('*').eq('devolucion_id', id).order('orden');
    const lineas = (linData || []).map(mapDevolucionLinea);
    return { ...mapDevolucion(data), lineas };
  };

  const createDevolucion = async (
    data: Omit<DevolucionVenta, 'id' | 'referencia' | 'lineas'>,
    lineas: DevolucionLinea[]
  ): Promise<DevolucionVenta> => {
    const row = {
      empresa_id: data.empresaId,
      delegacion_id: data.delegacionId || null,
      factura_id: data.facturaId || null,
      albaran_id: data.albaranId || null,
      cliente_id: data.clienteId || null,
      cliente_nombre: data.clienteNombre,
      almacen_id: data.almacenId || null,
      fecha: data.fecha,
      motivo: data.motivo,
      estado: data.estado || 'pendiente',
      subtotal: data.subtotal,
      base_imponible: data.baseImponible,
      iva_porcentaje: data.ivaPorcentaje,
      iva: data.iva,
      total: data.total,
      tipo_abono: data.tipoAbono,
      nota_credito_ref: data.notaCreditoRef || null,
      notas: data.notas || null,
    };
    const { data: created, error } = await supabase
      .from('devoluciones_venta').insert(row).select().single();
    if (error || !created) throw new Error(error?.message || 'Error creando devolución');
    if (lineas.length > 0) {
      const rows = lineas.map((l, i) => ({
        devolucion_id: created.id,
        orden: i + 1,
        producto_id: l.productoId || null,
        descripcion: l.descripcion,
        cantidad: l.cantidad,
        precio_unitario: l.precioUnitario,
        descuento: l.descuento,
        iva_porcentaje: l.ivaPorcentaje,
        subtotal: l.subtotal,
      }));
      const { error: linErr } = await supabase.from('devolucion_lineas').insert(rows);
      if (linErr) throw new Error(linErr.message);
    }
    await loadDevoluciones();
    return mapDevolucion(created);
  };

  const updateDevolucionEstado = async (
    id: string,
    estado: EstadoDevolucion,
    extra?: { almacenId?: string; notas?: string; notaCreditoRef?: string }
  ) => {
    const row: any = { estado, updated_at: new Date().toISOString() };
    if (extra?.almacenId) row.almacen_id = extra.almacenId;
    if (extra?.notas !== undefined) row.notas = extra.notas;
    if (extra?.notaCreditoRef !== undefined) row.nota_credito_ref = extra.notaCreditoRef;
    const { error } = await supabase.from('devoluciones_venta').update(row).eq('id', id);
    if (error) throw new Error(error.message);
    await loadDevoluciones();
  };

  return {
    // Estado
    presupuestos, pedidos, albaranes, facturas, devoluciones, loading, error,
    // Cargas
    loadAll, loadPresupuestos, loadPedidos, loadAlbaranes, loadFacturas, loadDevoluciones,
    // Detalle con líneas
    getPresupuestoConLineas, getPedidoConLineas, getAlbaranConLineas, getFacturaConLineas, getDevolucionConLineas,
    // CRUD
    createPresupuesto, updatePresupuesto,
    createPedido, updatePedido,
    createAlbaran, firmarAlbaran,
    createFactura, updateFactura, marcarCobrada,
    createDevolucion, updateDevolucionEstado,
    // Conversiones
    presupuestoToPedidoDraft, pedidoToAlbaranDraft, albaranToFacturaDraft,
    // Utilidades
    calcularTotalesLineas, calcularSubtotalLinea,
  };
}
