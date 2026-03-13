import React, { useState, useMemo } from 'react';
import {
  Users, UserPlus, Briefcase, Calendar, FileText,
  ChevronDown, ChevronUp, Check, X, AlertCircle,
  TrendingUp, DollarSign, Clock, Edit2, BarChart2,
} from 'lucide-react';
import { useRRHH } from '../hooks/useRRHH';
import { useEmpresa } from '../hooks/useEmpresa';
import {
  Empleado, TipoContrato, JornadaEmpleado,
  TipoAusencia, EstadoAusencia, EstadoNomina,
  NominaConcepto,
} from '../types';

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

const TIPOS_CONTRATO: { value: TipoContrato; label: string }[] = [
  { value: 'indefinido',    label: 'Indefinido' },
  { value: 'temporal',      label: 'Temporal' },
  { value: 'formacion',     label: 'Formación' },
  { value: 'obra_servicio', label: 'Obra y Servicio' },
  { value: 'interinidad',   label: 'Interinidad' },
  { value: 'practicas',     label: 'Prácticas' },
  { value: 'relevo',        label: 'Relevo' },
  { value: 'otro',          label: 'Otro' },
];

const TIPOS_AUSENCIA: { value: TipoAusencia; label: string }[] = [
  { value: 'vacaciones',         label: 'Vacaciones' },
  { value: 'enfermedad',         label: 'Enfermedad' },
  { value: 'accidente_laboral',  label: 'Accidente Laboral' },
  { value: 'permiso_retribuido', label: 'Permiso Retribuido' },
  { value: 'maternidad',         label: 'Maternidad' },
  { value: 'paternidad',         label: 'Paternidad' },
  { value: 'excedencia',         label: 'Excedencia' },
  { value: 'otro',               label: 'Otro' },
];

// ─── Formulario Nuevo Empleado ────────────────────────────────────────────────
const EMPTY_EMP = {
  nombre: '', apellidos: '', dni_nie: '', fecha_nacimiento: '',
  email: '', telefono: '', num_ss: '', num_cuenta_iban: '',
  puesto: '', departamento_id: '',
  grupo_cotizacion: 5,
  tipo_contrato: 'indefinido' as TipoContrato,
  jornada: 'completa' as JornadaEmpleado,
  porcentaje_jornada: 100,
  sueldo_bruto_anual: 0,
  num_pagas: 14 as 12 | 14,
  irpf_porcentaje: 15,
  fecha_alta: new Date().toISOString().split('T')[0],
  estado: 'activo' as const,
};

function NuevoEmpleadoModal({
  empresaId, departamentos, onSave, onClose,
}: {
  empresaId: string;
  departamentos: { id: string; nombre: string }[];
  onSave: (emp: typeof EMPTY_EMP & { empresa_id: string }) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState(EMPTY_EMP);
  const set = (k: string, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <UserPlus size={20} /> Nuevo Empleado
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Datos personales */}
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Datos Personales</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nombre *</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.nombre} onChange={e => set('nombre', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Apellidos *</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.apellidos} onChange={e => set('apellidos', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">DNI/NIE</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.dni_nie} onChange={e => set('dni_nie', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Fecha Nacimiento</label>
              <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.fecha_nacimiento} onChange={e => set('fecha_nacimiento', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Email</label>
              <input type="email" className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Teléfono</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.telefono} onChange={e => set('telefono', e.target.value)} />
            </div>
          </div>

          {/* Datos laborales */}
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-2">Datos Laborales</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Puesto *</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.puesto} onChange={e => set('puesto', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Departamento</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.departamento_id} onChange={e => set('departamento_id', e.target.value)}>
                <option value="">Sin departamento</option>
                {departamentos.map(d => (
                  <option key={d.id} value={d.id}>{d.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Tipo Contrato *</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.tipo_contrato}
                onChange={e => set('tipo_contrato', e.target.value as TipoContrato)}>
                {TIPOS_CONTRATO.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Grupo Cotización (1-11)</label>
              <input type="number" min={1} max={11} className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.grupo_cotizacion}
                onChange={e => set('grupo_cotizacion', Number(e.target.value))} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Jornada</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.jornada}
                onChange={e => set('jornada', e.target.value as JornadaEmpleado)}>
                <option value="completa">Completa</option>
                <option value="parcial">Parcial</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">% Jornada</label>
              <input type="number" min={1} max={100} className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.porcentaje_jornada}
                onChange={e => set('porcentaje_jornada', Number(e.target.value))} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Fecha Alta *</label>
              <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.fecha_alta} onChange={e => set('fecha_alta', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nº SS</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.num_ss} onChange={e => set('num_ss', e.target.value)} />
            </div>
          </div>

          {/* Retribución */}
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-2">Retribución</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Salario Bruto Anual (€)</label>
              <input type="number" min={0} step={100} className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.sueldo_bruto_anual}
                onChange={e => set('sueldo_bruto_anual', Number(e.target.value))} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nº Pagas</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.num_pagas}
                onChange={e => set('num_pagas', Number(e.target.value) as 12 | 14)}>
                <option value={12}>12 pagas</option>
                <option value={14}>14 pagas (+ extras)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">IRPF %</label>
              <input type="number" min={0} max={50} step={0.5} className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.irpf_porcentaje}
                onChange={e => set('irpf_porcentaje', Number(e.target.value))} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">IBAN</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
              placeholder="ES00 0000 0000 0000 0000 0000"
              value={form.num_cuenta_iban}
              onChange={e => set('num_cuenta_iban', e.target.value)} />
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t">
          <button onClick={onClose}
            className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">
            Cancelar
          </button>
          <button
            onClick={() => onSave({ ...form, empresa_id: empresaId })}
            disabled={!form.nombre || !form.apellidos || !form.puesto}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            Guardar Empleado
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal nómina detalle ─────────────────────────────────────────────────────
function NominaDetalleModal({
  nomina, conceptos, onConfirmar, onClose,
}: {
  nomina: { id: string; empleado_nombre?: string; periodo: string; estado: EstadoNomina;
            total_devengado: number; total_deducciones: number; liquido_percibir: number;
            ss_empresa: number; coste_total_empresa: number };
  conceptos: NominaConcepto[];
  onConfirmar: (id: string) => void;
  onClose: () => void;
}) {
  const devengos    = conceptos.filter(c => c.tipo === 'devengado');
  const deducciones = conceptos.filter(c => c.tipo === 'deduccion');

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-base font-semibold">{nomina.empleado_nombre}</h2>
            <p className="text-xs text-gray-500">Nómina {nomina.periodo}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-4 text-sm">
          {/* Devengos */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Devengos</p>
            {devengos.map(c => (
              <div key={c.id} className="flex justify-between py-1 border-b border-dashed border-gray-100">
                <span className="text-gray-600">{c.descripcion}</span>
                <span className="font-mono">{fmt(c.importe)}</span>
              </div>
            ))}
            <div className="flex justify-between py-1 font-semibold">
              <span>Total Devengado</span>
              <span className="font-mono text-blue-600">{fmt(nomina.total_devengado)}</span>
            </div>
          </div>

          {/* Deducciones */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Deducciones</p>
            {deducciones.map(c => (
              <div key={c.id} className="flex justify-between py-1 border-b border-dashed border-gray-100">
                <span className="text-gray-600">{c.descripcion}</span>
                <span className="font-mono text-red-600">- {fmt(c.importe)}</span>
              </div>
            ))}
            <div className="flex justify-between py-1 font-semibold">
              <span>Total Deducciones</span>
              <span className="font-mono text-red-600">- {fmt(nomina.total_deducciones)}</span>
            </div>
          </div>

          {/* Líquido */}
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="flex justify-between font-bold text-base">
              <span>Líquido a Percibir</span>
              <span className="text-blue-700 font-mono">{fmt(nomina.liquido_percibir)}</span>
            </div>
          </div>

          {/* Coste empresa */}
          <div className="bg-gray-50 rounded-lg p-3 text-xs space-y-1">
            <div className="flex justify-between text-gray-500">
              <span>SS Empresa</span>
              <span className="font-mono">{fmt(nomina.ss_empresa)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Coste Total Empresa</span>
              <span className="font-mono">{fmt(nomina.coste_total_empresa)}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t">
          <button onClick={onClose}
            className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">
            Cerrar
          </button>
          {nomina.estado === 'borrador' && (
            <button onClick={() => { onConfirmar(nomina.id); onClose(); }}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
              Confirmar Nómina
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Vista Principal ──────────────────────────────────────────────────────────
export default function RRHHView() {
  const { empresa } = useEmpresa();
  const empresaId = empresa?.id;
  const rrhh = useRRHH(empresaId);

  const [tab, setTab] = useState<'plantilla' | 'nominas' | 'ausencias' | 'resumen'>('plantilla');
  const [showNuevoEmp, setShowNuevoEmp]   = useState(false);
  const [periodoNomina, setPeriodoNomina] = useState(
    new Date().toISOString().slice(0, 7)  // YYYY-MM actual
  );
  const [nominaDetalle, setNominaDetalle] = useState<{
    nomina: (typeof rrhh.nominas)[0];
    conceptos: NominaConcepto[];
  } | null>(null);
  const [ausenciaForm, setAusenciaForm] = useState<{
    empleado_id: string; tipo: TipoAusencia;
    fecha_inicio: string; fecha_fin: string; notas: string;
  } | null>(null);

  // Cargar nóminas al cambiar periodo
  const handleCargarNominas = () => rrhh.loadNominas(periodoNomina);

  const handleGenerarNominas = async () => {
    const n = await rrhh.generarNominasMensuales(periodoNomina);
    alert(`${n} nóminas generadas para ${periodoNomina}`);
  };

  const handleVerNomina = async (nomina: (typeof rrhh.nominas)[0]) => {
    const conceptos = await rrhh.getConceptos(nomina.id);
    setNominaDetalle({ nomina, conceptos });
  };

  const estadoColor: Record<EstadoNomina, string> = {
    borrador:   'bg-gray-100 text-gray-600',
    confirmada: 'bg-blue-100 text-blue-700',
    pagada:     'bg-green-100 text-green-700',
    anulada:    'bg-red-100 text-red-600',
  };

  const ausenciaEstadoColor: Record<EstadoAusencia, string> = {
    solicitada: 'bg-yellow-100 text-yellow-700',
    aprobada:   'bg-green-100 text-green-700',
    rechazada:  'bg-red-100 text-red-600',
    cancelada:  'bg-gray-100 text-gray-600',
  };

  // Métricas resumen
  const ultimoMes = rrhh.masaSalarial[0];
  const totalPlantilla = rrhh.empleados.length;

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users size={22} className="text-blue-600" />
          <div>
            <h1 className="text-lg font-bold text-gray-900">RRHH y Nóminas</h1>
            <p className="text-xs text-gray-500">{totalPlantilla} empleados activos</p>
          </div>
        </div>
        {rrhh.error && (
          <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 px-3 py-1 rounded-lg">
            <AlertCircle size={14} /> {rrhh.error}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white border-b px-6">
        <nav className="flex gap-1">
          {([
            { key: 'plantilla', icon: Users,     label: 'Plantilla' },
            { key: 'nominas',   icon: FileText,   label: 'Nóminas' },
            { key: 'ausencias', icon: Calendar,   label: 'Ausencias' },
            { key: 'resumen',   icon: BarChart2,  label: 'Resumen' },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              <t.icon size={15} /> {t.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-1 overflow-y-auto p-6">

        {/* ── TAB PLANTILLA ────────────────────────────────────────────── */}
        {tab === 'plantilla' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-semibold text-gray-700">Empleados Activos</h2>
              <button
                onClick={() => setShowNuevoEmp(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                <UserPlus size={15} /> Nuevo Empleado
              </button>
            </div>

            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Empleado</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Puesto</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Dpto.</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Contrato</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Salario/mes</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">IRPF</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Alta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rrhh.loading && (
                    <tr><td colSpan={7} className="text-center py-8 text-gray-400">Cargando...</td></tr>
                  )}
                  {!rrhh.loading && rrhh.empleados.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-8 text-gray-400">Sin empleados. Añade el primero.</td></tr>
                  )}
                  {rrhh.empleados.map(e => (
                    <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{e.nombre} {e.apellidos}</p>
                        <p className="text-xs text-gray-400">{e.dni_nie}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{e.puesto}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{e.departamento || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs capitalize">
                          {e.tipo_contrato.replace('_', ' ')}
                        </span>
                        {e.jornada === 'parcial' && (
                          <span className="ml-1 text-xs text-orange-500">{e.porcentaje_jornada}%</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-gray-700">
                        {fmt(e.salario_mensual ?? e.sueldo_bruto_anual / e.num_pagas)}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-500">{e.irpf_porcentaje}%</td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {new Date(e.fecha_alta).toLocaleDateString('es-ES')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB NÓMINAS ──────────────────────────────────────────────── */}
        {tab === 'nominas' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="month" className="border rounded-lg px-3 py-2 text-sm"
                value={periodoNomina}
                onChange={e => setPeriodoNomina(e.target.value)} />
              <button onClick={handleCargarNominas}
                className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50">
                Cargar
              </button>
              <button onClick={handleGenerarNominas}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                <FileText size={15} /> Generar Nóminas
              </button>
            </div>

            {rrhh.nominas.length > 0 && (
              <div className="bg-white rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Empleado</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Bruto</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Deducciones</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Líquido</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Coste emp.</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">Estado</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rrhh.nominas.map(n => (
                      <tr key={n.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium">{n.empleado_nombre}</p>
                          <p className="text-xs text-gray-400">{n.puesto}</p>
                        </td>
                        <td className="px-4 py-3 text-right font-mono">{fmt(n.total_devengado)}</td>
                        <td className="px-4 py-3 text-right font-mono text-red-500">- {fmt(n.total_deducciones)}</td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-blue-700">{fmt(n.liquido_percibir)}</td>
                        <td className="px-4 py-3 text-right font-mono text-gray-500">{fmt(n.coste_total_empresa)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${estadoColor[n.estado]}`}>
                            {n.estado}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => handleVerNomina(n)}
                            className="text-xs text-blue-600 hover:underline">
                            Ver
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 border-t font-semibold text-sm">
                      <td className="px-4 py-2">TOTAL</td>
                      <td className="px-4 py-2 text-right font-mono">
                        {fmt(rrhh.nominas.reduce((s, n) => s + n.total_devengado, 0))}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-red-500">
                        - {fmt(rrhh.nominas.reduce((s, n) => s + n.total_deducciones, 0))}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-blue-700">
                        {fmt(rrhh.nominas.reduce((s, n) => s + n.liquido_percibir, 0))}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-gray-500">
                        {fmt(rrhh.nominas.reduce((s, n) => s + n.coste_total_empresa, 0))}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── TAB AUSENCIAS ────────────────────────────────────────────── */}
        {tab === 'ausencias' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-semibold text-gray-700">Ausencias y Vacaciones</h2>
              <button
                onClick={() => setAusenciaForm({
                  empleado_id: '', tipo: 'vacaciones',
                  fecha_inicio: '', fecha_fin: '', notas: '',
                })}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                <Calendar size={15} /> Nueva Ausencia
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => rrhh.loadAusencias(false)}
                className="px-3 py-1.5 border rounded-lg text-xs hover:bg-gray-50">
                Todas
              </button>
              <button
                onClick={() => rrhh.loadAusencias(true)}
                className="px-3 py-1.5 border rounded-lg text-xs hover:bg-gray-50">
                Pendientes aprobación
              </button>
            </div>

            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Empleado</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Tipo</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Desde</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Hasta</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">Días</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">Estado</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rrhh.ausencias.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-8 text-gray-400">Sin ausencias registradas</td></tr>
                  )}
                  {rrhh.ausencias.map(a => (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium">{a.empleado_nombre || a.empleado_id}</p>
                        <p className="text-xs text-gray-400">{a.puesto}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600 capitalize">
                        {a.tipo.replace(/_/g, ' ')}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(a.fecha_inicio).toLocaleDateString('es-ES')}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(a.fecha_fin).toLocaleDateString('es-ES')}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">{a.dias_naturales}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ausenciaEstadoColor[a.estado]}`}>
                          {a.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {a.estado === 'solicitada' && (
                          <div className="flex gap-1 justify-end">
                            <button
                              onClick={() => rrhh.setEstadoAusencia(a.id, 'aprobada')}
                              className="p-1 text-green-600 hover:bg-green-50 rounded">
                              <Check size={14} />
                            </button>
                            <button
                              onClick={() => rrhh.setEstadoAusencia(a.id, 'rechazada')}
                              className="p-1 text-red-500 hover:bg-red-50 rounded">
                              <X size={14} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB RESUMEN ──────────────────────────────────────────────── */}
        {tab === 'resumen' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  label: 'Empleados activos',
                  value: totalPlantilla,
                  icon: Users, color: 'blue',
                  sub: '',
                },
                {
                  label: 'Masa salarial/mes',
                  value: fmt(ultimoMes?.total_bruto ?? 0),
                  icon: DollarSign, color: 'green',
                  sub: ultimoMes?.periodo ?? '',
                },
                {
                  label: 'Coste total empresa/mes',
                  value: fmt(ultimoMes?.coste_total ?? 0),
                  icon: TrendingUp, color: 'orange',
                  sub: 'incl. SS empresa',
                },
                {
                  label: 'Nóminas emitidas',
                  value: ultimoMes?.num_nominas ?? 0,
                  icon: FileText, color: 'purple',
                  sub: ultimoMes?.periodo ?? '',
                },
              ].map(k => (
                <div key={k.label} className="bg-white rounded-xl border p-4">
                  <div className={`w-9 h-9 rounded-lg bg-${k.color}-100 flex items-center justify-center mb-2`}>
                    <k.icon size={18} className={`text-${k.color}-600`} />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{k.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{k.label}</p>
                  {k.sub && <p className="text-xs text-gray-400">{k.sub}</p>}
                </div>
              ))}
            </div>

            {/* Histórico masa salarial */}
            {rrhh.masaSalarial.length > 0 && (
              <div className="bg-white rounded-xl border overflow-hidden">
                <div className="px-4 py-3 border-b">
                  <h3 className="text-sm font-semibold text-gray-700">Histórico Masa Salarial</h3>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Periodo</th>
                      <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500">Empleados</th>
                      <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500">Bruto</th>
                      <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500">SS Empresa</th>
                      <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500">Coste Total</th>
                      <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500">Líquido</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rrhh.masaSalarial.map(m => (
                      <tr key={m.periodo} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium">{m.periodo}</td>
                        <td className="px-4 py-2 text-right text-gray-500">{m.num_nominas}</td>
                        <td className="px-4 py-2 text-right font-mono">{fmt(m.total_bruto)}</td>
                        <td className="px-4 py-2 text-right font-mono text-orange-600">{fmt(m.total_ss_empresa)}</td>
                        <td className="px-4 py-2 text-right font-mono font-semibold">{fmt(m.coste_total)}</td>
                        <td className="px-4 py-2 text-right font-mono text-blue-600">{fmt(m.total_liquido)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────── */}
      {showNuevoEmp && empresaId && (
        <NuevoEmpleadoModal
          empresaId={empresaId}
          departamentos={rrhh.departamentos}
          onSave={async (draft) => {
            const result = await rrhh.createEmpleado({
              ...draft,
              departamento_id: draft.departamento_id || undefined,
              dni_nie: draft.dni_nie || undefined,
              fecha_nacimiento: draft.fecha_nacimiento || undefined,
              email: draft.email || undefined,
              telefono: draft.telefono || undefined,
              num_ss: draft.num_ss || undefined,
              num_cuenta_iban: draft.num_cuenta_iban || undefined,
            });
            if (result) setShowNuevoEmp(false);
          }}
          onClose={() => setShowNuevoEmp(false)}
        />
      )}

      {nominaDetalle && (
        <NominaDetalleModal
          nomina={nominaDetalle.nomina}
          conceptos={nominaDetalle.conceptos}
          onConfirmar={rrhh.confirmarNomina}
          onClose={() => setNominaDetalle(null)}
        />
      )}

      {ausenciaForm && empresaId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-base font-semibold">Nueva Ausencia</h2>
              <button onClick={() => setAusenciaForm(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <div className="p-4 space-y-3 text-sm">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Empleado *</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={ausenciaForm.empleado_id}
                  onChange={e => setAusenciaForm(p => p ? { ...p, empleado_id: e.target.value } : p)}>
                  <option value="">Seleccionar...</option>
                  {rrhh.empleados.map(e => (
                    <option key={e.id} value={e.id}>{e.nombre} {e.apellidos}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Tipo</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={ausenciaForm.tipo}
                  onChange={e => setAusenciaForm(p => p ? { ...p, tipo: e.target.value as TipoAusencia } : p)}>
                  {TIPOS_AUSENCIA.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Desde *</label>
                  <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm"
                    value={ausenciaForm.fecha_inicio}
                    onChange={e => setAusenciaForm(p => p ? { ...p, fecha_inicio: e.target.value } : p)} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Hasta *</label>
                  <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm"
                    value={ausenciaForm.fecha_fin}
                    onChange={e => setAusenciaForm(p => p ? { ...p, fecha_fin: e.target.value } : p)} />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Notas</label>
                <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2}
                  value={ausenciaForm.notas}
                  onChange={e => setAusenciaForm(p => p ? { ...p, notas: e.target.value } : p)} />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button onClick={() => setAusenciaForm(null)}
                className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">
                Cancelar
              </button>
              <button
                onClick={async () => {
                  if (!ausenciaForm.empleado_id || !ausenciaForm.fecha_inicio || !ausenciaForm.fecha_fin) return;
                  const ok = await rrhh.createAusencia({
                    empresa_id: empresaId,
                    empleado_id: ausenciaForm.empleado_id,
                    tipo: ausenciaForm.tipo,
                    fecha_inicio: ausenciaForm.fecha_inicio,
                    fecha_fin: ausenciaForm.fecha_fin,
                    notas: ausenciaForm.notas || undefined,
                    estado: 'solicitada',
                  });
                  if (ok) setAusenciaForm(null);
                }}
                disabled={!ausenciaForm.empleado_id || !ausenciaForm.fecha_inicio || !ausenciaForm.fecha_fin}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                Registrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
