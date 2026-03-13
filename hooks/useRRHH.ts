import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
  Empleado, Departamento, Nomina, NominaConcepto,
  Ausencia, MasaSalarialPeriodo,
  TipoContrato, EstadoEmpleado, JornadaEmpleado,
  EstadoNomina, TipoAusencia, EstadoAusencia,
} from '../types';

// ─── Mappers ──────────────────────────────────────────────────────────────────

function mapEmpleado(r: Record<string, unknown>): Empleado {
  return {
    id:                 r.id as string,
    empresa_id:         r.empresa_id as string,
    departamento_id:    r.departamento_id as string | undefined,
    nombre:             r.nombre as string,
    apellidos:          r.apellidos as string,
    dni_nie:            r.dni_nie as string | undefined,
    fecha_nacimiento:   r.fecha_nacimiento as string | undefined,
    email:              r.email as string | undefined,
    telefono:           r.telefono as string | undefined,
    direccion:          r.direccion as string | undefined,
    num_ss:             r.num_ss as string | undefined,
    num_cuenta_iban:    r.num_cuenta_iban as string | undefined,
    puesto:             r.puesto as string,
    grupo_cotizacion:   Number(r.grupo_cotizacion),
    tipo_contrato:      r.tipo_contrato as TipoContrato,
    jornada:            r.jornada as JornadaEmpleado,
    porcentaje_jornada: Number(r.porcentaje_jornada),
    sueldo_bruto_anual: Number(r.sueldo_bruto_anual),
    num_pagas:          Number(r.num_pagas) as 12 | 14,
    irpf_porcentaje:    Number(r.irpf_porcentaje),
    fecha_alta:         r.fecha_alta as string,
    fecha_baja:         r.fecha_baja as string | undefined,
    estado:             r.estado as EstadoEmpleado,
    notas:              r.notas as string | undefined,
    created_at:         r.created_at as string,
    updated_at:         r.updated_at as string,
    departamento:       r.departamento as string | undefined,
    salario_mensual:    r.salario_mensual != null ? Number(r.salario_mensual) : undefined,
  };
}

function mapNomina(r: Record<string, unknown>): Nomina {
  return {
    id:                   r.id as string,
    empresa_id:           r.empresa_id as string,
    empleado_id:          r.empleado_id as string,
    periodo:              r.periodo as string,
    num_paga:             r.num_paga != null ? Number(r.num_paga) : undefined,
    fecha_pago:           r.fecha_pago as string | undefined,
    total_devengado:      Number(r.total_devengado),
    total_deducciones:    Number(r.total_deducciones),
    liquido_percibir:     Number(r.liquido_percibir),
    ss_empresa:           Number(r.ss_empresa),
    coste_total_empresa:  Number(r.coste_total_empresa),
    estado:               r.estado as EstadoNomina,
    notas:                r.notas as string | undefined,
    created_at:           r.created_at as string,
    updated_at:           r.updated_at as string,
    empleado_nombre:      r.empleado_nombre as string | undefined,
    dni_nie:              r.dni_nie as string | undefined,
    puesto:               r.puesto as string | undefined,
    departamento:         r.departamento as string | undefined,
  };
}

function mapAusencia(r: Record<string, unknown>): Ausencia {
  return {
    id:              r.id as string,
    empresa_id:      r.empresa_id as string,
    empleado_id:     r.empleado_id as string,
    tipo:            r.tipo as TipoAusencia,
    fecha_inicio:    r.fecha_inicio as string,
    fecha_fin:       r.fecha_fin as string,
    dias_habiles:    r.dias_habiles != null ? Number(r.dias_habiles) : undefined,
    dias_naturales:  r.dias_naturales != null ? Number(r.dias_naturales) : undefined,
    estado:          r.estado as EstadoAusencia,
    aprobado_por:    r.aprobado_por as string | undefined,
    notas:           r.notas as string | undefined,
    created_at:      r.created_at as string,
    empleado_nombre: r.empleado_nombre as string | undefined,
    puesto:          r.puesto as string | undefined,
    departamento:    r.departamento as string | undefined,
  };
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useRRHH(empresaId?: string) {
  const [empleados,     setEmpleados]     = useState<Empleado[]>([]);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [nominas,       setNominas]       = useState<Nomina[]>([]);
  const [ausencias,     setAusencias]     = useState<Ausencia[]>([]);
  const [masaSalarial,  setMasaSalarial]  = useState<MasaSalarialPeriodo[]>([]);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState<string | null>(null);

  // ─── Empleados ────────────────────────────────────────────────────────────
  const loadEmpleados = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    try {
      const { data, error: err } = await supabase
        .from('plantilla_activa')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('nombre');
      if (err) throw err;
      setEmpleados((data || []).map(mapEmpleado));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  const createEmpleado = useCallback(async (
    draft: Omit<Empleado, 'id' | 'created_at' | 'updated_at' | 'departamento' | 'salario_mensual'>
  ): Promise<Empleado | null> => {
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('empleados')
        .insert({ ...draft })
        .select()
        .single();
      if (err) throw err;
      await loadEmpleados();
      return mapEmpleado(data as Record<string, unknown>);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    }
  }, [loadEmpleados]);

  const updateEmpleado = useCallback(async (
    id: string,
    patch: Partial<Omit<Empleado, 'id' | 'empresa_id' | 'created_at' | 'updated_at'>>
  ): Promise<boolean> => {
    setError(null);
    try {
      const { error: err } = await supabase
        .from('empleados')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (err) throw err;
      await loadEmpleados();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    }
  }, [loadEmpleados]);

  // ─── Departamentos ────────────────────────────────────────────────────────
  const loadDepartamentos = useCallback(async () => {
    if (!empresaId) return;
    try {
      const { data, error: err } = await supabase
        .from('departamentos')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('nombre');
      if (err) throw err;
      setDepartamentos((data || []) as Departamento[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [empresaId]);

  const createDepartamento = useCallback(async (nombre: string, codigo?: string): Promise<boolean> => {
    if (!empresaId) return false;
    setError(null);
    try {
      const { error: err } = await supabase
        .from('departamentos')
        .insert({ empresa_id: empresaId, nombre, codigo });
      if (err) throw err;
      await loadDepartamentos();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    }
  }, [empresaId, loadDepartamentos]);

  // ─── Nóminas ─────────────────────────────────────────────────────────────
  const loadNominas = useCallback(async (periodo?: string) => {
    if (!empresaId) return;
    setLoading(true);
    try {
      let q = supabase
        .from('nominas_detalle')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('periodo', { ascending: false });
      if (periodo) q = q.eq('periodo', periodo);
      const { data, error: err } = await q;
      if (err) throw err;
      setNominas((data || []).map(mapNomina));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  const generarNominasMensuales = useCallback(async (periodo: string): Promise<number> => {
    if (!empresaId) return 0;
    setError(null);
    try {
      const { data, error: err } = await supabase
        .rpc('generar_nominas_periodo', {
          p_empresa_id: empresaId,
          p_periodo: periodo,
        });
      if (err) throw err;
      await loadNominas(periodo);
      return data as number;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return 0;
    }
  }, [empresaId, loadNominas]);

  const confirmarNomina = useCallback(async (nominaId: string): Promise<boolean> => {
    setError(null);
    try {
      const { error: err } = await supabase
        .rpc('confirmar_nomina', { p_nomina_id: nominaId });
      if (err) throw err;
      setNominas(prev => prev.map(n =>
        n.id === nominaId ? { ...n, estado: 'confirmada' as EstadoNomina } : n
      ));
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    }
  }, []);

  const getConceptos = useCallback(async (nominaId: string): Promise<NominaConcepto[]> => {
    try {
      const { data, error: err } = await supabase
        .from('nomina_conceptos')
        .select('*')
        .eq('nomina_id', nominaId)
        .order('orden');
      if (err) throw err;
      return (data || []) as NominaConcepto[];
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return [];
    }
  }, []);

  // ─── Ausencias ────────────────────────────────────────────────────────────
  const loadAusencias = useCallback(async (soloSolicitadas = false) => {
    if (!empresaId) return;
    try {
      const view = soloSolicitadas ? 'ausencias_pendientes' : 'ausencias';
      const { data, error: err } = await supabase
        .from(view)
        .select(soloSolicitadas ? '*' : '*, empleados(nombre, apellidos, puesto)')
        .eq('empresa_id', empresaId)
        .order('fecha_inicio', { ascending: false });
      if (err) throw err;
      setAusencias((data || []).map(mapAusencia));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [empresaId]);

  const createAusencia = useCallback(async (
    draft: Omit<Ausencia, 'id' | 'created_at' | 'dias_naturales' | 'empleado_nombre' | 'puesto' | 'departamento'>
  ): Promise<boolean> => {
    setError(null);
    try {
      const { error: err } = await supabase
        .from('ausencias')
        .insert({ ...draft });
      if (err) throw err;
      await loadAusencias();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    }
  }, [loadAusencias]);

  const setEstadoAusencia = useCallback(async (
    id: string, estado: EstadoAusencia, aprobadoPor?: string
  ): Promise<boolean> => {
    setError(null);
    try {
      const { error: err } = await supabase
        .from('ausencias')
        .update({ estado, aprobado_por: aprobadoPor })
        .eq('id', id);
      if (err) throw err;
      setAusencias(prev => prev.map(a => a.id === id ? { ...a, estado } : a));
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    }
  }, []);

  // ─── Masa salarial ────────────────────────────────────────────────────────
  const loadMasaSalarial = useCallback(async () => {
    if (!empresaId) return;
    try {
      const { data, error: err } = await supabase
        .from('masa_salarial_periodo')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('periodo', { ascending: false });
      if (err) throw err;
      setMasaSalarial((data || []) as MasaSalarialPeriodo[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [empresaId]);

  // ─── Initial load ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (empresaId) {
      loadEmpleados();
      loadDepartamentos();
      loadMasaSalarial();
    }
  }, [empresaId, loadEmpleados, loadDepartamentos, loadMasaSalarial]);

  return {
    empleados, departamentos, nominas, ausencias, masaSalarial,
    loading, error,
    loadEmpleados, createEmpleado, updateEmpleado,
    loadDepartamentos, createDepartamento,
    loadNominas, generarNominasMensuales, confirmarNomina, getConceptos,
    loadAusencias, createAusencia, setEstadoAusencia,
    loadMasaSalarial,
  };
}
