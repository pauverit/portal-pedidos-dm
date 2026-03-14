import React, { useState, useEffect, useMemo } from 'react';
import {
  Monitor, Plus, Search, RefreshCw, AlertCircle, Loader2,
  ChevronRight, X, Check, Wrench, ClipboardList, AlertTriangle,
  Calendar, MapPin, Tag, Shield, User as UserIcon, Settings,
  CheckCircle, Clock, XCircle,
} from 'lucide-react';
import { Activo, User, Incident, WorkOrder } from '../types';
import { useActivos } from '../hooks/useActivos';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  active:          { label: 'Activo',      bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  inactive:        { label: 'Inactivo',    bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-500' },
  decommissioned:  { label: 'Baja',        bg: 'bg-red-100',     text: 'text-red-600',     dot: 'bg-red-400' },
} as const;

const INC_STATUS = {
  pending:     { label: 'Pendiente',   color: 'bg-amber-100 text-amber-700' },
  in_progress: { label: 'En proceso',  color: 'bg-blue-100 text-blue-700' },
  closed:      { label: 'Cerrada',     color: 'bg-slate-100 text-slate-500' },
} as const;

const SEV_CONFIG = {
  low:    'bg-slate-100 text-slate-500',
  normal: 'bg-blue-100 text-blue-700',
  high:   'bg-amber-100 text-amber-700',
  urgent: 'bg-red-100 text-red-700',
} as const;

// ─── Formulario de nuevo activo ───────────────────────────────────────────────

interface NuevoActivoModalProps {
  clientes: User[];
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}

const NuevoActivoModal: React.FC<NuevoActivoModalProps> = ({ clientes, onClose, onSave }) => {
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [form, setForm] = useState({
    clientId: '', nombre: '', brand: '', model: '', serialNumber: '',
    installDate: '', warrantyExpires: '', ubicacion: '', notes: '',
  });

  const handleSave = async () => {
    if (!form.clientId) { setErr('Selecciona un cliente'); return; }
    if (!form.serialNumber.trim()) { setErr('El número de serie es obligatorio'); return; }
    setSaving(true); setErr('');
    try { await onSave(form); onClose(); }
    catch (e: any) { setErr(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-cyan-500 to-teal-600 rounded-t-2xl text-white">
          <div className="flex items-center gap-2">
            <Monitor size={18} />
            <h2 className="font-bold text-lg">Nuevo Activo</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"><X size={16} /></button>
        </div>
        <div className="p-6 space-y-4">
          {err && <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-700 text-sm"><AlertCircle size={14} />{err}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Cliente *</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-400 outline-none"
                value={form.clientId} onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))}>
                <option value="">— Seleccionar cliente —</option>
                {clientes.filter(c => c.role === 'client').map(c => (
                  <option key={c.id} value={c.id}>{c.company || c.name}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Nombre / Descripción</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-400 outline-none"
                placeholder="Ej: Impresora gran formato Planta 2"
                value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Marca</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-400 outline-none"
                value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Modelo</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-400 outline-none"
                value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Número de Serie *</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-400 outline-none font-mono"
                value={form.serialNumber} onChange={e => setForm(f => ({ ...f, serialNumber: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Ubicación</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-400 outline-none"
                placeholder="Almacén, delegación, planta…"
                value={form.ubicacion} onChange={e => setForm(f => ({ ...f, ubicacion: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Fecha de instalación</label>
              <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-400 outline-none"
                value={form.installDate} onChange={e => setForm(f => ({ ...f, installDate: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Garantía hasta</label>
              <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-400 outline-none"
                value={form.warrantyExpires} onChange={e => setForm(f => ({ ...f, warrantyExpires: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Notas</label>
              <textarea rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-400 outline-none resize-none"
                value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 font-semibold disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Guardar activo
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Panel de detalle de activo ────────────────────────────────────────────────

interface ActivoDetalleProps {
  activo: Activo;
  onClose: () => void;
  onUpdateEstado: (id: string, estado: 'active' | 'inactive' | 'decommissioned') => Promise<void>;
}

const ActivoDetalle: React.FC<ActivoDetalleProps> = ({ activo: initial, onClose, onUpdateEstado }) => {
  const [activeDetalle, setActiveDetalle] = useState(initial);
  const [tab, setTab] = useState<'info' | 'incidents' | 'workorders'>('info');
  const [loading, setLoading] = useState(false);
  const { loadActivoDetalle } = useActivos();

  useEffect(() => {
    setLoading(true);
    loadActivoDetalle(initial.id).then(full => {
      if (full) setActiveDetalle(full);
      setLoading(false);
    });
  }, [initial.id]);

  const statusCfg = STATUS_CONFIG[activeDetalle.status] || STATUS_CONFIG.active;
  const openInc = (activeDetalle.incidents || []).filter(i => i.status !== 'closed');
  const openWO  = (activeDetalle.workOrders || []).filter(w => w.status !== 'closed');

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 border-b border-slate-100">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${statusCfg.bg} ${statusCfg.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                {statusCfg.label}
              </span>
              {activeDetalle.numeroActivo && (
                <span className="font-mono text-xs font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-full">
                  {activeDetalle.numeroActivo}
                </span>
              )}
            </div>
            <h2 className="font-bold text-slate-900">
              {activeDetalle.nombre || `${activeDetalle.brand || ''} ${activeDetalle.model || ''}`.trim() || 'Activo'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">{activeDetalle.clientName}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700"><X size={16} /></button>
        </div>

        {/* Contadores rápidos */}
        <div className="flex gap-3 mt-3">
          <button onClick={() => setTab('incidents')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${tab === 'incidents' ? 'bg-amber-100 text-amber-700' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>
            <AlertTriangle size={12} />
            {openInc.length} incid. abiertas
          </button>
          <button onClick={() => setTab('workorders')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${tab === 'workorders' ? 'bg-blue-100 text-blue-700' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>
            <Wrench size={12} />
            {openWO.length} OTs abiertas
          </button>
          <button onClick={() => setTab('info')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${tab === 'info' ? 'bg-cyan-100 text-cyan-700' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>
            <Settings size={12} />
            Datos
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {loading ? (
          <div className="flex items-center justify-center py-10"><Loader2 className="animate-spin text-cyan-500" size={24} /></div>
        ) : (
          <>
            {/* Info */}
            {tab === 'info' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <InfoField label="Marca"       value={activeDetalle.brand || '—'} />
                  <InfoField label="Modelo"      value={activeDetalle.model || '—'} />
                  <InfoField label="N.º serie"   value={activeDetalle.serialNumber} mono />
                  <InfoField label="Ubicación"   value={activeDetalle.ubicacion || '—'} />
                  <InfoField label="Instalación" value={activeDetalle.installDate || '—'} />
                  <InfoField label="Garantía"    value={activeDetalle.warrantyExpires || '—'} />
                </div>
                {activeDetalle.notes && (
                  <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600">{activeDetalle.notes}</div>
                )}
                {/* Cambio estado */}
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Cambiar estado</div>
                  <div className="flex gap-2">
                    {(['active', 'inactive', 'decommissioned'] as const).map(s => {
                      const cfg = STATUS_CONFIG[s];
                      return (
                        <button key={s} onClick={() => onUpdateEstado(activeDetalle.id, s)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${activeDetalle.status === s ? `${cfg.bg} ${cfg.text} border-transparent` : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                          <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Incidencias */}
            {tab === 'incidents' && (
              <div className="space-y-2">
                {(activeDetalle.incidents || []).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                    <CheckCircle size={28} className="mb-2 opacity-40" />
                    <p className="text-sm">Sin incidencias registradas</p>
                  </div>
                ) : (activeDetalle.incidents || []).map(inc => {
                  const sc = INC_STATUS[inc.status] || INC_STATUS.pending;
                  return (
                    <div key={inc.id} className="rounded-lg border border-slate-200 px-4 py-3">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-mono text-xs font-bold text-slate-700">{inc.reference}</span>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${SEV_CONFIG[inc.severity]}`}>
                            {inc.severity}
                          </span>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${sc.color}`}>
                            {sc.label}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-2">{inc.description}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{new Date(inc.createdAt).toLocaleDateString('es-ES')}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Órdenes de trabajo */}
            {tab === 'workorders' && (
              <div className="space-y-2">
                {(activeDetalle.workOrders || []).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                    <CheckCircle size={28} className="mb-2 opacity-40" />
                    <p className="text-sm">Sin órdenes de trabajo</p>
                  </div>
                ) : (activeDetalle.workOrders || []).map(wo => {
                  const sc = INC_STATUS[wo.status] || INC_STATUS.pending;
                  return (
                    <div key={wo.id} className="rounded-lg border border-slate-200 px-4 py-3">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-mono text-xs font-bold text-slate-700">{wo.reference}</span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${sc.color}`}>{sc.label}</span>
                      </div>
                      {wo.diagnosis && <p className="text-xs text-slate-600 line-clamp-2">{wo.diagnosis}</p>}
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400">
                        {wo.technicianName && <span>{wo.technicianName}</span>}
                        {wo.scheduledDate && <span>{new Date(wo.scheduledDate).toLocaleDateString('es-ES')}</span>}
                        <span className="font-semibold text-slate-600">Total: {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(wo.total)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const InfoField: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono }) => (
  <div>
    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">{label}</div>
    <div className={`text-sm font-medium text-slate-700 ${mono ? 'font-mono' : ''}`}>{value}</div>
  </div>
);

// ─── Vista principal ───────────────────────────────────────────────────────────

interface ActivosViewProps {
  currentUser: User;
  clientes: User[];
}

export const ActivosView: React.FC<ActivosViewProps> = ({ currentUser, clientes }) => {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'' | 'active' | 'inactive' | 'decommissioned'>('');
  const [selected, setSelected] = useState<Activo | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);

  const { activos, loading, error, loadActivos, createActivo, updateActivo } = useActivos();

  useEffect(() => { loadActivos(); }, []);

  const filtrados = useMemo(() => {
    const q = search.toLowerCase();
    return activos.filter(a => {
      if (filterStatus && a.status !== filterStatus) return false;
      if (q.length >= 2) {
        const hay = [a.numeroActivo, a.nombre, a.brand, a.model, a.serialNumber, a.clientName]
          .filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [activos, search, filterStatus]);

  const canEdit = ['admin', 'tech_lead', 'administracion', 'direccion'].includes(currentUser.role);

  const handleUpdateEstado = async (id: string, estado: 'active' | 'inactive' | 'decommissioned') => {
    await updateActivo(id, { status: estado });
    if (selected?.id === id) {
      setSelected(prev => prev ? { ...prev, status: estado } : null);
    }
  };

  return (
    <div className="flex h-full gap-4 p-4 bg-slate-50">

      {/* ── Panel izquierdo: lista ─────────────────────────────── */}
      <div className={`flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all ${selected ? 'w-[42%] min-w-[320px]' : 'flex-1'}`}>

        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 text-white shadow">
                <Monitor size={18} />
              </div>
              <div>
                <h1 className="font-bold text-slate-900">Activos de Cliente</h1>
                <p className="text-xs text-slate-500">{filtrados.length} de {activos.length} equipos</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={loadActivos} className="p-1.5 text-slate-400 hover:text-slate-700 border border-slate-200 rounded-xl">
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
              {canEdit && (
                <button onClick={() => setShowNewModal(true)}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-500 to-teal-600 text-white px-3 py-1.5 rounded-xl text-xs font-semibold hover:opacity-90 shadow-sm">
                  <Plus size={13} /> Nuevo
                </button>
              )}
            </div>
          </div>

          {/* KPIs */}
          <div className="flex gap-2 mb-3">
            {([
              { label: 'Activos',    count: activos.filter(a => a.status === 'active').length,         color: 'bg-emerald-50 text-emerald-700' },
              { label: 'Inactivos',  count: activos.filter(a => a.status === 'inactive').length,       color: 'bg-amber-50 text-amber-700' },
              { label: 'Con avería', count: activos.reduce((s, a) => s + (a.incidenciasAbiertas || 0), 0), color: 'bg-red-50 text-red-600' },
            ] as const).map((k, i) => (
              <div key={i} className={`rounded-xl px-3 py-1.5 text-xs font-semibold flex-shrink-0 ${k.color}`}>
                <span className="opacity-70">{k.label} </span>{k.count}
              </div>
            ))}
          </div>

          {/* Filtros */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-xl w-full outline-none focus:ring-2 focus:ring-cyan-300"
                placeholder="Buscar equipo, cliente, serie…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select
              className="text-xs border border-slate-200 rounded-xl px-2 py-1.5 bg-white outline-none focus:ring-2 focus:ring-cyan-300"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as any)}
            >
              <option value="">Todos</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
              <option value="decommissioned">Baja</option>
            </select>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-4 mt-3 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-red-700 text-xs">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin text-cyan-500" size={24} /></div>
          ) : filtrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Monitor size={36} className="mb-3 opacity-40" />
              <p className="text-sm">No hay activos registrados</p>
              {canEdit && <button onClick={() => setShowNewModal(true)} className="mt-3 text-xs text-cyan-600 font-semibold hover:underline">+ Registrar primer activo</button>}
            </div>
          ) : (
            filtrados.map(a => {
              const sc = STATUS_CONFIG[a.status] || STATUS_CONFIG.active;
              const isSelected = selected?.id === a.id;
              const hasAlert = (a.incidenciasAbiertas || 0) > 0 || (a.otAbiertas || 0) > 0;
              return (
                <button
                  key={a.id}
                  onClick={() => setSelected(isSelected ? null : a)}
                  className={`w-full text-left flex items-center gap-3 px-4 py-3 border-b border-slate-50 transition-colors group ${isSelected ? 'bg-cyan-50' : 'hover:bg-slate-50/70'}`}
                >
                  <div className={`w-1 h-12 rounded-full flex-shrink-0 ${isSelected ? 'bg-cyan-500' : 'bg-slate-200 group-hover:bg-cyan-300'} transition-colors`} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {a.numeroActivo && <span className="font-mono text-[10px] font-bold text-cyan-700 bg-cyan-50 px-1.5 py-0.5 rounded">{a.numeroActivo}</span>}
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>{sc.label}</span>
                      {hasAlert && <AlertTriangle size={11} className="text-amber-500 flex-shrink-0" />}
                    </div>
                    <div className="font-semibold text-sm text-slate-800 truncate">
                      {a.nombre || `${a.brand || ''} ${a.model || ''}`.trim() || 'Sin nombre'}
                    </div>
                    <div className="text-xs text-slate-400 truncate">{a.clientName} {a.serialNumber ? `· SN: ${a.serialNumber}` : ''}</div>
                  </div>

                  <div className="text-right flex-shrink-0 text-[11px] text-slate-400">
                    {(a.incidenciasAbiertas || 0) > 0 && (
                      <div className="flex items-center gap-1 text-amber-600 font-semibold justify-end">
                        <AlertTriangle size={10} /> {a.incidenciasAbiertas} incid.
                      </div>
                    )}
                    {(a.otAbiertas || 0) > 0 && (
                      <div className="flex items-center gap-1 text-blue-600 font-semibold justify-end">
                        <Wrench size={10} /> {a.otAbiertas} OTs
                      </div>
                    )}
                  </div>

                  <ChevronRight size={14} className={`flex-shrink-0 ${isSelected ? 'text-cyan-500' : 'text-slate-300 group-hover:text-slate-500'} transition-colors`} />
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Panel derecho: detalle ─────────────────────────────── */}
      {selected && (
        <div className="flex-1 min-w-0 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <ActivoDetalle
            activo={selected}
            onClose={() => setSelected(null)}
            onUpdateEstado={handleUpdateEstado}
          />
        </div>
      )}

      {/* ── Placeholder ───────────────────────────────────────── */}
      {!selected && (
        <div className="hidden lg:flex flex-1 items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white/50 text-slate-400">
          <div className="text-center">
            <Monitor size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">Selecciona un activo</p>
            <p className="text-xs mt-1 opacity-60">para ver incidencias y órdenes de trabajo</p>
          </div>
        </div>
      )}

      {/* ── Modal nuevo activo ─────────────────────────────────── */}
      {showNewModal && (
        <NuevoActivoModal
          clientes={clientes}
          onClose={() => setShowNewModal(false)}
          onSave={createActivo}
        />
      )}
    </div>
  );
};
