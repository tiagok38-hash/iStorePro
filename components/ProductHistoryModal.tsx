
import React, { useState, useEffect } from 'react';
import { Product, Sale, Customer, User, AuditLog, AuditActionType } from '../../types.ts';
import { formatCurrency, getAuditLogs } from '../services/mockApi.ts';
import { SpinnerIcon } from './icons.tsx';
import SaleDetailModal from './SaleDetailModal.tsx';


const formatDateTime = (dateString: string) => new Date(dateString).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

// --- Child Components for Tabs ---

const SalesHistoryTab: React.FC<{ product: Product, sales: Sale[], customers: Customer[], users: User[], onRowClick: (sale: Sale) => void }> = ({ product, sales, customers, users, onRowClick }) => {
    const findCustomerName = (id: string) => customers.find(c => c.id === id)?.name || 'N/A';
    const findSalespersonName = (id?: string) => users.find(u => u.id === id)?.name || 'N/A';

    return (
        <div className="overflow-x-auto">
            {sales.length === 0 ? (
                <div className="text-center text-muted py-8">Nenhuma venda registrada para este produto.</div>
            ) : (
                <table className="w-full text-sm text-left text-muted">
                    <thead className="text-xs text-secondary uppercase bg-surface-secondary">
                        <tr>
                            <th scope="col" className="px-4 py-3">ID Venda</th>
                            <th scope="col" className="px-4 py-3">Data</th>
                            <th scope="col" className="px-4 py-3">Cliente</th>
                            <th scope="col" className="px-4 py-3">Vendedor</th>
                            <th scope="col" className="px-4 py-3 text-center">Qtd.</th>
                            <th scope="col" className="px-4 py-3 text-right">Preço Unit.</th>
                            <th scope="col" className="px-4 py-3 text-right">Total Item</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sales.map(sale => {
                            const saleItem = sale.items.find(item => item.productId === product.id);
                            if (!saleItem) return null;

                            return (
                                <tr key={sale.id} className="bg-surface border-b border-border hover:bg-surface-secondary cursor-pointer" onClick={() => onRowClick(sale)}>
                                    <td className="px-4 py-3 font-medium text-primary">{sale.id}</td>
                                    <td className="px-4 py-3">{formatDateTime(sale.date)}</td>
                                    <td className="px-4 py-3">{findCustomerName(sale.customerId)}</td>
                                    <td className="px-4 py-3">{findSalespersonName(sale.salespersonId)}</td>
                                    <td className="px-4 py-3 font-semibold text-primary text-center">{saleItem.quantity}</td>
                                    <td className="px-4 py-3 text-right">{formatCurrency(saleItem.unitPrice)}</td>
                                    <td className="px-4 py-3 font-semibold text-primary text-right">{formatCurrency(saleItem.unitPrice * saleItem.quantity)}</td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            )}
        </div>
    );
};

// Component for Price History using product.priceHistory
const PriceHistoryTab: React.FC<{ product: Product }> = ({ product }) => {
    const priceHistory = product.priceHistory || [];

    if (priceHistory.length === 0) {
        return <div className="text-center text-muted py-8">Nenhum registro encontrado.</div>;
    }

    // Sort by timestamp descending (most recent first)
    const sortedHistory = [...priceHistory].sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Map priceType to display text and colors
    const priceTypeConfig: Record<string, { label: string; color: string }> = {
        'sale': { label: 'Preço de Venda', color: 'bg-blue-100 text-blue-700' },
        'wholesale': { label: 'Preço de Atacado', color: 'bg-purple-100 text-purple-700' },
        'cost': { label: 'Preço de Custo', color: 'bg-orange-100 text-orange-700' },
    };

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-muted">
                <thead className="text-xs text-secondary uppercase bg-surface-secondary">
                    <tr>
                        <th scope="col" className="px-4 py-3">Data/Hora</th>
                        <th scope="col" className="px-4 py-3">Tipo</th>
                        <th scope="col" className="px-4 py-3 text-right">Preço Anterior</th>
                        <th scope="col" className="px-4 py-3 text-right">Novo Preço</th>
                        <th scope="col" className="px-4 py-3 text-right">Variação</th>
                        <th scope="col" className="px-4 py-3">Alterado Por</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedHistory.map((entry: any) => {
                        const variation = entry.newPrice - entry.oldPrice;
                        const variationPercent = entry.oldPrice > 0
                            ? ((variation / entry.oldPrice) * 100).toFixed(1)
                            : '100';
                        const typeConfig = priceTypeConfig[entry.priceType] || { label: 'Preço', color: 'bg-gray-100 text-gray-700' };

                        return (
                            <tr key={entry.id} className="bg-surface border-b border-border">
                                <td className="px-4 py-4 whitespace-nowrap">{formatDateTime(entry.timestamp)}</td>
                                <td className="px-4 py-4">
                                    <span className={`px-2 py-1 rounded-md text-xs font-semibold whitespace-nowrap ${typeConfig.color}`}>
                                        {typeConfig.label}
                                    </span>
                                </td>
                                <td className="px-4 py-4 text-right">{formatCurrency(entry.oldPrice)}</td>
                                <td className="px-4 py-4 text-right font-semibold text-primary">{formatCurrency(entry.newPrice)}</td>
                                <td className={`px-4 py-4 text-right font-medium ${variation >= 0 ? 'text-success' : 'text-danger'}`}>
                                    {variation >= 0 ? '+' : ''}{formatCurrency(variation)} ({variationPercent}%)
                                </td>
                                <td className="px-4 py-4">{entry.changedBy}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

// Component for Stock History using product.stockHistory or AuditLogs fallback
const StockHistoryTab: React.FC<{ product: Product, auditLogs?: AuditLog[] }> = ({ product, auditLogs = [] }) => {
    let stockHistory = product.stockHistory || [];

    // Fallback to Audit Logs if structured history is empty
    if (stockHistory.length === 0 && auditLogs.length > 0) {
        const relevantTypes = [
            AuditActionType.STOCK_ADJUST,
            AuditActionType.STOCK_LAUNCH,
            AuditActionType.STOCK_REVERT,
            AuditActionType.SALE_CREATE,
            AuditActionType.SALE_CANCEL,
            AuditActionType.PURCHASE_LAUNCH
        ];

        const relevantLogs = auditLogs.filter(log => relevantTypes.includes(log.action));

        if (relevantLogs.length > 0) {
            const actionToReason: Record<string, string> = {
                [AuditActionType.STOCK_LAUNCH]: 'Lançamento de Estoque',
                [AuditActionType.STOCK_ADJUST]: 'Ajuste Manual',
                [AuditActionType.SALE_CREATE]: 'Venda',
                [AuditActionType.SALE_CANCEL]: 'Cancelamento de Venda',
                [AuditActionType.PURCHASE_LAUNCH]: 'Entrada por Compra',
            };

            stockHistory = relevantLogs.map(log => ({
                id: log.id,
                timestamp: log.timestamp,
                reason: actionToReason[log.action] || 'Movimentação',
                oldStock: '-',
                adjustment: 0,
                newStock: '-',
                details: log.details,
                changedBy: log.userName
            }));
        }
    }

    if (stockHistory.length === 0) {
        return <div className="text-center text-muted py-8">Nenhum registro encontrado.</div>;
    }

    // Sort by timestamp descending (most recent first)
    const sortedHistory = [...stockHistory].sort((a: any, b: any) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    const reasonColors: Record<string, string> = {
        'Venda': 'bg-blue-100 text-blue-700',
        'Cancelamento de Venda': 'bg-orange-100 text-orange-700',
        'Ajuste Manual': 'bg-yellow-100 text-yellow-700',
        'Lançamento de Estoque': 'bg-green-100 text-green-700',
        'Entrada por Compra': 'bg-purple-100 text-purple-700',
        'Entrada via Troca': 'bg-teal-100 text-teal-700',
        'Cadastro Inicial': 'bg-gray-100 text-gray-600',
    };

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-muted">
                <thead className="text-xs text-secondary uppercase bg-surface-secondary">
                    <tr>
                        <th scope="col" className="px-4 py-3">Data/Hora</th>
                        <th scope="col" className="px-4 py-3">Motivo</th>
                        <th scope="col" className="px-4 py-3 text-center">Anterior</th>
                        <th scope="col" className="px-4 py-3 text-center">Ajuste</th>
                        <th scope="col" className="px-4 py-3 text-center">Novo</th>
                        <th scope="col" className="px-4 py-3">Detalhes</th>
                        <th scope="col" className="px-4 py-3">Por</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedHistory.map((entry: any) => (
                        <tr key={entry.id} className="bg-surface border-b border-border">
                            <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(entry.timestamp)}</td>
                            <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded-md text-xs font-semibold whitespace-nowrap ${reasonColors[entry.reason] || 'bg-gray-100 text-gray-700'}`}>
                                    {entry.reason}
                                </span>
                            </td>
                            <td className="px-4 py-3 text-center">{entry.oldStock}</td>
                            <td className={`px-4 py-3 text-center font-bold ${(entry.adjustment > 0) ? 'text-success' : (entry.adjustment < 0 ? 'text-danger' : 'text-muted')}`}>
                                {entry.adjustment !== 0 ? (entry.adjustment > 0 ? `+${entry.adjustment}` : entry.adjustment) : '-'}
                            </td>
                            <td className="px-4 py-3 text-center font-semibold text-primary">{entry.newStock}</td>
                            <td className="px-4 py-3 text-xs text-muted" title={entry.details}>
                                {entry.details}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">{entry.changedBy}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const AuditHistoryTab: React.FC<{ logs: AuditLog[]; typeFilter?: AuditActionType[] }> = ({ logs, typeFilter }) => {
    const filteredLogs = typeFilter
        ? logs.filter(log => typeFilter.includes(log.action))
        : logs;

    const actionTranslations: Record<string, string> = {
        [AuditActionType.CREATE]: 'Criação',
        [AuditActionType.UPDATE]: 'Edição',
        [AuditActionType.DELETE]: 'Exclusão',
        [AuditActionType.SALE_CREATE]: 'Venda Realizada',
        [AuditActionType.SALE_CANCEL]: 'Venda Cancelada',
        [AuditActionType.STOCK_ADJUST]: 'Ajuste de Estoque',
        [AuditActionType.STOCK_LAUNCH]: 'Lançamento em Estoque',
        [AuditActionType.STOCK_REVERT]: 'Reversão de Estoque',
    };

    if (filteredLogs.length === 0) {
        return <div className="text-center text-muted py-8">Nenhum registro encontrado.</div>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-muted">
                <thead className="text-xs text-secondary uppercase bg-surface-secondary">
                    <tr>
                        <th scope="col" className="px-6 py-3">Data/Hora</th>
                        <th scope="col" className="px-6 py-3">Ação</th>
                        <th scope="col" className="px-6 py-3">Detalhes</th>
                        <th scope="col" className="px-6 py-3">Usuário</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredLogs.map(log => (
                        <tr key={log.id} className="bg-surface border-b border-border">
                            <td className="px-6 py-4">{formatDateTime(log.timestamp)}</td>
                            <td className="px-6 py-4">
                                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-semibold whitespace-nowrap">
                                    {actionTranslations[log.action] || log.action}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-primary font-medium">{log.details}</td>
                            <td className="px-6 py-4">{log.userName}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};


// --- Main Modal Component ---

interface ProductHistoryModalProps {
    product: Product;
    salesHistory: Sale[];
    customers: Customer[];
    users: User[];
    productMap: Record<string, Product>;
    onClose: () => void;
}

type ActiveTab = 'sales' | 'prices' | 'stock';

const ProductHistoryModal: React.FC<ProductHistoryModalProps> = ({ product, salesHistory, customers, users, productMap, onClose }) => {
    const [activeTab, setActiveTab] = useState<ActiveTab>('sales');
    const [saleToView, setSaleToView] = useState<Sale | null>(null);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [freshProduct, setFreshProduct] = useState<Product>(product);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch fresh product data directly from database (bypass cache)
                const { supabase } = await import('../../supabaseClient.ts');
                const { data: dbProduct } = await supabase
                    .from('products')
                    .select('*')
                    .eq('id', product.id)
                    .maybeSingle();

                if (dbProduct) {
                    setFreshProduct(dbProduct as Product);
                }

                const allLogs = await getAuditLogs();
                // Filter logs relevant to this product
                const productLogs = allLogs.filter(log => log.entityId === product.id);
                setAuditLogs(productLogs);
            } catch (error) {
                console.error("Failed to fetch data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [product.id]);

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
                <div className="bg-surface rounded-lg shadow-xl p-6 w-full max-w-7xl mx-4 max-h-[90vh] flex flex-col">
                    <h2 className="text-xl font-bold text-primary mb-2">Histórico do Produto</h2>
                    <p className="text-muted mb-4 font-semibold">{product.model}</p>

                    <div className="border-b border-border mb-4">
                        <nav className="-mb-px flex space-x-6">
                            <button onClick={() => setActiveTab('sales')} className={`py-2 px-1 border-b-2 text-sm font-medium ${activeTab === 'sales' ? 'border-success text-success' : 'border-transparent text-muted hover:text-primary'}`}>Histórico de Vendas</button>
                            <button onClick={() => setActiveTab('prices')} className={`py-2 px-1 border-b-2 text-sm font-medium ${activeTab === 'prices' ? 'border-success text-success' : 'border-transparent text-muted hover:text-primary'}`}>Histórico de Preços</button>
                            <button onClick={() => setActiveTab('stock')} className={`py-2 px-1 border-b-2 text-sm font-medium ${activeTab === 'stock' ? 'border-success text-success' : 'border-transparent text-muted hover:text-primary'}`}>Histórico de Estoque</button>
                        </nav>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2">
                        {loading ? <div className="flex justify-center py-8"><SpinnerIcon /></div> : (
                            <>
                                {activeTab === 'sales' && <SalesHistoryTab product={freshProduct} sales={salesHistory} customers={customers} users={users} onRowClick={setSaleToView} />}
                                {activeTab === 'prices' && <PriceHistoryTab product={freshProduct} />}
                                {activeTab === 'stock' && <StockHistoryTab product={freshProduct} auditLogs={auditLogs} />}
                            </>
                        )}
                    </div>

                    <div className="flex justify-end mt-6 pt-4 border-t border-border">
                        <button type="button" onClick={onClose} className="px-6 py-2 bg-danger text-white rounded-md hover:bg-danger/90">
                            Fechar
                        </button>
                    </div>
                </div>
            </div>
            {saleToView && <SaleDetailModal sale={saleToView} productMap={productMap} customers={customers} users={users} onClose={() => setSaleToView(null)} />}
        </>
    );
};

export default ProductHistoryModal;
