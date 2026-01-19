
import React, { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from 'react';
import { Sale, Product, Customer, User, SaleItem, PermissionProfile, Brand, Category, ProductModel, Grade, GradeValue, Supplier, ReceiptTermParameter, PermissionSet } from '../types.ts';
import { getSales, getProducts, getCustomers, getUsers, addCustomer, addProduct, formatCurrency, cancelSale, getPermissionProfiles, getBrands, getCategories, getProductModels, getGrades, getGradeValues, getSuppliers, getReceiptTerms, getPaymentMethods } from '../iStorePro/services/mockApi.ts';
import { useToast } from '../contexts/ToastContext.tsx';
import { useUser } from '../contexts/UserContext.tsx';
import { SpinnerIcon, EllipsisVerticalIcon, CalendarDaysIcon, ChevronDownIcon, CloseIcon, PlusIcon, TrashIcon, SearchIcon, MinusIcon, EyeIcon, EditIcon, PrinterIcon, XCircleIcon, DocumentTextIcon, TicketIcon, ChevronLeftIcon, ChevronRightIcon, WhatsAppIcon } from '../components/icons.tsx';
import CardRateSimulatorModal from '../components/CardRateSimulatorModal.tsx';
import SaleDetailModal from '../components/SaleDetailModal.tsx';
import DeleteWithReasonModal from '../components/DeleteWithReasonModal.tsx';
import SaleReceiptModal from '../components/SaleReceiptModal.tsx';

// Lazy load heavy modal component
const NewSaleModal = lazy(() => import('../components/NewSaleModal.tsx'));


// --- Helper Functions ---
const getLocalISODateString = (date: Date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getStartDateForPeriod = (period: 'hoje' | '7dias' | '15dias' | '30dias'): string => {
    const today = new Date();
    switch (period) {
        case 'hoje':
            return getLocalISODateString(today);
        case '7dias':
            today.setDate(today.getDate() - 6); // Includes today
            return getLocalISODateString(today);
        case '15dias':
            today.setDate(today.getDate() - 14);
            return getLocalISODateString(today);
        case '30dias':
        default:
            today.setDate(today.getDate() - 29);
            return getLocalISODateString(today);
    }
};


// --- Sub-components ---

const KpiCard: React.FC<{ title: string; value: string; bgColor: string; textColor?: string }> = React.memo(({ title, value, bgColor, textColor = 'text-primary' }) => (
    <div className={`p-4 rounded-lg ${bgColor} ${textColor}`}>
        <h3 className="text-sm font-medium opacity-80">{title}</h3>
        <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
));

const SaleActionsDropdown: React.FC<{ onEdit: () => void; onView: () => void; onReprint: () => void; onCancel: () => void; permissions: PermissionSet | null }> = React.memo(({ onEdit, onView, onReprint, onCancel, permissions }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [style, setStyle] = useState<React.CSSProperties>({});

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isOpen) {
            setIsOpen(false);
        } else {
            if (!buttonRef.current) return;
            const rect = buttonRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const menuHeight = 160; // Estimated height for 4 items

            const newStyle: React.CSSProperties = {
                position: 'fixed',
                width: '12rem', // w-48
                zIndex: 50,
            };

            newStyle.right = window.innerWidth - rect.right;

            if (spaceBelow < menuHeight && rect.top > menuHeight) {
                // Open upwards
                newStyle.bottom = window.innerHeight - rect.top;
            } else {
                // Open downwards
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

    const createHandler = (fn: () => void) => (e: React.MouseEvent) => {
        e.stopPropagation();
        fn();
        setIsOpen(false);
    };

    const menuItemClasses = "w-full text-left flex items-center gap-3 px-4 py-2 text-sm";

    return (
        <div className="relative">
            <button ref={buttonRef} onClick={handleToggle} className="p-1 rounded-full hover:bg-surface-secondary text-muted"><EllipsisVerticalIcon className="h-5 w-5" /></button>
            {isOpen && (
                <div ref={dropdownRef} style={style} className="rounded-md shadow-lg bg-surface ring-1 ring-black ring-opacity-5">
                    <div className="py-1">
                        <button onClick={createHandler(onView)} className={`${menuItemClasses} text-secondary hover:bg-surface-secondary`}><EyeIcon className="h-4 w-4" /> Visualizar</button>
                        <button onClick={createHandler(onEdit)} className={`${menuItemClasses} text-secondary hover:bg-surface-secondary`}><EditIcon className="h-4 w-4" /> Editar</button>
                        <button onClick={createHandler(onReprint)} className={`${menuItemClasses} text-secondary hover:bg-surface-secondary`}><PrinterIcon className="h-4 w-4" /> Reimprimir</button>
                        {permissions?.canCancelSale && (
                            <button onClick={createHandler(onCancel)} className={`${menuItemClasses} text-danger hover:bg-danger-light`}><XCircleIcon className="h-4 w-4" /> Cancelar</button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
});


// --- Main Page Component ---

const Vendas: React.FC = () => {
    const [sales, setSales] = useState<Sale[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [permissionProfiles, setPermissionProfiles] = useState<PermissionProfile[]>([]);
    const [brands, setBrands] = useState<Brand[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [productModels, setProductModels] = useState<ProductModel[]>([]);
    const [grades, setGrades] = useState<Grade[]>([]);
    const [gradeValues, setGradeValues] = useState<GradeValue[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [receiptTerms, setReceiptTerms] = useState<ReceiptTermParameter[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
    const [saleToView, setSaleToView] = useState<Sale | null>(null);
    const [saleToEdit, setSaleToEdit] = useState<Sale | null>(null);
    const [saleToCancel, setSaleToCancel] = useState<Sale | null>(null);
    const [saleToReprint, setSaleToReprint] = useState<Sale | null>(null);
    const [isPrintChoiceOpen, setIsPrintChoiceOpen] = useState(false);
    const [receiptModalFormat, setReceiptModalFormat] = useState<'A4' | 'thermal' | null>(null);


    const [startDate, setStartDate] = useState(getStartDateForPeriod('30dias'));
    const [endDate, setEndDate] = useState(getLocalISODateString(new Date()));
    const [activePeriod, setActivePeriod] = useState<'hoje' | '7dias' | '15dias' | '30dias' | 'personalizado'>('30dias');
    const [sellerFilter, setSellerFilter] = useState('todos');
    const [statusFilter, setStatusFilter] = useState('todos');
    const [customerSearch, setCustomerSearch] = useState('');

    const [productMap, setProductMap] = useState<Record<string, Product>>({});
    const [customerMap, setCustomerMap] = useState<Record<string, Customer>>({});
    const [userMap, setUserMap] = useState<Record<string, User>>({});

    const { showToast } = useToast();
    const { permissions, user } = useUser();

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const SALES_PER_PAGE = 10;

    const [longLoading, setLongLoading] = useState(false);

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        if (loading) {
            setLongLoading(false);
            timer = setTimeout(() => setLongLoading(true), 5000);
        } else {
            setLongLoading(false);
        }
        return () => clearTimeout(timer);
    }, [loading]);

    const showToastRef = useRef(showToast);
    useEffect(() => { showToastRef.current = showToast; }, [showToast]);

    const fetchData = useCallback(async (retryCount = 0) => {
        console.log('Vendas: Iniciando carregamento de dados...');
        setLoading(true);
        setError(null);

        // Timeout protection (increased to 30s for slow connections/reconnection after idle)
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Tempo limite excedido. Tente novamente.')), 30000)
        );

        try {
            // Stage 1: Auxiliary Metadata (Fast, Light)
            const stage1Promise = Promise.all([
                getPermissionProfiles(),
                getBrands(),
                getCategories(),
                getProductModels(),
                getGrades(),
                getGradeValues(),
                getReceiptTerms(),
                getPaymentMethods()
            ]);

            const [
                profilesData,
                brandsData,
                categoriesData,
                modelsData,
                gradesData,
                gradeValuesData,
                receiptTermsData,
                paymentMethodsData
            ] = await Promise.race([stage1Promise, timeoutPromise]) as any;

            // Stage 2: Core Data (Heavy) - Loaded only after metadata to reduce network contention
            const stage2Promise = Promise.all([
                getSales(),
                getProducts(),
                getCustomers(),
                getUsers(),
                getSuppliers()
            ]);

            const [
                salesData,
                productsData,
                customersData,
                usersData,
                suppliersData
            ] = await Promise.race([stage2Promise, timeoutPromise]) as any;

            console.log(`Vendas: Dados carregados. ${salesData.length} vendas encontradas.`);

            const sortedSales = [...salesData].sort((a, b) => {
                const dateA = a.date ? new Date(a.date).getTime() : 0;
                const dateB = b.date ? new Date(b.date).getTime() : 0;
                return dateB - dateA;
            });
            setSales(sortedSales);
            setProducts(productsData);
            setCustomers(customersData);
            setUsers(usersData);
            setPermissionProfiles(profilesData);
            setBrands(brandsData);
            setCategories(categoriesData);
            setProductModels(modelsData);
            setGrades(gradesData || []);
            setGradeValues(gradeValuesData);
            setSuppliers(suppliersData);
            setReceiptTerms(receiptTermsData);
            setPaymentMethods((paymentMethodsData || []).filter((m: any) => m.name && !m.name.toLowerCase().includes('pagseguro')));

            const pMap: Record<string, Product> = {};
            productsData.forEach((p: Product) => { pMap[p.id] = p; });
            setProductMap(pMap);

            const cMap: Record<string, Customer> = {};
            customersData.forEach((c: Customer) => { cMap[c.id] = c; });
            setCustomerMap(cMap);

            const uMap: Record<string, User> = {};
            usersData.forEach((u: User) => { uMap[u.id] = u; });
            setUserMap(uMap);

            console.log('Vendas: Mapas de dados gerados com sucesso.');

        } catch (error: any) {
            console.error('Vendas: Erro ao carregar dados:', error);

            // Auto-retry once after short delay (handles reconnection issues after idle)
            if (retryCount < 1) {
                console.log('Vendas: Tentando reconectar automaticamente...');
                setTimeout(() => fetchData(retryCount + 1), 2000);
                return;
            }

            const msg = error.message || 'Erro ao carregar dados de vendas.';
            setError(msg);
            showToastRef.current(msg, 'error');
        } finally {
            console.log('Vendas: Finalizando estado de loading.');
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();

        const channel = new BroadcastChannel('app_cache_sync');
        channel.onmessage = (event) => {
            if (event.data && event.data.type === 'CLEAR_CACHE') {
                const keys = event.data.keys;
                if (keys.includes('sales')) {
                    fetchData();
                }
            }
        };

        return () => {
            channel.close();
        };
    }, [fetchData]);

    // Auto-refresh when tab becomes visible again to prevent stale data/loading hang
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                console.log('Vendas: Aba visível novamente. Recarregando dados...');
                fetchData();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [fetchData]);

    const handlePeriodChange = useCallback((period: 'hoje' | '7dias' | '15dias' | '30dias') => {
        setActivePeriod(period);
        setStartDate(getStartDateForPeriod(period));
        setEndDate(getLocalISODateString(new Date()));
    }, []);

    const handleClearFilter = useCallback(() => {
        handlePeriodChange('30dias');
        setSellerFilter('todos');
        setStatusFilter('todos');
        setCustomerSearch('');
    }, [handlePeriodChange]);

    const handleDateInputChange = useCallback((setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setter(e.target.value);
        setActivePeriod('personalizado'); // Custom range
    }, []);

    const filteredSales = useMemo(() => {
        return sales.filter(sale => {
            const saleDate = new Date(sale.date);

            // By appending time, we ensure the date string is parsed in local time, not UTC.
            // This avoids timezone issues where '2025-10-20' could be interpreted as the end of '2025-10-19'.
            const start = new Date(startDate + 'T00:00:00');
            const end = new Date(endDate + 'T23:59:59.999');

            const dateMatch = saleDate >= start && saleDate <= end;
            const sellerMatch = sellerFilter === 'todos' || sale.salespersonId === sellerFilter;

            let statusMatch = true;
            if (statusFilter === 'Promissoria') {
                statusMatch = sale.payments.some(p => p.type === 'pending');
            } else if (statusFilter === 'PDV') {
                // Filter PDV only if it has a linked cash session (matches visual representation)
                statusMatch = sale.origin === 'PDV' && (!!sale.cashSessionDisplayId || !!sale.cashSessionId);
            } else if (statusFilter !== 'todos') {
                statusMatch = sale.status === statusFilter;
            }

            const customerName = customerMap[sale.customerId]?.name || '';

            // Normalize search term: remove # and spaces
            const normalizedSearch = customerSearch.toLowerCase().trim().replace(/^#/, '');
            const saleIdLower = sale.id.toLowerCase();

            // Check if search matches sale ID (supports: "ID-8", "8", "#ID-8")
            const saleIdMatch = normalizedSearch !== '' && (
                saleIdLower.includes(normalizedSearch) ||
                saleIdLower === `id-${normalizedSearch}` ||
                sale.id === normalizedSearch
            );

            const customerMatch = customerSearch === '' || customerName.toLowerCase().includes(normalizedSearch) || saleIdMatch;

            // Se o filtro for Promissoria, queremos ver todas, inclusive as canceladas que geraram promissoria? 
            // Geralmente cancelada anula a dívida, então talvez devêssemos ignorar canceladas se o filtro for Promissoria?
            // O padrão atual mostra canceladas se statusFilter == 'Cancelada'.
            // Vou assumir que se filtrar por Promissoria, queremos ver as ativas.
            if (statusFilter === 'Promissoria') {
                statusMatch = statusMatch && sale.status !== 'Cancelada';
            }

            return dateMatch && sellerMatch && statusMatch && customerMatch;
        });
    }, [sales, startDate, endDate, sellerFilter, statusFilter, customerSearch, customerMap]);

    // Reset page number when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [startDate, endDate, sellerFilter, statusFilter, customerSearch]);

    // Pagination Logic
    const pageCount = Math.ceil(filteredSales.length / SALES_PER_PAGE);
    const currentSales = filteredSales.slice((currentPage - 1) * SALES_PER_PAGE, currentPage * SALES_PER_PAGE);
    const paginate = (pageNumber: number) => {
        if (pageNumber > 0 && pageNumber <= pageCount) {
            setCurrentPage(pageNumber);
        }
    };


    const sellerUsers = useMemo(() => {
        const sellerProfileIds = new Set(
            permissionProfiles
                .filter(p => p.permissions.canCreateSale)
                .map(p => p.id)
        );
        return users.filter(u => sellerProfileIds.has(u.permissionProfileId));
    }, [users, permissionProfiles]);

    const kpi = useMemo(() => {
        const activeSales = filteredSales.filter(s => s.status !== 'Cancelada');
        const faturamento = activeSales.reduce((sum, sale) => sum + sale.total, 0);
        const ticketMedio = activeSales.length > 0 ? faturamento / activeSales.length : 0;

        const lucro = filteredSales.reduce((sum, sale) => {
            if (sale.status === 'Cancelada') return sum;
            const cost = (sale.items || []).reduce((itemSum, item) => {
                const product = productMap[item.productId];
                const productCost = (product?.costPrice || 0) + (product?.additionalCostPrice || 0);
                return itemSum + productCost * item.quantity;
            }, 0);
            const revenue = sale.subtotal - sale.discount;
            return sum + (revenue - cost);
        }, 0);
        const taxas = filteredSales.reduce((sum, sale) => {
            if (sale.status === 'Cancelada') return sum;
            return sum + (sale.payments || []).reduce((acc, p) => acc + (p.fees || 0), 0);
        }, 0);
        return { faturamento, lucro, taxas, ticketMedio };
    }, [filteredSales, productMap]);

    const handleAddNewCustomer = useCallback(async (customerData: Omit<Customer, 'id' | 'createdAt'>): Promise<Customer | null> => {
        try {
            const newCustomer = await addCustomer(customerData);
            setCustomers(prev => [...prev, newCustomer]);
            showToast('Cliente adicionado com sucesso!', 'success');
            return newCustomer;
        } catch (error) {
            showToast('Erro ao salvar novo cliente.', 'error');
            return null;
        }
    }, [showToast]);

    const handleAddNewProduct = useCallback(async (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> & { selectedCustomerId?: string }): Promise<Product | null> => {
        try {
            const newProduct = await addProduct(productData, user?.id, user?.name);
            setProducts(prev => [...prev, newProduct]);
            setProductMap(prev => ({ ...prev, [newProduct.id]: newProduct }));
            return newProduct;
        } catch (error: any) {
            showToast(error.message || 'Erro ao adicionar novo produto de troca.', 'error');
            return null;
        }
    }, [showToast, user]);

    const handleCancelSaleConfirm = useCallback(async (reason: string) => {
        if (!saleToCancel) return;
        try {
            const canceled = await cancelSale(saleToCancel.id, reason, user?.id, user?.name);
            showToast('Venda cancelada com sucesso!', 'success');
            // Direct state update instead of refetch
            setSales(prevSales => prevSales.map(s => s.id === canceled.id ? canceled : s));
        } catch (error) {
            showToast('Erro ao cancelar a venda.', 'error');
        } finally {
            setSaleToCancel(null);
        }
    }, [saleToCancel, showToast]);

    const handleSaleSaved = useCallback(async (updatedSale: Sale) => {
        setIsModalOpen(false);
        showToast('Venda salva com sucesso!', 'success');

        setSales(prevSales => {
            const index = prevSales.findIndex(s => s.id === updatedSale.id);
            if (index > -1) {
                const newSales = [...prevSales];
                newSales[index] = updatedSale;
                return newSales;
            }
            return [updatedSale, ...prevSales];
        });
        setSaleToEdit(null);
    }, [showToast]);

    const getStatusBadge = (status: Sale['status']) => {
        switch (status) {
            case 'Finalizada':
                return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">Finalizada</span>;
            case 'Pendente':
                return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-700">Pendente</span>;
            case 'Cancelada':
                return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700">Cancelada</span>;
            case 'Editada':
                return (
                    <div className="flex gap-1 items-center">
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-700">Editada</span>
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">Finalizada</span>
                    </div>
                );
            default:
                return null;
        }
    };

    const periodButtonClasses = (period: string) => `px-3 py-1 rounded-md text-sm font-medium transition-colors ${activePeriod === period ? 'bg-primary text-white' : 'bg-surface-secondary hover:bg-border'}`;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-primary">Vendas</h1>

            <div className="space-y-4">
                {permissions?.canViewSalesKPIs && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <KpiCard title="Faturamento" value={formatCurrency(kpi.faturamento)} bgColor="bg-blue-100" />
                        <KpiCard title="Ticket Médio" value={formatCurrency(kpi.ticketMedio)} bgColor="bg-purple-100" />
                        <KpiCard title="Taxas" value={formatCurrency(kpi.taxas)} bgColor="bg-red-100" />
                        <KpiCard
                            title="Lucro"
                            value={formatCurrency(kpi.lucro)}
                            bgColor={kpi.lucro >= 0 ? "bg-green-100" : "bg-red-100"}
                            textColor={kpi.lucro >= 0 ? "text-green-700" : "text-red-700"}
                        />
                    </div>
                )}
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="relative">
                            <input type="date" value={startDate} onChange={handleDateInputChange(setStartDate)} className="p-2 border rounded-md bg-surface border-border h-10" />
                        </div>
                        <div className="relative">
                            <input type="date" value={endDate} onChange={handleDateInputChange(setEndDate)} className="p-2 border rounded-md bg-surface border-border h-10" />
                        </div>
                        <div className="flex items-center gap-1 bg-surface-secondary p-1 rounded-lg">
                            <button onClick={() => handlePeriodChange('hoje')} className={periodButtonClasses('hoje')}>Hoje</button>
                            <button onClick={() => handlePeriodChange('7dias')} className={periodButtonClasses('7dias')}>7 dias</button>
                            <button onClick={() => handlePeriodChange('15dias')} className={periodButtonClasses('15dias')}>15 dias</button>
                            <button onClick={() => handlePeriodChange('30dias')} className={periodButtonClasses('30dias')}>30 dias</button>
                        </div>
                        <button onClick={handleClearFilter} className="px-4 py-2 text-muted hover:text-primary">Limpar</button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {permissions?.canCreateSale && (
                            <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 bg-success text-on-primary rounded-md font-semibold">+ NOVA VENDA</button>
                        )}
                        <button onClick={() => setIsSimulatorOpen(true)} className="px-4 py-2 bg-secondary text-white rounded-md hover:bg-primary">Simulador de cartão</button>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <select
                        value={sellerFilter}
                        onChange={e => setSellerFilter(e.target.value)}
                        className="p-2 border rounded-md bg-surface border-border w-64 h-10 text-sm"
                    >
                        <option value="todos">Todos os vendedores</option>
                        {sellerUsers.map(user => (
                            <option key={user.id} value={user.id}>{user.name}</option>
                        ))}
                    </select>
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="p-2 border rounded-md bg-surface border-border h-10 text-sm"
                    >
                        <option value="todos">Todos os status</option>
                        <option value="Finalizada">Finalizada</option>
                        <option value="Pendente">Pendente</option>
                        <option value="Cancelada">Cancelada</option>
                        <option value="Editada">Editada</option>
                        <option value="Promissoria">Promissória</option>
                        <option value="PDV">PDV</option>
                    </select>
                    <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <SearchIcon className="h-5 w-5 text-muted" />
                        </span>
                        <input
                            type="text"
                            placeholder="Buscar por cliente ou ID da venda (ex: ID-10 ou 10)"
                            value={customerSearch}
                            onChange={e => setCustomerSearch(e.target.value)}
                            className="w-[28rem] p-2 pl-10 border rounded-md bg-surface border-border h-10 text-sm"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-surface rounded-lg border border-border">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <SpinnerIcon />
                        {longLoading && (
                            <div className="mt-6 text-center animate-pulse">
                                <p className="text-gray-500 text-sm mb-3">Isso está demorando mais que o normal...</p>
                                <button
                                    onClick={() => fetchData()}
                                    className="px-4 py-1.5 bg-gray-100 text-primary text-sm font-medium rounded-md hover:bg-gray-200 transition-colors border border-gray-300"
                                >
                                    Recarregar Agora
                                </button>
                            </div>
                        )}
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <XCircleIcon className="h-12 w-12 text-red-500 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">Erro ao carregar dados</h3>
                        <p className="text-gray-500 mb-6 max-w-md">{error}</p>
                        <button
                            onClick={() => fetchData()}
                            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors shadow-sm"
                        >
                            Tentar Novamente
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="text-left text-xs text-muted bg-surface-secondary uppercase">
                                    <tr>
                                        <th className="p-3">ID</th>
                                        <th className="p-3">Data</th>
                                        <th className="p-3">Vendedor</th>
                                        <th className="p-3">Cliente</th>
                                        <th className="p-3">Status</th>
                                        <th className="p-3">Origem</th>
                                        <th className="p-3">Total</th>
                                        <th className="p-3">Taxas</th>
                                        <th className="p-3">Lucro</th>
                                        <th className="p-3 text-center">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentSales.length === 0 ? (
                                        <tr>
                                            <td colSpan={10} className="px-6 py-12 text-center text-muted italic">
                                                Nenhuma venda encontrada para os filtros selecionados.
                                            </td>
                                        </tr>
                                    ) : currentSales.map(sale => {
                                        const cost = (sale.items || []).reduce((acc, item) => acc + ((productMap[item.productId]?.costPrice || 0) + (productMap[item.productId]?.additionalCostPrice || 0)) * item.quantity, 0);
                                        const revenue = sale.subtotal - sale.discount;
                                        const profit = revenue - cost;
                                        return (
                                            <tr key={sale.id} className="border-b border-border hover:bg-surface-secondary">
                                                <td className="p-3 font-medium text-primary">{sale.id}</td>
                                                <td className="p-3 text-muted">
                                                    <div>{new Date(sale.date).toLocaleDateString('pt-BR')}</div>
                                                    <div className="text-[11px]">{new Date(sale.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                                                </td>
                                                <td className="p-3 text-primary">{userMap[sale.salespersonId]?.name || 'N/A'}</td>
                                                <td className="p-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-primary">{customerMap[sale.customerId]?.name || 'N/A'}</span>
                                                        {customerMap[sale.customerId]?.phone && (
                                                            <a
                                                                href={`https://wa.me/55${customerMap[sale.customerId].phone.replace(/\D/g, '')}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-[#25D366] hover:opacity-80 transition-opacity"
                                                                title="Abrir WhatsApp"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <WhatsAppIcon className="w-4 h-4" />
                                                            </a>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-3">
                                                    <div className="flex gap-1 flex-wrap">
                                                        {getStatusBadge(sale.status)}
                                                        {sale.payments.some(p => p.type === 'pending') && (
                                                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700">Promissória</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-3 text-primary font-bold">
                                                    {(() => {
                                                        if (sale.origin === 'Balcão') return 'Vendas';
                                                        if (sale.origin === 'PDV' && !sale.cashSessionDisplayId && !sale.cashSessionId) return 'Vendas';
                                                        return sale.origin;
                                                    })()}
                                                    {sale.origin === 'PDV' && sale.cashSessionDisplayId && (
                                                        <span className="text-xs text-gray-600 font-bold block mt-0.5">
                                                            Caixa #{sale.cashSessionDisplayId}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-3 font-semibold text-primary">{formatCurrency(sale.total)}</td>
                                                <td className="p-3 text-muted">{formatCurrency(sale.payments.reduce((acc, p) => acc + (p.fees || 0), 0))}</td>
                                                <td className={`p-3 font-semibold ${profit >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(profit)}</td>
                                                <td className="p-3">
                                                    <div className="flex justify-center">
                                                        <SaleActionsDropdown
                                                            permissions={permissions}
                                                            onView={() => setSaleToView(sale)}
                                                            onEdit={() => {
                                                                // Allow editing if it's PDV but has no session ID (legacy/bugged sales or manual entry marked as PDV)
                                                                if (sale.origin === 'PDV' && sale.cashSessionId) {
                                                                    showToast('Vendas feitas pelo PDV devem ser editadas no próprio PDV.', 'info');
                                                                    return;
                                                                }
                                                                setSaleToEdit(sale); setIsModalOpen(true);
                                                            }}
                                                            onReprint={() => { setSaleToReprint(sale); setIsPrintChoiceOpen(true); }}
                                                            onCancel={() => setSaleToCancel(sale)}
                                                        />
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-4 flex justify-between items-center text-sm">
                            <p className="text-muted">Total de Registros: {filteredSales.length}</p>
                            {pageCount > 1 && (
                                <div className="flex items-center gap-2 text-secondary">
                                    <button
                                        onClick={() => paginate(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        className="p-1 rounded-md hover:bg-gray-200 disabled:opacity-50"
                                    >
                                        <ChevronLeftIcon className="h-5 w-5" />
                                    </button>
                                    <span>Página {currentPage} de {pageCount}</span>
                                    <button
                                        onClick={() => paginate(currentPage + 1)}
                                        disabled={currentPage === pageCount}
                                        className="p-1 rounded-md hover:bg-gray-200 disabled:opacity-50"
                                    >
                                        <ChevronRightIcon className="h-5 w-5" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {statusFilter === 'Promissoria' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex justify-between items-center">
                    <span className="font-bold text-red-800">Total Pago em Promissória (nesta lista):</span>
                    <span className="text-xl font-black text-red-700">
                        {formatCurrency(filteredSales.reduce((acc, sale) => acc + sale.payments.filter(p => p.type === 'pending').reduce((sum, p) => sum + p.value, 0), 0))}
                    </span>
                </div>
            )}


            <Suspense fallback={<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"><SpinnerIcon /></div>}>
                <NewSaleModal
                    isOpen={isModalOpen}
                    onClose={() => { setIsModalOpen(false); setSaleToEdit(null); }}
                    onSaleSaved={handleSaleSaved}
                    customers={customers}
                    users={users}
                    permissionProfiles={permissionProfiles}
                    products={products}
                    suppliers={suppliers}
                    onAddNewCustomer={handleAddNewCustomer}
                    onAddProduct={handleAddNewProduct}
                    brands={brands}
                    categories={categories}
                    productModels={productModels}
                    grades={grades}
                    gradeValues={gradeValues}
                    receiptTerms={receiptTerms}
                    paymentMethods={paymentMethods}
                    saleToEdit={saleToEdit}
                />
            </Suspense>

            {isSimulatorOpen && <CardRateSimulatorModal onClose={() => setIsSimulatorOpen(false)} />}

            {saleToView && <SaleDetailModal sale={saleToView} productMap={productMap} customers={customers} users={users} onClose={() => setSaleToView(null)} />}

            {
                isPrintChoiceOpen && saleToReprint && (
                    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[70]">
                        <div className="bg-surface p-6 rounded-lg shadow-xl w-full max-w-sm">
                            <h3 className="text-lg font-bold mb-4 text-primary">Escolha o Formato de Impressão</h3>
                            <p className="text-sm text-muted mb-6">Selecione o layout para o recibo da venda #{saleToReprint.id}.</p>
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
                            <button onClick={() => { setIsPrintChoiceOpen(false); setSaleToReprint(null); }} className="mt-6 w-full px-4 py-2 bg-gray-200 text-secondary rounded-md hover:bg-gray-300">Cancelar</button>
                        </div>
                    </div>
                )
            }

            {
                saleToReprint && receiptModalFormat && (
                    <SaleReceiptModal
                        sale={saleToReprint}
                        format={receiptModalFormat}
                        productMap={productMap}
                        customers={customers}
                        users={users}
                        onClose={() => {
                            setSaleToReprint(null);
                            setReceiptModalFormat(null);
                        }}
                    />
                )
            }

            {
                saleToCancel && (
                    <DeleteWithReasonModal
                        isOpen={!!saleToCancel}
                        onClose={() => setSaleToCancel(null)}
                        onConfirm={handleCancelSaleConfirm}
                        title="Cancelar Venda"
                        message={`Você está prestes a cancelar a venda #${saleToCancel.id}. Os produtos serão retornados ao estoque. Por favor, informe o motivo.`}
                    />
                )
            }
        </div >
    );
};

export default Vendas;
