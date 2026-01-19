
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PurchaseOrder, StockStatus, FinancialStatus, Product } from '../types.ts';
import { getPurchaseOrders, getProducts, formatCurrency } from '../iStorePro/services/mockApi.ts';
import { useToast } from '../contexts/ToastContext.tsx';
import {
    SpinnerIcon, PlusIcon, PlayCircleIcon, SearchIcon, XCircleIcon, CalendarDaysIcon,
    ShoppingCartIcon, CurrencyDollarIcon, DocumentTextIcon, EyeIcon, EditIcon,
    ArchiveBoxIcon, ChevronLeftIcon, ChevronRightIcon, ArrowsUpDownIcon, CheckIcon, DocumentArrowUpIcon,
    BoxIsoIcon, BoxIsoFilledIcon
} from '../components/icons.tsx';
import RevertStockModal from '../components/RevertStockModal.tsx';

// ... (StatusTag component remains same)

// ... (inside Compras component, skip to table render)

// Status Tag Component
const StatusTag: React.FC<{ text: string; type: 'success' | 'warning' | 'danger' | 'info' | 'default' }> = ({ text, type }) => {
    const colors = {
        success: 'bg-green-100 text-green-700', // Lançado
        warning: 'bg-orange-100 text-orange-700', // Pendente
        danger: 'bg-red-100 text-red-700',
        info: 'bg-blue-100 text-blue-700',
        default: 'bg-gray-100 text-gray-700' // Cancelada
    };
    return <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${colors[type]}`}>{text}</span>;
};


const Compras: React.FC = () => {
    const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const { showToast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('Todos');
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

    // Purchase Details Modal State
    const [viewingPurchase, setViewingPurchase] = useState<PurchaseOrder | null>(null);
    const [associatedProducts, setAssociatedProducts] = useState<Product[]>([]);

    // Revert Modal State
    const [revertModalOpen, setRevertModalOpen] = useState(false);
    const [purchaseToRevert, setPurchaseToRevert] = useState<PurchaseOrder | null>(null);
    const [revertProducts, setRevertProducts] = useState<Product[]>([]);
    const [isReverting, setIsReverting] = useState(false);

    const handleViewDetails = async (purchase: PurchaseOrder) => {
        setViewingPurchase(purchase);
        // Fetch products to find those linked to this purchase
        try {
            const allProducts = await getProducts();
            const linked = allProducts.filter(p => p.purchaseOrderId === purchase.id);
            setAssociatedProducts(linked);
        } catch (error) {
            console.error("Error fetching linked products", error);
            setAssociatedProducts([]);
        }
    };

    const handleClickRevert = async (purchase: PurchaseOrder) => {
        if (purchase.stockStatus !== 'Lançado') {
            return;
        }

        setPurchaseToRevert(purchase);
        try {
            const allProducts = await getProducts();
            const linked = allProducts.filter(p => p.purchaseOrderId === purchase.id);
            setRevertProducts(linked);
            setRevertModalOpen(true);
        } catch (error) {
            showToast("Erro ao buscar produtos da compra.", "error");
        }
    };

    const handleConfirmRevert = async () => {
        if (!purchaseToRevert) return;
        setIsReverting(true);
        try {
            // TODO: Implement actual revert logic in mockApi
            // Here we just simulate a delay for now
            await new Promise(r => setTimeout(r, 1500));
            showToast("Estoque revertido com sucesso!", "success");

            setRevertModalOpen(false);
            setPurchaseToRevert(null);
            fetchData(); // Refresh list
        } catch (error) {
            showToast("Erro ao reverter estoque.", "error");
        } finally {
            setIsReverting(false);
        }
    };

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const purchasesData = await getPurchaseOrders();
            setPurchases(purchasesData);
        } catch (error) {
            showToast('Erro ao carregar compras.', 'error');
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        fetchData();
        const handleUpdates = () => fetchData();
        window.addEventListener('company-data-updated', handleUpdates);

        const bc = new BroadcastChannel('app-updates');
        bc.onmessage = (e) => {
            if (e.data === 'company-data-updated') fetchData();
        };

        return () => {
            window.removeEventListener('company-data-updated', handleUpdates);
            bc.close();
        };
    }, [fetchData]);

    const filteredPurchases = useMemo(() => {
        const filtered = purchases.filter(p => {
            const lowerSearch = searchTerm.toLowerCase();
            const searchMatch = lowerSearch === '' ||
                p.supplierName.toLowerCase().includes(lowerSearch) ||
                p.displayId.toString().includes(lowerSearch) ||
                p.locatorId.toLowerCase().includes(lowerSearch);

            const statusMatch = statusFilter === 'Todos' ||
                p.status === statusFilter ||
                p.stockStatus === statusFilter ||
                p.financialStatus === statusFilter;

            return searchMatch && statusMatch;
        });

        return filtered.sort((a, b) => {
            const dateA = new Date(a.createdAt || a.purchaseDate).getTime();
            const dateB = new Date(b.createdAt || b.purchaseDate).getTime();
            return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
        });
    }, [purchases, searchTerm, statusFilter, sortOrder]);

    // KPIs
    const kpiData = useMemo(() => {
        const monthPurchases = purchases.filter(p => {
            const date = new Date(p.purchaseDate);
            return date.getFullYear() === 2025 && date.getMonth() === 8; // Month is 0-indexed
        });
        const total = monthPurchases.reduce((sum, p) => sum + p.total, 0);
        const count = monthPurchases.length;
        return { total, count };
    }, [purchases]);

    const getCompraStatusType = (status?: string): 'warning' | 'default' => {
        switch (status) {
            case 'Pendente': return 'warning';
            case 'Cancelada': return 'default';
            default: return 'warning';
        }
    };

    const getStockStatusType = (status: StockStatus): 'success' | 'warning' => {
        switch (status) {
            case 'Lançado': return 'success';
            case 'Pendente': return 'warning';
            case 'Parcialmente Lançado': return 'warning';
            default: return 'warning';
        }
    };

    const getFinancialStatusType = (status: FinancialStatus): 'warning' | 'success' => {
        return status === 'Pendente' ? 'warning' : 'success';
    };

    const formatPurchaseDate = (dateString: string) => {
        const date = new Date(dateString);
        if (dateString.includes('T')) {
            return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        }
        const dateObj = new Date(dateString + 'T12:00:00');
        return dateObj.toLocaleDateString('pt-BR');
    };


    if (loading) {
        return <div className="flex justify-center items-center h-full"><SpinnerIcon /></div>
    }

    return (
        <div className="space-y-6">
            {/* Top Bar */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <ShoppingCartIcon className="h-8 w-8 text-primary" />
                    <h1 className="text-3xl font-bold text-primary">Compras</h1>
                </div>
                <div className="flex items-center gap-4">
                    <button className="px-4 py-2 bg-gray-800 text-white rounded-md font-semibold flex items-center gap-2 text-sm hover:bg-gray-700">
                        <PlusIcon className="h-5 w-5" /> Nova compra
                    </button>
                    <button className="px-4 py-2 bg-red-600 text-white rounded-md font-semibold flex items-center gap-2 text-sm hover:bg-red-500">
                        <PlayCircleIcon className="h-5 w-5" /> Tutoriais
                    </button>
                </div>
            </div>

            {/* Filters and KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div className="flex items-center gap-2 bg-surface p-4 rounded-lg border border-border">
                    <div className="relative">
                        <input type="text" value="01/09/2025" readOnly className="p-2 w-32 border rounded-md bg-surface border-border pl-9 text-sm h-10" />
                        <CalendarDaysIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-5 w-5 text-muted" />
                    </div>
                    <span className="text-muted">à</span>
                    <div className="relative">
                        <input type="text" value="30/09/2025" readOnly className="p-2 w-32 border rounded-md bg-surface border-border pl-9 text-sm h-10" />
                        <CalendarDaysIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-5 w-5 text-muted" />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-surface p-4 rounded-lg border border-border">
                        <p className="text-sm text-muted">Qtd de compras do mês</p>
                        <div className="flex items-center gap-2 mt-1">
                            <ShoppingCartIcon className="h-6 w-6 text-muted" />
                            <p className="text-2xl font-bold text-primary">{kpiData.count}</p>
                        </div>
                    </div>
                    <div className="bg-surface p-4 rounded-lg border border-border">
                        <p className="text-sm text-muted">Total de compras do mês</p>
                        <div className="flex items-center gap-2 mt-1">
                            <CurrencyDollarIcon className="h-6 w-6 text-muted" />
                            <p className="text-2xl font-bold text-primary">{formatCurrency(kpiData.total)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-surface rounded-lg border border-border">
                <div className="p-4 flex items-center gap-4">
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="p-2 border rounded-md bg-surface border-border text-sm h-10"
                    >
                        <option value="Todos">Filtrar por Status</option>
                        <option value="Pendente">Pendente</option>
                        <option value="Lançado">Lançado</option>
                        <option value="Cancelada">Cancelada</option>
                        <option value="Pago">Pago</option>
                    </select>
                    <div className="relative flex-grow">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Digite para buscar..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full p-2 pl-10 border rounded-md bg-surface border-border text-sm pr-8 h-10"
                        />
                        {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-primary"><XCircleIcon className="h-5 w-5" /></button>}
                    </div>
                    <button
                        onClick={() => setSortOrder(o => o === 'newest' ? 'oldest' : 'newest')}
                        className="h-10 px-3 py-2 bg-gray-200 text-secondary rounded-md hover:bg-gray-300 flex items-center gap-2 text-sm font-medium flex-shrink-0"
                    >
                        <ArrowsUpDownIcon className="h-4 w-4" />
                        <span>{sortOrder === 'newest' ? 'Recente' : 'Mais Antigo'}</span>
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-secondary uppercase bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 font-medium">ID</th>
                                <th className="px-4 py-3 font-medium">Data da compra</th>
                                <th className="px-4 py-3 font-medium">Fornecedor</th>
                                <th className="px-4 py-3 font-medium">Localizador no estoque</th>
                                <th className="px-4 py-3 font-medium">Total da compra</th>
                                <th className="px-4 py-3 font-medium">Compra</th>
                                <th className="px-4 py-3 font-medium">Estoque</th>
                                <th className="px-4 py-3 font-medium">Financeiro</th>
                                <th className="px-4 py-3 font-medium">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="text-primary">
                            {filteredPurchases.map(p => (
                                <tr key={p.id} className="border-t border-border hover:bg-surface-secondary">
                                    <td className="px-4 py-3 font-semibold">#{p.displayId}</td>
                                    <td className="px-4 py-3 text-muted">{formatPurchaseDate(p.purchaseDate)}</td>
                                    <td className="px-4 py-3">{p.supplierName}</td>
                                    <td className="px-4 py-3 text-muted">{p.locatorId}</td>
                                    <td className="px-4 py-3 font-semibold">{formatCurrency(p.total)}</td>
                                    <td className="px-4 py-3"><StatusTag text={p.status || 'Pendente'} type={getCompraStatusType(p.status)} /></td>
                                    <td className="px-4 py-3"><StatusTag text={p.stockStatus} type={getStockStatusType(p.stockStatus)} /></td>
                                    <td className="px-4 py-3"><StatusTag text={p.financialStatus} type={getFinancialStatusType(p.financialStatus)} /></td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3 justify-end">
                                            <button title="Visualizar" onClick={() => handleViewDetails(p)} className="text-gray-500 hover:text-gray-700 transition-colors">
                                                <EyeIcon className="h-5 w-5" />
                                            </button>
                                            <button title="Editar" className="text-gray-500 hover:text-gray-700 transition-colors">
                                                <EditIcon className="h-5 w-5" />
                                            </button>
                                            <button
                                                title={p.financialStatus === 'Pago' ? 'Marcar como Pendente' : 'Marcar como Pago'}
                                                className="text-green-500 hover:text-green-600 transition-colors"
                                            >
                                                <CurrencyDollarIcon className="h-6 w-6" />
                                            </button>
                                            <button
                                                title={p.stockStatus === 'Lançado' ? 'Reverter Estoque' : 'Lançar no Estoque'}
                                                onClick={() => {
                                                    console.log('Stock Status clicked:', p.stockStatus);
                                                    if (p.stockStatus === 'Lançado') {
                                                        handleClickRevert(p);
                                                    } else {
                                                        // Handle Lançar logic
                                                    }
                                                }}
                                                className="transition-colors p-1 rounded hover:bg-gray-100"
                                            >
                                                {p.stockStatus === 'Lançado' ? (
                                                    <BoxIsoFilledIcon className="h-6 w-6 text-blue-600" />
                                                ) : (
                                                    <BoxIsoIcon className="h-6 w-6 text-blue-500 hover:text-blue-600" />
                                                )}
                                            </button>
                                            <button title="Excluir" className="text-red-500 hover:text-red-600 transition-colors">
                                                <XCircleIcon className="h-6 w-6" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="p-4 flex justify-between items-center text-sm">
                    <p className="font-semibold text-secondary">Total de Registros: {filteredPurchases.length}</p>
                    <div className="flex items-center gap-2 text-secondary">
                        <button className="p-1 rounded-md hover:bg-gray-200 disabled:opacity-50" disabled><ChevronLeftIcon className="h-5 w-5" /></button>
                        <span>1 de 1</span>
                        <button className="p-1 rounded-md hover:bg-gray-200 disabled:opacity-50" disabled><ChevronRightIcon className="h-5 w-5" /></button>
                    </div>
                </div>
            </div>

            {/* Revert Modal */}
            {revertModalOpen && purchaseToRevert && (
                <RevertStockModal
                    purchase={purchaseToRevert}
                    products={revertProducts}
                    onClose={() => setRevertModalOpen(false)}
                    onConfirm={handleConfirmRevert}
                    isReverting={isReverting}
                />
            )}

            {/* Purchase Details Modal */}
            {viewingPurchase && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4 animate-fade-in">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-slide-up">
                        {/* Header */}
                        <div className="flex justify-between items-start p-6 border-b border-gray-100">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">Detalhes da Compra #{viewingPurchase.displayId}</h2>
                                <p className="text-sm text-gray-500 mt-1">Fornecedor: <span className="font-medium text-gray-700">{viewingPurchase.supplierName}</span></p>
                                <p className="text-sm text-gray-500">
                                    {viewingPurchase.createdAt ? (
                                        <>Lançado por: <span className="font-medium text-gray-700">{viewingPurchase.createdBy}</span> em {new Date(viewingPurchase.createdAt).toLocaleString()}</>
                                    ) : (
                                        <>Data: {formatPurchaseDate(viewingPurchase.purchaseDate)}</>
                                    )}
                                </p>
                            </div>
                            <button onClick={() => setViewingPurchase(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <XCircleIcon className="h-8 w-8" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto flex-1">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50">
                                    <tr className="text-xs uppercase text-gray-500 font-semibold border-b border-gray-200">
                                        <th className="text-left py-3 px-4">Produto</th>
                                        <th className="text-center py-3 px-4">Qtd</th>
                                        <th className="text-right py-3 px-4">Custo Unit.</th>
                                        <th className="text-right py-3 px-4">Custo Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {viewingPurchase.items.map(item => {
                                        const itemProducts = associatedProducts.filter(p => p.purchaseItemId === item.id);

                                        return (
                                            <React.Fragment key={item.id}>
                                                <tr className="bg-white hover:bg-gray-50 transition-colors">
                                                    <td className="py-4 px-4">
                                                        <div className="font-bold text-gray-900 text-base">
                                                            {item.productDetails.brand} {item.productDetails.model} {item.productDetails.color}
                                                        </div>
                                                        <div className="text-xs text-gray-500 mt-1 flex gap-2">
                                                            <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600">{item.productDetails.condition}</span>
                                                            <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600">{item.productDetails.warranty}</span>
                                                        </div>
                                                    </td>
                                                    <td className="text-center py-4 px-4 font-medium">{item.quantity}</td>
                                                    <td className="text-right py-4 px-4 text-gray-600">{formatCurrency(item.finalUnitCost)}</td>
                                                    <td className="text-right py-4 px-4 font-bold text-gray-900">{formatCurrency(item.finalUnitCost * item.quantity)}</td>
                                                </tr>
                                                {/* Detailed Products Sub-list */}
                                                {itemProducts.length > 0 && (
                                                    <tr>
                                                        <td colSpan={4} className="pb-6 pt-0 px-4 bg-gray-50/30">
                                                            <div className="mt-2 ml-4 relative">
                                                                <div className="absolute left-[-16px] top-4 bottom-4 w-4 border-l-2 border-b-2 border-gray-200 rounded-bl-lg"></div>
                                                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Itens Individualizados em Estoque ({itemProducts.length})</h4>
                                                                <div className="grid gap-3">
                                                                    {itemProducts.map(prod => (
                                                                        <div key={prod.id} className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 p-3 bg-white rounded-lg border border-gray-200 shadow-sm text-xs">
                                                                            {prod.imei1 && (
                                                                                <div>
                                                                                    <span className="text-[10px] text-gray-400 font-bold uppercase block mb-0.5">IMEI 1</span>
                                                                                    <span className="font-mono text-gray-700 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 block w-fit">{prod.imei1}</span>
                                                                                </div>
                                                                            )}
                                                                            {prod.imei2 && (
                                                                                <div>
                                                                                    <span className="text-[10px] text-gray-400 font-bold uppercase block mb-0.5">IMEI 2</span>
                                                                                    <span className="font-mono text-gray-700 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 block w-fit">{prod.imei2}</span>
                                                                                </div>
                                                                            )}
                                                                            {prod.serialNumber && (
                                                                                <div>
                                                                                    <span className="text-[10px] text-gray-400 font-bold uppercase block mb-0.5">Serial Number</span>
                                                                                    <span className="font-mono text-gray-700 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 block w-fit">{prod.serialNumber}</span>
                                                                                </div>
                                                                            )}
                                                                            {prod.batteryHealth !== undefined && prod.batteryHealth > 0 && (
                                                                                <div>
                                                                                    <span className="text-[10px] text-gray-400 font-bold uppercase block mb-0.5">Saúde Bateria</span>
                                                                                    <span className={`font-bold ${prod.batteryHealth < 80 ? 'text-orange-600' : 'text-green-600'}`}>
                                                                                        {prod.batteryHealth}%
                                                                                    </span>
                                                                                </div>
                                                                            )}
                                                                            {prod.storageLocation && (
                                                                                <div>
                                                                                    <span className="text-[10px] text-gray-400 font-bold uppercase block mb-0.5">Localização</span>
                                                                                    <span className="text-gray-700 flex items-center gap-1">
                                                                                        <ArchiveBoxIcon className="h-3 w-3 text-gray-400" />
                                                                                        {prod.storageLocation}
                                                                                    </span>
                                                                                </div>
                                                                            )}
                                                                            {prod.variations && prod.variations.length > 0 && (
                                                                                <div className="col-span-2">
                                                                                    <span className="text-[10px] text-gray-400 font-bold uppercase block mb-0.5">Variações</span>
                                                                                    <div className="flex gap-1 flex-wrap">
                                                                                        {prod.variations.map((v, idx) => (
                                                                                            <span key={idx} className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100">
                                                                                                {v.type}: {v.value}
                                                                                            </span>
                                                                                        ))}
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>

                            <div className="flex justify-end mt-8">
                                <div className="w-full max-w-xs space-y-3 bg-gray-50 p-5 rounded-xl border border-gray-200">
                                    <div className="flex justify-between text-sm text-gray-600">
                                        <span>Subtotal</span>
                                        <span>{formatCurrency(viewingPurchase.total - viewingPurchase.additionalCost)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-gray-600">
                                        <span>Custo Adicional</span>
                                        <span>{formatCurrency(viewingPurchase.additionalCost)}</span>
                                    </div>
                                    <div className="flex justify-between text-xl font-bold text-gray-900 pt-3 border-t border-gray-200">
                                        <span>Total</span>
                                        <span>{formatCurrency(viewingPurchase.total)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer Button */}
                        <div className="p-5 border-t border-gray-100 flex justify-end bg-gray-50">
                            <button onClick={() => setViewingPurchase(null)} className="px-8 py-2.5 bg-red-600 text-white rounded-lg font-bold shadow-lg shadow-red-200 hover:bg-red-700 transition-all hover:shadow-xl transform hover:-translate-y-0.5">
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Compras;
