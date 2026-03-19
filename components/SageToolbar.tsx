import React from 'react';
import { LucideIcon } from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface SageBtn {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'primary' | 'danger';
  title?: string;
}

interface SageToolbarProps {
  /** Grupos de botones separados por divisor vertical */
  groups: SageBtn[][];
  /** Botones en el lado derecho (exportar, imprimir, actualizar) */
  rightActions?: SageBtn[];
  /** Barra de filtros debajo del toolbar */
  filter?: React.ReactNode;
  /** Contador de registros abajo a la derecha */
  recordCount?: number;
  recordLabel?: string;
}

// ─── Button styles ────────────────────────────────────────────────────────────

const BTN: Record<string, string> = {
  default: [
    'flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-medium',
    'text-slate-600 rounded',
    'border border-transparent',
    'hover:bg-slate-100 hover:text-slate-900 hover:border-slate-200',
    'disabled:opacity-40 disabled:cursor-not-allowed',
    'transition-colors whitespace-nowrap',
  ].join(' '),
  primary: [
    'flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-semibold',
    'bg-blue-600 text-white rounded',
    'border border-blue-700',
    'hover:bg-blue-700',
    'disabled:opacity-40 disabled:cursor-not-allowed',
    'transition-colors whitespace-nowrap',
  ].join(' '),
  danger: [
    'flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-medium',
    'text-red-600 rounded',
    'border border-transparent',
    'hover:bg-red-50 hover:border-red-200',
    'disabled:opacity-40 disabled:cursor-not-allowed',
    'transition-colors whitespace-nowrap',
  ].join(' '),
};

// ─── SageToolbar ──────────────────────────────────────────────────────────────

export const SageToolbar: React.FC<SageToolbarProps> = ({
  groups,
  rightActions = [],
  filter,
  recordCount,
  recordLabel = 'registros',
}) => {
  return (
    <div className="shrink-0">
      {/* ── Toolbar strip ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between bg-white border-b border-slate-200 px-2 py-0.5 min-h-[32px]">
        {/* Left: action groups */}
        <div className="flex items-center gap-0.5">
          {groups.map((group, gi) => (
            <React.Fragment key={gi}>
              {group.map((btn, bi) => {
                const Icon = btn.icon;
                return (
                  <button
                    key={bi}
                    onClick={btn.onClick}
                    disabled={btn.disabled}
                    title={btn.title ?? btn.label}
                    className={BTN[btn.variant ?? 'default']}
                  >
                    <Icon size={13} />
                    {btn.label}
                  </button>
                );
              })}
              {/* Separador entre grupos */}
              {gi < groups.length - 1 && (
                <div className="w-px h-4 bg-slate-200 mx-1 self-center" />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Right: utility actions */}
        {rightActions.length > 0 && (
          <div className="flex items-center gap-0.5 ml-auto">
            <div className="w-px h-4 bg-slate-200 mx-1 self-center" />
            {rightActions.map((btn, i) => {
              const Icon = btn.icon;
              return (
                <button
                  key={i}
                  onClick={btn.onClick}
                  disabled={btn.disabled}
                  title={btn.title ?? btn.label}
                  className={BTN[btn.variant ?? 'default']}
                >
                  <Icon size={13} />
                  {btn.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Filter bar (optional) ─────────────────────────────────────────── */}
      {filter && (
        <div className="flex items-center gap-2 bg-[#f5f6fa] border-b border-slate-200 px-3 py-1.5">
          {filter}
        </div>
      )}

      {/* ── Record count (optional, bottom strip) ────────────────────────── */}
      {recordCount !== undefined && (
        <div className="flex items-center justify-end bg-white border-b border-slate-100 px-3 py-0.5">
          <span className="text-[11px] text-slate-400">
            {recordCount} {recordLabel}
          </span>
        </div>
      )}
    </div>
  );
};

// ─── SageTableHeader ──────────────────────────────────────────────────────────
// Estilos compartidos para th SAGE-style

export const sageTh = 'px-2 py-1.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide select-none whitespace-nowrap';
export const sageThR = 'px-2 py-1.5 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wide select-none whitespace-nowrap';

// ─── SageRow ──────────────────────────────────────────────────────────────────
// Clase para fila de tabla SAGE: selección con borde izquierdo azul

export const sageRowClass = (selected: boolean, even: boolean) =>
  [
    'border-t border-slate-100 cursor-pointer transition-colors text-[12px]',
    selected
      ? 'bg-blue-50 border-l-[3px] border-l-blue-500'
      : even
        ? 'bg-slate-50/40 hover:bg-blue-50/30 border-l-[3px] border-l-transparent'
        : 'bg-white hover:bg-blue-50/30 border-l-[3px] border-l-transparent',
  ].join(' ');

// ─── SageModuleTab ────────────────────────────────────────────────────────────
// Tab strip estilo SAGE (más plano que el actual)

interface SageTabProps {
  tabs: { id: string; label: string; count?: number; icon?: LucideIcon }[];
  active: string;
  onChange: (id: string) => void;
}

export const SageTabStrip: React.FC<SageTabProps> = ({ tabs, active, onChange }) => (
  <div className="flex items-end bg-white border-b border-slate-300 px-2 gap-0 shrink-0">
    {tabs.map(t => {
      const Icon = t.icon;
      const isActive = t.id === active;
      return (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={[
            'flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium border-b-2 -mb-px transition-colors',
            isActive
              ? 'border-blue-600 text-blue-700 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 bg-transparent',
          ].join(' ')}
        >
          {Icon && <Icon size={13} />}
          {t.label}
          {t.count !== undefined && (
            <span className={`ml-1 px-1.5 py-0 rounded text-[10px] font-semibold ${isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
              {t.count}
            </span>
          )}
        </button>
      );
    })}
  </div>
);

// ─── SageFilterInput ──────────────────────────────────────────────────────────

interface SageFilterInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  width?: string;
}

export const SageFilterInput: React.FC<SageFilterInputProps> = ({
  value, onChange, placeholder = 'Buscar…', width = 'w-52',
}) => (
  <div className={`relative ${width}`}>
    <svg className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full pl-7 pr-2 py-0.5 text-[12px] border border-slate-300 rounded bg-white focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
    />
  </div>
);

// ─── SageSelect ───────────────────────────────────────────────────────────────

interface SageSelectProps {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  width?: string;
}

export const SageSelect: React.FC<SageSelectProps> = ({
  value, onChange, options, width = 'w-36',
}) => (
  <select
    value={value}
    onChange={e => onChange(e.target.value)}
    className={`${width} py-0.5 px-2 text-[12px] border border-slate-300 rounded bg-white focus:outline-none focus:border-blue-400`}
  >
    {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
);
