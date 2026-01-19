
import React, { useState } from 'react';
import { Customer, ReceiptTermParameter } from '../../types';
import { useToast } from '../contexts/ToastContext';
import { Cog6ToothIcon, DocumentTextIcon, PrinterIcon, CheckIcon } from './icons';
import SearchableDropdown from './SearchableDropdown';

interface PosSettingsViewProps {
    customers: Customer[];
    receiptTerms: ReceiptTermParameter[];
    onUpdateReceiptFormat: (fmt: 'A4' | 'thermal') => void;
}

export const PosSettingsView: React.FC<PosSettingsViewProps> = ({ customers, receiptTerms, onUpdateReceiptFormat }) => {
    const { showToast } = useToast();
    const [defCust, setDefCust] = useState(localStorage.getItem('pos_default_customer_id') || '');
    const [defWar, setDefWar] = useState(localStorage.getItem('pos_default_warranty_term') || '');
    const [defFmt, setDefFmt] = useState<'A4' | 'thermal' | null>((localStorage.getItem('pos_default_receipt_format') as 'A4' | 'thermal') || null);

    const handleSave = () => {
        if (defCust) localStorage.setItem('pos_default_customer_id', defCust);
        else localStorage.removeItem('pos_default_customer_id');

        if (defWar) localStorage.setItem('pos_default_warranty_term', defWar);
        else localStorage.removeItem('pos_default_warranty_term');

        if (defFmt) {
            localStorage.setItem('pos_default_receipt_format', defFmt);
            onUpdateReceiptFormat(defFmt);
        } else {
            localStorage.removeItem('pos_default_receipt_format');
        }

        showToast('Configurações salvas com sucesso!', 'success');
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in p-6">
            <h2 className="text-2xl font-bold text-gray-800 border-b pb-4 mb-6">Configurações do PDV</h2>

            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 space-y-8">
                <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Cog6ToothIcon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">Preferências de Venda</h3>
                        <p className="text-sm text-muted">Personalize o comportamento padrão do seu caixa</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Cliente Padrão</label>
                        <p className="text-xs text-muted mb-3 h-8">Cliente pré-selecionado ao iniciar venda.</p>
                        <SearchableDropdown
                            options={customers.map(c => ({ value: c.id, label: c.name }))}
                            value={defCust}
                            onChange={(val) => setDefCust(val)}
                            placeholder="Buscar cliente..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Termo de Garantia Padrão</label>
                        <p className="text-xs text-muted mb-3 h-8">Termo aplicado automaticamente a novos produtos.</p>
                        <select
                            className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium text-gray-700"
                            value={defWar}
                            onChange={(e) => setDefWar(e.target.value)}
                        >
                            <option value="">-- Padrão do Sistema --</option>
                            {receiptTerms.map(t => (
                                <option key={t.id} value={t.name}>{t.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Formato de Impressão Padrão</label>
                        <p className="text-xs text-muted mb-3">Escolha como os comprovantes serão impressos por padrão. Se nenhum for selecionado, o sistema perguntará a cada impressão.</p>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-3 ${defFmt === 'A4' ? 'border-primary bg-primary/5 text-primary shadow-sm' : 'border-gray-200 hover:bg-gray-50 text-gray-500'}`}
                                onClick={() => setDefFmt(defFmt === 'A4' ? null : 'A4')}
                            >
                                <DocumentTextIcon className="h-8 w-8" />
                                <span className="font-bold">Folha A4</span>
                            </button>
                            <button
                                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-3 ${defFmt === 'thermal' ? 'border-primary bg-primary/5 text-primary shadow-sm' : 'border-gray-200 hover:bg-gray-50 text-gray-500'}`}
                                onClick={() => setDefFmt(defFmt === 'thermal' ? null : 'thermal')}
                            >
                                <PrinterIcon className="h-8 w-8" />
                                <span className="font-bold">Térmica 80mm</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="pt-6 border-t border-gray-100 flex justify-end">
                    <button
                        onClick={handleSave}
                        className="px-6 py-2 bg-success text-white rounded-lg font-bold text-sm shadow-md shadow-success/20 hover:bg-success/90 transition-all flex items-center gap-2"
                    >
                        <CheckIcon className="h-4 w-4" />
                        SALVAR ALTERAÇÕES
                    </button>
                </div>
            </div>
        </div>
    );
};
