import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
  VerifactuRegistro, Cobro, LibroFacturaEmitida,
  EstadoEnvioVerifactu, MetodoCobro,
} from '../types';

// ─── Mappers ──────────────────────────────────────────────────────────────────

function mapRegistro(r: Record<string, unknown>): VerifactuRegistro {
  return {
    id: r.id as string,
    facturaId: r.factura_id as string,
    empresaId: r.empresa_id as string,
    numRegistro: Number(r.num_registro),
    nifEmisor: r.nif_emisor as string,
    numSerie: r.num_serie as string,
    fechaFactura: r.fecha_factura as string,
    tipoFactura: r.tipo_factura as string,
    cuotaTotal: Number(r.cuota_total),
    importeTotal: Number(r.importe_total),
    hashAnterior: r.hash_anterior as string | undefined,
    hashActual: r.hash_actual as string,
    qrUrl: r.qr_url as string | undefined,
    fechaRegistro: r.fecha_registro as string,
    estadoEnvio: r.estado_envio as EstadoEnvioVerifactu,
    respuestaAeat: r.respuesta_aeat as Record<string, unknown> | undefined,
  };
}

function mapCobro(r: Record<string, unknown>): Cobro {
  return {
    id: r.id as string,
    facturaId: r.factura_id as string,
    empresaId: r.empresa_id as string,
    fecha: r.fecha as string,
    importe: Number(r.importe),
    metodo: r.metodo as MetodoCobro,
    referencia: r.referencia as string | undefined,
    notas: r.notas as string | undefined,
    createdBy: r.created_by as string | undefined,
    createdAt: r.created_at as string | undefined,
    facturaReferencia: (r.facturas as Record<string, unknown> | undefined)?.referencia as string | undefined,
  };
}

function mapLibro(r: Record<string, unknown>): LibroFacturaEmitida {
  return {
    id: r.id as string,
    referencia: r.referencia as string,
    fecha: r.fecha as string,
    nifEmisor: r.nif_emisor as string,
    nombreEmisor: r.nombre_emisor as string,
    clienteId: r.cliente_id as string | undefined,
    clienteNombre: r.cliente_nombre as string | undefined,
    baseImponible: Number(r.base_imponible),
    ivaPorcentaje: Number(r.iva_porcentaje),
    iva: Number(r.iva),
    total: Number(r.total),
    estado: r.estado as LibroFacturaEmitida['estado'],
    fechaCobro: r.fecha_cobro as string | undefined,
    metodoCobro: r.metodo_cobro as string | undefined,
    huellaVerifactu: r.huella_verifactu as string | undefined,
    estadoVerifactu: r.estado_verifactu as EstadoEnvioVerifactu | undefined,
    qrUrl: r.qr_url as string | undefined,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useVerifactu() {
  const [registros, setRegistros] = useState<VerifactuRegistro[]>([]);
  const [cobros, setCobros] = useState<Cobro[]>([]);
  const [libro, setLibro] = useState<LibroFacturaEmitida[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [regRes, cobrRes, libroRes] = await Promise.all([
        supabase.from('verifactu_registros').select('*').order('num_registro', { ascending: false }),
        supabase.from('cobros').select('*, facturas(referencia)').order('created_at', { ascending: false }),
        supabase.from('libro_facturas_emitidas').select('*').order('fecha', { ascending: false }),
      ]);

      if (regRes.error) throw regRes.error;
      if (cobrRes.error) throw cobrRes.error;
      if (libroRes.error) throw libroRes.error;

      setRegistros((regRes.data || []).map(r => mapRegistro(r as Record<string, unknown>)));
      setCobros((cobrRes.data || []).map(r => mapCobro(r as Record<string, unknown>)));
      setLibro((libroRes.data || []).map(r => mapLibro(r as Record<string, unknown>)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando datos VeriFactu');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Registrar factura en VeriFactu ────────────────────────

  const registrarFactura = async (facturaId: string): Promise<string> => {
    const { data, error } = await supabase.rpc('registrar_verifactu', {
      p_factura_id: facturaId,
    });
    if (error) throw error;
    await load(); // recargar para obtener el nuevo registro
    return data as string; // retorna el hash
  };

  // ── Obtener registro de una factura ───────────────────────

  const getRegistroByFactura = async (facturaId: string): Promise<VerifactuRegistro | null> => {
    const { data, error } = await supabase
      .from('verifactu_registros')
      .select('*')
      .eq('factura_id', facturaId)
      .single();
    if (error) return null;
    return mapRegistro(data as Record<string, unknown>);
  };

  // ── Cobros ────────────────────────────────────────────────

  const createCobro = async (
    facturaId: string,
    empresaId: string,
    data: {
      fecha: string;
      importe: number;
      metodo: MetodoCobro;
      referencia?: string;
      notas?: string;
    },
    userId: string
  ): Promise<Cobro> => {
    const { data: row, error } = await supabase
      .from('cobros')
      .insert({
        factura_id: facturaId,
        empresa_id: empresaId,
        fecha: data.fecha,
        importe: data.importe,
        metodo: data.metodo,
        referencia: data.referencia || null,
        notas: data.notas || null,
        created_by: userId,
      })
      .select()
      .single();
    if (error) throw error;
    const cobro = mapCobro(row as Record<string, unknown>);
    setCobros(prev => [cobro, ...prev]);

    // Marcar factura como cobrada si el cobro cubre el total
    // (la lógica de cobro parcial se verifica en la UI)
    return cobro;
  };

  const getCobrosByFactura = async (facturaId: string): Promise<Cobro[]> => {
    const { data, error } = await supabase
      .from('cobros')
      .select('*')
      .eq('factura_id', facturaId)
      .order('fecha', { ascending: true });
    if (error) throw error;
    return (data || []).map(r => mapCobro(r as Record<string, unknown>));
  };

  const deleteCobro = async (id: string): Promise<void> => {
    const { error } = await supabase.from('cobros').delete().eq('id', id);
    if (error) throw error;
    setCobros(prev => prev.filter(c => c.id !== id));
  };

  // ── Libro filtrado por empresa/periodo ────────────────────

  const getLibroByPeriodo = async (
    empresaId?: string,
    desde?: string,
    hasta?: string
  ): Promise<LibroFacturaEmitida[]> => {
    let q = supabase
      .from('libro_facturas_emitidas')
      .select('*')
      .order('fecha', { ascending: false });

    if (desde) q = q.gte('fecha', desde);
    if (hasta) q = q.lte('fecha', hasta);

    const { data, error } = await q;
    if (error) throw error;

    let result = (data || []).map(r => mapLibro(r as Record<string, unknown>));

    // Filtrar por empresa (la view une con empresas via nif_emisor)
    // Si necesitamos filtrar por empresa_id, hacemos join
    if (empresaId) {
      const { data: emp } = await supabase.from('empresas').select('cif').eq('id', empresaId).single();
      if (emp) {
        result = result.filter(f => f.nifEmisor === (emp as { cif: string }).cif);
      }
    }

    return result;
  };

  // ── Resumen IVA para Mod. 303 ─────────────────────────────

  interface ResumenIva {
    ivaPorcentaje: number;
    baseImponible: number;
    cuotaIva: number;
    numFacturas: number;
  }

  const calcularResumenIva = (
    facturas: LibroFacturaEmitida[],
    periodo?: { trimestre?: number; anio?: number }
  ): ResumenIva[] => {
    let filtered = facturas;
    if (periodo?.trimestre && periodo?.anio) {
      const mes1 = (periodo.trimestre - 1) * 3 + 1;
      const mes3 = mes1 + 2;
      filtered = facturas.filter(f => {
        const d = new Date(f.fecha);
        return d.getFullYear() === periodo.anio &&
               d.getMonth() + 1 >= mes1 &&
               d.getMonth() + 1 <= mes3;
      });
    }

    const grupos: Record<number, ResumenIva> = {};
    filtered.forEach(f => {
      const pct = f.ivaPorcentaje;
      if (!grupos[pct]) grupos[pct] = { ivaPorcentaje: pct, baseImponible: 0, cuotaIva: 0, numFacturas: 0 };
      grupos[pct].baseImponible += f.baseImponible;
      grupos[pct].cuotaIva += f.iva;
      grupos[pct].numFacturas += 1;
    });

    return Object.values(grupos).sort((a, b) => a.ivaPorcentaje - b.ivaPorcentaje);
  };

  return {
    // Estado
    registros,
    cobros,
    libro,
    loading,
    error,
    reload: load,

    // VeriFactu
    registrarFactura,
    getRegistroByFactura,

    // Cobros
    createCobro,
    getCobrosByFactura,
    deleteCobro,

    // Libro
    getLibroByPeriodo,
    calcularResumenIva,
  };
}
