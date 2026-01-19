
import React, { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { Product, Sale, Customer, User, ProductCondition, PurchaseOrder, Supplier, StockStatus, Brand, Category, ProductModel, Grade, GradeValue, FinancialStatus, PermissionSet } from '../types.ts';
import {
    getProducts, addProduct, updateProduct, deleteProduct, getProductSalesHistory,
    getCustomers, getUsers, updateProductStock, updateMultipleProducts,
    getPurchaseOrders, getSuppliers, deletePurchaseOrder, updatePurchaseFinancialStatus, addSupplier,
    getBrands, getCategories, getProductModels, getGrades, getGradeValues, revertPurchaseLaunch,
    formatCurrency, findOrCreateSupplierFromCustomer,
    getSales
} from '../iStorePro/services/mockApi.ts';
import { useToast } from '../contexts/ToastContext.tsx';
import { useUser } from '../contexts/UserContext.tsx';
import ConfirmationModal from '../components/ConfirmationModal.tsx';
import UpdateStockModal from '../components/UpdateStockModal.tsx';
import ProductHistoryModal from '../components/ProductHistoryModal.tsx';
import BulkPriceUpdateModal from '../components/BulkPriceUpdateModal.tsx';
import PurchaseOrderDetailModal from '../components/PurchaseOrderDetailModal.tsx';
import DeleteWithReasonModal from '../components/DeleteWithReasonModal.tsx';
import { toDateValue, getNowISO } from '../iStorePro/utils/dateUtils.ts';
import {
    SpinnerIcon, EditIcon, TrashIcon, SearchIcon, PlusIcon, TagIcon, EllipsisVerticalIcon, Cog6ToothIcon,
    TicketIcon, DocumentArrowUpIcon, PlayCircleIcon, AppleIcon, ArchiveBoxIcon, XCircleIcon, EyeIcon,
    BanknotesIcon, DocumentTextIcon, CalendarDaysIcon, ArrowsUpDownIcon, ShoppingCartIcon, ChevronLeftIcon, ChevronRightIcon,
    ArrowUturnLeftIcon, AdjustmentsHorizontalIcon, CurrencyDollarIcon
} from '../components/icons.tsx';

// Lazy load heavy modal components for better performance
const ProductModal = lazy(() => import('../components/ProductModal.tsx'));
const PurchaseOrderModal = lazy(() => import('../components/PurchaseOrderModal.tsx').then(m => ({ default: m.PurchaseOrderModal })));
const StockInModal = lazy(() => import('../components/StockInModal.tsx'));


const ProductActionsDropdown: React.FC<{ onHistory: () => void, onUpdateStock: () => void, onEdit: () => void, onDelete: () => void, permissions: PermissionSet | null }> = ({ onHistory, onUpdateStock, onEdit, onDelete, permissions }) => {
    const [isOpen, setIsOpen] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [style, setStyle] = useState<React.CSSProperties>({});

    const handleToggle = () => {
        if (isOpen) {
            setIsOpen(false);
        } else {
            if (!buttonRef.current) return;
            const rect = buttonRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const menuHeight = 160;

            const newStyle: React.CSSProperties = {
                position: 'fixed',
                width: '11rem',
                right: window.innerWidth - rect.right,
                zIndex: 50,
            };

            if (spaceBelow < menuHeight && rect.top > menuHeight) {
                newStyle.bottom = window.innerHeight - rect.top;
            } else {
                newStyle.top = rect.bottom;
            }

            setStyle(newStyle);
            setIsOpen(true);
        }
    };

    useEffect(() => {
        const handleOutsideClick = (event: MouseEvent) => {
            if (isOpen && dropdownRef.current && !dropdownRef.current.contains(event.target as Node) && buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        const handleScroll = () => { if (isOpen) setIsOpen(false); };
        document.addEventListener('mousedown', handleOutsideClick);
        window.addEventListener('scroll', handleScroll, true);
        window.addEventListener('resize', handleScroll);
        return () => {
            document.removeEventListener('mousedown', handleOutsideClick);
            window.removeEventListener('scroll', handleScroll, true);
            window.removeEventListener('resize', handleScroll);
        };
    }, [isOpen]);

    const menuItemClasses = "w-full text-left flex items-center gap-3 px-4 py-2 text-sm";

    return (
        <div>
            <button ref={buttonRef} onClick={handleToggle} className="p-1 rounded-full hover:bg-gray-200 text-muted"><EllipsisVerticalIcon className="h-5 w-5" /></button>
            {isOpen && (
                <div ref={dropdownRef} style={style} className="rounded-md shadow-lg bg-surface ring-1 ring-black ring-opacity-5">
                    <div className="py-1">
                        <button onClick={() => { onHistory(); setIsOpen(false); }} className={`${menuItemClasses} text-secondary hover:bg-surface-secondary`}>
                            <DocumentTextIcon className="h-4 w-4" /> Histórico
                        </button>
                        {permissions?.canEditStock && (
                            <button onClick={() => { onUpdateStock(); setIsOpen(false); }} className={`${menuItemClasses} text-secondary hover:bg-surface-secondary`}>
                                <AdjustmentsHorizontalIcon className="h-4 w-4" /> Editar Estoque
                            </button>
                        )}
                        {permissions?.canEditProduct && (
                            <button onClick={() => { onEdit(); setIsOpen(false); }} className={`${menuItemClasses} text-secondary hover:bg-surface-secondary`}>
                                <EditIcon className="h-4 w-4" /> Editar
                            </button>
                        )}
                        {permissions?.canDeleteProduct && (
                            <button onClick={() => { onDelete(); setIsOpen(false); }} className={`${menuItemClasses} text-danger hover:bg-danger-light`}>
                                <TrashIcon className="h-4 w-4" /> Excluir
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const StatusTag: React.FC<{ text: string; type: 'success' | 'warning' | 'danger' | 'info' | 'default' | 'warning-filled' }> = ({ text, type }) => {
    const colors = {
        success: 'bg-green-100 text-green-700',
        warning: 'bg-orange-100 text-orange-700',
        'warning-filled': 'bg-orange-500 text-white',
        danger: 'bg-red-100 text-red-700',
        info: 'bg-blue-100 text-blue-700',
        default: 'bg-gray-100 text-gray-700'
    };
    return <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${colors[type]}`}>{text}</span>;
};

// --- Supplier Label Logic ---
const getSupplierColorClass = (supplier: Supplier | undefined) => {
    if (!supplier) return 'bg-gray-100 text-gray-700';
    if (supplier.linkedCustomerId) return 'bg-purple-100 text-purple-700 border border-purple-200'; // Client-Suppliers (Purple) - Mantendo roxo para diferenciar "Cliente"

    // FIX: All standard suppliers should be Orange as requested
    return 'bg-orange-100 text-orange-700 border border-orange-200';
};


const getInitialMonthStart = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    return toDateValue(firstDay);
};

const getInitialMonthEnd = () => {
    const today = new Date();
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return toDateValue(lastDay);
};

const Products: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'estoque' | 'compras'>('estoque');
    const [loading, setLoading] = useState(true);
    const { showToast } = useToast();
    const { permissions, user } = useUser();

    const [products, setProducts] = useState<Product[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [brands, setBrands] = useState<Brand[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [productModels, setProductModels] = useState<ProductModel[]>([]);
    const [grades, setGrades] = useState<Grade[]>([]);
    const [gradeValues, setGradeValues] = useState<GradeValue[]>([]);
    const [sales, setSales] = useState<Sale[]>([]);

    const [searchTerm, setSearchTerm] = useState('');
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [isBulkUpdateModalOpen, setIsBulkUpdateModalOpen] = useState(false);
    const [isUpdateStockModalOpen, setIsUpdateStockModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);
    const [productForHistory, setProductForHistory] = useState<Product | null>(null);
    const [productForStockUpdate, setProductForStockUpdate] = useState<Product | null>(null);
    const [productSalesHistory, setProductSalesHistory] = useState<Sale[]>([]);
    const [filters, setFilters] = useState({ stock: 'Em estoque', condition: 'Todos', location: 'Todos' });
    const [inventorySortOrder, setInventorySortOrder] = useState<'newest' | 'oldest'>('newest');


    const [isNewPurchaseModalOpen, setIsNewPurchaseModalOpen] = useState(false);
    const [stockInPurchase, setStockInPurchase] = useState<PurchaseOrder | null>(null);
    const [purchaseToView, setPurchaseToView] = useState<PurchaseOrder | null>(null);
    const [purchaseToEdit, setPurchaseToEdit] = useState<PurchaseOrder | null>(null);
    const [purchaseToDelete, setPurchaseToDelete] = useState<PurchaseOrder | null>(null);
    const [purchaseToUpdateFinance, setPurchaseToUpdateFinance] = useState<PurchaseOrder | null>(null);
    const [purchaseToRevert, setPurchaseToRevert] = useState<PurchaseOrder | null>(null);
    const [purchaseSearchTerm, setPurchaseSearchTerm] = useState('');
    const [startDate, setStartDate] = useState(getInitialMonthStart());
    const [endDate, setEndDate] = useState(getInitialMonthEnd());
    const [purchaseSortOrder, setPurchaseSortOrder] = useState<'newest' | 'oldest'>('newest');
    const [statusFilter, setStatusFilter] = useState('Todos');
    const [activePeriod, setActivePeriod] = useState<'hoje' | 'semana' | 'mes'>('mes');


    const fetchData = useCallback(async (retryCount = 0) => {
        setLoading(true);
        try {
            // 1. Fetch metadata (lighter requests)
            const [
                usersData, suppliersData, brandsData, categoriesData,
                modelsData, gradesData, gradeValuesData
            ] = await Promise.all([
                getUsers(), getSuppliers(), getBrands(), getCategories(),
                getProductModels(), getGrades(), getGradeValues()
            ]);

            setUsers(usersData);
            setSuppliers(suppliersData);
            setBrands(brandsData);
            setCategories(categoriesData);
            setProductModels(modelsData);
            setGrades(gradesData);
            setGradeValues(gradeValuesData);

            // 2. Fetch main data (heavier requests)
            const [productsData, customersData, purchasesData, salesData] = await Promise.all([
                getProducts(), getCustomers(), getPurchaseOrders(), getSales()
            ]);

            setProducts(productsData);
            setCustomers(customersData);
            setPurchases(purchasesData);
            setSales(salesData);
        } catch (error) {
            console.error('Products: Error fetching data:', error);

            // Auto-retry once after short delay (handles reconnection issues after idle)
            if (retryCount < 1) {
                console.log('Products: Tentando reconectar automaticamente...');
                setTimeout(() => fetchData(retryCount + 1), 2000);
                return;
            }

            showToast('Erro ao carregar dados.', 'error');
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        fetchData();

        const handleCompanyUpdate = () => fetchData();
        window.addEventListener('company-data-updated', handleCompanyUpdate);

        const bc = new BroadcastChannel('app-updates');
        bc.onmessage = (event) => {
            if (event.data === 'company-data-updated') fetchData();
        };

        return () => {
            window.removeEventListener('company-data-updated', handleCompanyUpdate);
            bc.close();
        };
    }, [fetchData]);

    const availableTabs = useMemo(() => {
        const tabs = [];
        if (permissions?.canAccessEstoque) {
            tabs.push({ id: 'estoque', label: 'Estoque' });
        }
        if (permissions?.canViewPurchases) {
            tabs.push({ id: 'compras', label: 'Compras' });
        }
        return tabs;
    }, [permissions]);

    useEffect(() => {
        if (availableTabs.length > 0 && !availableTabs.find(t => t.id === activeTab)) {
            setActiveTab(availableTabs[0].id as 'estoque' | 'compras');
        }
    }, [availableTabs, activeTab]);

    const soldProductIds = useMemo(() => {
        // Consider any product in a non-cancelled sale as "sold" or "reserved"
        return new Set(sales.filter(s => s.status !== 'Cancelada').flatMap(s => s.items).map(i => String(i.productId)));
    }, [sales]);

    const filteredProducts = useMemo(() => {
        const lowerSearchTerm = searchTerm.toLowerCase().trim();

        const matchingPurchaseOrderIds = lowerSearchTerm ? new Set(
            purchases
                .filter(po => (po.locatorId || '').toLowerCase().includes(lowerSearchTerm))
                .map(po => po.id)
        ) : new Set();

        const filtered = products.filter(p => {
            const searchMatch = lowerSearchTerm === '' ||
                (p.model || '').toLowerCase().includes(lowerSearchTerm) ||
                (p.brand || '').toLowerCase().includes(lowerSearchTerm) ||
                (p.serialNumber || '').toLowerCase().includes(lowerSearchTerm) ||
                (p.imei1 || '').toLowerCase().includes(lowerSearchTerm) ||
                (p.imei2 && (p.imei2 || '').toLowerCase().includes(lowerSearchTerm)) ||
                (p.barcodes && p.barcodes.some(barcode => (barcode || '').toLowerCase().includes(lowerSearchTerm))) ||
                (p.purchaseOrderId && matchingPurchaseOrderIds.has(p.purchaseOrderId));

            const stockMatch = filters.stock === 'Todos' ? true : filters.stock === 'Em estoque' ? p.stock > 0 : p.stock === 0;
            const conditionMatch = filters.condition === 'Todos' ? true : p.condition === filters.condition;
            const locationMatch = filters.location === 'Todos' ? true : p.storageLocation === filters.location;
            return searchMatch && stockMatch && conditionMatch && locationMatch;
        });

        return [...filtered].sort((a, b) => {
            if (inventorySortOrder === 'newest') {
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            }
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });
    }, [products, searchTerm, filters, inventorySortOrder, purchases]);

    const productMap = useMemo(() => products.reduce((acc, p) => ({ ...acc, [p.id]: p }), {} as Record<string, Product>), [products]);
    const userMap = useMemo(() => users.reduce((acc, u) => ({ ...acc, [u.id]: u }), {} as Record<string, User>), [users]);

    const handleFilterChange = (filterName: keyof typeof filters, value: string) => setFilters(prev => ({ ...prev, [filterName]: value }));

    const handleOpenProductModal = (product: Partial<Product> | null = null) => {
        if (product && product.id && soldProductIds.has(String(product.id)) && (product.stock === 0)) {
            showToast('Não é possível editar um produto que já foi vendido e está com estoque zero. Cancele a venda primeiro para retornar o produto ao estoque.', 'warning');
            return;
        }
        setEditingProduct(product ? { ...product } : {});
        setIsProductModalOpen(true);
    };
    const handleCloseProductModal = () => { setIsProductModalOpen(false); };
    const handleSaveProduct = async (productData: any) => {
        try {
            if (editingProduct && 'id' in editingProduct) {
                await updateProduct({ ...editingProduct, ...productData } as Product, user?.id, user?.name);
                showToast('Produto atualizado com sucesso!', 'success');
            } else {
                const newProductData = { ...productData };
                await addProduct(newProductData, user?.id, user?.name);
                showToast('Produto adicionado com sucesso!', 'success');
            }
            fetchData(); handleCloseProductModal();
        } catch (error: any) {
            showToast(error.message || 'Erro ao salvar produto.', 'error');
        }
    };
    const handleOpenDeleteModal = (product: Product) => {
        if (soldProductIds.has(product.id) && product.stock === 0) {
            showToast('Não é possível excluir um produto que já foi vendido e está com estoque zero. Você deve cancelar a venda primeiro para que o produto retorne ao estoque.', 'warning');
            return;
        }
        setProductToDelete(product);
        setIsDeleteModalOpen(true);
    };
    const handleDeleteConfirm = async () => {
        if (!productToDelete) return;
        try {
            await deleteProduct(productToDelete.id, user?.id, user?.name);
            showToast('Produto excluído com sucesso!', 'success');
            fetchData(); setIsDeleteModalOpen(false); setProductToDelete(null);
        } catch (error) { showToast('Erro ao excluir produto.', 'error'); }
    };
    const handleViewHistory = async (product: Product) => {
        setProductForHistory(product);
        try {
            const sales = await getProductSalesHistory(product.id);
            setProductSalesHistory(sales); setIsHistoryModalOpen(true);
        } catch (error) { showToast('Erro ao carregar histórico de vendas.', 'error'); }
    };
    const handleBulkUpdate = async (updates: { id: string; price?: number; costPrice?: number; wholesalePrice?: number }[]) => {
        try {
            await updateMultipleProducts(updates, user?.id, user?.name);
            showToast(`${updates.length} produtos atualizados com sucesso!`, 'success');
            setIsBulkUpdateModalOpen(false); fetchData();
        } catch (error) { showToast('Erro ao atualizar produtos em massa.', 'error'); }
    };

    const handleOpenStockUpdateModal = (product: Product) => {
        setProductForStockUpdate(product);
        setIsUpdateStockModalOpen(true);
    };

    const handleStockUpdateSave = async (productToUpdate: Product, newStock: number) => {
        try {
            await updateProductStock(productToUpdate.id, newStock);
            showToast('Estoque atualizado com sucesso!', 'success');
            setIsUpdateStockModalOpen(false);
            setProductForStockUpdate(null);
            fetchData();
        } catch (error: any) {
            showToast(error.message || 'Erro ao atualizar o estoque.', 'error');
        }
    };


    const getConditionTagClasses = (condition: ProductCondition) => {
        switch (condition) {
            case 'Novo': return 'bg-blue-100 text-blue-800 border border-blue-200';
            case 'Seminovo': return 'bg-amber-100 text-amber-800 border border-amber-200';
            case 'CPO': return 'bg-purple-100 text-purple-800 border border-purple-200';
            case 'Openbox': return 'bg-teal-100 text-teal-800 border border-teal-200';
            default: return 'bg-gray-100 text-gray-800 border border-gray-200';
        }
    };

    const handleAddNewSupplier = async (supplierData: Omit<Supplier, 'id'>): Promise<Supplier | null> => {
        try {
            const newSupplier = await addSupplier(supplierData);
            setSuppliers(prev => [...prev, newSupplier]);
            showToast('Fornecedor adicionado com sucesso!', 'success');
            return newSupplier;
        } catch (error) {
            showToast('Erro ao adicionar fornecedor.', 'error');
            return null;
        }
    };

    const handlePeriodChange = (period: 'hoje' | 'semana' | 'mes') => {
        setActivePeriod(period);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (period === 'hoje') {
            const todayStr = toDateValue(today);
            setStartDate(todayStr);
            setEndDate(todayStr);
        } else if (period === 'semana') {
            const firstDayOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
            const lastDayOfWeek = new Date(firstDayOfWeek);
            lastDayOfWeek.setDate(lastDayOfWeek.getDate() + 6);
            setStartDate(toDateValue(firstDayOfWeek));
            setEndDate(toDateValue(lastDayOfWeek));
        } else if (period === 'mes') {
            setStartDate(getInitialMonthStart());
            setEndDate(getInitialMonthEnd());
        }
    };

    const handleCopyLocatorId = (locatorId: string) => {
        navigator.clipboard.writeText(locatorId).then(() => {
            showToast('Localizador copiado!', 'success');
        }).catch(err => {
            showToast('Falha ao copiar.', 'error');
        });
    };

    const filteredPurchases = useMemo(() => {
        const filtered = purchases.filter(p => {
            const lowerSearch = purchaseSearchTerm.toLowerCase();
            const searchMatch = lowerSearch === '' ||
                (p.supplierName || '').toLowerCase().includes(lowerSearch) ||
                (p.displayId || '').toString().includes(lowerSearch) ||
                (p.locatorId || '').toLowerCase().includes(lowerSearch);

            const statusMatch = statusFilter === 'Todos' ||
                p.status === statusFilter ||
                p.stockStatus === statusFilter ||
                p.financialStatus === statusFilter;

            const purchaseDate = p.purchaseDate.split('T')[0];
            const dateMatch = purchaseDate >= startDate && purchaseDate <= endDate;

            return searchMatch && statusMatch && dateMatch;
        });

        return [...filtered].sort((a, b) => {
            if (purchaseSortOrder === 'newest') {
                return new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime();
            }
            return new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime();
        });
    }, [purchases, purchaseSearchTerm, statusFilter, purchaseSortOrder, startDate, endDate]);

    const handleOpenEditPurchaseModal = (purchase: PurchaseOrder) => { setPurchaseToEdit(purchase); setIsNewPurchaseModalOpen(true); };

    const handleCloseNewPurchaseModal = (refresh: boolean) => {
        setIsNewPurchaseModalOpen(false);
        setPurchaseToEdit(null);
        if (refresh) {
            fetchData();
            setActiveTab('compras');
        }
    };

    const handleCloseStockInModal = (refresh: boolean) => {
        setStockInPurchase(null);
        if (refresh) {
            fetchData();
            setActiveTab('compras');
        }
    };

    const handleDeletePurchase = async (reason: string) => {
        if (!purchaseToDelete) return;
        try {
            await deletePurchaseOrder(purchaseToDelete.id);
            showToast('Compra excluída com sucesso!', 'success');
            setPurchaseToDelete(null); fetchData();
        } catch (error: any) { showToast(error.message || 'Erro ao excluir compra.', 'error'); }
    };
    const handleFinanceToggle = async () => {
        if (!purchaseToUpdateFinance) return;
        try {
            await updatePurchaseFinancialStatus(purchaseToUpdateFinance.id);
            showToast('Status financeiro atualizado!', 'success');
            setPurchaseToUpdateFinance(null); fetchData();
        } catch (error) { showToast('Erro ao atualizar status financeiro.', 'error'); }
    };
    const handleRevertPurchase = async () => {
        if (!purchaseToRevert) return;
        try {
            await revertPurchaseLaunch(purchaseToRevert.id);
            showToast('Lançamento da compra revertido com sucesso!', 'success');
            setPurchaseToRevert(null);
            fetchData();
        } catch (error) {
            showToast('Erro ao reverter o lançamento.', 'error');
        }
    };
    const associatedProducts = useMemo(() => { if (!purchaseToView) return []; return products.filter(p => p.purchaseOrderId === purchaseToView.id); }, [products, purchaseToView]);

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

    const comprasKpi = useMemo(() => {
        const dateFiltered = purchases.filter(p => {
            const purchaseDate = p.purchaseDate.split('T')[0];
            return purchaseDate >= startDate && purchaseDate <= endDate;
        });
        return {
            count: dateFiltered.length,
            total: dateFiltered.reduce((sum, p) => sum + p.total, 0),
        }
    }, [purchases, startDate, endDate]);


    const renderEstoqueTab = () => (
        <div className="w-full space-y-6">
            <div className="bg-surface rounded-lg border border-border p-4 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                    {permissions?.canCreatePurchase && (
                        <button onClick={() => setIsNewPurchaseModalOpen(true)} className="px-4 py-2 bg-gray-800 text-white rounded-md font-semibold flex items-center gap-2 text-sm hover:bg-gray-700 h-10">
                            <PlusIcon className="h-5 w-5" /> Nova compra
                        </button>
                    )}
                    <Link to="/company?tab=parametros" className="px-3 py-2 bg-gray-200 text-secondary rounded-md hover:bg-gray-300 text-sm font-medium flex items-center gap-2"><Cog6ToothIcon className="h-5 w-5" /> Parâmetros</Link>
                    {permissions?.canEditProduct && (
                        <button onClick={() => setIsBulkUpdateModalOpen(true)} className="px-3 py-2 bg-gray-200 text-secondary rounded-md hover:bg-gray-300 text-sm font-medium flex items-center gap-2"><TagIcon className="h-5 w-5" /> Atualização de preço em massa</button>
                    )}
                    <button className="px-3 py-2 bg-gray-200 text-secondary rounded-md hover:bg-gray-300 text-sm font-medium flex items-center gap-2"><TicketIcon className="h-5 w-5" /> Etiquetas</button>
                    <div className="flex-grow"></div>
                    <p className="text-sm font-semibold text-secondary whitespace-nowrap">Total de registros: {filteredProducts.length}</p>
                </div>
                <div className="flex flex-wrap items-end gap-4 justify-between">
                    <div className="flex flex-wrap items-end gap-4 flex-grow">
                        <div>
                            <label className="block text-xs font-medium text-muted mb-1">Status</label>
                            <select value={filters.stock} onChange={e => handleFilterChange('stock', e.target.value)} className="h-10 p-2 border rounded-md text-sm bg-transparent border-border">
                                <option>Todos</option><option>Em estoque</option><option>Sem estoque</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-muted mb-1">Condição</label>
                            <select value={filters.condition} onChange={e => handleFilterChange('condition', e.target.value)} className="h-10 p-2 border rounded-md text-sm bg-transparent border-border">
                                <option value="Todos">Todos</option><option>Novo</option><option>Seminovo</option><option>CPO</option><option>Openbox</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-muted mb-1">Local</label>
                            <select value={filters.location} onChange={e => handleFilterChange('location', e.target.value)} className="h-10 p-2 border rounded-md text-sm bg-transparent border-border">
                                <option value="Todos">Todos</option><option>Loja</option><option>Caruaru</option>
                            </select>
                        </div>
                        <div className="relative flex-grow min-w-[250px]">
                            <label className="block text-xs font-medium text-muted mb-1">Buscar produto</label>
                            <input type="text" placeholder="Digite aqui para buscar" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="p-2 border rounded-md w-full bg-transparent border-border pr-8 h-10" />
                            {searchTerm && (<button onClick={() => setSearchTerm('')} className="absolute right-2 bottom-2 text-muted hover:text-primary" aria-label="Limpar busca"><XCircleIcon className="h-5 w-5" /></button>)}
                        </div>
                    </div>
                    <div className="flex flex-wrap items-end gap-4">
                        <button
                            onClick={() => setInventorySortOrder(o => o === 'newest' ? 'oldest' : 'newest')}
                            className="h-10 px-3 py-2 bg-gray-200 text-secondary rounded-md hover:bg-gray-300 flex items-center gap-2 text-sm font-medium"
                        >
                            <ArrowsUpDownIcon className="h-4 w-4" />
                            <span>{inventorySortOrder === 'newest' ? 'Mais Recentes' : 'Mais Antigos'}</span>
                        </button>
                    </div>
                </div>
            </div>
            <div className="bg-surface rounded-lg border border-border">
                {loading ? <div className="flex justify-center py-8"><SpinnerIcon /></div> : (
                    filteredProducts.length === 0 ? <p className="text-center text-muted p-6">Nenhum produto encontrado.</p> : (
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-sm text-left text-muted whitespace-nowrap">
                                <thead className="text-xs text-secondary uppercase bg-surface-secondary">
                                    <tr>
                                        <th scope="col" className="px-1 py-2 text-center">Qtd.</th>
                                        <th scope="col" className="px-1 py-2">Descrição</th>
                                        <th scope="col" className="px-1 py-2">Local</th>
                                        <th scope="col" className="px-1 py-2">Fornec.</th>
                                        <th scope="col" className="px-1 py-2">Venda</th>
                                        <th scope="col" className="px-1 py-2">ATC</th>
                                        <th scope="col" className="px-1 py-2">Custo</th>
                                        <th scope="col" className="px-1 py-2">Markup</th>
                                        <th scope="col" className="px-1 py-2 text-center">Garantia</th>
                                        <th scope="col" className="px-1 py-2 text-center">Cond.</th>
                                        <th scope="col" className="px-1 py-2 text-center">Cadastro</th>
                                        <th scope="col" className="px-1 py-2 text-center">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredProducts.map(product => {
                                        // Calculate total cost including additional repair costs
                                        const totalCost = (product.costPrice || 0) + (product.additionalCostPrice || 0);
                                        const markup = (totalCost && totalCost > 0) ? ((product.price - totalCost) / totalCost) * 100 : 0;
                                        const supplier = suppliers.find(s => s.id === product.supplierId);
                                        const supplierLabelColor = getSupplierColorClass(supplier);

                                        let stockColorClass = 'bg-gray-100 text-gray-700 border-gray-200';
                                        if (product.stock === 0) stockColorClass = 'bg-red-100 text-red-700 border-red-200';
                                        else if (product.stock >= 1) stockColorClass = 'bg-green-100 text-green-700 border-green-200';

                                        return (<tr key={product.id} className="bg-surface border-b border-border last:border-0 hover:bg-surface-secondary">
                                            <td className="px-2 py-2 text-center">
                                                <span className={`px-2 py-0.5 text-sm font-bold rounded-md border ${stockColorClass}`}>{product.stock}</span>
                                            </td>
                                            <td className="px-2 py-2 font-medium text-primary whitespace-normal max-w-[200px]">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-sm truncate" title={product.model}>{product.model}</span>
                                                    {product.origin === 'Troca' && (
                                                        <span className="flex-shrink-0 px-1.5 py-0.5 text-[9px] font-semibold rounded-full bg-pink-100 text-pink-700 border border-pink-200">
                                                            Troca
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-[10px] text-muted mt-0.5 leading-tight">
                                                    <span>SKU: {product.sku}</span>
                                                    <span className="mx-1">·</span>
                                                    <span>IMEI: {product.imei1}</span>
                                                    {product.serialNumber && (
                                                        <>
                                                            <span className="mx-1">·</span>
                                                            <span>S/N: {product.serialNumber}</span>
                                                        </>
                                                    )}
                                                    {product.condition === 'Seminovo' && product.brand === 'Apple' && (
                                                        <>
                                                            <span className="mx-1">·</span>
                                                            <span className="text-blue-600 font-bold">Saúde: {product.batteryHealth}%</span>
                                                        </>
                                                    )}
                                                    {product.variations && product.variations.length > 0 && (
                                                        <>
                                                            <span className="mx-1">·</span>
                                                            <span className="italic font-bold text-gray-700">
                                                                {product.variations.map(v => v.valueName ? `${v.gradeName}: ${v.valueName}` : v.gradeName).join(', ')}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-1 py-2 text-xs text-muted">
                                                {product.storageLocation || '-'}
                                            </td>
                                            <td className="px-1 py-2">
                                                {(product.origin === 'Troca' || (supplier && supplier.linkedCustomerId)) ? (
                                                    <span className="px-1.5 py-0.5 text-[9px] font-medium rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                                                        Cliente
                                                    </span>
                                                ) : (supplier ? (
                                                    <span className={`px-1.5 py-0.5 text-[9px] font-medium rounded-full ${supplierLabelColor}`}>
                                                        {supplier.name}
                                                    </span>
                                                ) : (product.supplier ? (
                                                    <span className={`px-1.5 py-0.5 text-[9px] font-medium rounded-full bg-gray-100 text-gray-700 border border-gray-200`}>
                                                        {product.supplier}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted">-</span>
                                                )))}
                                            </td>
                                            <td className="px-1 py-2 font-bold text-primary text-sm">{formatCurrency(product.price)}</td>
                                            <td className="px-1 py-2 text-xs font-bold text-orange-500">{formatCurrency(product.wholesalePrice || 0)}</td>
                                            <td className="px-1 py-2 text-xs text-muted">{formatCurrency(totalCost, 'N/A')}</td>
                                            <td className={`px-1 py-2 text-sm font-bold ${markup >= 0 ? 'text-success' : 'text-danger'}`}>{markup.toFixed(0)}%</td>
                                            <td className="px-2 py-2 text-center text-xs">{(product as any).warranty || (product as any).warranty_period || (product as any).garantia || '-'}</td>
                                            <td className="px-2 py-2 text-center">
                                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${getConditionTagClasses(product.condition)}`}>
                                                    {product.condition}
                                                </span>
                                            </td>
                                            <td className="px-2 py-2">
                                                <div className="flex flex-col text-[10px] text-gray-700 leading-tight items-center font-medium">
                                                    <span>{new Date(product.createdAt).toLocaleDateString('pt-BR')}</span>
                                                    <span>{new Date(product.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                                    <span className="font-bold text-gray-900 truncate max-w-[80px] mt-0.5" title={userMap[product.createdBy]?.name || product.createdByName || (product.createdBy === 'Admin User' ? 'Keiler' : product.createdBy)}>
                                                        {product.createdBy === 'Admin User' ? 'Keiler' : (userMap[product.createdBy]?.name || product.createdByName || product.createdBy || '-')}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-2 py-2">
                                                <div className="flex items-center justify-center">
                                                    <ProductActionsDropdown
                                                        permissions={permissions}
                                                        onHistory={() => handleViewHistory(product)}
                                                        onUpdateStock={() => handleOpenStockUpdateModal(product)}
                                                        onEdit={() => handleOpenProductModal(product)}
                                                        onDelete={() => handleOpenDeleteModal(product)}
                                                    />
                                                </div>
                                            </td>
                                        </tr>);
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )
                )}
            </div>
        </div>
    );

    const renderComprasTab = () => {
        const periodButtonClasses = (period: string) => `px-3 py-1 rounded-md text-sm font-medium transition-colors ${activePeriod === period ? 'bg-primary text-white' : 'hover:bg-gray-200'}`;

        return (
            <div className="space-y-4">
                {/* Filters and KPIs */}
                <div className="bg-surface p-4 rounded-lg border border-border space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            {permissions?.canCreatePurchase && (
                                <button onClick={() => setIsNewPurchaseModalOpen(true)} className="px-4 py-2 bg-gray-800 text-white rounded-md font-semibold flex items-center gap-2 text-sm hover:bg-gray-700 h-10">
                                    <PlusIcon className="h-5 w-5" /> Nova compra
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="p-2 border rounded-md bg-surface border-border text-sm h-10" />
                            <span className="text-muted">à</span>
                            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="p-2 border rounded-md bg-surface border-border text-sm h-10" />
                            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                                <button onClick={() => handlePeriodChange('hoje')} className={periodButtonClasses('hoje')}>Hoje</button>
                                <button onClick={() => handlePeriodChange('semana')} className={periodButtonClasses('semana')}>Semana</button>
                                <button onClick={() => handlePeriodChange('mes')} className={periodButtonClasses('mes')}>Mês</button>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-start gap-8 pt-4 border-t border-border">
                        <div>
                            <p className="text-sm text-muted">Qtd de compras do mês</p>
                            <div className="flex items-center gap-2 mt-1">
                                <ShoppingCartIcon className="h-5 w-5 text-muted" />
                                <p className="text-xl font-bold text-primary">{comprasKpi.count}</p>
                            </div>
                        </div>
                        <div>
                            <p className="text-sm text-muted">Total de compras do mês</p>
                            <div className="flex items-center gap-2 mt-1">
                                <CurrencyDollarIcon className="h-5 w-5 text-muted" />
                                <p className="text-xl font-bold text-primary">{formatCurrency(comprasKpi.total)}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-surface rounded-lg border border-border">
                    <div className="p-3 flex items-center gap-4">
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
                            <input
                                type="text"
                                placeholder="Digite para buscar..."
                                value={purchaseSearchTerm}
                                onChange={e => setPurchaseSearchTerm(e.target.value)}
                                className="w-full p-2 pl-3 border rounded-md bg-surface border-border text-sm pr-8 h-10"
                            />
                            {purchaseSearchTerm && <button onClick={() => setPurchaseSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-primary"><XCircleIcon className="h-5 w-5" /></button>}
                        </div>
                        <button
                            onClick={() => setPurchaseSortOrder(o => o === 'newest' ? 'oldest' : 'newest')}
                            className="h-10 px-3 py-2 bg-gray-200 text-secondary rounded-md hover:bg-gray-300 flex items-center gap-2 text-sm font-medium flex-shrink-0"
                        >
                            <ArrowsUpDownIcon className="h-4 w-4" />
                            <span>{purchaseSortOrder === 'newest' ? 'Recente' : 'Mais Antigo'}</span>
                        </button>
                    </div>

                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-secondary uppercase bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 font-medium">ID</th>
                                    <th className="px-4 py-3 font-medium">Data da compra</th>
                                    <th className="px-4 py-3 font-medium">Fornecedor</th>
                                    <th className="px-4 py-3 font-medium">Localizador no estoque</th>
                                    <th className="px-4 py-3 font-medium">Total da compra</th>
                                    <th className="px-4 py-3 font-medium">Estoque</th>
                                    <th className="px-4 py-3 font-medium">Financeiro</th>
                                    <th className="px-4 py-3 font-medium">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="text-primary">
                                {filteredPurchases.map(p => {
                                    const productIdsFromPurchase = products.filter(prod => prod.purchaseOrderId === p.id).map(prod => prod.id);
                                    const hasSoldProducts = productIdsFromPurchase.some(pid => soldProductIds.has(pid));
                                    const disabledReason = 'Não é possível alterar pois contém produtos já vendidos.';
                                    return (
                                        <tr key={p.id} className="border-t border-border hover:bg-surface-secondary">
                                            <td className="px-4 py-3 font-semibold">#{p.displayId}</td>
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-primary">{new Date(p.purchaseDate).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</div>
                                                <div className="text-xs text-muted">por {p.createdBy}</div>
                                            </td>
                                            <td className="px-4 py-3">{p.supplierName}</td>
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={() => handleCopyLocatorId(p.locatorId)}
                                                    className="text-blue-500 hover:text-blue-700 hover:underline font-mono"
                                                    title="Copiar Localizador"
                                                >
                                                    {p.locatorId}
                                                </button>
                                            </td>
                                            <td className="px-4 py-3 font-semibold">{formatCurrency(p.total)}</td>
                                            <td className="px-4 py-3"><StatusTag text={p.stockStatus} type={getStockStatusType(p.stockStatus)} /></td>
                                            <td className="px-4 py-3"><StatusTag text={p.financialStatus} type={getFinancialStatusType(p.financialStatus)} /></td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2.5">
                                                    <button onClick={() => setPurchaseToView(p)} title="Visualizar"><EyeIcon className="h-5 w-5 text-blue-500 hover:text-blue-700" /></button>
                                                    {(permissions?.canLaunchPurchase && p.stockStatus === 'Lançado') ? (
                                                        <button onClick={() => setPurchaseToRevert(p)} title={hasSoldProducts ? disabledReason : "Reverter Compra"} disabled={hasSoldProducts}><ArrowUturnLeftIcon className={`h-5 w-5 ${hasSoldProducts ? 'text-gray-300' : 'text-yellow-500 hover:text-yellow-700'}`} /></button>
                                                    ) : (permissions?.canEditPurchase &&
                                                        <button onClick={() => handleOpenEditPurchaseModal(p)} title={hasSoldProducts ? disabledReason : "Editar"} disabled={hasSoldProducts}><EditIcon className={`h-5 w-5 ${hasSoldProducts ? 'text-gray-300' : 'text-orange-400 hover:text-orange-600'}`} /></button>
                                                    )}
                                                    {permissions?.canEditPurchase && <button onClick={() => setPurchaseToUpdateFinance(p)} title="Alterar Status Financeiro"><BanknotesIcon className={`h-5 w-5 ${p.financialStatus === 'Pago' ? 'text-green-600' : 'text-gray-400 hover:text-green-600'}`} /></button>}
                                                    {permissions?.canLaunchPurchase && (
                                                        <button onClick={() => setStockInPurchase(p)} title="Lançar no Estoque" disabled={p.stockStatus === 'Lançado'}>
                                                            {p.stockStatus === 'Parcialmente Lançado' ? (
                                                                <div className="bg-indigo-500 text-white rounded-full p-0.5">
                                                                    <DocumentArrowUpIcon className="h-5 w-5" />
                                                                </div>
                                                            ) : (
                                                                <DocumentArrowUpIcon className={`h-5 w-5 ${p.stockStatus === 'Lançado' ? 'text-gray-300' : 'text-indigo-500 hover:text-indigo-700'}`} />
                                                            )}
                                                        </button>
                                                    )}
                                                    {permissions?.canDeletePurchase && <button onClick={() => setPurchaseToDelete(p)} title={hasSoldProducts ? disabledReason : "Excluir"} disabled={hasSoldProducts}><TrashIcon className={`h-5 w-5 ${hasSoldProducts ? 'text-gray-300' : 'text-red-500 hover:text-red-700'}`} /></button>}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
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
            </div>
        );
    }


    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-primary">Estoque e Compras</h1>

            <div className="inline-flex items-center gap-1 bg-surface-secondary p-1 rounded-lg">
                {availableTabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab.id ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-primary'}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {loading ? <div className="flex justify-center items-center h-full"><SpinnerIcon /></div> : (
                <>
                    {activeTab === 'estoque' && renderEstoqueTab()}
                    {activeTab === 'compras' && renderComprasTab()}
                    {availableTabs.length === 0 && <p className="text-center text-muted p-6">Você não tem permissão para acessar esta seção.</p>}
                </>
            )}

            {purchaseToView && <PurchaseOrderDetailModal purchase={purchaseToView} onClose={() => setPurchaseToView(null)} associatedProducts={associatedProducts} />}
            {isDeleteModalOpen && productToDelete && <ConfirmationModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={handleDeleteConfirm} title="Confirmar Exclusão" message={`Tem certeza que deseja excluir o produto "${productToDelete.model}"? Esta ação não pode ser desfeita.`} />}
            {isHistoryModalOpen && productForHistory && <ProductHistoryModal product={productForHistory} salesHistory={productSalesHistory} customers={customers} users={users} productMap={productMap} onClose={() => setIsHistoryModalOpen(false)} />}
            {isBulkUpdateModalOpen && <BulkPriceUpdateModal allProducts={products} onClose={() => setIsBulkUpdateModalOpen(false)} onBulkUpdate={handleBulkUpdate} />}
            {isUpdateStockModalOpen && productForStockUpdate && <UpdateStockModal product={productForStockUpdate} onClose={() => { setIsUpdateStockModalOpen(false); setProductForStockUpdate(null); }} onSave={handleStockUpdateSave} />}
            <Suspense fallback={<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"><SpinnerIcon /></div>}>
                <ProductModal isOpen={isProductModalOpen} product={editingProduct} suppliers={suppliers} brands={brands} categories={categories} productModels={productModels} grades={grades} gradeValues={gradeValues} onClose={handleCloseProductModal} onSave={handleSaveProduct} customers={customers} onAddNewSupplier={handleAddNewSupplier} />
                {isNewPurchaseModalOpen && <PurchaseOrderModal suppliers={suppliers} customers={customers} onClose={handleCloseNewPurchaseModal} purchaseOrderToEdit={purchaseToEdit} brands={brands} categories={categories} productModels={productModels} grades={grades} gradeValues={gradeValues} onAddNewSupplier={handleAddNewSupplier} />}
                {stockInPurchase && <StockInModal purchaseOrder={stockInPurchase} onClose={handleCloseStockInModal} allProducts={products} grades={grades} gradeValues={gradeValues} />}
            </Suspense>
            {purchaseToDelete && <DeleteWithReasonModal isOpen={!!purchaseToDelete} onClose={() => setPurchaseToDelete(null)} onConfirm={handleDeletePurchase} title={`Excluir Compra #${purchaseToDelete.displayId}`} message="Esta ação irá remover permanentemente a compra. Esta ação não pode ser desfeita." />}
            {purchaseToUpdateFinance && <ConfirmationModal isOpen={!!purchaseToUpdateFinance} onClose={() => setPurchaseToUpdateFinance(null)} onConfirm={handleFinanceToggle} title="Alterar Status Financeiro" message={`Deseja marcar a compra #${purchaseToUpdateFinance.displayId} como "${purchaseToUpdateFinance.financialStatus === 'Pendente' ? 'Paga' : 'Pendente'}"?`} variant="success" />}
            {purchaseToRevert && <ConfirmationModal isOpen={!!purchaseToRevert} onClose={() => setPurchaseToRevert(null)} onConfirm={handleRevertPurchase} title={`Reverter Lançamento da Compra #${purchaseToRevert.displayId}`} message="Esta ação irá remover do estoque todos os produtos associados a esta compra e retornará o status para 'Pendente'. Deseja continuar?" variant="danger" />}
        </div>
    );
};

export default Products;
