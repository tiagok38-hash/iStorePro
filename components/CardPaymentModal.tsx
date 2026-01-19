import React, { useState, useMemo, useEffect } from 'react';
import { Payment, PaymentMethodParameter, CardConfigData, PaymentMethodType } from '../../types.ts';
import { CloseIcon, CreditCardIcon, CheckIcon } from './icons.tsx';
import { formatCurrency, getPaymentMethods } from '../services/mockApi.ts';
import CurrencyInput from './CurrencyInput.tsx';

const generateId = () => `pay-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

interface CardPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: { payment: Payment, feeToAddToSale: number }) => void;
    amountDue: number;
    initialTransactionType?: 'credit' | 'debit';
    initialMethodId?: string;
}

const CardPaymentModal: React.FC<CardPaymentModalProps> = ({ isOpen, onClose, onConfirm, amountDue, initialTransactionType, initialMethodId }) => {
    const [methods, setMethods] = useState<PaymentMethodParameter[]>([]);
    const [selectedMethodId, setSelectedMethodId] = useState<string>(initialMethodId || '');
    const [transactionType, setTransactionType] = useState<'credit' | 'debit'>(initialTransactionType || 'credit');
    const [chargeAmount, setChargeAmount] = useState<number>(amountDue);
    const [feeType, setFeeType] = useState<'noInterest' | 'withInterest'>('withInterest');
    const [selectedInstallment, setSelectedInstallment] = useState<number>(1);

    useEffect(() => {
        if (isOpen) {
            setTransactionType(initialTransactionType || 'credit');
            setSelectedMethodId(initialMethodId || '');

            getPaymentMethods().then(all => {
                const cards = all.filter(m => (m.type === 'card' || m.name.toLowerCase().includes('cartão')) && m.active !== false && !m.name.toLowerCase().includes('pagseguro'));
                setMethods(cards);

                if (cards.length > 0 && !initialMethodId) {
                    // Default to first available card if none selected
                    setSelectedMethodId(cards[0].id);
                }
            });
            setChargeAmount(amountDue > 0 ? amountDue : 0);
            setFeeType('withInterest');
            setSelectedInstallment(1);
        }
    }, [isOpen, amountDue, initialTransactionType, initialMethodId]);

    // Update selection when transactionType changes
    // Simplified effect: we don't auto-switch methods based on name anymore, relying on user selection.
    // This fixes the issue where debit option wouldn't allow selecting a card that doesn't strictly have "débito" in name.
    useEffect(() => {
        // Optional: verify if current selection is valid, but generally allow any card for both types if supported by config
    }, [transactionType]);

    const selectedMethod = useMemo(() => methods.find(m => m.id === selectedMethodId), [methods, selectedMethodId]);
    const config = selectedMethod?.config;

    const calculations = useMemo(() => {
        if (!config || chargeAmount <= 0) return null;

        const val = chargeAmount;
        let result: any = null;

        if (transactionType === 'debit') {
            const feePercent = config.debitRate;
            // Repasse: V / (1 - R/100) -> Valor que o cliente paga para o vendedor receber 'val'
            const totalToPay = val / (1 - (feePercent / 100));
            const feeValue = totalToPay - val;

            result = {
                type: 'debit',
                totalToPay,
                feeValue,
                feePercent,
                originalValue: val,
                installments: 1,
                installmentValue: totalToPay
            };
        } else {
            // Credit
            const rates = feeType === 'noInterest' ? config.creditNoInterestRates : config.creditWithInterestRates;
            const rateObj = rates.find(r => r.installments === selectedInstallment) || { installments: selectedInstallment, rate: 0 };
            const feePercent = rateObj.rate;

            if (feeType === 'noInterest') {
                // Sem Juros (Vendedor absorve)
                const feeValue = val * (feePercent / 100);
                result = {
                    type: 'creditNoInterest',
                    totalToPay: val,
                    feeValue,
                    feePercent,
                    originalValue: val,
                    installments: selectedInstallment,
                    installmentValue: val / selectedInstallment
                };
            } else {
                // Com Juros (Cliente paga)
                // Repasse: V / (1 - R/100)
                const totalToPay = val / (1 - (feePercent / 100));
                const feeValue = totalToPay - val;

                result = {
                    type: 'creditWithInterest',
                    totalToPay,
                    feeValue,
                    feePercent,
                    originalValue: val,
                    installments: selectedInstallment,
                    installmentValue: totalToPay / selectedInstallment
                };
            }
        }
        return result;
    }, [config, transactionType, feeType, chargeAmount, selectedInstallment]);

    const handleConfirm = () => {
        if (!calculations || !selectedMethod) return;

        const methodType: PaymentMethodType = transactionType === 'debit' ? 'Débito' : 'Crédito';

        let typeLabel = '';
        let feeToAddToSale = 0;
        let finalValue = 0;

        if (transactionType === 'debit') {
            typeLabel = 'Débito';
            feeToAddToSale = calculations.feeValue;
            finalValue = calculations.totalToPay;
        } else if (feeType === 'withInterest') {
            typeLabel = 'Com Juros';
            feeToAddToSale = calculations.feeValue;
            finalValue = calculations.totalToPay;
        } else {
            typeLabel = 'Sem Juros';
            feeToAddToSale = 0;
            finalValue = calculations.originalValue;
        }

        const payment: Payment = {
            id: generateId(),
            method: methodType,
            type: typeLabel,
            card: `${selectedMethod.name} - ${typeLabel}`,
            value: calculations.originalValue, // FIX: Always use original value for system balance
            installments: calculations.installments,
            installmentsValue: calculations.installmentValue,
            feePercentage: calculations.feePercent,
            fees: calculations.feeValue
        };

        onConfirm({ payment, feeToAddToSale });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-white z-[100] flex flex-col font-sans animate-fade-in">
            <div className="flex-1 flex flex-col w-full h-full max-w-3xl mx-auto overflow-hidden">
                {/* Header - Compacto */}
                <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50/80 sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-xl text-primary transform -rotate-3">
                            <CreditCardIcon className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-gray-800 tracking-tight">Pagamento com Cartão</h2>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Configuração de taxas e parcelas</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all shadow-sm group"
                    >
                        <CloseIcon className="h-5 w-5 group-hover:scale-110 transition-transform" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
                    {/* Linha 1: Tipo e Maquininha */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Tipo de Transação</label>
                            <div className="flex p-1 bg-gray-100 rounded-xl border border-gray-200 shadow-inner">
                                <button
                                    onClick={() => setTransactionType('credit')}
                                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-black transition-all uppercase tracking-tighter ${transactionType === 'credit' ? 'bg-white shadow-md text-primary' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    Crédito
                                </button>
                                <button
                                    onClick={() => setTransactionType('debit')}
                                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-black transition-all uppercase tracking-tighter ${transactionType === 'debit' ? 'bg-white shadow-md text-primary' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    Débito
                                </button>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Selecione o Cartão</label>
                            <select
                                value={selectedMethodId}
                                onChange={e => setSelectedMethodId(e.target.value)}
                                className="w-full p-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all shadow-sm appearance-none h-[40px]"
                            >
                                {methods.length === 0 && <option value="">Nenhum cartão configurado</option>}
                                {methods.map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Linha 2: Valor e Info Financeira */}
                    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200/50 space-y-3 shadow-inner">
                        <div className="flex flex-col md:flex-row gap-4 items-stretch">
                            <div className="md:w-1/2 space-y-1.5">
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Valor da Venda</label>
                                <div className="relative group">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-black text-sm group-focus-within:text-primary transition-colors">R$</span>
                                    <CurrencyInput
                                        value={chargeAmount}
                                        onChange={setChargeAmount}
                                        className="w-full pl-10 pr-3 py-3 bg-white border border-gray-200 rounded-xl font-black text-xl text-gray-800 focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all shadow-sm"
                                    />
                                </div>
                            </div>

                            {calculations && (
                                <div className="md:w-1/2 flex flex-col justify-between gap-2">
                                    <div className="flex justify-between items-center px-3 py-2 bg-white rounded-xl border border-blue-100 shadow-sm group hover:border-blue-300 transition-all">
                                        <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Total a Cobrar</span>
                                        <span className="text-lg font-black text-blue-600">{formatCurrency(calculations.totalToPay)}</span>
                                    </div>
                                    <div className="flex justify-between items-center px-3 py-2 bg-white rounded-xl border border-emerald-100 shadow-sm group hover:border-emerald-300 transition-all">
                                        <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Liquidez</span>
                                        <span className="text-lg font-black text-emerald-600">
                                            {formatCurrency(calculations.totalToPay - calculations.feeValue)}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Linha 3: Modalidade e Juros (Apenas Crédito) */}
                    {transactionType === 'credit' && (
                        <div className="space-y-2 pt-2">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Opções de Juros</label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setFeeType('noInterest')}
                                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-black transition-all border shadow-sm ${feeType === 'noInterest' ? 'bg-gray-800 border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}
                                    >
                                        Sem Juros
                                    </button>
                                    <button
                                        onClick={() => setFeeType('withInterest')}
                                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-black transition-all border shadow-sm ${feeType === 'withInterest' ? 'bg-primary border-primary text-white' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}
                                    >
                                        Com Juros (Repasse)
                                    </button>
                                </div>
                            </div>

                            <div className={`p-3 rounded-xl text-[11px] leading-relaxed flex items-start gap-3 transition-all border ${feeType === 'withInterest' ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
                                <div className={`p-1 rounded-full shrink-0 ${feeType === 'withInterest' ? 'bg-amber-200 text-amber-900' : 'bg-blue-200 text-blue-900'}`}>
                                    <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path></svg>
                                </div>
                                <p className="font-medium">
                                    {feeType === 'noInterest'
                                        ? 'O cliente paga o valor original. As taxas são descontadas do seu recebimento.'
                                        : 'O valor final é recalculado para que você receba o valor integral, repassando as taxas ao cliente.'}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Linha 4: Parcelamento */}
                    {transactionType === 'credit' && config && (
                        <div className="space-y-2 pb-2">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Escolha o Parcelamento</label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {(() => {
                                    const rates = feeType === 'noInterest' ? config.creditNoInterestRates : config.creditWithInterestRates;
                                    return rates
                                        // Show all configured installments
                                        .map((rate) => {
                                            const i = rate.installments;
                                            const total = (feeType === 'withInterest') ? (chargeAmount / (1 - (rate.rate / 100))) : chargeAmount;
                                            const val = total / i;

                                            return (
                                                <button
                                                    key={i}
                                                    onClick={() => setSelectedInstallment(i)}
                                                    className={`group relative p-2 rounded-xl border text-left transition-all hover:shadow-md hover:-translate-y-0.5 ${selectedInstallment === i ? 'bg-primary border-primary text-white shadow-primary/20' : 'bg-white border-gray-100 text-gray-700 hover:border-primary/30 shadow-sm'}`}
                                                >
                                                    <div className={`text-[9px] font-black uppercase mb-0.5 ${selectedInstallment === i ? 'text-white/80' : 'text-gray-400'}`}>{i}x de</div>
                                                    <div className="text-sm font-black tracking-tight">{formatCurrency(val)}</div>
                                                    <div className={`text-[7px] font-bold mt-0.5 ${selectedInstallment === i ? 'text-white/60' : 'text-gray-400'}`}>Total: {formatCurrency(total)}</div>
                                                    {selectedInstallment === i && (
                                                        <div className="absolute top-1.5 right-1.5">
                                                            <div className="w-4 h-4 bg-white/20 rounded-full flex items-center justify-center">
                                                                <CheckIcon className="h-2.5 w-2.5 text-white" />
                                                            </div>
                                                        </div>
                                                    )}
                                                </button>
                                            );
                                        });
                                })()}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 bg-gray-50 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex flex-col">
                        {calculations && (
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Taxa de Operação:</span>
                                <span className="text-xs font-black text-gray-700">{calculations.feePercent.toFixed(2)}% ({formatCurrency(calculations.feeValue)})</span>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                        <button
                            onClick={onClose}
                            className="flex-1 md:flex-none px-5 py-3 bg-white border-2 border-gray-200 text-gray-500 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-gray-100 hover:border-gray-300 transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={!calculations || !selectedMethod}
                            className="flex-1 md:flex-none px-8 py-3 bg-gray-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-black hover:shadow-2xl transition-all shadow-lg active:scale-95 disabled:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                        >
                            Confirmar Pagamento
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CardPaymentModal;