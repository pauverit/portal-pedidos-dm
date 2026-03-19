import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// ─── Types ──────────────────────────────────────────────────────────────────

export type TipoCita =
  | 'sat' | 'comercial' | 'reunion' | 'llamada' | 'tarea' | 'recordatorio' | 'otro';

export type EstadoCita =
  | 'pendiente' | 'confirmada' | 'en_curso' | 'completada' | 'cancelada';

export interface Cita {
  id: string;
  empresa_id?: string;
  titulo: string;
  tipo: TipoCita;
  fecha_inicio: string;       // ISO 8601
  fecha_fin?: string;
  todo_el_dia: boolean;
  descripcion?: string;
  ubicacion?: string;
  estado: EstadoCita;
  cliente_id?: string;
  cliente_nombre?: string;
  responsable_id?: string;
  responsable_nombre?: string;
  work_order_id?: string;
  incidencia_id?: string;
  visita_id?: string;
  recordatorio_min?: number;
  color?: string;
  created_at?: string;
  created_by?: string;
}

export type CitaDraft = Omit<Cita, 'id' | 'created_at' | 'created_by'>;

// ─── Helpers ────────────────────────────────────────────────────────────────

export const TIPO_CONFIG: Record<TipoCita, { label: string; color: string; bg: string; dot: string }> = {
  sat:          { label: 'SAT / Servicio',   color: 'text-orange-700', bg: 'bg-orange-100', dot: 'bg-orange-500' },
  comercial:    { label: 'Visita comercial', color: 'text-blue-700',   bg: 'bg-blue-100',   dot: 'bg-blue-500' },
  reunion:      { label: 'Reunión',          color: 'text-violet-700', bg: 'bg-violet-100', dot: 'bg-violet-500' },
  llamada:      { label: 'Llamada',          color: 'text-cyan-700',   bg: 'bg-cyan-100',   dot: 'bg-cyan-500' },
  tarea:        { label: 'Tarea',            color: 'text-slate-700',  bg: 'bg-slate-100',  dot: 'bg-slate-400' },
  recordatorio: { label: 'Recordatorio',     color: 'text-amber-700',  bg: 'bg-amber-100',  dot: 'bg-amber-400' },
  otro:         { label: 'Otro',             color: 'text-slate-600',  bg: 'bg-slate-50',   dot: 'bg-slate-300' },
};

export const ESTADO_CONFIG: Record<EstadoCita, { label: string; badge: string }> = {
  pendiente:  { label: 'Pendiente',   badge: 'bg-amber-100 text-amber-700' },
  confirmada: { label: 'Confirmada',  badge: 'bg-blue-100 text-blue-700' },
  en_curso:   { label: 'En curso',    badge: 'bg-green-100 text-green-700' },
  completada: { label: 'Completada',  badge: 'bg-slate-100 text-slate-500' },
  cancelada:  { label: 'Cancelada',   badge: 'bg-red-100 text-red-600' },
};

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useAgenda(empresaId?: string) {
  const [citas, setCitas] = useState<Cita[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMes = useCallback(async (anio: number, mes: number) => {
    setLoading(true);
    setError(null);
    try {
      // Rango del mes completo
      const desde = new Date(anio, mes - 1, 1).toISOString();
      const hasta = new Date(anio, mes, 1).toISOString();

      let q = supabase
        .from('citas')
        .select('*')
        .gte('fecha_inicio', desde)
        .lt('fecha_inicio', hasta)
        .order('fecha_inicio');

      if (empresaId) q = q.eq('empresa_id', empresaId);

      const { data, error: err } = await q;
      if (err) throw err;
      setCitas((data ?? []) as Cita[]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error cargando citas');
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  const loadProximas = useCallback(async (dias = 30) => {
    setLoading(true);
    setError(null);
    try {
      const hasta = new Date();
      hasta.setDate(hasta.getDate() + dias);

      let q = supabase
        .from('citas')
        .select('*')
        .gte('fecha_inicio', new Date().toISOString())
        .lte('fecha_inicio', hasta.toISOString())
        .not('estado', 'in', '("completada","cancelada")')
        .order('fecha_inicio')
        .limit(100);

      if (empresaId) q = q.eq('empresa_id', empresaId);

      const { data, error: err } = await q;
      if (err) throw err;
      setCitas((data ?? []) as Cita[]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error cargando citas');
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  const createCita = useCallback(async (draft: CitaDraft): Promise<Cita | null> => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const payload = {
        ...draft,
        empresa_id: empresaId ?? draft.empresa_id,
        created_by: userData.user?.id,
      };
      const { data, error: err } = await supabase
        .from('citas')
        .insert(payload)
        .select()
        .single();
      if (err) throw err;
      const cita = data as Cita;
      setCitas(prev => [...prev, cita].sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio)));
      return cita;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error creando cita');
      return null;
    }
  }, [empresaId]);

  const updateCita = useCallback(async (id: string, changes: Partial<CitaDraft>): Promise<boolean> => {
    try {
      const { error: err } = await supabase
        .from('citas')
        .update(changes)
        .eq('id', id);
      if (err) throw err;
      setCitas(prev => prev.map(c => c.id === id ? { ...c, ...changes } : c));
      return true;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error actualizando cita');
      return false;
    }
  }, []);

  const deleteCita = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error: err } = await supabase.from('citas').delete().eq('id', id);
      if (err) throw err;
      setCitas(prev => prev.filter(c => c.id !== id));
      return true;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error eliminando cita');
      return false;
    }
  }, []);

  const cambiarEstado = useCallback(async (id: string, estado: EstadoCita) => {
    return updateCita(id, { estado });
  }, [updateCita]);

  return {
    citas, loading, error,
    loadMes, loadProximas,
    createCita, updateCita, deleteCita, cambiarEstado,
  };
}
