
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Customer, Sale, Product, Supplier, PurchaseOrder, PermissionSet, User } from '../types.ts';
import {
    getCustomers, addCustomer, updateCustomer, deleteCustomer, getCustomerSales, getCustomerById,
    getProducts, getSuppliers, addSupplier, updateSupplier, deleteSupplier,
    getPurchaseOrders, getSales,
    formatCurrency,
    getUsers
} from '../iStorePro/services/mockApi.ts';
import { useToast } from '../contexts/ToastContext.tsx';
import { useUser } from '../contexts/UserContext.tsx';
import ConfirmationModal from '../components/ConfirmationModal.tsx';
import CustomerModal from '../components/CustomerModal.tsx';
import SupplierHistoryModal from '../components/SupplierHistoryModal.tsx';
import { SpinnerIcon, EditIcon, TrashIcon, SearchIcon, PlusIcon, UserCircleIcon, ClockIcon, ArrowsUpDownIcon, BirthdayCakeIcon, ChevronDownIcon, ChartBarIcon, WhatsAppIcon, InstagramIcon } from '../components/icons.tsx';
import SaleDetailModal from '../components/SaleDetailModal.tsx';

// --- Customer Components ---

const PurchaseHistoryModal: React.FC<{
    customer: Customer;
    sales: Sale[];
    users: User[];
    onClose: () => void;
    productMap: Record<string, Product>;
    onViewSale: (sale: Sale) => void;
}> = ({ customer, sales, users, onClose, productMap, onViewSale }) => {
    const [activeTab, setActiveTab] = useState('purchases');

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
            <div className="bg-surface rounded-lg shadow-xl p-8 w-full max-w-3xl mx-4">
                <h2 className="text-2xl font-bold mb-6 text-primary">Histórico de {customer.name}</h2>

                {(() => {
                    const debtDetails = sales.reduce((acc, sale) => {
                        if (sale.status === 'Cancelada') return acc;
                        const pendingAmount = sale.payments
                            .filter(p => p.type === 'pending')
                            .reduce((sum, p) => sum + p.value, 0);

                        if (pendingAmount > 0) {
                            const salesperson = users.find(u => u.id === sale.salespersonId)?.name || 'Desconhecido';
                            acc.push({
                                id: sale.cashSessionDisplayId ? `${sale.cashSessionDisplayId}` : sale.id.substring(0, 8),
                                fullId: sale.id,
                                date: sale.date,
                                amount: pendingAmount,
                                salesperson
                            });
                        }
                        return acc;
                    }, [] as { id: string, fullId: string, date: string, amount: number, salesperson: string }[]);

                    const totalDebt = debtDetails.reduce((sum, d) => sum + d.amount, 0);

                    if (totalDebt > 0) {
                        return (
                            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg overflow-hidden">
                                <div className="p-4 flex items-center justify-between border-b border-red-200 bg-red-100/30">
                                    <span className="text-red-800 font-bold flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-red-600"></span>
                                        Valor em Aberto (Dívida)
                                    </span>
                                    <span className="text-xl font-black text-red-700">{formatCurrency(totalDebt)}</span>
                                </div>
                                <div className="max-h-40 overflow-y-auto custom-scrollbar bg-white/50">
                                    {debtDetails.map((debt, index) => (
                                        <div key={index} className="flex justify-between items-start p-3 border-b border-red-100 last:border-0 hover:bg-red-50 transition-colors">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-bold text-red-900 text-sm">Venda #{debt.id}</span>
                                                <span className="text-red-700 text-xs flex flex-col sm:flex-row sm:gap-2">
                                                    <span>{new Date(debt.date).toLocaleDateString('pt-BR')} às {new Date(debt.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                                    <span className="hidden sm:inline text-red-300">•</span>
                                                    <span>Vend: <span className="font-semibold">{debt.salesperson}</span></span>
                                                </span>
                                            </div>
                                            <span className="font-bold text-red-700 text-sm whitespace-nowrap">{formatCurrency(debt.amount)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    }
                    return null;
                })()}

                <div className="border-b border-border mb-4">
                    <nav className="-mb-px flex space-x-6">
                        <button onClick={() => setActiveTab('purchases')} className={`py-2 px-1 border-b-2 text-base font-bold ${activeTab === 'purchases' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-primary'}`}>Compras</button>
                        <button onClick={() => setActiveTab('tradeins')} className={`py-2 px-1 border-b-2 text-base font-bold ${activeTab === 'tradeins' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-primary'}`}>Trocas / Vendas para Loja</button>
                    </nav>
                </div>

                <div className="max-h-96 overflow-y-auto">
                    {activeTab === 'purchases' && (
                        sales.length === 0 ? <p className="text-muted">Nenhuma compra encontrada.</p> : (
                            <ul className="space-y-4">
                                {[...sales].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(sale => (
                                    <li key={sale.id} className="border border-border p-4 rounded-md bg-surface-secondary">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="flex items-center gap-4 font-semibold text-sm">
                                                    <span className="text-primary">Data: {new Date(sale.date).toLocaleString('pt-BR')}</span>
                                                    <span className='text-success'>Total: {formatCurrency(sale.total)}</span>
                                                </div>
                                                <ul className="mt-2 text-sm text-muted">
                                                    {sale.items.map((item, index) => (
                                                        <li key={index}>- {productMap[item.productId]?.model || 'Produto desconhecido'} (x{item.quantity})</li>
                                                    ))}
                                                </ul>
                                                <div className="mt-2 pt-2 border-t border-border/50 text-xs text-muted">
                                                    <span className="font-semibold">Pagamento: </span>
                                                    {sale.payments.map(p => `${p.method} (${formatCurrency(p.value)})`).join(', ')}
                                                </div>
                                            </div>
                                            <button onClick={() => onViewSale(sale)} className="px-3 py-1 bg-gray-200 text-secondary text-xs font-semibold rounded-md hover:bg-gray-300">
                                                Ver
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )
                    )}
                    {activeTab === 'tradeins' && (
                        (!customer.tradeInHistory || customer.tradeInHistory.length === 0) ? <p className="text-muted text-center py-8">Nenhuma troca/venda encontrada para este cliente.</p> : (
                            <ul className="space-y-4">
                                {[...customer.tradeInHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(tradeIn => (
                                    <li key={tradeIn.id} className="border border-border p-4 rounded-md bg-surface-secondary shadow-sm">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <span className="block font-bold text-primary text-base mb-1">{tradeIn.model}</span>
                                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                                                    <span className="flex items-center gap-1 font-medium bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">ID Venda: #{tradeIn.saleId}</span>
                                                    <span className="flex items-center gap-1">Data: {new Date(tradeIn.date).toLocaleString('pt-BR')}</span>
                                                    <span className="flex items-center gap-1">Vendedor: {tradeIn.salespersonName}</span>
                                                </div>
                                            </div>
                                            <span className='text-success font-black text-lg'>{formatCurrency(tradeIn.value)}</span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 pt-3 border-t border-border/50 text-xs">
                                            <div className="space-y-1">
                                                {tradeIn.imei1 && <p><span className="font-bold text-gray-500">IMEI 1:</span> <span className="font-mono">{tradeIn.imei1}</span></p>}
                                                {tradeIn.imei2 && <p><span className="font-bold text-gray-500">IMEI 2:</span> <span className="font-mono">{tradeIn.imei2}</span></p>}
                                            </div>
                                            <div className="space-y-1 text-right sm:text-left">
                                                {tradeIn.serialNumber && <p><span className="font-bold text-gray-500">S/N:</span> <span className="font-mono">{tradeIn.serialNumber}</span></p>}
                                                {tradeIn.batteryHealth !== undefined && tradeIn.batteryHealth !== null && (
                                                    <p><span className="font-bold text-gray-500">Saúde Bateria:</span> <span className={`font-bold ${tradeIn.batteryHealth < 80 ? 'text-red-500' : 'text-green-600'}`}>{tradeIn.batteryHealth}%</span></p>
                                                )}
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )
                    )}
                </div>
                <div className="flex justify-end mt-6">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-secondary rounded-md hover:bg-gray-300">Fechar</button>
                </div>
            </div>
        </div>
    );
};

// --- Date Helper ---
const parseBrazilianDate = (dateStr: string | undefined): Date | null => {
    if (!dateStr) return null;
    // Handle dd/mm/yyyy format
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // months are 0-indexed
        const year = parseInt(parts[2], 10);
        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
            return new Date(year, month, day);
        }
    }
    // Fallback: try ISO format
    const date = new Date(dateStr + 'T00:00:00');
    return isNaN(date.getTime()) ? null : date;
};

// --- Main Page Component ---

const isBirthdayInPeriod = (birthDateStr: string | undefined, period: 'dia' | 'semana' | 'mês'): boolean => {
    if (!birthDateStr) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const birthDate = parseBrazilianDate(birthDateStr);
    if (!birthDate) return false;

    const birthMonth = birthDate.getMonth();
    const birthDay = birthDate.getDate();

    switch (period) {
        case 'dia':
            return birthMonth === today.getMonth() && birthDay === today.getDate();

        case 'semana':
            const endOfWeek = new Date(today);
            endOfWeek.setDate(today.getDate() + 6);

            const birthdayThisYear = new Date(today.getFullYear(), birthMonth, birthDay);
            if (birthdayThisYear >= today && birthdayThisYear <= endOfWeek) {
                return true;
            }

            if (endOfWeek.getFullYear() > today.getFullYear()) {
                const birthdayNextYear = new Date(today.getFullYear() + 1, birthMonth, birthDay);
                if (birthdayNextYear >= today && birthdayNextYear <= endOfWeek) {
                    return true;
                }
            }
            return false;

        case 'mês':
            return birthMonth === today.getMonth();
    }
    return false;
};


const CustomersAndSuppliers: React.FC = () => {
    const [searchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState<'clientes' | 'fornecedores'>('clientes');
    const { showToast } = useToast();
    const { permissions, user } = useUser();

    // Common states
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEntity, setEditingEntity] = useState<Partial<Customer & Supplier> | null>(null);

    // Customer states
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
    const [customerSales, setCustomerSales] = useState<Sale[]>([]);
    const [customerForHistory, setCustomerForHistory] = useState<Customer | null>(null);
    const [productMap, setProductMap] = useState<Record<string, Product>>({});
    const [products, setProducts] = useState<Product[]>([]);
    const [customerSortOrder, setCustomerSortOrder] = useState<'newest' | 'oldest'>('newest');
    const [birthdayFilter, setBirthdayFilter] = useState<'none' | 'dia' | 'semana' | 'mês'>('none');
    const [isBirthdayDropdownOpen, setIsBirthdayDropdownOpen] = useState(false);
    const birthdayDropdownRef = useRef<HTMLDivElement>(null);
    const [rankingFilter, setRankingFilter] = useState<'none' | 'highest' | 'lowest'>('none');
    const [isRankingDropdownOpen, setIsRankingDropdownOpen] = useState(false);
    const rankingDropdownRef = useRef<HTMLDivElement>(null);
    const [allSales, setAllSales] = useState<Sale[]>([]);
    const [saleToView, setSaleToView] = useState<Sale | null>(null);

    // Supplier states
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
    const [supplierSortOrder, setSupplierSortOrder] = useState<'newest' | 'oldest'>('newest');
    const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
    const [supplierForHistory, setSupplierForHistory] = useState<Supplier | null>(null);
    const [supplierPurchases, setSupplierPurchases] = useState<PurchaseOrder[]>([]);

    // Filters logic
    const [showDebtorsOnly, setShowDebtorsOnly] = useState(false);

    // Shared data
    const [users, setUsers] = useState<User[]>([]);

    useEffect(() => {
        if (searchParams.get('filter') === 'debtors') {
            setShowDebtorsOnly(true);
            setActiveTab('clientes');
        }
    }, [searchParams]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (birthdayDropdownRef.current && !birthdayDropdownRef.current.contains(event.target as Node)) {
                setIsBirthdayDropdownOpen(false);
            }
            if (rankingDropdownRef.current && !rankingDropdownRef.current.contains(event.target as Node)) {
                setIsRankingDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchData = useCallback(async (retryCount = 0) => {
        setLoading(true);
        try {
            const [customersData, productsData, suppliersData, purchasesData, usersData] = await Promise.all([
                getCustomers(), getProducts(), getSuppliers(), getPurchaseOrders(), getUsers()
            ]);
            setCustomers(customersData);
            setSuppliers(suppliersData);
            setProductMap(productsData.reduce((acc, p) => ({ ...acc, [p.id]: p }), {}));
            setProducts(productsData);
            setPurchases(purchasesData);
            setUsers(usersData);

            // Fetch sales separately so it doesn't block customers from loading
            try {
                const salesData = await getSales();
                setAllSales(salesData);
            } catch (salesError) {
                console.error('Error loading sales (non-critical):', salesError);
                setAllSales([]);
            }
        } catch (error) {
            console.error('Customers: Error loading data:', error);

            // Auto-retry once after short delay (handles reconnection issues after idle)
            if (retryCount < 1) {
                console.log('Customers: Tentando reconectar automaticamente...');
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
    }, [fetchData]);

    const availableTabs = useMemo(() => {
        const tabs = [];
        if (permissions?.canAccessClientes) {
            tabs.push({ id: 'clientes', label: 'Clientes' });
        }
        if (permissions?.canAccessFornecedores) {
            tabs.push({ id: 'fornecedores', label: 'Fornecedores' });
        }
        return tabs;
    }, [permissions]);

    useEffect(() => {
        if (availableTabs.length > 0 && !availableTabs.find(t => t.id === activeTab)) {
            setActiveTab(availableTabs[0].id as 'clientes' | 'fornecedores');
        }
    }, [availableTabs, activeTab]);

    const handleOpenModal = (entity: Partial<Customer & Supplier> | null = null) => {
        setEditingEntity(entity);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingEntity(null);
    };

    const [isSaving, setIsSaving] = useState(false);

    const handleSaveEntity = async (entityData: any, entityType: 'Cliente' | 'Fornecedor' | 'Ambos', personType: 'Pessoa Física' | 'Pessoa Jurídica') => {
        if (isSaving) return; // Prevent duplicate calls
        setIsSaving(true);
        console.log("handleSaveEntity called with:", entityData, entityType, personType);
        try {
            const isEditing = !!entityData.id;

            if (entityType === 'Cliente' || entityType === 'Ambos') {
                const customerPayload: any = {
                    name: entityData.name,
                    email: entityData.email,
                    phone: entityData.phone,
                    address: entityData.address,
                    avatarUrl: entityData.avatarUrl,
                    instagram: entityData.instagram,
                };
                if (personType === 'Pessoa Física') {
                    customerPayload.cpf = entityData.cpf;
                    customerPayload.rg = entityData.rg;
                    customerPayload.birthDate = entityData.birthDate;
                }

                if (isEditing && activeTab === 'clientes') {
                    await updateCustomer({ ...customerPayload, id: entityData.id });
                } else {
                    await addCustomer(customerPayload);
                }
            }

            if (entityType === 'Fornecedor' || entityType === 'Ambos') {
                const supplierPayload: any = {
                    name: entityData.name,
                    contactPerson: entityData.name,
                    email: entityData.email,
                    phone: entityData.phone,
                    avatarUrl: entityData.avatarUrl,
                    instagram: entityData.instagram,
                };
                if (personType === 'Pessoa Jurídica') {
                    supplierPayload.cnpj = entityData.cnpj;
                }

                if (isEditing && activeTab === 'fornecedores') {
                    await updateSupplier({ ...supplierPayload, id: entityData.id });
                } else {
                    await addSupplier(supplierPayload);
                }
            }

            showToast('Dados salvos com sucesso!', 'success');
            fetchData();
            handleCloseModal();
        } catch (error: any) {
            console.error("Erro ao salvar entidade:", error);
            showToast(error.message || 'Erro ao salvar.', 'error');
        } finally {
            setIsSaving(false);
        }
    };


    // --- Customer Logic ---
    const filteredCustomers = useMemo(() => {
        let filtered = customers.filter(c => (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || c.email?.toLowerCase().includes(searchTerm.toLowerCase()));

        if (birthdayFilter !== 'none') {
            filtered = filtered.filter(c => isBirthdayInPeriod(c.birthDate, birthdayFilter));
        }

        // Compute totals for ranking if needed, or always to be ready
        const customerTotals = new Map<string, number>();
        const customerDebts = new Map<string, number>();

        allSales.forEach(sale => {
            if (sale.status !== 'Cancelada') {
                const current = customerTotals.get(sale.customerId) || 0;
                customerTotals.set(sale.customerId, current + sale.total);

                const debt = sale.payments.filter(p => p.type === 'pending').reduce((sum, p) => sum + p.value, 0);
                if (debt > 0) {
                    const currentDebt = customerDebts.get(sale.customerId) || 0;
                    customerDebts.set(sale.customerId, currentDebt + debt);
                }
            }
        });

        const customersWithStats = filtered.map(c => ({
            ...c,
            totalPurchases: customerTotals.get(c.id) || 0,
            debt: customerDebts.get(c.id) || 0
        }));

        let result = customersWithStats;
        if (showDebtorsOnly) {
            result = result.filter(c => c.debt > 0);
        }

        return result.sort((a, b) => {
            if (rankingFilter === 'highest') {
                return b.totalPurchases - a.totalPurchases;
            }
            if (rankingFilter === 'lowest') {
                return a.totalPurchases - b.totalPurchases;
            }

            if (customerSortOrder === 'newest') {
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            }
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });
    }, [customers, searchTerm, customerSortOrder, birthdayFilter, rankingFilter, allSales, showDebtorsOnly]);

    const handleDeleteCustomerConfirm = async () => {
        if (!customerToDelete) return;
        try {
            await deleteCustomer(customerToDelete.id, user?.id, user?.name);
            showToast('Cliente excluído com sucesso!', 'success');
            fetchData(); setCustomerToDelete(null);
        } catch (error) { showToast('Erro ao excluir cliente.', 'error'); }
    };
    const handleViewHistory = async (customer: Customer) => {
        // Fetch fresh customer data directly from DB (no cache) to ensure tradeInHistory is up to date
        const freshCustomer = await getCustomerById(customer.id);

        const sales = await getCustomerSales(customer.id);
        setCustomerSales(sales);
        setCustomerForHistory(freshCustomer || customer);
        setIsHistoryOpen(true);
    }

    // --- Supplier Logic ---
    const filteredSuppliers = useMemo(() => {
        const filtered = suppliers.filter(s => (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || s.cnpj?.toLowerCase().includes(searchTerm.toLowerCase()));
        return filtered.sort((a, b) => {
            const dateA = new Date(a.createdAt || (a as any).created_at || 0).getTime();
            const dateB = new Date(b.createdAt || (b as any).created_at || 0).getTime();
            return supplierSortOrder === 'newest' ? dateB - dateA : dateA - dateB;
        });
    }, [suppliers, searchTerm, supplierSortOrder]);

    const handleDeleteSupplierConfirm = async () => {
        if (!supplierToDelete) return;
        try {
            await deleteSupplier(supplierToDelete.id, user?.id, user?.name);
            showToast('Fornecedor excluído com sucesso!', 'success');
            fetchData(); setSupplierToDelete(null);
        } catch (error) { showToast('Erro ao excluir fornecedor.', 'error'); }
    };
    const handleViewSupplierHistory = (supplier: Supplier) => {
        const history = purchases.filter(p => p.supplierId === supplier.id);
        setSupplierPurchases(history);
        setSupplierForHistory(supplier);
    };

    const renderCustomersTab = () => (
        <div className="bg-surface rounded-lg border border-border p-6">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="relative flex-grow sm:flex-grow-0">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted"><SearchIcon /></span>
                        <input type="text" placeholder="Buscar por nome ou email..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 p-2 border rounded-md w-full sm:w-80 bg-transparent border-border focus:ring-primary focus:border-primary h-10" />
                    </div>
                    <span className="bg-gray-100 text-gray-700 px-3 py-2 rounded-md text-sm font-medium border border-gray-200">
                        Total: {customers.length}
                    </span>
                    <button
                        onClick={() => setCustomerSortOrder(o => o === 'newest' ? 'oldest' : 'newest')}
                        className="h-10 px-3 py-2 bg-gray-200 text-secondary rounded-md hover:bg-gray-300 flex items-center gap-2 text-sm font-medium"
                    >
                        <ArrowsUpDownIcon className="h-4 w-4" />
                        <span>{customerSortOrder === 'newest' ? 'Mais Recentes' : 'Mais Antigos'}</span>
                    </button>
                    <div className="relative" ref={birthdayDropdownRef}>
                        <button
                            onClick={() => setIsBirthdayDropdownOpen(prev => !prev)}
                            className={`h-10 px-3 py-2 rounded-md flex items-center gap-2 text-sm font-medium transition-colors ${birthdayFilter !== 'none' ? 'bg-accent text-white' : 'bg-gray-200 text-secondary hover:bg-gray-300'}`}
                        >
                            <BirthdayCakeIcon className="h-4 w-4" />
                            <span>Aniversariantes</span>
                            <ChevronDownIcon className={`h-4 w-4 transition-transform ${isBirthdayDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isBirthdayDropdownOpen && (
                            <div className="absolute top-full right-0 mt-2 w-40 bg-surface rounded-md shadow-lg border border-border z-10">
                                <button onClick={() => { setBirthdayFilter('dia'); setIsBirthdayDropdownOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-surface-secondary">Do Dia</button>
                                <button onClick={() => { setBirthdayFilter('semana'); setIsBirthdayDropdownOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-surface-secondary">Da Semana</button>
                                <button onClick={() => { setBirthdayFilter('mês'); setIsBirthdayDropdownOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-surface-secondary">Do Mês</button>
                                <div className="border-t border-border my-1"></div>
                                <button onClick={() => { setBirthdayFilter('none'); setIsBirthdayDropdownOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-danger hover:bg-surface-secondary">Limpar Filtro</button>
                            </div>
                        )}
                    </div>
                    <div className="relative" ref={rankingDropdownRef}>
                        <button
                            onClick={() => setIsRankingDropdownOpen(prev => !prev)}
                            className={`h-10 px-3 py-2 rounded-md flex items-center gap-2 text-sm font-medium transition-colors ${rankingFilter !== 'none' ? 'bg-accent text-white' : 'bg-gray-200 text-secondary hover:bg-gray-300'}`}
                        >
                            <ChartBarIcon className="h-4 w-4" />
                            <span>Ranking</span>
                            <ChevronDownIcon className={`h-4 w-4 transition-transform ${isRankingDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isRankingDropdownOpen && (
                            <div className="absolute top-full right-0 mt-2 w-48 bg-surface rounded-md shadow-lg border border-border z-10">
                                <button onClick={() => { setRankingFilter('highest'); setIsRankingDropdownOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-surface-secondary">Mais Compram</button>
                                <button onClick={() => { setRankingFilter('lowest'); setIsRankingDropdownOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-surface-secondary">Menos Compram</button>
                                <div className="border-t border-border my-1"></div>
                                <button onClick={() => { setRankingFilter('none'); setIsRankingDropdownOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-danger hover:bg-surface-secondary">Limpar Ranking</button>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => setShowDebtorsOnly(prev => !prev)}
                        className={`h-10 px-3 py-2 rounded-md flex items-center gap-2 text-sm font-medium transition-colors ${showDebtorsOnly ? 'bg-red-600 text-white shadow-md' : 'bg-gray-200 text-secondary hover:bg-gray-300'}`}
                        title="Mostrar apenas clientes com dívidas em aberto"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Devedores</span>
                    </button>
                </div>
                {permissions?.canAccessClientes && (
                    <button onClick={() => handleOpenModal()} className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 w-full sm:w-auto flex items-center justify-center gap-2 h-10"><PlusIcon className="h-5 w-5" /> Adicionar Cliente</button>
                )}
            </div>
            {loading ? <div className="flex justify-center py-8"><SpinnerIcon /></div> : (
                filteredCustomers.length === 0 ? <p className="text-center text-muted py-8">Nenhum cliente encontrado.</p> : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-muted">
                            <thead className="text-xs text-secondary uppercase bg-surface-secondary">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Nome</th>
                                    <th scope="col" className="px-6 py-3">Email</th>
                                    <th scope="col" className="px-6 py-3">Telefone</th>
                                    <th scope="col" className="px-6 py-3">Instagram</th>
                                    <th scope="col" className="px-6 py-3">Aniversário</th>
                                    <th scope="col" className="px-6 py-3 text-right">Total Comprado</th>
                                    <th scope="col" className="px-6 py-3 text-right">Em Aberto</th>
                                    <th scope="col" className="px-6 py-3">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCustomers.map(customer => (
                                    <tr key={customer.id} className="bg-surface border-b border-border hover:bg-surface-secondary">
                                        <td className="px-6 py-4 font-medium text-primary">
                                            <div className="flex items-center gap-3">
                                                {customer.avatarUrl ? <img src={customer.avatarUrl} alt={customer.name} className="h-10 w-10 rounded-full object-cover" /> : <UserCircleIcon className="h-10 w-10 text-gray-300" />}
                                                <div className="flex items-center gap-2">
                                                    <span>{customer.name}</span>
                                                    {customer.isBlocked && (
                                                        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-800">Bloqueado</span>
                                                    )}
                                                    {customer.customTag && (
                                                        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">{customer.customTag}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">{customer.email}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span>{customer.phone}</span>
                                                {customer.phone && (
                                                    <a href={`https://wa.me/55${customer.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity" title="Abrir WhatsApp">
                                                        <WhatsAppIcon />
                                                    </a>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span>{customer.instagram || '-'}</span>
                                                {customer.instagram && (
                                                    <a href={`https://www.instagram.com/${customer.instagram.replace('@', '').trim()}`} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity" title="Abrir Instagram">
                                                        <InstagramIcon />
                                                    </a>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">{(() => { const d = parseBrazilianDate(customer.birthDate); return d ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : 'N/A'; })()}</td>
                                        <td className="px-6 py-4 text-right font-semibold text-success">
                                            {(customer as any).totalPurchases > 0 ? formatCurrency((customer as any).totalPurchases) : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-red-600">
                                            {(customer as any).debt > 0 ? formatCurrency((customer as any).debt) : '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center space-x-4">
                                                <button onClick={() => handleViewHistory(customer)} className="text-secondary hover:text-primary" title="Ver Histórico"><ClockIcon className="w-5 h-5" /></button>
                                                {permissions?.canAccessClientes && (
                                                    <>
                                                        <button onClick={() => handleOpenModal(customer)} className="text-secondary hover:text-primary"><EditIcon /></button>
                                                        <button onClick={() => setCustomerToDelete(customer)} className="text-secondary hover:text-danger"><TrashIcon /></button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            )}
        </div>
    );

    const renderSuppliersTab = () => (
        <div className="bg-surface rounded-lg border border-border p-6">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="relative flex-grow sm:flex-grow-0">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted"><SearchIcon /></span>
                        <input type="text" placeholder="Buscar por nome ou CNPJ..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 p-2 border rounded-md w-full sm:w-80 bg-transparent border-border focus:ring-primary focus:border-primary" />
                    </div>
                    <span className="bg-gray-100 text-gray-700 px-3 py-2 rounded-md text-sm font-medium border border-gray-200">
                        Total: {suppliers.length}
                    </span>
                    <button
                        onClick={() => setSupplierSortOrder(o => o === 'newest' ? 'oldest' : 'newest')}
                        className="h-10 px-3 py-2 bg-gray-200 text-secondary rounded-md hover:bg-gray-300 flex items-center gap-2 text-sm font-medium"
                    >
                        <ArrowsUpDownIcon className="h-4 w-4" />
                        <span>{supplierSortOrder === 'newest' ? 'Mais Recentes' : 'Mais Antigos'}</span>
                    </button>
                </div>
                {permissions?.canAccessFornecedores && (
                    <button onClick={() => handleOpenModal()} className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 w-full sm:w-auto flex items-center justify-center gap-2"><PlusIcon className="h-5 w-5" />Adicionar Fornecedor</button>
                )}
            </div>
            {loading ? <div className="flex justify-center py-8"><SpinnerIcon /></div> : (
                filteredSuppliers.length === 0 ? <p className="text-center text-muted py-8">Nenhum fornecedor encontrado.</p> : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-muted">
                            <thead className="text-xs text-secondary uppercase bg-surface-secondary">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Fornecedor</th>
                                    <th scope="col" className="px-6 py-3">Tipo</th>
                                    <th scope="col" className="px-6 py-3">Contato</th>
                                    <th scope="col" className="px-6 py-3">CNPJ</th>
                                    <th scope="col" className="px-6 py-3">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSuppliers.map(supplier => (
                                    <tr key={supplier.id} className="bg-surface border-b border-border hover:bg-surface-secondary">
                                        <td className="px-6 py-4 font-medium text-primary">
                                            <div className="flex items-center gap-3">
                                                {supplier.avatarUrl ? <img src={supplier.avatarUrl} alt={supplier.name} className="h-10 w-10 rounded-full object-cover" /> : <UserCircleIcon className="h-10 w-10 text-gray-300" />}
                                                <span>{supplier.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {customers.some(c => c.name.trim().toLowerCase() === supplier.name.trim().toLowerCase()) ? (
                                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">Cliente & Fornecedor</span>
                                            ) : (
                                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 border border-slate-200">Fornecedor</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span>{supplier.phone}</span>
                                                {supplier.phone && (
                                                    <a href={`https://wa.me/55${supplier.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:text-green-700" title="WhatsApp">
                                                        <WhatsAppIcon className="h-4 w-4" />
                                                    </a>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">{supplier.cnpj}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center space-x-4">
                                                <button onClick={() => handleViewSupplierHistory(supplier)} className="text-secondary hover:text-primary" title="Ver Histórico"><ClockIcon className="w-5 h-5" /></button>
                                                {permissions?.canAccessFornecedores && (
                                                    <>
                                                        <button onClick={() => handleOpenModal(supplier)} className="text-secondary hover:text-primary"><EditIcon /></button>
                                                        <button onClick={() => setSupplierToDelete(supplier)} className="text-secondary hover:text-danger"><TrashIcon /></button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            )}
        </div>
    );


    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-primary">Clientes e Fornecedores</h1>

            <div className="inline-flex items-center gap-1 bg-surface-secondary p-1 rounded-lg">
                {availableTabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => { setActiveTab(tab.id as any); setSearchTerm(''); }}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab.id ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-primary'}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {loading ? <div className="flex justify-center items-center h-full"><SpinnerIcon /></div> : (
                <>
                    {activeTab === 'clientes' && renderCustomersTab()}
                    {activeTab === 'fornecedores' && renderSuppliersTab()}
                    {availableTabs.length === 0 && <p className="text-center text-muted p-6">Você não tem permissão para acessar esta seção.</p>}
                </>
            )}

            {isModalOpen && <CustomerModal
                entity={editingEntity}
                initialType={activeTab === 'clientes' ? 'Cliente' : 'Fornecedor'}
                onClose={handleCloseModal}
                onSave={handleSaveEntity}
                isSaving={isSaving}
            />}
            {isHistoryOpen && customerForHistory && <PurchaseHistoryModal customer={customerForHistory} sales={customerSales} users={users} onClose={() => { setIsHistoryOpen(false); setCustomerForHistory(null); }} productMap={productMap} onViewSale={setSaleToView} />}
            <ConfirmationModal isOpen={!!customerToDelete} onClose={() => setCustomerToDelete(null)} onConfirm={handleDeleteCustomerConfirm} title="Confirmar Exclusão" message={`Tem certeza que deseja excluir o cliente "${customerToDelete?.name}"? Esta ação não pode ser desfeita.`} />

            {supplierForHistory && <SupplierHistoryModal supplier={supplierForHistory} purchases={supplierPurchases} users={users} products={products} onClose={() => setSupplierForHistory(null)} />}
            <ConfirmationModal isOpen={!!supplierToDelete} onClose={() => setSupplierToDelete(null)} onConfirm={handleDeleteSupplierConfirm} title="Confirmar Exclusão" message={`Tem certeza que deseja excluir o fornecedor "${supplierToDelete?.name}"?`} />
            {saleToView && <SaleDetailModal sale={saleToView} productMap={productMap} customers={customers} users={users} onClose={() => setSaleToView(null)} />}
        </div>
    );
};

export default CustomersAndSuppliers;
