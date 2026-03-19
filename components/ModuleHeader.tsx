import React from 'react';
import { LucideIcon } from 'lucide-react';

// ─── Paleta de colores por módulo ──────────────────────────────────────────
const PALETTE = {
  blue:   { from: 'from-blue-800',   to: 'to-blue-700',   icon: 'text-blue-200',   badge: 'bg-blue-900/40'  },
  indigo: { from: 'from-indigo-800', to: 'to-indigo-700', icon: 'text-indigo-200', badge: 'bg-indigo-900/40' },
  green:  { from: 'from-green-800',  to: 'to-green-700',  icon: 'text-green-200',  badge: 'bg-green-900/40'  },
  violet: { from: 'from-violet-800', to: 'to-violet-700', icon: 'text-violet-200', badge: 'bg-violet-900/40' },
  orange: { from: 'from-orange-700', to: 'to-orange-600', icon: 'text-orange-200', badge: 'bg-orange-900/40' },
  rose:   { from: 'from-rose-800',   to: 'to-rose-700',   icon: 'text-rose-200',   badge: 'bg-rose-900/40'   },
  cyan:   { from: 'from-cyan-800',   to: 'to-cyan-700',   icon: 'text-cyan-200',   badge: 'bg-cyan-900/40'   },
  slate:  { from: 'from-slate-800',  to: 'to-slate-700',  icon: 'text-slate-300',  badge: 'bg-slate-900/40'  },
} as const;

type ModuleColor = keyof typeof PALETTE;

interface ModuleHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  color?: ModuleColor;
  actions?: React.ReactNode;
  /** Badge pequeño opcional (ej: nombre empresa, nº registros) */
  badge?: string;
}

export const ModuleHeader: React.FC<ModuleHeaderProps> = ({
  icon: Icon,
  title,
  subtitle,
  color = 'blue',
  actions,
  badge,
}) => {
  const p = PALETTE[color];

  return (
    <div className={`bg-gradient-to-r ${p.from} ${p.to} px-5 py-3.5 flex items-center justify-between gap-4 shrink-0`}>
      {/* Icono + textos */}
      <div className="flex items-center gap-3 min-w-0">
        <div className={`${p.badge} rounded-lg p-2 shrink-0`}>
          <Icon size={18} className={p.icon} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-white font-semibold text-[15px] leading-tight truncate">
              {title}
            </h1>
            {badge && (
              <span className={`${p.badge} text-white/70 text-[10px] font-medium px-1.5 py-0.5 rounded`}>
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-white/60 text-[11px] leading-tight truncate mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Acciones opcionales (botones, filtros, etc.) */}
      {actions && (
        <div className="flex items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
};
