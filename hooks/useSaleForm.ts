
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
    Product, Customer, User, Sale, Payment, PaymentMethodType,
    Supplier, CartItem, PaymentMethodParameter, CardConfigData,
    AuditActionType, AuditEntityType
} from '../types.ts';
import { useToast } from '../contexts/ToastContext.tsx';
import {
    findOrCreateSupplierFromCustomer, addSale, updateSale, updateProduct, addAuditLog
} from '../iStorePro/services/mockApi.ts';
import { useUser } from '../contexts/UserContext.tsx';
import { toDateValue } from '../iStorePro/utils/dateUtils.ts';

interface UseSaleFormProps {
    customers: Customer[];
    users: User[];
    products: Product[];
    suppliers: Supplier[];
    receiptTerms: any[];
    paymentMethods: PaymentMethodParameter[];
    onAddNewCustomer: (data: any) => Promise<Customer | null>;
    onAddProduct: (data: any) => Promise<Product | null>;
    onSaleSaved: (sale: Sale) => void;
    saleToEdit?: Sale | null;
    openCashSessionId?: string | null;
    openCashSessionDisplayId?: number;
}

export const useSaleForm = ({
    customers, users, products, suppliers, receiptTerms, paymentMethods,
    onAddNewCustomer, onAddProduct, onSaleSaved, saleToEdit,
    openCashSessionId, openCashSessionDisplayId
}: UseSaleFormProps) => {
    const { showToast } = useToast();
    const { user } = useUser();
    const productSearchRef = useRef<HTMLInputElement>(null);
    const initializedRef = useRef(false);

    // Form State
    const [saleDate, setSaleDate] = useState(toDateValue());
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
    const [selectedSalespersonId, setSelectedSalespersonId] = useState<string>('');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [productSearch, setProductSearch] = useState('');
    const [productToConfirm, setProductToConfirm] = useState<Product | null>(null);
    const [searchQuantity, setSearchQuantity] = useState(1);
    const [globalDiscountType, setGlobalDiscountType] = useState<'R$' | '%'>('R$');
    const [globalDiscountValue, setGlobalDiscountValue] = useState<number>(0);
    const [cardFees, setCardFees] = useState<number>(0);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [warrantyTerm, setWarrantyTerm] = useState('');
    const [observations, setObservations] = useState('');
    const [internalObservations, setInternalObservations] = useState('');

    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    const [isTradeInProductModalOpen, setIsTradeInProductModalOpen] = useState(false);
    const [productForTradeIn, setProductForTradeIn] = useState<Partial<Product> | null>(null);
    const [pendingTradeInProduct, setPendingTradeInProduct] = useState<Product | null>(null);
    const [localSuppliers, setLocalSuppliers] = useState<Supplier[]>(suppliers);
    const [isCardPaymentModalOpen, setIsCardPaymentModalOpen] = useState(false);
    const [cardTransactionType, setCardTransactionType] = useState<'credit' | 'debit'>('credit');
    const [cardMethodId, setCardMethodId] = useState<string>('');

    const [paymentInput, setPaymentInput] = useState<{
        method: PaymentMethodType | 'Cartão',
        amount: number,
        cardType?: 'Crédito' | 'Débito',
    } | null>(null);

    const resetState = useCallback(() => {
        setSaleDate(toDateValue());
        setSelectedCustomerId(localStorage.getItem('pos_default_customer_id') || null);
        setSelectedSalespersonId('');
        setCart([]);
        setProductSearch('');
        setProductToConfirm(null);
        setSearchQuantity(1);
        setGlobalDiscountType('R$');
        setGlobalDiscountValue(0);
        setCardFees(0);
        setPayments([]);
        setObservations('');
        setInternalObservations('');
        setPaymentInput(null);
        setProductForTradeIn(null);
        setPendingTradeInProduct(null);

        const storedTermName = localStorage.getItem('pos_default_warranty_term');
        if (storedTermName) {
            setWarrantyTerm(storedTermName);
        } else {
            const defaultTerm = receiptTerms.find(t => t.name === 'IPHONE SEMINOVO') || (receiptTerms.length > 0 ? receiptTerms[0] : null);
            if (defaultTerm) setWarrantyTerm(defaultTerm.name);
        }
    }, [receiptTerms]);

    useEffect(() => {
        if (!initializedRef.current) {
            if (saleToEdit) {
                setSaleDate(saleToEdit.date.split('T')[0]);
                setSelectedCustomerId(saleToEdit.customerId);
                setSelectedSalespersonId(saleToEdit.salespersonId);
                const reconstructedCart = saleToEdit.items.map(item => {
                    const product = products.find(p => p.id === item.productId);
                    if (!product) return null;
                    return { ...product, quantity: item.quantity, salePrice: item.unitPrice, discountType: 'R$', discountValue: 0 } as CartItem;
                }).filter((item): item is CartItem => item !== null);
                setCart(reconstructedCart as CartItem[]);
                setGlobalDiscountType('R$');
                setGlobalDiscountValue(saleToEdit.discount); // Note: this simplifies the discount logic back to R$
                setPayments(saleToEdit.payments.map(p => ({ ...p })));
                setWarrantyTerm(saleToEdit.warrantyTerm || '');
                setObservations(saleToEdit.observations || '');
                setInternalObservations(saleToEdit.internalObservations || '');
            } else {
                resetState();
            }
            initializedRef.current = true;
        }
    }, [saleToEdit, resetState, products]);

    useEffect(() => { setLocalSuppliers(suppliers); }, [suppliers]);

    const subtotal = useMemo(() => cart.reduce((total, item) => total + (item.salePrice || 0) * (item.quantity || 0), 0), [cart]);

    const totalItemDiscounts = useMemo(() => cart.reduce((total, item) => {
        const disc = item.discountType === 'R$' ? item.discountValue : ((item.salePrice || 0) * (item.quantity || 0)) * (item.discountValue / 100);
        return total + disc;
    }, 0), [cart]);

    const globalDiscountAmount = useMemo(() => {
        if (globalDiscountType === '%') return (subtotal - totalItemDiscounts) * (globalDiscountValue / 100);
        return globalDiscountValue;
    }, [subtotal, totalItemDiscounts, globalDiscountType, globalDiscountValue]);

    // FIX: Total should NOT include card fees. Card fees are external to the product value.
    const total = useMemo(() => subtotal - totalItemDiscounts - globalDiscountAmount, [subtotal, totalItemDiscounts, globalDiscountAmount]);
    const totalPaid = useMemo(() => payments.reduce((sum, p) => sum + p.value, 0), [payments]);
    const balance = useMemo(() => total - totalPaid, [total, totalPaid]);

    const handleAddToCart = useCallback((product: Product) => {
        const isUnique = !!(product.serialNumber || product.imei1);
        const existingItem = cart.find(item => item.id === product.id);
        if (isUnique && existingItem) { showToast('Este produto é único e já está no carrinho.', 'warning'); return; }
        setProductToConfirm(product);
    }, [cart, showToast]);

    const confirmAddToCart = useCallback(() => {
        if (!productToConfirm) return;
        const product = productToConfirm;
        const isUnique = !!(product.serialNumber || product.imei1);
        const existingItem = cart.find(item => item.id === product.id);

        const quantityToAdd = isUnique ? 1 : searchQuantity;
        if (quantityToAdd <= 0) return;
        const totalQuantity = (existingItem?.quantity || 0) + quantityToAdd;
        if (totalQuantity > product.stock) { showToast('Quantidade insuficiente em estoque.', 'warning'); return; }

        if (existingItem) {
            setCart(cart.map(item => item.id === product.id ? { ...item, quantity: totalQuantity } : item));
        } else {
            setCart([...cart, { ...product, quantity: quantityToAdd, salePrice: product.price, discountType: 'R$', discountValue: 0 }]);
        }
        setProductToConfirm(null);
        setProductSearch('');
        setSearchQuantity(1);
    }, [productToConfirm, searchQuantity, cart, showToast]);

    const handleRemoveFromCart = useCallback((productId: string) => setCart(prev => prev.filter(item => item.id !== productId)), []);

    const handleCartItemUpdate = useCallback((productId: string, field: keyof CartItem, value: any) => {
        setCart(currentCart => currentCart.map(item => item.id === productId ? { ...item, [field]: value } : item));
    }, []);

    const handleOpenTradeInModal = useCallback(async () => {
        if (!selectedCustomerId) {
            showToast("Selecione um cliente primeiro.", "warning");
            return;
        }
        const customer = customers.find(c => c.id === selectedCustomerId);
        if (!customer) {
            showToast("Cliente não encontrado.", "error");
            return;
        }

        console.log('[useSaleForm] handleOpenTradeInModal called for customer:', customer.name);

        try {
            const supplier = await findOrCreateSupplierFromCustomer(customer);
            console.log('[useSaleForm] Supplier created/found:', supplier.id, supplier.name);
            setLocalSuppliers(prev => {
                if (!prev.some(s => s.id === supplier.id)) return [...prev, supplier];
                return prev;
            });
            setProductForTradeIn({ origin: 'Troca', supplierId: supplier.id });
            setIsTradeInProductModalOpen(true);
        } catch (error: any) {
            console.error('[useSaleForm] Error in handleOpenTradeInModal:', error);

            // Fallback: Always try to open modal with temporary supplier if API fails
            // This ensures the user is not blocked from adding a trade-in item
            console.warn('[useSaleForm] Using fallback temporary supplier due to error.');

            const fallbackSupplier = {
                id: `temp-supplier-${customer.id}`,
                name: customer.name,
                email: customer.email,
                phone: customer.phone,
                linkedCustomerId: customer.id
            };

            setLocalSuppliers(prev => {
                if (!prev.some(s => s.id === fallbackSupplier.id)) return [...prev, fallbackSupplier as any];
                return prev;
            });

            setProductForTradeIn({ origin: 'Troca', supplierId: fallbackSupplier.id });
            setIsTradeInProductModalOpen(true);

            if (error?.name !== 'AbortError' && !error?.message?.includes('aborted')) {
                showToast("Aviso: executando em modo offline para o fornecedor.", "info");
            }
        }
    }, [selectedCustomerId, customers, showToast]);




    const handleRequestPayment = useCallback((label: string) => {
        const methodParam = paymentMethods.find(p => p.name === label);
        const lowerLabel = label.toLowerCase();
        const isTradeIn = lowerLabel.includes('troca') || lowerLabel.includes('entrada') || methodParam?.name === 'Aparelho na Troca';
        const isCard = methodParam?.type === 'card' || lowerLabel.includes('cartão') || lowerLabel.includes('crédito') || lowerLabel.includes('débito');

        // Trade-in can be added even if balance is zero (to create credit)
        // Other payments require a positive balance
        if (!isTradeIn && balance <= 0.01) {
            showToast('Não há saldo pendente.', 'info');
            return;
        }

        if (isTradeIn) {
            console.log('[useSaleForm] handleRequestPayment: Opening trade-in modal');
            handleOpenTradeInModal();
        }
        else if (isCard) {
            if (methodParam) setCardMethodId(methodParam.id);
            setCardTransactionType(lowerLabel.includes('débito') || lowerLabel.includes('debito') ? 'debit' : 'credit');
            setIsCardPaymentModalOpen(true);
        }
        else setPaymentInput({ method: label as any, amount: parseFloat(balance.toFixed(2)) });
    }, [balance, paymentMethods, handleOpenTradeInModal, showToast]);


    const handleConfirmPayment = useCallback(() => {
        if (!paymentInput || paymentInput.amount <= 0) { setPaymentInput(null); return; }
        const method = paymentInput.method === 'Cartão' ? paymentInput.cardType! : paymentInput.method;

        // Find method definition to get type (e.g. pending)
        const methodDef = paymentMethods.find(p => p.name === paymentInput.method);

        const newPayment: Payment = {
            id: `pay-${Date.now()}`,
            method: method as PaymentMethodType,
            value: paymentInput.amount,
            type: methodDef?.type
        };
        setPayments(prev => [...prev, newPayment]);
        setPaymentInput(null);
    }, [paymentInput, paymentMethods]);

    const handleConfirmCardPayment = useCallback(({ payment, feeToAddToSale }: { payment: Payment; feeToAddToSale: number }) => {
        setPayments(prev => [...prev, payment]);
        // FIX: Do NOT add fees to sale total. Using feeToAddToSale only for tracking if needed, but not affecting sale total.
        // if (feeToAddToSale > 0) setCardFees(prev => prev + feeToAddToSale);
        setIsCardPaymentModalOpen(false);
    }, []);

    const handleRemovePayment = useCallback((paymentId: string) => {
        setPayments(prev => {
            const paymentToRemove = prev.find(p => p.id === paymentId);
            if (paymentToRemove) {
                if ((paymentToRemove.method === 'Débito' || paymentToRemove.method === 'Crédito') && paymentToRemove.fees) {
                    // Só remove do cardFees se o tipo for 'Débito' ou 'Com Juros' (onde a taxa foi somada ao total)
                    if (paymentToRemove.type === 'Débito' || paymentToRemove.type === 'Com Juros') {
                        // setCardFees(fees => Math.max(0, fees - paymentToRemove.fees!));
                    }
                }
                if (paymentToRemove.method === 'Aparelho na Troca') {
                    setPendingTradeInProduct(null);
                    showToast('Troca removida.', 'info');
                }
            }
            return prev.filter(p => p.id !== paymentId);
        });
    }, [showToast]);

    const handleSaveTradeInProduct = useCallback(async (productData: any) => {
        if (!selectedCustomerId) { setIsTradeInProductModalOpen(false); return; }
        const salesperson = users.find(u => u.id === selectedSalespersonId);
        const newProductPayload = {
            ...productData,
            stock: 1,
            selectedCustomerId,
            createdBy: selectedSalespersonId,
            createdByName: salesperson?.name
        };
        const tradeInValue = newProductPayload.costPrice || 0;

        try {
            const createdProduct = await onAddProduct(newProductPayload);
            if (createdProduct) {
                setPendingTradeInProduct(createdProduct);
                const newPayment: Payment = {
                    id: `pay-trade-${Date.now()}`,
                    method: 'Aparelho na Troca',
                    value: tradeInValue,
                    tradeInDetails: {
                        productId: createdProduct.id,
                        model: createdProduct.model,
                        serialNumber: createdProduct.serialNumber,
                        imei1: createdProduct.imei1,
                        imei2: createdProduct.imei2,
                        batteryHealth: createdProduct.batteryHealth
                    }
                };
                setPayments(prev => [...prev, newPayment]);
                showToast('Produto de troca adicionado!', 'success');
            } else {
                showToast('Erro ao criar produto de troca.', 'error');
            }
        } catch (error: any) {
            showToast(error?.message || 'Erro ao criar produto de troca.', 'error');
        } finally {
            setIsTradeInProductModalOpen(false);
        }
    }, [selectedCustomerId, selectedSalespersonId, users, onAddProduct, showToast]);

    // Wrapper function for TradeInModal which has a different signature
    const handleSaveTradeInFromModal = useCallback(async ({ tradeInValue, newProductData }: { tradeInValue: number; newProductData: any }) => {
        console.log('[useSaleForm] handleSaveTradeInFromModal called with:', { tradeInValue, newProductData });

        if (!selectedCustomerId) {
            setIsTradeInProductModalOpen(false);
            return;
        }

        const salesperson = users.find(u => u.id === selectedSalespersonId);
        const fullProductPayload = {
            ...newProductData,
            stock: 1,
            selectedCustomerId,
            createdBy: selectedSalespersonId,
            createdByName: salesperson?.name
        };

        try {
            const createdProduct = await onAddProduct(fullProductPayload);
            if (createdProduct) {
                setPendingTradeInProduct(createdProduct);
                const newPayment: Payment = {
                    id: `pay-trade-${Date.now()}`,
                    method: 'Aparelho na Troca',
                    value: tradeInValue,
                    tradeInDetails: {
                        productId: createdProduct.id,
                        model: createdProduct.model,
                        serialNumber: createdProduct.serialNumber,
                        imei1: createdProduct.imei1,
                        imei2: createdProduct.imei2,
                        batteryHealth: createdProduct.batteryHealth
                    }
                };
                setPayments(prev => [...prev, newPayment]);
                showToast('Produto de troca adicionado!', 'success');
            } else {
                showToast('Erro ao criar produto de troca.', 'error');
            }
        } catch (error: any) {
            showToast(error?.message || 'Erro ao criar produto de troca.', 'error');
        } finally {
            setIsTradeInProductModalOpen(false);
        }
    }, [selectedCustomerId, selectedSalespersonId, users, onAddProduct, showToast]);


    const handleSave = useCallback(async (targetStatus: 'Finalizada' | 'Pendente' = 'Finalizada') => {
        const isPending = targetStatus === 'Pendente';
        if (!selectedCustomerId || !selectedSalespersonId || cart.length === 0) {
            showToast('Preencha os campos obrigatórios (Cliente, Vendedor, Produtos) para salvar.', 'error');
            return;
        }

        if (!isPending && balance > 0.01) {
            showToast('Liquide o saldo para finalizar a venda.', 'error');
            return;
        }

        const baseSaleData = {
            customerId: selectedCustomerId,
            salespersonId: selectedSalespersonId,
            items: cart.map(item => ({ productId: item.id, quantity: item.quantity, unitPrice: item.salePrice })),
            subtotal, discount: totalItemDiscounts + globalDiscountAmount, total, payments,
            posTerminal: saleToEdit?.posTerminal || 'Caixa 1',
            status: isPending ? 'Pendente' : (saleToEdit && saleToEdit.status !== 'Pendente' ? 'Editada' : 'Finalizada'),
            origin: saleToEdit?.origin || (openCashSessionId ? 'PDV' : 'Balcão'), warrantyTerm, observations, internalObservations,
            cashSessionId: saleToEdit?.cashSessionId || openCashSessionId || undefined,
            cashSessionDisplayId: saleToEdit?.cashSessionDisplayId || openCashSessionDisplayId || undefined,
        };

        try {
            console.log('useSaleForm: Attempting to save sale. saleToEdit ID:', saleToEdit?.id);
            let savedSale: Sale;
            if (saleToEdit) {
                savedSale = await updateSale(
                    { ...saleToEdit, ...baseSaleData, status: baseSaleData.status as any, oldStatus: saleToEdit.status },
                    user?.id,
                    user?.name
                );
            } else {
                savedSale = await addSale(baseSaleData as any, user?.id, user?.name);
            }

            console.log('useSaleForm: Sale saved successfully:', savedSale.id);

            if (pendingTradeInProduct && savedSale) {
                const salesperson = users.find(u => u.id === selectedSalespersonId);
                await updateProduct({ ...pendingTradeInProduct, observations: `Troca pela venda #${savedSale.id}` }, user?.id || salesperson?.id, user?.name || salesperson?.name);

                // Add explicit audit log to link product to sale for history visibility
                await addAuditLog(
                    AuditActionType.STOCK_LAUNCH,
                    AuditEntityType.PRODUCT,
                    pendingTradeInProduct.id,
                    `Produto vinculado à venda de origem #${savedSale.id}. Usuário resp.: ${user?.name || salesperson?.name || 'Sistema'}`,
                    user?.id || salesperson?.id || 'system',
                    user?.name || salesperson?.name || 'Sistema'
                );
            }

            // Show success notification with appropriate color based on status
            if (isPending) {
                showToast(`Venda #${savedSale.id} salva como pendente.`, 'warning');
            } else {
                showToast(`Venda #${savedSale.id} finalizada com sucesso!`, 'success');
            }

            onSaleSaved(savedSale);

        } catch (error: any) {
            console.error('useSaleForm: Error in handleSave:', error);
            showToast(error.message || 'Erro ao salvar a venda.', 'error');
        }
    }, [
        selectedCustomerId, selectedSalespersonId, cart, balance, subtotal,
        totalItemDiscounts, globalDiscountAmount, total, payments, saleToEdit,
        warrantyTerm, observations, internalObservations, openCashSessionId,
        openCashSessionDisplayId, pendingTradeInProduct, users, onSaleSaved, showToast
    ]);

    return {
        state: {
            saleDate, selectedCustomerId, selectedSalespersonId, cart, productSearch,
            productToConfirm, searchQuantity, globalDiscountType, globalDiscountValue,
            cardFees, payments, warrantyTerm, observations, internalObservations,
            isCustomerModalOpen, isTradeInProductModalOpen, productForTradeIn,
            pendingTradeInProduct, localSuppliers, isCardPaymentModalOpen,
            cardTransactionType, cardMethodId, paymentInput,
            subtotal, totalItemDiscounts, globalDiscountAmount, total, totalPaid, balance
        },
        actions: {
            setSaleDate, setSelectedCustomerId, setSelectedSalespersonId, setCart, setProductSearch,
            setProductToConfirm, setSearchQuantity, setGlobalDiscountType, setGlobalDiscountValue,
            setWarrantyTerm, setObservations, setInternalObservations,
            setIsCustomerModalOpen, setIsCardPaymentModalOpen, setIsTradeInProductModalOpen, setPaymentInput,
            handleAddToCart, confirmAddToCart, handleRemoveFromCart, handleCartItemUpdate,
            handleOpenTradeInModal, handleRequestPayment, handleConfirmPayment,
            handleConfirmCardPayment, handleRemovePayment, handleSaveTradeInProduct, handleSaveTradeInFromModal, handleSave,

            resetState
        },
        refs: { productSearchRef }
    };
};
