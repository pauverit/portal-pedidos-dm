import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, Trash2, Search, Package, X } from 'lucide-react';
import { DocumentoLinea } from '../types';
import { calcularSubtotalLinea } from '../hooks/useVentas';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

interface ProductoSugerido {
  id: string;
  name: string;
  reference: string;
  price: number;
}

interface LineItemsEditorProps {
  lineas: DocumentoLinea[];
  onChange: (lineas: DocumentoLinea[]) => void;
  productos?: ProductoSugerido[];
  readonly?: boolean;
  ivaPorcentajeDefault?: number;
}

// ─── Combobox descripción + búsqueda de producto ──────────────────────────────

const DescripcionCombobox: React.FC<{
  value: string;
  productoId?: string;
  productos: ProductoSugerido[];
  onChange: (desc: string, prod?: ProductoSugerido) => void;
  disabled?: boolean;
}> = ({ value, productoId, productos, onChange, disabled }) => {
  const [open, setOpen]       = useState(false);
  const [query, setQuery]     = useState('');
  const inputRef              = useRef<HTMLInputElement>(null);
  const dropRef               = useRef<HTMLDivElement>(null);
  const wrapRef               = useRef<HTMLDivElement>(null);

  // Filtrar productos: usa query (que se sincroniza con lo que escribe el usuario)
  const filtered = productos
    .filter(p => {
      if (!query) return true;
      const q = query.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.reference.toLowerCase().includes(q);
    })
    .slice(0, 12);

  const handleSelect = (p: ProductoSugerido) => {
    onChange(p.name, p);
    setQuery('');
    setOpen(false);
  };

  const handleClearProduct = () => {
    onChange(value, undefined);
  };

  // Al escribir en el campo descripción → sincronizar query y abrir lista
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    onChange(v, undefined);
    setQuery(v);
    if (productos.length > 0) setOpen(v.length > 0);
  };

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (disabled) {
    return (
      <span className="text-sm text-slate-800 px-1">{value || '—'}</span>
    );
  }

  return (
    <div ref={wrapRef} className="relative w-full">
      <div className="flex items-center gap-1">
        {/* Campo descripción — al escribir abre sugerencias del catálogo */}
        <input
          ref={inputRef}
          className="flex-1 text-sm border-0 bg-transparent outline-none focus:bg-slate-50 focus:rounded px-1 py-0.5 min-w-0"
          value={value}
          onChange={handleDescriptionChange}
          onFocus={() => { if (productos.length > 0 && value.length > 0) { setQuery(value); setOpen(true); } }}
          placeholder="Descripción o busca artículo…"
          autoComplete="off"
        />

        {/* Botón lupa: abre/cierra la lista (para ver todos o limpiar) */}
        {productos.length > 0 && (
          <button
            type="button"
            onMouseDown={e => { e.preventDefault(); setOpen(o => !o); if (!open) setQuery(''); }}
            title="Ver catálogo de artículos"
            className={`shrink-0 p-1 rounded transition-colors ${
              open
                ? 'bg-blue-600 text-white'
                : productoId
                  ? 'bg-green-100 text-green-600 hover:bg-green-200'
                  : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
            }`}
          >
            {open ? <X size={13} /> : <Search size={13} />}
          </button>
        )}
      </div>

      {/* Lista de sugerencias — se muestra al escribir O al pulsar la lupa */}
      {open && (
        <div
          ref={dropRef}
          className="absolute z-50 top-full left-0 mt-1 w-80 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
        >
          {/* Cabecera: muestra el filtro activo */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-slate-50">
            <Search size={13} className="text-slate-400 shrink-0" />
            <span className="flex-1 text-sm text-slate-500 truncate">
              {query ? <>Resultados para <strong className="text-slate-700">"{query}"</strong></> : 'Todos los artículos'}
            </span>
            {query && (
              <button onMouseDown={e => { e.preventDefault(); setQuery(''); onChange('', undefined); }} className="text-slate-400 hover:text-slate-600">
                <X size={12} />
              </button>
            )}
          </div>

          {/* Lista de productos */}
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-center text-slate-400 text-sm">
                <Package size={20} className="mx-auto mb-1 opacity-50" />
                Sin resultados para "{query}"
              </div>
            ) : (
              filtered.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onMouseDown={e => { e.preventDefault(); handleSelect(p); }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-blue-50 transition-colors group border-b border-slate-50"
                >
                  <div className="w-8 h-8 bg-slate-100 group-hover:bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                    <Package size={13} className="text-slate-400 group-hover:text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800 font-medium truncate">{p.name}</p>
                    <p className="text-xs text-slate-400">{p.reference}</p>
                  </div>
                  <span className="text-xs font-semibold text-slate-600 shrink-0 font-mono">
                    {p.price > 0 ? fmt(p.price) : '—'}
                  </span>
                </button>
              ))
            )}
          </div>

          {/* Footer info */}
          <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100">
            <p className="text-[10px] text-slate-400">
              {filtered.length} producto{filtered.length !== 1 ? 's' : ''}{query ? ` para "${query}"` : ' disponibles'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Fila editable ────────────────────────────────────────────────────────────

interface FilaProps {
  linea: DocumentoLinea;
  index: number;
  productos: ProductoSugerido[];
  onUpdate: (index: number, changes: Partial<DocumentoLinea>) => void;
  onDelete: (index: number) => void;
  readonly?: boolean;
}

const FilaLinea: React.FC<FilaProps> = ({ linea, index, productos, onUpdate, onDelete, readonly }) => {

  const handleSelectProduct = (desc: string, prod?: ProductoSugerido) => {
    if (prod) {
      onUpdate(index, {
        productoId: prod.id,
        descripcion: prod.name,
        precioUnitario: prod.price,
        subtotal: calcularSubtotalLinea({ cantidad: linea.cantidad, precioUnitario: prod.price, descuento: linea.descuento }),
      });
    } else {
      onUpdate(index, { descripcion: desc, productoId: undefined });
    }
  };

  const handleNumeric = (field: keyof DocumentoLinea, raw: string) => {
    const val = parseFloat(raw) || 0;
    const updated: Partial<DocumentoLinea> = { [field]: val };
    const nextLin = { ...linea, ...updated };
    updated.subtotal = calcularSubtotalLinea(nextLin);
    onUpdate(index, updated);
  };

  if (readonly) {
    return (
      <tr className="border-t border-slate-100">
        <td className="px-3 py-2 text-xs text-slate-400 w-8">{index + 1}</td>
        <td className="px-3 py-2 text-sm text-slate-800">{linea.descripcion}</td>
        <td className="px-3 py-2 text-sm text-right">{linea.cantidad}</td>
        <td className="px-3 py-2 text-sm text-right font-mono">{fmt(linea.precioUnitario)}</td>
        <td className="px-3 py-2 text-sm text-right">{linea.descuento > 0 ? `${linea.descuento}%` : '—'}</td>
        <td className="px-3 py-2 text-sm text-right">{linea.ivaPorcentaje}%</td>
        <td className="px-3 py-2 text-sm font-semibold text-right font-mono">{fmt(linea.subtotal)}</td>
      </tr>
    );
  }

  return (
    <tr className="border-t border-slate-100 group hover:bg-blue-50/30 transition-colors">
      <td className="px-2 py-2 text-xs text-slate-400 w-8 text-center font-mono">{index + 1}</td>

      {/* Descripción con buscador integrado */}
      <td className="px-2 py-1.5">
        <DescripcionCombobox
          value={linea.descripcion}
          productoId={linea.productoId}
          productos={productos}
          onChange={handleSelectProduct}
        />
      </td>

      {/* Cantidad */}
      <td className="px-2 py-1.5 w-20">
        <input
          type="number" min="0" step="0.001"
          className="w-full text-sm text-right bg-transparent outline-none focus:bg-white focus:border focus:border-blue-300 focus:rounded px-1 py-0.5"
          value={linea.cantidad}
          onChange={e => handleNumeric('cantidad', e.target.value)}
        />
      </td>

      {/* Precio unitario */}
      <td className="px-2 py-1.5 w-28">
        <input
          type="number" min="0" step="0.01"
          className="w-full text-sm text-right font-mono bg-transparent outline-none focus:bg-white focus:border focus:border-blue-300 focus:rounded px-1 py-0.5"
          value={linea.precioUnitario}
          onChange={e => handleNumeric('precioUnitario', e.target.value)}
        />
      </td>

      {/* Descuento % */}
      <td className="px-2 py-1.5 w-20">
        <div className="flex items-center gap-0.5">
          <input
            type="number" min="0" max="100" step="0.5"
            className="w-full text-sm text-right bg-transparent outline-none focus:bg-white focus:border focus:border-blue-300 focus:rounded px-1 py-0.5"
            value={linea.descuento}
            onChange={e => handleNumeric('descuento', e.target.value)}
          />
          <span className="text-xs text-slate-400">%</span>
        </div>
      </td>

      {/* IVA % */}
      <td className="px-2 py-1.5 w-20">
        <select
          className="w-full text-sm bg-transparent outline-none focus:bg-white focus:border focus:border-blue-300 focus:rounded px-1 py-0.5"
          value={linea.ivaPorcentaje}
          onChange={e => onUpdate(index, { ivaPorcentaje: Number(e.target.value) })}
        >
          <option value={0}>0%</option>
          <option value={4}>4%</option>
          <option value={10}>10%</option>
          <option value={21}>21%</option>
        </select>
      </td>

      {/* Subtotal (calculado) */}
      <td className="px-3 py-1.5 w-28 text-right">
        <span className="text-sm font-semibold text-slate-800 font-mono">{fmt(linea.subtotal)}</span>
      </td>

      {/* Borrar */}
      <td className="px-2 py-1.5 w-8">
        <button
          onClick={() => onDelete(index)}
          className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
          title="Eliminar línea"
        >
          <Trash2 size={13} />
        </button>
      </td>
    </tr>
  );
};

// ─── Editor principal ─────────────────────────────────────────────────────────

export const LineItemsEditor: React.FC<LineItemsEditorProps> = ({
  lineas,
  onChange,
  productos = [],
  readonly = false,
  ivaPorcentajeDefault = 21,
}) => {
  const addLinea = () => {
    const nueva: DocumentoLinea = {
      orden: lineas.length + 1,
      descripcion: '',
      cantidad: 1,
      precioUnitario: 0,
      descuento: 0,
      ivaPorcentaje: ivaPorcentajeDefault,
      subtotal: 0,
    };
    onChange([...lineas, nueva]);
  };

  const updateLinea = (index: number, changes: Partial<DocumentoLinea>) => {
    const updated = lineas.map((l, i) => i === index ? { ...l, ...changes } : l);
    onChange(updated);
  };

  const deleteLinea = (index: number) => {
    onChange(lineas.filter((_, i) => i !== index));
  };

  const total = lineas.reduce((s, l) => s + l.subtotal, 0);

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      {/* Cabecera de la tabla */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide border-b border-slate-200">
              <th className="px-2 py-2 text-center w-8">#</th>
              <th className="px-2 py-2 text-left">
                <div className="flex items-center gap-1.5">
                  Descripción
                  {!readonly && productos.length > 0 && (
                    <span className="text-[9px] font-normal normal-case bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">
                      usa <Search size={8} className="inline" /> para buscar catálogo
                    </span>
                  )}
                </div>
              </th>
              <th className="px-2 py-2 text-right w-20">Cant.</th>
              <th className="px-2 py-2 text-right w-28">Precio ud.</th>
              <th className="px-2 py-2 text-right w-20">Dto %</th>
              <th className="px-2 py-2 text-right w-20">IVA %</th>
              <th className="px-2 py-2 text-right w-28">Subtotal</th>
              {!readonly && <th className="w-8" />}
            </tr>
          </thead>
          <tbody>
            {lineas.map((linea, i) => (
              <FilaLinea
                key={i}
                linea={linea}
                index={i}
                productos={productos}
                onUpdate={updateLinea}
                onDelete={deleteLinea}
                readonly={readonly}
              />
            ))}
            {lineas.length === 0 && (
              <tr>
                <td colSpan={readonly ? 7 : 8} className="px-4 py-10 text-center text-slate-400 text-sm">
                  <Package size={28} className="mx-auto mb-2 opacity-30" />
                  {readonly
                    ? 'Sin líneas en este documento.'
                    : (
                      <span>
                        Sin líneas.{' '}
                        <button
                          onClick={addLinea}
                          className="text-blue-600 hover:underline font-medium"
                        >
                          + Añadir primera línea
                        </button>
                      </span>
                    )
                  }
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-slate-50 border-t border-slate-200">
        {!readonly ? (
          <button
            onClick={addLinea}
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors"
          >
            <Plus size={15} /> Añadir línea
          </button>
        ) : <div />}

        <div className="text-sm font-semibold text-slate-700">
          Subtotal: <span className="text-slate-900 font-mono ml-1">{fmt(total)}</span>
        </div>
      </div>
    </div>
  );
};
