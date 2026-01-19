import React, { useState } from 'react';

interface DeleteWithReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  title: string;
  message: string;
}

const DeleteWithReasonModal: React.FC<DeleteWithReasonModalProps> = ({ isOpen, onClose, onConfirm, title, message }) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!reason.trim()) {
      setError(true);
      return;
    }
    onConfirm(reason);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setReason(e.target.value);
    if (e.target.value.trim()) {
      setError(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-fade-in" aria-modal="true" role="dialog">
      <div className="bg-surface rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4 animate-scale-in">
        <h2 className="text-2xl font-black text-primary mb-2">{title}</h2>
        <p className="text-sm text-muted mb-6 leading-relaxed">{message}</p>

        <div className="space-y-2">
          <label htmlFor="delete-reason" className="block text-[10px] font-bold text-muted uppercase tracking-wider">Motivo da exclusão*</label>
          <textarea
            id="delete-reason"
            rows={4}
            value={reason}
            onChange={handleChange}
            className={`w-full p-4 border rounded-xl bg-surface-secondary text-sm font-medium ${error ? 'border-danger ring-1 ring-danger' : 'border-border'} focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all placeholder:text-muted/50`}
            placeholder="Descreva o motivo da exclusão..."
          />
          {error && <p className="text-xs text-danger font-bold flex items-center gap-1">O motivo é obrigatório.</p>}
        </div>

        <div className="flex gap-3 mt-8">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all transform active:scale-95"
          >
            CANCELAR
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 py-3 bg-danger text-white font-bold rounded-xl shadow-lg shadow-danger/20 hover:bg-danger/90 transition-all transform active:scale-95"
          >
            CONFIRMAR
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteWithReasonModal;