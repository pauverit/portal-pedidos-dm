import React, { useState, useRef } from 'react';
import { Upload, Download, CheckCircle, AlertTriangle, Loader, X, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabase';

// ─── helpers ──────────────────────────────────────────────────────────────────

const parseCsv = (text: string): Record<string, string>[] => {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    const headers = lines[0].split(';').map(h => h.trim().toLowerCase());
    return lines.slice(1).map(line => {
        const vals = line.split(';');
        return Object.fromEntries(headers.map((h, i) => [h, (vals[i] || '').trim()]));
    });
};

type ImportResult = { ok: number; errors: { row: number; msg: string }[] };

// ─── Templates ────────────────────────────────────────────────────────────────

const CLIENT_TEMPLATE = `nombre;usuario;email;telefono;zona;comercial_email\nACME SL;acme;acme@ejemplo.es;666111222;Madrid;comercial@empresa.com\nSerplo SA;serplo;serplo@ejemplo.es;666333444;Málaga;comercial@empresa.com`;
const MACHINE_TEMPLATE = `cliente_email;marca;modelo;numero_serie;garantia_hasta\nacme@ejemplo.es;HP;DesignJet T650;SN12345;2026-12-31\nserlo@ejemplo.es;Canon;imagePROGRAF TX-3100;CN99999;2025-06-30`;

const downloadCsv = (content: string, name: string) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8;' }));
    a.download = name;
    a.click();
};

// ─── Sub-component: import section ────────────────────────────────────────────

interface ImportSectionProps {
    title: string;
    templateContent: string;
    templateName: string;
    columns: string[];
    onImport: (rows: Record<string, string>[]) => Promise<ImportResult>;
}

const ImportSection: React.FC<ImportSectionProps> = ({ title, templateContent, templateName, columns, onImport }) => {
    const [csvText, setCsvText] = useState('');
    const [running, setRunning] = useState(false);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [open, setOpen] = useState(true);
    const fileRef = useRef<HTMLInputElement>(null);

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        const reader = new FileReader();
        reader.onload = ev => setCsvText(ev.target?.result as string);
        reader.readAsText(f, 'utf-8');
        e.target.value = '';
    };

    const handleRun = async () => {
        if (!csvText.trim()) return;
        setRunning(true);
        setResult(null);
        try {
            const rows = parseCsv(csvText);
            const res = await onImport(rows);
            setResult(res);
        } finally {
            setRunning(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <button
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50 transition-colors"
                onClick={() => setOpen(o => !o)}
            >
                <h2 className="font-bold text-slate-900">{title}</h2>
                {open ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
            </button>

            {open && (
                <div className="px-6 pb-6 space-y-4 border-t border-slate-50">
                    {/* Column reference */}
                    <div className="flex flex-wrap gap-2 mt-4">
                        {columns.map(c => (
                            <span key={c} className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{c}</span>
                        ))}
                        <span className="text-xs text-slate-400 self-center">(separado por punto y coma «;»)</span>
                    </div>

                    {/* Actions row */}
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => downloadCsv(templateContent, templateName)}
                            className="flex items-center gap-2 text-sm font-semibold border border-slate-200 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors text-slate-600"
                        >
                            <Download size={14} /> Descargar plantilla
                        </button>
                        <button
                            type="button"
                            onClick={() => fileRef.current?.click()}
                            className="flex items-center gap-2 text-sm font-semibold border border-slate-200 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors text-slate-600"
                        >
                            <Upload size={14} /> Cargar archivo CSV
                        </button>
                        <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFile} />
                    </div>

                    {/* Textarea paste */}
                    <textarea
                        rows={6}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-slate-900"
                        placeholder={`Pega el contenido CSV aquí…\n${templateContent}`}
                        value={csvText}
                        onChange={e => { setCsvText(e.target.value); setResult(null); }}
                    />

                    {/* Import button */}
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            disabled={running || !csvText.trim()}
                            onClick={handleRun}
                            className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-700 disabled:opacity-40 transition-colors"
                        >
                            {running ? <Loader size={15} className="animate-spin" /> : <Upload size={15} />}
                            {running ? 'Importando…' : 'Importar'}
                        </button>
                        {csvText && (
                            <button type="button" onClick={() => { setCsvText(''); setResult(null); }}
                                className="text-sm text-slate-400 hover:text-slate-700">
                                <X size={15} />
                            </button>
                        )}
                    </div>

                    {/* Result */}
                    {result && (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm font-bold text-emerald-700 bg-emerald-50 px-4 py-2 rounded-xl">
                                <CheckCircle size={16} /> {result.ok} filas importadas correctamente
                            </div>
                            {result.errors.length > 0 && (
                                <div className="bg-red-50 rounded-xl px-3 py-2 space-y-1">
                                    <p className="text-xs font-bold text-red-700 flex items-center gap-1"><AlertTriangle size={13} />{result.errors.length} errores:</p>
                                    {result.errors.map((e, i) => (
                                        <p key={i} className="text-xs text-red-600">Fila {e.row}: {e.msg}</p>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ─── Main component ────────────────────────────────────────────────────────────

export const AdminBulkImportSAT: React.FC = () => {

    // ── Import clients ──────────────────────────────────────────────────────
    const importClients = async (rows: Record<string, string>[]): Promise<ImportResult> => {
        let ok = 0;
        const errors: { row: number; msg: string }[] = [];

        // Pre-fetch all commercial emails referenced in the CSV to build a lookup map
        const commercialEmails = [...new Set(
            rows.map(r => r.comercial_email?.trim()).filter(Boolean)
        )];
        let salesRepMap: Record<string, { name: string; code: string }> = {};
        if (commercialEmails.length > 0) {
            const { data: reps } = await supabase
                .from('clients')
                .select('email, company_name, sales_rep_code')
                .in('email', commercialEmails)
                .in('role', ['sales', 'tech_lead', 'admin']);
            (reps || []).forEach((r: any) => {
                salesRepMap[r.email] = { name: r.company_name, code: r.sales_rep_code || '' };
            });
        }

        for (let i = 0; i < rows.length; i++) {
            const r = rows[i];
            const rowNum = i + 2; // header = row 1
            if (!r.nombre?.trim()) { errors.push({ row: rowNum, msg: 'nombre es obligatorio' }); continue; }
            if (!r.usuario?.trim()) { errors.push({ row: rowNum, msg: 'usuario es obligatorio' }); continue; }

            const email = r.email?.trim() || `${r.usuario.trim()}@tech.internal`;
            const repInfo = r.comercial_email ? salesRepMap[r.comercial_email.trim()] : undefined;

            const { error } = await supabase.from('clients').upsert({
                company_name: r.nombre.trim(),
                username: r.usuario.trim(),
                email,
                phone: r.telefono?.trim() || null,
                zone: r.zona?.trim() || null,
                role: 'client',
                rappel_accumulated: 0,
                password: 'changeme',
                // Pending activation — commercial must visit and activate
                is_active: false,
                must_change_password: true,
                // Assign commercial if matched
                ...(repInfo ? { sales_rep: repInfo.name, sales_rep_code: repInfo.code } : {}),
            }, { onConflict: 'email' });

            if (error) errors.push({ row: rowNum, msg: error.message });
            else ok++;
        }
        return { ok, errors };
    };

    // ── Import machines ──────────────────────────────────────────────────────
    const importMachines = async (rows: Record<string, string>[]): Promise<ImportResult> => {
        let ok = 0;
        const errors: { row: number; msg: string }[] = [];

        // Build email→id map for lookup
        const emails = [...new Set(rows.map(r => r.cliente_email?.trim()).filter(Boolean))];
        const { data: clients } = await supabase
            .from('clients')
            .select('id, email')
            .in('email', emails);
        const emailToId: Record<string, string> = {};
        (clients || []).forEach((c: any) => { emailToId[c.email] = c.id; });

        for (let i = 0; i < rows.length; i++) {
            const r = rows[i];
            const rowNum = i + 2;
            if (!r.cliente_email?.trim()) { errors.push({ row: rowNum, msg: 'cliente_email es obligatorio' }); continue; }
            if (!r.numero_serie?.trim()) { errors.push({ row: rowNum, msg: 'numero_serie es obligatorio' }); continue; }
            if (!r.marca?.trim() || !r.modelo?.trim()) { errors.push({ row: rowNum, msg: 'marca y modelo son obligatorios' }); continue; }

            const clientId = emailToId[r.cliente_email.trim()];
            if (!clientId) { errors.push({ row: rowNum, msg: `Cliente no encontrado: ${r.cliente_email}` }); continue; }

            const { error } = await supabase.from('machines').upsert({
                client_id: clientId,
                serial_number: r.numero_serie.trim(),
                brand: r.marca.trim(),
                model: r.modelo.trim(),
                warranty_expires: r.garantia_hasta?.trim() || null,
                status: 'active',
            }, { onConflict: 'serial_number' });

            if (error) errors.push({ row: rowNum, msg: error.message });
            else ok++;
        }
        return { ok, errors };
    };

    return (
        <div className="p-4 md:p-10 max-w-4xl mx-auto space-y-4">
            <div>
                <h1 className="text-xl font-black text-slate-900">Carga masiva SAT</h1>
                <p className="text-slate-500 text-sm mt-1">
                    Importa clientes y activos desde CSV. Usa punto y coma «;» como separador. Si el email ya existe, se actualiza.
                </p>
            </div>

            <ImportSection
                title="1. Importar Clientes"
                templateContent={CLIENT_TEMPLATE}
                templateName="plantilla_clientes.csv"
                columns={['nombre', 'usuario', 'email', 'telefono', 'zona', 'comercial_email']}
                onImport={importClients}
            />

            <ImportSection
                title="2. Importar Activos / Máquinas"
                templateContent={MACHINE_TEMPLATE}
                templateName="plantilla_activos.csv"
                columns={['cliente_email', 'marca', 'modelo', 'numero_serie', 'garantia_hasta']}
                onImport={importMachines}
            />

            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 text-sm text-amber-800">
                <strong>Orden recomendado:</strong> importa primero los clientes, luego los activos (el CSV de activos referencia a los clientes por email).
            </div>
        </div>
    );
};
