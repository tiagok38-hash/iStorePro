
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { PurchaseOrder, Product, PurchaseItem, ProductConditionParameter, StorageLocationParameter, WarrantyParameter } from '../../types.ts';
import { useToast } from '../contexts/ToastContext.tsx';
import { useUser } from '../contexts/UserContext.tsx';
import { launchPurchaseToStock, formatCurrency, getProductConditions, getStorageLocations, getWarranties } from '../services/mockApi.ts';
import { SpinnerIcon, DocumentArrowUpIcon, XCircleIcon } from './icons.tsx';
import CurrencyInput from './CurrencyInput.tsx';

type ItemDetail = {
    purchaseItemId: string;
    itemDescription: string;
    serialNumber: string;
    imei1: string;
    imei2: string;
    condition: string;
    batteryHealth: number;
    warranty: string;
    storageLocation?: string;
    costPrice: number;
    additionalCostPrice: number;
    markup: number | null;
    salePrice: number | null;
    wholesalePrice: number | null; // Preço de Atacado (ATC)
    quantity: number;
    minimumStock?: number;
    isApple?: boolean;
    barcode?: string;
    controlByBarcode?: boolean;
};

const StockInModal: React.FC<{
    purchaseOrder: PurchaseOrder;
    onClose: (refresh: boolean) => void;
    allProducts: Product[];
    grades: any[];
    gradeValues: any[];
}> = ({ purchaseOrder, onClose, allProducts, grades, gradeValues }) => {
    const [details, setDetails] = useState<ItemDetail[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState<Record<number, boolean>>({});
    const [duplicateErrors, setDuplicateErrors] = useState<Record<number, Partial<Record<'serialNumber' | 'imei1' | 'imei2', boolean>>>>({});
    const [isMinimumStockEnabled, setIsMinimumStockEnabled] = useState(false);
    const { showToast } = useToast();
    const { user } = useUser();

    // Dynamic parameters from Empresa > Parâmetros
    const [conditionOptions, setConditionOptions] = useState<ProductConditionParameter[]>([]);
    const [locationOptions, setLocationOptions] = useState<StorageLocationParameter[]>([]);

    // Fetch dynamic parameters on mount
    useEffect(() => {
        const fetchParameters = async () => {
            const [conditions, locations] = await Promise.all([
                getProductConditions(),
                getStorageLocations()
            ]);
            setConditionOptions(conditions);
            setLocationOptions(locations);
        };
        fetchParameters();
    }, []);

    const isBulkMode = useMemo(() =>
        purchaseOrder.items.every(item => !item.hasImei),
        [purchaseOrder.items]);

    useEffect(() => {
        const launchedProductsForThisPO = allProducts.filter(p => p.purchaseOrderId === purchaseOrder.id);
        const expandedDetails = purchaseOrder.items.flatMap(item => {
            const launchedCount = launchedProductsForThisPO
                .filter(p => p.purchaseItemId === item.id)
                .reduce((sum, p) => sum + p.stock, 0);

            const quantityToLaunch = item.quantity - launchedCount;

            if (quantityToLaunch <= 0) {
                return [];
            }

            const baseDetail = {
                purchaseItemId: item.id,
                itemDescription: item.productDetails.model,
                serialNumber: '', imei1: '', imei2: '',
                condition: item.productDetails.condition || 'Novo',
                batteryHealth: 100,
                warranty: item.productDetails.warranty || '1 ano',
                storageLocation: item.productDetails.storageLocation || 'Estoque Principal',
                costPrice: item.unitCost,
                additionalCostPrice: item.additionalUnitCost,
                markup: null, salePrice: null, wholesalePrice: null,
                minimumStock: item.minimumStock,
                isApple: item.productDetails.brand === 'Apple',
                barcode: (item.barcodes && item.barcodes.length > 0) ? item.barcodes[0] : '',
                controlByBarcode: item.controlByBarcode
            };

            if (isBulkMode) {
                return [{
                    ...baseDetail,
                    quantity: quantityToLaunch,
                }];
            } else {
                return Array.from({ length: quantityToLaunch }, () => ({
                    ...baseDetail,
                    quantity: 1,
                }));
            }
        });

        if (expandedDetails.length === 0) {
            showToast("Todos os itens desta compra já foram lançados no estoque.", "info");
            onClose(false);
            return;
        }

        setDetails(expandedDetails);

        const hasMinStockEnabled = expandedDetails.some(d => !d.isApple && d.minimumStock && d.minimumStock > 0);
        setIsMinimumStockEnabled(hasMinStockEnabled);
    }, [purchaseOrder, allProducts, onClose, showToast, isBulkMode]);

    const handleDetailChange = (index: number, field: keyof ItemDetail, value: any) => {
        const newDetails = [...details];
        let detail = { ...newDetails[index] };

        // Clear duplicate error for this field if it exists
        if (duplicateErrors[index]?.[field as keyof typeof duplicateErrors[number]]) {
            const newErrors = { ...duplicateErrors };
            if (newErrors[index]) {
                delete newErrors[index]![field as keyof typeof duplicateErrors[number]];
                if (Object.keys(newErrors[index]!).length === 0) {
                    delete newErrors[index];
                }
                setDuplicateErrors(newErrors);
            }
        }

        if (field === 'markup') {
            const markupValue = value === '' ? null : parseFloat(String(value));
            if (isNaN(markupValue as number) && markupValue !== null) return;

            detail.markup = markupValue;
            const finalCost = detail.costPrice + detail.additionalCostPrice;
            if (finalCost > 0 && detail.markup !== null) {
                const calculatedPrice = finalCost * (1 + detail.markup / 100);
                detail.salePrice = parseFloat(calculatedPrice.toFixed(2));
                if (detail.salePrice > 0) {
                    setErrors(prev => ({ ...prev, [index]: false }));
                }
            }
        } else if (field === 'salePrice') {
            const salePriceValue = value === null ? null : Number(value);

            detail.salePrice = salePriceValue;
            const finalCost = detail.costPrice + detail.additionalCostPrice;
            if (finalCost > 0 && detail.salePrice !== null && detail.salePrice > 0) {
                const newMarkup = ((detail.salePrice / finalCost) - 1) * 100;
                detail.markup = isFinite(newMarkup) ? parseFloat(newMarkup.toFixed(2)) : 0;
            } else {
                detail.markup = null;
            }

            if (detail.salePrice !== null && detail.salePrice > 0) {
                setErrors(prev => ({ ...prev, [index]: false }));
            }

        } else if (field === 'batteryHealth') {
            let numericValue = parseInt(String(value), 10);
            if (isNaN(numericValue)) numericValue = 0;
            if (numericValue < 0) numericValue = 0;
            if (numericValue > 100) numericValue = 100;
            (detail as any)[field] = numericValue;
        } else if (field === 'minimumStock') {
            const numericValue = parseInt(String(value), 10);
            (detail as any)[field] = numericValue > 0 ? numericValue : 1;
        }
        else {
            (detail as any)[field] = value;
        }

        newDetails[index] = detail;
        setDetails(newDetails);
    };

    const handleToggleMinimumStock = (checked: boolean) => {
        setIsMinimumStockEnabled(checked);
        if (!checked) {
            setDetails(prevDetails => prevDetails.map(d => {
                const { minimumStock, ...rest } = d;
                return rest;
            }));
        } else {
            setDetails(prevDetails => prevDetails.map(d => {
                const originalItem = purchaseOrder.items.find(i => i.id === d.purchaseItemId);
                return {
                    ...d,
                    minimumStock: d.isApple ? undefined : (d.minimumStock || originalItem?.minimumStock || 1)
                }
            }));
        }
    };


    const handleLaunchStock = async () => {
        let hasError = false;
        const newDuplicateErrors: Record<number, Partial<Record<'serialNumber' | 'imei1' | 'imei2', boolean>>> = {};

        // Global tracking for duplicates within the current batch
        const seenImeis: { [key: string]: number[] } = {};
        const seenSerials: { [key: string]: number[] } = {};

        details.forEach((detail, index) => {
            // Check Serial Number
            const sn = detail.serialNumber?.trim();
            if (sn) {
                if (!seenSerials[sn]) seenSerials[sn] = [];
                seenSerials[sn].push(index);
            }

            // Check IMEI1
            const i1 = detail.imei1?.trim();
            if (i1) {
                if (!seenImeis[i1]) seenImeis[i1] = [];
                seenImeis[i1].push(index);
            }

            // Check IMEI2
            const i2 = detail.imei2?.trim();
            if (i2) {
                if (!seenImeis[i2]) seenImeis[i2] = [];
                seenImeis[i2].push(index);
            }
        });

        // Mark duplicates found in local check
        Object.values(seenSerials).forEach(indices => {
            if (indices.length > 1) {
                hasError = true;
                indices.forEach(idx => {
                    if (!newDuplicateErrors[idx]) newDuplicateErrors[idx] = {};
                    newDuplicateErrors[idx]!.serialNumber = true;
                });
            }
        });

        Object.values(seenImeis).forEach(indices => {
            if (indices.length > 1) {
                hasError = true;
                indices.forEach(idx => {
                    if (!newDuplicateErrors[idx]) newDuplicateErrors[idx] = {};
                    // Determine which field caused the collision for this row
                    const detail = details[idx];
                    if (detail.imei1 && seenImeis[detail.imei1] === indices) newDuplicateErrors[idx]!.imei1 = true;
                    if (detail.imei2 && seenImeis[detail.imei2] === indices) newDuplicateErrors[idx]!.imei2 = true;

                    // Simplified marking: if both exist and collide, mark both to be safe
                    if (detail.imei1 && seenImeis[detail.imei1].length > 1) newDuplicateErrors[idx]!.imei1 = true;
                    if (detail.imei2 && seenImeis[detail.imei2].length > 1) newDuplicateErrors[idx]!.imei2 = true;
                });
            }
        });

        if (hasError) {
            setDuplicateErrors(newDuplicateErrors);
            showToast('Foram encontrados números de série ou IMEIs duplicados nesta lista. Corrija os campos destacados.', 'error');
            return;
        }

        const newPriceErrors: Record<number, boolean> = {};
        let hasPriceError = false;
        for (const [index, detail] of details.entries()) {
            if (detail.salePrice === null || detail.salePrice <= 0) {
                newPriceErrors[index] = true;
                hasPriceError = true;
            }
        }

        setErrors(newPriceErrors);

        if (hasPriceError) {
            showToast('O preço de venda deve ser preenchido e maior que zero.', 'error');
            return;
        }

        setIsSaving(true);
        try {
            console.log('[StockInModal] Preparing products for launch...');
            const newProducts: (Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'sku'> & { purchaseItemId: string })[] = details.map(d => {
                const originalItem = purchaseOrder.items.find(i => i.id === d.purchaseItemId);
                if (!originalItem) {
                    console.error('[StockInModal] Item mismatch:', d.purchaseItemId, purchaseOrder.items);
                    throw new Error('Erro interno: Item da compra não encontrado durante o processamento.');
                }
                return {
                    brand: originalItem.productDetails.brand,
                    category: originalItem.productDetails.category,
                    model: originalItem.productDetails.model,
                    color: originalItem.productDetails.color,
                    price: d.salePrice!,
                    wholesalePrice: d.wholesalePrice || 0,
                    costPrice: d.costPrice,
                    additionalCostPrice: d.additionalCostPrice,
                    stock: d.quantity,
                    serialNumber: d.serialNumber,
                    imei1: d.imei1,
                    imei2: d.imei2,
                    batteryHealth: d.batteryHealth,
                    condition: d.condition,
                    warranty: d.warranty,
                    storageLocation: d.storageLocation,
                    purchaseItemId: d.purchaseItemId,
                    createdBy: user?.name || 'Keiler',
                    supplierId: purchaseOrder.supplierId,
                    origin: purchaseOrder.isCustomerPurchase ? 'Comprado de Cliente' : 'Compra',
                    minimumStock: (isMinimumStockEnabled && !d.isApple) ? d.minimumStock : undefined,
                    barcodes: d.barcode ? [d.barcode] : [],
                };
            });

            console.log('[StockInModal] Calling API...');
            await launchPurchaseToStock(purchaseOrder.id, newProducts);
            showToast(`Estoque da compra #${purchaseOrder.displayId} lançado com sucesso!`, 'success');
            onClose(true);
        } catch (error: any) {
            let message = error.message || 'Falha ao lançar estoque.';

            // Check for structured duplicate error from backend
            try {
                const errData = JSON.parse(message);
                if (errData.code === 'DUPLICATE_ENTRIES') {
                    const serverDupErrors: Record<number, Partial<Record<'serialNumber' | 'imei1' | 'imei2', boolean>>> = {};

                    details.forEach((detail, index) => {
                        const { duplicates } = errData;

                        // Check matches against server-reported duplicates
                        if (detail.imei1 && (duplicates.imei1.includes(detail.imei1) || duplicates.imei2.includes(detail.imei1))) {
                            if (!serverDupErrors[index]) serverDupErrors[index] = {};
                            serverDupErrors[index].imei1 = true;
                        }
                        if (detail.imei2 && (duplicates.imei2.includes(detail.imei2) || duplicates.imei1.includes(detail.imei2))) {
                            if (!serverDupErrors[index]) serverDupErrors[index] = {};
                            serverDupErrors[index].imei2 = true;
                        }
                        if (detail.serialNumber && duplicates.serialNumber.includes(detail.serialNumber)) {
                            if (!serverDupErrors[index]) serverDupErrors[index] = {};
                            serverDupErrors[index].serialNumber = true;
                        }
                    });

                    setDuplicateErrors(serverDupErrors);
                    message = 'Existem produtos já cadastrados no sistema com os mesmos IMEIs ou Serial Number. Verifique os campos destacados.';
                }
            } catch (e) {
                // Not a JSON error, treat as generic string
            }

            showToast(message, 'error');
            setIsSaving(false);
        }
    };

    const inputClasses = "w-full p-2 border rounded bg-transparent border-border focus:ring-success focus:border-success text-sm";

    const renderBulkMode = () => (
        <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted bg-surface-secondary sticky top-0">
                <tr>
                    <th className="p-2 min-w-[200px]">Descrição</th>
                    <th className="p-2 text-center">Qtd.</th>
                    <th className="p-2">Condição</th>
                    <th className="p-2">Local</th>
                    {isMinimumStockEnabled && <th className="p-2">Estoque Mín.</th>}
                    <th className="p-2">Preço de Custo</th>
                    <th className="p-2">Markup %</th>
                    <th className="p-2">Preço de Venda</th>
                    <th className="p-2">Preço ATC</th>
                </tr>
            </thead>
            <tbody>
                {details.map((detail, index) => (
                    <tr key={index} className="border-b border-border">
                        <td className="p-2">{detail.itemDescription}</td>
                        <td className="p-2 text-center">{detail.quantity}</td>
                        <td className="p-2">
                            <select
                                value={detail.condition}
                                onChange={(e) => handleDetailChange(index, 'condition', e.target.value)}
                                className={`${inputClasses} h-9`}
                            >
                                {conditionOptions.length === 0 ? <option>Carregando...</option> : <>
                                    {detail.condition && !conditionOptions.some(c => c.name.toLowerCase() === detail.condition?.toLowerCase()) && <option value={detail.condition}>{detail.condition}</option>}
                                    {conditionOptions.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                </>}
                            </select>
                        </td>
                        <td className="p-2">
                            <select
                                value={detail.storageLocation}
                                onChange={(e) => handleDetailChange(index, 'storageLocation', e.target.value)}
                                className={`${inputClasses} h-9`}
                            >
                                {locationOptions.length === 0 ? <option>Carregando...</option> : <>
                                    {detail.storageLocation && !locationOptions.some(l => l.name.toLowerCase() === detail.storageLocation?.toLowerCase()) && <option value={detail.storageLocation}>{detail.storageLocation}</option>}
                                    {locationOptions.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
                                </>}
                            </select>
                        </td>
                        {isMinimumStockEnabled && (
                            <td className="p-2">
                                <input
                                    type="number"
                                    disabled={detail.isApple}
                                    value={detail.minimumStock || ''}
                                    onChange={(e) => handleDetailChange(index, 'minimumStock', e.target.value)}
                                    className={`${inputClasses} h-9 w-20 text-center disabled:bg-gray-50`}
                                />
                            </td>
                        )}
                        <td className="p-2">{formatCurrency(detail.costPrice)}</td>
                        <td className="p-2 w-28">
                            <input
                                type="number"
                                step="0.01"
                                value={detail.markup === null ? '' : detail.markup}
                                onChange={e => handleDetailChange(index, 'markup', e.target.value)}
                                className={`${inputClasses} h-9`}
                            />
                        </td>
                        <td className="p-2 w-36">
                            <CurrencyInput
                                value={detail.salePrice}
                                onChange={val => handleDetailChange(index, 'salePrice', val)}
                                className={`${inputClasses} h-9 ${errors[index] ? 'border-danger' : ''}`}
                            />
                        </td>
                        <td className="p-2 w-36">
                            <CurrencyInput
                                value={detail.wholesalePrice}
                                onChange={val => handleDetailChange(index, 'wholesalePrice', val)}
                                className={`${inputClasses} h-9`}
                                placeholder="Opcional"
                            />
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );

    const renderUniqueMode = () => {
        const hasAppleItems = details.some(d => d.isApple && d.condition === 'Seminovo');

        return (
            <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted bg-surface-secondary sticky top-0">
                    <tr>
                        <th className="p-2">Descrição</th>
                        <th className="p-2">IMEI 1</th>
                        <th className="p-2">IMEI 2</th>
                        <th className="p-2">S/N</th>
                        <th className="p-2">Condição</th>
                        {hasAppleItems && <th className="p-2">Bateria %</th>}
                        <th className="p-2">Local</th>
                        {isMinimumStockEnabled && <th className="p-2">Estoque Mín.</th>}
                        <th className="p-2">Custo</th>
                        <th className="p-2">Markup %</th>
                        <th className="p-2">Venda</th>
                        <th className="p-2">ATC</th>
                    </tr>
                </thead>
                <tbody>
                    {details.map((detail, index) => (
                        <tr key={index} className="border-b border-border">
                            <td className="p-2 text-xs">{detail.itemDescription}</td>
                            <td className="p-2"><input type="text" value={detail.imei1} onChange={e => handleDetailChange(index, 'imei1', e.target.value)} className={`${inputClasses} h-9 ${duplicateErrors[index]?.imei1 ? 'border-danger bg-red-50' : ''}`} /></td>
                            <td className="p-2"><input type="text" value={detail.imei2} onChange={e => handleDetailChange(index, 'imei2', e.target.value)} className={`${inputClasses} h-9 ${duplicateErrors[index]?.imei2 ? 'border-danger bg-red-50' : ''}`} /></td>
                            <td className="p-2"><input type="text" value={detail.serialNumber} onChange={e => handleDetailChange(index, 'serialNumber', e.target.value)} className={`${inputClasses} h-9 ${duplicateErrors[index]?.serialNumber ? 'border-danger bg-red-50' : ''}`} /></td>
                            <td className="p-2"><select value={detail.condition} onChange={e => handleDetailChange(index, 'condition', e.target.value)} className={`${inputClasses} h-9`}>{conditionOptions.length === 0 ? <option>Carregando...</option> : <>{detail.condition && !conditionOptions.some(c => c.name.toLowerCase() === detail.condition?.toLowerCase()) && <option value={detail.condition}>{detail.condition}</option>}{conditionOptions.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</>}</select></td>
                            {hasAppleItems && (
                                <td className="p-2">
                                    {detail.isApple && detail.condition === 'Seminovo' ? (
                                        <input type="number" value={detail.batteryHealth} onChange={e => handleDetailChange(index, 'batteryHealth', e.target.value)} className={`${inputClasses} h-9 w-20 text-center`} />
                                    ) : (
                                        <span className="text-muted text-center block">-</span>
                                    )}
                                </td>
                            )}
                            <td className="p-2"><select value={detail.storageLocation} onChange={e => handleDetailChange(index, 'storageLocation', e.target.value)} className={`${inputClasses} h-9`}>{locationOptions.length === 0 ? <option>Carregando...</option> : <>{detail.storageLocation && !locationOptions.some(l => l.name.toLowerCase() === detail.storageLocation?.toLowerCase()) && <option value={detail.storageLocation}>{detail.storageLocation}</option>}{locationOptions.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}</>}</select></td>
                            {isMinimumStockEnabled && (
                                <td className="p-2">
                                    <input type="number" disabled={detail.isApple} value={detail.minimumStock || ''} onChange={e => handleDetailChange(index, 'minimumStock', e.target.value)} className={`${inputClasses} h-9 w-20 text-center disabled:bg-gray-50`} />
                                </td>
                            )}
                            <td className="p-2">{formatCurrency(detail.costPrice)}</td>
                            <td className="p-2 w-28"><input type="number" step="0.01" value={detail.markup === null ? '' : detail.markup} onChange={e => handleDetailChange(index, 'markup', e.target.value)} className={`${inputClasses} h-9`} /></td>
                            <td className="p-2 w-36"><CurrencyInput value={detail.salePrice} onChange={val => handleDetailChange(index, 'salePrice', val)} className={`${inputClasses} h-9 ${errors[index] ? 'border-danger' : ''}`} /></td>
                            <td className="p-2 w-32"><CurrencyInput value={detail.wholesalePrice} onChange={val => handleDetailChange(index, 'wholesalePrice', val)} className={`${inputClasses} h-9`} placeholder="Opc." /></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    };

    return createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[100] p-4">
            <div className="bg-surface rounded-lg shadow-xl w-full max-w-screen-2xl max-h-[95vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-border">
                    <div>
                        <h2 className="text-xl font-bold text-primary">Lançar Compra #{purchaseOrder.displayId} no Estoque</h2>
                        <p className="text-sm text-muted">Fornecedor: {purchaseOrder.supplierName}</p>
                    </div>
                    <button onClick={() => onClose(false)} className="p-1 text-muted hover:text-danger"><XCircleIcon className="h-6 w-6" /></button>
                </div>



                <div className="flex-1 overflow-auto border-t border-b border-border">
                    {isBulkMode ? renderBulkMode() : renderUniqueMode()}
                </div>

                <div className="flex justify-end items-center p-4 border-t border-border mt-auto">
                    <button onClick={handleLaunchStock} disabled={isSaving} className="px-6 py-2 bg-success text-white rounded-md hover:bg-success/90 font-semibold disabled:bg-muted flex items-center gap-2">
                        {isSaving ? <SpinnerIcon className="h-5 w-5" /> : <DocumentArrowUpIcon className="h-5 w-5" />}
                        Lançar no Estoque
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default StockInModal;
