import React, { useState } from 'react';
import { CloseIcon, CashIcon } from './icons';
import CurrencyInput from './CurrencyInput';

interface CashMovementModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (amount: number, reason: string) => void;
    type: 'suprimento' | 'sangria';
}

const CashMovementModal: React.FC<CashMovementModalProps> = ({ isOpen, onClose, onConfirm, type }) => {
    const [amount, setAmount] = useState(0);
    const [reason, setReason] = useState('');

    if (!isOpen) return null;

    const isSangria = type === 'sangria'; // Logic: sangria = Withdraw (Red). suprimento = Deposit (Green).
    // User Labels:
    // IN (Green) => "Lançar Sangria"
    // OUT (Red) => "Retirar Sangria"

    const title = isSangria ? 'Lançar Sangria' : 'Lançar Suprimento';

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (amount <= 0) return;
        onConfirm(amount, reason);
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                <div className={`px-6 py-4 flex justify-between items-center ${isSangria ? 'bg-red-50' : 'bg-green-50'} border-b ${isSangria ? 'border-red-100' : 'border-green-100'}`}>
                    <h3 className={`font-bold text-lg ${isSangria ? 'text-red-700' : 'text-green-700'} flex items-center gap-2`}>
                        <CashIcon className="h-6 w-6" />
                        {title}
                    </h3>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600"><CloseIcon className="h-6 w-6" /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Valor {isSangria ? '(Saída)' : '(Entrada)'}</label>
                        <CurrencyInput
                            value={amount}
                            onChange={setAmount}
                            className={`w-full text-2xl font-black p-3 rounded-lg border focus:ring-2 outline-none ${isSangria ? 'focus:ring-red-200 border-red-200 text-red-600' : 'focus:ring-green-200 border-green-200 text-green-600'}`}
                            placeholder="R$ 0,00"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Motivo / Observação</label>
                        <input
                            type="text"
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary/20 outline-none"
                            placeholder={isSangria ? "Ex: Pagamento de fornecedor" : "Ex: Reforço de caixa"}
                            required
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 transition-colors">Cancelar</button>
                        <button
                            type="submit"
                            disabled={amount <= 0}
                            className={`flex-1 px-4 py-3 text-white font-bold rounded-lg shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed ${isSangria ? 'bg-red-500 hover:bg-red-600 shadow-red-200' : 'bg-green-500 hover:bg-green-600 shadow-green-200'}`}
                        >
                            Confirmar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CashMovementModal;
