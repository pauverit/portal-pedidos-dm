import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
  BiVentasMensual, BiTopCliente, BiCarteraCobros,
  BiCuentaResultados, BiKpiEmpresa, BiPipelineComercial,
  BiRentabilidadProducto, BiMargenNetoEmpresa,
} from '../types';

export function useBIAnalytics(empresaId?: string) {
  const [kpi,        setKpi]        = useState<BiKpiEmpresa | null>(null);
  const [ventas,     setVentas]     = useState<BiVentasMensual[]>([]);
  const [topClientes,setTopClientes]= useState<BiTopCliente[]>([]);
  const [cartera,    setCartera]    = useState<BiCarteraCobros[]>([]);
  const [pyl,        setPyl]        = useState<BiCuentaResultados[]>([]);
  const [pipeline,       setPipeline]       = useState<BiPipelineComercial[]>([]);
  const [rentabilidad,   setRentabilidad]   = useState<BiRentabilidadProducto[]>([]);
  const [margenNeto,     setMargenNeto]     = useState<BiMargenNetoEmpresa[]>([]);
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    setError(null);
    try {
      const periodoDesde12 = new Date(new Date().setMonth(new Date().getMonth() - 12))
        .toISOString().slice(0, 7);

      const [r1, r2, r3, r4, r5, r6, r7, r8] = await Promise.all([
        // KPI resumen
        supabase.from('bi_kpi_empresa').select('*').eq('empresa_id', empresaId).single(),
        // Ventas últimos 12 meses
        supabase.from('bi_ventas_mensual').select('*').eq('empresa_id', empresaId)
          .gte('periodo', periodoDesde12)
          .order('periodo', { ascending: true }),
        // Top clientes
        supabase.from('bi_top_clientes').select('*').eq('empresa_id', empresaId)
          .order('total_facturado', { ascending: false })
          .limit(10),
        // Cartera pendiente
        supabase.from('bi_cartera_cobros').select('*').eq('empresa_id', empresaId)
          .not('situacion', 'in', '(cobrada,anulada)')
          .order('fecha_vencimiento', { ascending: true }),
        // P&L últimos 12 meses
        supabase.from('bi_cuenta_resultados').select('*').eq('empresa_id', empresaId)
          .gte('periodo', periodoDesde12)
          .order('periodo', { ascending: true }),
        // Pipeline comercial
        supabase.from('bi_pipeline_comercial').select('*').eq('empresa_id', empresaId),
        // Rentabilidad por producto (PASO 11)
        supabase.from('bi_rentabilidad_producto').select('*').eq('empresa_id', empresaId)
          .order('margen_bruto_total', { ascending: false })
          .limit(50),
        // Margen neto empresa (PASO 11)
        supabase.from('bi_margen_neto_empresa').select('*').eq('empresa_id', empresaId)
          .gte('periodo', periodoDesde12)
          .order('periodo', { ascending: true }),
      ]);

      if (r1.data) setKpi(r1.data as BiKpiEmpresa);
      if (r2.data) setVentas(r2.data as BiVentasMensual[]);
      if (r3.data) setTopClientes(r3.data as BiTopCliente[]);
      if (r4.data) setCartera(r4.data as BiCarteraCobros[]);
      if (r5.data) setPyl(r5.data as BiCuentaResultados[]);
      if (r6.data) setPipeline(r6.data as BiPipelineComercial[]);
      if (r7.data) setRentabilidad((r7.data as any[]).map(r => ({
        productoId: r.producto_id, empresaId: r.empresa_id,
        productoNombre: r.producto_nombre, reference: r.reference,
        categoria: r.categoria, familia: r.familia,
        costeActual: Number(r.coste_actual ?? 0),
        pvpActual: Number(r.pvp_actual ?? 0),
        margenActualPct: Number(r.margen_actual_pct ?? 0),
        numFacturas: Number(r.num_facturas ?? 0),
        unidadesVendidas: Number(r.unidades_vendidas ?? 0),
        ingresoTotal: Number(r.ingreso_total ?? 0),
        margenBrutoTotal: Number(r.margen_bruto_total ?? 0),
        margenMedioPct: Number(r.margen_medio_pct ?? 0),
      })));
      if (r8.data) setMargenNeto((r8.data as any[]).map(r => ({
        empresaId: r.empresa_id, periodo: r.periodo,
        ventas: Number(r.ventas ?? 0),
        margenBruto: Number(r.margen_bruto ?? 0),
        gastosOperativos: Number(r.gastos_operativos ?? 0),
        gastosPersonal: Number(r.gastos_personal ?? 0),
        gastosTotales: Number(r.gastos_totales ?? 0),
        resultadoNeto: Number(r.resultado_neto ?? 0),
        margenNetoPct: Number(r.margen_neto_pct ?? 0),
      })));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  useEffect(() => { if (empresaId) loadAll(); }, [empresaId, loadAll]);

  return { kpi, ventas, topClientes, cartera, pyl, pipeline, rentabilidad, margenNeto, loading, error, loadAll };
}
