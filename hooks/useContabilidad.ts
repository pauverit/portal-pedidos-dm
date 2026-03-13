import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
  CuentaContable, Asiento, AsientoLinea, SumaSaldo,
  TipoAsiento, EstadoAsiento, NaturalezaCuenta, TipoCuenta,
} from '../types';

// ─── Mappers ───────────────────────────────────────────────────────────────────

function mapCuenta(r: Record<string, unknown>): CuentaContable {
  return {
    id: r.id as string,
    empresa_id: r.empresa_id as string,
    codigo: r.codigo as string,
    nombre: r.nombre as string,
    grupo: Number(r.grupo),
    naturaleza: r.naturaleza as NaturalezaCuenta,
    tipo: r.tipo as TipoCuenta,
    nivel: Number(r.nivel),
    activa: Boolean(r.activa),
    es_pgc: Boolean(r.es_pgc),
    created_at: r.created_at as string,
  };
}

function mapLinea(r: Record<string, unknown>): AsientoLinea {
  return {
    id: r.id as string,
    asiento_id: r.asiento_id as string,
    cuenta_id: r.cuenta_id as string,
    cuenta: r.plan_cuentas
      ? mapCuenta(r.plan_cuentas as Record<string, unknown>)
      : undefined,
    descripcion: r.descripcion as string | undefined,
    debe: Number(r.debe),
    haber: Number(r.haber),
    orden: Number(r.orden),
    created_at: r.created_at as string,
  };
}

function mapAsiento(r: Record<string, unknown>): Asiento {
  return {
    id: r.id as string,
    empresa_id: r.empresa_id as string,
    num_asiento: Number(r.num_asiento),
    fecha: r.fecha as string,
    referencia: r.referencia as string | undefined,
    descripcion: r.descripcion as string,
    tipo: r.tipo as TipoAsiento,
    estado: r.estado as EstadoAsiento,
    origen_id: r.origen_id as string | undefined,
    origen_tipo: r.origen_tipo as string | undefined,
    notas: r.notas as string | undefined,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
    lineas: Array.isArray(r.asiento_lineas)
      ? (r.asiento_lineas as Record<string, unknown>[]).map(mapLinea)
      : undefined,
  };
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useContabilidad(empresaId?: string) {
  const [planCuentas, setPlanCuentas] = useState<CuentaContable[]>([]);
  const [asientos, setAsientos] = useState<Asiento[]>([]);
  const [sumasSaldos, setSumasSaldos] = useState<SumaSaldo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─── Load plan de cuentas ────────────────────────────────────────────────────
  const loadPlanCuentas = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('plan_cuentas')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('activa', true)
        .order('codigo');
      if (err) throw err;
      setPlanCuentas((data || []).map(mapCuenta));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  // ─── Load asientos ───────────────────────────────────────────────────────────
  const loadAsientos = useCallback(async (desde?: string, hasta?: string) => {
    if (!empresaId) return;
    setLoading(true);
    setError(null);
    try {
      let q = supabase
        .from('asientos')
        .select('*, asiento_lineas(*, plan_cuentas(*))')
        .eq('empresa_id', empresaId)
        .order('num_asiento', { ascending: false });
      if (desde) q = q.gte('fecha', desde);
      if (hasta) q = q.lte('fecha', hasta);
      const { data, error: err } = await q;
      if (err) throw err;
      setAsientos((data || []).map(mapAsiento));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  // ─── Load sumas y saldos ─────────────────────────────────────────────────────
  const loadSumasSaldos = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('sumas_saldos')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('codigo');
      if (err) throw err;
      setSumasSaldos((data || []) as SumaSaldo[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  // ─── Create asiento ──────────────────────────────────────────────────────────
  const createAsiento = useCallback(async (draft: {
    fecha: string;
    descripcion: string;
    tipo?: TipoAsiento;
    referencia?: string;
    notas?: string;
    lineas: { cuenta_id: string; descripcion?: string; debe: number; haber: number; orden?: number }[];
  }): Promise<Asiento | null> => {
    if (!empresaId) return null;
    setError(null);
    try {
      // Get next num
      const { data: numData, error: numErr } = await supabase
        .rpc('siguiente_num_asiento', { p_empresa_id: empresaId });
      if (numErr) throw numErr;

      const { data: asientoData, error: asientoErr } = await supabase
        .from('asientos')
        .insert({
          empresa_id: empresaId,
          num_asiento: numData as number,
          fecha: draft.fecha,
          descripcion: draft.descripcion,
          tipo: draft.tipo ?? 'manual',
          estado: 'borrador',
          referencia: draft.referencia,
          notas: draft.notas,
        })
        .select()
        .single();
      if (asientoErr) throw asientoErr;

      const lineas = draft.lineas.map((l, i) => ({
        asiento_id: asientoData.id,
        cuenta_id: l.cuenta_id,
        descripcion: l.descripcion,
        debe: l.debe,
        haber: l.haber,
        orden: l.orden ?? i + 1,
      }));

      const { error: lineasErr } = await supabase
        .from('asiento_lineas')
        .insert(lineas);
      if (lineasErr) throw lineasErr;

      await loadAsientos();
      return mapAsiento(asientoData as Record<string, unknown>);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    }
  }, [empresaId, loadAsientos]);

  // ─── Confirmar asiento ───────────────────────────────────────────────────────
  const confirmarAsiento = useCallback(async (asientoId: string): Promise<boolean> => {
    setError(null);
    try {
      const { error: err } = await supabase
        .rpc('confirmar_asiento', { p_asiento_id: asientoId });
      if (err) throw err;
      setAsientos(prev =>
        prev.map(a => a.id === asientoId ? { ...a, estado: 'confirmado' } : a)
      );
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    }
  }, []);

  // ─── Cancelar asiento ────────────────────────────────────────────────────────
  const cancelarAsiento = useCallback(async (asientoId: string): Promise<boolean> => {
    setError(null);
    try {
      const { error: err } = await supabase
        .from('asientos')
        .update({ estado: 'cancelado', updated_at: new Date().toISOString() })
        .eq('id', asientoId)
        .eq('estado', 'borrador');
      if (err) throw err;
      setAsientos(prev =>
        prev.map(a => a.id === asientoId ? { ...a, estado: 'cancelado' } : a)
      );
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    }
  }, []);

  // ─── Generar asiento desde factura venta ─────────────────────────────────────
  const generarAsientoVenta = useCallback(async (facturaId: string): Promise<string | null> => {
    setError(null);
    try {
      const { data, error: err } = await supabase
        .rpc('generar_asiento_venta', { p_factura_id: facturaId });
      if (err) throw err;
      await loadAsientos();
      return data as string;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    }
  }, [loadAsientos]);

  // ─── Initial load ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (empresaId) {
      loadPlanCuentas();
      loadAsientos();
    }
  }, [empresaId, loadPlanCuentas, loadAsientos]);

  return {
    planCuentas,
    asientos,
    sumasSaldos,
    loading,
    error,
    loadPlanCuentas,
    loadAsientos,
    loadSumasSaldos,
    createAsiento,
    confirmarAsiento,
    cancelarAsiento,
    generarAsientoVenta,
  };
}
