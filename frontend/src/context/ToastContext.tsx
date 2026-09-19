import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  CheckCircle2,
  AlertOctagon,
  Info,
  AlertTriangle,
  Trash2,
  X,
} from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'delete';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toast: {
    success: (message: string, title?: string, duration?: number) => void;
    error: (message: string, title?: string, duration?: number) => void;
    info: (message: string, title?: string, duration?: number) => void;
    warning: (message: string, title?: string, duration?: number) => void;
    delete: (message: string, title?: string, duration?: number) => void;
    dismiss: (id: string) => void;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (type: ToastType, message: string, title?: string, duration = 4500) => {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newToast: ToastItem = { id, type, title, message, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          dismiss(id);
        }, duration);
      }
    },
    [dismiss]
  );

  const toast = {
    success: (message: string, title?: string, duration?: number) =>
      addToast('success', message, title || 'Operasi Berhasil', duration),
    error: (message: string, title?: string, duration?: number) =>
      addToast('error', message, title || 'Terjadi Kesalahan', duration),
    info: (message: string, title?: string, duration?: number) =>
      addToast('info', message, title || 'Informasi Sistem', duration),
    warning: (message: string, title?: string, duration?: number) =>
      addToast('warning', message, title || 'Peringatan Sistem', duration),
    delete: (message: string, title?: string, duration?: number) =>
      addToast('delete', message, title || 'Item Berhasil Dihapus', duration),
    dismiss,
  };

  const getToastStyles = (type: ToastType) => {
    switch (type) {
      case 'success':
        return {
          border: 'border-emerald-500/50',
          bg: 'bg-[#0A1815]/95',
          titleColor: 'text-emerald-300',
          textColor: 'text-emerald-100',
          glow: 'shadow-[0_0_20px_rgba(16,185,129,0.3)]',
          barColor: 'bg-emerald-500',
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />,
        };
      case 'delete':
        return {
          border: 'border-rose-600/70',
          bg: 'bg-[#1F0811]/95',
          titleColor: 'text-rose-300',
          textColor: 'text-rose-100',
          glow: 'shadow-[0_0_25px_rgba(225,29,72,0.4)] ring-1 ring-rose-500/40',
          barColor: 'bg-rose-500',
          icon: <Trash2 className="w-5 h-5 text-rose-400 shrink-0 mt-0.5 animate-bounce" />,
        };
      case 'error':
        return {
          border: 'border-red-500/60',
          bg: 'bg-[#18090E]/95',
          titleColor: 'text-red-300',
          textColor: 'text-red-100',
          glow: 'shadow-[0_0_20px_rgba(239,68,68,0.3)]',
          barColor: 'bg-red-500',
          icon: <AlertOctagon className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />,
        };
      case 'warning':
        return {
          border: 'border-amber-500/50',
          bg: 'bg-[#181309]/95',
          titleColor: 'text-amber-300',
          textColor: 'text-amber-100',
          glow: 'shadow-[0_0_20px_rgba(245,158,11,0.3)]',
          barColor: 'bg-amber-500',
          icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />,
        };
      case 'info':
      default:
        return {
          border: 'border-cyan-500/50',
          bg: 'bg-[#081522]/95',
          titleColor: 'text-cyan-300',
          textColor: 'text-cyan-100',
          glow: 'shadow-[0_0_20px_rgba(6,182,212,0.3)]',
          barColor: 'bg-cyan-500',
          icon: <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />,
        };
    }
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Floating Animated Toast Container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none px-3 sm:px-0">
        {toasts.map((t) => {
          const style = getToastStyles(t.type);
          return (
            <div
              key={t.id}
              className={`pointer-events-auto rounded-xl border backdrop-blur-md p-3.5 flex items-start gap-3 transition-all duration-300 transform translate-y-0 opacity-100 animate-in slide-in-from-top-4 fade-in overflow-hidden relative ${style.border} ${style.bg} ${style.glow}`}
            >
              {style.icon}
              <div className="flex-1 min-w-0 pr-1">
                {t.title && (
                  <h4 className={`text-xs font-bold font-mono tracking-wide ${style.titleColor}`}>
                    {t.title}
                  </h4>
                )}
                <p className={`text-xs mt-0.5 leading-snug font-sans break-words ${style.textColor}`}>
                  {t.message}
                </p>
              </div>

              <button
                onClick={() => dismiss(t.id)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition shrink-0"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              {/* Animated Progress Bar */}
              {t.duration && t.duration > 0 && (
                <div
                  className={`absolute bottom-0 left-0 h-0.5 ${style.barColor}`}
                  style={{
                    animation: `toast-progress ${t.duration}ms linear forwards`,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context.toast;
};
