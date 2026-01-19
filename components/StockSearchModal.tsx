import React, { useState, useEffect, useRef } from 'react';
import { Product } from '../../types.ts';
import { SearchIcon, XCircleIcon, ArchiveBoxIcon, CheckIcon } from './icons.tsx';
import { formatCurrency } from '../services/mockApi.ts';

interface StockSearchModalProps {
    products: Product[];
    onClose: () => void;
}

const StockSearchModal: React.FC<StockSearchModalProps> = ({ products, onClose }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

    const filteredProducts = products.filter(p => {
        if (!searchTerm) return false;
        const term = searchTerm.toLowerCase();
        return (
            (p.model || '').toLowerCase().includes(term) ||
            (p.imei1 || '').toLowerCase().includes(term) ||
            (p.imei2 || '').toLowerCase().includes(term) ||
            (p.serialNumber || '').toLowerCase().includes(term) ||
            (p.brand || '').toLowerCase().includes(term) ||
            (p.observations || '').toLowerCase().includes(term)
        ) && p.stock > 0;
    });

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <ArchiveBoxIcon className="h-6 w-6 text-primary" />
                            Consulta Rápida de Estoque
                        </h2>
                        <p className="text-sm text-muted mt-1">Pesquise por descrição, IMEI ou Serial Number</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
                        <XCircleIcon className="h-6 w-6" />
                    </button>
                </div>

                {/* Search Bar */}
                <div className="p-6 bg-white border-b border-gray-100">
                    <div className="flex items-center border-2 border-gray-200 rounded-xl bg-white focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 transition-all">
                        <div className="pl-4">
                            <SearchIcon className="h-6 w-6 text-gray-400" />
                        </div>
                        <input
                            ref={inputRef}
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Pesquise por IMEI, Serial, Modelo (ou bipe)..."
                            className="flex-1 w-full py-4 px-4 text-lg font-medium outline-none bg-transparent border-none focus:ring-0"
                        />
                    </div>
                </div>

                {/* Results */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                    {searchTerm === '' ? (
                        <div className="flex flex-col items-center justify-center h-64 text-muted">
                            <ArchiveBoxIcon className="h-16 w-16 text-gray-300 mb-4" />
                            <p className="font-medium">Digite algo para pesquisar no estoque.</p>
                        </div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-muted">
                            <p className="font-medium">Nenhum produto encontrado em estoque.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-3">
                            {filteredProducts.map(product => (
                                <div key={product.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:border-primary hover:shadow-md transition-all group">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-bold text-gray-900 text-lg">{product.model}</span>
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${product.condition === 'Novo' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                                    {product.condition}
                                                </span>
                                                {product.origin === 'Troca' && (
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-orange-100 text-orange-700">
                                                        Troca
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-muted flex flex-wrap gap-x-4 gap-y-1">
                                                {product.imei1 && <span><strong className="text-gray-500">IMEI:</strong> {product.imei1}</span>}
                                                {product.serialNumber && <span><strong className="text-gray-500">S/N:</strong> {product.serialNumber}</span>}
                                                {product.storageLocation && <span><strong className="text-gray-500">Local:</strong> {product.storageLocation}</span>}
                                                {(product.batteryHealth !== undefined && product.batteryHealth > 0) && <span><strong className="text-gray-500">Bateria:</strong> {product.batteryHealth}%</span>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <div className="text-right">
                                                <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Estoque</p>
                                                <p className={`text-lg font-black ${product.stock > 0 ? 'text-gray-800' : 'text-red-500'}`}>{product.stock}</p>
                                            </div>
                                            <div className="text-right min-w-[100px]">
                                                <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Preço</p>
                                                <p className="text-xl font-black text-primary">{formatCurrency(product.price)}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
export default StockSearchModal;
