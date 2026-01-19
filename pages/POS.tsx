
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    SpinnerIcon, XCircleIcon, CheckIcon, ArchiveBoxIcon, DocumentTextIcon, PrinterIcon
} from '../components/icons.tsx';
import { useUser } from '../contexts/UserContext.tsx';
import {
    getCashSessions, getUsers, addCashSession, updateCashSession,
    getProducts, getSales, getCustomers, getReceiptTerms, addCashMovement,
    getSuppliers, getPermissionProfiles, getBrands, getCategories, getProductModels,
    getGrades, getGradeValues, addCustomer, addProduct, cancelSale, getPaymentMethods
} from '../iStorePro/services/mockApi.ts';
import {
    CashSession, User, Product, Sale, Customer, ReceiptTermParameter,
    Supplier, PermissionProfile, Brand, Category, ProductModel, Grade,
    GradeValue, PaymentMethodParameter
} from '../types.ts';
import PosAlertModal from '../components/PosAlertModal.tsx';
import { useToast } from '../contexts/ToastContext.tsx';
import SaleReceiptModal from '../components/SaleReceiptModal.tsx';
import SaleDetailModal from '../components/SaleDetailModal.tsx';
import StockSearchModal from '../components/StockSearchModal.tsx';
import { PosSettingsView } from '../components/PosSettingsView.tsx';
import CashMovementModal from '../components/CashMovementModal.tsx';
import { toDateValue, getNowISO } from '../iStorePro/utils/dateUtils.ts';

// Sub-components
import PosHeader from '../components/pos/PosHeader.tsx';
import PosSidebar from '../components/pos/PosSidebar.tsx';
import CaixasView from '../components/pos/CaixasView.tsx';
import NewSaleView from '../components/pos/NewSaleView.tsx';
import ResumoCaixaView from '../components/pos/ResumoCaixaView.tsx';

type PosView = 'caixas' | 'pdv' | 'estoque' | 'resumo' | 'config';

const POS: React.FC = () => {
    const { user } = useUser();
    const { showToast } = useToast();
    const navigate = useNavigate();

    // Data State
    const [sessions, setSessions] = useState<CashSession[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [sales, setSales] = useState<Sale[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [permissionProfiles, setPermissionProfiles] = useState<PermissionProfile[]>([]);
    const [brands, setBrands] = useState<Brand[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [productModels, setProductModels] = useState<ProductModel[]>([]);
    const [grades, setGrades] = useState<Grade[]>([]);
    const [gradeValues, setGradeValues] = useState<GradeValue[]>([]);
    const [receiptTerms, setReceiptTerms] = useState<ReceiptTermParameter[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethodParameter[]>([]);
    const [loading, setLoading] = useState(true);

    // UI state
    const [activeView, setActiveView] = useState<PosView>('resumo');
    const [isStockSearchModalOpen, setIsStockSearchModalOpen] = useState(false);
    const [isOpeningSessionModalOpen, setIsOpeningSessionModalOpen] = useState(false);
    const [openingBalance, setOpeningBalance] = useState<string>('0');
    const [isCashMovementModalOpen, setIsCashMovementModalOpen] = useState(false);
    const [cashMovementType, setCashMovementType] = useState<'suprimento' | 'sangria'>('sangria');

    // Dashboard/Detail state
    const [viewSession, setViewSession] = useState<CashSession | null>(null);
    const [receiptSale, setReceiptSale] = useState<Sale | null>(null);
    const [detailSale, setDetailSale] = useState<Sale | null>(null);
    const [saleToEdit, setSaleToEdit] = useState<Sale | null>(null);
    const [receiptFormat, setReceiptFormat] = useState<'A4' | 'thermal'>('thermal');
    const [showFormatSelector, setShowFormatSelector] = useState(false);

    // Filters for CaixasView
    const [startDate, setStartDate] = useState(() => {
        const d = new Date(); d.setDate(d.getDate() - 7);
        return toDateValue(d);
    });
    const [endDate, setEndDate] = useState(toDateValue());
    const [userFilter, setUserFilter] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchData = useCallback(async (silent = false, retryCount = 0) => {
        if (!silent) setLoading(true);

        try {
            const [
                sess, usrs, prods, sls, custs, terms, sups, perms, brnds, cats, mods, grds, gvals, pms
            ] = await Promise.all([
                getCashSessions(), getUsers(), getProducts(), getSales(), getCustomers(),
                getReceiptTerms(), getSuppliers(), getPermissionProfiles(), getBrands(),
                getCategories(), getProductModels(), getGrades(), getGradeValues(), getPaymentMethods()
            ]);

            setSessions(sess);
            setUsers(usrs);
            setProducts(prods);
            setSales(sls);
            setCustomers(custs);
            setReceiptTerms(terms);
            setSuppliers(sups);
            setPermissionProfiles(perms);
            setBrands(brnds);
            setCategories(cats);
            setProductModels(mods);
            setGrades(grds);
            setGradeValues(gvals);
            setPaymentMethods(pms.filter(m => !m.name.toLowerCase().includes('pagseguro')));
        } catch (error: any) {
            // Silently ignore AbortError (happens on component unmount or StrictMode double-mount)
            if (error?.name === 'AbortError' || error?.message?.includes('abort')) {
                console.log('POS: Request aborted (likely component unmount or StrictMode)');
                return;
            }

            console.error('POS: Error fetching data:', error);

            // Auto-retry up to 3 times with exponential backoff for network issues
            if (retryCount < 3) {
                const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
                console.log(`POS: Tentando reconectar automaticamente em ${delay / 1000}s... (tentativa ${retryCount + 1}/3)`);
                setTimeout(() => fetchData(silent, retryCount + 1), delay);
                return;
            }

            showToast('Erro ao carregar dados do PDV.', 'error');
        } finally {
            if (!silent) setLoading(false);
        }
    }, [showToast]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const augmentedSessions = useMemo(() => {
        return sessions.map(session => {
            const sessionSales = sales.filter(s => s.cashSessionId === session.id && s.status !== 'Cancelada');
            const totalSales = sessionSales.reduce((acc, sale) => acc + (sale.total || 0), 0);

            // Somar apenas pagamentos em Dinheiro para o saldo do caixa
            const cashFromSales = sessionSales.reduce((acc, sale) => {
                const cash = (sale.payments || []).filter(p => p.method === 'Dinheiro').reduce((sum, p) => sum + (p.value || 0), 0);
                return acc + cash;
            }, 0);

            // O cashInRegister que vem do mockApi já inclui openingBalance + suprimentos - sangrias
            // Mas não inclui as vendas em dinheiro.
            return {
                ...session,
                transactionsValue: totalSales,
                cashInRegister: (session.cashInRegister || 0) + cashFromSales
            };
        });
    }, [sessions, sales]);

    const currentUserOpenSession = useMemo(() => augmentedSessions.find(s => s.status === 'aberto' && s.userId === user?.id), [augmentedSessions, user]);

    const augmentedViewSession = useMemo(() => {
        if (!viewSession) return null;
        return augmentedSessions.find(s => s.id === viewSession.id) || null;
    }, [viewSession, augmentedSessions]);

    const workingSession = useMemo(() => {
        if (augmentedViewSession?.status === 'aberto') return augmentedViewSession;
        return currentUserOpenSession;
    }, [augmentedViewSession, currentUserOpenSession]);

    const handleViewChange = (view: PosView) => {
        if (view === 'resumo') setViewSession(null);
        setActiveView(view);
    };

    const handleNewSession = () => {
        if (currentUserOpenSession) {
            showToast('Você já possui um caixa aberto.', 'warning');
            return;
        }
        setOpeningBalance('0');
        setIsOpeningSessionModalOpen(true);
    };

    const handleConfirmOpenSession = async () => {
        try {
            const newSession = await addCashSession({
                userId: user?.id || 'system',
                openingBalance: parseFloat(openingBalance) || 0
            }, user?.id, user?.name);
            setSessions(prev => [newSession, ...prev]);
            setIsOpeningSessionModalOpen(false);
            showToast('Caixa aberto com sucesso!', 'success');
            setActiveView('pdv');
        } catch (error) {
            showToast('Erro ao abrir o caixa.', 'error');
        }
    };

    const handleCloseSession = async (session: CashSession) => {
        try {
            // Fix: Send only changed fields to avoid overwriting calculated balances in DB
            const updated = await updateCashSession({
                id: session.id,
                status: 'fechado',
                closeTime: getNowISO()
            }, user?.id, user?.name);

            setSessions(prev => prev.map(s => s.id === updated.id ? updated : s));
            if (viewSession?.id === updated.id) setViewSession(updated);
            showToast('Caixa fechado com sucesso!', 'success');
            setActiveView('caixas');
        } catch (error) { showToast('Erro ao fechar o caixa.', 'error'); }
    };

    const handleReopenSession = async (session: CashSession) => {
        console.log('Tentando reabrir caixa:', session.id);
        // Only check if the CURRENT USER has an open session. 
        // Other users having open sessions should not prevent me from opening mine.
        const myOpenSession = sessions.find(s => s.status === 'aberto' && s.userId === user?.id);

        if (myOpenSession) {
            showToast('Você já possui um caixa aberto. Feche-o antes de reabrir este.', 'warning');
            return;
        }

        try {
            // Fix: Send only changed fields. Clear closeTime using null.
            const updated = await updateCashSession({
                id: session.id,
                status: 'aberto',
                closeTime: null
            }, user?.id, user?.name);

            // Re-fetch data silently to sync all balances and movements
            await fetchData(true);

            // If it's the current user's session, make it the "Main" session (null viewSession)
            if (updated.userId === user?.id) {
                setViewSession(null);
            } else {
                setViewSession(updated);
            }

            showToast('Caixa reaberto com sucesso!', 'success');
            setActiveView('resumo');
        } catch (error) {
            showToast('Erro ao reabrir o caixa.', 'error');
        }
    };

    const handleConfirmCashMovement = async (amount: number, reason: string) => {
        const targetSid = workingSession?.id;
        if (!targetSid) {
            showToast('Nenhum caixa selecionado para a movimentação.', 'error');
            return;
        }

        try {
            // Immediate feedback
            setIsCashMovementModalOpen(false);

            const updated = await addCashMovement(targetSid, {
                type: cashMovementType,
                amount: Number(amount),
                reason,
                userId: user?.id || 'system'
            }, user?.id, user?.name);

            // Manual state update for instant feedback
            setSessions(prev => prev.map(s => s.id === updated.id ? updated : s));
            if (viewSession?.id === updated.id) setViewSession(updated);

            showToast('Movimentação registrada com sucesso!', 'success');
        } catch (error: any) {
            showToast(error.message || 'Erro ao registrar movimentação.', 'error');
            setIsCashMovementModalOpen(true); // Reopen on error
        }
    };

    const handlePrintClick = (sale: Sale) => {
        setReceiptSale(sale);
        const defaultFormat = localStorage.getItem('pos_default_receipt_format') as 'A4' | 'thermal' | null;
        if (defaultFormat) { setReceiptFormat(defaultFormat); setShowFormatSelector(false); }
        else setShowFormatSelector(true);
    };

    const handleSaleSaved = (sale: Sale) => {
        setSaleToEdit(null);
        setActiveView('resumo');
        fetchData();
    };

    const userMap = useMemo(() => users.reduce((acc, u) => ({ ...acc, [u.id]: u.name }), {} as Record<string, string>), [users]);
    const productMap = useMemo(() => products.reduce((acc, p) => ({ ...acc, [p.id]: p }), {} as Record<string, Product>), [products]);
    const userOptions = useMemo(() => users.map(u => ({ value: u.id, label: u.name })), [users]);

    const filteredSessions = useMemo(() => {
        const normalizedSearch = searchTerm.toLowerCase().trim().replace(/^#/, '');

        return augmentedSessions.filter(s => {
            const date = toDateValue(s.openTime);
            const dateMatch = date >= startDate && date <= endDate;
            const userMatch = userFilter ? s.userId === userFilter : true;

            // Se há termo de busca, aplicar filtros adicionais
            if (normalizedSearch) {
                const operatorName = (userMap[s.userId] || '').toLowerCase();
                const operatorMatch = operatorName.includes(normalizedSearch);

                // Busca por ID do caixa (ex: "1", "#1", etc)
                const sessionIdMatch = s.displayId.toString() === normalizedSearch ||
                    s.displayId.toString().includes(normalizedSearch);

                // Busca por ID da venda - encontra caixas que contêm essa venda
                const sessionSalesIds = sales.filter(sale => sale.cashSessionId === s.id).map(sale => sale.id.toLowerCase());
                const saleIdMatch = sessionSalesIds.some(saleId =>
                    saleId.includes(normalizedSearch) ||
                    saleId === `id-${normalizedSearch}`
                );

                const searchMatch = operatorMatch || sessionIdMatch || saleIdMatch;
                return dateMatch && userMatch && searchMatch;
            }

            return dateMatch && userMatch;
        });
    }, [augmentedSessions, startDate, endDate, userFilter, searchTerm, userMap, sales]);

    const sessionSales = useMemo(() => {
        const targetId = (viewSession || currentUserOpenSession)?.id;
        if (!targetId) return [];
        return sales.filter(s => s.cashSessionId === targetId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [sales, viewSession, currentUserOpenSession]);

    if (loading) return <div className="flex items-center justify-center h-screen bg-gray-100"><SpinnerIcon /></div>;

    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden">
            <PosSidebar activeView={activeView} onViewChange={handleViewChange} />
            <div className="flex-1 flex flex-col min-w-0">
                <PosHeader cashId={currentUserOpenSession?.displayId} onOpenStockSearch={() => setIsStockSearchModalOpen(true)} />
                <main className="flex-1 overflow-auto p-6">
                    {activeView === 'caixas' && (
                        <CaixasView
                            sessions={filteredSessions} userMap={userMap}
                            onReopen={handleReopenSession} onCloseSession={handleCloseSession}
                            onViewDetails={(s) => { setViewSession(s); setActiveView('resumo'); }}
                            startDate={startDate} setStartDate={setStartDate}
                            endDate={endDate} setEndDate={setEndDate}
                            userOptions={userOptions} userFilter={userFilter} setUserFilter={setUserFilter}
                            currentUserOpenSession={currentUserOpenSession} currentUserId={user?.id}
                            onNewSession={handleNewSession}
                            searchTerm={searchTerm} setSearchTerm={setSearchTerm}
                        />
                    )}
                    {activeView === 'pdv' && (
                        workingSession ? (
                            <NewSaleView
                                onCancel={() => { setActiveView('caixas'); setSaleToEdit(null); }}
                                onSaleSaved={handleSaleSaved}
                                customers={customers} paymentMethods={paymentMethods}
                                users={users} products={products} suppliers={suppliers}
                                permissionProfiles={permissionProfiles} brands={brands}
                                categories={categories} productModels={productModels}
                                grades={grades} gradeValues={gradeValues} receiptTerms={receiptTerms}
                                onAddNewCustomer={async (data) => {
                                    const nc = await addCustomer(data);
                                    setCustomers(prev => [...prev, nc]);
                                    return nc;
                                }}
                                onAddProduct={async (data) => {
                                    const np = await addProduct(data, user?.id, user?.name);
                                    setProducts(prev => [...prev, np]);
                                    return np;
                                }}
                                openCashSessionId={workingSession.id}
                                openCashSessionDisplayId={workingSession.displayId}
                                saleToEdit={saleToEdit}
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                                <ArchiveBoxIcon className="h-16 w-16 text-gray-300" />
                                <h3 className="text-xl font-bold text-gray-600">Nenhum caixa aberto</h3>
                                <button onClick={() => setActiveView('caixas')} className="px-6 py-2 bg-primary text-white rounded-lg">Ir para Caixas</button>
                            </div>
                        )
                    )}
                    {activeView === 'resumo' && (
                        <ResumoCaixaView
                            viewSession={augmentedViewSession} currentUserOpenSession={currentUserOpenSession}
                            sessionSales={sessionSales} customers={customers}
                            handleNewSession={handleNewSession} setActiveView={setActiveView}
                            handleOpenCashMovement={(t) => { setCashMovementType(t); setIsCashMovementModalOpen(true); }}
                            handleCloseSession={handleCloseSession} handleReopenSession={handleReopenSession}
                            handleEditSale={(s) => { setSaleToEdit(s); setActiveView('pdv'); }}
                            handleViewClick={setDetailSale} handlePrintClick={handlePrintClick}
                            cancelSale={cancelSale} showToast={showToast} fetchData={fetchData}
                            users={users}
                        />
                    )}
                    {activeView === 'config' && <PosSettingsView customers={customers} receiptTerms={receiptTerms} onUpdateReceiptFormat={setReceiptFormat} />}
                </main>

                {isStockSearchModalOpen && <StockSearchModal products={products} onClose={() => setIsStockSearchModalOpen(false)} />}
                <CashMovementModal isOpen={isCashMovementModalOpen} onClose={() => setIsCashMovementModalOpen(false)} onConfirm={handleConfirmCashMovement} type={cashMovementType} />

                {showFormatSelector && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
                        <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm animate-scale-in">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">Selecionar Formato</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <button onClick={() => { setReceiptFormat('A4'); setShowFormatSelector(false); }} className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-100 hover:border-primary transition-all group">
                                    <DocumentTextIcon className="h-8 w-8 text-gray-400 group-hover:text-primary" /><span className="font-bold text-sm">Folha A4</span>
                                </button>
                                <button onClick={() => { setReceiptFormat('thermal'); setShowFormatSelector(false); }} className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-100 hover:border-primary transition-all group">
                                    <PrinterIcon className="h-8 w-8 text-gray-400 group-hover:text-primary" /><span className="font-bold text-sm">Térmica 80mm</span>
                                </button>
                            </div>
                            <button onClick={() => { setShowFormatSelector(false); setReceiptSale(null); }} className="mt-6 w-full py-3 bg-gray-100 rounded-lg text-gray-500 font-bold">Cancelar</button>
                        </div>
                    </div>
                )}

                {detailSale && <SaleDetailModal sale={detailSale} productMap={productMap} customers={customers} users={users} onClose={() => setDetailSale(null)} />}
                {receiptSale && !showFormatSelector && <SaleReceiptModal sale={receiptSale} productMap={productMap} customers={customers} users={users} onClose={() => setReceiptSale(null)} format={receiptFormat} />}

                {isOpeningSessionModalOpen && (
                    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
                        <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm animate-scale-in">
                            <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">Abrir Caixa</h3>
                            <div className="mb-6">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Valor Inicial (Fundo de Troco)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">R$</span>
                                    <input type="number" step="0.01" value={openingBalance} onChange={e => setOpeningBalance(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-lg font-bold outline-none" placeholder="0,00" autoFocus />
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setIsOpeningSessionModalOpen(false)} className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-lg font-bold">Cancelar</button>
                                <button onClick={handleConfirmOpenSession} className="flex-1 py-3 bg-success text-white rounded-lg font-bold shadow-lg shadow-success/20">ABRIR CAIXA</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default POS;
