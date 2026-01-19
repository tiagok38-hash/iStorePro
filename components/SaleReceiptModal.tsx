
import React, { useMemo, useState, useEffect } from 'react';
import { Sale, Product, Customer, User, CompanyInfo, ReceiptTermParameter, WarrantyParameter } from '../../types.ts';
import { formatCurrency, getCompanyInfo, getReceiptTerms, getWarranties } from '../services/mockApi.ts';
import { CloseIcon, PrinterIcon, SpinnerIcon } from './icons.tsx';

const formatDateTime = (dateString: string) => new Date(dateString).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

const getWarrantyExpiration = (saleDate: string, warrantyName: string, warranties: WarrantyParameter[]): string => {
    const date = new Date(saleDate);
    const warranty = warranties.find(w => w.name === warrantyName);

    if (warranty && warranty.days > 0) {
        date.setDate(date.getDate() + warranty.days);
        return date.toLocaleDateString('pt-BR');
    }

    if (!warrantyName) return '';
    // Fallback logic for string-based parsing if no match found in parameters
    const matches = warrantyName.match(/(\d+)\s+(mes|meses|ano|anos)/i);
    if (!matches) return ''; // Only return if we have a valid expiration

    const duration = parseInt(matches[1], 10);
    const unit = matches[2].toLowerCase();

    if (unit.startsWith('mes')) {
        date.setMonth(date.getMonth() + duration);
    } else if (unit.startsWith('ano')) {
        date.setFullYear(date.getFullYear() + duration);
    }

    return date.toLocaleDateString('pt-BR');
};


interface ReceiptLayoutProps {
    sale: Sale;
    productMap: Record<string, Product>;
    customer?: Customer;
    salesperson?: User;
    companyInfo?: CompanyInfo | null;
    activeTerm?: ReceiptTermParameter;
    totalPaid: number;
    totalItems: number;
    totalFees: number;
    warranties: WarrantyParameter[];
}


const A4Layout: React.FC<ReceiptLayoutProps> = ({ sale, productMap, customer, salesperson, companyInfo, activeTerm, totalPaid, totalItems, totalFees, warranties }) => {
    const renderExclusions = (content: string) => {
        if (!content) return null;
        return content.split('\n').map((line, index) => {
            const parts = line.split('.');
            if (parts.length > 1 && !isNaN(parseInt(parts[0], 10))) {
                return <li key={index} className="flex"><span className="w-6 flex-shrink-0">{parts[0]}.</span><span>{parts.slice(1).join('.').trim()}</span></li>;
            }
            return <li key={index}>{line}</li>
        });
    };

    return (
        <div className="p-0 border-none font-sans text-black receipt-body" id="receipt-content">
            <div className="flex justify-between items-center mb-1">
                <span className="text-xs">{formatDateTime(sale.date)}</span>
                <span className="font-semibold text-xs">Recibo #{sale.id} - {companyInfo?.name}</span>
            </div>
            <header className="flex justify-between items-start pb-2 border-b border-black">
                <div className="flex items-center gap-4">
                    {companyInfo?.logoUrl && <img src={companyInfo.logoUrl} alt={companyInfo.name || ''} className="h-16 w-16 object-contain" />}
                    <div>
                        <h1 className="font-bold text-lg leading-tight">{companyInfo?.name}</h1>
                        <div className="text-[10px] leading-tight space-y-0.5">
                            <p>CNPJ: {companyInfo?.cnpj}</p>
                            <p>{companyInfo?.address}</p>
                            <p>{companyInfo?.city} ({companyInfo?.state}) CEP: {companyInfo?.cep}</p>
                        </div>
                    </div>
                </div>
            </header>
            <section className="flex justify-between items-start border-b border-black py-1.5">
                <div className="flex gap-4 text-xs">
                    <div><span className="font-semibold">Data:</span> {new Date(sale.date).toLocaleDateString('pt-BR')}</div>
                    <div><span className="font-semibold">ID:</span> #{sale.id}</div>
                    <div><span className="font-semibold">Caixa:</span> #{sale.posTerminal.replace(/\D/g, '') || 'N/A'}</div>
                </div>
                <div className="text-xs"><span className="font-semibold">Vendedor:</span> {salesperson?.name}</div>
            </section>
            <section className="mt-1 py-1.5 border-b border-black">
                <h3 className="font-bold mb-0.5 text-xs">DADOS DO CLIENTE</h3>
                <div className="flex flex-wrap gap-x-6 gap-y-0.5 text-xs">
                    <p><span className="font-semibold">Nome:</span> {customer?.name}</p>
                    <p><span className="font-semibold">CPF:</span> {customer?.cpf}</p>
                    <p><span className="font-semibold">Tel:</span> {customer?.phone}</p>
                    {customer?.email && <p><span className="font-semibold">Email:</span> {customer?.email}</p>}
                </div>
            </section>
            {sale.observations && (
                <section className="mt-1 py-1.5 border-b border-black">
                    <h3 className="font-bold mb-0.5 text-xs">OBSERVAÇÕES</h3>
                    <p className="text-xs">{sale.observations}</p>
                </section>
            )}
            <h2 className="font-bold text-center text-base my-2">RECIBO DE VENDA</h2>
            <section>
                <table className="w-full text-left border-collapse border border-black mb-2 text-xs">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="px-1 py-0.5 font-semibold border border-black">Descrição</th>
                            <th className="px-1 py-0.5 font-semibold border border-black text-center w-10">Qtd</th>
                            <th className="px-1 py-0.5 font-semibold border border-black text-right w-20">Unit.</th>
                            <th className="px-1 py-0.5 font-semibold border border-black text-right w-20">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sale.items.map(item => {
                            const product = productMap[item.productId];
                            const warrantyExp = getWarrantyExpiration(sale.date, product?.warranty || '', warranties);

                            return (
                                <tr key={item.productId}>
                                    <td className="px-1 py-0.5 align-top border border-black">
                                        <p className="font-semibold leading-tight">{`SKU:${product?.sku || ''} ${product?.model || 'Produto'}`}</p>
                                        <div className="text-[10px] text-gray-600 leading-tight">
                                            {product?.imei1 && <span>IMEI1: {product.imei1} </span>}
                                            {product?.imei2 && <span>IMEI2: {product.imei2} </span>}
                                            {product?.serialNumber && <span>S/N: {product.serialNumber} </span>}
                                            <span>{product?.condition}</span>
                                        </div>
                                        {warrantyExp && (
                                            <p className="text-[10px] text-gray-700 font-medium leading-tight mt-0.5">
                                                Garantia válida até {warrantyExp}
                                                {product?.batteryHealth ? ` • Saúde da Bateria: ${product.batteryHealth}%` : ''}
                                            </p>
                                        )}
                                    </td>
                                    <td className="px-1 py-0.5 text-center align-top border border-black">{item.quantity}</td>
                                    <td className="px-1 py-0.5 text-right align-top border border-black">{formatCurrency(item.unitPrice)}</td>
                                    <td className="px-1 py-0.5 text-right font-semibold align-top border border-black">{formatCurrency(item.unitPrice * item.quantity)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </section>
            <section className="mt-1 flex justify-between items-start gap-4 text-xs">
                <div className="border border-black p-1.5 w-1/2 rounded">
                    <p className="font-bold mb-0.5 text-[11px]">PAGAMENTO</p>
                    <div className="space-y-0.5">
                        {sale.payments.map(p => {
                            let paymentText = p.method;
                            if (p.installments) {
                                paymentText += ` (${p.installments}x ${formatCurrency(p.installmentsValue)})`;
                            }
                            if (p.feePercentage && p.type !== 'Sem Juros') {
                                paymentText += ` +${p.feePercentage.toFixed(2)}%`;
                            }

                            return (
                                <div key={p.id}>
                                    <p className="font-medium leading-none">{paymentText}</p>
                                    {p.tradeInDetails && (
                                        <p className="pl-1 text-gray-600 italic text-[10px] leading-tight">
                                            Troca: {p.tradeInDetails.model}
                                            {p.tradeInDetails.imei1 ? ` IMEI:${p.tradeInDetails.imei1}` : ` SN:${p.tradeInDetails.serialNumber}`}
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div className="w-1/3 space-y-0.5 bg-gray-50 p-1.5 rounded border border-gray-200 text-[11px]">
                    <div className="flex justify-between"><span className="font-semibold">ITENS</span><span>{totalItems}</span></div>
                    <div className="flex justify-between"><span className="font-semibold">SUBTOTAL</span><span>{formatCurrency(sale.subtotal)}</span></div>
                    <div className="flex justify-between"><span className="font-semibold">DESCONTO</span><span>{formatCurrency(sale.discount)}</span></div>
                    <div className="flex justify-between"><span className="font-semibold">TAXAS</span><span>{formatCurrency(totalFees)}</span></div>
                    <div className="flex justify-between border-t border-black pt-0.5 mt-0.5"><span className="font-bold">TOTAL</span><span className="font-bold">{formatCurrency(sale.total)}</span></div>
                    <div className="flex justify-between bg-black text-white px-1 rounded mt-0.5"><span className="font-bold">PAGO</span><span className="font-bold">{formatCurrency(totalPaid)}</span></div>
                </div>
            </section>
            {activeTerm && (
                <section className="mt-2 space-y-1">
                    {activeTerm.warrantyTerm?.showOnReceipt && activeTerm.warrantyTerm.content && (
                        <div>
                            <h3 className="font-bold uppercase border-b border-black mb-0.5 text-[10px]">Garantia</h3>
                            <p className="whitespace-pre-wrap text-justify text-[9px] leading-tight">{activeTerm.warrantyTerm.content}</p>
                        </div>
                    )}
                    {activeTerm.warrantyExclusions?.showOnReceipt && activeTerm.warrantyExclusions.content && (
                        <div>
                            <h3 className="font-bold uppercase border-b border-black mb-0.5 mt-1 text-[10px]">Não Coberto</h3>
                            <ul className="list-none space-y-0 text-[9px] leading-tight">{renderExclusions(activeTerm.warrantyExclusions.content)}</ul>
                        </div>
                    )}
                    {activeTerm.imageRights?.showOnReceipt && activeTerm.imageRights.content && (
                        <div className="mt-1">
                            <h3 className="font-bold uppercase border-b border-black mb-0.5 text-[10px]">Direito de Imagem</h3>
                            <p className="whitespace-pre-wrap text-justify text-[9px] leading-tight">{activeTerm.imageRights.content}</p>
                        </div>
                    )}
                </section>
            )}
        </div>
    );
};

const ThermalLayout: React.FC<ReceiptLayoutProps> = ({ sale, productMap, customer, salesperson, companyInfo, activeTerm, totalPaid, totalItems, totalFees, warranties }) => {
    return (
        <div className="w-[80mm] mx-auto p-2 bg-white text-black font-mono text-xs receipt-body" id="receipt-content">
            <div className="text-center space-y-1">
                {companyInfo?.logoUrl && <img src={companyInfo.logoUrl} alt="Logo" className="h-24 mx-auto object-contain max-w-full" />}
                <p className="font-bold">{companyInfo?.name}</p>
                <p>{companyInfo?.address}</p>
                <p>{companyInfo?.city} - {companyInfo?.state}</p>
                <p>CNPJ: {companyInfo?.cnpj}</p>
            </div>
            <div className="border-t-2 border-dashed border-black my-2"></div>
            <div className="space-y-0.5">
                <p>DATA: {formatDateTime(sale.date)}</p>
                <p>RECIBO: #{sale.id}</p>
                <p>VENDEDOR: {salesperson?.name || 'N/A'}</p>
                <p>CLIENTE: {customer?.name || 'N/A'}</p>
                {customer?.cpf && <p>CPF: {customer.cpf}</p>}
            </div>
            <div className="border-t-2 border-dashed border-black my-2"></div>
            <p className="text-center font-bold">RECIBO DE VENDA</p>
            <div className="border-t-2 border-dashed border-black my-2"></div>
            <div className="space-y-1">
                {sale.items.map(item => {
                    const product = productMap[item.productId];
                    const warrantyExp = getWarrantyExpiration(sale.date, product?.warranty || '', warranties);

                    return (
                        <div key={item.productId} className="mb-1">
                            <p className="font-bold">{product?.model || 'Produto desconhecido'}</p>
                            <div className="flex justify-between text-[10px]">
                                <span>{item.quantity} x {formatCurrency(item.unitPrice)}</span>
                                <span>{formatCurrency(item.unitPrice * item.quantity)}</span>
                            </div>
                            <div className="text-[9px] text-gray-700">
                                {(product?.serialNumber || product?.imei1) && (
                                    <p>
                                        {product.serialNumber && `S/N: ${product.serialNumber} `}
                                        {product.imei1 && `IMEI: ${product.imei1}`}
                                    </p>
                                )}
                                {warrantyExp && (
                                    <p className="font-semibold italic">Garantia válida até {warrantyExp}</p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="border-t border-dashed border-black my-2"></div>
            <div className="space-y-0.5 text-right">
                <div className="flex justify-between"><span className="text-left">Subtotal:</span><span>{formatCurrency(sale.subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-left">Desconto:</span><span>{formatCurrency(sale.discount)}</span></div>
                {totalFees > 0 && <div className="flex justify-between"><span className="text-left">Acréscimos:</span><span>{formatCurrency(totalFees)}</span></div>}
                <div className="flex justify-between font-bold text-sm"><span className="text-left">TOTAL:</span><span>{formatCurrency(sale.total)}</span></div>
            </div>
            <div className="border-t border-dashed border-black my-2"></div>
            <div>
                <p className="font-bold">PAGAMENTO:</p>
                {sale.payments.map(p => (
                    <div key={p.id}>
                        <div className="flex justify-between">
                            <span>{p.method}{p.installments ? ` ${p.installments}x` : ''}</span>
                            <span>{formatCurrency(p.value)}</span>
                        </div>
                        {p.tradeInDetails && (
                            <p className="text-[10px] pl-2">
                                * {p.tradeInDetails.model} <br />
                                {p.tradeInDetails.imei1 ? `IMEI: ${p.tradeInDetails.imei1}` : `S/N: ${p.tradeInDetails.serialNumber}`}
                            </p>
                        )}
                    </div>
                ))}
                <div className="flex justify-between font-bold mt-1"><span className="text-left">TOTAL PAGO:</span><span>{formatCurrency(totalPaid)}</span></div>
                <div className="flex justify-between"><span className="text-left">TROCO:</span><span>{formatCurrency(totalPaid - sale.total > 0 ? totalPaid - sale.total : 0)}</span></div>
            </div>

            {sale.observations && (
                <>
                    <div className="border-t border-dashed border-black my-2"></div>
                    <div>
                        <p className="font-bold">OBSERVAÇÕES:</p>
                        <p>{sale.observations}</p>
                    </div>
                </>
            )}

            {activeTerm && (
                <div className="mt-2 pt-2 border-t-2 border-dashed border-black text-[8pt] space-y-2">
                    {activeTerm.warrantyTerm?.showOnReceipt && activeTerm.warrantyTerm.content && (
                        <div>
                            <h3 className="font-bold text-center text-xs uppercase">Termos de Garantia</h3>
                            <p className="whitespace-pre-wrap">{activeTerm.warrantyTerm.content}</p>
                        </div>
                    )}
                    {activeTerm.warrantyExclusions?.showOnReceipt && activeTerm.warrantyExclusions.content && (
                        <div className="mt-2">
                            <h3 className="font-bold text-center text-xs uppercase">A Garantia não Cobre</h3>
                            <p className="whitespace-pre-wrap">{activeTerm.warrantyExclusions.content}</p>
                        </div>
                    )}
                    {activeTerm.imageRights?.showOnReceipt && activeTerm.imageRights.content && (
                        <div className="mt-2">
                            <h3 className="font-bold text-center text-xs uppercase">Direito de Imagem</h3>
                            <p className="whitespace-pre-wrap">{activeTerm.imageRights.content}</p>
                        </div>
                    )}
                </div>
            )}

            <div className="mt-8 text-center">
                <p>___________________________________</p>
                <p>{customer?.name || 'Assinatura do Cliente'}</p>
            </div>
        </div>
    );
};

const SaleReceiptModal: React.FC<{ sale: Sale; productMap: Record<string, Product>; customers: Customer[]; users: User[]; onClose: () => void; format: 'A4' | 'thermal'; }> = ({ sale, productMap, customers, users, onClose, format }) => {
    const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
    const [receiptTerms, setReceiptTerms] = useState<ReceiptTermParameter[]>([]);
    const [warranties, setWarranties] = useState<WarrantyParameter[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const [info, terms, warrantyList] = await Promise.all([
                    getCompanyInfo(),
                    getReceiptTerms(),
                    getWarranties()
                ]);
                setCompanyInfo(info);
                setReceiptTerms(terms);
                setWarranties(warrantyList);
            } catch (error) {
                console.error("Failed to load receipt data", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const customer = useMemo(() => customers.find(c => c.id === sale.customerId), [customers, sale.customerId]);
    const salesperson = useMemo(() => users.find(u => u.id === sale.salespersonId), [users, sale.salespersonId]);
    const totalPaid = useMemo(() => sale.payments.reduce((sum, p) => sum + p.value, 0), [sale.payments]);
    const totalFees = useMemo(() => sale.payments.reduce((sum, p) => sum + (p.fees || 0), 0), [sale.payments]);
    const totalItems = useMemo(() => sale.items.reduce((sum, i) => sum + i.quantity, 0), [sale.items]);

    const activeTerm = useMemo(() => {
        const defaultTerm = receiptTerms.find(t => t.name === 'IPHONE SEMINOVO');
        return receiptTerms.find(t => t.name === sale.warrantyTerm) || defaultTerm;
    }, [receiptTerms, sale.warrantyTerm]);

    const handlePrint = () => {
        window.print();
    };

    const layoutProps = { sale, productMap, customer, salesperson, companyInfo, activeTerm, totalPaid, totalItems, totalFees, warranties };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-start z-[60] py-8 px-4 print:p-0 print:bg-white overflow-y-auto">
            <style>
                {`
                    @media print {
                        body > * { visibility: hidden; }
                        #print-container, #print-container * { visibility: visible; }
                        #print-container {
                            position: absolute; left: 0; top: 0; width: 100%; height: auto;
                            padding: 0; margin: 0; border: none; box-shadow: none;
                        }
                        .no-print { display: none !important; }

                        ${format === 'thermal' ? `
                            @page { size: 80mm auto; margin: 2mm; }
                            .receipt-body { font-size: 9pt !important; color: black !important; width: 100%; }
                        ` : `
                            @page { size: A4; margin: 10mm; }
                            .receipt-body { font-size: 10pt !important; color: black !important; }
                        `}

                        .whitespace-pre-wrap { white-space: pre-wrap; }
                    }
                `}
            </style>
            <div className={`bg-surface rounded-lg shadow-xl w-full ${format === 'A4' ? 'max-w-3xl' : 'max-w-sm'} flex flex-col`} id="print-container">
                <div className="flex justify-between items-center p-4 border-b border-border no-print">
                    <h2 className="text-2xl font-bold text-primary">Recibo da Venda #{sale.id}</h2>
                    <div className="flex items-center gap-4">
                        <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md text-sm hover:bg-opacity-90">
                            <PrinterIcon className="h-5 w-5" /> Imprimir
                        </button>
                        <button onClick={onClose} className="p-1 text-muted hover:text-danger"><CloseIcon className="h-6 w-6" /></button>
                    </div>
                </div>
                <div className="p-2 sm:p-6">
                    {loading ? <div className="flex justify-center items-center h-64"><SpinnerIcon /></div> : (
                        format === 'A4' ? <A4Layout {...layoutProps} /> : <ThermalLayout {...layoutProps} />
                    )}
                </div>
            </div>
        </div>
    );
};

export default SaleReceiptModal;
