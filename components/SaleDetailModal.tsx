
import React, { useMemo, useState } from 'react';
import { Sale, Product, Customer, User, CompanyInfo, ReceiptTermParameter } from '../../types.ts';
import { formatCurrency } from '../services/mockApi.ts';
import { CloseIcon, PrinterIcon, DocumentTextIcon, TicketIcon } from './icons.tsx';
import SaleReceiptModal from './SaleReceiptModal.tsx';

const formatDateTime = (dateString: string) => new Date(dateString).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

const SaleDetailModal: React.FC<{ sale: Sale; productMap: Record<string, Product>; customers: Customer[]; users: User[]; onClose: () => void; }> = ({ sale, productMap, customers, users, onClose }) => {
    const [isPrintChoiceOpen, setIsPrintChoiceOpen] = useState(false);
    const [receiptModalFormat, setReceiptModalFormat] = useState<'A4' | 'thermal' | null>(null);

    const customer = useMemo(() => customers.find(c => c.id === sale.customerId), [customers, sale.customerId]);
    const salesperson = useMemo(() => users.find(u => u.id === sale.salespersonId), [users, sale.salespersonId]);
    const totalPaid = useMemo(() => sale.payments.reduce((sum, p) => sum + p.value, 0), [sale.payments]);

    const tradeInPayment = useMemo(() => sale.payments.find(p => p.method === 'Aparelho na Troca'), [sale.payments]);

    // Fallback logic for legacy data where trade-in details weren't stored on the payment object
    const legacyTradedInProduct = useMemo(() => {
        if (tradeInPayment?.tradeInDetails) return null; // If we have details on payment, we don't need legacy logic
        if (!tradeInPayment || !customer?.tradeInHistory || customer.tradeInHistory.length === 0) {
            return null;
        }

        const saleTime = new Date(sale.date).getTime();

        // Assumes the trade-in is registered close to the sale time.
        let closestEntry = null;
        let smallestDiff = Infinity;

        for (const entry of customer.tradeInHistory) {
            const entryTime = new Date(entry.date).getTime();
            const diff = Math.abs(saleTime - entryTime);

            if (diff < smallestDiff) {
                smallestDiff = diff;
                closestEntry = entry;
            }
        }

        // Only consider if the trade-in was within a 5-minute window of the sale.
        if (closestEntry && smallestDiff < 5 * 60 * 1000) {
            return productMap[closestEntry.productId] || null;
        }

        return null;
    }, [tradeInPayment, customer, sale.date, productMap]);


    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-[60] p-4">
                <div className="bg-surface rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                    <div className="flex justify-between items-center p-4 border-b border-border">
                        <h2 className="text-2xl font-bold text-primary">Detalhes da Venda #{sale.id}</h2>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setIsPrintChoiceOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md text-sm hover:bg-opacity-90">
                                <PrinterIcon className="h-5 w-5" /> Imprimir
                            </button>
                            <button onClick={onClose} className="p-1 text-muted hover:text-danger"><CloseIcon className="h-6 w-6" /></button>
                        </div>
                    </div>
                    <div className="p-6 space-y-6 overflow-y-auto">
                        {/* Top Info */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm p-5 bg-surface-secondary rounded-xl border border-gray-100">
                            <div><p className="font-bold text-gray-500 mb-1 uppercase text-xs tracking-wider">Data</p><p className="text-base font-bold text-gray-900">{formatDateTime(sale.date)}</p></div>
                            <div><p className="font-bold text-gray-500 mb-1 uppercase text-xs tracking-wider">Vendedor</p><p className="text-base font-bold text-gray-900">{salesperson?.name || 'N/A'}</p></div>
                            {(sale.origin === 'PDV' && sale.cashSessionDisplayId) ? (
                                <>
                                    <div><p className="font-bold text-gray-500 mb-1 uppercase text-xs tracking-wider">Cliente</p><p className="text-base font-bold text-gray-900">{customer?.name || 'N/A'}</p></div>
                                    <div><p className="font-bold text-gray-500 mb-1 uppercase text-xs tracking-wider">Caixa</p><p className="text-base font-bold text-gray-900">#{sale.cashSessionDisplayId}</p></div>
                                </>
                            ) : (
                                <div className="col-span-full"><p className="font-bold text-gray-500 mb-1 uppercase text-xs tracking-wider">Cliente</p><p className="text-base font-bold text-gray-900">{customer?.name || 'N/A'}</p></div>
                            )}
                        </div>

                        {/* Items Sold */}
                        <div>
                            <h3 className="font-semibold text-lg text-primary mb-2">Itens Vendidos</h3>
                            <div className="border border-border rounded-lg overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-secondary uppercase bg-surface-secondary">
                                        <tr>
                                            <th className="px-4 py-2">Produto</th>
                                            <th className="px-4 py-2 text-center">Qtd.</th>
                                            <th className="px-4 py-2 text-right">Preço Unit.</th>
                                            <th className="px-4 py-2 text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-muted">
                                        {sale.items.map(item => {
                                            const product = productMap[item.productId];
                                            return (
                                                <tr key={item.productId} className="border-t border-border">
                                                    <td className="px-4 py-2 text-primary align-top">
                                                        <div className="font-bold text-base">{product?.model || 'Produto desconhecido'}</div>
                                                        {product && (
                                                            <>
                                                                <div className="text-xs text-muted font-normal mt-1 flex flex-wrap items-center gap-x-2">
                                                                    {product.serialNumber && <span>S/N: {product.serialNumber}</span>}
                                                                    {product.imei1 && (
                                                                        <>
                                                                            {product.serialNumber && <span className="text-gray-300">|</span>}
                                                                            <span>IMEI: {product.imei1}</span>
                                                                        </>
                                                                    )}
                                                                    {product.condition && (
                                                                        <>
                                                                            {(product.serialNumber || product.imei1) && <span className="text-gray-300">|</span>}
                                                                            <span>
                                                                                Condição: <span className="font-semibold">{product.condition}</span>
                                                                            </span>
                                                                        </>
                                                                    )}
                                                                    {product.condition === 'Seminovo' && typeof product.batteryHealth === 'number' && (
                                                                        <>
                                                                            <span className="text-gray-300">|</span>
                                                                            <span>
                                                                                Bateria: <span className="font-semibold">{product.batteryHealth}%</span>
                                                                            </span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                                {product.variations && product.variations.length > 0 && (
                                                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                                                        {product.variations.map((variation, index) => (
                                                                            <span key={variation.gradeId || index} className="px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                                                                                {variation.valueName ? `${variation.gradeName}: ${variation.valueName}` : variation.gradeName}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-2 text-center align-top">{item.quantity}</td>
                                                    <td className="px-4 py-2 text-right align-top">{formatCurrency(item.unitPrice)}</td>
                                                    <td className="px-4 py-2 text-right font-semibold text-primary align-top">{formatCurrency(item.unitPrice * item.quantity)}</td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Payments and Summary */}
                        <div className="pt-4 border-t border-border grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Left side: Payments & Trade-in */}
                            <div className="space-y-4">
                                <div>
                                    <h3 className="font-semibold text-primary mb-2">Detalhes do Pagamento</h3>
                                    <div className="space-y-2 text-sm">
                                        {sale.payments.map(payment => {
                                            if (payment.method === 'Crédito' && payment.installments) {
                                                const totalCharged = payment.value || 0;
                                                const isWithInterest = payment.type === 'Com Juros';

                                                return (
                                                    <div key={payment.id} className="p-3 bg-surface-secondary rounded-md text-sm">
                                                        <div className="flex justify-between items-center mb-2">
                                                            <p className="font-medium text-primary">{payment.method}</p>
                                                            <span className="font-semibold">{formatCurrency(totalCharged)}</span>
                                                        </div>
                                                        <div className="pl-4 border-l-2 border-gray-200 ml-1 space-y-1 text-xs text-muted">
                                                            <div className="flex justify-between">
                                                                <span>Parcelas:</span>
                                                                <span className="font-medium">{payment.installments}x de {formatCurrency(payment.installmentsValue)}</span>
                                                            </div>
                                                            {payment.type !== 'Sem Juros' && (
                                                                <div className="flex justify-between">
                                                                    <span>{isWithInterest ? 'Juros' : 'Taxa do Vendedor'} ({payment.feePercentage?.toFixed(2)}%):</span>
                                                                    <span className="font-medium">{formatCurrency(payment.fees)}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return (
                                                <div key={payment.id} className="p-3 bg-surface-secondary rounded-md">
                                                    <div className="flex justify-between items-center">
                                                        <p className="font-medium text-primary">{payment.method}</p>
                                                        <span className="font-semibold">{formatCurrency(payment.value)}</span>
                                                    </div>
                                                    {payment.tradeInDetails && (
                                                        <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-muted space-y-0.5">
                                                            <p className="font-semibold text-primary">{payment.tradeInDetails.model}</p>
                                                            <p>
                                                                {payment.tradeInDetails.imei1 ? `IMEI: ${payment.tradeInDetails.imei1}` : `S/N: ${payment.tradeInDetails.serialNumber}`}
                                                                {payment.tradeInDetails.batteryHealth ? ` | Bateria: ${payment.tradeInDetails.batteryHealth}%` : ''}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {legacyTradedInProduct && (
                                    <div>
                                        <h3 className="font-semibold text-primary mb-2">Aparelho Recebido na Troca (Histórico)</h3>
                                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm space-y-1 text-primary">
                                            <p><strong>Modelo:</strong> {legacyTradedInProduct.model}</p>
                                            <div className="text-xs text-blue-800/80 font-normal mt-1 flex flex-wrap items-center gap-x-2">
                                                {legacyTradedInProduct.serialNumber && <span>S/N: {legacyTradedInProduct.serialNumber}</span>}
                                                {legacyTradedInProduct.imei1 && (
                                                    <>
                                                        {legacyTradedInProduct.serialNumber && <span className="text-blue-300">|</span>}
                                                        <span>IMEI: {legacyTradedInProduct.imei1}</span>
                                                    </>
                                                )}
                                                {legacyTradedInProduct.condition && (
                                                    <>
                                                        {(legacyTradedInProduct.serialNumber || legacyTradedInProduct.imei1) && <span className="text-blue-300">|</span>}
                                                        <span>Condição: <span className="font-semibold">{legacyTradedInProduct.condition}</span></span>
                                                    </>
                                                )}
                                                {legacyTradedInProduct.condition === 'Seminovo' && typeof legacyTradedInProduct.batteryHealth === 'number' && (
                                                    <>
                                                        <span className="text-blue-300">|</span>
                                                        <span>Bateria: <span className="font-semibold">{legacyTradedInProduct.batteryHealth}%</span></span>
                                                    </>
                                                )}
                                            </div>
                                            {legacyTradedInProduct.variations && legacyTradedInProduct.variations.length > 0 && (
                                                <div className="mt-2 flex flex-wrap gap-1.5">
                                                    {legacyTradedInProduct.variations.map((variation, index) => (
                                                        <span key={variation.gradeId || index} className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                                                            {variation.valueName ? `${variation.gradeName}: ${variation.valueName}` : variation.gradeName}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                            <p className="font-semibold mt-2">Valor Creditado: {formatCurrency(tradeInPayment?.value)}</p>
                                        </div>
                                    </div>
                                )}

                            </div>

                            {/* Right side: Financial Summary */}
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between p-2 bg-surface-secondary rounded-md">
                                    <span className="text-muted">Subtotal:</span>
                                    <span className="font-medium">{formatCurrency(sale.subtotal)}</span>
                                </div>
                                <div className="flex justify-between p-2 bg-surface-secondary rounded-md">
                                    <span className="text-muted">Desconto:</span>
                                    <span className="font-medium text-danger">-{formatCurrency(sale.discount)}</span>
                                </div>
                                <div className="flex justify-between mt-2 pt-2 border-t border-border p-2">
                                    <span className="font-semibold text-base text-primary">Total da Venda:</span>
                                    <span className="font-bold text-xl text-primary">{formatCurrency(sale.total)}</span>
                                </div>
                                <div className="flex justify-between p-2 bg-green-50 rounded-md">
                                    <span className="text-muted">Total Pago:</span>
                                    <span className="font-medium text-success">{formatCurrency(totalPaid)}</span>
                                </div>
                            </div>
                        </div>
                        {sale.observations && (
                            <div className="pt-4 border-t border-border">
                                <h3 className="font-semibold text-primary mb-2">Observações (Comprovante)</h3>
                                <p className="text-sm p-3 bg-yellow-50 border border-yellow-200 rounded-lg whitespace-pre-wrap">{sale.observations}</p>
                            </div>
                        )}
                        {sale.internalObservations && (
                            <div className="pt-4 border-t border-border">
                                <h3 className="font-semibold text-primary mb-2">Observações Internas</h3>
                                <p className="text-sm p-3 bg-gray-50 border border-gray-200 rounded-lg italic text-gray-600 whitespace-pre-wrap">{sale.internalObservations}</p>
                            </div>
                        )}
                    </div>
                    <div className="flex justify-end items-center p-4 border-t border-border mt-auto">
                        <button onClick={onClose} className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700">Fechar</button>
                    </div>
                </div>
            </div>

            {isPrintChoiceOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[70]">
                    <div className="bg-surface p-6 rounded-lg shadow-xl w-full max-w-sm">
                        <h3 className="text-lg font-bold mb-4 text-primary">Escolha o Formato de Impressão</h3>
                        <p className="text-sm text-muted mb-6">Selecione o layout para o recibo da venda #{sale.id}.</p>
                        <div className="flex flex-col gap-4">
                            <button onClick={() => { setReceiptModalFormat('A4'); setIsPrintChoiceOpen(false); }} className="w-full text-left flex items-center gap-4 p-4 border rounded-lg hover:bg-surface-secondary hover:border-accent">
                                <DocumentTextIcon className="h-8 w-8 text-accent" />
                                <div>
                                    <p className="font-semibold">Formato A4</p>
                                    <p className="text-xs text-muted">Layout padrão para impressoras comuns.</p>
                                </div>
                            </button>
                            <button onClick={() => { setReceiptModalFormat('thermal'); setIsPrintChoiceOpen(false); }} className="w-full text-left flex items-center gap-4 p-4 border rounded-lg hover:bg-surface-secondary hover:border-accent">
                                <TicketIcon className="h-8 w-8 text-accent" />
                                <div>
                                    <p className="font-semibold">Cupom 80mm</p>
                                    <p className="text-xs text-muted">Layout para impressoras térmicas.</p>
                                </div>
                            </button>
                        </div>
                        <button onClick={() => { setIsPrintChoiceOpen(false); }} className="mt-6 w-full px-4 py-2 bg-gray-200 text-secondary rounded-md hover:bg-gray-300">Cancelar</button>
                    </div>
                </div>
            )}

            {receiptModalFormat && (
                <SaleReceiptModal
                    sale={sale}
                    format={receiptModalFormat}
                    productMap={productMap}
                    customers={customers}
                    users={users}
                    onClose={() => setReceiptModalFormat(null)}
                />
            )}
        </>
    );
};

export default SaleDetailModal;
