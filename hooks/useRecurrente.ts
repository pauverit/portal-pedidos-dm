import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
  ContratoRecurrente, MrrEmpresa,
  FrecuenciaRecurrente, EstadoContrato, MetodoCobroContrato, SecuenciaSepa,
} from '../types';

// ─── Mapper ───────────────────────────────────────────────────────────────────

function mapContrato(r: Record<string, unknown>): ContratoRecurrente {
  return {
    id:                    r.id as string,
    empresa_id:            r.empresa_id as string,
    cliente_id:            r.cliente_id as string,
    cliente_nombre:        r.cliente_nombre as string | undefined,
    descripcion:           r.descripcion as string,
    importe_base:          Number(r.importe_base),
    iva_porcentaje:        Number(r.iva_porcentaje),
    frecuencia:            r.frecuencia as FrecuenciaRecurrente,
    serie:                 r.serie as string,
    dia_cobro:             Number(r.dia_cobro),
    fecha_inicio:          r.fecha_inicio as string,
    proxima_facturacion:   r.proxima_facturacion as string,
    estado:                r.estado as EstadoContrato,
    metodo_cobro:          r.metodo_cobro as MetodoCobroContrato,
    iban_cliente:          r.iban_cliente as string | undefined,
    bic_cliente:           r.bic_cliente as string | undefined,
    mandato_id:            r.mandato_id as string | undefined,
    mandato_fecha:         r.mandato_fecha as string | undefined,
    secuencia_sepa:        r.secuencia_sepa as SecuenciaSepa,
    notas:                 r.notas as string | undefined,
    created_at:            r.created_at as string,
    updated_at:            r.updated_at as string,
    // View extras
    cliente_nombre_completo: r.cliente_nombre_completo as string | undefined,
    cliente_email:           r.cliente_email as string | undefined,
    mrr_mensual:             r.mrr_mensual != null ? Number(r.mrr_mensual) : undefined,
    vencido:                 r.vencido as boolean | undefined,
  };
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useRecurrente(empresaId?: string) {
  const [contratos, setContratos] = useState<ContratoRecurrente[]>([]);
  const [mrr, setMrr] = useState<MrrEmpresa | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─── Load desde view contratos_pendientes (incluye extras) ──────────────────
  const loadContratos = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('contratos_pendientes')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('proxima_facturacion', { ascending: true });
      if (err) throw err;
      setContratos((data || []).map(mapContrato));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  // ─── Load MRR ───────────────────────────────────────────────────────────────
  const loadMrr = useCallback(async () => {
    if (!empresaId) return;
    try {
      const { data, error: err } = await supabase
        .from('mrr_por_empresa')
        .select('*')
        .eq('empresa_id', empresaId)
        .single();
      if (err && err.code !== 'PGRST116') throw err;
      setMrr(data as MrrEmpresa | null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [empresaId]);

  // ─── Create contrato ─────────────────────────────────────────────────────────
  const createContrato = useCallback(async (draft: Omit<
    ContratoRecurrente,
    'id' | 'created_at' | 'updated_at' | 'cliente_nombre_completo' | 'cliente_email' | 'mrr_mensual' | 'vencido'
  >): Promise<ContratoRecurrente | null> => {
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('contratos_recurrentes')
        .insert({
          empresa_id:          draft.empresa_id,
          cliente_id:          draft.cliente_id,
          cliente_nombre:      draft.cliente_nombre,
          descripcion:         draft.descripcion,
          importe_base:        draft.importe_base,
          iva_porcentaje:      draft.iva_porcentaje,
          frecuencia:          draft.frecuencia,
          serie:               draft.serie,
          dia_cobro:           draft.dia_cobro,
          fecha_inicio:        draft.fecha_inicio,
          proxima_facturacion: draft.proxima_facturacion,
          estado:              draft.estado,
          metodo_cobro:        draft.metodo_cobro,
          iban_cliente:        draft.iban_cliente,
          bic_cliente:         draft.bic_cliente,
          mandato_id:          draft.mandato_id,
          mandato_fecha:       draft.mandato_fecha,
          secuencia_sepa:      draft.secuencia_sepa,
          notas:               draft.notas,
        })
        .select()
        .single();
      if (err) throw err;
      await loadContratos();
      return mapContrato(data as Record<string, unknown>);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    }
  }, [loadContratos]);

  // ─── Update estado ───────────────────────────────────────────────────────────
  const setEstado = useCallback(async (id: string, estado: EstadoContrato): Promise<boolean> => {
    setError(null);
    try {
      const { error: err } = await supabase
        .from('contratos_recurrentes')
        .update({ estado, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (err) throw err;
      setContratos(prev => prev.map(c => c.id === id ? { ...c, estado } : c));
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    }
  }, []);

  // ─── Facturar un contrato ────────────────────────────────────────────────────
  const facturarContrato = useCallback(async (contratoId: string): Promise<string | null> => {
    setError(null);
    try {
      const { data, error: err } = await supabase
        .rpc('facturar_contrato', { p_contrato_id: contratoId });
      if (err) throw err;
      await loadContratos();
      await loadMrr();
      return data as string; // factura_id creada
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    }
  }, [loadContratos, loadMrr]);

  // ─── Facturar todos los pendientes ───────────────────────────────────────────
  const facturarPendientes = useCallback(async (): Promise<number> => {
    const pendientes = contratos.filter(c => c.vencido && c.estado === 'activo');
    let ok = 0;
    for (const c of pendientes) {
      const res = await facturarContrato(c.id);
      if (res) ok++;
    }
    return ok;
  }, [contratos, facturarContrato]);

  // ─── Initial load ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (empresaId) {
      loadContratos();
      loadMrr();
    }
  }, [empresaId, loadContratos, loadMrr]);

  return {
    contratos,
    mrr,
    loading,
    error,
    loadContratos,
    loadMrr,
    createContrato,
    setEstado,
    facturarContrato,
    facturarPendientes,
  };
}
