import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface Mod303Linea {
    cuenta: string;
    nombre_cuenta: string;
    tipo_iva: 'repercutido' | 'soportado' | 'otro';
    tipo_pct: number | null;
    cuota_iva: number;
    base_imponible: number;
}

export interface Mod303Resumen {
    ejercicio: number;
    trimestre: number;
    total_base_repercutida: number;
    total_cuota_repercutida: number;
    total_base_soportada: number;
    total_cuota_soportada: number;
    resultado_trimestre: number;
    lineas: Mod303Linea[];
}

export interface Mod347Tercero {
    tercero_id: string | null;
    nif: string;
    nombre: string;
    email: string | null;
    tipo: 'cliente' | 'proveedor';
    importe_total: number;
    supera_umbral: boolean;
}

export interface Mod190Perceptor {
    perceptor_id: string;
    nif_perceptor: string;
    nombre_perceptor: string;
    clave_percepcion: string;
    importe_integro: number;
    retencion_total: number;
    cuota_ss: number;
    importe_neto: number;
}

export interface Mod190Resumen {
    ejercicio: number;
    num_perceptores: number;
    total_importe_integro: number;
    total_retenciones: number;
    total_cuota_ss: number;
    total_importe_neto: number;
    perceptores: Mod190Perceptor[];
}

export type ModeloFiscal = '303' | '347' | '190';

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useImpresosFiscales(empresaId: string | undefined) {
    const [mod303, setMod303] = useState<Mod303Resumen[]>([]);
    const [mod347, setMod347] = useState<Mod347Tercero[]>([]);
    const [mod190, setMod190] = useState<Mod190Resumen[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ─── Modelo 303 ───────────────────────────────────────────────────────────
    const loadMod303 = useCallback(async (ejercicio: number) => {
        if (!empresaId) return;
        setLoading(true);
        setError(null);
        try {
            // Cargar resumen por trimestre
            const { data: resData, error: resErr } = await supabase
                .from('v_modelo_303_resumen')
                .select('*')
                .eq('empresa_id', empresaId)
                .eq('ejercicio', ejercicio)
                .order('trimestre');
            if (resErr) throw resErr;

            // Cargar detalle de líneas
            const { data: linData, error: linErr } = await supabase
                .from('v_modelo_303')
                .select('*')
                .eq('empresa_id', empresaId)
                .eq('ejercicio', ejercicio)
                .order('trimestre')
                .order('cuenta');
            if (linErr) throw linErr;

            const result: Mod303Resumen[] = (resData || []).map((r) => ({
                ejercicio: r.ejercicio,
                trimestre: r.trimestre,
                total_base_repercutida: Number(r.total_base_repercutida) || 0,
                total_cuota_repercutida: Number(r.total_cuota_repercutida) || 0,
                total_base_soportada: Number(r.total_base_soportada) || 0,
                total_cuota_soportada: Number(r.total_cuota_soportada) || 0,
                resultado_trimestre: Number(r.resultado_trimestre) || 0,
                lineas: (linData || [])
                    .filter(l => l.trimestre === r.trimestre)
                    .map(l => ({
                        cuenta: l.cuenta,
                        nombre_cuenta: l.nombre_cuenta,
                        tipo_iva: l.tipo_iva as 'repercutido' | 'soportado' | 'otro',
                        tipo_pct: l.tipo_pct ? Number(l.tipo_pct) : null,
                        cuota_iva: Number(l.cuota_iva) || 0,
                        base_imponible: Number(l.base_imponible) || 0,
                    })),
            }));
            setMod303(result);
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setLoading(false);
        }
    }, [empresaId]);

    // ─── Modelo 347 ───────────────────────────────────────────────────────────
    const loadMod347 = useCallback(async (ejercicio: number) => {
        if (!empresaId) return;
        setLoading(true);
        setError(null);
        try {
            const { data, error: err } = await supabase
                .from('v_modelo_347')
                .select('*')
                .eq('empresa_id', empresaId)
                .eq('ejercicio', ejercicio)
                .order('importe_total', { ascending: false });
            if (err) throw err;
            setMod347((data || []).map(r => ({
                tercero_id: r.tercero_id,
                nif: r.nif || '',
                nombre: r.nombre || '',
                email: r.email,
                tipo: r.tipo as 'cliente' | 'proveedor',
                importe_total: Number(r.importe_total) || 0,
                supera_umbral: Boolean(r.supera_umbral),
            })));
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setLoading(false);
        }
    }, [empresaId]);

    // ─── Modelo 190 ───────────────────────────────────────────────────────────
    const loadMod190 = useCallback(async (ejercicio: number) => {
        if (!empresaId) return;
        setLoading(true);
        setError(null);
        try {
            const { data: resData, error: resErr } = await supabase
                .from('v_modelo_190_resumen')
                .select('*')
                .eq('empresa_id', empresaId)
                .eq('ejercicio', ejercicio);
            if (resErr) throw resErr;

            const { data: perData, error: perErr } = await supabase
                .from('v_modelo_190')
                .select('*')
                .eq('empresa_id', empresaId)
                .eq('ejercicio', ejercicio)
                .order('nombre_perceptor');
            if (perErr) throw perErr;

            const result: Mod190Resumen[] = (resData || []).map(r => ({
                ejercicio: r.ejercicio,
                num_perceptores: Number(r.num_perceptores) || 0,
                total_importe_integro: Number(r.total_importe_integro) || 0,
                total_retenciones: Number(r.total_retenciones) || 0,
                total_cuota_ss: Number(r.total_cuota_ss) || 0,
                total_importe_neto: Number(r.total_importe_neto) || 0,
                perceptores: (perData || [])
                    .filter(p => p.ejercicio === r.ejercicio)
                    .map(p => ({
                        perceptor_id: p.perceptor_id,
                        nif_perceptor: p.nif_perceptor || '',
                        nombre_perceptor: p.nombre_perceptor || '',
                        clave_percepcion: p.clave_percepcion || '01',
                        importe_integro: Number(p.importe_integro) || 0,
                        retencion_total: Number(p.retencion_total) || 0,
                        cuota_ss: Number(p.cuota_ss) || 0,
                        importe_neto: Number(p.importe_neto) || 0,
                    })),
            }));
            setMod190(result);
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setLoading(false);
        }
    }, [empresaId]);

    return {
        mod303, mod347, mod190,
        loading, error,
        loadMod303, loadMod347, loadMod190,
    };
}
