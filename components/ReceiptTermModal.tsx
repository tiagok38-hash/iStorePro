import React, { useState, useEffect } from 'react';
import { ReceiptTermParameter, ReceiptTermSection } from '../../types.ts';
import { CloseIcon, PlusIcon } from './icons.tsx';

interface ReceiptTermModalProps {
    item: Partial<ReceiptTermParameter> | null;
    onSave: (item: Partial<ReceiptTermParameter>) => void;
    onClose: () => void;
    isSaving?: boolean;
}

import Button from './Button.tsx';

const ReceiptTermModal: React.FC<ReceiptTermModalProps> = ({ item, onSave, onClose, isSaving }) => {
    const [formData, setFormData] = useState<Partial<ReceiptTermParameter>>({
        name: '',
        warrantyTerm: { content: '', showOnReceipt: true },
        warrantyExclusions: { content: '', showOnReceipt: true },
        imageRights: { content: '', showOnReceipt: true },
    });

    useEffect(() => {
        setFormData({
            id: item?.id,
            name: item?.name || '',
            warrantyTerm: item?.warrantyTerm ? { ...item.warrantyTerm } : { content: '', showOnReceipt: true },
            warrantyExclusions: item?.warrantyExclusions ? { ...item.warrantyExclusions } : { content: '', showOnReceipt: true },
            imageRights: item?.imageRights ? { ...item.imageRights } : { content: '', showOnReceipt: true },
        });
    }, [item]);

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, name: e.target.value }));
    };

    const handleSectionChange = (
        sectionKey: 'warrantyTerm' | 'warrantyExclusions' | 'imageRights',
        field: keyof ReceiptTermSection,
        value: string | boolean
    ) => {
        setFormData(prev => ({
            ...prev,
            [sectionKey]: {
                ...(prev[sectionKey] || { content: '', showOnReceipt: true }),
                [field]: value,
            },
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[60] p-4">
            <form onSubmit={handleSubmit} className="bg-surface rounded-lg shadow-xl w-full max-w-2xl">
                <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="flex items-center gap-2 font-bold text-lg text-primary">
                        <PlusIcon className="h-5 w-5" />
                        {item?.id ? 'Editar' : 'Cadastrar'} Termo de Garantia
                    </h3>
                    <button type="button" onClick={onClose}><CloseIcon className="h-6 w-6 text-muted hover:text-danger" /></button>
                </div>

                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-primary mb-1">Nome de identificação do seu termo:</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name || ''}
                            onChange={handleNameChange}
                            className="w-full p-2 border rounded bg-transparent border-border"
                            placeholder="Insira o nome"
                            autoFocus
                            required
                        />
                    </div>

                    {/* Warranty Term Section */}
                    <div className="border border-border rounded-lg">
                        <div className={`flex justify-between items-center p-3 bg-surface-secondary ${formData.warrantyTerm?.showOnReceipt ? 'rounded-t-lg' : 'rounded-lg'}`}>
                            <h4 className="font-semibold text-primary">Termo de Garantia</h4>
                            <div className="flex items-center gap-4 text-sm">
                                <span>Exibir no recibo</span>
                                <label className="flex items-center gap-1 cursor-pointer">
                                    <input type="radio" name="warrantyTerm-show" checked={formData.warrantyTerm?.showOnReceipt === true} onChange={() => handleSectionChange('warrantyTerm', 'showOnReceipt', true)} className="form-radio w-4 h-4" /> sim
                                </label>
                                <label className="flex items-center gap-1 cursor-pointer">
                                    <input type="radio" name="warrantyTerm-show" checked={formData.warrantyTerm?.showOnReceipt === false} onChange={() => handleSectionChange('warrantyTerm', 'showOnReceipt', false)} className="form-radio w-4 h-4" /> não
                                </label>
                            </div>
                        </div>
                        {formData.warrantyTerm?.showOnReceipt && (
                            <textarea
                                value={formData.warrantyTerm?.content || ''}
                                onChange={(e) => handleSectionChange('warrantyTerm', 'content', e.target.value)}
                                rows={4}
                                className="w-full p-3 bg-surface rounded-b-lg focus:ring-0 focus:outline-none border-t border-border"
                                placeholder="Digite os termos aqui..."
                            />
                        )}
                    </div>

                    {/* Warranty Exclusions Section */}
                    <div className="border border-border rounded-lg">
                        <div className={`flex justify-between items-center p-3 bg-surface-secondary ${formData.warrantyExclusions?.showOnReceipt ? 'rounded-t-lg' : 'rounded-lg'}`}>
                            <h4 className="font-semibold text-primary">A garantia não cobre</h4>
                            <div className="flex items-center gap-4 text-sm">
                                <span>Exibir no recibo</span>
                                <label className="flex items-center gap-1 cursor-pointer">
                                    <input type="radio" name="warrantyExclusions-show" checked={formData.warrantyExclusions?.showOnReceipt === true} onChange={() => handleSectionChange('warrantyExclusions', 'showOnReceipt', true)} className="form-radio w-4 h-4" /> sim
                                </label>
                                <label className="flex items-center gap-1 cursor-pointer">
                                    <input type="radio" name="warrantyExclusions-show" checked={formData.warrantyExclusions?.showOnReceipt === false} onChange={() => handleSectionChange('warrantyExclusions', 'showOnReceipt', false)} className="form-radio w-4 h-4" /> não
                                </label>
                            </div>
                        </div>
                        {formData.warrantyExclusions?.showOnReceipt && (
                            <textarea
                                value={formData.warrantyExclusions?.content || ''}
                                onChange={(e) => handleSectionChange('warrantyExclusions', 'content', e.target.value)}
                                rows={4}
                                className="w-full p-3 bg-surface rounded-b-lg focus:ring-0 focus:outline-none border-t border-border"
                                placeholder="Digite os termos aqui..."
                            />
                        )}
                    </div>

                    {/* Image Rights Section */}
                    <div className="border border-border rounded-lg">
                        <div className={`flex justify-between items-center p-3 bg-surface-secondary ${formData.imageRights?.showOnReceipt ? 'rounded-t-lg' : 'rounded-lg'}`}>
                            <h4 className="font-semibold text-primary">Direito de Imagem</h4>
                            <div className="flex items-center gap-4 text-sm">
                                <span>Exibir no recibo</span>
                                <label className="flex items-center gap-1 cursor-pointer">
                                    <input type="radio" name="imageRights-show" checked={formData.imageRights?.showOnReceipt === true} onChange={() => handleSectionChange('imageRights', 'showOnReceipt', true)} className="form-radio w-4 h-4" /> sim
                                </label>
                                <label className="flex items-center gap-1 cursor-pointer">
                                    <input type="radio" name="imageRights-show" checked={formData.imageRights?.showOnReceipt === false} onChange={() => handleSectionChange('imageRights', 'showOnReceipt', false)} className="form-radio w-4 h-4" /> não
                                </label>
                            </div>
                        </div>
                        {formData.imageRights?.showOnReceipt && (
                            <textarea
                                value={formData.imageRights?.content || ''}
                                onChange={(e) => handleSectionChange('imageRights', 'content', e.target.value)}
                                rows={4}
                                className="w-full p-3 bg-surface rounded-b-lg focus:ring-0 focus:outline-none border-t border-border"
                                placeholder="Digite os termos aqui..."
                            />
                        )}
                    </div>
                </div>

                <div className="flex justify-center p-4 bg-gray-50 border-t">
                    <Button type="submit" variant="primary" loading={isSaving} className="px-10">
                        Salvar
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default ReceiptTermModal;
