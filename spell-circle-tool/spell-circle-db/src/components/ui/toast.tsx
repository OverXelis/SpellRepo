'use client';

import { useEffect, useState } from 'react';
import { useToastStore, type Toast, type ToastType } from '@/lib/toast-store';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="h-5 w-5" />,
  error: <AlertCircle className="h-5 w-5" />,
  info: <Info className="h-5 w-5" />,
  warning: <AlertTriangle className="h-5 w-5" />,
};

const styles: Record<ToastType, { bg: string; border: string; icon: string; glow: string }> = {
  success: {
    bg: 'bg-emerald-900/90',
    border: 'border-emerald-500/50',
    icon: 'text-emerald-400',
    glow: 'shadow-emerald-500/20',
  },
  error: {
    bg: 'bg-red-900/90',
    border: 'border-red-500/50',
    icon: 'text-red-400',
    glow: 'shadow-red-500/20',
  },
  info: {
    bg: 'bg-arcane-900/90',
    border: 'border-arcane-500/50',
    icon: 'text-arcane-400',
    glow: 'shadow-arcane-500/20',
  },
  warning: {
    bg: 'bg-amber-900/90',
    border: 'border-amber-500/50',
    icon: 'text-amber-400',
    glow: 'shadow-amber-500/20',
  },
};

function ToastItem({ toast }: { toast: Toast }) {
  const { removeToast } = useToastStore();
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(100);
  const style = styles[toast.type];

  useEffect(() => {
    if (!toast.duration || toast.duration <= 0) return;

    const startTime = toast.createdAt;
    const endTime = startTime + toast.duration;

    const updateProgress = () => {
      const now = Date.now();
      const remaining = endTime - now;
      const newProgress = (remaining / toast.duration!) * 100;
      
      if (newProgress <= 0) {
        setIsExiting(true);
        setTimeout(() => removeToast(toast.id), 300);
      } else {
        setProgress(newProgress);
        requestAnimationFrame(updateProgress);
      }
    };

    const animationId = requestAnimationFrame(updateProgress);
    return () => cancelAnimationFrame(animationId);
  }, [toast, removeToast]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => removeToast(toast.id), 300);
  };

  return (
    <div
      className={`
        relative overflow-hidden rounded-lg border backdrop-blur-md
        ${style.bg} ${style.border}
        shadow-lg ${style.glow}
        transform transition-all duration-300 ease-out
        ${isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
      `}
      style={{
        animation: isExiting ? undefined : 'toast-enter 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      {/* Scroll paper texture overlay */}
      <div 
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Content */}
      <div className="relative flex items-start gap-3 p-4">
        <div className={`flex-shrink-0 ${style.icon}`}>
          {icons[toast.type]}
        </div>
        <p className="flex-1 text-sm text-slate-200 font-philosopher pr-6">
          {toast.message}
        </p>
        <button
          onClick={handleClose}
          className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-200 transition-colors rounded"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Progress bar */}
      {toast.duration && toast.duration > 0 && (
        <div className="h-1 bg-dark-800/50">
          <div
            className={`h-full transition-all ease-linear ${style.icon.replace('text-', 'bg-')}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Decorative corner accents */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-current opacity-30 rounded-tl" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-current opacity-30 rounded-tr" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-current opacity-30 rounded-bl" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-current opacity-30 rounded-br" />
    </div>
  );
}

export function ToastContainer() {
  const { toasts } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 max-w-md w-full pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} />
        </div>
      ))}

      <style jsx global>{`
        @keyframes toast-enter {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

