import React, { useState, useEffect } from 'react';
import { PaymentMethodParameter, CardConfigData, PaymentMethodCategory, InstallmentRate } from '../../types.ts';
import { CloseIcon, CheckIcon, CreditCardIcon } from './icons.tsx';
import PercentageInput from './PercentageInput.tsx';
import Button from './Button.tsx';

interface PaymentMethodModalProps {
    item: Partial<PaymentMethodParameter> | null;
    onSave: (item: Partial<PaymentMethodParameter>) => void;
    onClose: () => void;
    isSaving?: boolean;
}

const defaultCardConfig: CardConfigData = {
    debitRate: 0,
    creditNoInterestRates: Array.from({ length: 21 }, (_, i) => ({ installments: i + 1, rate: 0 })),
    creditWithInterestRates: Array.from({ length: 21 }, (_, i) => ({ installments: i + 1, rate: 0 })),
};

const PaymentMethodModal: React.FC<PaymentMethodModalProps> = ({ item, onSave, onClose, isSaving }) => {
    const [formData, setFormData] = useState<Partial<PaymentMethodParameter>>({
        name: '',
        type: 'cash',
        active: true,
        config: defaultCardConfig
    });

    useEffect(() => {
        if (item) {
            setFormData({
                id: item.id,
                name: item.name || '',
                type: item.type || 'cash',
                active: item.active !== undefined ? item.active : true, // Default to true if undefined
                config: item.config ? {
                    debitRate: item.config.debitRate,
                    creditNoInterestRates: ensureInstallments(item.config.creditNoInterestRates),
                    creditWithInterestRates: ensureInstallments(item.config.creditWithInterestRates),
                } : defaultCardConfig
            });
        }
    }, [item]);

    const ensureInstallments = (rates: InstallmentRate[]): InstallmentRate[] => {
        const existing = new Map(rates.map(r => [r.installments, r]));
        const fullRates: InstallmentRate[] = [];
        for (let i = 1; i <= 21; i++) {
            if (existing.has(i)) {
                fullRates.push(existing.get(i)!);
            } else {
                fullRates.push({ installments: i, rate: 0 });
            }
        }
        return fullRates;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : (name === 'active' ? value === 'true' : value)
        }));
    };

    const handleConfigChange = (field: keyof CardConfigData, value: any) => {
        setFormData(prev => ({
            ...prev,
            config: {
                ...prev.config!,
                [field]: value
            }
        }));
    };

    const handleRateChange = (
        type: 'creditNoInterestRates' | 'creditWithInterestRates',
        installments: number,
        rate: number
    ) => {
        if (!formData.config) return;
        const newRates = formData.config[type].map(r => r.installments === installments ? { ...r, rate } : r);
        handleConfigChange(type, newRates);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    const inputClasses = "w-full p-2 border rounded bg-transparent border-border focus:ring-2 focus:ring-primary/20 outline-none transition-all";
    const labelClasses = "block text-sm font-medium text-primary mb-1";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[70] p-4">
            <div className="bg-surface rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-border">
                    <div className="flex items-center gap-2">
                        <CreditCardIcon className="h-5 w-5 text-primary" />
                        <h3 className="font-bold text-lg text-primary">{item?.id ? 'Editar' : 'Nova'} Forma de Pagamento</h3>
                    </div>
                    <button type="button" onClick={onClose}><CloseIcon className="h-6 w-6 text-muted hover:text-danger" /></button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
                    <div className="p-6 overflow-y-auto space-y-4">
                        <div>
                            <label className={labelClasses}>Nome:</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name || ''}
                                onChange={handleChange}
                                className={inputClasses}
                                placeholder="Ex: Cartão de Crédito"
                                required
                                autoFocus
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClasses}>Status:</label>
                                <select
                                    name="active"
                                    value={formData.active ? 'true' : 'false'}
                                    onChange={e => setFormData(prev => ({ ...prev, active: e.target.value === 'true' }))}
                                    className={inputClasses}
                                >
                                    <option value="true">Ativo</option>
                                    <option value="false">Inativo</option>
                                </select>
                            </div>
                            <div>
                                <label className={labelClasses}>Tipo:</label>
                                <select
                                    name="type"
                                    value={formData.type || 'cash'}
                                    onChange={handleChange}
                                    className={inputClasses}
                                >
                                    <option value="cash">A vista / Geral</option>
                                    <option value="card">Cartão</option>
                                    <option value="pending">Valor Pendente</option>
                                </select>
                            </div>
                        </div>

                        {formData.type === 'card' && formData.config && (
                            <div className="mt-6 border-t border-border pt-4">
                                <h4 className="font-bold text-base mb-3 text-primary">Taxas da Maquininha</h4>

                                <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-border">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-semibold text-gray-700 w-24">Débito</label>
                                        <div className="w-32">
                                            <PercentageInput
                                                value={formData.config.debitRate}
                                                onChange={(val) => handleConfigChange('debitRate', val)}
                                                className={`${inputClasses} text-right pr-8 bg-white`}
                                            />
                                        </div>
                                    </div>

                                    <div className="border-t border-gray-200 my-2"></div>
                                    <p className="text-xs text-muted font-medium uppercase tracking-wider mb-2">Crédito (Com Juros)</p>

                                    {formData.config.creditWithInterestRates.map((rate) => (
                                        <div key={rate.installments} className="flex items-center justify-between">
                                            <label className="text-sm text-gray-600 w-24">{rate.installments}x</label>
                                            <div className="w-32">
                                                <PercentageInput
                                                    value={rate.rate}
                                                    onChange={(val) => handleRateChange('creditWithInterestRates', rate.installments, val)}
                                                    className={`${inputClasses} text-right pr-8 bg-white`}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-4 bg-gray-50 border-t border-border flex justify-end gap-3">
                        <Button type="button" onClick={onClose} variant="secondary">
                            Cancelar
                        </Button>
                        <Button type="submit" variant="primary" loading={isSaving} icon={<CheckIcon className="h-4 w-4" />}>
                            Salvar
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PaymentMethodModal;
