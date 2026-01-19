import React, { ReactNode } from 'react';
import { XCircleIcon, ErrorIcon, ClockIcon, CloseIcon } from './icons.tsx';

interface PosAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: ReactNode;
  variant?: 'danger' | 'warning' | 'info';
  confirmText?: string;
  cancelText?: string;
  children?: ReactNode; // For extra content like input fields
}

const PosAlertModal: React.FC<PosAlertModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  variant = 'info',
  confirmText = 'Sim',
  cancelText = 'Não',
  children,
}) => {
  if (!isOpen) return null;

  const icons = {
    danger: <XCircleIcon className="h-16 w-16 text-red-500" />,
    warning: <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center"><ErrorIcon className="h-10 w-10 text-orange-500" strokeWidth={1.5} /></div>,
    info: <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center"><ClockIcon className="h-10 w-10 text-gray-500" strokeWidth={1.5} /></div>,
  };

  const confirmButtonClasses = {
    danger: 'bg-red-500 hover:bg-red-600',
    warning: 'bg-orange-500 hover:bg-orange-600',
    info: 'bg-gray-700 hover:bg-gray-800',
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[70]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 text-center p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
            <CloseIcon className="h-6 w-6" />
        </button>
        <div className="mx-auto flex items-center justify-center h-20 w-20">
            {icons[variant]}
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mt-4">{title}</h3>
        <div className="mt-2 text-sm text-gray-500 space-y-2">{message}</div>
        
        {children && <div className="mt-4 text-left">{children}</div>}

        <div className="mt-6 flex justify-center gap-4">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md font-semibold hover:bg-gray-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-6 py-2 text-white rounded-md font-semibold ${confirmButtonClasses[variant]}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PosAlertModal;
