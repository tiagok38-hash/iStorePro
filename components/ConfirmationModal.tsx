import React from 'react';
import { SpinnerIcon } from './icons.tsx';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  variant?: 'success' | 'danger';
  isSaving?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, message, variant = 'danger', isSaving = false }) => {
  if (!isOpen) return null;

  const confirmButtonClasses = variant === 'success'
    ? 'bg-success text-white hover:bg-success/90'
    : 'bg-danger text-white hover:bg-danger/90';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-fade-in" aria-modal="true" role="dialog">
      <div className="bg-surface rounded-2xl shadow-2xl p-8 w-full max-w-sm mx-4 animate-scale-in">
        <h2 className="text-2xl font-black text-primary mb-2">{title}</h2>
        <p className="text-sm text-muted mb-8 leading-relaxed">{message}</p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all transform active:scale-95 disabled:opacity-50"
          >
            CANCELAR
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSaving}
            className={`flex-1 py-3 text-white font-bold rounded-xl shadow-lg transition-all transform active:scale-95 flex justify-center items-center ${variant === 'success'
                ? 'bg-success shadow-success/20 hover:bg-success/90'
                : 'bg-danger shadow-danger/20 hover:bg-danger/90'
              } disabled:bg-gray-300 disabled:shadow-none`}
          >
            {isSaving ? <SpinnerIcon className="h-5 w-5 animate-spin" /> : 'CONFIRMAR'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;