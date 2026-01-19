
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PurchaseOrder, Supplier, Product, StockStatus } from '../types.ts';
import { getPurchaseOrders, getSuppliers, deletePurchaseOrder, updatePurchaseFinancialStatus, getProducts, formatCurrency } from '../iStorePro/services/mockApi.ts';
import { useToast } from '../contexts/ToastContext.tsx';
import { useUser } from '../contexts/UserContext.tsx';
import { PurchaseOrderModal } from '../components/PurchaseOrderModal.tsx';
import StockInModal from '../components/StockInModal.tsx';
import PurchaseOrderDetailModal from '../components/PurchaseOrderDetailModal.tsx';
import DeleteWithReasonModal from '../components/DeleteWithReasonModal.tsx';
import ConfirmationModal from '../components/ConfirmationModal.tsx';
// FIX: Replaced non-existent ClipboardCheckIcon with DocumentArrowUpIcon
import { SpinnerIcon, SearchIcon, EyeIcon, EditIcon, DocumentArrowUpIcon, CurrencyDollarIcon, TrashIcon } from '../components/icons.tsx';
import { toDateValue, getTodayStart, endOfDay } from '../iStorePro/utils/dateUtils.ts';

const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('pt-BR');

const Purchases: React.FC = () => {
    const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [isNewPurchaseModalOpen, setIsNewPurchaseModalOpen] = useState(false);
    const [stockInPurchase, setStockInPurchase] = useState<PurchaseOrder | null>(null);
    const [purchaseToView, setPurchaseToView] = useState<PurchaseOrder | null>(null);
    const [purchaseToEdit, setPurchaseToEdit] = useState<PurchaseOrder | null>(null);
    const [purchaseToDelete, setPurchaseToDelete] = useState<PurchaseOrder | null>(null);
    const [purchaseToUpdateFinance, setPurchaseToUpdateFinance] = useState<PurchaseOrder | null>(null);
    const { showToast } = useToast();
    const { user } = useUser();

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [purchasesData, suppliersData, productsData] = await Promise.all([
                getPurchaseOrders(),
                getSuppliers(),
                getProducts()
            ]);
            setPurchases(purchasesData);
            setSuppliers(suppliersData);
            setProducts(productsData);
        } catch (error) {
            showToast('Erro ao carregar compras.', 'error');
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const getPurchaseStatus = useCallback((purchase: PurchaseOrder, allProducts: Product[]) => {
        const totalInOrder = purchase.items.reduce((sum, item) => sum + item.quantity, 0);
        if (totalInOrder === 0) {
            return { status: purchase.stockStatus, pendingCount: 0 };
        }

        const launchedCount = allProducts.filter(p => p.purchaseOrderId === purchase.id).length;
        const pendingCount = totalInOrder - launchedCount;

        let status: StockStatus = 'Pendente';
        if (pendingCount <= 0) {
            status = 'Lançado';
        } else if (launchedCount > 0) {
            status = 'Parcialmente Lançado';
        }

        return { status, pendingCount };
    }, []);

    const kpiData = useMemo(() => {
        const today = getTodayStart();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = endOfDay(new Date(today.getFullYear(), today.getMonth() + 1, 0));

        const monthPurchases = purchases.filter(p => {
            const purchaseDate = new Date(p.purchaseDate);
            return purchaseDate >= startOfMonth && purchaseDate <= endOfMonth;
        });

        const total = monthPurchases.reduce((sum, p) => sum + p.total, 0);
        const count = monthPurchases.length;

        return { total, count };
    }, [purchases]);

    const handleOpenEditModal = (purchase: PurchaseOrder) => {
        setPurchaseToEdit(purchase);
        setIsNewPurchaseModalOpen(true);
    };

    const handleCloseNewPurchaseModal = (refresh: boolean) => {
        setIsNewPurchaseModalOpen(false);
        setPurchaseToEdit(null);
        if (refresh) {
            fetchData();
        }
    };

    const handleCloseStockInModal = (refresh: boolean) => {
        setStockInPurchase(null);
        if (refresh) {
            fetchData();
        }
    };

    const handleDelete = async (reason: string) => {
        if (!purchaseToDelete) return;
        console.log(`Excluindo compra #${purchaseToDelete.displayId}. Motivo: ${reason}`);
        try {
            await deletePurchaseOrder(purchaseToDelete.id, user?.id, user?.name);
            showToast('Compra excluída com sucesso!', 'success');
            setPurchaseToDelete(null);
            fetchData();
        } catch (error) {
            showToast('Erro ao excluir compra.', 'error');
        }
    };

    const handleFinanceToggle = async () => {
        if (!purchaseToUpdateFinance) return;
        try {
            await updatePurchaseFinancialStatus(purchaseToUpdateFinance.id);
            showToast('Status financeiro atualizado!', 'success');
            setPurchaseToUpdateFinance(null);
            fetchData();
        } catch (error) {
            showToast('Erro ao atualizar status financeiro.', 'error');
        }
    };

    const associatedProducts = useMemo(() => {
        if (!purchaseToView) return [];
        return products.filter(p => p.purchaseOrderId === purchaseToView.id);
    }, [products, purchaseToView]);

    const statusStyles: Record<StockStatus, string> = {
        'Lançado': 'bg-emerald-100 text-emerald-700 border-emerald-200',
        'Pendente': 'bg-amber-100 text-amber-700 border-amber-200',
        'Parcialmente Lançado': 'bg-blue-100 text-blue-700 border-blue-200',
    };

    return (
        <div className="space-y-6 animate-fade-in p-6 bg-gray-50 min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Estoque e Compras</h1>
                    <p className="text-muted font-medium">Gerencie suas ordens de compra e entrada de estoque</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsNewPurchaseModalOpen(true)}
                        className="px-6 py-3 bg-success text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-success/20 hover:bg-success/90 transition-all transform hover:-translate-y-0.5 active:translate-y-0 uppercase text-xs tracking-widest"
                    >
                        + Nova compra
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-xl text-primary"><SearchIcon className="h-6 w-6" /></div>
                    <div>
                        <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1">Compras do Mês</p>
                        <p className="text-2xl font-black text-gray-900">{kpiData.count}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="p-3 bg-success/10 rounded-xl text-success"><CurrencyDollarIcon className="h-6 w-6" /></div>
                    <div>
                        <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1">Total Mensal</p>
                        <p className="text-2xl font-black text-gray-900">{formatCurrency(kpiData.total)}</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row gap-4 items-center justify-between bg-gray-50/50">
                    <div className="relative flex-grow max-w-md">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-muted"><SearchIcon /></span>
                        <input
                            type="text"
                            placeholder="Buscar por fornecedor, produto ou ID..."
                            className="pl-12 pr-4 py-3 border border-gray-200 rounded-2xl w-full bg-white text-sm font-medium focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="date" className="p-2.5 border border-gray-200 rounded-xl bg-white text-sm font-bold text-gray-700 outline-none focus:ring-4 focus:ring-primary/10 transition-all" defaultValue={toDateValue()} />
                        <span className="text-gray-400 font-bold">até</span>
                        <input type="date" className="p-2.5 border border-gray-200 rounded-xl bg-white text-sm font-bold text-gray-700 outline-none focus:ring-4 focus:ring-primary/10 transition-all" defaultValue={toDateValue()} />
                    </div>
                </div>

                {loading ? <div className="flex justify-center py-12"><SpinnerIcon /></div> : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-muted">
                            <thead className="text-xs text-secondary uppercase bg-surface-secondary">
                                <tr>
                                    <th className="px-4 py-3">#</th>
                                    <th className="px-4 py-3">Data da Compra</th>
                                    <th className="px-4 py-3">Fornecedor</th>
                                    <th className="px-4 py-3">Localizador</th>
                                    <th className="px-4 py-3">Total</th>
                                    <th className="px-4 py-3">Estoque</th>
                                    <th className="px-4 py-3">Financeiro</th>
                                    <th className="px-4 py-3">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {purchases.map(p => {
                                    const { status, pendingCount } = getPurchaseStatus(p, products);
                                    return (
                                        <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group">
                                            <td className="px-6 py-4 font-bold text-primary">#{p.displayId}</td>
                                            <td className="px-6 py-4 text-xs font-semibold text-gray-500">{formatDate(p.purchaseDate)}</td>
                                            <td className="px-6 py-4 font-medium text-gray-900">{p.supplierName}</td>
                                            <td className="px-6 py-4 text-xs font-mono text-gray-400">{p.locatorId}</td>
                                            <td className="px-6 py-4 font-black text-gray-900">{formatCurrency(p.total)}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-lg border ${statusStyles[status]}`}>
                                                    {status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-lg border ${p.financialStatus === 'Pago' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                                    {p.financialStatus}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button onClick={() => setPurchaseToView(p)} title="Visualizar" className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"><EyeIcon className="h-4 w-4" /></button>
                                                    <button onClick={() => handleOpenEditModal(p)} title="Editar" className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"><EditIcon className="h-4 w-4" /></button>
                                                    <button onClick={() => setStockInPurchase(p)} title="Lançar no Estoque" disabled={pendingCount === 0} className={`p-2 rounded-lg transition-all ${pendingCount > 0 ? 'text-gray-400 hover:text-primary hover:bg-primary/5' : 'text-gray-200'}`}>
                                                        <DocumentArrowUpIcon className="h-4 w-4" />
                                                    </button>
                                                    <button onClick={() => setPurchaseToUpdateFinance(p)} title="Alterar Status Financeiro" className={`p-2 rounded-lg transition-all ${p.financialStatus === 'Pago' ? 'text-emerald-500 hover:bg-emerald-50' : 'text-gray-400 hover:text-primary hover:bg-primary/5'}`}>
                                                        <CurrencyDollarIcon className="h-4 w-4" />
                                                    </button>
                                                    <button onClick={() => setPurchaseToDelete(p)} title="Excluir" className="p-2 text-gray-400 hover:text-danger hover:bg-danger/5 rounded-lg transition-all"><TrashIcon className="h-4 w-4" /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {purchaseToView && <PurchaseOrderDetailModal purchase={purchaseToView} onClose={() => setPurchaseToView(null)} associatedProducts={associatedProducts} />}
            {isNewPurchaseModalOpen && <PurchaseOrderModal suppliers={suppliers} customers={[]} onClose={handleCloseNewPurchaseModal} purchaseOrderToEdit={purchaseToEdit} brands={[]} categories={[]} productModels={[]} grades={[]} gradeValues={[]} onAddNewSupplier={async () => null} />}
            {stockInPurchase && <StockInModal purchaseOrder={stockInPurchase} onClose={handleCloseStockInModal} allProducts={products} grades={[]} gradeValues={[]} />}
            {purchaseToDelete && <DeleteWithReasonModal
                isOpen={!!purchaseToDelete}
                onClose={() => setPurchaseToDelete(null)}
                onConfirm={handleDelete}
                title={`Excluir Compra #${purchaseToDelete.displayId}`}
                message="Esta ação irá remover permanentemente a compra e todos os produtos do estoque associados a ela. Esta ação não pode ser desfeita."
            />}
            {purchaseToUpdateFinance && <ConfirmationModal
                isOpen={!!purchaseToUpdateFinance}
                onClose={() => setPurchaseToUpdateFinance(null)}
                onConfirm={handleFinanceToggle}
                title="Alterar Status Financeiro"
                message={`Deseja marcar a compra #${purchaseToUpdateFinance.displayId} como "${purchaseToUpdateFinance.financialStatus === 'Pendente' ? 'Paga' : 'Pendente'}"?`}
                variant="success"
            />}
        </div>
    );
};

export default Purchases;
