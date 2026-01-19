import React, { useState, useEffect } from 'react';
import { CardConfigData, InstallmentRate } from '../../types.ts';
import { CloseIcon, CreditCardIcon, CheckIcon } from './icons.tsx';

interface CardConfigModalProps {
    isOpen: boolean;
    config: CardConfigData;
    onClose: () => void;
    onSave: (newConfig: CardConfigData) => void;
}

const CardConfigModal: React.FC<CardConfigModalProps> = ({ isOpen, config, onClose, onSave }) => {
    const [activeTab, setActiveTab] = useState<'debit' | 'creditNoInterest' | 'creditWithInterest'>('debit');
    const [localConfig, setLocalConfig] = useState<CardConfigData>(JSON.parse(JSON.stringify(config)));

    useEffect(() => {
        // Ensure the config has all 18 installments, adding missing ones with rate 0
        const ensureInstallments = (rates: InstallmentRate[]): InstallmentRate[] => {
            const existing = new Map(rates.map(r => [r.installments, r]));
            const fullRates: InstallmentRate[] = [];
            for (let i = 1; i <= 18; i++) {
                if (existing.has(i)) {
                    fullRates.push(existing.get(i)!);
                } else {
                    fullRates.push({ installments: i, rate: 0 });
                }
            }
            return fullRates;
        };

        setLocalConfig({
            debitRate: config.debitRate,
            creditNoInterestRates: ensureInstallments(config.creditNoInterestRates),
            creditWithInterestRates: ensureInstallments(config.creditWithInterestRates),
        });
    }, [config]);

    const handleDebitRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalConfig(prev => ({ ...prev, debitRate: Number(e.target.value) || 0 }));
    };

    const handleRateChange = (
        type: 'creditNoInterestRates' | 'creditWithInterestRates',
        installments: number,
        rate: number
    ) => {
        setLocalConfig(prev => ({
            ...prev,
            [type]: prev[type].map(r => r.installments === installments ? { ...r, rate } : r)
        }));
    };

    const handleSave = () => {
        onSave(localConfig);
    };

    if (!isOpen) return null;

    const tabClasses = (tabName: typeof activeTab) =>
        `px-4 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === tabName ? 'bg-primary text-white' : 'hover:bg-gray-200'}`;

    const inputClasses = "w-24 p-2 border rounded bg-transparent border-border focus:ring-success focus:border-success text-sm text-right";
    const labelClasses = "block text-sm font-medium text-primary";

    const RateTable: React.FC<{
        rates: InstallmentRate[];
        type: 'creditNoInterestRates' | 'creditWithInterestRates';
    }> = ({ rates, type }) => (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {rates.map(rate => (
                <div key={rate.installments}>
                    <label className={`${labelClasses} mb-1`}>{rate.installments}x Parcela(s)</label>
                    <div className="relative">
                        <input
                            type="number"
                            step="0.01"
                            value={rate.rate}
                            onChange={(e) => handleRateChange(type, rate.installments, Number(e.target.value) || 0)}
                            className={inputClasses}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">%</span>
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[70] p-4">
            <div className="bg-surface rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-border">
                    <div className="flex items-center gap-3">
                        <CreditCardIcon className="h-6 w-6 text-primary" />
                        <h2 className="text-xl font-bold text-primary">Configurações de Cartão</h2>
                    </div>
                    <button onClick={onClose} className="p-1 text-muted hover:text-danger"><CloseIcon className="h-6 w-6" /></button>
                </div>

                <div className="p-4 border-b border-border">
                    <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg max-w-max">
                        <button onClick={() => setActiveTab('debit')} className={tabClasses('debit')}>Débito</button>
                        <button onClick={() => setActiveTab('creditNoInterest')} className={tabClasses('creditNoInterest')}>Crédito (Sem Juros)</button>
                        <button onClick={() => setActiveTab('creditWithInterest')} className={tabClasses('creditWithInterest')}>Crédito (Com Juros)</button>
                    </div>
                </div>

                <div className="p-6 flex-1 overflow-y-auto space-y-6">
                    {activeTab === 'debit' && (
                        <div>
                            <h3 className="text-lg font-semibold text-primary mb-2">Taxa de Débito</h3>
                            <p className="text-sm text-muted mb-4">Insira a taxa percentual cobrada nas vendas com cartão de débito.</p>
                            <div>
                                <label className={`${labelClasses} mb-1`}>Taxa de Débito (%)</label>
                                <div className="relative w-32">
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={localConfig.debitRate}
                                        onChange={handleDebitRateChange}
                                        className={inputClasses}
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">%</span>
                                </div>
                            </div>
                        </div>
                    )}
                    {activeTab === 'creditNoInterest' && (
                        <div>
                            <h3 className="text-lg font-semibold text-primary mb-2">Crédito (Sem Juros para o cliente)</h3>
                            <p className="text-sm text-muted mb-4">Configure as taxas que <span className="font-bold">você (vendedor)</span> absorve ao oferecer parcelamento sem juros. O valor final para o cliente não muda.</p>
                            <RateTable rates={localConfig.creditNoInterestRates} type="creditNoInterestRates" />
                        </div>
                    )}
                    {activeTab === 'creditWithInterest' && (
                        <div>
                            <h3 className="text-lg font-semibold text-primary mb-2">Crédito (Com Juros para o cliente)</h3>
                            <p className="text-sm text-muted mb-4">Configure as taxas de juros que serão repassadas <span className="font-bold">ao cliente</span> no valor da venda ao parcelar.</p>
                            <RateTable rates={localConfig.creditWithInterestRates} type="creditWithInterestRates" />
                        </div>
                    )}
                </div>

                <div className="flex justify-end items-center p-4 border-t border-border mt-auto gap-4">
                    <button onClick={onClose} className="px-6 py-2 bg-gray-200 text-secondary rounded-md hover:bg-gray-300 font-semibold">Cancelar</button>
                    <button onClick={handleSave} className="px-6 py-2 bg-success text-white rounded-md hover:bg-success/90 font-semibold flex items-center gap-2">
                        <CheckIcon className="h-5 w-5" />
                        Salvar Configurações
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CardConfigModal;