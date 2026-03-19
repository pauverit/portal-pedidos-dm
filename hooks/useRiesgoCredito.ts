import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type {
  RiesgoCliente,
  LimiteCredito,
  FacturaPendienteRiesgo,
  EstadoRiesgo,
  ClasificacionCoface,
  ResumenRiesgoEmpresa,
} from '../types';

// ─── Mappers raw → typed ────────────────────────────────────

function mapRiesgo(r: Record<string, unknown>): RiesgoCliente {
  return {
    clienteId:             r.cliente_id               as string,
    clienteNombre:         r.cliente_nombre            as string,
    email:                 r.email                     as string,
    cif:                   r.cif                       as string | undefined,
    empresaId:             r.empresa_id                as string,
    limiteId:              r.limite_id                 as string | undefined,
    limiteCoface:          r.limite_coface             as number | undefined,
    clasificacionCoface:   r.clasificacion_coface      as ClasificacionCoface | undefined,
    numeroPolizaCoface:    r.numero_poliza_coface      as string | undefined,
    fechaConsultaCoface:   r.fecha_consulta_coface     as string | undefined,
    fechaVencimientoCoface:r.fecha_vencimiento_coface  as string | undefined,
    limiteInterno:         r.limite_interno            as number | undefined,
    limiteEfectivo:        Number(r.limite_efectivo    ?? 0),
    bloqueado:             Boolean(r.bloqueado),
    motivoBloqueo:         r.motivo_bloqueo            as string | undefined,
    fechaBloqueo:          r.fecha_bloqueo             as string | undefined,
    deudaTotal:            Number(r.deuda_total        ?? 0),
    deudaVencida:          Number(r.deuda_vencida      ?? 0),
    deudaVigente:          Number(r.deuda_vigente      ?? 0),
    pedidosSinFacturar:    Number(r.pedidos_sin_facturar ?? 0),
    numFacturasPendientes: Number(r.num_facturas_pendientes ?? 0),
    numPedidosVivos:       Number(r.num_pedidos_vivos  ?? 0),
    diasMayorVencimiento:  Number(r.dias_mayor_vencimiento ?? 0),
    riesgoVivo:            Number(r.riesgo_vivo        ?? 0),
    pctLimiteUsado:        r.pct_limite_usado != null ? Number(r.pct_limite_usado) : undefined,
    creditoDisponible:     Number(r.credito_disponible ?? 0),
    estadoRiesgo:          (r.estado_riesgo            as EstadoRiesgo) ?? 'sin_limite',
  };
}

function mapFacturaPendiente(f: Record<string, unknown>): FacturaPendienteRiesgo {
  return {
    id:              f.id              as string,
    referencia:      f.referencia      as string,
    empresaId:       f.empresa_id      as string,
    clienteId:       f.cliente_id      as string,
    clienteNombre:   f.cliente_nombre  as string | undefined,
    fecha:           f.fecha           as string,
    fechaVencimiento:f.fecha_vencimiento as string | undefined,
    estado:          f.estado          as string,
    total:           Number(f.total    ?? 0),
    totalCobrado:    Number(f.total_cobrado ?? 0),
    saldoPendiente:  Number(f.saldo_pendiente ?? 0),
    diasVencida:     Number(f.dias_vencida ?? 0),
  };
}

// ─── Hook ───────────────────────────────────────────────────

export function useRiesgoCredito(empresaId: string | undefined) {
  const [riesgos,  setRiesgos]  = useState<RiesgoCliente[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  // ── Cargar riesgo de todos los clientes ─────────────────
  const fetchRiesgos = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('v_riesgo_cliente')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('deuda_vencida', { ascending: false });

      if (err) throw err;
      setRiesgos((data ?? []).map(mapRiesgo));
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  // ── Cargar facturas pendientes de un cliente concreto ───
  const fetchFacturasPendientes = useCallback(
    async (clienteId: string): Promise<FacturaPendienteRiesgo[]> => {
      const { data, error: err } = await supabase
        .from('v_facturas_pendientes_cliente')
        .select('*')
        .eq('cliente_id', clienteId)
        .eq('empresa_id', empresaId ?? '')
        .order('dias_vencida', { ascending: false });

      if (err) throw new Error(err.message);
      return (data ?? []).map(mapFacturaPendiente);
    },
    [empresaId]
  );

  // ── Cargar pedidos confirmados sin factura ───────────────
  const fetchPedidosVivos = useCallback(
    async (clienteId: string) => {
      const { data, error: err } = await supabase
        .from('pedidos_venta')
        .select('id, referencia, fecha, estado, total')
        .eq('cliente_id', clienteId)
        .eq('empresa_id', empresaId ?? '')
        .in('estado', ['confirmado', 'en_proceso', 'entregado'])
        .order('fecha', { ascending: false });

      if (err) throw new Error(err.message);
      return data ?? [];
    },
    [empresaId]
  );

  // ── Guardar / actualizar límite de crédito ───────────────
  const saveLimiteCredito = useCallback(
    async (clienteId: string, datos: Partial<LimiteCredito>) => {
      if (!empresaId) return;

      const row = {
        empresa_id:               empresaId,
        cliente_id:               clienteId,
        limite_coface:            datos.limiteCoface             ?? null,
        clasificacion_coface:     datos.clasificacionCoface      ?? null,
        numero_poliza_coface:     datos.numeroPolizaCoface       ?? null,
        fecha_consulta_coface:    datos.fechaConsultaCoface      ?? null,
        fecha_vencimiento_coface: datos.fechaVencimientoCoface   ?? null,
        limite_interno:           datos.limiteInterno            ?? null,
        notas:                    datos.notas                    ?? null,
      };

      const { error: err } = await supabase
        .from('limites_credito')
        .upsert(row, { onConflict: 'empresa_id,cliente_id' });

      if (err) throw new Error(err.message);
      await fetchRiesgos();
    },
    [empresaId, fetchRiesgos]
  );

  // ── Bloquear cliente ─────────────────────────────────────
  const bloquearCliente = useCallback(
    async (clienteId: string, motivo: string, bloqueadoPor: string) => {
      if (!empresaId) return;

      // Upsert: si ya existe el registro, actualiza; si no, lo crea
      const { error: err } = await supabase
        .from('limites_credito')
        .upsert(
          {
            empresa_id:     empresaId,
            cliente_id:     clienteId,
            bloqueado:      true,
            motivo_bloqueo: motivo,
            fecha_bloqueo:  new Date().toISOString(),
            bloqueado_por:  bloqueadoPor,
          },
          { onConflict: 'empresa_id,cliente_id' }
        );

      if (err) throw new Error(err.message);
      await fetchRiesgos();
    },
    [empresaId, fetchRiesgos]
  );

  // ── Desbloquear cliente ──────────────────────────────────
  const desbloquearCliente = useCallback(
    async (clienteId: string) => {
      if (!empresaId) return;

      const { error: err } = await supabase
        .from('limites_credito')
        .update({
          bloqueado:      false,
          motivo_bloqueo: null,
          fecha_bloqueo:  null,
          bloqueado_por:  null,
        })
        .eq('empresa_id', empresaId)
        .eq('cliente_id', clienteId);

      if (err) throw new Error(err.message);
      await fetchRiesgos();
    },
    [empresaId, fetchRiesgos]
  );

  // ── Check rápido para usar en VentasView / pedidos ───────
  // Devuelve el estado de riesgo de un cliente sin recargar toda la lista
  const checkRiesgoCliente = useCallback(
    async (clienteId: string): Promise<RiesgoCliente | null> => {
      if (!empresaId) return null;
      const { data, error: err } = await supabase
        .from('v_riesgo_cliente')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('cliente_id', clienteId)
        .single();

      if (err || !data) return null;
      return mapRiesgo(data as Record<string, unknown>);
    },
    [empresaId]
  );

  // ── Resumen para cards del dashboard ─────────────────────
  const getResumen = useCallback((): ResumenRiesgoEmpresa => {
    const totalRiesgoVivo      = riesgos.reduce((s, r) => s + r.riesgoVivo, 0);
    const totalDeudaVencida    = riesgos.reduce((s, r) => s + r.deudaVencida, 0);
    const limiteCoface_total   = riesgos.reduce((s, r) => s + (r.limiteCoface ?? 0), 0);
    const clientesBloqueados   = riesgos.filter(r => r.bloqueado).length;
    const clientesSinLimite    = riesgos.filter(r => r.estadoRiesgo === 'sin_limite').length;
    const clientesEnAlerta     = riesgos.filter(
      r => ['alerta', 'excedido', 'vencido'].includes(r.estadoRiesgo)
    ).length;

    return {
      totalClientesConRiesgo: riesgos.filter(r => r.riesgoVivo > 0).length,
      totalRiesgoVivo,
      totalDeudaVencida,
      clientesBloqueados,
      clientesSinLimite,
      clientesEnAlerta,
      limiteCoface_total,
      pctLimiteGlobalUsado:
        limiteCoface_total > 0
          ? Math.round((totalRiesgoVivo / limiteCoface_total) * 100)
          : undefined,
    };
  }, [riesgos]);

  return {
    riesgos,
    loading,
    error,
    fetchRiesgos,
    fetchFacturasPendientes,
    fetchPedidosVivos,
    saveLimiteCredito,
    bloquearCliente,
    desbloquearCliente,
    checkRiesgoCliente,
    getResumen,
  };
}
