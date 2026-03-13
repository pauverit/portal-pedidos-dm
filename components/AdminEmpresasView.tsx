import React, { useState } from 'react';
import {
  Building2, MapPin, Phone, Mail, Globe, Hash,
  Warehouse, ChevronDown, ChevronRight, Edit2, Check, X,
  RefreshCw, AlertCircle, Loader2
} from 'lucide-react';
import { useEmpresaData } from '../hooks/useEmpresaData';
import { Empresa, Delegacion, Almacen } from '../types';

// ─── Inline-edit field ───────────────────────────────────────────────────────

interface EditableFieldProps {
  label: string;
  value?: string;
  onSave: (v: string) => Promise<void>;
  icon?: React.ReactNode;
  placeholder?: string;
}

const EditableField: React.FC<EditableFieldProps> = ({ label, value, onSave, icon, placeholder }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(draft);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setDraft(value || '');
    setEditing(false);
  };

  return (
    <div className="flex items-start gap-2 py-1 group">
      {icon && <span className="mt-0.5 text-slate-400 shrink-0">{icon}</span>}
      <div className="flex-1 min-w-0">
        <span className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</span>
        {editing ? (
          <div className="flex items-center gap-1 mt-0.5">
            <input
              autoFocus
              className="flex-1 text-sm border border-blue-300 rounded px-2 py-0.5 outline-none focus:ring-1 focus:ring-blue-400"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel(); }}
              placeholder={placeholder}
            />
            {saving
              ? <Loader2 size={14} className="animate-spin text-blue-500" />
              : (
                <>
                  <button onClick={handleSave} className="text-green-600 hover:text-green-800"><Check size={14} /></button>
                  <button onClick={handleCancel} className="text-red-400 hover:text-red-600"><X size={14} /></button>
                </>
              )
            }
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <p className="text-sm text-slate-800 truncate">{value || <span className="italic text-slate-400">{placeholder || '—'}</span>}</p>
            <button
              onClick={() => { setDraft(value || ''); setEditing(true); }}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-slate-700 ml-1"
            >
              <Edit2 size={12} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Almacén card ─────────────────────────────────────────────────────────────

const AlmacenCard: React.FC<{
  almacen: Almacen;
  onUpdate: (id: string, changes: Partial<Almacen>) => Promise<void>;
}> = ({ almacen, onUpdate }) => (
  <div className={`bg-white border rounded-lg p-3 ${almacen.activo ? 'border-slate-200' : 'border-slate-100 opacity-60'}`}>
    <div className="flex items-center gap-2 mb-2">
      <Warehouse size={14} className="text-amber-500 shrink-0" />
      <span className="font-semibold text-sm text-slate-800">{almacen.nombre}</span>
      <span className="ml-auto text-[10px] font-mono bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200">
        {almacen.codigo}
      </span>
    </div>
    <EditableField
      label="Nombre"
      value={almacen.nombre}
      icon={<Warehouse size={12} />}
      onSave={v => onUpdate(almacen.id, { nombre: v })}
    />
    <EditableField
      label="Descripción"
      value={almacen.descripcion}
      icon={<MapPin size={12} />}
      placeholder="Sin descripción"
      onSave={v => onUpdate(almacen.id, { descripcion: v })}
    />
    <EditableField
      label="Dirección"
      value={almacen.direccion}
      icon={<MapPin size={12} />}
      placeholder="Sin dirección"
      onSave={v => onUpdate(almacen.id, { direccion: v })}
    />
  </div>
);

// ─── Delegación card ──────────────────────────────────────────────────────────

const DelegacionCard: React.FC<{
  delegacion: Delegacion;
  almacenes: Almacen[];
  onUpdateDel: (id: string, changes: Partial<Delegacion>) => Promise<void>;
  onUpdateAlm: (id: string, changes: Partial<Almacen>) => Promise<void>;
}> = ({ delegacion, almacenes, onUpdateDel, onUpdateAlm }) => {
  const [expanded, setExpanded] = useState(true);
  const delAlmacenes = almacenes.filter(a => a.delegacionId === delegacion.id);

  return (
    <div className={`border rounded-xl overflow-hidden ${delegacion.activa ? 'border-slate-200' : 'border-slate-100 opacity-60'}`}>
      {/* Header */}
      <button
        className="w-full flex items-center gap-3 px-3 py-2 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
        onClick={() => setExpanded(v => !v)}
      >
        <MapPin size={16} className="text-blue-500 shrink-0" />
        <div className="flex-1">
          <span className="font-semibold text-slate-800">{delegacion.nombre}</span>
          {delegacion.ciudad && (
            <span className="ml-2 text-xs text-slate-500">{delegacion.ciudad}, {delegacion.provincia}</span>
          )}
        </div>
        <span className="text-[10px] font-mono bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">
          {delegacion.codigo}
        </span>
        <span className="text-[10px] text-slate-400">{delAlmacenes.length} almacén{delAlmacenes.length !== 1 ? 'es' : ''}</span>
        {expanded ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
      </button>

      {expanded && (
        <div className="px-3 py-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Datos delegación */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Datos de la delegación</p>
            <EditableField label="Nombre" value={delegacion.nombre}
              icon={<MapPin size={12} />} onSave={v => onUpdateDel(delegacion.id, { nombre: v })} />
            <EditableField label="Ciudad" value={delegacion.ciudad}
              icon={<MapPin size={12} />} onSave={v => onUpdateDel(delegacion.id, { ciudad: v })} />
            <EditableField label="Provincia" value={delegacion.provincia}
              icon={<MapPin size={12} />} onSave={v => onUpdateDel(delegacion.id, { provincia: v })} />
            <EditableField label="Dirección" value={delegacion.direccion}
              icon={<MapPin size={12} />} placeholder="Sin dirección"
              onSave={v => onUpdateDel(delegacion.id, { direccion: v })} />
            <EditableField label="CP" value={delegacion.cp}
              icon={<Hash size={12} />} placeholder="Código postal"
              onSave={v => onUpdateDel(delegacion.id, { cp: v })} />
            <EditableField label="Teléfono" value={delegacion.telefono}
              icon={<Phone size={12} />} placeholder="Sin teléfono"
              onSave={v => onUpdateDel(delegacion.id, { telefono: v })} />
            <EditableField label="Email" value={delegacion.email}
              icon={<Mail size={12} />} placeholder="Sin email"
              onSave={v => onUpdateDel(delegacion.id, { email: v })} />
          </div>

          {/* Almacenes */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Almacenes</p>
            <div className="space-y-2">
              {delAlmacenes.length > 0
                ? delAlmacenes.map(a => (
                  <AlmacenCard key={a.id} almacen={a} onUpdate={onUpdateAlm} />
                ))
                : <p className="text-sm text-slate-400 italic">Sin almacenes asignados</p>
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Empresa card ─────────────────────────────────────────────────────────────

const EmpresaCard: React.FC<{
  empresa: Empresa;
  delegaciones: Delegacion[];
  almacenes: Almacen[];
  onUpdateEmp: (id: string, changes: Partial<Empresa>) => Promise<void>;
  onUpdateDel: (id: string, changes: Partial<Delegacion>) => Promise<void>;
  onUpdateAlm: (id: string, changes: Partial<Almacen>) => Promise<void>;
}> = ({ empresa, delegaciones, almacenes, onUpdateEmp, onUpdateDel, onUpdateAlm }) => {
  const empDelegaciones = delegaciones.filter(d => d.empresaId === empresa.id);

  return (
    <div className={`border-2 rounded-2xl overflow-hidden ${empresa.activa ? 'border-slate-200' : 'border-slate-100 opacity-60'}`}>
      {/* Cabecera empresa */}
      <div className="bg-slate-900 text-white px-3 py-2 flex items-center gap-3">
        <Building2 size={22} className="text-white/70 shrink-0" />
        <div className="flex-1">
          <h2 className="font-bold text-base leading-tight">{empresa.razonSocial}</h2>
          <p className="text-white/60 text-xs">{empresa.nombre}</p>
        </div>
        <div className="text-right">
          <span className="font-mono text-sm bg-white/10 px-3 py-1 rounded-lg border border-white/20">
            {empresa.cif}
          </span>
          <p className="text-white/50 text-[10px] mt-1">
            {empDelegaciones.length} delegación{empDelegaciones.length !== 1 ? 'es' : ''}
          </p>
        </div>
      </div>

      {/* Datos fiscales */}
      <div className="px-3 py-2 grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-0 border-b border-slate-100 bg-white">
        <EditableField label="Razón social" value={empresa.razonSocial}
          icon={<Building2 size={12} />} onSave={v => onUpdateEmp(empresa.id, { razonSocial: v })} />
        <EditableField label="CIF" value={empresa.cif}
          icon={<Hash size={12} />} onSave={v => onUpdateEmp(empresa.id, { cif: v })} />
        <EditableField label="Dirección" value={empresa.direccion}
          icon={<MapPin size={12} />} placeholder="Sin dirección"
          onSave={v => onUpdateEmp(empresa.id, { direccion: v })} />
        <EditableField label="CP" value={empresa.cp}
          icon={<Hash size={12} />} placeholder="Código postal"
          onSave={v => onUpdateEmp(empresa.id, { cp: v })} />
        <EditableField label="Ciudad" value={empresa.ciudad}
          icon={<MapPin size={12} />} onSave={v => onUpdateEmp(empresa.id, { ciudad: v })} />
        <EditableField label="Provincia" value={empresa.provincia}
          icon={<MapPin size={12} />} onSave={v => onUpdateEmp(empresa.id, { provincia: v })} />
        <EditableField label="Teléfono" value={empresa.telefono}
          icon={<Phone size={12} />} placeholder="Sin teléfono"
          onSave={v => onUpdateEmp(empresa.id, { telefono: v })} />
        <EditableField label="Email" value={empresa.email}
          icon={<Mail size={12} />} placeholder="Sin email"
          onSave={v => onUpdateEmp(empresa.id, { email: v })} />
        <EditableField label="Web" value={empresa.web}
          icon={<Globe size={12} />} placeholder="Sin web"
          onSave={v => onUpdateEmp(empresa.id, { web: v })} />
        <EditableField label="IBAN" value={empresa.iban}
          icon={<Hash size={12} />} placeholder="Sin IBAN"
          onSave={v => onUpdateEmp(empresa.id, { iban: v })} />
      </div>

      {/* Delegaciones */}
      <div className="p-4 bg-slate-50 space-y-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-1">
          Delegaciones ({empDelegaciones.length})
        </p>
        {empDelegaciones.map(del => (
          <DelegacionCard
            key={del.id}
            delegacion={del}
            almacenes={almacenes}
            onUpdateDel={onUpdateDel}
            onUpdateAlm={onUpdateAlm}
          />
        ))}
        {empDelegaciones.length === 0 && (
          <p className="text-sm text-slate-400 italic px-1">Sin delegaciones</p>
        )}
      </div>
    </div>
  );
};

// ─── Vista principal ──────────────────────────────────────────────────────────

export const AdminEmpresasView: React.FC = () => {
  const {
    empresas, delegaciones, almacenes, loading, error,
    reload, updateEmpresa, updateDelegacion, updateAlmacen,
  } = useEmpresaData();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Loader2 size={28} className="animate-spin text-slate-400" />
        <span className="ml-3 text-slate-500">Cargando estructura de empresa…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
        <AlertCircle size={20} />
        <div>
          <p className="font-semibold">Error cargando datos</p>
          <p className="text-sm">{error}</p>
          <p className="text-xs mt-1 text-red-500">
            Asegúrate de haber ejecutado <code className="bg-red-100 px-1 rounded">paso1_estructura_base.sql</code> en Supabase.
          </p>
        </div>
        <button onClick={reload} className="ml-auto text-red-500 hover:text-red-700">
          <RefreshCw size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Estructura Empresarial</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {empresas.length} empresa{empresas.length !== 1 ? 's' : ''} ·
            {' '}{delegaciones.length} delegacion{delegaciones.length !== 1 ? 'es' : ''} ·
            {' '}{almacenes.length} almacén{almacenes.length !== 1 ? 'es' : ''}
          </p>
        </div>
        <button
          onClick={reload}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg transition-colors"
        >
          <RefreshCw size={14} /> Recargar
        </button>
      </div>

      {/* Tip edición */}
      <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-blue-700 text-sm">
        <Edit2 size={14} className="shrink-0" />
        <span>Pasa el ratón sobre cualquier campo para editarlo. Los cambios se guardan automáticamente en Supabase.</span>
      </div>

      {/* Empresas */}
      {empresas.map(emp => (
        <EmpresaCard
          key={emp.id}
          empresa={emp}
          delegaciones={delegaciones}
          almacenes={almacenes}
          onUpdateEmp={updateEmpresa}
          onUpdateDel={updateDelegacion}
          onUpdateAlm={updateAlmacen}
        />
      ))}

      {empresas.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <Building2 size={40} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">No hay empresas registradas</p>
          <p className="text-sm mt-1">
            Ejecuta <code className="bg-slate-100 px-1 rounded">paso1_estructura_base.sql</code> en Supabase para crear las empresas de Digital Market.
          </p>
        </div>
      )}
    </div>
  );
};
