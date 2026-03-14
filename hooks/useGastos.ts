import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
  CategoriaGasto, Acreedor, Gasto, GastoRecurrente, GastoPorCategoria
} from '../types';

// ── Mappers ──────────────────────────────────────────────────────────────────

function mapCategoria(r: any): CategoriaGasto {
  return {
    id: r.id, empresaId: r.empresa_id, nombre: r.nombre,
    codigoPgc: r.codigo_pgc, descripcion: r.descripcion,
    color: r.color ?? '#6366f1', icono: r.icono ?? 'receipt',
    activa: r.activa,
  };
}

function mapAcreedor(r: any): Acreedor {
  return {
    id: r.id, empresaId: r.empresa_id, nombre: r.nombre,
    nif: r.nif, iban: r.iban, email: r.email, telefono: r.telefono,
    direccion: r.direccion, categoriaId: r.categoria_id,
    notas: r.notas, activo: r.activo, createdAt: r.created_at,
  };
}

function mapGasto(r: any): Gasto {
  return {
    id: r.id, empresaId: r.empresa_id,
    acreedorId: r.acreedor_id, acreedorNombre: r.acreedor_nombre,
    categoriaId: r.categoria_id, categoriaNombre: r.categoria_nombre,
    numeroFactura: r.numero_factura,
    fecha: r.fecha, fechaVencimiento: r.fecha_vencimiento,
    concepto: r.concepto,
    baseImponible: Number(r.base_imponible ?? 0),
    ivaPorcentaje: Number(r.iva_porcentaje ?? 21),
    iva: Number(r.iva ?? 0),
    irpfPorcentaje: Number(r.irpf_porcentaje ?? 0),
    irpf: Number(r.irpf ?? 0),
    total: Number(r.total ?? 0),
    formaPago: r.forma_pago, estado: r.estado,
    esRecurrente: r.es_recurrente ?? false,
    periodo: r.periodo, urlDocumento: r.url_documento,
    notas: r.notas, createdAt: r.created_at,
    situacion: r.situacion, diasRetraso: r.dias_retraso,
  };
}

function mapRecurrente(r: any): GastoRecurrente {
  return {
    id: r.id, empresaId: r.empresa_id,
    acreedorId: r.acreedor_id, acreedorNombre: r.acreedor_nombre,
    categoriaId: r.categoria_id, categoriaNombre: r.categoria_nombre,
    concepto: r.concepto,
    baseImponible: Number(r.base_imponible ?? 0),
    ivaPorcentaje: Number(r.iva_porcentaje ?? 21),
    irpfPorcentaje: Number(r.irpf_porcentaje ?? 0),
    diaVencimiento: r.dia_vencimiento, frecuencia: r.frecuencia,
    formaPago: r.forma_pago, activo: r.activo,
    ultimoPeriodo: r.ultimo_periodo,
  };
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useGastos(empresaId: string | undefined) {
  const [categorias, setCategorias] = useState<CategoriaGasto[]>([]);
  const [acreedores, setAcreedores] = useState<Acreedor[]>([]);
  const [gastos, setGastos]         = useState<Gasto[]>([]);
  const [recurrentes, setRecurrentes] = useState<GastoRecurrente[]>([]);
  const [resumen, setResumen]       = useState<GastoPorCategoria[]>([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);

  // ── Cargar todo ─────────────────────────────────────────────────────────────

  const loadCategorias = useCallback(async () => {
    if (!empresaId) return;
    const { data, error } = await supabase
      .from('categorias_gasto').select('*')
      .eq('empresa_id', empresaId).eq('activa', true).order('nombre');
    if (error) { setError(error.message); return; }
    if (data?.length === 0) {
      await supabase.rpc('seed_categorias_gasto', { p_empresa_id: empresaId });
      const { data: d2 } = await supabase.from('categorias_gasto').select('*')
        .eq('empresa_id', empresaId).eq('activa', true).order('nombre');
      setCategorias((d2 || []).map(mapCategoria));
    } else {
      setCategorias((data || []).map(mapCategoria));
    }
  }, [empresaId]);

  const loadAcreedores = useCallback(async () => {
    if (!empresaId) return;
    const { data, error } = await supabase
      .from('acreedores').select('*')
      .eq('empresa_id', empresaId).order('nombre');
    if (error) { setError(error.message); return; }
    setAcreedores((data || []).map(mapAcreedor));
  }, [empresaId]);

  const loadGastos = useCallback(async (mes?: string) => {
    if (!empresaId) return;
    setLoading(true);
    let q = supabase.from('gastos').select('*').eq('empresa_id', empresaId);
    if (mes) q = q.eq('periodo', mes).or(`fecha.gte.${mes}-01,fecha.lte.${mes}-31`);
    q = q.order('fecha', { ascending: false }).limit(200);
    const { data, error } = await q;
    setLoading(false);
    if (error) { setError(error.message); return; }
    setGastos((data || []).map(mapGasto));
  }, [empresaId]);

  const loadRecurrentes = useCallback(async () => {
    if (!empresaId) return;
    const { data, error } = await supabase
      .from('gastos_recurrentes').select('*')
      .eq('empresa_id', empresaId).order('concepto');
    if (error) { setError(error.message); return; }
    setRecurrentes((data || []).map(mapRecurrente));
  }, [empresaId]);

  const loadResumen = useCallback(async (meses: number = 6) => {
    if (!empresaId) return;
    const desde = new Date();
    desde.setMonth(desde.getMonth() - meses + 1);
    const periodoDesde = desde.toISOString().slice(0, 7);
    const { data, error } = await supabase
      .from('gastos_por_categoria').select('*')
      .eq('empresa_id', empresaId)
      .gte('periodo', periodoDesde)
      .order('periodo', { ascending: false });
    if (error) { setError(error.message); return; }
    setResumen((data || []).map((r: any) => ({
      empresaId: r.empresa_id, periodo: r.periodo,
      categoriaId: r.categoria_id, categoriaNombre: r.categoria_nombre,
      numGastos: r.num_gastos,
      baseTotal: Number(r.base_total ?? 0), ivaTotal: Number(r.iva_total ?? 0),
      totalGastos: Number(r.total_gastos ?? 0),
      totalPagado: Number(r.total_pagado ?? 0),
      totalPendiente: Number(r.total_pendiente ?? 0),
    })));
  }, [empresaId]);

  // ── CRUD Acreedores ─────────────────────────────────────────────────────────

  const createAcreedor = async (a: Omit<Acreedor, 'id' | 'createdAt'>) => {
    const { error } = await supabase.from('acreedores').insert({
      empresa_id: a.empresaId, nombre: a.nombre, nif: a.nif || null,
      iban: a.iban || null, email: a.email || null, telefono: a.telefono || null,
      direccion: a.direccion || null, categoria_id: a.categoriaId || null,
      notas: a.notas || null, activo: a.activo,
    });
    if (error) throw new Error(error.message);
    await loadAcreedores();
  };

  const updateAcreedor = async (id: string, changes: Partial<Acreedor>) => {
    const dbRow: Record<string, any> = { updated_at: new Date().toISOString() };
    if (changes.nombre      !== undefined) dbRow.nombre       = changes.nombre;
    if (changes.nif         !== undefined) dbRow.nif          = changes.nif;
    if (changes.iban        !== undefined) dbRow.iban         = changes.iban;
    if (changes.email       !== undefined) dbRow.email        = changes.email;
    if (changes.telefono    !== undefined) dbRow.telefono     = changes.telefono;
    if (changes.categoriaId !== undefined) dbRow.categoria_id = changes.categoriaId;
    if (changes.activo      !== undefined) dbRow.activo       = changes.activo;
    const { error } = await supabase.from('acreedores').update(dbRow).eq('id', id);
    if (error) throw new Error(error.message);
    await loadAcreedores();
  };

  // ── CRUD Gastos ─────────────────────────────────────────────────────────────

  const createGasto = async (g: Omit<Gasto, 'id' | 'iva' | 'irpf' | 'total' | 'createdAt'>) => {
    const { error } = await supabase.from('gastos').insert({
      empresa_id:       g.empresaId,
      acreedor_id:      g.acreedorId || null,
      acreedor_nombre:  g.acreedorNombre,
      categoria_id:     g.categoriaId || null,
      categoria_nombre: g.categoriaNombre || null,
      numero_factura:   g.numeroFactura || null,
      fecha:            g.fecha,
      fecha_vencimiento: g.fechaVencimiento || null,
      concepto:         g.concepto,
      base_imponible:   g.baseImponible,
      iva_porcentaje:   g.ivaPorcentaje,
      irpf_porcentaje:  g.irpfPorcentaje,
      forma_pago:       g.formaPago,
      estado:           g.estado,
      es_recurrente:    g.esRecurrente,
      notas:            g.notas || null,
    });
    if (error) throw new Error(error.message);
    await loadGastos();
    await loadResumen();
  };

  const updateGasto = async (id: string, changes: Partial<Gasto>) => {
    const dbRow: Record<string, any> = { updated_at: new Date().toISOString() };
    if (changes.acreedorNombre  !== undefined) dbRow.acreedor_nombre  = changes.acreedorNombre;
    if (changes.categoriaNombre !== undefined) dbRow.categoria_nombre = changes.categoriaNombre;
    if (changes.categoriaId     !== undefined) dbRow.categoria_id     = changes.categoriaId;
    if (changes.numeroFactura   !== undefined) dbRow.numero_factura   = changes.numeroFactura;
    if (changes.fecha           !== undefined) dbRow.fecha            = changes.fecha;
    if (changes.fechaVencimiento !== undefined) dbRow.fecha_vencimiento = changes.fechaVencimiento;
    if (changes.concepto        !== undefined) dbRow.concepto         = changes.concepto;
    if (changes.baseImponible   !== undefined) dbRow.base_imponible   = changes.baseImponible;
    if (changes.ivaPorcentaje   !== undefined) dbRow.iva_porcentaje   = changes.ivaPorcentaje;
    if (changes.irpfPorcentaje  !== undefined) dbRow.irpf_porcentaje  = changes.irpfPorcentaje;
    if (changes.formaPago       !== undefined) dbRow.forma_pago       = changes.formaPago;
    if (changes.estado          !== undefined) dbRow.estado           = changes.estado;
    if (changes.notas           !== undefined) dbRow.notas            = changes.notas;
    const { error } = await supabase.from('gastos').update(dbRow).eq('id', id);
    if (error) throw new Error(error.message);
    await loadGastos();
    await loadResumen();
  };

  const marcarPagado = async (id: string) => {
    await updateGasto(id, { estado: 'pagado' });
  };

  const anularGasto = async (id: string) => {
    await updateGasto(id, { estado: 'anulado' });
  };

  // ── CRUD Recurrentes ────────────────────────────────────────────────────────

  const createRecurrente = async (r: Omit<GastoRecurrente, 'id'>) => {
    const { error } = await supabase.from('gastos_recurrentes').insert({
      empresa_id:       r.empresaId,
      acreedor_id:      r.acreedorId || null,
      acreedor_nombre:  r.acreedorNombre,
      categoria_id:     r.categoriaId || null,
      categoria_nombre: r.categoriaNombre || null,
      concepto:         r.concepto,
      base_imponible:   r.baseImponible,
      iva_porcentaje:   r.ivaPorcentaje,
      irpf_porcentaje:  r.irpfPorcentaje,
      dia_vencimiento:  r.diaVencimiento,
      frecuencia:       r.frecuencia,
      forma_pago:       r.formaPago,
      activo:           r.activo,
    });
    if (error) throw new Error(error.message);
    await loadRecurrentes();
  };

  const toggleRecurrente = async (id: string, activo: boolean) => {
    const { error } = await supabase.from('gastos_recurrentes').update({ activo }).eq('id', id);
    if (error) throw new Error(error.message);
    await loadRecurrentes();
  };

  const generarGastosMes = async (periodo: string): Promise<number> => {
    const { data, error } = await supabase
      .rpc('generar_gastos_mes', { p_empresa_id: empresaId, p_periodo: periodo });
    if (error) throw new Error(error.message);
    await loadGastos(periodo);
    return data as number;
  };

  return {
    categorias, acreedores, gastos, recurrentes, resumen,
    loading, error,
    loadCategorias, loadAcreedores, loadGastos, loadRecurrentes, loadResumen,
    createAcreedor, updateAcreedor,
    createGasto, updateGasto, marcarPagado, anularGasto,
    createRecurrente, toggleRecurrente, generarGastosMes,
  };
}
