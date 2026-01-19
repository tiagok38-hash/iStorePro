import React, { useState, useEffect, useMemo } from 'react';
import { Customer, Product, ProductChecklist, ProductCondition, ProductConditionParameter, StorageLocationParameter, WarrantyParameter } from '../../types.ts';
import { findOrCreateSupplierFromCustomer, formatCurrency, getProductConditions, getStorageLocations, getWarranties } from '../services/mockApi.ts';
import { useToast } from '../contexts/ToastContext.tsx';
import { CloseIcon, PlusIcon, SpinnerIcon, PhotographIcon, TrashIcon } from './icons.tsx';
import CurrencyInput from './CurrencyInput.tsx';
import CameraModal from './CameraModal.tsx';

interface TradeInModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { tradeInValue: number; newProductData: any }) => Promise<void>;
    customer: Customer | null | undefined;
    products: Product[];
}

const checklistItems = [
    'Alto Falante (Auricular)', 'Alto Falante (Viva Voz)', 'Aparelho não pode ser ligado', 'Bateria',
    'Biometria / Touch ID', 'Botão Power (Liga/Desliga)', 'Botão Volume (Aumentar/Diminuir)',
    'Câmera Frontal', 'Câmera Traseira', 'Carcaça / Gabinete', 'Chave Seletora (Silênciar)',
    'Conector de Carga', 'Display / Tela / Touch', 'Face ID', 'Microfone', 'Parafusos',
    'Sensor de Proximidade', 'Sinal de Rede (Operadora)', 'Wi-Fi / Bluetooth', 'Tampa Traseira'
];

const accessoryItems = [
    'Caixa Original', 'Carregador', 'Cabo USB', 'Fone de Ouvido', 'Nota Fiscal', 'Capa', 'Película'
];

const TradeInModal: React.FC<TradeInModalProps> = ({ isOpen, onClose, onSave, customer, products }) => {
    const [activeTab, setActiveTab] = useState<'aparelho' | 'checklist' | 'fotos_acessorios'>('aparelho');
    const { showToast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [isCameraOpen, setIsCameraOpen] = useState(false);

    // Dynamic parameters from Empresa > Parâmetros
    const [conditionOptions, setConditionOptions] = useState<ProductConditionParameter[]>([]);
    const [locationOptions, setLocationOptions] = useState<StorageLocationParameter[]>([]);
    const [warrantyOptions, setWarrantyOptions] = useState<WarrantyParameter[]>([]);

    // Fetch dynamic parameters on mount
    useEffect(() => {
        const fetchParameters = async () => {
            const [conditions, locations, warranties] = await Promise.all([
                getProductConditions(),
                getStorageLocations(),
                getWarranties()
            ]);
            setConditionOptions(conditions);
            setLocationOptions(locations);
            setWarrantyOptions(warranties);
        };
        fetchParameters();
    }, []);

    const [deviceData, setDeviceData] = useState({
        supplierName: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        origin: 'Nacional',
        condition: 'Seminovo' as ProductCondition,
        storageLocation: '',
        brand: 'Apple',
        category: 'Selecione uma opção...',
        model: '',
        color: '',
        imei1: '',
        imei2: '',
        serialNumber: '',
        barcode: '',
        warranty: '',
        batteryHealth: 100,
        costPrice: 0,
        additionalCostPrice: 0,
        markup: 0,
        salePrice: 0,
        observations: '',
    });

    const [checklistData, setChecklistData] = useState<{
        toggles: Record<string, boolean>;
        notes: string;
        services: string;
        date: string;
        repairCost: number;
    }>({
        toggles: checklistItems.reduce((acc, item) => ({ ...acc, [item]: false }), {}),
        notes: '',
        services: '',
        date: new Date().toISOString().split('T')[0],
        repairCost: 0,
    });

    const [accessoriesData, setAccessoriesData] = useState<Record<string, boolean>>(
        accessoryItems.reduce((acc, item) => ({ ...acc, [item]: false }), {})
    );

    const [photos, setPhotos] = useState<string[]>([]);

    useEffect(() => {
        if (customer) {
            setDeviceData(prev => ({
                ...prev,
                supplierName: customer.name,
                observations: `Produto entrou a base de troca a partir da Venda ID# ${Math.floor(1000 + Math.random() * 9000)} de ${customer.name}.`
            }));
        }
    }, [customer]);

    useEffect(() => {
        setDeviceData(prev => ({ ...prev, additionalCostPrice: checklistData.repairCost }));
    }, [checklistData.repairCost]);

    const finalCost = useMemo(() => deviceData.costPrice + deviceData.additionalCostPrice, [deviceData.costPrice, deviceData.additionalCostPrice]);
    const suggestedPrice = useMemo(() => finalCost * (1 + (deviceData.markup / 100)), [finalCost, deviceData.markup]);

    const handleDeviceChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setDeviceData(prev => ({ ...prev, [name]: value }));
    };

    const handleNumericDeviceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setDeviceData(prev => ({ ...prev, [name]: Number(value) || 0 }));
    };

    const handleChecklistToggle = (item: string) => {
        setChecklistData(prev => ({
            ...prev,
            toggles: { ...prev.toggles, [item]: !prev.toggles[item] }
        }));
    };

    const handleAccessoryToggle = (item: string) => {
        setAccessoriesData(prev => ({ ...prev, [item]: !prev[item] }));
    };

    const handleAddPhoto = (imageData: string) => {
        if (photos.length >= 6) {
            showToast('Limite de 6 fotos atingido.', 'error');
            return;
        }
        setPhotos(prev => [...prev, imageData]);
        setIsCameraOpen(false);
    };

    const handleRemovePhoto = (index: number) => {
        setPhotos(prev => prev.filter((_, i) => i !== index));
    };

    const handleSaveClick = async () => {
        if (!customer) {
            showToast('Cliente não encontrado.', 'error');
            return;
        }
        if (!deviceData.serialNumber && !deviceData.imei1) {
            showToast('Preencha o Serial Number ou IMEI 1.', 'error');
            return;
        }
        if (deviceData.costPrice <= 0) {
            showToast('O "Custo do Produto" (valor da troca) deve ser maior que zero.', 'error');
            return;
        }
        if (deviceData.salePrice <= 0) {
            showToast('O "Preço de Venda" deve ser maior que zero.', 'error');
            return;
        }
        if (!deviceData.storageLocation || deviceData.storageLocation === 'Selecione...') {
            showToast('Selecione o Local de Estoque.', 'error');
            return;
        }
        if (!deviceData.warranty || deviceData.warranty === 'Selecione...') {
            showToast('Selecione o Tempo de Garantia.', 'error');
            return;
        }

        setIsSaving(true);

        try {
            const supplier = await findOrCreateSupplierFromCustomer(customer);
            const fullModel = `${deviceData.brand} ${deviceData.category} ${deviceData.model} ${deviceData.color}`.trim();

            const checklist: ProductChecklist = {
                ...checklistData.toggles,
                notes: checklistData.notes,
                services: checklistData.services,
                checklistDate: checklistData.date,
                repairCost: checklistData.repairCost,
            };

            const selectedAccessories = Object.entries(accessoriesData)
                .filter(([_, checked]) => checked)
                .map(([name]) => name);

            const newProductData = {
                brand: deviceData.brand,
                category: deviceData.category,
                model: fullModel,
                price: deviceData.salePrice,
                costPrice: deviceData.costPrice,
                additionalCostPrice: deviceData.additionalCostPrice,
                markup: deviceData.markup,
                stock: 1,
                serialNumber: deviceData.serialNumber,
                imei1: deviceData.imei1,
                imei2: deviceData.imei2,
                batteryHealth: deviceData.batteryHealth,
                condition: deviceData.condition,
                warranty: deviceData.warranty,
                color: deviceData.color,
                storageLocation: deviceData.storageLocation,
                barcodes: deviceData.barcode ? [deviceData.barcode] : [],
                supplierId: supplier.id, // This is the Trade-In Customer as Supplier ID
                supplierName: deviceData.supplierName, // Required for Stock History log details
                origin: 'Troca' as const,
                createdBy: 'Vendedor', // Mocked
                checklist,
                selectedCustomerId: customer.id, // For history tracking
                photos: photos,
                accessories: selectedAccessories,
            };

            await onSave({ tradeInValue: deviceData.costPrice, newProductData });

        } catch (error) {
            showToast('Erro ao processar a troca.', 'error');
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    const inputClasses = "w-full p-2 border rounded bg-transparent border-border focus:ring-success focus:border-success text-sm h-10";
    const labelClasses = "block text-xs font-medium text-muted mb-1";
    const tabClasses = (tabName: 'aparelho' | 'checklist' | 'fotos_acessorios') =>
        `px-4 py-2 text-sm font-semibold rounded-md ${activeTab === tabName ? 'bg-primary text-white' : 'bg-gray-200 text-secondary'}`;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[60] p-4">
            <div className="bg-surface rounded-lg shadow-xl w-full max-w-4xl max-h-[95vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-border">
                    <div className="flex items-center gap-2">
                        <button onClick={() => setActiveTab('aparelho')} className={tabClasses('aparelho')}>APARELHO</button>
                        <button onClick={() => setActiveTab('checklist')} className={tabClasses('checklist')}>CHECKLIST</button>
                        <button onClick={() => setActiveTab('fotos_acessorios')} className={tabClasses('fotos_acessorios')}>FOTOS E OPCIONAIS</button>
                    </div>
                    <button onClick={onClose} className="p-1 text-muted hover:text-danger"><CloseIcon className="h-6 w-6" /></button>
                </div>

                {activeTab === 'aparelho' && (
                    <div className="p-6 space-y-4 overflow-y-auto">
                        <h3 className="font-semibold text-lg flex items-center gap-2"><PlusIcon /> Aparelho para troca</h3>
                        <div className="text-sm text-primary bg-blue-50 p-3 rounded-md border border-blue-200 text-center">
                            Para cadastrar Marcas, Categorias, e Grades, <a href="/#/company?tab=marcas" target="_blank" rel="noopener noreferrer" className="font-semibold underline hover:text-blue-700">clique aqui</a>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div className="col-span-2 md:col-span-1"><label className={labelClasses}>Código de Barras</label><input name="barcode" value={deviceData.barcode} onChange={handleDeviceChange} className={inputClasses} placeholder="Escaneie aqui..." autoFocus /></div>
                            <div className="col-span-2 md:col-span-1"><label className={labelClasses}>Fornecedor*</label><input value={deviceData.supplierName} className={`${inputClasses} bg-gray-100`} disabled /></div>
                            <div><label className={labelClasses}>Data da compra*</label><input type="date" name="purchaseDate" value={deviceData.purchaseDate} onChange={handleDeviceChange} className={inputClasses} /></div>
                            <div><label className={labelClasses}>Origem*</label><select name="origin" value={deviceData.origin} onChange={handleDeviceChange} className={inputClasses}><option>Nacional</option><option>Importado</option></select></div>
                            <div><label className={labelClasses}>Local de Estoque*</label><select name="storageLocation" value={deviceData.storageLocation} onChange={handleDeviceChange} className={`${inputClasses} ${(!deviceData.storageLocation || deviceData.storageLocation === 'Selecione...') ? 'border-red-500' : ''}`}><option value="">Selecione...</option>{deviceData.storageLocation && deviceData.storageLocation !== 'Selecione...' && !locationOptions.some(l => l.name.toLowerCase() === deviceData.storageLocation?.toLowerCase()) && <option value={deviceData.storageLocation}>{deviceData.storageLocation}</option>}{locationOptions.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}</select></div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
                            <div><label className={labelClasses}>Marca*</label><input value={deviceData.brand} className={`${inputClasses} bg-gray-100`} disabled /></div>
                            <div><label className={labelClasses}>Categoria*</label><select name="category" value={deviceData.category} onChange={handleDeviceChange} className={inputClasses}><option>Selecione uma opção...</option><option>iPhone</option><option>iPad</option><option>MacBook</option></select></div>
                            <div><label className={labelClasses}>Modelo*</label><input name="model" value={deviceData.model} onChange={handleDeviceChange} className={inputClasses} /></div>
                            <div><label className={labelClasses}>Cor*</label><input name="color" value={deviceData.color} onChange={handleDeviceChange} className={inputClasses} /></div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 items-end">
                            <div className="col-span-2 md:col-span-1"><label className={labelClasses}>IMEI1</label><input name="imei1" value={deviceData.imei1} onChange={handleDeviceChange} className={inputClasses} /></div>
                            <div className="col-span-2 md:col-span-1"><label className={labelClasses}>IMEI2</label><input name="imei2" value={deviceData.imei2} onChange={handleDeviceChange} className={inputClasses} /></div>
                            <div className="col-span-2 md:col-span-1"><label className={labelClasses}>Serial Number (SN)</label><input name="serialNumber" value={deviceData.serialNumber} onChange={handleDeviceChange} className={inputClasses} /></div>
                            <div><label className={labelClasses}>Garantia*</label><select name="warranty" value={deviceData.warranty} onChange={handleDeviceChange} className={`${inputClasses} ${(!deviceData.warranty || deviceData.warranty === 'Selecione...') ? 'border-red-500' : ''}`}><option value="">Selecione...</option>{deviceData.warranty && deviceData.warranty !== 'Selecione...' && !warrantyOptions.some(w => w.name.toLowerCase() === deviceData.warranty?.toLowerCase()) && <option value={deviceData.warranty}>{deviceData.warranty}</option>}{warrantyOptions.map(w => <option key={w.id} value={w.name}>{w.name}</option>)}</select></div>
                            <div><label className={labelClasses}>Saúde Bateria</label><input name="batteryHealth" type="number" value={deviceData.batteryHealth} onChange={handleNumericDeviceChange} className={inputClasses} /></div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 items-end pt-4 border-t">
                            <div><label className={labelClasses}>Custo do Produto (un)*</label><CurrencyInput value={deviceData.costPrice} onChange={v => setDeviceData(p => ({ ...p, costPrice: v || 0 }))} className={`${inputClasses} border-red-500`} /></div>
                            <div><label className={labelClasses}>Custos Adicionais (un)</label><CurrencyInput value={deviceData.additionalCostPrice} onChange={v => setDeviceData(p => ({ ...p, additionalCostPrice: v || 0 }))} className={inputClasses} /></div>
                            <div><label className={labelClasses}>Custo Final (un)</label><div className={`${inputClasses} bg-gray-100 flex items-center`}>{formatCurrency(finalCost)}</div></div>
                            <div><label className={labelClasses}>Markup %</label><input name="markup" type="number" value={deviceData.markup} onChange={handleNumericDeviceChange} className={inputClasses} /></div>
                            <div><label className={labelClasses}>Preço Sugerido</label><div className={`${inputClasses} bg-gray-100 flex items-center`}>{formatCurrency(suggestedPrice)}</div></div>
                            <div><label className={labelClasses}>Preço de Venda*</label><CurrencyInput value={deviceData.salePrice} onChange={v => setDeviceData(p => ({ ...p, salePrice: v || 0 }))} className={`${inputClasses} border-red-500`} /></div>
                        </div>
                        <div><label className={labelClasses}>Observações:</label><textarea name="observations" value={deviceData.observations} onChange={handleDeviceChange} rows={3} className={inputClasses.replace('h-10', '')} /></div>
                    </div>
                )}

                {activeTab === 'checklist' && (
                    <div className="p-6 space-y-4 overflow-y-auto">
                        <h3 className="font-semibold text-lg flex items-center gap-2">Checklist de produtos Seminovo</h3>
                        <p className="text-sm text-yellow-600 bg-yellow-100 p-2 rounded-md">Marque as opções que apresentam defeito ou avaria.</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2">
                            {checklistItems.map(item => (
                                <label key={item} className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={checklistData.toggles[item]} onChange={() => handleChecklistToggle(item)} className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent" />
                                    <span className="text-sm">{item}</span>
                                </label>
                            ))}
                        </div>
                        <div className="space-y-4 pt-4 border-t">
                            <div><label className={labelClasses}>Anotações do Checklist:</label><textarea value={checklistData.notes} onChange={e => setChecklistData(p => ({ ...p, notes: e.target.value }))} rows={2} className={inputClasses.replace('h-10', '')} placeholder="Utilize este campo para anotar observações do checklist que não estão listados acima OU detalhar os campos marcados acima." /></div>
                            <div><label className={labelClasses}>Descrição do(s) serviço(s):</label><textarea value={checklistData.services} onChange={e => setChecklistData(p => ({ ...p, services: e.target.value }))} rows={2} className={inputClasses.replace('h-10', '')} placeholder="Utilize este campo para anotar os serviços que serão executados." /></div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div><label className={labelClasses}>Data do Checklist:</label><input type="date" value={checklistData.date} onChange={e => setChecklistData(p => ({ ...p, date: e.target.value }))} className={inputClasses} /></div>
                                <div>
                                    <label className={labelClasses}>Custo de Reparo:</label>
                                    <CurrencyInput value={checklistData.repairCost} onChange={v => setChecklistData(p => ({ ...p, repairCost: v || 0 }))} className={inputClasses} />
                                </div>
                                <div className="text-xs text-muted bg-gray-100 p-2 rounded-md">
                                    <strong>Obs:</strong> Insira o custo de reparo no campo "Custo Adicionais" para que o custo do produto seja somado com o custo de reparo.
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'fotos_acessorios' && (
                    <div className="p-6 space-y-6 overflow-y-auto">
                        <section>
                            <h3 className="font-semibold text-lg flex items-center gap-2 mb-3">Itens Inclusos / Acessórios</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 bg-gray-50 p-4 rounded-lg border border-gray-100">
                                {accessoryItems.map(item => (
                                    <label key={item} className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={accessoriesData[item]} onChange={() => handleAccessoryToggle(item)} className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent" />
                                        <span className="text-sm">{item}</span>
                                    </label>
                                ))}
                            </div>
                        </section>

                        <section>
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="font-semibold text-lg flex items-center gap-2"><PhotographIcon /> Fotos do Aparelho</h3>
                                <span className="text-sm text-muted">{photos.length} / 6 fotos</span>
                            </div>

                            <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                                {photos.map((photo, index) => (
                                    <div key={index} className="relative group aspect-square border rounded-md overflow-hidden bg-gray-100 shadow-sm">
                                        <img src={photo} alt={`Foto ${index + 1}`} className="w-full h-full object-cover" />
                                        <button
                                            onClick={() => handleRemovePhoto(index)}
                                            className="absolute top-1 right-1 p-1 bg-white/80 text-danger rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                                            title="Remover foto"
                                        >
                                            <TrashIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                                {photos.length < 6 && (
                                    <button
                                        onClick={() => setIsCameraOpen(true)}
                                        className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-md text-muted hover:border-primary hover:text-primary transition-colors bg-gray-50 hover:bg-white"
                                    >
                                        <PlusIcon className="h-8 w-8 mb-1" />
                                        <span className="text-xs font-medium">Adicionar Foto</span>
                                    </button>
                                )}
                            </div>
                        </section>
                    </div>
                )}

                <div className="flex justify-end items-center p-4 border-t border-border mt-auto">
                    <button type="button" onClick={handleSaveClick} disabled={isSaving} className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary/90 font-semibold disabled:bg-muted">
                        {isSaving ? <SpinnerIcon className="h-5 w-5" /> : 'Salvar'}
                    </button>
                </div>
            </div>

            <CameraModal
                isOpen={isCameraOpen}
                onClose={() => setIsCameraOpen(false)}
                onCapture={handleAddPhoto}
            />
        </div>
    );
};

export default TradeInModal;