import React, { useState, useEffect } from 'react';
import {
    FileText, ChevronDown, ChevronRight, AlertCircle,
    Download, RefreshCw, TrendingUp, TrendingDown, Minus,
    Users, Building2,
} from 'lucide-react';
import { ModuleHeader } from './ModuleHeader';
import {
    useImpresosFiscales,
    ModeloFiscal,
    Mod303Resumen,
    Mod347Tercero,
    Mod190Resumen,
} from '../hooks/useImpresosFiscales';

// ─── Helpers ───────────────────────────────────────────────────────────────────

const fmtEur = (n: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

const fmtNum = (n: number) =>
    new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const TRIMESTRE_LABEL = ['1T (Ene-Mar)', '2T (Abr-Jun)', '3T (Jul-Sep)', '4T (Oct-Dic)'];

const currentYear = new Date().getFullYear();
const EJERCICIOS = [currentYear, currentYear - 1, currentYear - 2];

// ─── Sub-components ───────────────────────────────────────────────────────────

const KpiCard: React.FC<{
    label: string;
    value: string;
    sub?: string;
    color?: 'green' | 'red' | 'indigo' | 'slate';
}> = ({ label, value, sub, color = 'slate' }) => {
    const colors: Record<string, string> = {
        green:  'text-green-700 bg-green-50 border-green-200',
        red:    'text-red-700 bg-red-50 border-red-200',
        indigo: 'text-indigo-700 bg-indigo-50 border-indigo-200',
        slate:  'text-slate-700 bg-slate-50 border-slate-200',
    };
    return (
        <div className={`border rounded-xl p-3 ${colors[color]}`}>
            <div className="text-[11px] font-medium opacity-60 mb-0.5">{label}</div>
            <div className="text-lg font-bold">{value}</div>
            {sub && <div className="text-[11px] opacity-50 mt-0.5">{sub}</div>}
        </div>
    );
};

// ─── Modelo 303 ───────────────────────────────────────────────────────────────

const Mod303Panel: React.FC<{ data: Mod303Resumen[] }> = ({ data }) => {
    const [openQ, setOpenQ] = useState<number | null>(null);

    const totalRepercutido = data.reduce((s, r) => s + r.total_cuota_repercutida, 0);
    const totalSoportado   = data.reduce((s, r) => s + r.total_cuota_soportada, 0);
    const totalResultado   = data.reduce((s, r) => s + r.resultado_trimestre, 0);

    if (data.length === 0) {
        return (
            <div className="flex items-center gap-2 text-slate-400 text-sm p-6 justify-center">
                <AlertCircle size={16} />
                <span>No hay datos contables de IVA para el ejercicio seleccionado.</span>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* KPIs resumen anuales */}
            <div className="grid grid-cols-3 gap-3 px-4 py-3">
                <KpiCard
                    label="IVA Repercutido (año)"
                    value={fmtEur(totalRepercutido)}
                    color="green"
                />
                <KpiCard
                    label="IVA Deducible (año)"
                    value={fmtEur(totalSoportado)}
                    color="indigo"
                />
                <KpiCard
                    label="Resultado anual"
                    value={fmtEur(totalResultado)}
                    color={totalResultado >= 0 ? 'red' : 'green'}
                    sub={totalResultado >= 0 ? 'A ingresar' : 'A compensar'}
                />
            </div>

            {/* Detalle por trimestre */}
            <div className="px-4 space-y-2">
                {data.map(t => {
                    const isOpen = openQ === t.trimestre;
                    return (
                        <div key={t.trimestre} className="border border-slate-200 rounded-xl overflow-hidden">
                            <button
                                onClick={() => setOpenQ(isOpen ? null : t.trimestre)}
                                className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                            >
                                <div className="flex items-center gap-3">
                                    {isOpen ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                                    <span className="font-semibold text-sm text-slate-700">
                                        {TRIMESTRE_LABEL[t.trimestre - 1] ?? `T${t.trimestre}`}
                                    </span>
                                </div>
                                <div className="flex items-center gap-6 text-sm">
                                    <span className="text-slate-500">
                                        Rep: <span className="font-semibold text-green-700">{fmtEur(t.total_cuota_repercutida)}</span>
                                    </span>
                                    <span className="text-slate-500">
                                        Ded: <span className="font-semibold text-indigo-700">{fmtEur(t.total_cuota_soportada)}</span>
                                    </span>
                                    <div className={`flex items-center gap-1 font-bold text-sm ${t.resultado_trimestre >= 0 ? 'text-red-600' : 'text-green-700'}`}>
                                        {t.resultado_trimestre > 0 ? <TrendingUp size={14} /> : t.resultado_trimestre < 0 ? <TrendingDown size={14} /> : <Minus size={14} />}
                                        {fmtEur(Math.abs(t.resultado_trimestre))}
                                        <span className="font-normal text-[11px]">
                                            {t.resultado_trimestre >= 0 ? 'a ingresar' : 'a compensar'}
                                        </span>
                                    </div>
                                </div>
                            </button>

                            {isOpen && t.lineas.length > 0 && (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="bg-slate-50 border-t border-slate-100">
                                                <th className="text-left px-4 py-2 text-slate-500 font-medium">Cuenta</th>
                                                <th className="text-left px-4 py-2 text-slate-500 font-medium">Descripción</th>
                                                <th className="text-right px-4 py-2 text-slate-500 font-medium">Tipo %</th>
                                                <th className="text-right px-4 py-2 text-slate-500 font-medium">Base Imponible</th>
                                                <th className="text-right px-4 py-2 text-slate-500 font-medium">Cuota IVA</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {t.lineas.map((l, i) => (
                                                <tr key={i} className="border-t border-slate-50 hover:bg-slate-50/50">
                                                    <td className="px-4 py-2 font-mono text-slate-600">{l.cuenta}</td>
                                                    <td className="px-4 py-2 text-slate-600">{l.nombre_cuenta}</td>
                                                    <td className="px-4 py-2 text-right">
                                                        {l.tipo_pct != null
                                                            ? <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded font-medium">{l.tipo_pct}%</span>
                                                            : <span className="text-slate-400">—</span>
                                                        }
                                                    </td>
                                                    <td className="px-4 py-2 text-right font-medium text-slate-700">{fmtEur(l.base_imponible)}</td>
                                                    <td className={`px-4 py-2 text-right font-semibold ${l.tipo_iva === 'repercutido' ? 'text-green-700' : 'text-indigo-700'}`}>
                                                        {fmtEur(Math.abs(l.cuota_iva))}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// ─── Modelo 347 ───────────────────────────────────────────────────────────────

const Mod347Panel: React.FC<{ data: Mod347Tercero[] }> = ({ data }) => {
    const clientes   = data.filter(d => d.tipo === 'cliente');
    const proveedores = data.filter(d => d.tipo === 'proveedor');

    if (data.length === 0) {
        return (
            <div className="flex items-center gap-2 text-slate-400 text-sm p-6 justify-center">
                <AlertCircle size={16} />
                <span>No hay operaciones que superen los 3.005,06 € anuales.</span>
            </div>
        );
    }

    const TableBlock: React.FC<{ title: string; icon: React.ReactNode; rows: Mod347Tercero[] }> = ({ title, icon, rows }) => (
        <div className="px-4">
            <div className="flex items-center gap-2 mb-2">
                {icon}
                <span className="font-semibold text-sm text-slate-700">{title}</span>
                <span className="ml-auto text-xs text-slate-400">{rows.length} declarados</span>
            </div>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="bg-slate-50">
                            <th className="text-left px-4 py-2 text-slate-500 font-medium">NIF / ID</th>
                            <th className="text-left px-4 py-2 text-slate-500 font-medium">Nombre / Razón Social</th>
                            <th className="text-right px-4 py-2 text-slate-500 font-medium">Importe Total (€ IVA inc.)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r, i) => (
                            <tr key={i} className="border-t border-slate-50 hover:bg-slate-50/50">
                                <td className="px-4 py-2 font-mono text-slate-500">{r.nif || '—'}</td>
                                <td className="px-4 py-2 text-slate-700 font-medium">{r.nombre}</td>
                                <td className="px-4 py-2 text-right font-semibold text-slate-800">{fmtEur(r.importe_total)}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="border-t-2 border-slate-200 bg-slate-50">
                            <td colSpan={2} className="px-4 py-2 text-xs font-semibold text-slate-600">Total declarado</td>
                            <td className="px-4 py-2 text-right text-sm font-bold text-slate-800">
                                {fmtEur(rows.reduce((s, r) => s + r.importe_total, 0))}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );

    return (
        <div className="space-y-5 py-3">
            {/* KPIs */}
            <div className="grid grid-cols-2 gap-3 px-4">
                <KpiCard label="Clientes declarados" value={String(clientes.length)} color="green" sub="Ventas > 3.005,06 €/año" />
                <KpiCard label="Proveedores declarados" value={String(proveedores.length)} color="indigo" sub="Compras > 3.005,06 €/año" />
            </div>
            {clientes.length > 0 && (
                <TableBlock
                    title="Clientes (ventas)"
                    icon={<Users size={14} className="text-green-600" />}
                    rows={clientes}
                />
            )}
            {proveedores.length > 0 && (
                <TableBlock
                    title="Proveedores (compras)"
                    icon={<Building2 size={14} className="text-indigo-600" />}
                    rows={proveedores}
                />
            )}
        </div>
    );
};

// ─── Modelo 190 ───────────────────────────────────────────────────────────────

const Mod190Panel: React.FC<{ data: Mod190Resumen[] }> = ({ data }) => {
    const [openY, setOpenY] = useState<number | null>(null);

    if (data.length === 0) {
        return (
            <div className="flex items-center gap-2 text-slate-400 text-sm p-6 justify-center">
                <AlertCircle size={16} />
                <span>No hay nóminas registradas para el ejercicio. Verifica que la tabla nominas está activa.</span>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {data.map(r => {
                const isOpen = openY === r.ejercicio;
                return (
                    <div key={r.ejercicio} className="border border-slate-200 rounded-xl overflow-hidden mx-4">
                        <button
                            onClick={() => setOpenY(isOpen ? null : r.ejercicio)}
                            className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                        >
                            <div className="flex items-center gap-3">
                                {isOpen ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                                <span className="font-semibold text-sm text-slate-700">Ejercicio {r.ejercicio}</span>
                                <span className="text-xs text-slate-400">{r.num_perceptores} perceptores</span>
                            </div>
                            <div className="flex items-center gap-5 text-sm">
                                <span className="text-slate-500">
                                    Bruto: <span className="font-semibold text-slate-700">{fmtEur(r.total_importe_integro)}</span>
                                </span>
                                <span className="text-slate-500">
                                    IRPF: <span className="font-semibold text-red-600">{fmtEur(r.total_retenciones)}</span>
                                </span>
                                <span className="text-slate-500">
                                    Neto: <span className="font-semibold text-green-700">{fmtEur(r.total_importe_neto)}</span>
                                </span>
                            </div>
                        </button>

                        {isOpen && r.perceptores.length > 0 && (
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="bg-slate-50 border-t border-slate-100">
                                            <th className="text-left px-4 py-2 text-slate-500 font-medium">NIF</th>
                                            <th className="text-left px-4 py-2 text-slate-500 font-medium">Nombre</th>
                                            <th className="text-right px-4 py-2 text-slate-500 font-medium">Clave</th>
                                            <th className="text-right px-4 py-2 text-slate-500 font-medium">Íntegro</th>
                                            <th className="text-right px-4 py-2 text-slate-500 font-medium">IRPF</th>
                                            <th className="text-right px-4 py-2 text-slate-500 font-medium">SS</th>
                                            <th className="text-right px-4 py-2 text-slate-500 font-medium">Neto</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {r.perceptores.map((p, i) => (
                                            <tr key={i} className="border-t border-slate-50 hover:bg-slate-50/50">
                                                <td className="px-4 py-2 font-mono text-slate-500">{p.nif_perceptor || '—'}</td>
                                                <td className="px-4 py-2 text-slate-700 font-medium">{p.nombre_perceptor}</td>
                                                <td className="px-4 py-2 text-right">
                                                    <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-mono">{p.clave_percepcion}</span>
                                                </td>
                                                <td className="px-4 py-2 text-right font-medium text-slate-700">{fmtEur(p.importe_integro)}</td>
                                                <td className="px-4 py-2 text-right font-semibold text-red-600">{fmtEur(p.retencion_total)}</td>
                                                <td className="px-4 py-2 text-right text-slate-500">{fmtEur(p.cuota_ss)}</td>
                                                <td className="px-4 py-2 text-right font-semibold text-green-700">{fmtEur(p.importe_neto)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t-2 border-slate-200 bg-slate-50">
                                            <td colSpan={3} className="px-4 py-2 text-xs font-semibold text-slate-600">Totales</td>
                                            <td className="px-4 py-2 text-right text-xs font-bold text-slate-700">{fmtEur(r.total_importe_integro)}</td>
                                            <td className="px-4 py-2 text-right text-xs font-bold text-red-600">{fmtEur(r.total_retenciones)}</td>
                                            <td className="px-4 py-2 text-right text-xs font-bold text-slate-500">{fmtEur(r.total_cuota_ss)}</td>
                                            <td className="px-4 py-2 text-right text-xs font-bold text-green-700">{fmtEur(r.total_importe_neto)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

// ─── Main View ────────────────────────────────────────────────────────────────

interface Props {
    empresaId: string;
}

const MODELOS: { id: ModeloFiscal; label: string; sub: string }[] = [
    { id: '303', label: 'Modelo 303', sub: 'IVA trimestral' },
    { id: '347', label: 'Modelo 347', sub: 'Operaciones terceros' },
    { id: '190', label: 'Modelo 190', sub: 'Retenciones IRPF' },
];

export const ImpresosFiscalesView: React.FC<Props> = ({ empresaId }) => {
    const [activeModelo, setActiveModelo] = useState<ModeloFiscal>('303');
    const [ejercicio, setEjercicio] = useState(currentYear);

    const { mod303, mod347, mod190, loading, error, loadMod303, loadMod347, loadMod190 } =
        useImpresosFiscales(empresaId);

    useEffect(() => {
        if (!empresaId) return;
        if (activeModelo === '303') loadMod303(ejercicio);
        else if (activeModelo === '347') loadMod347(ejercicio);
        else if (activeModelo === '190') loadMod190(ejercicio);
    }, [empresaId, activeModelo, ejercicio]);

    const handleRefresh = () => {
        if (activeModelo === '303') loadMod303(ejercicio);
        else if (activeModelo === '347') loadMod347(ejercicio);
        else if (activeModelo === '190') loadMod190(ejercicio);
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <ModuleHeader
                icon={FileText}
                title="Impresos Fiscales"
                subtitle="Modelo 303 · Modelo 347 · Modelo 190"
                color="indigo"
                actions={
                    <div className="flex items-center gap-2">
                        <select
                            value={ejercicio}
                            onChange={e => setEjercicio(Number(e.target.value))}
                            className="text-xs bg-indigo-900/40 text-white border-0 rounded-lg px-2 py-1.5 focus:outline-none cursor-pointer"
                        >
                            {EJERCICIOS.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                        <button
                            onClick={handleRefresh}
                            disabled={loading}
                            className="p-1.5 bg-indigo-900/40 text-white/70 hover:text-white rounded-lg transition-colors"
                            title="Actualizar"
                        >
                            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        </button>
                        <button
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-900/40 text-white/70 hover:text-white text-xs rounded-lg transition-colors"
                            title="Exportar CSV"
                        >
                            <Download size={13} />
                            CSV
                        </button>
                    </div>
                }
            />

            {/* Tabs selector de modelo */}
            <div className="flex border-b border-slate-200 bg-white px-4 gap-1 shrink-0">
                {MODELOS.map(m => (
                    <button
                        key={m.id}
                        onClick={() => setActiveModelo(m.id)}
                        className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                            activeModelo === m.id
                                ? 'border-indigo-600 text-indigo-700'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <span>{m.label}</span>
                        <span className="ml-1.5 text-[11px] font-normal opacity-60">{m.sub}</span>
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
                        <span className="ml-2 text-slate-400 text-sm">Cargando datos fiscales…</span>
                    </div>
                )}

                {!loading && (
                    <>
                        {activeModelo === '303' && (
                            <div className="py-3">
                                <div className="px-4 mb-3">
                                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 text-xs text-indigo-700">
                                        <strong>Modelo 303</strong> — Autoliquidación trimestral del IVA.
                                        Calculado desde las cuentas contables del Plan General Contable (477x / 472x).
                                        Verifica con tu gestor antes de presentar.
                                    </div>
                                </div>
                                <Mod303Panel data={mod303} />
                            </div>
                        )}
                        {activeModelo === '347' && (
                            <div className="py-3">
                                <div className="px-4 mb-3">
                                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 text-xs text-indigo-700">
                                        <strong>Modelo 347</strong> — Declaración anual de operaciones con terceros.
                                        Incluye clientes y proveedores con operaciones superiores a <strong>3.005,06 €</strong> en el ejercicio {ejercicio}.
                                    </div>
                                </div>
                                <Mod347Panel data={mod347} />
                            </div>
                        )}
                        {activeModelo === '190' && (
                            <div className="py-3">
                                <div className="px-4 mb-3">
                                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 text-xs text-indigo-700">
                                        <strong>Modelo 190</strong> — Resumen anual de retenciones e ingresos a cuenta del IRPF.
                                        Basado en las nóminas del módulo RRHH. Clave de percepción <strong>01</strong> (rendimientos del trabajo).
                                    </div>
                                </div>
                                <Mod190Panel data={mod190} />
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};
