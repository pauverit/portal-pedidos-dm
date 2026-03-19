import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface BalanceCuenta {
    codigo: string;
    nombre: string;
    grupo: number;
    naturaleza: string;
    tipo: string;
    saldo_deudor: number;
    saldo_acreedor: number;
    saldo_neto: number;
    bloque_balance: string;
}

export interface PYGCuenta {
    codigo: string;
    nombre: string;
    grupo: number;
    importe: number;
    tipo_resultado: 'gasto' | 'ingreso' | 'neutro';
    partida: string;
}

export interface LibroDiarioLinea {
    num_asiento: number;
    fecha: string;
    concepto_asiento: string;
    tipo: string;
    orden: number;
    cuenta: string;
    nombre_cuenta: string;
    concepto_linea: string | null;
    debe: number;
    haber: number;
}

export interface MayorMovimiento {
    cuenta: string;
    nombre_cuenta: string;
    naturaleza: string;
    fecha: string;
    num_asiento: number;
    concepto: string;
    debe: number;
    haber: number;
    saldo_acumulado: number;
}

export interface SumasSaldos {
    codigo: string;
    nombre: string;
    debe_total: number;
    haber_total: number;
    saldo_deudor: number;
    saldo_acreedor: number;
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useLibrosOficiales(empresaId: string | undefined) {
    const [balance, setBalance] = useState<BalanceCuenta[]>([]);
    const [pyg, setPyg] = useState<PYGCuenta[]>([]);
    const [diario, setDiario] = useState<LibroDiarioLinea[]>([]);
    const [mayor, setMayor] = useState<MayorMovimiento[]>([]);
    const [sumasSaldos, setSumasSaldos] = useState<SumasSaldos[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ─── Balance ──────────────────────────────────────────────────────────────
    const loadBalance = useCallback(async () => {
        if (!empresaId) return;
        setLoading(true);
        setError(null);
        try {
            const { data, error: err } = await supabase
                .from('v_balance_situacion')
                .select('*')
                .eq('empresa_id', empresaId)
                .order('codigo');
            if (err) throw err;
            setBalance((data || []).map(r => ({
                codigo: r.codigo,
                nombre: r.nombre,
                grupo: Number(r.grupo),
                naturaleza: r.naturaleza,
                tipo: r.tipo,
                saldo_deudor: Number(r.saldo_deudor) || 0,
                saldo_acreedor: Number(r.saldo_acreedor) || 0,
                saldo_neto: Number(r.saldo_neto) || 0,
                bloque_balance: r.bloque_balance || 'Otros',
            })));
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setLoading(false);
        }
    }, [empresaId]);

    // ─── P&G ──────────────────────────────────────────────────────────────────
    const loadPyG = useCallback(async () => {
        if (!empresaId) return;
        setLoading(true);
        setError(null);
        try {
            const { data, error: err } = await supabase
                .from('v_pyg')
                .select('*')
                .eq('empresa_id', empresaId)
                .order('codigo');
            if (err) throw err;
            setPyg((data || []).map(r => ({
                codigo: r.codigo,
                nombre: r.nombre,
                grupo: Number(r.grupo),
                importe: Number(r.importe) || 0,
                tipo_resultado: r.tipo_resultado as 'gasto' | 'ingreso' | 'neutro',
                partida: r.partida || 'Otros',
            })));
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setLoading(false);
        }
    }, [empresaId]);

    // ─── Libro Diario ─────────────────────────────────────────────────────────
    const loadDiario = useCallback(async (desde?: string, hasta?: string) => {
        if (!empresaId) return;
        setLoading(true);
        setError(null);
        try {
            let q = supabase
                .from('v_libro_diario')
                .select('*')
                .eq('empresa_id', empresaId)
                .order('fecha')
                .order('num_asiento')
                .order('orden')
                .limit(2000);
            if (desde) q = q.gte('fecha', desde);
            if (hasta) q = q.lte('fecha', hasta);
            const { data, error: err } = await q;
            if (err) throw err;
            setDiario((data || []).map(r => ({
                num_asiento: Number(r.num_asiento),
                fecha: r.fecha,
                concepto_asiento: r.concepto_asiento,
                tipo: r.tipo,
                orden: Number(r.orden),
                cuenta: r.cuenta,
                nombre_cuenta: r.nombre_cuenta,
                concepto_linea: r.concepto_linea,
                debe: Number(r.debe) || 0,
                haber: Number(r.haber) || 0,
            })));
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setLoading(false);
        }
    }, [empresaId]);

    // ─── Libro Mayor ─────────────────────────────────────────────────────────
    const loadMayor = useCallback(async (cuentaCodigo?: string) => {
        if (!empresaId) return;
        setLoading(true);
        setError(null);
        try {
            let q = supabase
                .from('v_libro_mayor')
                .select('*')
                .eq('empresa_id', empresaId)
                .order('cuenta')
                .order('fecha')
                .order('num_asiento')
                .limit(1000);
            if (cuentaCodigo) q = q.eq('cuenta', cuentaCodigo);
            const { data, error: err } = await q;
            if (err) throw err;
            setMayor((data || []).map(r => ({
                cuenta: r.cuenta,
                nombre_cuenta: r.nombre_cuenta,
                naturaleza: r.naturaleza,
                fecha: r.fecha,
                num_asiento: Number(r.num_asiento),
                concepto: r.concepto,
                debe: Number(r.debe) || 0,
                haber: Number(r.haber) || 0,
                saldo_acumulado: Number(r.saldo_acumulado) || 0,
            })));
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setLoading(false);
        }
    }, [empresaId]);

    // ─── Sumas y Saldos ───────────────────────────────────────────────────────
    const loadSumasSaldos = useCallback(async (ejercicio: number) => {
        if (!empresaId) return;
        setLoading(true);
        setError(null);
        try {
            const { data, error: err } = await supabase
                .from('sumas_saldos')
                .select('*')
                .eq('empresa_id', empresaId)
                .eq('ejercicio', ejercicio)
                .order('codigo');
            if (err) throw err;
            setSumasSaldos((data || []).map(r => ({
                codigo: r.codigo,
                nombre: r.nombre,
                debe_total: Number(r.debe_total) || 0,
                haber_total: Number(r.haber_total) || 0,
                saldo_deudor: Number(r.saldo_deudor) || 0,
                saldo_acreedor: Number(r.saldo_acreedor) || 0,
            })));
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setLoading(false);
        }
    }, [empresaId]);

    // ─── Regenerar sumas y saldos ────────────────────────────────────────────
    const regenerarSumasSaldos = useCallback(async (ejercicio: number): Promise<boolean> => {
        if (!empresaId) return false;
        setError(null);
        try {
            const { error: err } = await supabase.rpc('regenerar_sumas_saldos', {
                p_empresa_id: empresaId,
                p_ejercicio: ejercicio,
            });
            if (err) throw err;
            await loadSumasSaldos(ejercicio);
            return true;
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
            return false;
        }
    }, [empresaId, loadSumasSaldos]);

    return {
        balance, pyg, diario, mayor, sumasSaldos,
        loading, error,
        loadBalance, loadPyG, loadDiario, loadMayor,
        loadSumasSaldos, regenerarSumasSaldos,
    };
}
