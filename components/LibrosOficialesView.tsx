import React, { useState, useEffect, useMemo } from 'react';
import {
    BookOpen, RefreshCw, AlertCircle, Search, Download,
    ChevronDown, ChevronRight, TrendingUp, TrendingDown,
} from 'lucide-react';
import { ModuleHeader } from './ModuleHeader';
import {
    useLibrosOficiales,
    BalanceCuenta,
    PYGCuenta,
    LibroDiarioLinea,
    MayorMovimiento,
} from '../hooks/useLibrosOficiales';

// ─── Helpers ───────────────────────────────────────────────────────────────────

const fmtEur = (n: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

const fmtDate = (s: string) =>
    new Date(s + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

const currentYear = new Date().getFullYear();

// ─── Balance de Situación ─────────────────────────────────────────────────────

const BalancePanel: React.FC<{ data: BalanceCuenta[] }> = ({ data }) => {
    const [openBlocks, setOpenBlocks] = useState<Set<string>>(new Set([
        'Activo No Corriente', 'Activo Corriente', 'Activo Corriente — Tesorería',
        'Patrimonio Neto', 'Pasivo No Corriente', 'Pasivo Corriente',
    ]));

    const toggleBlock = (b: string) =>
        setOpenBlocks(prev => {
            const next = new Set(prev);
            next.has(b) ? next.delete(b) : next.add(b);
            return next;
        });

    // Agrupar por bloque
    const byBloque = useMemo(() => {
        const map = new Map<string, BalanceCuenta[]>();
        for (const c of data) {
            if (!map.has(c.bloque_balance)) map.set(c.bloque_balance, []);
            map.get(c.bloque_balance)!.push(c);
        }
        return map;
    }, [data]);

    const ACTIVO_BLOQUES  = ['Activo No Corriente', 'Activo Corriente', 'Activo Corriente — Tesorería', 'Otros'];
    const PASIVO_BLOQUES  = ['Patrimonio Neto', 'Pasivo No Corriente', 'Pasivo Corriente'];

    const totalActivo  = data.filter(c => ACTIVO_BLOQUES.includes(c.bloque_balance)).reduce((s, c) => s + c.saldo_neto, 0);
    const totalPasivo  = data.filter(c => PASIVO_BLOQUES.includes(c.bloque_balance)).reduce((s, c) => s + c.saldo_neto, 0);

    if (data.length === 0) {
        return (
            <div className="flex items-center gap-2 text-slate-400 text-sm p-8 justify-center">
                <AlertCircle size={16} />
                <span>No hay asientos confirmados para generar el Balance.</span>
            </div>
        );
    }

    const renderBloque = (bloque: string) => {
        const items = byBloque.get(bloque);
        if (!items || items.length === 0) return null;
        const total = items.reduce((s, c) => s + c.saldo_neto, 0);
        const isOpen = openBlocks.has(bloque);
        return (
            <div key={bloque} className="border border-slate-200 rounded-xl overflow-hidden">
                <button
                    onClick={() => toggleBlock(bloque)}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                >
                    <div className="flex items-center gap-2">
                        {isOpen ? <ChevronDown size={13} className="text-slate-400" /> : <ChevronRight size={13} className="text-slate-400" />}
                        <span className="font-semibold text-sm text-slate-700">{bloque}</span>
                    </div>
                    <span className="text-sm font-bold text-slate-800">{fmtEur(total)}</span>
                </button>
                {isOpen && (
                    <table className="w-full text-xs">
                        <tbody>
                            {items.map(c => (
                                <tr key={c.codigo} className="border-t border-slate-50 hover:bg-slate-50/40">
                                    <td className="px-4 py-1.5 font-mono text-slate-500 w-24">{c.codigo}</td>
                                    <td className="px-2 py-1.5 text-slate-600">{c.nombre}</td>
                                    <td className="px-4 py-1.5 text-right font-medium text-slate-700">{fmtEur(c.saldo_neto)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        );
    };

    return (
        <div className="p-4 space-y-4">
            {/* Cuadro resumen */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
                    <div className="text-xs font-medium text-blue-600 mb-1">ACTIVO TOTAL</div>
                    <div className="text-xl font-bold text-blue-800">{fmtEur(totalActivo)}</div>
                </div>
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-center">
                    <div className="text-xs font-medium text-indigo-600 mb-1">PASIVO + PATRIMONIO</div>
                    <div className="text-xl font-bold text-indigo-800">{fmtEur(totalPasivo)}</div>
                </div>
            </div>

            {/* ACTIVO */}
            <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">Activo</div>
                <div className="space-y-1.5">
                    {ACTIVO_BLOQUES.map(b => renderBloque(b))}
                </div>
            </div>

            {/* PASIVO + PN */}
            <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">Pasivo y Patrimonio Neto</div>
                <div className="space-y-1.5">
                    {PASIVO_BLOQUES.map(b => renderBloque(b))}
                </div>
            </div>
        </div>
    );
};

// ─── P&G Panel ────────────────────────────────────────────────────────────────

const PYGPanel: React.FC<{ data: PYGCuenta[] }> = ({ data }) => {
    const [openPartidas, setOpenPartidas] = useState<Set<string>>(new Set());

    const togglePartida = (p: string) =>
        setOpenPartidas(prev => {
            const next = new Set(prev);
            next.has(p) ? next.delete(p) : next.add(p);
            return next;
        });

    const byPartida = useMemo(() => {
        const map = new Map<string, PYGCuenta[]>();
        for (const c of data) {
            if (!map.has(c.partida)) map.set(c.partida, []);
            map.get(c.partida)!.push(c);
        }
        return map;
    }, [data]);

    const totalIngresos = data.filter(c => c.tipo_resultado === 'ingreso').reduce((s, c) => s + c.importe, 0);
    const totalGastos   = data.filter(c => c.tipo_resultado === 'gasto').reduce((s, c) => s + c.importe, 0);
    const resultado     = totalIngresos - totalGastos;

    if (data.length === 0) {
        return (
            <div className="flex items-center gap-2 text-slate-400 text-sm p-8 justify-center">
                <AlertCircle size={16} />
                <span>No hay datos de ingresos ni gastos confirmados.</span>
            </div>
        );
    }

    const partidas = Array.from(byPartida.keys());
    const ingresoPartidas = partidas.filter(p => byPartida.get(p)!.some(c => c.tipo_resultado === 'ingreso'));
    const gastoPartidas   = partidas.filter(p => byPartida.get(p)!.some(c => c.tipo_resultado === 'gasto'));

    const renderPartida = (partida: string) => {
        const items = byPartida.get(partida) ?? [];
        const total = items.reduce((s, c) => s + c.importe, 0);
        const isOpen = openPartidas.has(partida);
        const esIngreso = items.some(c => c.tipo_resultado === 'ingreso');
        return (
            <div key={partida} className="border border-slate-200 rounded-xl overflow-hidden">
                <button
                    onClick={() => togglePartida(partida)}
                    className="w-full flex items-center justify-between px-4 py-2 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                >
                    <div className="flex items-center gap-2">
                        {isOpen ? <ChevronDown size={13} className="text-slate-400" /> : <ChevronRight size={13} className="text-slate-400" />}
                        <span className="text-sm text-slate-700">{partida}</span>
                    </div>
                    <span className={`text-sm font-bold ${esIngreso ? 'text-green-700' : 'text-red-600'}`}>
                        {esIngreso ? '+' : '-'}{fmtEur(total)}
                    </span>
                </button>
                {isOpen && (
                    <table className="w-full text-xs">
                        <tbody>
                            {items.map(c => (
                                <tr key={c.codigo} className="border-t border-slate-50 hover:bg-slate-50/40">
                                    <td className="px-4 py-1.5 font-mono text-slate-500 w-24">{c.codigo}</td>
                                    <td className="px-2 py-1.5 text-slate-600">{c.nombre}</td>
                                    <td className={`px-4 py-1.5 text-right font-medium ${esIngreso ? 'text-green-700' : 'text-red-600'}`}>
                                        {fmtEur(c.importe)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        );
    };

    return (
        <div className="p-4 space-y-4">
            {/* KPIs resultado */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                    <div className="text-xs font-medium text-green-600 mb-1">Ingresos de explotación</div>
                    <div className="text-lg font-bold text-green-800">{fmtEur(totalIngresos)}</div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                    <div className="text-xs font-medium text-red-600 mb-1">Gastos totales</div>
                    <div className="text-lg font-bold text-red-800">{fmtEur(totalGastos)}</div>
                </div>
                <div className={`border rounded-xl p-3 text-center ${resultado >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
                    <div className={`text-xs font-medium mb-1 ${resultado >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                        {resultado >= 0 ? 'Beneficio del ejercicio' : 'Pérdida del ejercicio'}
                    </div>
                    <div className={`text-lg font-bold flex items-center justify-center gap-1 ${resultado >= 0 ? 'text-blue-800' : 'text-orange-800'}`}>
                        {resultado >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                        {fmtEur(Math.abs(resultado))}
                    </div>
                </div>
            </div>

            {/* Ingresos */}
            <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">Ingresos</div>
                <div className="space-y-1.5">{ingresoPartidas.map(renderPartida)}</div>
            </div>

            {/* Gastos */}
            <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">Gastos</div>
                <div className="space-y-1.5">{gastoPartidas.map(renderPartida)}</div>
            </div>
        </div>
    );
};

// ─── Libro Diario Panel ───────────────────────────────────────────────────────

const LibroDiarioPanel: React.FC<{
    data: LibroDiarioLinea[];
    desde: string; hasta: string;
    onDesde: (v: string) => void; onHasta: (v: string) => void;
    onLoad: () => void;
}> = ({ data, desde, hasta, onDesde, onHasta, onLoad }) => {
    // Agrupar líneas por asiento
    const asientos = useMemo(() => {
        const map = new Map<number, LibroDiarioLinea[]>();
        for (const l of data) {
            if (!map.has(l.num_asiento)) map.set(l.num_asiento, []);
            map.get(l.num_asiento)!.push(l);
        }
        return Array.from(map.entries()).map(([num, lineas]) => ({ num, lineas }));
    }, [data]);

    return (
        <div className="p-4 space-y-3">
            {/* Filtros fecha */}
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-500">Desde:</label>
                    <input type="date" value={desde} onChange={e => onDesde(e.target.value)}
                        className="border border-slate-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-500">Hasta:</label>
                    <input type="date" value={hasta} onChange={e => onHasta(e.target.value)}
                        className="border border-slate-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                <button onClick={onLoad}
                    className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700">
                    Filtrar
                </button>
            </div>

            {asientos.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">No hay asientos en el período.</div>
            ) : (
                <div className="space-y-2">
                    {asientos.map(({ num, lineas }) => {
                        const first = lineas[0];
                        const totalDebe  = lineas.reduce((s, l) => s + l.debe, 0);
                        const totalHaber = lineas.reduce((s, l) => s + l.haber, 0);
                        return (
                            <div key={num} className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                                <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono font-bold text-slate-600">#{num}</span>
                                        <span className="text-slate-500">{fmtDate(first.fecha)}</span>
                                        <span className="text-slate-700 font-medium">{first.concepto_asiento}</span>
                                    </div>
                                    <span className="text-[10px] px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded">{first.tipo}</span>
                                </div>
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-slate-50/50">
                                            <th className="text-left px-3 py-1.5 text-slate-400 font-medium w-24">Cuenta</th>
                                            <th className="text-left px-3 py-1.5 text-slate-400 font-medium">Descripción</th>
                                            <th className="text-right px-3 py-1.5 text-slate-400 font-medium w-28">Debe</th>
                                            <th className="text-right px-3 py-1.5 text-slate-400 font-medium w-28">Haber</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {lineas.map((l, i) => (
                                            <tr key={i} className="border-t border-slate-50 hover:bg-slate-50/30">
                                                <td className="px-3 py-1.5 font-mono text-slate-500">{l.cuenta}</td>
                                                <td className="px-3 py-1.5 text-slate-600">{l.nombre_cuenta}{l.concepto_linea ? ` — ${l.concepto_linea}` : ''}</td>
                                                <td className="px-3 py-1.5 text-right text-slate-700">{l.debe > 0 ? fmtEur(l.debe) : ''}</td>
                                                <td className="px-3 py-1.5 text-right text-slate-700">{l.haber > 0 ? fmtEur(l.haber) : ''}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t-2 border-slate-200 bg-slate-50/50">
                                            <td colSpan={2} className="px-3 py-1.5 text-[11px] font-semibold text-slate-500">Totales</td>
                                            <td className="px-3 py-1.5 text-right text-[11px] font-bold text-slate-700">{fmtEur(totalDebe)}</td>
                                            <td className="px-3 py-1.5 text-right text-[11px] font-bold text-slate-700">{fmtEur(totalHaber)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

// ─── Libro Mayor Panel ────────────────────────────────────────────────────────

const LibroMayorPanel: React.FC<{
    data: MayorMovimiento[];
    onLoadCuenta: (codigo: string) => void;
}> = ({ data, onLoadCuenta }) => {
    const [query, setQuery] = useState('');
    const [buscado, setBuscado] = useState('');

    const handleBuscar = () => {
        if (query.trim()) {
            onLoadCuenta(query.trim());
            setBuscado(query.trim());
        }
    };

    // Cuentas únicas en los datos cargados
    const cuentas = useMemo(() => {
        const seen = new Set<string>();
        const list: { codigo: string; nombre: string }[] = [];
        for (const m of data) {
            if (!seen.has(m.cuenta)) {
                seen.add(m.cuenta);
                list.push({ codigo: m.cuenta, nombre: m.nombre_cuenta });
            }
        }
        return list;
    }, [data]);

    const [activaCuenta, setActivaCuenta] = useState<string | null>(null);

    const movCuenta = useMemo(() =>
        data.filter(m => !activaCuenta || m.cuenta === activaCuenta),
    [data, activaCuenta]);

    return (
        <div className="p-4 space-y-3">
            {/* Búsqueda por código */}
            <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleBuscar()}
                        placeholder="Código de cuenta (ej: 430, 700…)"
                        className="w-full border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                </div>
                <button onClick={handleBuscar}
                    className="px-3 py-2 bg-indigo-600 text-white rounded-xl text-xs font-medium hover:bg-indigo-700">
                    Ver ficha
                </button>
                <button onClick={() => { setQuery(''); setBuscado(''); onLoadCuenta(''); setActivaCuenta(null); }}
                    className="px-3 py-2 border border-slate-200 text-slate-500 rounded-xl text-xs hover:bg-slate-50">
                    Todas
                </button>
            </div>

            {/* Chips de cuentas cargadas */}
            {cuentas.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    <button
                        onClick={() => setActivaCuenta(null)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${!activaCuenta ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                        Todas ({cuentas.length})
                    </button>
                    {cuentas.map(c => (
                        <button key={c.codigo}
                            onClick={() => setActivaCuenta(c.codigo)}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${activaCuenta === c.codigo ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                            {c.codigo} — {c.nombre}
                        </button>
                    ))}
                </div>
            )}

            {movCuenta.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                    Introduce un código de cuenta y pulsa "Ver ficha".
                </div>
            ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="text-left px-3 py-2 text-slate-500 font-medium">Fecha</th>
                                <th className="text-left px-3 py-2 text-slate-500 font-medium">Nº Asiento</th>
                                <th className="text-left px-3 py-2 text-slate-500 font-medium">Concepto</th>
                                <th className="text-right px-3 py-2 text-slate-500 font-medium">Debe</th>
                                <th className="text-right px-3 py-2 text-slate-500 font-medium">Haber</th>
                                <th className="text-right px-3 py-2 text-slate-500 font-medium">Saldo</th>
                            </tr>
                        </thead>
                        <tbody>
                            {movCuenta.map((m, i) => (
                                <tr key={i} className="border-t border-slate-50 hover:bg-slate-50/60">
                                    <td className="px-3 py-1.5 text-slate-500 whitespace-nowrap">{fmtDate(m.fecha)}</td>
                                    <td className="px-3 py-1.5 font-mono text-slate-500">#{m.num_asiento}</td>
                                    <td className="px-3 py-1.5 text-slate-700 max-w-[200px] truncate">{m.concepto}</td>
                                    <td className="px-3 py-1.5 text-right text-slate-700">{m.debe > 0 ? fmtEur(m.debe) : ''}</td>
                                    <td className="px-3 py-1.5 text-right text-slate-700">{m.haber > 0 ? fmtEur(m.haber) : ''}</td>
                                    <td className={`px-3 py-1.5 text-right font-semibold ${m.saldo_acumulado >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
                                        {fmtEur(m.saldo_acumulado)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

// ─── Main View ────────────────────────────────────────────────────────────────

interface Props { empresaId: string; }

type ActiveTab = 'balance' | 'pyg' | 'diario' | 'mayor';

export const LibrosOficialesView: React.FC<Props> = ({ empresaId }) => {
    const [tab, setTab] = useState<ActiveTab>('balance');
    const [ejercicio, setEjercicio] = useState(currentYear);
    const [diarioDe, setDiarioDe] = useState(`${currentYear}-01-01`);
    const [diarioA, setDiarioA] = useState(`${currentYear}-12-31`);

    const {
        balance, pyg, diario, mayor,
        loading, error,
        loadBalance, loadPyG, loadDiario, loadMayor,
    } = useLibrosOficiales(empresaId);

    useEffect(() => {
        if (!empresaId) return;
        if (tab === 'balance') loadBalance();
        else if (tab === 'pyg')    loadPyG();
        else if (tab === 'diario') loadDiario(diarioDe, diarioA);
        else if (tab === 'mayor')  loadMayor();
    }, [tab, empresaId, ejercicio]);

    const TABS: { id: ActiveTab; label: string }[] = [
        { id: 'balance', label: 'Balance de Situación' },
        { id: 'pyg',     label: 'Pérdidas y Ganancias' },
        { id: 'diario',  label: 'Libro Diario' },
        { id: 'mayor',   label: 'Libro Mayor' },
    ];

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <ModuleHeader
                icon={BookOpen}
                title="Libros Oficiales"
                subtitle="Balance · P&G · Libro Diario · Libro Mayor"
                color="indigo"
                actions={
                    <div className="flex items-center gap-2">
                        <select
                            value={ejercicio}
                            onChange={e => setEjercicio(Number(e.target.value))}
                            className="text-xs bg-indigo-900/40 text-white border-0 rounded-lg px-2 py-1.5 focus:outline-none cursor-pointer"
                        >
                            {[currentYear, currentYear - 1, currentYear - 2].map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                        <button
                            onClick={() => {
                                if (tab === 'balance') loadBalance();
                                else if (tab === 'pyg') loadPyG();
                                else if (tab === 'diario') loadDiario(diarioDe, diarioA);
                                else if (tab === 'mayor') loadMayor();
                            }}
                            disabled={loading}
                            className="p-1.5 bg-indigo-900/40 text-white/70 hover:text-white rounded-lg"
                        >
                            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        </button>
                        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-900/40 text-white/70 hover:text-white text-xs rounded-lg transition-colors">
                            <Download size={13} />
                            PDF
                        </button>
                    </div>
                }
            />

            {/* Tabs */}
            <div className="flex border-b border-slate-200 bg-white px-4 gap-1 shrink-0">
                {TABS.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                            tab === t.id
                                ? 'border-indigo-600 text-indigo-700'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {error && (
                    <div className="m-4 flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                        <AlertCircle size={16} />
                        <span>{error}</span>
                    </div>
                )}
                {loading && (
                    <div className="flex items-center justify-center py-16">
                        <RefreshCw size={20} className="animate-spin text-indigo-400" />
                        <span className="ml-2 text-slate-400 text-sm">Cargando libros contables…</span>
                    </div>
                )}
                {!loading && (
                    <>
                        {tab === 'balance' && <BalancePanel data={balance} />}
                        {tab === 'pyg'     && <PYGPanel data={pyg} />}
                        {tab === 'diario'  && (
                            <LibroDiarioPanel
                                data={diario}
                                desde={diarioDe} hasta={diarioA}
                                onDesde={setDiarioDe} onHasta={setDiarioA}
                                onLoad={() => loadDiario(diarioDe, diarioA)}
                            />
                        )}
                        {tab === 'mayor'   && (
                            <LibroMayorPanel
                                data={mayor}
                                onLoadCuenta={(cod) => cod ? loadMayor(cod) : loadMayor()}
                            />
                        )}
                    </>
                )}
            </div>
        </div>
    );
};
