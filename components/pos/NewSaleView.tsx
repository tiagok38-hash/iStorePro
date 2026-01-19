
import React, { useMemo } from 'react';
import {
    Product, Customer, User, Sale, PermissionProfile,
    Brand, Category, ProductModel, Grade, GradeValue,
    Supplier, ReceiptTermParameter, PaymentMethodParameter
} from '../../../types.ts';
import { formatCurrency } from '../../services/mockApi.ts';
import {
    PlusIcon, EditIcon, ShoppingCartIcon, CalculatorIcon, CreditCardIcon,
    TrashIcon, SearchIcon, XCircleIcon, CheckIcon, DeviceExchangeIcon
} from '../icons.tsx';
import SearchableDropdown from '../SearchableDropdown.tsx';
import CurrencyInput from '../CurrencyInput.tsx';
import CustomerModal from '../CustomerModal.tsx';
import ProductModal from '../ProductModal.tsx';
import CardPaymentModal from '../CardPaymentModal.tsx';
import TradeInModal from '../TradeInModal.tsx';

import { useSaleForm } from '../../hooks/useSaleForm.ts';
import { getPaymentIcon } from './utils.tsx';

interface NewSaleViewProps {
    onCancel: () => void;
    onSaleSaved: (sale: Sale) => void;
    customers: Customer[];
    users: User[];
    products: Product[];
    suppliers: Supplier[];
    permissionProfiles: PermissionProfile[];
    brands: Brand[];
    categories: Category[];
    productModels: ProductModel[];
    grades: Grade[];
    gradeValues: GradeValue[];
    receiptTerms: ReceiptTermParameter[];
    onAddNewCustomer: (data: any) => Promise<Customer | null>;
    onAddProduct: (data: any) => Promise<Product | null>;
    openCashSessionId?: string | null;
    openCashSessionDisplayId?: number;
    saleToEdit?: Sale | null;
    paymentMethods: PaymentMethodParameter[];
}

export const NewSaleView: React.FC<NewSaleViewProps> = (props) => {
    const {
        customers, users, products, brands, categories, productModels,
        grades, gradeValues, receiptTerms, paymentMethods, onAddNewCustomer
    } = props;

    const { state, actions, refs } = useSaleForm(props);

    const {
        saleDate, selectedCustomerId, selectedSalespersonId, cart, productSearch,
        productToConfirm, searchQuantity, globalDiscountType, globalDiscountValue,
        cardFees, payments, warrantyTerm, observations, internalObservations,
        isCustomerModalOpen, isTradeInProductModalOpen, productForTradeIn,
        localSuppliers, isCardPaymentModalOpen, cardTransactionType, cardMethodId,
        paymentInput, subtotal, totalItemDiscounts, globalDiscountAmount, total,
        totalPaid, balance
    } = state;

    const {
        setSaleDate, setSelectedCustomerId, setSelectedSalespersonId, setProductSearch,
        setSearchQuantity, setGlobalDiscountType, setGlobalDiscountValue,
        setWarrantyTerm, setObservations, setInternalObservations,
        setIsCustomerModalOpen, setIsCardPaymentModalOpen, setIsTradeInProductModalOpen, setPaymentInput,
        handleAddToCart, confirmAddToCart, handleRemoveFromCart, handleCartItemUpdate,
        handleRequestPayment, handleConfirmPayment, handleConfirmCardPayment,
        handleRemovePayment, handleSaveTradeInProduct, handleSaveTradeInFromModal, handleSave
    } = actions;


    const { productSearchRef } = refs;

    const filteredProducts = useMemo(() => {
        if (!productSearch) return [];
        const searchLower = productSearch.toLowerCase().trim();
        const cartProductIds = new Set(cart.map(item => item.id));

        return products.filter(p => {
            const isUnique = !!(p.serialNumber || p.imei1);
            if (isUnique && cartProductIds.has(p.id)) return false;

            const modelMatch = (p.model || '').toLowerCase().includes(searchLower);
            const imeiMatch = (p.imei1 || '').toLowerCase().includes(searchLower);
            const snMatch = (p.serialNumber || '').toLowerCase().includes(searchLower);

            return (modelMatch || imeiMatch || snMatch) && p.stock > 0;
        });
    }, [products, productSearch, cart]);

    const paymentButtons = useMemo(() => {
        const dynamic = [];
        const cardMethods = paymentMethods.filter(p => p.active && p.type === 'card');
        const otherMethods = paymentMethods.filter(p => p.active && p.type !== 'card');

        otherMethods.forEach(p => {
            const lowerName = p.name.toLowerCase();
            if (lowerName === 'débito' || lowerName === 'debito' || lowerName.includes('cartão débito') || lowerName.includes('cartão de débito')) return;
            dynamic.push({ label: p.name, icon: getPaymentIcon(p.name, p.type) });
        });

        if (cardMethods.length > 0) {
            dynamic.push({ label: 'Cartão', icon: <CreditCardIcon /> });
        }

        if (!dynamic.find(d => d.label === 'Aparelho na Troca')) {
            dynamic.push({ label: 'Aparelho na Troca', icon: <DeviceExchangeIcon /> });
        }
        return dynamic;
    }, [paymentMethods]);

    const inputClasses = "w-full px-3 border rounded-lg bg-gray-50 border-gray-300 text-sm h-9 focus:ring-2 focus:ring-success/20 outline-none transition-all font-semibold";
    const labelClasses = "block text-[10px] font-black text-gray-600 mb-1 uppercase tracking-wider";

    const totalFees = useMemo(() => payments.reduce((sum, p) => sum + (p.fees || 0), 0), [payments]);


    return (
        <>
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden animate-slide-up">
                <div className="p-4 space-y-4">
                    <section>
                        <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-100">
                            <h3 className="flex items-center gap-2 font-bold text-gray-800 uppercase text-xs tracking-widest"><EditIcon className="h-4 w-4 text-success" /> Dados da venda</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                            <div className="md:col-span-2"><label className={labelClasses}>Data</label><input type="date" value={saleDate} onChange={e => setSaleDate(e.target.value)} className={inputClasses} /></div>
                            <div className="md:col-span-7">
                                <label className={labelClasses}>Cliente Selecionado*</label>
                                <div className="flex items-center gap-2">
                                    <div className="flex-grow"><SearchableDropdown options={customers.map(c => ({ value: c.id, label: c.name }))} value={selectedCustomerId} onChange={setSelectedCustomerId} placeholder="Busque pelo nome do cliente..." /></div>
                                    <button type="button" onClick={() => setIsCustomerModalOpen(true)} className="px-3 bg-success-light text-success rounded-lg hover:bg-success hover:text-white transition-all h-9"><PlusIcon className="h-5 w-5" /></button>
                                </div>
                            </div>
                            <div className="md:col-span-3"><label className={labelClasses}>Vendedor*</label><select value={selectedSalespersonId} onChange={e => setSelectedSalespersonId(e.target.value)} className={inputClasses} disabled={!selectedCustomerId}><option value="">Selecione...</option>{users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
                        </div>
                    </section>

                    <fieldset disabled={!selectedCustomerId || !selectedSalespersonId} className="space-y-4 disabled:opacity-50 transition-opacity">
                        <section>
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="flex items-center gap-2 font-bold text-gray-800 uppercase text-xs tracking-widest"><ShoppingCartIcon className="h-4 w-4 text-success" /> Carrinho</h3>
                            </div>
                            <div className="flex items-end gap-2 mb-2">
                                <div className="flex-grow relative">
                                    <label className={labelClasses}>Pesquisar Produto (Modelo, IMEI, SN)</label>
                                    <div className="relative">
                                        <input ref={productSearchRef} type="text" value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="Ex: iPhone 14 Pro..." className={`${inputClasses} pl-9`} />
                                        <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
                                    </div>
                                    {filteredProducts.length > 0 && (
                                        <div className="absolute z-30 w-full bg-white border border-gray-200 rounded-xl mt-1 shadow-xl max-h-60 overflow-y-auto overflow-x-hidden">
                                            {filteredProducts.map(p => (
                                                <button key={p.id} onClick={() => { handleAddToCart(p); setProductSearch(''); }} className="w-full p-2.5 hover:bg-success-light text-left transition-colors border-b last:border-0 border-gray-50 flex justify-between items-center group">
                                                    <div>
                                                        <p className="font-bold text-gray-900 text-sm group-hover:text-success transition-colors">{p.model}</p>
                                                        <p className="text-[10px] text-muted">SN: {p.serialNumber} | IMEI: {p.imei1} | Est: {p.stock}</p>
                                                    </div>
                                                    <span className="font-bold text-primary text-xs">{formatCurrency(p.price)}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="w-20"><label className={labelClasses}>Qtd.</label><input type="number" value={searchQuantity} onChange={e => setSearchQuantity(Number(e.target.value))} min="1" className={`${inputClasses} text-center font-bold`} /></div>
                            </div>

                            <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50/30">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-100/80 text-gray-500 font-bold uppercase text-[10px] tracking-tighter">
                                        <tr className="text-left border-b border-gray-200">
                                            <th className="px-4 py-3">Item / Descrição</th>
                                            <th className="px-4 py-3 text-center">Qtd.</th>
                                            <th className="px-4 py-3 text-right">Unitário</th>
                                            <th className="px-4 py-3 text-right">Subtotal</th>
                                            <th className="px-4 py-3 text-center">Ação</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {cart.length === 0 ? (
                                            <tr><td colSpan={5} className="px-4 py-12 text-center text-muted italic">Carrinho vazio. Adicione produtos acima.</td></tr>
                                        ) : cart.map(item => (
                                            <tr key={item.id} className="bg-white hover:bg-gray-50/50 transition-colors">
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col">
                                                        <span className="font-black text-gray-900">{item.model}</span>

                                                        <div className="text-[10px] text-muted flex flex-col gap-0.5 mt-1">
                                                            {item.serialNumber && <span>SN: <span className="font-mono text-gray-600">{item.serialNumber}</span></span>}
                                                            {item.imei1 && <span>IMEI 1: <span className="font-mono text-gray-600">{item.imei1}</span></span>}
                                                            <div className="flex items-center gap-2">
                                                                {item.condition && <span>Condição: <span className="font-medium">{item.condition}</span></span>}
                                                                {item.batteryHealth !== undefined && item.batteryHealth !== null && (
                                                                    <>
                                                                        <span className="text-gray-300">|</span>
                                                                        <span>Saúde Bat.: <span className={`${item.batteryHealth < 80 ? 'text-red-500 font-bold' : 'text-green-600 font-bold'}`}>{item.batteryHealth}%</span></span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-center font-bold">{item.quantity}</td>
                                                <td className="px-4 py-3 text-right font-medium">{formatCurrency(item.salePrice)}</td>
                                                <td className="px-4 py-3 text-right font-black text-primary">{formatCurrency((item.salePrice || 0) * (item.quantity || 0))}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <button onClick={() => handleRemoveFromCart(item.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><XCircleIcon className="h-6 w-6" /></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                            <section className="lg:col-span-2">
                                <h3 className="flex items-center gap-2 font-bold text-gray-800 mb-2 pb-1 border-b border-gray-100 uppercase text-xs tracking-widest"><CalculatorIcon className="h-4 w-4 text-success" /> Financeiro</h3>

                                <div className="bg-white rounded-lg p-4 space-y-3 shadow-sm border border-gray-100">
                                    <div className="flex justify-between items-center text-gray-600">
                                        <span className="text-sm font-bold">Subtotal</span>
                                        <span className="text-base font-bold text-gray-800">{formatCurrency(subtotal)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-red-500 border-b border-gray-50 pb-3">
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-bold">Desconto</span>
                                            <div className="flex h-8">
                                                <select value={globalDiscountType} onChange={e => setGlobalDiscountType(e.target.value as any)} className="bg-gray-50 text-gray-700 text-xs px-2 rounded-l border border-gray-200 focus:ring-0 outline-none font-bold">
                                                    <option>R$</option><option>%</option>
                                                </select>
                                                <input type="number" value={globalDiscountValue} onChange={e => setGlobalDiscountValue(Number(e.target.value))} className="bg-gray-50 text-gray-700 w-20 text-xs px-2 rounded-r border border-l-0 border-gray-200 focus:ring-0 text-right font-bold outline-none" />
                                            </div>
                                        </div>
                                        <span className="text-base font-bold">-{formatCurrency(totalItemDiscounts + globalDiscountAmount)}</span>
                                    </div>
                                    {totalFees > 0 && (
                                        <div className="flex justify-between items-center text-blue-500 text-xs">
                                            <span className="font-bold uppercase tracking-wider">Juros (Maquininha)</span>
                                            <span className="font-bold">{formatCurrency(totalFees)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center pt-2 mt-1 border-t border-gray-100">
                                        <span className="text-lg uppercase font-black tracking-widest text-success">Total</span>
                                        <span className="text-3xl font-black text-gray-900">{formatCurrency(total)}</span>
                                    </div>
                                </div>

                            </section>

                            <section className="lg:col-span-3">

                                <h3 className="flex items-center gap-2 font-bold text-gray-800 mb-2 pb-1 border-b border-gray-100 uppercase text-xs tracking-widest"><CreditCardIcon className="h-4 w-4 text-success" /> Pagamento</h3>
                                <div className="space-y-2">
                                    <div className="flex flex-wrap gap-1.5">
                                        {paymentButtons.map(({ label, icon }) => (
                                            <button
                                                key={label}
                                                type="button"
                                                onClick={() => handleRequestPayment(label)}
                                                className="flex-grow min-w-[90px] p-2 rounded-lg border border-gray-200 hover:border-success hover:bg-success-light transition-all flex flex-col items-center gap-1 group"
                                            >
                                                <div className="p-1 rounded bg-gray-50 group-hover:bg-white transition-colors">{React.cloneElement(icon as React.ReactElement, { className: "h-4 w-4 text-gray-500 group-hover:text-success" })}</div>
                                                <span className="text-[10px] font-black uppercase text-gray-600 group-hover:text-success whitespace-nowrap">{label}</span>

                                            </button>
                                        ))}
                                    </div>

                                    {paymentInput && (
                                        <div className="p-2 bg-success-light border border-success/30 rounded-lg flex items-end gap-2 animate-slide-down">
                                            <div className="flex-grow">
                                                <label className="text-[9px] font-bold text-success-dark mb-1 block">Valor ({paymentInput.method})</label>
                                                <CurrencyInput value={paymentInput.amount} onChange={v => setPaymentInput(p => p ? { ...p, amount: v || 0 } : null)} className="h-8 text-sm border-success/50 bg-white" />
                                            </div>
                                            <button onClick={handleConfirmPayment} className="px-3 h-8 bg-success text-white rounded font-bold shadow-sm text-xs">OK</button>
                                            <button onClick={() => setPaymentInput(null)} className="px-3 h-8 bg-white text-gray-500 rounded font-bold border border-gray-200 text-xs">X</button>
                                        </div>
                                    )}

                                    <div className="rounded-lg border border-gray-100 overflow-hidden bg-white">
                                        <table className="w-full text-xs">
                                            <thead className="bg-gray-50">
                                                <tr className="text-left font-bold text-muted uppercase text-[9px]">
                                                    <th className="px-3 py-1.5">Método</th>
                                                    <th className="px-3 py-1.5 text-right">Valor</th>
                                                    <th className="px-3 py-1.5 text-center"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {payments.map(p => (
                                                    <tr key={p.id}>
                                                        <td className="px-3 py-1.5">
                                                            <div className="font-bold text-gray-700">{p.card || p.method}</div>
                                                            {/* Card payment details: installments and fee */}
                                                            {p.installments && p.installments > 0 && (
                                                                <div className="text-[10px] text-gray-500 font-medium mt-0.5">
                                                                    <span>{p.installments}x de {formatCurrency(p.installmentsValue || p.value / p.installments)}</span>
                                                                    {p.fees && p.fees > 0 && (
                                                                        <span className="ml-2">• Taxa: {formatCurrency(p.fees)} ({p.feePercentage?.toFixed(2)}%)</span>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {/* Trade-in details */}
                                                            {p.tradeInDetails && (
                                                                <div className="mt-1 p-1 bg-blue-50/50 rounded border border-blue-100/50">
                                                                    <span className="block font-bold text-gray-800 text-[11px] mb-0.5">{p.tradeInDetails.model}</span>
                                                                    <span className="block text-[10px] text-gray-600 font-medium">
                                                                        {p.tradeInDetails.imei1 ? `IMEI: ${p.tradeInDetails.imei1}` : `S/N: ${p.tradeInDetails.serialNumber}`}
                                                                        {p.tradeInDetails.batteryHealth ? ` | Bat: ${p.tradeInDetails.batteryHealth}%` : ''}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-1.5 text-right font-bold text-gray-900">{formatCurrency(p.value)}</td>
                                                        <td className="px-3 py-1.5 text-center">
                                                            <button onClick={() => handleRemovePayment(p.id)} className="text-red-400 hover:text-red-600"><TrashIcon className="h-3 w-3" /></button>
                                                        </td>
                                                    </tr>
                                                ))}

                                                {payments.length > 0 && (
                                                    <tr className="bg-success-light/30">
                                                        <td className="px-3 py-1.5 font-bold uppercase text-[9px] text-success">Pago</td>
                                                        <td className="px-3 py-1.5 text-right font-black text-success">{formatCurrency(totalPaid)}</td>
                                                        <td></td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className={`p-2 rounded-lg flex items-center justify-between font-bold uppercase tracking-widest text-[10px] border ${Math.abs(balance) < 0.01
                                        ? 'bg-success text-white border-transparent'
                                        : balance < 0
                                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                                            : 'bg-orange-50 text-orange-700 border-orange-200'
                                        }`}>
                                        <span>
                                            {Math.abs(balance) < 0.01 ? 'Pago' : balance < 0 ? 'Troco' : 'Pendente'}
                                        </span>
                                        <span>{formatCurrency(Math.abs(balance))}</span>
                                    </div>
                                </div>
                            </section>
                        </div>
                    </fieldset>
                </div>

                <div className="flex flex-col gap-3 p-4 bg-gray-50 border-t border-gray-200">
                    <div className="flex items-center gap-4 text-xs">
                        <div className="flex flex-col"><label className={labelClasses}>Garantia</label>
                            <select value={warrantyTerm} onChange={e => setWarrantyTerm(e.target.value)} className="p-2.5 border rounded-lg bg-white border-gray-300 text-sm font-bold outline-none focus:ring-2 focus:ring-success/20 h-10 min-w-[320px]">
                                {receiptTerms.map(term => (<option key={term.id} value={term.name}>{term.name}</option>))}
                            </select>
                        </div>

                        <div className="flex flex-col flex-grow"><label className={labelClasses}>Obs. Comprovante</label>
                            <input value={observations} onChange={e => setObservations(e.target.value)} className="p-2 border rounded-lg bg-white border-gray-300 text-sm font-medium w-full outline-none focus:ring-2 focus:ring-success/20 h-10" placeholder="Ex: Garantia estendida..." />
                        </div>
                        <div className="flex flex-col flex-grow"><label className={labelClasses}>Obs. Internas</label>
                            <input value={internalObservations} onChange={e => setInternalObservations(e.target.value)} className="p-2 border rounded-lg bg-white border-gray-300 text-sm font-medium w-full outline-none focus:ring-2 focus:ring-success/20 h-10" placeholder="Ex: Cliente exigente..." />
                        </div>

                    </div>
                    <div className="flex items-center justify-end gap-2">
                        <button onClick={props.onCancel} className="flex-1 max-w-[150px] h-11 bg-red-100 text-red-600 rounded-lg font-bold uppercase text-[10px] tracking-widest hover:bg-red-200 transition-all">Cancelar</button>
                        <button onClick={() => handleSave('Pendente')} disabled={cart.length === 0} className="flex-1 max-w-[150px] h-11 bg-orange-100 text-orange-600 rounded-lg font-bold uppercase text-[10px] tracking-widest hover:bg-orange-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed">Pendente</button>
                        <button onClick={() => handleSave('Finalizada')} disabled={cart.length === 0 || balance > 0.01} className="flex-1 max-w-[200px] h-11 bg-success text-white rounded-lg font-black uppercase text-xs tracking-widest shadow-lg shadow-success/20 hover:bg-success/90 transition-all disabled:bg-gray-300 disabled:shadow-none">Finalizar Venda</button>
                    </div>
                </div>
            </div>

            {isCustomerModalOpen && (
                <CustomerModal
                    entity={null}
                    initialType="Cliente"
                    onClose={() => setIsCustomerModalOpen(false)}
                    onSave={async (entityData, entityType, personType) => {
                        const customerPayload: any = { name: entityData.name, email: entityData.email, phone: entityData.phone, address: entityData.address, avatarUrl: entityData.avatarUrl };
                        if (personType === 'Pessoa Física') { customerPayload.cpf = entityData.cpf; customerPayload.rg = entityData.rg; customerPayload.birthDate = entityData.birthDate; }
                        const nc = await onAddNewCustomer(customerPayload);
                        if (nc) setSelectedCustomerId(nc.id);
                        setIsCustomerModalOpen(false);
                    }}
                />
            )}


            <ProductModal
                product={productForTradeIn}
                isOpen={isTradeInProductModalOpen}
                isTradeInMode={true}
                suppliers={localSuppliers}
                brands={brands}
                categories={categories}
                productModels={productModels}
                grades={grades}
                gradeValues={gradeValues}
                customers={customers}
                onClose={() => setIsTradeInProductModalOpen(false)}
                onSave={handleSaveTradeInProduct}
                onAddNewSupplier={async () => null}
            />


            <CardPaymentModal
                isOpen={isCardPaymentModalOpen}
                onClose={() => setIsCardPaymentModalOpen(false)}
                onConfirm={handleConfirmCardPayment}
                amountDue={balance > 0 ? balance : 0}
                initialTransactionType={cardTransactionType}
                initialMethodId={cardMethodId}
            />

            {productToConfirm && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                        <div className="bg-gray-50 border-b border-gray-100 p-4">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><CheckIcon className="h-6 w-6 text-primary" />Confirmar Produto</h3>
                        </div>
                        <div className="p-5 space-y-3">
                            <div>
                                <label className="block text-[10px] font-bold text-muted uppercase tracking-wider">Produto / Modelo</label>
                                <p className="text-base font-bold text-gray-900 leading-tight">{productToConfirm.model}</p>
                                {productToConfirm.origin === 'Troca' && (
                                    <span className="inline-block mt-1 px-2 py-0.5 text-[9px] font-bold rounded-full bg-blue-100 text-blue-700 uppercase">Aparelho de Troca</span>
                                )}
                            </div>

                            {/* IMEI, S/N, Saúde da Bateria */}
                            <div className="grid grid-cols-2 gap-2 text-[11px]">
                                {productToConfirm.imei1 && (
                                    <div className="p-2 bg-gray-50 rounded border border-gray-100">
                                        <span className="block text-[9px] font-bold text-muted uppercase">IMEI 1</span>
                                        <span className="font-mono font-medium text-gray-700">{productToConfirm.imei1}</span>
                                    </div>
                                )}
                                {productToConfirm.imei2 && (
                                    <div className="p-2 bg-gray-50 rounded border border-gray-100">
                                        <span className="block text-[9px] font-bold text-muted uppercase">IMEI 2</span>
                                        <span className="font-mono font-medium text-gray-700">{productToConfirm.imei2}</span>
                                    </div>
                                )}
                                {productToConfirm.serialNumber && (
                                    <div className="p-2 bg-gray-50 rounded border border-gray-100">
                                        <span className="block text-[9px] font-bold text-muted uppercase">Nº de Série</span>
                                        <span className="font-mono font-medium text-gray-700">{productToConfirm.serialNumber}</span>
                                    </div>
                                )}
                                {productToConfirm.batteryHealth !== undefined && productToConfirm.batteryHealth !== null && (
                                    <div className="p-2 bg-gray-50 rounded border border-gray-100">
                                        <span className="block text-[9px] font-bold text-muted uppercase">Saúde Bateria</span>
                                        <span className={`font-bold ${productToConfirm.batteryHealth < 80 ? 'text-red-500' : 'text-green-600'}`}>{productToConfirm.batteryHealth}%</span>
                                    </div>
                                )}
                            </div>

                            {/* Preço, Condição, Estoque, Garantia */}
                            <div className="grid grid-cols-4 gap-2">
                                <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
                                    <span className="block text-[9px] font-bold text-muted uppercase mb-0.5">Preço</span>
                                    <span className="font-black text-sm text-primary">{formatCurrency(productToConfirm.price)}</span>
                                </div>
                                <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
                                    <span className="block text-[9px] font-bold text-muted uppercase mb-0.5">Condição</span>
                                    <span className={`text-[10px] font-bold ${productToConfirm.condition === 'Novo' ? 'text-green-600' : 'text-blue-600'}`}>{productToConfirm.condition}</span>
                                </div>
                                <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
                                    <span className="block text-[9px] font-bold text-muted uppercase mb-0.5">Estoque</span>
                                    <span className="font-bold text-sm text-gray-700">{productToConfirm.stock}</span>
                                </div>
                                <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
                                    <span className="block text-[9px] font-bold text-muted uppercase mb-0.5">Garantia</span>
                                    <span className="text-[10px] font-medium text-gray-600">{productToConfirm.warranty || '-'}</span>
                                </div>
                            </div>

                            <div className="pt-3 border-t border-gray-100">
                                <div className="flex gap-3">
                                    <button onClick={() => actions.setProductToConfirm(null)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors text-sm">CANCELAR</button>
                                    <button onClick={confirmAddToCart} className="flex-1 py-2.5 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all transform active:scale-95 text-sm">CONFIRMAR</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default React.memo(NewSaleView);
