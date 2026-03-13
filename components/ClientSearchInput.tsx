import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X, ChevronDown, User } from 'lucide-react';
import { User as UserType } from '../types';

interface ClientSearchInputProps {
    clients: UserType[];
    value: string;           // selected client id
    onChange: (id: string) => void;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    /** Filter clients before display, default is role === 'client' */
    filterFn?: (u: UserType) => boolean;
    className?: string;
}

const VISIBLE_MAX = 60;

export const ClientSearchInput: React.FC<ClientSearchInputProps> = ({
    clients,
    value,
    onChange,
    placeholder = 'Buscar cliente…',
    required,
    disabled,
    filterFn,
    className = '',
}) => {
    const defaultFilter = useCallback((u: UserType) => u.role === 'client', []);
    const list = clients.filter(filterFn ?? defaultFilter);

    const selected = list.find(c => c.id === value);
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const [highlighted, setHighlighted] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    const filtered = query.trim()
        ? list.filter(c =>
            c.name.toLowerCase().includes(query.toLowerCase()) ||
            (c.email && c.email.toLowerCase().includes(query.toLowerCase()))
        ).slice(0, VISIBLE_MAX)
        : list.slice(0, VISIBLE_MAX);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
                setQuery('');
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Scroll highlighted item into view
    useEffect(() => {
        if (!listRef.current) return;
        const el = listRef.current.children[highlighted] as HTMLElement | undefined;
        el?.scrollIntoView({ block: 'nearest' });
    }, [highlighted]);

    const handleSelect = (id: string) => {
        onChange(id);
        setQuery('');
        setOpen(false);
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange('');
        setQuery('');
        setOpen(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!open) { if (e.key === 'Enter' || e.key === 'ArrowDown') setOpen(true); return; }
        if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted(h => Math.min(h + 1, filtered.length - 1)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlighted(h => Math.max(h - 1, 0)); }
        else if (e.key === 'Enter') { e.preventDefault(); if (filtered[highlighted]) handleSelect(filtered[highlighted].id); }
        else if (e.key === 'Escape') { setOpen(false); setQuery(''); }
    };

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            {/* Trigger */}
            <div
                role="combobox"
                aria-expanded={open}
                aria-haspopup="listbox"
                tabIndex={disabled ? -1 : 0}
                onClick={() => { if (!disabled) { setOpen(o => !o); if (!open) setTimeout(() => inputRef.current?.focus(), 50); } }}
                onKeyDown={handleKeyDown}
                className={`w-full flex items-center gap-2 border rounded-xl px-3 py-2.5 text-sm bg-white cursor-pointer select-none transition-colors
                    ${open ? 'border-slate-900 ring-2 ring-slate-900 ring-offset-0' : 'border-slate-200 hover:border-slate-300'}
                    ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : ''}
                `}
            >
                <User size={14} className="text-slate-400 shrink-0" />
                <span className={`flex-1 truncate ${selected ? 'text-slate-900 font-medium' : 'text-slate-400'}`}>
                    {selected ? (selected.name && selected.name !== selected.email ? selected.name : selected.email) : placeholder}
                </span>
                {selected && !disabled ? (
                    <button type="button" onClick={handleClear} className="text-slate-300 hover:text-slate-600 transition-colors shrink-0">
                        <X size={14} />
                    </button>
                ) : (
                    <ChevronDown size={14} className={`text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
                )}
            </div>

            {/* Dropdown */}
            {open && (
                <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                    {/* Search box */}
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100">
                        <Search size={14} className="text-slate-400 shrink-0" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={e => { setQuery(e.target.value); setHighlighted(0); }}
                            onKeyDown={handleKeyDown}
                            placeholder="Escribe para filtrar…"
                            className="flex-1 text-sm focus:outline-none placeholder:text-slate-300"
                            autoFocus
                        />
                        {query && (
                            <button type="button" onClick={() => { setQuery(''); inputRef.current?.focus(); }} className="text-slate-300 hover:text-slate-600">
                                <X size={12} />
                            </button>
                        )}
                    </div>

                    {/* List */}
                    <ul ref={listRef} role="listbox" className="max-h-52 overflow-y-auto py-1">
                        {filtered.length === 0 ? (
                            <li className="px-3 py-2 text-sm text-slate-400 text-center">Sin resultados</li>
                        ) : (
                            filtered.map((c, i) => {
                                const displayName = c.name && c.name !== c.email ? c.name : null;
                                const showEmail = c.email && c.email !== c.name;
                                return (
                                    <li
                                        key={c.id}
                                        role="option"
                                        aria-selected={c.id === value}
                                        onMouseDown={() => handleSelect(c.id)}
                                        onMouseEnter={() => setHighlighted(i)}
                                        className={`px-3 py-2 text-sm cursor-pointer flex items-center justify-between gap-2 transition-colors
                                            ${c.id === value ? 'bg-slate-900 text-white font-semibold' : i === highlighted ? 'bg-slate-50' : 'hover:bg-slate-50'}
                                        `}
                                    >
                                        <span className="truncate">{displayName || c.email}</span>
                                        {displayName && showEmail && (
                                            <span className={`text-xs shrink-0 ${c.id === value ? 'text-white/60' : 'text-slate-400'}`}>{c.email}</span>
                                        )}
                                    </li>
                                );
                            })
                        )}
                        {list.length > VISIBLE_MAX && !query && (
                            <li className="px-4 py-2 text-xs text-slate-400 text-center border-t border-slate-100">
                                Escribe para filtrar los {list.length} clientes
                            </li>
                        )}
                    </ul>
                </div>
            )}

            {/* Hidden native input for form validation */}
            {required && <input type="text" tabIndex={-1} className="sr-only" required value={value} readOnly />}
        </div>
    );
};
