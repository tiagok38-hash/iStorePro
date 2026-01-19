import React, { useState, useEffect } from 'react';
import { ProductModel } from '../../types.ts';
import { CloseIcon, EyeIcon, EyeSlashIcon, EditIcon } from './icons.tsx';

interface SubcategoryModalProps {
    item: Partial<ProductModel> | null;
    brandName: string;
    categoryName: string;
    onSave: (item: Partial<ProductModel>) => void;
    onClose: () => void;
    isSaving?: boolean;
}

import Button from './Button.tsx';

const exampleCards = [
    { brand: 'Xiaomi', category: 'Smartphone', subcategory: 'Redmi Note 13 Pro 8GB/256GB - Azul' },
    { brand: 'Xiaomi', category: 'Tablet', subcategory: 'Redmi Pad SE 4GB/128GB' },
    { brand: 'DJI', category: 'Drone', subcategory: 'Mini 2 SE Fly More Combo 2.7K' },
    { brand: 'TP-Link', category: 'Roteador', subcategory: 'Archer AX72' },
    { brand: 'Samsung', category: 'Smartphone', subcategory: 'A72 6GB/128GB - Branco' },
    { brand: 'Samsung', category: 'Smart TV', subcategory: 'UN43T5300 43" Full HD' },
];

const SubcategoryModal: React.FC<SubcategoryModalProps> = ({ item, brandName, categoryName, onSave, onClose, isSaving }) => {
    const [name, setName] = useState('');
    const [showOrientation, setShowOrientation] = useState(true);

    useEffect(() => {
        if (item) {
            setName(item.name || '');
        }
    }, [item]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ ...item, name });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <form onSubmit={handleSubmit} className="bg-surface rounded-lg shadow-xl w-full max-w-2xl">
                <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="flex items-center gap-2 font-bold text-lg text-primary">
                        <EditIcon className="h-5 w-5" />
                        Editor de Subcategoria
                    </h3>
                    <button
                        type="button"
                        onClick={() => setShowOrientation(!showOrientation)}
                        className="px-3 py-1.5 bg-blue-500 text-white text-xs font-semibold rounded-md flex items-center gap-2 hover:bg-blue-600"
                    >
                        {showOrientation ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                        {showOrientation ? 'OCULTAR ORIENTAÇÃO' : 'MOSTRAR ORIENTAÇÃO'}
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {showOrientation && (
                        <div className="space-y-4 mb-6">
                            <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 text-sm rounded-md">
                                A Subcategoria poderá ser tratada como o <b>Modelo</b> do produto que pretende incluir no estoque. Por exemplo:
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                {exampleCards.map((card, index) => (
                                    <div key={index} className="p-3 border border-border rounded-md bg-surface-secondary text-sm">
                                        <p><span className="font-semibold">Marca:</span> {card.brand}</p>
                                        <p className="text-blue-600 font-medium"><span className="font-semibold text-primary">Categoria:</span> {card.category}</p>
                                        <p className="text-blue-600 font-medium"><span className="font-semibold text-primary">Subcategoria:</span> {card.subcategory}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                        <p className="text-sm"><span className="font-bold">Marca:</span> {brandName}</p>
                        <p className="text-sm"><span className="font-bold">Categoria:</span> {categoryName}</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-primary mb-1">Nome da Subcategoria</label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full p-2 border rounded bg-transparent border-border"
                            autoFocus
                            required
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-4 p-4 bg-gray-50 border-t">
                    <Button type="button" onClick={onClose} variant="secondary">
                        Fechar
                    </Button>
                    <Button type="submit" variant="primary" loading={isSaving}>
                        Salvar
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default SubcategoryModal;