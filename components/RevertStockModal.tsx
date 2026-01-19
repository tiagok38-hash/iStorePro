import React from 'react';
import { PurchaseOrder, Product } from '../../types.ts';
import { formatCurrency } from '../services/mockApi.ts';
import { SpinnerIcon, ArrowUturnLeftIcon, ArchiveBoxIcon } from './icons.tsx';

// Ensure Battery100Icon exists or use valid one. I will use a simple text or check icons later.
// Actually icons.tsx doesn't have Battery100Icon. I will use 'Battery' text or logic from Compras.tsx

interface RevertStockModalProps {
    purchase: PurchaseOrder;
    products: Product[]; // Products linked to this purchase
    onClose: () => void;
    onConfirm: () => Promise<void>;
    isReverting: boolean;
}

const RevertStockModal: React.FC<RevertStockModalProps> = ({ purchase, products, onClose, onConfirm, isReverting }) => {

    // Calculate suggested price if not explicitly stored, or just use what we have.
    // Logic: cost * (1 + markup/100).
    // But product likely has it.

    const getBatteryColor = (health?: number) => {
        if (!health) return 'text-gray-500';
        return health >= 80 ? 'text-green-600' : 'text-orange-600';
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[70] p-4 animate-fade-in">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col overflow-hidden animate-slide-up">
                {/* Header */}
                <div className="flex justify-center items-center p-4 border-b border-gray-200">
                    <h2 className="text-lg font-bold text-gray-700">
                        Reverter estoque da compra #{purchase.displayId} - {purchase.supplierName}
                    </h2>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1 flex flex-col items-center">

                    {/* Icon */}
                    <div className="mb-6">
                        <div className="w-24 h-24 rounded-full border-4 border-red-500 flex items-center justify-center">
                            <ArrowUturnLeftIcon className="w-12 h-12 text-red-500" strokeWidth={2} />
                        </div>
                    </div>

                    {/* Warning Text */}
                    <div className="text-center mb-8 max-w-2xl">
                        <p className="text-lg font-medium text-gray-600">
                            Tem certeza de que deseja reverter o estoque da compra do fornecedor "{purchase.supplierName}"?
                        </p>
                        <p className="text-gray-500 mt-1">
                            Todos os itens da compra terão seu estoque revertido.
                        </p>
                    </div>

                    {/* Table */}
                    <div className="w-full border border-gray-200 rounded-lg overflow-hidden">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-gray-50 text-gray-600 font-semibold uppercase">
                                <tr>
                                    <th className="px-3 py-2 text-center w-10">#</th>
                                    <th className="px-3 py-2">Descrição</th>
                                    <th className="px-3 py-2 text-center">Qtd</th>
                                    <th className="px-3 py-2">IMEI1</th>
                                    <th className="px-3 py-2">IMEI2</th>
                                    <th className="px-3 py-2">Serial Number</th>
                                    <th className="px-3 py-2 text-center">Condição</th>
                                    <th className="px-3 py-2 text-center">Saúde (%)</th>
                                    <th className="px-3 py-2 text-center">Garantia</th>
                                    <th className="px-3 py-2 text-center">Local de Estoque</th>
                                    <th className="px-3 py-2 text-right">Preço de Custo</th>
                                    <th className="px-3 py-2 text-center">Markup</th>
                                    <th className="px-3 py-2 text-right">Preço sugerido<br />com Markup</th>
                                    <th className="px-3 py-2 text-right">Preço de Venda</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {products.map((p, index) => {
                                    const suggestedPrice = p.costPrice && p.markup ? p.costPrice * (1 + p.markup / 100) : 0;
                                    return (
                                        <tr key={p.id} className="hover:bg-gray-50">
                                            <td className="px-3 py-2 text-center text-gray-400 italic">{(index + 1).toString().padStart(2, '0')}</td>
                                            <td className="px-3 py-2 font-medium text-gray-800">
                                                {p.brand} {p.model} {p.color} {p.capacity}
                                            </td>
                                            <td className="px-3 py-2 text-center font-bold">{p.stock}</td>
                                            <td className="px-3 py-2 text-gray-600 font-mono bg-gray-50 rounded px-1">{p.imei1 || '-'}</td>
                                            <td className="px-3 py-2 text-gray-600 font-mono bg-gray-50 rounded px-1">{p.imei2 || '-'}</td>
                                            <td className="px-3 py-2 text-gray-600 font-mono bg-gray-50 rounded px-1">{p.serialNumber || '-'}</td>
                                            <td className="px-3 py-2 text-center">
                                                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px]">{p.condition}</span>
                                            </td>
                                            <td className={`px-3 py-2 text-center font-bold ${getBatteryColor(p.batteryHealth)}`}>
                                                {p.batteryHealth ? `${p.batteryHealth}%` : '-'}
                                            </td>
                                            <td className="px-3 py-2 text-center text-gray-600">{p.warranty || '-'}</td>
                                            <td className="px-3 py-2 text-center text-gray-600">{p.storageLocation || '-'}</td>
                                            <td className="px-3 py-2 text-right text-gray-600">{formatCurrency(p.costPrice)}</td>
                                            <td className="px-3 py-2 text-center text-gray-600">{p.markup ? `${p.markup}%` : '-'}</td>
                                            <td className="px-3 py-2 text-right text-gray-600">{formatCurrency(suggestedPrice)}</td>
                                            <td className="px-3 py-2 text-right font-bold text-gray-800">{formatCurrency(p.price)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {products.length === 0 && (
                            <div className="p-8 text-center text-gray-400 italic">Nenhum item encontrado no estoque vinculado a esta compra.</div>
                        )}
                    </div>
                    <div className="w-full text-right mt-2 text-xs text-gray-500">
                        Total de itens: {products.length}
                    </div>

                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 flex justify-center gap-4 bg-gray-50">
                    <button
                        onClick={onClose}
                        className="px-8 py-2 bg-white border border-gray-300 text-gray-700 rounded-md font-semibold hover:bg-gray-50"
                        disabled={isReverting}
                    >
                        Fechar
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isReverting}
                        className="px-8 py-2 bg-red-600 text-white rounded-md font-bold hover:bg-red-700 disabled:opacity-70 flex items-center gap-2"
                    >
                        {isReverting ? <SpinnerIcon className="w-5 h-5" /> : 'SIM, REVERTER'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RevertStockModal;
