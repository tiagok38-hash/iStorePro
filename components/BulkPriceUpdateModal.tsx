import React, { useState, useMemo } from 'react';
import { Product } from '../../types.ts';
import { SpinnerIcon, SearchIcon, XCircleIcon, InfoIcon } from './icons.tsx';
import { formatCurrency } from '../services/mockApi.ts';
import CurrencyInput from './CurrencyInput.tsx';

interface BulkPriceUpdateModalProps {
    allProducts: Product[];
    onClose: () => void;
    onBulkUpdate: (updates: { id: string; price?: number; costPrice?: number; wholesalePrice?: number }[]) => Promise<void>;
}

const BulkPriceUpdateModal: React.FC<BulkPriceUpdateModalProps> = ({ allProducts, onClose, onBulkUpdate }) => {
    const [conditionFilter, setConditionFilter] = useState('todas');
    const [searchTerm, setSearchTerm] = useState('');
    const [searchedProducts, setSearchedProducts] = useState<Product[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const [newCostPrice, setNewCostPrice] = useState<number | null>(null);
    const [newSalePrice, setNewSalePrice] = useState<number | null>(null);
    const [newWholesalePrice, setNewWholesalePrice] = useState<number | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);

    const handleSearch = () => {
        setIsSearching(true);
        const lowerSearchTerm = searchTerm.toLowerCase();
        const results = allProducts.filter(p => {
            const description = `${p.brand} ${p.model} ${p.color || ''}`.toLowerCase();
            const searchMatch = description.includes(lowerSearchTerm);
            const conditionMatch = conditionFilter === 'todas' || p.condition === conditionFilter;
            const stockMatch = p.stock > 0;
            return searchMatch && conditionMatch && stockMatch;
        });
        // Simulate a small delay for user feedback
        setTimeout(() => {
            setSearchedProducts(results);
            setIsSearching(false);
        }, 300);
    };

    const handleUpdate = async () => {
        if (searchedProducts.length === 0) return;
        if (newCostPrice === null && newSalePrice === null && newWholesalePrice === null) {
            alert('Preencha pelo menos um campo de preço para atualizar.');
            return;
        }

        setIsUpdating(true);
        const updates = searchedProducts.map(p => ({
            id: p.id,
            ...(newSalePrice !== null && { price: newSalePrice }),
            ...(newCostPrice !== null && { costPrice: newCostPrice }),
            ...(newWholesalePrice !== null && { wholesalePrice: newWholesalePrice }),
        }));

        await onBulkUpdate(updates);
        setIsUpdating(false);
    };

    const inputClasses = "p-2 border rounded bg-surface border-border focus:ring-success focus:border-success text-sm";
    const currencyInputClasses = `${inputClasses} font-semibold`;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-surface rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-border">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-bold text-primary">Atualização de Preço em massa</h2>
                    </div>
                    <button onClick={onClose} className="p-1 text-muted hover:text-danger"><XCircleIcon className="h-6 w-6" /></button>
                </div>

                <div className="p-4 space-y-4">
                    <div className="flex items-center gap-4">
                        <select value={conditionFilter} onChange={e => setConditionFilter(e.target.value)} className={`${inputClasses} w-52`}>
                            <option value="todas">Todas as Condições</option>
                            <option>Novo</option><option>Seminovo</option><option>CPO</option><option>Openbox</option>
                        </select>
                        <input
                            type="text"
                            placeholder="Digite o nome do produto para buscar..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className={`${inputClasses} flex-1`}
                        />
                        <button onClick={handleSearch} disabled={isSearching} className="flex items-center justify-center gap-2 px-6 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:bg-muted">
                            {isSearching ? <SpinnerIcon className="h-5 w-5" /> : <SearchIcon />}
                            BUSCAR
                        </button>
                    </div>
                    <div className="p-3 bg-accent-light text-accent rounded-md text-sm flex items-start gap-2">
                        <InfoIcon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                        <div>
                            <span className="font-bold">Dica de busca eficiente:</span> Utilize a mesma nomenclatura dos itens disponíveis em seu estoque, como por exemplo: "iPhone 16 Pro Max 512GB", dessa forma exibirá somente os produtos que correspondem com a informação digitada.
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto border-t border-b border-border">
                    <table className="w-full text-sm">
                        <thead className="text-left text-xs text-muted bg-surface-secondary sticky top-0">
                            <tr>
                                <th className="p-2">Descrição</th>
                                <th className="p-2 text-center">Estoque atual</th>
                                <th className="p-2 text-right">Custo atual</th>
                                <th className="p-2 text-right">Venda atual</th>
                                <th className="p-2 text-right">ATC atual</th>
                            </tr>
                        </thead>
                        <tbody>
                            {searchedProducts.map(product => {
                                const baseDesc = `${product.brand} ${product.model}`;
                                const showColor = product.color && !baseDesc.toLowerCase().includes(product.color.toLowerCase());
                                return (
                                    <tr key={product.id} className="border-b border-border">
                                        <td className="p-2 font-medium text-primary">{`${baseDesc}${showColor ? ' ' + product.color : ''}`}</td>
                                        <td className="p-2 text-center">{product.stock}</td>
                                        <td className="p-2 text-right">{formatCurrency(product.costPrice || 0)}</td>
                                        <td className="p-2 text-right font-semibold">{formatCurrency(product.price)}</td>
                                        <td className="p-2 text-right text-muted">{formatCurrency(product.wholesalePrice || 0)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {searchedProducts.length === 0 && !isSearching && (
                        <p className="text-center text-muted py-8">Nenhum produto encontrado. Refine sua busca.</p>
                    )}
                </div>

                <div className="p-4 bg-surface-secondary flex items-end justify-between">
                    <div>
                        <p className="text-sm text-muted">Para atualizar os preços dos itens listados, preencha apenas os campos que deseja modificar. <span className="font-semibold">Deixe vazio os que não deseja alterar.</span></p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div>
                            <label className="block text-xs font-medium text-muted mb-1">Novo preço de Custo</label>
                            <CurrencyInput
                                value={newCostPrice}
                                onChange={setNewCostPrice}
                                className={`${currencyInputClasses} w-36`}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-muted mb-1">Novo preço de Venda</label>
                            <CurrencyInput
                                value={newSalePrice}
                                onChange={setNewSalePrice}
                                className={`${currencyInputClasses} w-36`}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-muted mb-1">Novo preço ATC</label>
                            <CurrencyInput
                                value={newWholesalePrice}
                                onChange={setNewWholesalePrice}
                                className={`${currencyInputClasses} w-36`}
                            />
                        </div>
                        <button onClick={handleUpdate} disabled={isUpdating || searchedProducts.length === 0} className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:bg-muted self-end">
                            {isUpdating ? <SpinnerIcon className="h-5 w-5" /> : 'ATUALIZAR'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BulkPriceUpdateModal;