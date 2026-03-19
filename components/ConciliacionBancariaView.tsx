import React, { useState, useEffect, useRef } from 'react';
import {
    Building2, Upload, CheckCircle2, Clock, AlertCircle,
    RefreshCw, Plus, ChevronDown, ChevronRight, X, Wallet,
    TrendingUp, TrendingDown, ArrowRightLeft,
} from 'lucide-react';
import { ModuleHeader } from './ModuleHeader';
import {
    useConciliacion,
    CuentaBancaria,
    MovimientoBancario,
    parseExtractoBancarioCSV,
} from '../hooks/useConciliacion';

// ─── Helpers ───────────────────────────────────────────────────────────────────

const fmtEur = (n: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

const fmtDate = (s: string) =>
    new Date(s + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

// ─── KPI Card ─────────────────────────────────────────────────────────────────

const KpiCard: React.FC<{
    label: string; value: string; icon: React.ReactNode;
    color?: 'green' | 'red' | 'blue' | 'slate' | 'amber';
}> = ({ label, value, icon, color = 'slate' }) => {
    const colors: Record<string, string> = {
        green: 'text-green-700 bg-green-50 border-green-200',
        red:   'text-red-700 bg-red-50 border-red-200',
        blue:  'text-blue-700 bg-blue-50 border-blue-200',
        slate: 'text-slate-700 bg-slate-50 border-slate-200',
        amber: 'text-amber-700 bg-amber-50 border-amber-200',
    };
    return (
        <div className={`border rounded-xl p-3.5 flex items-center gap-3 ${colors[color]}`}>
            <div className="opacity-50">{icon}</div>
            <div>
                <div className="text-[11px] font-medium opacity-60">{label}</div>
                <div className="text-lg font-bold">{value}</div>
            </div>
        </div>
    );
};

// ─── Modal: Nueva cuenta bancaria ─────────────────────────────────────────────

const NuevaCuentaModal: React.FC<{
    onClose: () => void;
    onSave: (data: { nombre: string; iban?: string; banco?: string }) => Promise<boolean>;
}> = ({ onClose, onSave }) => {
    const [nombre, setNombre] = useState('');
    const [iban, setIban] = useState('');
    const [banco, setBanco] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nombre.trim()) return;
        setSaving(true);
        const ok = await onSave({ nombre, iban: iban || undefined, banco: banco || undefined });
        setSaving(false);
        if (ok) onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                    <h2 className="font-semibold text-slate-800">Nueva Cuenta Bancaria</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-5 space-y-3">
                    <div>
                        <label className="text-xs font-medium text-slate-600 mb-1 block">Nombre *</label>
                        <input
                            type="text"
                            value={nombre}
                            onChange={e => setNombre(e.target.value)}
                            placeholder="Ej: Santander — Cuenta Principal"
                            required
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-slate-600 mb-1 block">IBAN</label>
                        <input
                            type="text"
                            value={iban}
                            onChange={e => setIban(e.target.value.toUpperCase())}
                            placeholder="ES12 3456 7890 1234 5678 9012"
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-slate-600 mb-1 block">Banco</label>
                        <input
                            type="text"
                            value={banco}
                            onChange={e => setBanco(e.target.value)}
                            placeholder="Santander, BBVA, CaixaBank…"
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div className="flex gap-2 pt-2">
                        <button type="button" onClick={onClose}
                            className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">
                            Cancelar
                        </button>
                        <button type="submit" disabled={saving}
                            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                            {saving ? 'Guardando…' : 'Crear cuenta'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ─── Panel de movimientos con conciliación ────────────────────────────────────

const MovimientosPanel: React.FC<{
    movimientos: MovimientoBancario[];
    onConciliar: (id: string) => void;
    showConciliados?: boolean;
}> = ({ movimientos, onConciliar, showConciliados = false }) => {
    const visible = showConciliados ? movimientos : movimientos.filter(m => !m.conciliado);

    if (visible.length === 0) {
        return (
            <div className="flex flex-col items-center gap-2 py-12 text-slate-400">
                <CheckCircle2 size={32} className="text-green-400" />
                <span className="text-sm font-medium text-green-600">Todo conciliado</span>
                <span className="text-xs">No hay movimientos pendientes</span>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-xs">
                <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left px-3 py-2.5 text-slate-500 font-medium">Fecha</th>
                        <th className="text-left px-3 py-2.5 text-slate-500 font-medium">Concepto</th>
                        <th className="text-left px-3 py-2.5 text-slate-500 font-medium">Tipo</th>
                        <th className="text-right px-3 py-2.5 text-slate-500 font-medium">Importe</th>
                        <th className="text-right px-3 py-2.5 text-slate-500 font-medium">Saldo</th>
                        <th className="text-center px-3 py-2.5 text-slate-500 font-medium">Estado</th>
                        <th className="px-3 py-2.5"></th>
                    </tr>
                </thead>
                <tbody>
                    {visible.map(m => (
                        <tr key={m.id} className={`border-b border-slate-50 hover:bg-slate-50/60 transition-colors ${m.conciliado ? 'opacity-50' : ''}`}>
                            <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{fmtDate(m.fecha)}</td>
                            <td className="px-3 py-2 text-slate-700 max-w-[220px] truncate">{m.concepto}</td>
                            <td className="px-3 py-2">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                    m.tipo === 'cobro' ? 'bg-green-100 text-green-700' :
                                    m.tipo === 'pago'  ? 'bg-red-100 text-red-700' :
                                    'bg-slate-100 text-slate-600'
                                }`}>{m.tipo}</span>
                            </td>
                            <td className={`px-3 py-2 text-right font-semibold whitespace-nowrap ${m.importe >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                                {m.importe >= 0 ? '+' : ''}{fmtEur(m.importe)}
                            </td>
                            <td className="px-3 py-2 text-right text-slate-500">
                                {m.saldo_despues != null ? fmtEur(m.saldo_despues) : '—'}
                            </td>
                            <td className="px-3 py-2 text-center">
                                {m.conciliado
                                    ? <CheckCircle2 size={14} className="text-green-500 inline" />
                                    : <Clock size={14} className="text-amber-500 inline" />
                                }
                            </td>
                            <td className="px-3 py-2">
                                {!m.conciliado && (
                                    <button
                                        onClick={() => onConciliar(m.id)}
                                        className="px-2 py-1 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-[11px] font-medium transition-colors whitespace-nowrap"
                                    >
                                        Conciliar
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

// ─── Import CSV Panel ─────────────────────────────────────────────────────────

const ImportCSVPanel: React.FC<{
    cuentas: CuentaBancaria[];
    onImport: (cuentaId: string, csvText: string) => Promise<number>;
}> = ({ cuentas, onImport }) => {
    const [cuentaId, setCuentaId] = useState(cuentas[0]?.id ?? '');
    const [preview, setPreview] = useState<{ fecha: string; concepto: string; importe: number }[]>([]);
    const [csvText, setCsvText] = useState('');
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (cuentas.length > 0 && !cuentaId) setCuentaId(cuentas[0].id);
    }, [cuentas]);

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            const text = ev.target?.result as string;
            setCsvText(text);
            const rows = parseExtractoBancarioCSV(text);
            setPreview(rows.slice(0, 5));
            setResult(null);
        };
        reader.readAsText(file, 'latin1');
    };

    const handleImport = async () => {
        if (!csvText || !cuentaId) return;
        setImporting(true);
        setResult(null);
        const n = await onImport(cuentaId, csvText);
        setResult(`${n} movimientos importados correctamente.`);
        setImporting(false);
        setCsvText('');
        setPreview([]);
        if (fileRef.current) fileRef.current.value = '';
    };

    return (
        <div className="p-4 space-y-4">
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700">
                Importa el extracto bancario en CSV. Columnas esperadas: <strong>fecha, concepto, importe, saldo</strong>.
                Compatible con Santander, BBVA y CaixaBank (formato estándar).
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Cuenta destino</label>
                    <select
                        value={cuentaId}
                        onChange={e => setCuentaId(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        {cuentas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Archivo CSV</label>
                    <input
                        ref={fileRef}
                        type="file"
                        accept=".csv,.txt"
                        onChange={handleFile}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs cursor-pointer file:mr-2 file:px-2 file:py-0.5 file:rounded file:border-0 file:bg-indigo-50 file:text-indigo-600 file:text-xs file:cursor-pointer"
                    />
                </div>
            </div>

            {preview.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="px-3 py-2 bg-slate-50 text-xs font-medium text-slate-600 border-b border-slate-200">
                        Vista previa (primeras 5 filas)
                    </div>
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="text-left px-3 py-1.5 text-slate-500">Fecha</th>
                                <th className="text-left px-3 py-1.5 text-slate-500">Concepto</th>
                                <th className="text-right px-3 py-1.5 text-slate-500">Importe</th>
                            </tr>
                        </thead>
                        <tbody>
                            {preview.map((r, i) => (
                                <tr key={i} className="border-t border-slate-50">
                                    <td className="px-3 py-1.5 text-slate-500">{r.fecha}</td>
                                    <td className="px-3 py-1.5 text-slate-700 truncate max-w-[200px]">{r.concepto}</td>
                                    <td className={`px-3 py-1.5 text-right font-medium ${r.importe >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                                        {r.importe >= 0 ? '+' : ''}{fmtEur(r.importe)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {result && (
                <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
                    <CheckCircle2 size={16} />
                    <span>{result}</span>
                </div>
            )}

            <button
                onClick={handleImport}
                disabled={!csvText || !cuentaId || importing}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors"
            >
                <Upload size={14} />
                {importing ? 'Importando…' : 'Importar extracto'}
            </button>
        </div>
    );
};

// ─── Main View ────────────────────────────────────────────────────────────────

interface Props { empresaId: string; }

type ActiveTab = 'cuentas' | 'pendientes' | 'movimientos' | 'import';

export const ConciliacionBancariaView: React.FC<Props> = ({ empresaId }) => {
    const [tab, setTab] = useState<ActiveTab>('cuentas');
    const [selectedCuenta, setSelectedCuenta] = useState<CuentaBancaria | null>(null);
    const [showNewCuenta, setShowNewCuenta] = useState(false);
    const [showConciliados, setShowConciliados] = useState(false);

    const {
        cuentas, movimientos, pendientes, liquidez,
        loading, error,
        loadCuentas, loadMovimientos, loadPendientes, loadLiquidez,
        importarCSV, conciliar, crearCuenta,
    } = useConciliacion(empresaId);

    useEffect(() => {
        if (!empresaId) return;
        loadCuentas();
        loadPendientes();
        loadLiquidez();
    }, [empresaId]);

    useEffect(() => {
        if (selectedCuenta) loadMovimientos(selectedCuenta.id);
    }, [selectedCuenta]);

    const handleConciliar = async (id: string) => {
        await conciliar(id);
    };

    const handleImport = async (cuentaId: string, csvText: string): Promise<number> => {
        const filas = parseExtractoBancarioCSV(csvText);
        const n = await importarCSV(cuentaId, filas);
        await loadPendientes();
        await loadLiquidez();
        return n;
    };

    const TABS: { id: ActiveTab; label: string }[] = [
        { id: 'cuentas',      label: 'Cuentas' },
        { id: 'pendientes',   label: `Pendientes${pendientes.length > 0 ? ` (${pendientes.length})` : ''}` },
        { id: 'movimientos',  label: 'Extracto' },
        { id: 'import',       label: 'Importar CSV' },
    ];

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <ModuleHeader
                icon={ArrowRightLeft}
                title="Conciliación Bancaria"
                subtitle="Extractos · Conciliación · Tesorería"
                color="indigo"
                actions={
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => { loadCuentas(); loadPendientes(); loadLiquidez(); }}
                            disabled={loading}
                            className="p-1.5 bg-indigo-900/40 text-white/70 hover:text-white rounded-lg"
                        >
                            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        </button>
                        <button
                            onClick={() => setShowNewCuenta(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-900/40 text-white/70 hover:text-white text-xs rounded-lg transition-colors"
                        >
                            <Plus size={13} />
                            Nueva cuenta
                        </button>
                    </div>
                }
            />

            {/* KPIs de tesorería */}
            {liquidez && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-4 py-3 bg-slate-50 border-b border-slate-100 shrink-0">
                    <KpiCard
                        label="Saldo total cuentas"
                        value={fmtEur(liquidez.saldo_total)}
                        icon={<Wallet size={18} />}
                        color="blue"
                    />
                    <KpiCard
                        label="Cobros pendientes"
                        value={fmtEur(liquidez.cobros_pendientes)}
                        icon={<TrendingUp size={18} />}
                        color="green"
                    />
                    <KpiCard
                        label="Pagos pendientes"
                        value={fmtEur(liquidez.pagos_pendientes)}
                        icon={<TrendingDown size={18} />}
                        color="red"
                    />
                    <KpiCard
                        label="Sin conciliar"
                        value={String(pendientes.length)}
                        icon={<Clock size={18} />}
                        color={pendientes.length > 0 ? 'amber' : 'slate'}
                    />
                </div>
            )}

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

                {/* CUENTAS */}
                {tab === 'cuentas' && (
                    <div className="p-4 space-y-3">
                        {cuentas.length === 0 && !loading ? (
                            <div className="text-center py-12 text-slate-400">
                                <Building2 size={32} className="mx-auto mb-2 opacity-30" />
                                <p className="text-sm">No hay cuentas bancarias configuradas.</p>
                                <button
                                    onClick={() => setShowNewCuenta(true)}
                                    className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700"
                                >
                                    Añadir primera cuenta
                                </button>
                            </div>
                        ) : (
                            cuentas.map(c => (
                                <div
                                    key={c.id}
                                    onClick={() => { setSelectedCuenta(c); setTab('movimientos'); }}
                                    className={`border rounded-xl p-4 cursor-pointer transition-colors hover:border-indigo-300 hover:bg-indigo-50/30 ${
                                        selectedCuenta?.id === c.id ? 'border-indigo-400 bg-indigo-50/40' : 'border-slate-200'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="font-semibold text-slate-800">{c.nombre}</div>
                                            {c.banco && <div className="text-xs text-slate-500 mt-0.5">{c.banco}</div>}
                                            {c.iban && <div className="font-mono text-xs text-slate-400 mt-0.5">{c.iban}</div>}
                                        </div>
                                        <div className="text-right">
                                            <div className={`text-lg font-bold ${c.saldo_actual >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                                                {fmtEur(c.saldo_actual)}
                                            </div>
                                            <div className="text-xs text-slate-400">saldo actual</div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* PENDIENTES */}
                {tab === 'pendientes' && (
                    <div>
                        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
                            <span className="text-sm font-medium text-slate-700">
                                {pendientes.length} movimiento{pendientes.length !== 1 ? 's' : ''} pendiente{pendientes.length !== 1 ? 's' : ''}
                            </span>
                            <button
                                onClick={() => setShowConciliados(!showConciliados)}
                                className="text-xs text-indigo-600 hover:text-indigo-800"
                            >
                                {showConciliados ? 'Ocultar conciliados' : 'Mostrar todos'}
                            </button>
                        </div>
                        <MovimientosPanel
                            movimientos={pendientes}
                            onConciliar={handleConciliar}
                            showConciliados={showConciliados}
                        />
                    </div>
                )}

                {/* EXTRACTO DE CUENTA */}
                {tab === 'movimientos' && (
                    <div>
                        {/* Selector de cuenta */}
                        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 bg-slate-50">
                            {cuentas.map(c => (
                                <button
                                    key={c.id}
                                    onClick={() => setSelectedCuenta(c)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                                        selectedCuenta?.id === c.id
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300'
                                    }`}
                                >
                                    {c.nombre}
                                </button>
                            ))}
                        </div>
                        {!selectedCuenta ? (
                            <div className="text-center py-12 text-slate-400 text-sm">
                                Selecciona una cuenta para ver el extracto.
                            </div>
                        ) : (
                            <MovimientosPanel
                                movimientos={movimientos}
                                onConciliar={handleConciliar}
                                showConciliados={true}
                            />
                        )}
                    </div>
                )}

                {/* IMPORTAR CSV */}
                {tab === 'import' && (
                    <ImportCSVPanel
                        cuentas={cuentas}
                        onImport={handleImport}
                    />
                )}
            </div>

            {/* Modal nueva cuenta */}
            {showNewCuenta && (
                <NuevaCuentaModal
                    onClose={() => setShowNewCuenta(false)}
                    onSave={crearCuenta}
                />
            )}
        </div>
    );
};
