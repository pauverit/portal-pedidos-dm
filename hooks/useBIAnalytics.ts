import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
  BiVentasMensual, BiTopCliente, BiCarteraCobros,
  BiCuentaResultados, BiKpiEmpresa, BiPipelineComercial,
} from '../types';

export function useBIAnalytics(empresaId?: string) {
  const [kpi,        setKpi]        = useState<BiKpiEmpresa | null>(null);
  const [ventas,     setVentas]     = useState<BiVentasMensual[]>([]);
  const [topClientes,setTopClientes]= useState<BiTopCliente[]>([]);
  const [cartera,    setCartera]    = useState<BiCarteraCobros[]>([]);
  const [pyl,        setPyl]        = useState<BiCuentaResultados[]>([]);
  const [pipeline,   setPipeline]   = useState<BiPipelineComercial[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    setError(null);
    try {
      const [r1, r2, r3, r4, r5, r6] = await Promise.all([
        // KPI resumen
        supabase.from('bi_kpi_empresa').select('*').eq('empresa_id', empresaId).single(),
        // Ventas últimos 12 meses
        supabase.from('bi_ventas_mensual').select('*').eq('empresa_id', empresaId)
          .gte('periodo', new Date(new Date().setMonth(new Date().getMonth() - 12))
            .toISOString().slice(0, 7))
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
          .gte('periodo', new Date(new Date().setMonth(new Date().getMonth() - 12))
            .toISOString().slice(0, 7))
          .order('periodo', { ascending: true }),
        // Pipeline comercial
        supabase.from('bi_pipeline_comercial').select('*').eq('empresa_id', empresaId),
      ]);

      if (r1.data) setKpi(r1.data as BiKpiEmpresa);
      if (r2.data) setVentas(r2.data as BiVentasMensual[]);
      if (r3.data) setTopClientes(r3.data as BiTopCliente[]);
      if (r4.data) setCartera(r4.data as BiCarteraCobros[]);
      if (r5.data) setPyl(r5.data as BiCuentaResultados[]);
      if (r6.data) setPipeline(r6.data as BiPipelineComercial[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  useEffect(() => { if (empresaId) loadAll(); }, [empresaId, loadAll]);

  return { kpi, ventas, topClientes, cartera, pyl, pipeline, loading, error, loadAll };
}
