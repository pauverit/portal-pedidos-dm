import React, { useState, useCallback, createContext, useContext } from 'react';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
    id: number;
    message: string;
    type: ToastType;
}

interface ToastContextValue {
    toast: (message: string, type?: ToastType) => void;
}

export const ToastContext = createContext<ToastContextValue>({ toast: () => { } });

export const useToast = () => useContext(ToastContext);

let nextId = 0;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const toast = useCallback((message: string, type: ToastType = 'info') => {
        const id = ++nextId;
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    }, []);

    const dismiss = (id: number) => setToasts(prev => prev.filter(t => t.id !== id));

    const icons: Record<ToastType, React.ReactNode> = {
        success: <CheckCircle size={18} className="shrink-0" />,
        error: <XCircle size={18} className="shrink-0" />,
        info: <AlertCircle size={18} className="shrink-0" />,
    };
    const colors: Record<ToastType, string> = {
        success: 'bg-emerald-600 text-white',
        error: 'bg-red-600 text-white',
        info: 'bg-slate-800 text-white',
    };

    return (
        <ToastContext.Provider value={{ toast }}>
            {children}
            <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2 pointer-events-none">
                {toasts.map(t => (
                    <div
                        key={t.id}
                        className={`flex items-center gap-3 px-3 py-2 rounded-xl shadow-lg text-sm font-medium max-w-xs pointer-events-auto animate-slide-in ${colors[t.type]}`}
                        style={{ animation: 'slideIn 0.25s ease' }}
                    >
                        {icons[t.type]}
                        <span className="flex-1">{t.message}</span>
                        <button onClick={() => dismiss(t.id)} className="ml-1 opacity-70 hover:opacity-100">
                            <X size={14} />
                        </button>
                    </div>
                ))}
            </div>
            <style>{`@keyframes slideIn { from { opacity:0; transform:translateX(24px);} to { opacity:1; transform:translateX(0);} }`}</style>
        </ToastContext.Provider>
    );
};
