import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar, List, Plus, X, Save, ChevronLeft, ChevronRight,
  Clock, MapPin, User as UserIcon, Tag, Phone, Wrench,
  CheckCircle2, AlertCircle, RefreshCw, Trash2, Edit2,
} from 'lucide-react';
import { useAgenda, Cita, CitaDraft, TipoCita, EstadoCita, TIPO_CONFIG, ESTADO_CONFIG } from '../hooks/useAgenda';
import { useEmpresaData } from '../hooks/useEmpresaData';
import { SageToolbar, SageTabStrip, SageSelect, SageFilterInput, sageTh, sageRowClass } from './SageToolbar';
import { User } from '../types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function fmtHora(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}
function fmtFecha(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
}
function isoToDate(iso: string) { return new Date(iso); }

// Devuelve los días del grid de un mes (comenzando en lunes)
function getDiasDelMes(anio: number, mes: number): (Date | null)[] {
  const primerDia = new Date(anio, mes - 1, 1);
  const ultimoDia = new Date(anio, mes, 0);
  // lunes=0 … domingo=6
  const offsetInicio = (primerDia.getDay() + 6) % 7;
  const offsetFin = (6 - (ultimoDia.getDay() + 6) % 7);
  const dias: (Date | null)[] = [];
  for (let i = 0; i < offsetInicio; i++) dias.push(null);
  for (let d = 1; d <= ultimoDia.getDate(); d++) dias.push(new Date(anio, mes - 1, d));
  for (let i = 0; i < offsetFin; i++) dias.push(null);
  return dias;
}

function esMismaFecha(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

// ─── Modal de cita ───────────────────────────────────────────────────────────

const DRAFT_VACIO: CitaDraft = {
  titulo: '',
  tipo: 'reunion',
  fecha_inicio: new Date().toISOString().slice(0, 16),
  fecha_fin: '',
  todo_el_dia: false,
  descripcion: '',
  ubicacion: '',
  estado: 'pendiente',
  cliente_nombre: '',
  responsable_nombre: '',
  color: 'blue',
};

interface ModalCitaProps {
  cita?: Cita | null;
  defaultDate?: string;
  onSave: (draft: CitaDraft) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onClose: () => void;
}

const ModalCita: React.FC<ModalCitaProps> = ({ cita, defaultDate, onSave, onDelete, onClose }) => {
  const [form, setForm] = useState<CitaDraft>(() => {
    if (cita) {
      return {
        titulo: cita.titulo,
        tipo: cita.tipo,
        fecha_inicio: cita.fecha_inicio.slice(0, 16),
        fecha_fin: cita.fecha_fin?.slice(0, 16) ?? '',
        todo_el_dia: cita.todo_el_dia,
        descripcion: cita.descripcion ?? '',
        ubicacion: cita.ubicacion ?? '',
        estado: cita.estado,
        cliente_nombre: cita.cliente_nombre ?? '',
        responsable_nombre: cita.responsable_nombre ?? '',
        color: cita.color ?? 'blue',
      };
    }
    const base = defaultDate ?? new Date().toISOString().slice(0, 16);
    return { ...DRAFT_VACIO, fecha_inicio: base };
  });
  const [saving, setSaving] = useState(false);
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);

  const F = form;
  const set = (key: keyof CitaDraft, val: unknown) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const tipoConf = TIPO_CONFIG[F.tipo];

  const handleSave = async () => {
    if (!F.titulo.trim()) return;
    setSaving(true);
    try { await onSave(form); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden">
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-2.5 ${tipoConf.bg}`}>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${tipoConf.dot}`} />
            <span className={`text-[13px] font-semibold ${tipoConf.color}`}>
              {cita ? 'Editar cita' : 'Nueva cita'}
            </span>
          </div>
          <button onClick={onClose} className={`${tipoConf.color} opacity-60 hover:opacity-100`}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {/* Título */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Título *</label>
            <input
              value={F.titulo}
              onChange={e => set('titulo', e.target.value)}
              placeholder="Descripción breve de la cita…"
              className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
              autoFocus
            />
          </div>

          {/* Tipo + Estado */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Tipo</label>
              <select
                value={F.tipo}
                onChange={e => set('tipo', e.target.value)}
                className="w-full border border-slate-300 rounded px-2 py-1.5 text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-400"
              >
                {Object.entries(TIPO_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Estado</label>
              <select
                value={F.estado}
                onChange={e => set('estado', e.target.value as EstadoCita)}
                className="w-full border border-slate-300 rounded px-2 py-1.5 text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-400"
              >
                {Object.entries(ESTADO_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                {F.todo_el_dia ? 'Día' : 'Inicio'}
              </label>
              <input
                type={F.todo_el_dia ? 'date' : 'datetime-local'}
                value={F.fecha_inicio}
                onChange={e => set('fecha_inicio', e.target.value)}
                className="w-full border border-slate-300 rounded px-2 py-1.5 text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
            {!F.todo_el_dia && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Fin</label>
                <input
                  type="datetime-local"
                  value={F.fecha_fin ?? ''}
                  onChange={e => set('fecha_fin', e.target.value)}
                  className="w-full border border-slate-300 rounded px-2 py-1.5 text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
            )}
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={F.todo_el_dia}
              onChange={e => set('todo_el_dia', e.target.checked)}
              className="rounded"
            />
            <span className="text-[12px] text-slate-600">Todo el día</span>
          </label>

          {/* Responsable + Cliente */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Responsable</label>
              <input
                value={F.responsable_nombre ?? ''}
                onChange={e => set('responsable_nombre', e.target.value)}
                placeholder="Nombre…"
                className="w-full border border-slate-300 rounded px-2 py-1.5 text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Cliente</label>
              <input
                value={F.cliente_nombre ?? ''}
                onChange={e => set('cliente_nombre', e.target.value)}
                placeholder="Nombre…"
                className="w-full border border-slate-300 rounded px-2 py-1.5 text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
          </div>

          {/* Ubicación */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Ubicación</label>
            <input
              value={F.ubicacion ?? ''}
              onChange={e => set('ubicacion', e.target.value)}
              placeholder="Dirección, sala, videollamada…"
              className="w-full border border-slate-300 rounded px-2 py-1.5 text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>

          {/* Notas */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Notas</label>
            <textarea
              value={F.descripcion ?? ''}
              onChange={e => set('descripcion', e.target.value)}
              rows={2}
              placeholder="Información adicional…"
              className="w-full border border-slate-300 rounded px-2 py-1.5 text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-t bg-slate-50 shrink-0">
          <div>
            {cita && onDelete && (
              confirmarEliminar ? (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-red-600">¿Eliminar?</span>
                  <button
                    onClick={async () => { await onDelete(cita.id); onClose(); }}
                    className="text-[11px] px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Sí, eliminar
                  </button>
                  <button onClick={() => setConfirmarEliminar(false)} className="text-[11px] text-slate-500 hover:text-slate-700">
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmarEliminar(true)}
                  className="flex items-center gap-1 text-[12px] text-red-400 hover:text-red-600"
                >
                  <Trash2 size={12} /> Eliminar
                </button>
              )
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-3 py-1.5 text-[12px] text-slate-600 border border-slate-200 rounded hover:bg-slate-100">
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !F.titulo.trim()}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white text-[12px] font-semibold rounded hover:bg-blue-700 disabled:opacity-50"
            >
              <Save size={13} /> {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Chips de tipo de cita ───────────────────────────────────────────────────

const CitaChip: React.FC<{ cita: Cita; onClick: () => void }> = ({ cita, onClick }) => {
  const conf = TIPO_CONFIG[cita.tipo];
  return (
    <div
      onClick={e => { e.stopPropagation(); onClick(); }}
      className={`text-[10px] font-medium px-1.5 py-0.5 rounded cursor-pointer truncate ${conf.bg} ${conf.color} hover:opacity-80`}
    >
      {cita.todo_el_dia ? '' : `${fmtHora(cita.fecha_inicio)} `}{cita.titulo}
    </div>
  );
};

// ─── Vista Calendario Mensual ────────────────────────────────────────────────

interface CalendarioProps {
  anio: number;
  mes: number;
  citas: Cita[];
  onDiaClick: (date: Date) => void;
  onCitaClick: (cita: Cita) => void;
}

const CalendarioMensual: React.FC<CalendarioProps> = ({ anio, mes, citas, onDiaClick, onCitaClick }) => {
  const dias = useMemo(() => getDiasDelMes(anio, mes), [anio, mes]);
  const hoy = new Date();

  return (
    <div className="flex-1 overflow-auto">
      {/* Cabecera días semana */}
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 shrink-0">
        {DIAS_SEMANA.map(d => (
          <div key={d} className="px-2 py-1.5 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wide">
            {d}
          </div>
        ))}
      </div>

      {/* Grid de días */}
      <div className="grid grid-cols-7 flex-1">
        {dias.map((dia, i) => {
          if (!dia) {
            return <div key={`empty-${i}`} className="min-h-[80px] border-b border-r border-slate-100 bg-slate-50/30" />;
          }
          const esHoy = esMismaFecha(dia, hoy);
          const citasDia = citas.filter(c => esMismaFecha(isoToDate(c.fecha_inicio), dia));

          return (
            <div
              key={dia.toISOString()}
              onClick={() => onDiaClick(dia)}
              className="min-h-[80px] border-b border-r border-slate-100 p-1.5 cursor-pointer hover:bg-blue-50/20 transition-colors"
            >
              {/* Número del día */}
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-bold mb-1 ${
                esHoy ? 'bg-blue-600 text-white' : 'text-slate-700'
              }`}>
                {dia.getDate()}
              </div>

              {/* Citas del día (max 3 visible) */}
              <div className="space-y-0.5">
                {citasDia.slice(0, 3).map(c => (
                  <CitaChip key={c.id} cita={c} onClick={() => onCitaClick(c)} />
                ))}
                {citasDia.length > 3 && (
                  <div className="text-[10px] text-slate-400 pl-1">+{citasDia.length - 3} más</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Vista Lista ─────────────────────────────────────────────────────────────

const VistaLista: React.FC<{
  citas: Cita[];
  search: string;
  filterTipo: string;
  onCitaClick: (c: Cita) => void;
}> = ({ citas, search, filterTipo, onCitaClick }) => {
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return citas
      .filter(c => {
        if (filterTipo !== 'todos' && c.tipo !== filterTipo) return false;
        return !q || c.titulo.toLowerCase().includes(q) ||
          (c.cliente_nombre ?? '').toLowerCase().includes(q) ||
          (c.responsable_nombre ?? '').toLowerCase().includes(q);
      })
      .sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio));
  }, [citas, search, filterTipo]);

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <Calendar size={36} className="mb-3 opacity-25" />
        <p className="text-sm">Sin citas en este periodo</p>
      </div>
    );
  }

  return (
    <table className="w-full">
      <thead className="sticky top-0 bg-slate-50 border-b border-slate-200">
        <tr>
          <th className={`${sageTh} w-36`}>Fecha / Hora</th>
          <th className={sageTh}>Título</th>
          <th className={`${sageTh} w-28`}>Tipo</th>
          <th className={`${sageTh} w-24`}>Estado</th>
          <th className={`${sageTh} w-32`}>Responsable</th>
          <th className={`${sageTh} w-32`}>Cliente</th>
          <th className={`${sageTh} w-28`}>Ubicación</th>
        </tr>
      </thead>
      <tbody>
        {filtered.map((c, idx) => {
          const tConf = TIPO_CONFIG[c.tipo];
          const eConf = ESTADO_CONFIG[c.estado];
          return (
            <tr
              key={c.id}
              className={`${sageRowClass(false, idx % 2 === 1)} cursor-pointer`}
              onClick={() => onCitaClick(c)}
            >
              <td className="px-2 py-1">
                <div className="text-[12px] font-medium text-slate-700 whitespace-nowrap">
                  {fmtFecha(c.fecha_inicio)}
                </div>
                {!c.todo_el_dia && (
                  <div className="text-[11px] text-slate-400">
                    {fmtHora(c.fecha_inicio)}
                    {c.fecha_fin ? ` → ${fmtHora(c.fecha_fin)}` : ''}
                  </div>
                )}
              </td>
              <td className="px-2 py-1">
                <div className="text-[12px] font-medium text-slate-800">{c.titulo}</div>
                {c.descripcion && (
                  <div className="text-[11px] text-slate-400 truncate max-w-[240px]">{c.descripcion}</div>
                )}
              </td>
              <td className="px-2 py-1">
                <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${tConf.bg} ${tConf.color}`}>
                  {tConf.label}
                </span>
              </td>
              <td className="px-2 py-1">
                <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${eConf.badge}`}>
                  {eConf.label}
                </span>
              </td>
              <td className="px-2 py-1 text-[12px] text-slate-600">{c.responsable_nombre || '—'}</td>
              <td className="px-2 py-1 text-[12px] text-slate-600">{c.cliente_nombre || '—'}</td>
              <td className="px-2 py-1 text-[12px] text-slate-500">{c.ubicacion || '—'}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

// ─── Vista principal AgendaView ───────────────────────────────────────────────

interface Props {
  currentUser: User;
}

export const AgendaView: React.FC<Props> = ({ currentUser }) => {
  const { empresas } = useEmpresaData();
  const empresa = empresas[0] ?? null;

  const { citas, loading, error, loadMes, loadProximas, createCita, updateCita, deleteCita } = useAgenda(empresa?.id);

  const now = new Date();
  const [anio, setAnio] = useState(now.getFullYear());
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [vista, setVista] = useState<'calendario' | 'lista'>('calendario');
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState('todos');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editCita, setEditCita] = useState<Cita | null>(null);
  const [defaultDate, setDefaultDate] = useState<string | undefined>();

  useEffect(() => {
    if (vista === 'calendario') loadMes(anio, mes);
    else loadProximas(90);
  }, [anio, mes, vista]);

  const mesAnterior = () => {
    if (mes === 1) { setAnio(a => a - 1); setMes(12); }
    else setMes(m => m - 1);
  };
  const mesSiguiente = () => {
    if (mes === 12) { setAnio(a => a + 1); setMes(1); }
    else setMes(m => m + 1);
  };
  const irHoy = () => { setAnio(now.getFullYear()); setMes(now.getMonth() + 1); };

  const openNueva = (date?: Date) => {
    setEditCita(null);
    setDefaultDate(date
      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T09:00`
      : undefined
    );
    setShowModal(true);
  };
  const openEditar = (c: Cita) => { setEditCita(c); setDefaultDate(undefined); setShowModal(true); };

  const handleSave = async (draft: CitaDraft) => {
    if (editCita) {
      await updateCita(editCita.id, draft);
    } else {
      await createCita(draft);
    }
    setShowModal(false);
    // Reload
    if (vista === 'calendario') loadMes(anio, mes);
    else loadProximas(90);
  };

  const handleDelete = async (id: string) => {
    await deleteCita(id);
    setShowModal(false);
    if (vista === 'calendario') loadMes(anio, mes);
    else loadProximas(90);
  };

  const tipoOptions = [
    { value: 'todos', label: 'Todos los tipos' },
    ...Object.entries(TIPO_CONFIG).map(([k, v]) => ({ value: k, label: v.label })),
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Module header ──────────────────────────────────────────────────── */}
      <div className="shrink-0 bg-gradient-to-r from-violet-700 to-violet-600 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar size={13} className="text-violet-200" />
          <span className="text-white font-semibold text-[13px]">Agenda y Calendario</span>
        </div>
        <button
          onClick={() => vista === 'calendario' ? loadMes(anio, mes) : loadProximas(90)}
          className="text-violet-300 hover:text-white transition-colors"
          title="Actualizar"
        >
          <RefreshCw size={13} />
        </button>
      </div>

      {/* ── Tabs: Calendario / Lista ────────────────────────────────────────── */}
      <SageTabStrip
        tabs={[
          { id: 'calendario', label: 'Calendario', icon: Calendar, count: undefined },
          { id: 'lista',      label: 'Lista',       icon: List,     count: citas.length },
        ]}
        active={vista}
        onChange={id => setVista(id as typeof vista)}
      />

      {/* ── Toolbar ────────────────────────────────────────────────────────── */}
      <SageToolbar
        groups={[[
          { label: 'Nueva cita', icon: Plus, onClick: () => openNueva(), variant: 'primary' },
        ], [
          { label: 'Hoy', icon: Clock, onClick: irHoy },
        ]]}
        filter={
          vista === 'calendario'
            ? (
              <div className="flex items-center gap-2">
                <button onClick={mesAnterior} className="p-0.5 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-200">
                  <ChevronLeft size={14} />
                </button>
                <span className="text-[12px] font-semibold text-slate-700 min-w-[120px] text-center">
                  {MESES[mes - 1]} {anio}
                </span>
                <button onClick={mesSiguiente} className="p-0.5 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-200">
                  <ChevronRight size={14} />
                </button>
              </div>
            )
            : (
              <>
                <SageFilterInput value={search} onChange={setSearch} placeholder="Buscar cita…" />
                <SageSelect value={filterTipo} onChange={setFilterTipo} options={tipoOptions} />
              </>
            )
        }
        recordCount={citas.length}
        recordLabel="citas"
      />

      {error && (
        <div className="shrink-0 bg-red-50 border-b border-red-200 text-red-700 px-4 py-2 text-[12px] flex items-center gap-2">
          <AlertCircle size={13} /> {error}
          {error.includes('does not exist') && (
            <span className="ml-2 font-medium">→ Ejecuta <code className="bg-red-100 px-1 rounded">sql/paso20_agenda.sql</code> en Supabase</span>
          )}
        </div>
      )}

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-slate-400 text-sm">Cargando agenda…</div>
        ) : vista === 'calendario' ? (
          <CalendarioMensual
            anio={anio}
            mes={mes}
            citas={citas}
            onDiaClick={openNueva}
            onCitaClick={openEditar}
          />
        ) : (
          <div className="flex-1 overflow-y-auto min-h-0">
            <VistaLista
              citas={citas}
              search={search}
              filterTipo={filterTipo}
              onCitaClick={openEditar}
            />
          </div>
        )}
      </div>

      {/* ── Modal ──────────────────────────────────────────────────────────── */}
      {showModal && (
        <ModalCita
          cita={editCita}
          defaultDate={defaultDate}
          onSave={handleSave}
          onDelete={editCita ? handleDelete : undefined}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
};
