import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface ClienteBasico {
  id: string;
  name: string;
  email: string;
  phone?: string;
  cif?: string;
  role: string;
  salesRep?: string;
  delegation?: string;
  delegationId?: string;
  isActive?: boolean;
  registrationDate?: string;
  rappelAccumulated?: number;
}

export interface RiesgoResumen {
  limiteCoface?: number;
  limiteInterno?: number;
  limiteEfectivo: number;
  bloqueado: boolean;
  motivoBloqueo?: string;
  deudaTotal: number;
  deudaVencida: number;
  deudaVigente: number;
  pedidosSinFacturar: number;
  riesgoVivo: number;
  pctLimiteUsado?: number;
  creditoDisponible: number;
  estadoRiesgo: string;
  diasMayorVencimiento: number;
}

export interface PedidoResumen {
  id: string;
  referencia?: string;
  fecha: string;
  estado: string;
  total: number;
}

export interface FacturaResumen {
  id: string;
  referencia: string;
  fecha: string;
  fechaVencimiento?: string;
  estado: string;
  total: number;
  saldoPendiente: number;
  diasVencida: number;
}

export interface IncidenciaResumen {
  id: string;
  reference: string;
  title: string;
  status: string;
  severity: string;
  createdAt: string;
}

export interface VisitaResumen {
  id: string;
  visitDate: string;
  notes?: string;
  nextAction?: string;
}

export interface LlamadaResumen {
  id: string;
  callDate: string;
  direction: string;
  summary?: string;
}

export interface MaquinaResumen {
  id: string;
  model: string;
  brand: string;
  serialNumber: string;
  status: string;
  warrantyExpires?: string;
}

export interface ClienteInfo360 {
  cliente: ClienteBasico;
  riesgo?: RiesgoResumen;
  pedidos: PedidoResumen[];
  facturas: FacturaResumen[];
  incidencias: IncidenciaResumen[];
  visitas: VisitaResumen[];
  llamadas: LlamadaResumen[];
  maquinas: MaquinaResumen[];
  // KPIs calculados
  totalFacturadoUltimos12m: number;
  numPedidosUltimos12m: number;
}

// ─── Hook ───────────────────────────────────────────────────────────────────────

export function useClienteInfo360() {
  const [info, setInfo]       = useState<ClienteInfo360 | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const fetch360 = useCallback(async (clienteId: string, empresaId: string) => {
    if (!clienteId || !empresaId) return;
    setLoading(true);
    setError(null);

    try {
      // ── 1. Datos del cliente ───────────────────────────────────────────────
      const { data: clientRow, error: clientErr } = await supabase
        .from('clients')
        .select('id, name, email, phone, cif, role, sales_rep, delegation, delegation_id, is_active, created_at, rappel_accumulated')
        .eq('id', clienteId)
        .single();
      if (clientErr) throw clientErr;

      const cliente: ClienteBasico = {
        id:                 clientRow.id,
        name:               clientRow.name,
        email:              clientRow.email,
        phone:              clientRow.phone,
        cif:                clientRow.cif,
        role:               clientRow.role,
        salesRep:           clientRow.sales_rep,
        delegation:         clientRow.delegation,
        delegationId:       clientRow.delegation_id,
        isActive:           clientRow.is_active,
        registrationDate:   clientRow.created_at?.slice(0, 10),
        rappelAccumulated:  clientRow.rappel_accumulated ?? 0,
      };

      // ── 2. Riesgo crediticio ───────────────────────────────────────────────
      let riesgo: RiesgoResumen | undefined;
      const { data: riesgoRow } = await supabase
        .from('v_riesgo_cliente')
        .select('*')
        .eq('cliente_id', clienteId)
        .eq('empresa_id', empresaId)
        .single();
      if (riesgoRow) {
        riesgo = {
          limiteCoface:        riesgoRow.limite_coface,
          limiteInterno:       riesgoRow.limite_interno,
          limiteEfectivo:      Number(riesgoRow.limite_efectivo ?? 0),
          bloqueado:           Boolean(riesgoRow.bloqueado),
          motivoBloqueo:       riesgoRow.motivo_bloqueo,
          deudaTotal:          Number(riesgoRow.deuda_total ?? 0),
          deudaVencida:        Number(riesgoRow.deuda_vencida ?? 0),
          deudaVigente:        Number(riesgoRow.deuda_vigente ?? 0),
          pedidosSinFacturar:  Number(riesgoRow.pedidos_sin_facturar ?? 0),
          riesgoVivo:          Number(riesgoRow.riesgo_vivo ?? 0),
          pctLimiteUsado:      riesgoRow.pct_limite_usado != null ? Number(riesgoRow.pct_limite_usado) : undefined,
          creditoDisponible:   Number(riesgoRow.credito_disponible ?? 0),
          estadoRiesgo:        riesgoRow.estado_riesgo ?? 'sin_limite',
          diasMayorVencimiento:Number(riesgoRow.dias_mayor_vencimiento ?? 0),
        };
      }

      // ── 3. Pedidos de venta (últimos 20) ──────────────────────────────────
      const { data: pedidosRows } = await supabase
        .from('pedidos_venta')
        .select('id, referencia, fecha, estado, total')
        .eq('cliente_id', clienteId)
        .eq('empresa_id', empresaId)
        .order('fecha', { ascending: false })
        .limit(20);

      const pedidos: PedidoResumen[] = (pedidosRows ?? []).map(r => ({
        id:         r.id,
        referencia: r.referencia,
        fecha:      r.fecha,
        estado:     r.estado,
        total:      Number(r.total ?? 0),
      }));

      // ── 4. Facturas (últimas 20) ──────────────────────────────────────────
      const { data: facturasRows } = await supabase
        .from('v_facturas_pendientes_cliente')
        .select('id, referencia, fecha, fecha_vencimiento, estado, total, saldo_pendiente, dias_vencida')
        .eq('cliente_id', clienteId)
        .eq('empresa_id', empresaId)
        .order('fecha', { ascending: false })
        .limit(20);

      const facturas: FacturaResumen[] = (facturasRows ?? []).map(r => ({
        id:               r.id,
        referencia:       r.referencia,
        fecha:            r.fecha,
        fechaVencimiento: r.fecha_vencimiento,
        estado:           r.estado,
        total:            Number(r.total ?? 0),
        saldoPendiente:   Number(r.saldo_pendiente ?? 0),
        diasVencida:      Number(r.dias_vencida ?? 0),
      }));

      // ── 5. Incidencias abiertas o recientes ───────────────────────────────
      const { data: incRows } = await supabase
        .from('incidents')
        .select('id, reference, title, status, severity, created_at')
        .eq('client_id', clienteId)
        .order('created_at', { ascending: false })
        .limit(10);

      const incidencias: IncidenciaResumen[] = (incRows ?? []).map(r => ({
        id:        r.id,
        reference: r.reference,
        title:     r.title,
        status:    r.status,
        severity:  r.severity,
        createdAt: r.created_at,
      }));

      // ── 6. Visitas CRM (últimas 8) ────────────────────────────────────────
      const { data: visitRows } = await supabase
        .from('client_visits')
        .select('id, visit_date, notes, next_action')
        .eq('client_id', clienteId)
        .order('visit_date', { ascending: false })
        .limit(8);

      const visitas: VisitaResumen[] = (visitRows ?? []).map(r => ({
        id:         r.id,
        visitDate:  r.visit_date,
        notes:      r.notes,
        nextAction: r.next_action,
      }));

      // ── 7. Llamadas CRM (últimas 8) ───────────────────────────────────────
      const { data: callRows } = await supabase
        .from('client_calls')
        .select('id, call_date, direction, summary')
        .eq('client_id', clienteId)
        .order('call_date', { ascending: false })
        .limit(8);

      const llamadas: LlamadaResumen[] = (callRows ?? []).map(r => ({
        id:        r.id,
        callDate:  r.call_date,
        direction: r.direction,
        summary:   r.summary,
      }));

      // ── 8. Máquinas del cliente ───────────────────────────────────────────
      const { data: machRows } = await supabase
        .from('machines')
        .select('id, model, brand, serial_number, status, warranty_expires')
        .eq('client_id', clienteId)
        .order('install_date', { ascending: false });

      const maquinas: MaquinaResumen[] = (machRows ?? []).map(r => ({
        id:               r.id,
        model:            r.model,
        brand:            r.brand,
        serialNumber:     r.serial_number,
        status:           r.status,
        warrantyExpires:  r.warranty_expires,
      }));

      // ── 9. KPIs ───────────────────────────────────────────────────────────
      const hace12m = new Date();
      hace12m.setFullYear(hace12m.getFullYear() - 1);
      const hace12mStr = hace12m.toISOString().slice(0, 10);

      const totalFacturadoUltimos12m = facturas
        .filter(f => f.fecha >= hace12mStr)
        .reduce((s, f) => s + f.total, 0);

      const numPedidosUltimos12m = pedidos
        .filter(p => p.fecha >= hace12mStr).length;

      setInfo({
        cliente,
        riesgo,
        pedidos,
        facturas,
        incidencias,
        visitas,
        llamadas,
        maquinas,
        totalFacturadoUltimos12m,
        numPedidosUltimos12m,
      });
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => setInfo(null), []);

  return { info, loading, error, fetch360, clear };
}
