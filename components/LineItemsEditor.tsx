import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Search } from 'lucide-react';
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
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = query.length >= 2
    ? productos.filter(p =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.reference.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8)
    : [];

  const handleSelectProduct = (p: ProductoSugerido) => {
    onUpdate(index, {
      productoId: p.id,
      descripcion: p.name,
      precioUnitario: p.price,
      subtotal: calcularSubtotalLinea({ cantidad: linea.cantidad, precioUnitario: p.price, descuento: linea.descuento }),
    });
    setQuery('');
    setShowSuggestions(false);
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
        <td className="px-3 py-2 text-xs text-slate-500 w-8">{index + 1}</td>
        <td className="px-3 py-2 text-sm text-slate-800">{linea.descripcion}</td>
        <td className="px-3 py-2 text-sm text-right">{linea.cantidad}</td>
        <td className="px-3 py-2 text-sm text-right">{fmt(linea.precioUnitario)}</td>
        <td className="px-3 py-2 text-sm text-right">{linea.descuento > 0 ? `${linea.descuento}%` : '—'}</td>
        <td className="px-3 py-2 text-sm text-right">{linea.ivaPorcentaje}%</td>
        <td className="px-3 py-2 text-sm font-semibold text-right">{fmt(linea.subtotal)}</td>
      </tr>
    );
  }

  return (
    <tr className="border-t border-slate-100 group hover:bg-slate-50">
      <td className="px-3 py-1.5 text-xs text-slate-400 w-8">{index + 1}</td>

      {/* Descripción con búsqueda de producto */}
      <td className="px-2 py-1.5 relative min-w-[200px]">
        <div className="flex items-center gap-1">
          <input
            className="w-full text-sm border-0 bg-transparent outline-none focus:bg-white focus:border focus:border-blue-300 focus:rounded px-1 py-0.5"
            value={linea.descripcion}
            onChange={e => onUpdate(index, { descripcion: e.target.value })}
            placeholder="Descripción…"
          />
          {productos.length > 0 && (
            <div className="relative shrink-0">
              <input
                ref={inputRef}
                className="w-24 text-xs border border-slate-200 rounded px-1.5 py-0.5 outline-none focus:border-blue-300"
                placeholder="Buscar…"
                value={query}
                onChange={e => { setQuery(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              />
              <Search size={10} className="absolute right-1.5 top-1 text-slate-400 pointer-events-none" />
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 top-6 right-0 w-72 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
                  {suggestions.map(p => (
                    <button
                      key={p.id}
                      onMouseDown={() => handleSelectProduct(p)}
                      className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-blue-50 text-sm"
                    >
                      <span className="truncate text-slate-800">{p.name}</span>
                      <span className="text-xs text-slate-500 shrink-0 ml-2">{fmt(p.price)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </td>

      {/* Cantidad */}
      <td className="px-2 py-1.5 w-24">
        <input
          type="number" min="0" step="0.01"
          className="w-full text-sm text-right border-0 bg-transparent outline-none focus:bg-white focus:border focus:border-blue-300 focus:rounded px-1 py-0.5"
          value={linea.cantidad}
          onChange={e => handleNumeric('cantidad', e.target.value)}
        />
      </td>

      {/* Precio unitario */}
      <td className="px-2 py-1.5 w-28">
        <input
          type="number" min="0" step="0.01"
          className="w-full text-sm text-right border-0 bg-transparent outline-none focus:bg-white focus:border focus:border-blue-300 focus:rounded px-1 py-0.5"
          value={linea.precioUnitario}
          onChange={e => handleNumeric('precioUnitario', e.target.value)}
        />
      </td>

      {/* Descuento % */}
      <td className="px-2 py-1.5 w-20">
        <input
          type="number" min="0" max="100" step="0.5"
          className="w-full text-sm text-right border-0 bg-transparent outline-none focus:bg-white focus:border focus:border-blue-300 focus:rounded px-1 py-0.5"
          value={linea.descuento}
          onChange={e => handleNumeric('descuento', e.target.value)}
        />
      </td>

      {/* IVA % */}
      <td className="px-2 py-1.5 w-20">
        <select
          className="w-full text-sm text-right border-0 bg-transparent outline-none focus:bg-white focus:border focus:border-blue-300 focus:rounded px-1 py-0.5"
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
        <span className="text-sm font-semibold text-slate-800">{fmt(linea.subtotal)}</span>
      </td>

      {/* Borrar */}
      <td className="px-2 py-1.5 w-8">
        <button
          onClick={() => onDelete(index)}
          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all"
        >
          <Trash2 size={14} />
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
    <div className="border border-slate-200 rounded-xl overflow-x-auto">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
              <th className="px-3 py-2 text-left w-8">#</th>
              <th className="px-3 py-2 text-left">Descripción</th>
              <th className="px-3 py-2 text-right w-24">Cant.</th>
              <th className="px-3 py-2 text-right w-28">Precio ud.</th>
              <th className="px-3 py-2 text-right w-20">Dto %</th>
              <th className="px-3 py-2 text-right w-20">IVA %</th>
              <th className="px-3 py-2 text-right w-28">Subtotal</th>
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
                <td colSpan={readonly ? 7 : 8} className="px-4 py-8 text-center text-slate-400 text-sm italic">
                  Sin líneas. {!readonly && 'Pulsa "+ Añadir línea" para empezar.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-t border-slate-200">
        {!readonly ? (
          <button
            onClick={addLinea}
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            <Plus size={15} /> Añadir línea
          </button>
        ) : <div />}

        <div className="text-sm font-semibold text-slate-700">
          Subtotal líneas: <span className="text-slate-900 ml-1">{fmt(total)}</span>
        </div>
      </div>
    </div>
  );
};
