import React from 'react';
import { PurchaseOrder, PurchaseItem, Product } from '../../types.ts';
import { XCircleIcon } from './icons.tsx';
import { formatCurrency } from '../services/mockApi.ts';

const formatDateTime = (dateString: string) => new Date(dateString).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

const PendingItemsTable: React.FC<{ items: PurchaseItem[] }> = ({ items }) => (
    <table className="w-full text-sm">
        <thead className="text-left text-muted bg-surface-secondary">
            <tr>
                <th className="px-3 py-2">Produto</th>
                <th className="px-3 py-2 text-center">Qtd</th>
                <th className="px-3 py-2 text-right">Custo Unit.</th>
                <th className="px-3 py-2 text-right">Custo Total</th>
            </tr>
        </thead>
        <tbody>
            {items.map(item => (
                <tr key={item.id} className="border-b border-border">
                    <td className="px-3 py-2 font-medium text-primary">
                        <p>{item.productDetails.brand} {item.productDetails.model} {item.productDetails.color}</p>
                        <div className="text-xs text-muted mt-1">
                            {item.productDetails.condition} / {item.productDetails.warranty}
                        </div>
                        <div className="text-xs text-muted mt-1 flex flex-wrap gap-x-4 gap-y-1">
                            {item.productDetails.imei1 && (
                                <span><span className="font-semibold">IMEI 1:</span> {item.productDetails.imei1}</span>
                            )}
                            {item.productDetails.imei2 && (
                                <span><span className="font-semibold">IMEI 2:</span> {item.productDetails.imei2}</span>
                            )}
                            {item.productDetails.serialNumber && (
                                <span><span className="font-semibold">S/N:</span> {item.productDetails.serialNumber}</span>
                            )}
                            {item.productDetails.batteryHealth !== undefined && item.productDetails.batteryHealth > 0 && (
                                <span><span className="font-semibold">Bateria:</span> {item.productDetails.batteryHealth}%</span>
                            )}
                        </div>
                    </td>
                    <td className="px-3 py-2 text-center">{item.quantity}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(item.finalUnitCost)}</td>
                    <td className="px-3 py-2 text-right font-semibold">{formatCurrency(item.finalUnitCost * item.quantity)}</td>
                </tr>
            ))}
        </tbody>
    </table>
);

const LaunchedProductsTable: React.FC<{ products: Product[] }> = ({ products }) => (
    <>
        <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted bg-surface-secondary uppercase">
                <tr>
                    <th className="px-3 py-2 font-medium">Descrição</th>
                    <th className="px-3 py-2 font-medium text-center">Qtd</th>
                    <th className="px-3 py-2 font-medium text-right">Custo Unit.</th>
                    <th className="px-3 py-2 font-medium text-right">Custo Adic.</th>
                    <th className="px-3 py-2 font-medium text-right">Custo Total Unit.</th>
                    <th className="px-3 py-2 font-medium text-right">Preço Venda</th>
                </tr>
            </thead>
            <tbody>
                {products.map(product => {
                    const finalUnitCost = (product.costPrice || 0) + (product.additionalCostPrice || 0);
                    const variationsText = product.variations?.map(v => `${v.gradeName}: ${v.valueName}`).join(', ');

                    return (
                        <tr key={product.id} className="border-b border-border">
                            <td className="px-3 py-2 font-medium text-primary align-top">
                                <p>{product.brand} {product.model} {product.color}</p>
                                <div className="text-xs text-muted font-normal mt-1 flex flex-wrap gap-x-4 gap-y-1">
                                    {product.imei1 && <span><span className="font-semibold">IMEI 1:</span> {product.imei1}</span>}
                                    {product.imei2 && <span><span className="font-semibold">IMEI 2:</span> {product.imei2}</span>}
                                    {product.serialNumber && <span><span className="font-semibold">S/N:</span> {product.serialNumber}</span>}
                                    {product.batteryHealth > 0 && <span><span className="font-semibold">Bateria:</span> {product.batteryHealth}%</span>}
                                    <span><span className="font-semibold">Local:</span> {product.storageLocation || 'N/A'}</span>
                                    {variationsText && <span><span className="font-semibold">Variações:</span> {variationsText}</span>}
                                    <span><span className="font-semibold">Condição:</span> {product.condition}</span>
                                </div>
                            </td>
                            <td className="px-3 py-2 text-center align-top">1</td>
                            <td className="px-3 py-2 text-right align-top">{formatCurrency(product.costPrice)}</td>
                            <td className="px-3 py-2 text-right align-top">{formatCurrency(product.additionalCostPrice)}</td>
                            <td className="px-3 py-2 text-right font-semibold align-top">{formatCurrency(finalUnitCost)}</td>
                            <td className="px-3 py-2 text-right font-semibold text-primary align-top">{formatCurrency(product.price)}</td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
        <div className="text-right mt-2 text-sm font-semibold pr-3">
            Total de Itens na Compra: {products.length}
        </div>
    </>
);


const PurchaseOrderDetailModal: React.FC<{ purchase: PurchaseOrder; onClose: () => void; associatedProducts?: Product[] }> = ({ purchase, onClose, associatedProducts = [] }) => {
    const supplierId = purchase.supplierId.split('-')[1] || purchase.supplierId;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
            <div className="bg-surface rounded-lg shadow-xl p-6 w-full max-w-6xl mx-4 max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-start mb-4 pb-4 border-b border-border">
                    <div>
                        <h2 className="text-2xl font-bold text-primary">Detalhes da Compra #{purchase.displayId}</h2>
                        <p className="text-muted text-sm">Fornecedor: {purchase.supplierName}</p>
                        <p className="text-muted text-sm mt-1">
                            Lançado por: <span className="font-semibold">{purchase.createdBy === 'Admin User' ? 'Keiler' : purchase.createdBy}</span> em {formatDateTime(purchase.createdAt)}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1 text-muted hover:text-danger"><XCircleIcon className="h-6 w-6" /></button>
                </div>

                <div className="flex-1 overflow-y-auto pr-2">
                    {(purchase.stockStatus === 'Lançado' || purchase.stockStatus === 'Parcialmente Lançado') && associatedProducts.length > 0 ? (
                        <LaunchedProductsTable products={associatedProducts} />
                    ) : (
                        purchase.items.length > 0 ? (
                            <PendingItemsTable items={purchase.items} />
                        ) : (
                            <div className="text-center text-muted py-8">Nenhum item nesta compra.</div>
                        )
                    )}
                </div>

                <div className="mt-4 pt-4 border-t border-border flex justify-end gap-8 text-right">
                    <div>
                        <p className="text-sm text-muted">Subtotal</p>
                        <p className="font-semibold">{formatCurrency(purchase.total - purchase.additionalCost)}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted">Custo Adicional</p>
                        <p className="font-semibold">{formatCurrency(purchase.additionalCost)}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted">Total da Compra</p>
                        <p className="font-bold text-xl text-primary">{formatCurrency(purchase.total)}</p>
                    </div>
                </div>

                <div className="flex justify-end mt-6">
                    <button onClick={onClose} className="px-6 py-2 bg-red-500 text-white rounded-md hover:bg-red-600">
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PurchaseOrderDetailModal;