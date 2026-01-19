import React, { useState, useEffect, useMemo } from 'react';
import { CloseIcon, CreditCardIcon } from './icons.tsx';
import CurrencyInput from './CurrencyInput.tsx';
import { formatCurrency, getPaymentMethods } from '../services/mockApi.ts';
import { PaymentMethodParameter } from '../../types.ts';

const CardRateSimulatorModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [methods, setMethods] = useState<PaymentMethodParameter[]>([]);
    const [selectedMethodId, setSelectedMethodId] = useState<string>('');
    const [transactionType, setTransactionType] = useState<'credit' | 'debit'>('credit');
    const [chargeAmount, setChargeAmount] = useState<number>(0);
    const [feeType, setFeeType] = useState<'noInterest' | 'withInterest'>('withInterest');
    const [selectedInstallment, setSelectedInstallment] = useState<number>(1);

    useEffect(() => {
        getPaymentMethods().then(all => {
            const cards = all.filter(m => m.type === 'card' && m.active !== false);
            setMethods(cards);
            if (cards.length > 0 && !selectedMethodId) {
                setSelectedMethodId(cards[0].id);
            }
        });
    }, []);

    const selectedMethod = useMemo(() => methods.find(m => m.id === selectedMethodId), [methods, selectedMethodId]);
    const config = selectedMethod?.config;

    const calculations = useMemo(() => {
        if (!config || chargeAmount <= 0) return null;

        const val = chargeAmount;
        let result: any = null;

        if (transactionType === 'debit') {
            const feePercent = config.debitRate;
            const feeValue = val * (feePercent / 100);
            result = {
                type: 'debit',
                totalToPay: val + feeValue, // Customer pays fee logic
                feeValue,
                feePercent,
                originalValue: val,
                installments: 1,
                installmentValue: val + feeValue // Debit is 1x
            };
        } else {
            // Credit
            if (feeType === 'noInterest') {
                // Seller absorbs fee
                const rateObj = config.creditNoInterestRates.find(r => r.installments === selectedInstallment);
                const feePercent = rateObj?.rate || 0;
                const sellerFee = val * (feePercent / 100);

                result = {
                    type: 'creditNoInterest',
                    totalToPay: val,
                    feeValue: sellerFee,
                    feePercent,
                    originalValue: val,
                    installments: selectedInstallment,
                    installmentValue: val / selectedInstallment
                };
            } else {
                // Customer pays fee
                const rateObj = config.creditWithInterestRates.find(r => r.installments === selectedInstallment);
                const feePercent = rateObj?.rate || 0;
                const totalWithInterest = val * (1 + (feePercent / 100));

                result = {
                    type: 'creditWithInterest',
                    totalToPay: totalWithInterest,
                    feeValue: totalWithInterest - val,
                    feePercent,
                    originalValue: val,
                    installments: selectedInstallment,
                    installmentValue: totalWithInterest / selectedInstallment
                };
            }
        }
        return result;
    }, [config, transactionType, feeType, chargeAmount, selectedInstallment]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-[70] p-4 font-sans text-gray-800">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-center p-5 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <CreditCardIcon className="h-6 w-6 text-gray-700" />
                        <h2 className="text-xl font-bold text-gray-800">Simulador de Taxas</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <CloseIcon className="h-6 w-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1">
                    <div className="bg-gray-100 p-3 rounded text-sm text-gray-600 mb-4">
                        Simule o parcelamento e veja as taxas aplicadas.
                    </div>

                    {/* Step 1: Transaction Type */}
                    <div>
                        <h3 className="text-sm font-medium text-gray-800 mb-2">1. Selecione o tipo de Transação:</h3>
                        <div className="flex items-center gap-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="simTransactionType"
                                    className="w-5 h-5 text-green-500 focus:ring-green-500 border-gray-300"
                                    checked={transactionType === 'credit'}
                                    onChange={() => setTransactionType('credit')}
                                />
                                <span>Crédito</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="simTransactionType"
                                    className="w-5 h-5 text-green-500 focus:ring-green-500 border-gray-300"
                                    checked={transactionType === 'debit'}
                                    onChange={() => setTransactionType('debit')}
                                />
                                <span>Débito</span>
                            </label>
                        </div>
                    </div>

                    {/* Step 2: Payment Method */}
                    <div>
                        <h3 className="text-sm font-medium text-gray-800 mb-2">2. Selecione a máquina/cartão:</h3>
                        <select
                            value={selectedMethodId}
                            onChange={e => setSelectedMethodId(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-green-500/20 outline-none"
                        >
                            {methods.length === 0 && <option value="">Nenhuma configuração encontrada</option>}
                            {methods.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Step 3: Value */}
                    <div>
                        <h3 className="text-sm font-medium text-gray-800 mb-2">3. Insira o valor (R$)</h3>
                        <div className="flex flex-wrap gap-4 items-center">
                            <CurrencyInput
                                value={chargeAmount}
                                onChange={setChargeAmount}
                                className="w-48 p-2 border border-gray-300 rounded-md bg-white font-medium focus:ring-2 focus:ring-green-500/20 outline-none"
                            />
                            {calculations && (
                                <>
                                    <div className="px-4 py-2 bg-gray-200 rounded text-sm font-medium text-gray-700">
                                        Cobrar do Cliente = {formatCurrency(calculations.totalToPay)}
                                    </div>
                                    <div className="px-4 py-2 bg-gray-200 rounded text-sm font-medium text-gray-700">
                                        Líquido (Você recebe) = {formatCurrency(transactionType === 'debit' || feeType === 'withInterest' ? calculations.totalToPay - calculations.feeValue : calculations.originalValue - calculations.feeValue)}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Step 4: Fee Type (Credit Only) */}
                    {transactionType === 'credit' && (
                        <div>
                            <h3 className="text-sm font-medium text-gray-800 mb-2">4. Selecione o Tipo de Taxa:</h3>
                            <div className="flex flex-wrap items-center gap-4">
                                <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="simFeeType"
                                            className="w-5 h-5 text-green-500 focus:ring-green-500 border-gray-300"
                                            checked={feeType === 'noInterest'}
                                            onChange={() => setFeeType('noInterest')}
                                        />
                                        <span>Sem Juros (Vendedor paga)</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="simFeeType"
                                            className="w-5 h-5 text-green-500 focus:ring-green-500 border-gray-300"
                                            checked={feeType === 'withInterest'}
                                            onChange={() => setFeeType('withInterest')}
                                        />
                                        <span>Com Juros (Cliente paga)</span>
                                    </label>
                                </div>
                                {calculations && (
                                    <>
                                        <div className="px-4 py-1.5 bg-gray-100 border border-gray-200 rounded text-xs text-gray-600">
                                            Taxa: {formatCurrency(calculations.feeValue)} ({calculations.feePercent.toFixed(2)}%)
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Step 5: Installments (Credit Only) */}
                    {transactionType === 'credit' && config && (
                        <div>
                            <h3 className="text-sm font-medium text-gray-800 mb-2">5. Resultados da Simulação:</h3>
                            <div className="border border-gray-200 rounded-lg p-4 max-h-60 overflow-y-auto bg-gray-50/50">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-x-8 gap-y-2">
                                    {(() => {
                                        const rates = feeType === 'noInterest' ? config.creditNoInterestRates : config.creditWithInterestRates;
                                        let maxConfigured = 1;
                                        for (let i = rates.length - 1; i >= 0; i--) {
                                            if (rates[i].rate > 0) {
                                                maxConfigured = rates[i].installments;
                                                break;
                                            }
                                        }

                                        return rates
                                            .filter(r => r.installments === 1 || r.installments <= maxConfigured)
                                            .map((rate) => {
                                                const i = rate.installments;
                                                const base = chargeAmount;
                                                const total = feeType === 'withInterest' ? base * (1 + rate.rate / 100) : base;
                                                const val = total / i;

                                                return (
                                                    <label key={i} className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${selectedInstallment === i ? 'bg-blue-50' : 'hover:bg-gray-100'}`}>
                                                        <input
                                                            type="radio"
                                                            name="simInstallment"
                                                            checked={selectedInstallment === i}
                                                            onChange={() => setSelectedInstallment(i)}
                                                            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                                        />
                                                        <span className="text-sm text-gray-700">
                                                            {i}x de {formatCurrency(val)} {feeType === 'withInterest' && i > 1 ? `(Total: ${formatCurrency(total)})` : ''}
                                                        </span>
                                                    </label>
                                                );
                                            });
                                    })()}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 flex justify-center bg-gray-50">
                    <button onClick={onClose} className="px-10 py-2.5 bg-primary text-on-primary rounded-md hover:bg-opacity-90 font-semibold">
                        Fechar Simulação
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CardRateSimulatorModal;