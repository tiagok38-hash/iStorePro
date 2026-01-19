import React, { useState, useEffect } from 'react';
import { Supplier } from '../../types.ts';
import { formatPhone } from '../services/mockApi.ts';

interface SupplierModalProps {
    supplier: Partial<Supplier> | null;
    onClose: () => void;
    onSave: (supplierData: Omit<Supplier, 'id'> | Supplier) => void;
}

const formatCNPJ = (value: string) => {
    return value
        .replace(/\D/g, '')
        .substring(0, 14)
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2');
};

const SupplierModal: React.FC<SupplierModalProps> = ({ supplier, onClose, onSave }) => {
    const [formData, setFormData] = useState<Partial<Supplier>>({});

    useEffect(() => {
        setFormData(supplier || {});
    }, [supplier]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        let formattedValue = value;
        if (name === 'cnpj') formattedValue = formatCNPJ(value);
        else if (name === 'phone') formattedValue = formatPhone(value);
        setFormData(prev => ({ ...prev, [name]: formattedValue }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData as Supplier);
    };

    const inputClasses = "p-2 border rounded-md bg-white border-border focus:ring-1 focus:ring-success focus:border-success w-full text-sm h-10";
    const labelClasses = "block text-sm font-medium text-gray-700 mb-1";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4 transition-opacity">
            <div className="bg-surface rounded-lg shadow-2xl w-full max-w-2xl">
                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-lg font-bold text-primary">{supplier?.id ? 'Editar' : 'Adicionar'} Fornecedor</h2>
                    <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-gray-200">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-4">
                        <div><label className={labelClasses}>Nome do Fornecedor*</label><input name="name" value={formData.name || ''} onChange={handleChange} className={inputClasses} required /></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label className={labelClasses}>Pessoa de Contato</label><input name="contactPerson" value={formData.contactPerson || ''} onChange={handleChange} className={inputClasses} /></div>
                            <div><label className={labelClasses}>CNPJ</label><input name="cnpj" value={formData.cnpj || ''} onChange={handleChange} className={inputClasses} /></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label className={labelClasses}>Email</label><input name="email" type="email" value={formData.email || ''} onChange={handleChange} className={inputClasses} /></div>
                            <div><label className={labelClasses}>Telefone</label><input name="phone" value={formData.phone || ''} onChange={handleChange} className={inputClasses} /></div>
                        </div>
                        <div><label className={labelClasses}>Endereço</label><textarea name="address" value={formData.address || ''} onChange={handleChange} className={`${inputClasses} h-20`} /></div>
                    </div>
                    <div className="flex justify-end p-4 bg-gray-50 border-t">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-secondary rounded-md hover:bg-gray-300 mr-2">Cancelar</button>
                        <button type="submit" className="px-4 py-2 bg-success text-white rounded-md hover:bg-success/90">Salvar</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SupplierModal;
