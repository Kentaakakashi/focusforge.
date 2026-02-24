import React, { createContext, useContext, useState, useCallback } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
    id: number;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => { } });

export const useToast = () => useContext(ToastContext);

const ToastItem: React.FC<{ toast: Toast; onRemove: (id: number) => void }> = ({ toast, onRemove }) => {
    const bgColor = {
        success: 'bg-acid-green text-black',
        error: 'bg-bright-red text-white',
        info: 'bg-electric-blue text-white',
    }[toast.type];

    const icon = {
        success: '✓',
        error: '✕',
        info: 'ℹ',
    }[toast.type];

    React.useEffect(() => {
        const timer = setTimeout(() => onRemove(toast.id), 3000);
        return () => clearTimeout(timer);
    }, [toast.id, onRemove]);

    return (
        <div
            className={`flex items-center gap-3 px-5 py-4 border-4 border-black rounded-lg shadow-hard font-grotesk font-bold text-lg animate-slide-in ${bgColor}`}
            style={{ animation: 'slideIn 0.3s ease-out' }}
        >
            <span className="text-2xl font-black">{icon}</span>
            <span className="flex-grow">{toast.message}</span>
            <button onClick={() => onRemove(toast.id)} className="text-2xl font-black opacity-60 hover:opacity-100">×</button>
        </div>
    );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
    }, []);

    const removeToast = useCallback((id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm">
                {toasts.map(toast => (
                    <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
                ))}
            </div>
        </ToastContext.Provider>
    );
};
