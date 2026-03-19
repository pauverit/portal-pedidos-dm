import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface CuentaBancaria {
    id: string;
    empresa_id: string;
    nombre: string;
    iban: string | null;
    banco: string | null;
    moneda: string;
    saldo_actual: number;
    activa: boolean;
    created_at: string;
}

export interface MovimientoBancario {
    id: string;
    cuenta_id: string;
    empresa_id: string;
    fecha: string;
    fecha_valor: string | null;
    concepto: string;
    importe: number;
    saldo_despues: number | null;
    referencia: string | null;
    tipo: string;
    conciliado: boolean;
    asiento_id: string | null;
    factura_id: string | null;
    notas: string | null;
    // joined
    cuenta_nombre?: string;
    banco?: string;
    iban?: string;
}

export interface PosicionLiquidez {
    num_cuentas: number;
    saldo_total: number;
    movimientos_netos: number;
    cobros_pendientes: number;
    pagos_pendientes: number;
}

// ─── CSV Parser ───────────────────────────────────────────────────────────────
// Parsea extracto bancario en CSV con columnas: fecha,concepto,importe,saldo
// Compatible con el formato de Santander, BBVA, CaixaBank en España

export interface CSVMovimiento {
    fecha: string;
    concepto: string;
    importe: number;
    saldo_despues: number | null;
}

export function parseExtractoBancarioCSV(csvText: string): CSVMovimiento[] {
    const lines = csvText.trim().split('\n').filter(l => l.trim());
    if (lines.length < 2) return [];

    // Detectar separador (coma o punto y coma)
    const sep = lines[0].includes(';') ? ';' : ',';

    // Buscar fila de cabecera
    const headerIdx = lines.findIndex(l =>
        l.toLowerCase().includes('fecha') || l.toLowerCase().includes('date')
    );
    const dataLines = headerIdx >= 0 ? lines.slice(headerIdx + 1) : lines.slice(1);

    return dataLines.flatMap(line => {
        const parts = line.split(sep).map(p => p.trim().replace(/^"|"$/g, ''));
        if (parts.length < 3) return [];

        // Intentar extraer fecha (primer campo que parece fecha)
        const fechaRaw = parts[0];
        const fechaParsed = parseFechaES(fechaRaw);
        if (!fechaParsed) return [];

        const concepto = parts[1] || 'Sin concepto';
        const importeRaw = parts[2].replace(/\./g, '').replace(',', '.');
        const importe = parseFloat(importeRaw);
        if (isNaN(importe)) return [];

        const saldoRaw = parts[3]?.replace(/\./g, '').replace(',', '.');
        const saldo = saldoRaw ? parseFloat(saldoRaw) : null;

        return [{ fecha: fechaParsed, concepto, importe, saldo_despues: isNaN(saldo ?? NaN) ? null : saldo }];
    });
}

function parseFechaES(raw: string): string | null {
    // Formatos: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD
    const ddmmyyyy = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (ddmmyyyy) {
        const [, d, m, y] = ddmmyyyy;
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    const yyyymmdd = raw.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (yyyymmdd) return raw.slice(0, 10);
    return null;
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useConciliacion(empresaId: string | undefined) {
    const [cuentas, setCuentas] = useState<CuentaBancaria[]>([]);
    const [movimientos, setMovimientos] = useState<MovimientoBancario[]>([]);
    const [pendientes, setPendientes] = useState<MovimientoBancario[]>([]);
    const [liquidez, setLiquidez] = useState<PosicionLiquidez | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ─── Cargar cuentas ──────────────────────────────────────────────────────
    const loadCuentas = useCallback(async () => {
        if (!empresaId) return;
        setLoading(true);
        setError(null);
        try {
            const { data, error: err } = await supabase
                .from('cuentas_bancarias')
                .select('*')
                .eq('empresa_id', empresaId)
                .eq('activa', true)
                .order('nombre');
            if (err) throw err;
            setCuentas((data || []).map(r => ({
                id: r.id,
                empresa_id: r.empresa_id,
                nombre: r.nombre,
                iban: r.iban,
                banco: r.banco,
                moneda: r.moneda || 'EUR',
                saldo_actual: Number(r.saldo_actual) || 0,
                activa: Boolean(r.activa),
                created_at: r.created_at,
            })));
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setLoading(false);
        }
    }, [empresaId]);

    // ─── Cargar movimientos de una cuenta ────────────────────────────────────
    const loadMovimientos = useCallback(async (
        cuentaId: string,
        desde?: string,
        hasta?: string,
    ) => {
        if (!empresaId) return;
        setLoading(true);
        setError(null);
        try {
            let q = supabase
                .from('movimientos_bancarios')
                .select('*')
                .eq('cuenta_id', cuentaId)
                .order('fecha', { ascending: false })
                .limit(500);
            if (desde) q = q.gte('fecha', desde);
            if (hasta) q = q.lte('fecha', hasta);
            const { data, error: err } = await q;
            if (err) throw err;
            setMovimientos((data || []).map(mapMov));
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setLoading(false);
        }
    }, [empresaId]);

    // ─── Cargar pendientes de conciliar ──────────────────────────────────────
    const loadPendientes = useCallback(async () => {
        if (!empresaId) return;
        setLoading(true);
        setError(null);
        try {
            const { data, error: err } = await supabase
                .from('v_movimientos_pendientes')
                .select('*')
                .eq('empresa_id', empresaId)
                .order('fecha', { ascending: false })
                .limit(200);
            if (err) throw err;
            setPendientes((data || []).map(mapMov));
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setLoading(false);
        }
    }, [empresaId]);

    // ─── Posición de liquidez ────────────────────────────────────────────────
    const loadLiquidez = useCallback(async () => {
        if (!empresaId) return;
        setLoading(true);
        setError(null);
        try {
            const { data, error: err } = await supabase
                .from('v_posicion_liquidez')
                .select('*')
                .eq('empresa_id', empresaId)
                .maybeSingle();
            if (err) throw err;
            if (data) {
                setLiquidez({
                    num_cuentas: Number(data.num_cuentas) || 0,
                    saldo_total: Number(data.saldo_total) || 0,
                    movimientos_netos: Number(data.movimientos_netos) || 0,
                    cobros_pendientes: Number(data.cobros_pendientes) || 0,
                    pagos_pendientes: Number(data.pagos_pendientes) || 0,
                });
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setLoading(false);
        }
    }, [empresaId]);

    // ─── Importar extracto CSV ───────────────────────────────────────────────
    const importarCSV = useCallback(async (
        cuentaId: string,
        filas: CSVMovimiento[],
    ): Promise<number> => {
        if (!empresaId || filas.length === 0) return 0;
        setError(null);
        try {
            const rows = filas.map(f => ({
                cuenta_id: cuentaId,
                empresa_id: empresaId,
                fecha: f.fecha,
                concepto: f.concepto,
                importe: f.importe,
                saldo_despues: f.saldo_despues,
                tipo: f.importe >= 0 ? 'cobro' : 'pago',
                conciliado: false,
            }));
            const { error: err } = await supabase
                .from('movimientos_bancarios')
                .insert(rows);
            if (err) throw err;
            // Actualizar saldo
            await supabase.rpc('actualizar_saldo_cuenta', { p_cuenta_id: cuentaId });
            await loadCuentas();
            return rows.length;
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
            return 0;
        }
    }, [empresaId, loadCuentas]);

    // ─── Conciliar un movimiento ─────────────────────────────────────────────
    const conciliar = useCallback(async (
        movimientoId: string,
        asientoId?: string,
        facturaId?: string,
        notas?: string,
    ): Promise<boolean> => {
        setError(null);
        try {
            const { error: err } = await supabase.rpc('conciliar_movimiento', {
                p_movimiento_id: movimientoId,
                p_asiento_id: asientoId ?? null,
                p_factura_id: facturaId ?? null,
                p_notas: notas ?? null,
            });
            if (err) throw err;
            // Actualizar estado local
            setMovimientos(prev =>
                prev.map(m => m.id === movimientoId
                    ? { ...m, conciliado: true, asiento_id: asientoId ?? null, notas: notas ?? m.notas }
                    : m
                )
            );
            setPendientes(prev => prev.filter(m => m.id !== movimientoId));
            return true;
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
            return false;
        }
    }, []);

    // ─── Crear cuenta bancaria ───────────────────────────────────────────────
    const crearCuenta = useCallback(async (data: {
        nombre: string;
        iban?: string;
        banco?: string;
    }): Promise<boolean> => {
        if (!empresaId) return false;
        setError(null);
        try {
            const { error: err } = await supabase
                .from('cuentas_bancarias')
                .insert({ empresa_id: empresaId, ...data });
            if (err) throw err;
            await loadCuentas();
            return true;
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
            return false;
        }
    }, [empresaId, loadCuentas]);

    return {
        cuentas, movimientos, pendientes, liquidez,
        loading, error,
        loadCuentas, loadMovimientos, loadPendientes, loadLiquidez,
        importarCSV, conciliar, crearCuenta,
    };
}

// ─── Mapper ───────────────────────────────────────────────────────────────────
function mapMov(r: Record<string, unknown>): MovimientoBancario {
    return {
        id: r.id as string,
        cuenta_id: r.cuenta_id as string,
        empresa_id: r.empresa_id as string,
        fecha: r.fecha as string,
        fecha_valor: r.fecha_valor as string | null,
        concepto: r.concepto as string,
        importe: Number(r.importe) || 0,
        saldo_despues: r.saldo_despues != null ? Number(r.saldo_despues) : null,
        referencia: r.referencia as string | null,
        tipo: (r.tipo as string) || 'otro',
        conciliado: Boolean(r.conciliado),
        asiento_id: r.asiento_id as string | null,
        factura_id: r.factura_id as string | null,
        notas: r.notas as string | null,
        cuenta_nombre: r.cuenta_nombre as string | undefined,
        banco: r.banco as string | undefined,
        iban: r.iban as string | undefined,
    };
}
