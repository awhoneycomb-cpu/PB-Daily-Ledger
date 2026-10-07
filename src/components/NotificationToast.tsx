import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  message: string;
  type?: 'success' | 'error' | 'info';
}

interface NotificationToastProps {
  toast: ToastMessage | null;
  onDismiss: () => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({ toast, onDismiss }) => {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, 3500);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;

  const isSuccess = toast.type === 'success' || !toast.type;
  const isError = toast.type === 'error';

  return (
    <div
      id="notification-toast"
      className="fixed bottom-5 right-5 z-50 max-w-sm w-full transition-all animate-in slide-in-from-bottom-5 duration-300"
    >
      <div
        className={`p-3.5 rounded-xl shadow-lg border flex items-center justify-between gap-3 ${
          isSuccess
            ? 'bg-emerald-900 text-white border-emerald-700'
            : isError
            ? 'bg-rose-900 text-white border-rose-700'
            : 'bg-stone-900 text-white border-stone-700'
        }`}
      >
        <div className="flex items-center gap-2.5 text-xs font-medium">
          {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />}
          {isError && <AlertCircle className="w-4 h-4 text-rose-300 shrink-0" />}
          {!isSuccess && !isError && <Info className="w-4 h-4 text-blue-300 shrink-0" />}
          <span>{toast.message}</span>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-stone-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer shrink-0"
          title="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
