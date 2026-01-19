import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextData {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextData | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now();
    setToasts(prevToasts => [...prevToasts, { id, message, type }]);
    setTimeout(() => {
      setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
    }, 5000); // Auto-dismiss after 5 seconds
  }, []);

  const removeToast = (id: number) => {
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
  };

  const contextValue = React.useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className="fixed top-5 right-5 z-[100] space-y-2">
        {toasts.map(toast => (
          <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Toast component is included here for simplicity
import { SuccessIcon, ErrorIcon, InfoIcon, CloseIcon } from '../components/icons.tsx';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
}

const icons = {
  success: <SuccessIcon />,
  error: <ErrorIcon />,
  info: <InfoIcon />,
  warning: <ErrorIcon />, // Using ErrorIcon for warnings as well
};

const bgColors = {
  success: 'bg-success',
  error: 'bg-danger',
  info: 'bg-accent',
  warning: 'bg-warning',
};

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  return (
    <div className={`flex items-center text-white p-4 rounded-md shadow-lg ${bgColors[type]} animate-fade-in-right`}>
      <div className="flex-shrink-0">{icons[type]}</div>
      <div className="ml-3 text-sm font-medium">{message}</div>
      <button onClick={onClose} className="ml-auto -mr-1 -my-1 p-1.5 rounded-md hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white">
        <CloseIcon className="h-5 w-5" />
      </button>
      <style>{`
        @keyframes fade-in-right {
          from { opacity: 0; transform: translateX(100%); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-fade-in-right {
          animation: fade-in-right 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};
