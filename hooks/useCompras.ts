import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
  Proveedor, PedidoCompra, CompraLinea,
  Recepcion, RecepcionLinea,
  StockItem, MovimientoStock,
  Traspaso, TraspasoLinea,
  EstadoPedidoCompra, EstadoRecepcion, EstadoTraspaso,
} from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapProveedor(r: Record<string, unknown>): Proveedor {
  return {
    id: r.id as string,
    empresaId: r.empresa_id as string | undefined,
    codigo: r.codigo as string | undefined,
    nombre: r.nombre as string,
    razonSocial: r.razon_social as string | undefined,
    cif: r.cif as string | undefined,
    direccion: r.direccion as string | undefined,
    cp: r.cp as string | undefined,
    ciudad: r.ciudad as string | undefined,
    provincia: r.provincia as string | undefined,
    pais: r.pais as string | undefined,
    telefono: r.telefono as string | undefined,
    email: r.email as string | undefined,
    web: r.web as string | undefined,
    iban: r.iban as string | undefined,
    swift: r.swift as string | undefined,
    contacto: r.contacto as string | undefined,
    diasPago: r.dias_pago as number | undefined,
    notas: r.notas as string | undefined,
    activo: r.activo as boolean,
    createdAt: r.created_at as string | undefined,
  };
}

function mapPedidoCompra(r: Record<string, unknown>): PedidoCompra {
  return {
    id: r.id as string,
    referencia: r.referencia as string,
    empresaId: r.empresa_id as string | undefined,
    delegacionId: r.delegacion_id as string | undefined,
    almacenId: r.almacen_id as string | undefined,
    proveedorId: r.proveedor_id as string,
    proveedorNombre: r.proveedor_nombre as string | undefined,
    fecha: r.fecha as string,
    fechaEntrega: r.fecha_entrega as string | undefined,
    estado: r.estado as EstadoPedidoCompra,
    subtotal: Number(r.subtotal),
    descuentoGlobal: Number(r.descuento_global),
    baseImponible: Number(r.base_imponible),
    ivaPorcentaje: Number(r.iva_porcentaje),
    iva: Number(r.iva),
    total: Number(r.total),
    notas: r.notas as string | undefined,
    createdBy: r.created_by as string | undefined,
    createdAt: r.created_at as string | undefined,
  };
}

function mapCompraLinea(r: Record<string, unknown>): CompraLinea {
  return {
    id: r.id as string,
    orden: Number(r.orden),
    productoId: r.producto_id as string | undefined,
    referenciaProveedor: r.referencia_proveedor as string | undefined,
    descripcion: r.descripcion as string,
    cantidad: Number(r.cantidad),
    precioUnitario: Number(r.precio_unitario),
    descuento: Number(r.descuento),
    ivaPorcentaje: Number(r.iva_porcentaje),
    subtotal: Number(r.subtotal),
    cantidadRecibida: Number(r.cantidad_recibida),
  };
}

function mapRecepcion(r: Record<string, unknown>): Recepcion {
  return {
    id: r.id as string,
    referencia: r.referencia as string,
    pedidoCompraId: r.pedido_compra_id as string | undefined,
    empresaId: r.empresa_id as string | undefined,
    delegacionId: r.delegacion_id as string | undefined,
    almacenId: r.almacen_id as string,
    almacenNombre: (r as { almacenes?: { nombre?: string } }).almacenes?.nombre,
    proveedorId: r.proveedor_id as string | undefined,
    proveedorNombre: r.proveedor_nombre as string | undefined,
    fecha: r.fecha as string,
    estado: r.estado as EstadoRecepcion,
    albaranProveedor: r.albaran_proveedor as string | undefined,
    total: Number(r.total),
    notas: r.notas as string | undefined,
    createdBy: r.created_by as string | undefined,
    createdAt: r.created_at as string | undefined,
  };
}

function mapRecepcionLinea(r: Record<string, unknown>): RecepcionLinea {
  return {
    id: r.id as string,
    orden: Number(r.orden),
    productoId: r.producto_id as string | undefined,
    descripcion: r.descripcion as string,
    cantidad: Number(r.cantidad),
    precioCoste: Number(r.precio_coste),
    subtotal: Number(r.subtotal),
  };
}

function mapStockItem(r: Record<string, unknown>): StockItem {
  const almacen = r.almacenes as Record<string, unknown> | undefined;
  return {
    id: r.id as string,
    productoId: r.producto_id as string,
    almacenId: r.almacen_id as string,
    almacenNombre: almacen?.nombre as string | undefined,
    cantidad: Number(r.cantidad),
    pmp: Number(r.pmp),
    updatedAt: r.updated_at as string | undefined,
  };
}

function mapMovimiento(r: Record<string, unknown>): MovimientoStock {
  const almacen = r.almacenes as Record<string, unknown> | undefined;
  return {
    id: r.id as string,
    productoId: r.producto_id as string,
    almacenId: r.almacen_id as string,
    almacenNombre: almacen?.nombre as string | undefined,
    tipo: r.tipo as MovimientoStock['tipo'],
    cantidad: Number(r.cantidad),
    precioCoste: r.precio_coste ? Number(r.precio_coste) : undefined,
    referenciaDoc: r.referencia_doc as string | undefined,
    docId: r.doc_id as string | undefined,
    notas: r.notas as string | undefined,
    createdBy: r.created_by as string | undefined,
    createdAt: r.created_at as string,
  };
}

function mapTraspaso(r: Record<string, unknown>): Traspaso {
  return {
    id: r.id as string,
    referencia: r.referencia as string,
    empresaId: r.empresa_id as string | undefined,
    almacenOrigenId: r.almacen_origen_id as string,
    almacenDestinoId: r.almacen_destino_id as string,
    fecha: r.fecha as string,
    estado: r.estado as EstadoTraspaso,
    notas: r.notas as string | undefined,
    firmaRecepcion: r.firma_recepcion as string | undefined,
    firmaFecha: r.firma_fecha as string | undefined,
    firmaNombre: r.firma_nombre as string | undefined,
    createdBy: r.created_by as string | undefined,
    createdAt: r.created_at as string | undefined,
  };
}

function mapTraspasoLinea(r: Record<string, unknown>): TraspasoLinea {
  return {
    id: r.id as string,
    orden: Number(r.orden),
    productoId: r.producto_id as string | undefined,
    descripcion: r.descripcion as string,
    cantidad: Number(r.cantidad),
    pmpOrigen: r.pmp_origen ? Number(r.pmp_origen) : undefined,
  };
}

// ─── Subtotal de línea de compra ──────────────────────────────────────────────

export function calcularSubtotalCompraLinea(l: Pick<CompraLinea, 'cantidad' | 'precioUnitario' | 'descuento'>): number {
  return l.cantidad * l.precioUnitario * (1 - l.descuento / 100);
}

export function calcularTotalesCompra(
  lineas: CompraLinea[],
  descuentoGlobal: number,
  ivaPorcentaje: number
) {
  const subtotal = lineas.reduce((s, l) => s + l.subtotal, 0);
  const baseImponible = subtotal * (1 - descuentoGlobal / 100);
  const iva = baseImponible * (ivaPorcentaje / 100);
  const total = baseImponible + iva;
  return { subtotal, baseImponible, iva, total };
}

// ─── Numeradores ──────────────────────────────────────────────────────────────

async function nextRef(
  table: 'pedidos_compra' | 'recepciones' | 'traspasos',
  prefix: string
): Promise<string> {
  const { data, error } = await supabase
    .from(table)
    .select('referencia')
    .order('created_at', { ascending: false })
    .limit(1);
  if (error) throw error;
  let nextNum = 1;
  if (data && data.length > 0) {
    const last = (data[0] as { referencia: string }).referencia;
    const parts = last.split('-');
    nextNum = parseInt(parts[parts.length - 1], 10) + 1;
  }
  return `${prefix}-${String(nextNum).padStart(4, '0')}`;
}

async function nextProveedorCodigo(): Promise<string> {
  const { data } = await supabase
    .from('proveedores')
    .select('codigo')
    .order('created_at', { ascending: false })
    .limit(1);
  let nextNum = 1;
  if (data && data.length > 0) {
    const last = (data[0] as { codigo: string | null }).codigo;
    if (last) nextNum = parseInt(last.split('-')[1], 10) + 1;
  }
  return `PRO-${String(nextNum).padStart(4, '0')}`;
}

// ─── Hook principal ───────────────────────────────────────────────────────────

export function useCompras() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [pedidosCompra, setPedidosCompra] = useState<PedidoCompra[]>([]);
  const [recepciones, setRecepciones] = useState<Recepcion[]>([]);
  const [traspasos, setTraspasos] = useState<Traspaso[]>([]);
  const [stock, setStock] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [provRes, pedRes, recRes, traRes, stRes] = await Promise.all([
        supabase.from('proveedores').select('*').eq('activo', true).order('nombre'),
        supabase.from('pedidos_compra').select('*').order('created_at', { ascending: false }),
        supabase.from('recepciones').select('*, almacenes(nombre)').order('created_at', { ascending: false }),
        supabase.from('traspasos').select('*').order('created_at', { ascending: false }),
        supabase.from('stock').select('*, almacenes(nombre)').order('producto_id'),
      ]);

      if (provRes.error) throw provRes.error;
      if (pedRes.error) throw pedRes.error;
      if (recRes.error) throw recRes.error;
      if (traRes.error) throw traRes.error;
      if (stRes.error) throw stRes.error;

      setProveedores((provRes.data || []).map(r => mapProveedor(r as Record<string, unknown>)));
      setPedidosCompra((pedRes.data || []).map(r => mapPedidoCompra(r as Record<string, unknown>)));
      setRecepciones((recRes.data || []).map(r => mapRecepcion(r as Record<string, unknown>)));
      setTraspasos((traRes.data || []).map(r => mapTraspaso(r as Record<string, unknown>)));
      setStock((stRes.data || []).map(r => mapStockItem(r as Record<string, unknown>)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando datos de compras');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Proveedores ────────────────────────────────────────────

  const createProveedor = async (data: Omit<Proveedor, 'id' | 'createdAt'>): Promise<Proveedor> => {
    const codigo = await nextProveedorCodigo();
    const { data: row, error } = await supabase
      .from('proveedores')
      .insert({
        empresa_id: data.empresaId || null,
        codigo,
        nombre: data.nombre,
        razon_social: data.razonSocial || null,
        cif: data.cif || null,
        direccion: data.direccion || null,
        cp: data.cp || null,
        ciudad: data.ciudad || null,
        provincia: data.provincia || null,
        pais: data.pais || 'España',
        telefono: data.telefono || null,
        email: data.email || null,
        web: data.web || null,
        iban: data.iban || null,
        swift: data.swift || null,
        contacto: data.contacto || null,
        dias_pago: data.diasPago || 30,
        notas: data.notas || null,
        activo: true,
      })
      .select()
      .single();
    if (error) throw error;
    const prov = mapProveedor(row as Record<string, unknown>);
    setProveedores(prev => [...prev, prov].sort((a, b) => a.nombre.localeCompare(b.nombre)));
    return prov;
  };

  const updateProveedor = async (id: string, data: Partial<Proveedor>): Promise<void> => {
    const patch: Record<string, unknown> = {};
    if (data.nombre !== undefined) patch.nombre = data.nombre;
    if (data.razonSocial !== undefined) patch.razon_social = data.razonSocial;
    if (data.cif !== undefined) patch.cif = data.cif;
    if (data.direccion !== undefined) patch.direccion = data.direccion;
    if (data.cp !== undefined) patch.cp = data.cp;
    if (data.ciudad !== undefined) patch.ciudad = data.ciudad;
    if (data.provincia !== undefined) patch.provincia = data.provincia;
    if (data.telefono !== undefined) patch.telefono = data.telefono;
    if (data.email !== undefined) patch.email = data.email;
    if (data.iban !== undefined) patch.iban = data.iban;
    if (data.contacto !== undefined) patch.contacto = data.contacto;
    if (data.diasPago !== undefined) patch.dias_pago = data.diasPago;
    if (data.notas !== undefined) patch.notas = data.notas;
    if (data.activo !== undefined) patch.activo = data.activo;

    const { error } = await supabase.from('proveedores').update(patch).eq('id', id);
    if (error) throw error;
    setProveedores(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
  };

  // ── Pedidos de Compra ──────────────────────────────────────

  const saveCompraLineas = async (pedidoId: string, lineas: CompraLinea[]) => {
    await supabase.from('pedido_compra_lineas').delete().eq('pedido_compra_id', pedidoId);
    if (lineas.length === 0) return;
    const rows = lineas.map((l, i) => ({
      pedido_compra_id: pedidoId,
      orden: i + 1,
      producto_id: l.productoId || null,
      referencia_proveedor: l.referenciaProveedor || null,
      descripcion: l.descripcion,
      cantidad: l.cantidad,
      precio_unitario: l.precioUnitario,
      descuento: l.descuento,
      iva_porcentaje: l.ivaPorcentaje,
      subtotal: l.subtotal,
      cantidad_recibida: l.cantidadRecibida || 0,
    }));
    const { error } = await supabase.from('pedido_compra_lineas').insert(rows);
    if (error) throw error;
  };

  const createPedidoCompra = async (
    data: Omit<PedidoCompra, 'id' | 'referencia' | 'createdAt'>,
    lineas: CompraLinea[]
  ): Promise<PedidoCompra> => {
    const referencia = await nextRef('pedidos_compra', 'OC');
    const { data: row, error } = await supabase
      .from('pedidos_compra')
      .insert({
        referencia,
        empresa_id: data.empresaId || null,
        delegacion_id: data.delegacionId || null,
        almacen_id: data.almacenId || null,
        proveedor_id: data.proveedorId,
        proveedor_nombre: data.proveedorNombre || null,
        fecha: data.fecha,
        fecha_entrega: data.fechaEntrega || null,
        estado: data.estado,
        subtotal: data.subtotal,
        descuento_global: data.descuentoGlobal,
        base_imponible: data.baseImponible,
        iva_porcentaje: data.ivaPorcentaje,
        iva: data.iva,
        total: data.total,
        notas: data.notas || null,
        created_by: data.createdBy || null,
      })
      .select()
      .single();
    if (error) throw error;
    const pedido = mapPedidoCompra(row as Record<string, unknown>);
    await saveCompraLineas(pedido.id, lineas);
    pedido.lineas = lineas;
    setPedidosCompra(prev => [pedido, ...prev]);
    return pedido;
  };

  const updatePedidoCompra = async (
    id: string,
    data: Partial<PedidoCompra>,
    lineas?: CompraLinea[]
  ): Promise<void> => {
    const patch: Record<string, unknown> = {};
    if (data.proveedorId) patch.proveedor_id = data.proveedorId;
    if (data.proveedorNombre !== undefined) patch.proveedor_nombre = data.proveedorNombre;
    if (data.fecha) patch.fecha = data.fecha;
    if (data.fechaEntrega !== undefined) patch.fecha_entrega = data.fechaEntrega;
    if (data.estado) patch.estado = data.estado;
    if (data.subtotal !== undefined) patch.subtotal = data.subtotal;
    if (data.descuentoGlobal !== undefined) patch.descuento_global = data.descuentoGlobal;
    if (data.baseImponible !== undefined) patch.base_imponible = data.baseImponible;
    if (data.ivaPorcentaje !== undefined) patch.iva_porcentaje = data.ivaPorcentaje;
    if (data.iva !== undefined) patch.iva = data.iva;
    if (data.total !== undefined) patch.total = data.total;
    if (data.notas !== undefined) patch.notas = data.notas;
    patch.updated_at = new Date().toISOString();

    const { error } = await supabase.from('pedidos_compra').update(patch).eq('id', id);
    if (error) throw error;
    if (lineas) await saveCompraLineas(id, lineas);
    setPedidosCompra(prev => prev.map(p => p.id === id ? { ...p, ...data, lineas } : p));
  };

  const loadPedidoLineas = async (pedidoId: string): Promise<CompraLinea[]> => {
    const { data, error } = await supabase
      .from('pedido_compra_lineas')
      .select('*')
      .eq('pedido_compra_id', pedidoId)
      .order('orden');
    if (error) throw error;
    return (data || []).map(r => mapCompraLinea(r as Record<string, unknown>));
  };

  // ── Recepciones ────────────────────────────────────────────

  const saveRecepcionLineas = async (recepcionId: string, lineas: RecepcionLinea[]) => {
    await supabase.from('recepcion_lineas').delete().eq('recepcion_id', recepcionId);
    if (lineas.length === 0) return;
    const rows = lineas.map((l, i) => ({
      recepcion_id: recepcionId,
      orden: i + 1,
      producto_id: l.productoId || null,
      descripcion: l.descripcion,
      cantidad: l.cantidad,
      precio_coste: l.precioCoste,
      subtotal: l.subtotal,
    }));
    const { error } = await supabase.from('recepcion_lineas').insert(rows);
    if (error) throw error;
  };

  const createRecepcion = async (
    data: Omit<Recepcion, 'id' | 'referencia' | 'createdAt'>,
    lineas: RecepcionLinea[]
  ): Promise<Recepcion> => {
    const referencia = await nextRef('recepciones', 'REC');
    const { data: row, error } = await supabase
      .from('recepciones')
      .insert({
        referencia,
        pedido_compra_id: data.pedidoCompraId || null,
        empresa_id: data.empresaId || null,
        delegacion_id: data.delegacionId || null,
        almacen_id: data.almacenId,
        proveedor_id: data.proveedorId || null,
        proveedor_nombre: data.proveedorNombre || null,
        fecha: data.fecha,
        estado: 'borrador',
        albaran_proveedor: data.albaranProveedor || null,
        total: data.total,
        notas: data.notas || null,
        created_by: data.createdBy || null,
      })
      .select('*, almacenes(nombre)')
      .single();
    if (error) throw error;
    const rec = mapRecepcion(row as Record<string, unknown>);
    await saveRecepcionLineas(rec.id, lineas);
    rec.lineas = lineas;
    setRecepciones(prev => [rec, ...prev]);
    return rec;
  };

  const confirmarRecepcion = async (recepcionId: string, userId: string): Promise<void> => {
    const { error } = await supabase.rpc('confirmar_recepcion', {
      p_recepcion_id: recepcionId,
      p_user_id: userId,
    });
    if (error) throw error;
    setRecepciones(prev => prev.map(r => r.id === recepcionId ? { ...r, estado: 'confirmada' as const } : r));
    // Recargar stock actualizado
    const { data, error: stErr } = await supabase.from('stock').select('*, almacenes(nombre)').order('producto_id');
    if (!stErr && data) setStock(data.map(r => mapStockItem(r as Record<string, unknown>)));
  };

  const loadRecepcionLineas = async (recepcionId: string): Promise<RecepcionLinea[]> => {
    const { data, error } = await supabase
      .from('recepcion_lineas')
      .select('*')
      .eq('recepcion_id', recepcionId)
      .order('orden');
    if (error) throw error;
    return (data || []).map(r => mapRecepcionLinea(r as Record<string, unknown>));
  };

  // Draft de recepción a partir de un pedido de compra
  const pedidoToRecepcionDraft = (
    pedido: PedidoCompra,
    lineas: CompraLinea[],
    almacenId: string
  ): Omit<Recepcion, 'id' | 'referencia' | 'createdAt'> & { lineas: RecepcionLinea[] } => {
    const recLineas: RecepcionLinea[] = lineas.map((l, i) => ({
      orden: i + 1,
      productoId: l.productoId,
      descripcion: l.descripcion,
      cantidad: l.cantidad - (l.cantidadRecibida || 0),
      precioCoste: l.precioUnitario * (1 - l.descuento / 100),
      subtotal: (l.cantidad - (l.cantidadRecibida || 0)) * l.precioUnitario * (1 - l.descuento / 100),
    }));
    return {
      pedidoCompraId: pedido.id,
      empresaId: pedido.empresaId,
      delegacionId: pedido.delegacionId,
      almacenId,
      proveedorId: pedido.proveedorId,
      proveedorNombre: pedido.proveedorNombre,
      fecha: new Date().toISOString().slice(0, 10),
      estado: 'borrador',
      total: recLineas.reduce((s, l) => s + l.subtotal, 0),
      lineas: recLineas,
    };
  };

  // ── Traspasos ──────────────────────────────────────────────

  const saveTraspasoLineas = async (traspasoId: string, lineas: TraspasoLinea[]) => {
    await supabase.from('traspaso_lineas').delete().eq('traspaso_id', traspasoId);
    if (lineas.length === 0) return;

    // Obtener PMP actual del almacén origen
    const traspaso = traspasos.find(t => t.id === traspasoId);

    const rows = lineas.map((l, i) => {
      const stockOrigen = traspaso
        ? stock.find(s => s.productoId === l.productoId && s.almacenId === traspaso.almacenOrigenId)
        : undefined;
      return {
        traspaso_id: traspasoId,
        orden: i + 1,
        producto_id: l.productoId || null,
        descripcion: l.descripcion,
        cantidad: l.cantidad,
        pmp_origen: stockOrigen?.pmp || l.pmpOrigen || 0,
      };
    });
    const { error } = await supabase.from('traspaso_lineas').insert(rows);
    if (error) throw error;
  };

  const createTraspaso = async (
    data: Omit<Traspaso, 'id' | 'referencia' | 'createdAt'>,
    lineas: TraspasoLinea[]
  ): Promise<Traspaso> => {
    const referencia = await nextRef('traspasos', 'TRA');
    const { data: row, error } = await supabase
      .from('traspasos')
      .insert({
        referencia,
        empresa_id: data.empresaId || null,
        almacen_origen_id: data.almacenOrigenId,
        almacen_destino_id: data.almacenDestinoId,
        fecha: data.fecha,
        estado: 'borrador',
        notas: data.notas || null,
        created_by: data.createdBy || null,
      })
      .select()
      .single();
    if (error) throw error;
    const traspaso = mapTraspaso(row as Record<string, unknown>);
    setTraspasos(prev => [traspaso, ...prev]);
    await saveTraspasoLineas(traspaso.id, lineas);
    traspaso.lineas = lineas;
    return traspaso;
  };

  const updateTraspasoEstado = async (
    id: string,
    estado: EstadoTraspaso,
    firmaData?: { firma: string; nombre: string }
  ): Promise<void> => {
    const patch: Record<string, unknown> = { estado };
    if (firmaData) {
      patch.firma_recepcion = firmaData.firma;
      patch.firma_nombre = firmaData.nombre;
      patch.firma_fecha = new Date().toISOString();
    }
    const { error } = await supabase.from('traspasos').update(patch).eq('id', id);
    if (error) throw error;
    setTraspasos(prev => prev.map(t => t.id === id ? { ...t, estado, ...firmaData ? {
      firmaRecepcion: firmaData.firma,
      firmaNombre: firmaData.nombre,
      firmaFecha: new Date().toISOString(),
    } : {} } : t));
  };

  const confirmarTraspaso = async (traspasoId: string, userId: string): Promise<void> => {
    const { error } = await supabase.rpc('confirmar_traspaso', {
      p_traspaso_id: traspasoId,
      p_user_id: userId,
    });
    if (error) throw error;
    setTraspasos(prev => prev.map(t => t.id === traspasoId ? { ...t, estado: 'confirmado' as const } : t));
    const { data, error: stErr } = await supabase.from('stock').select('*, almacenes(nombre)').order('producto_id');
    if (!stErr && data) setStock(data.map(r => mapStockItem(r as Record<string, unknown>)));
  };

  const loadTraspasoLineas = async (traspasoId: string): Promise<TraspasoLinea[]> => {
    const { data, error } = await supabase
      .from('traspaso_lineas')
      .select('*')
      .eq('traspaso_id', traspasoId)
      .order('orden');
    if (error) throw error;
    return (data || []).map(r => mapTraspasoLinea(r as Record<string, unknown>));
  };

  // ── Stock y Movimientos ────────────────────────────────────

  const ajustarStock = async (
    productoId: string,
    almacenId: string,
    cantidad: number,
    tipo: 'ajuste_positivo' | 'ajuste_negativo',
    notas: string,
    userId: string
  ): Promise<void> => {
    const cantidadAbs = Math.abs(cantidad);
    const signo = tipo === 'ajuste_positivo' ? 1 : -1;

    // Llamar función de PG
    const { error: fnErr } = await supabase.rpc('update_stock_pmp', {
      p_producto_id: productoId,
      p_almacen_id: almacenId,
      p_cantidad: signo * cantidadAbs,
      p_precio_coste: 0,
    });
    if (fnErr) throw fnErr;

    // Registrar movimiento
    const { error: mvErr } = await supabase.from('movimientos_stock').insert({
      producto_id: productoId,
      almacen_id: almacenId,
      tipo,
      cantidad: cantidadAbs,
      precio_coste: 0,
      notas,
      created_by: userId,
    });
    if (mvErr) throw mvErr;

    // Actualizar estado local
    setStock(prev => prev.map(s => {
      if (s.productoId === productoId && s.almacenId === almacenId) {
        return { ...s, cantidad: Math.max(0, s.cantidad + signo * cantidadAbs) };
      }
      return s;
    }));
  };

  const loadMovimientos = async (
    productoId?: string,
    almacenId?: string,
    limit = 100
  ): Promise<MovimientoStock[]> => {
    let q = supabase
      .from('movimientos_stock')
      .select('*, almacenes(nombre)')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (productoId) q = q.eq('producto_id', productoId);
    if (almacenId) q = q.eq('almacen_id', almacenId);
    const { data, error } = await q;
    if (error) throw error;
    return (data || []).map(r => mapMovimiento(r as Record<string, unknown>));
  };

  return {
    // Estado
    proveedores,
    pedidosCompra,
    recepciones,
    traspasos,
    stock,
    loading,
    error,
    reload: load,

    // Proveedores
    createProveedor,
    updateProveedor,

    // Pedidos de compra
    createPedidoCompra,
    updatePedidoCompra,
    loadPedidoLineas,

    // Recepciones
    createRecepcion,
    confirmarRecepcion,
    loadRecepcionLineas,
    pedidoToRecepcionDraft,

    // Traspasos
    createTraspaso,
    updateTraspasoEstado,
    confirmarTraspaso,
    loadTraspasoLineas,

    // Stock
    ajustarStock,
    loadMovimientos,
  };
}
