import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Empresa, Delegacion, Almacen } from '../types';

interface EmpresaDataState {
  empresas: Empresa[];
  delegaciones: Delegacion[];
  almacenes: Almacen[];
  loading: boolean;
  error: string | null;
}

export function useEmpresaData() {
  const [state, setState] = useState<EmpresaDataState>({
    empresas: [],
    delegaciones: [],
    almacenes: [],
    loading: true,
    error: null,
  });

  const load = useCallback(async () => {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const [empRes, delRes, almRes] = await Promise.all([
        supabase.from('empresas').select('*').order('nombre'),
        supabase.from('delegaciones').select('*').order('nombre'),
        supabase.from('almacenes').select('*').order('nombre'),
      ]);

      if (empRes.error) throw new Error(empRes.error.message);
      if (delRes.error) throw new Error(delRes.error.message);
      if (almRes.error) throw new Error(almRes.error.message);

      const empresas: Empresa[] = (empRes.data || []).map(e => ({
        id: e.id,
        nombre: e.nombre,
        razonSocial: e.razon_social,
        cif: e.cif,
        direccion: e.direccion,
        cp: e.cp,
        ciudad: e.ciudad,
        provincia: e.provincia,
        telefono: e.telefono,
        email: e.email,
        web: e.web,
        iban: e.iban,
        logoUrl: e.logo_url,
        activa: e.activa,
        createdAt: e.created_at,
      }));

      const delegaciones: Delegacion[] = (delRes.data || []).map(d => ({
        id: d.id,
        empresaId: d.empresa_id,
        nombre: d.nombre,
        codigo: d.codigo,
        ciudad: d.ciudad,
        provincia: d.provincia,
        direccion: d.direccion,
        cp: d.cp,
        telefono: d.telefono,
        email: d.email,
        activa: d.activa,
        createdAt: d.created_at,
        empresaNombre: empresas.find(e => e.id === d.empresa_id)?.nombre,
      }));

      const almacenes: Almacen[] = (almRes.data || []).map(a => {
        const del = delegaciones.find(d => d.id === a.delegacion_id);
        return {
          id: a.id,
          delegacionId: a.delegacion_id,
          nombre: a.nombre,
          codigo: a.codigo,
          direccion: a.direccion,
          descripcion: a.descripcion,
          activo: a.activo,
          createdAt: a.created_at,
          delegacionNombre: del?.nombre,
          empresaNombre: del?.empresaNombre,
        };
      });

      setState({ empresas, delegaciones, almacenes, loading: false, error: null });
    } catch (err: any) {
      setState(s => ({ ...s, loading: false, error: err.message || 'Error cargando datos de empresa' }));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Mutaciones ────────────────────────────────────────────────────────────

  const updateEmpresa = async (id: string, changes: Partial<Empresa>) => {
    const dbRow: Record<string, any> = {};
    if (changes.nombre      !== undefined) dbRow.nombre       = changes.nombre;
    if (changes.razonSocial !== undefined) dbRow.razon_social = changes.razonSocial;
    if (changes.cif         !== undefined) dbRow.cif          = changes.cif;
    if (changes.direccion   !== undefined) dbRow.direccion    = changes.direccion;
    if (changes.cp          !== undefined) dbRow.cp           = changes.cp;
    if (changes.ciudad      !== undefined) dbRow.ciudad       = changes.ciudad;
    if (changes.provincia   !== undefined) dbRow.provincia    = changes.provincia;
    if (changes.telefono    !== undefined) dbRow.telefono     = changes.telefono;
    if (changes.email       !== undefined) dbRow.email        = changes.email;
    if (changes.web         !== undefined) dbRow.web          = changes.web;
    if (changes.iban        !== undefined) dbRow.iban         = changes.iban;
    if (changes.activa      !== undefined) dbRow.activa       = changes.activa;

    const { error } = await supabase.from('empresas').update(dbRow).eq('id', id);
    if (error) throw new Error(error.message);
    await load();
  };

  const updateDelegacion = async (id: string, changes: Partial<Delegacion>) => {
    const dbRow: Record<string, any> = {};
    if (changes.nombre    !== undefined) dbRow.nombre    = changes.nombre;
    if (changes.codigo    !== undefined) dbRow.codigo    = changes.codigo;
    if (changes.ciudad    !== undefined) dbRow.ciudad    = changes.ciudad;
    if (changes.provincia !== undefined) dbRow.provincia = changes.provincia;
    if (changes.direccion !== undefined) dbRow.direccion = changes.direccion;
    if (changes.cp        !== undefined) dbRow.cp        = changes.cp;
    if (changes.telefono  !== undefined) dbRow.telefono  = changes.telefono;
    if (changes.email     !== undefined) dbRow.email     = changes.email;
    if (changes.activa    !== undefined) dbRow.activa    = changes.activa;

    const { error } = await supabase.from('delegaciones').update(dbRow).eq('id', id);
    if (error) throw new Error(error.message);
    await load();
  };

  const updateAlmacen = async (id: string, changes: Partial<Almacen>) => {
    const dbRow: Record<string, any> = {};
    if (changes.nombre      !== undefined) dbRow.nombre      = changes.nombre;
    if (changes.codigo      !== undefined) dbRow.codigo      = changes.codigo;
    if (changes.direccion   !== undefined) dbRow.direccion   = changes.direccion;
    if (changes.descripcion !== undefined) dbRow.descripcion = changes.descripcion;
    if (changes.activo      !== undefined) dbRow.activo      = changes.activo;

    const { error } = await supabase.from('almacenes').update(dbRow).eq('id', id);
    if (error) throw new Error(error.message);
    await load();
  };

  return {
    ...state,
    reload: load,
    updateEmpresa,
    updateDelegacion,
    updateAlmacen,
  };
}
