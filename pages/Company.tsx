
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Brand, Category, ProductModel, Grade, GradeValue, User, AuditLog, AuditActionType, AuditEntityType, ProductConditionParameter, StorageLocationParameter, WarrantyParameter, PaymentMethodParameter, CardConfigData, Address, PermissionProfile, ReceiptTermParameter, PermissionSet, CompanyInfo, Sale, PurchaseOrder, Product } from '../types.ts';
import {
    getBrands, addBrand, updateBrand, deleteBrand,
    getCategories, addCategory, updateCategory, deleteCategory,
    getSales, getProducts, getPurchaseOrders,
    getProductModels, addProductModel, updateProductModel, deleteProductModel,
    getGrades, addGrade, updateGrade, deleteGrade,
    getGradeValues, addGradeValue, updateGradeValue, deleteGradeValue,
    getUsers,
    getAuditLogs,
    formatPhone,
    getProductConditions, addProductCondition, updateProductCondition, deleteProductCondition,
    getStorageLocations, addStorageLocation, updateStorageLocation, deleteStorageLocation,
    getWarranties, addWarranty, updateWarranty, deleteWarranty,
    getPaymentMethods, addPaymentMethod, updatePaymentMethod, deletePaymentMethod,
    updateUser, getPermissionProfiles,
    getReceiptTerms, addReceiptTerm, updateReceiptTerm, deleteReceiptTerm,
    getCompanyInfo, updateCompanyInfo,
    getFullBackup, restoreFullBackup
} from '../iStorePro/services/mockApi.ts';
import { useToast } from '../contexts/ToastContext.tsx';
import {
    SpinnerIcon, EditIcon, TrashIcon, PlusIcon, ShoppingCartIcon, XCircleIcon,
    CalculatorIcon, ArchiveBoxIcon, CheckIcon, UserCircleIcon, InfoIcon,
    PhotographIcon, CameraIcon, DocumentArrowUpIcon, ErrorIcon
} from '../components/icons.tsx';
import ConfirmationModal from '../components/ConfirmationModal.tsx';
import CardConfigModal from '../components/CardConfigModal.tsx';
import Users from './Users.tsx';
import SubcategoryModal from '../components/SubcategoryModal.tsx';
import { useUser } from '../contexts/UserContext.tsx';
import ReceiptTermModal from '../components/ReceiptTermModal.tsx';
import CameraModal from '../components/CameraModal.tsx';
import PaymentMethodModal from '../components/PaymentMethodModal.tsx';
import Button from '../components/Button.tsx';
import { toDateValue, formatTimeBR, formatRelativeDate } from '../iStorePro/utils/dateUtils.ts';

type ModalType = 'brand' | 'category' | 'model' | 'grade' | 'gradeValue';
type Item = Brand | Category | ProductModel | Grade | GradeValue;

// --- DADOS DA EMPRESA TAB ---

const DadosEmpresaTab: React.FC = () => {
    const { showToast } = useToast();
    const { permissions, user } = useUser();
    const [companyData, setCompanyData] = useState<Partial<CompanyInfo>>({});
    const [loading, setLoading] = useState(true);
    const logoInputRef = React.useRef<HTMLInputElement>(null);

    useEffect(() => {
        setLoading(true);
        getCompanyInfo().then(info => {
            setCompanyData(info);
        }).finally(() => setLoading(false));
    }, []);

    const canEdit = permissions?.canManageCompanyData;

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setCompanyData(prev => ({ ...prev, logoUrl: reader.result as string }));
                showToast('Logo atualizada. Lembre-se de salvar as alterações.', 'info');
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'whatsapp') {
            setCompanyData(prev => ({ ...prev, [name]: formatPhone(value) }));
        } else {
            setCompanyData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleClearAddress = () => {
        setCompanyData(prev => ({
            ...prev, cep: '', address: '', numero: '', complemento: '', bairro: '', city: '', state: ''
        }));
    };

    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateCompanyInfo(companyData as CompanyInfo);
            showToast('Dados da empresa salvos com sucesso!', 'success');
        } catch (error) {
            showToast('Erro ao salvar os dados da empresa.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const inputClasses = "w-full p-2 border rounded bg-transparent border-border focus:ring-success focus:border-success text-sm h-10 disabled:bg-gray-100";
    const labelClasses = "block text-sm font-medium text-primary mb-1";

    if (loading) return <div className="flex justify-center items-center p-8"><SpinnerIcon /></div>;

    return (
        <div className="bg-surface rounded-lg border border-border p-6 space-y-6">
            <div className="flex flex-col lg:flex-row gap-8">
                {/* Forms */}
                <div className="flex-1 space-y-6">
                    <div className="p-4 border rounded-lg space-y-4">
                        <h3 className="font-semibold text-primary">Dados Principais</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div><label className={labelClasses}>Nome Fantasia</label><input name="name" value={companyData.name || ''} onChange={handleInputChange} className={inputClasses} disabled={!canEdit} /></div>
                            <div><label className={labelClasses}>Razão Social</label><input name="razaoSocial" value={companyData.razaoSocial || ''} onChange={handleInputChange} className={inputClasses} disabled={!canEdit} /></div>
                            <div><label className={labelClasses}>CNPJ / CPF</label><input name="cnpj" value={companyData.cnpj || ''} onChange={handleInputChange} className={inputClasses} disabled={!canEdit} /></div>
                            <div><label className={labelClasses}>Inscrição Estadual</label><input name="inscricaoEstadual" value={companyData.inscricaoEstadual || ''} onChange={handleInputChange} className={inputClasses} disabled={!canEdit} /></div>
                        </div>
                    </div>
                    <div className="p-4 border rounded-lg space-y-4">
                        <h3 className="font-semibold text-primary">Contato</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div><label className={labelClasses}>WhatsApp</label><input name="whatsapp" value={companyData.whatsapp || ''} onChange={handleInputChange} className={inputClasses} maxLength={15} disabled={!canEdit} /></div>
                            <div><label className={labelClasses}>Email</label><input name="email" type="email" value={companyData.email || ''} onChange={handleInputChange} className={inputClasses} disabled={!canEdit} /></div>
                        </div>
                    </div>
                    <div className="p-4 border rounded-lg space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-semibold text-primary">Endereço</h3>
                            {canEdit && <button onClick={handleClearAddress} className="text-sm text-accent p-1 rounded-md hover:bg-accent-light">Limpar</button>}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                            <div className="sm:col-span-1"><label className={labelClasses}>CEP</label><input name="cep" value={companyData.cep || ''} onChange={handleInputChange} className={inputClasses} disabled={!canEdit} /></div>
                            <div className="sm:col-span-3"><label className={labelClasses}>Logradouro</label><input name="address" value={companyData.address || ''} onChange={handleInputChange} className={inputClasses} disabled={!canEdit} /></div>
                            <div className="sm:col-span-1"><label className={labelClasses}>Número</label><input name="numero" value={companyData.numero || ''} onChange={handleInputChange} className={inputClasses} disabled={!canEdit} /></div>
                            <div className="sm:col-span-1"><label className={labelClasses}>Complemento</label><input name="complemento" value={companyData.complemento || ''} onChange={handleInputChange} className={inputClasses} disabled={!canEdit} /></div>
                            <div className="sm:col-span-2"><label className={labelClasses}>Bairro</label><input name="bairro" value={companyData.bairro || ''} onChange={handleInputChange} className={inputClasses} disabled={!canEdit} /></div>
                            <div className="sm:col-span-3"><label className={labelClasses}>Cidade</label><input name="city" value={companyData.city || ''} onChange={handleInputChange} className={inputClasses} disabled={!canEdit} /></div>
                            <div className="sm:col-span-1"><label className={labelClasses}>UF</label><select name="state" value={companyData.state || ''} onChange={handleInputChange} className={inputClasses} disabled={!canEdit}><option>PE</option></select></div>
                        </div>
                    </div>
                </div>
                {/* Logo */}
                <div className="w-full lg:w-52 flex-shrink-0">
                    <div className="p-4 border rounded-lg text-center sticky top-8">
                        <h3 className="font-semibold text-primary mb-4">Logo</h3>
                        <input
                            type="file"
                            ref={logoInputRef}
                            onChange={handleLogoChange}
                            className="hidden"
                            accept="image/*"
                            disabled={!canEdit}
                        />
                        <div className="relative w-40 h-40 mx-auto">
                            {companyData.logoUrl ? (
                                <img src={companyData.logoUrl} alt={companyData.name} className="w-full h-full object-contain border border-border rounded-md p-2" />
                            ) : (
                                <div className="w-full h-full border-2 border-dashed border-border rounded-md flex items-center justify-center text-center">
                                    <span className="text-muted text-sm">Adicionar Logo</span>
                                </div>
                            )}
                            {canEdit && (
                                <button
                                    type="button"
                                    onClick={() => logoInputRef.current?.click()}
                                    className="absolute -bottom-2 -right-2 bg-white p-2 rounded-full shadow-lg hover:bg-gray-100 transition-colors"
                                    title="Adicionar ou alterar logo"
                                >
                                    <EditIcon className="w-5 h-5 text-primary" />
                                </button>
                            )}
                        </div>
                        {(companyData.logoUrl && canEdit) && (
                            <button onClick={() => setCompanyData(prev => ({ ...prev, logoUrl: '' }))} className="mt-4 text-sm text-danger hover:underline">Remover Logo</button>
                        )}
                    </div>
                </div>
            </div>
            {canEdit && (
                <div className="flex justify-end pt-4 border-t mt-6">
                    <Button onClick={handleSave} variant="success" loading={saving} icon={<CheckIcon className="h-5 w-5" />}>Salvar Alterações</Button>
                </div>
            )}
        </div>
    );
};


// --- MARCAS E CATEGORIAS (MERGED) TAB ---
const MarcasECategoriasTab: React.FC = () => {
    // State for Marcas, Categorias, Modelos
    const [brands, setBrands] = useState<Brand[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [productModels, setProductModels] = useState<ProductModel[]>([]);
    const [loadingMarcas, setLoadingMarcas] = useState(false);
    const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [marcasModal, setMarcasModal] = useState<{ type: 'brand' | 'category'; item: Partial<Item> | null } | null>(null);
    const [marcasItemToDelete, setMarcasItemToDelete] = useState<{ type: ModalType; item: Item } | null>(null);
    const [isSubcategoryModalOpen, setIsSubcategoryModalOpen] = useState(false);
    const [subcategoryModalItem, setSubcategoryModalItem] = useState<Partial<ProductModel> | null>(null);
    const photoInputRef = useRef<HTMLInputElement>(null);
    const [editingPhotoModelId, setEditingPhotoModelId] = useState<string | null>(null);

    // State for Grades
    const [grades, setGrades] = useState<Grade[]>([]);
    const [gradeValues, setGradeValues] = useState<GradeValue[]>([]);
    const [loadingGrades, setLoadingGrades] = useState(false);
    const [selectedGradeId, setSelectedGradeId] = useState<string | null>(null);
    const [gradesModal, setGradesModal] = useState<{ type: 'grade' | 'gradeValue', item: Partial<Item> | null } | null>(null);
    const [gradesItemToDelete, setGradesItemToDelete] = useState<{ type: 'grade' | 'gradeValue', item: Item } | null>(null);

    const { showToast } = useToast();
    const { user, permissions } = useUser();
    const canManage = permissions?.canManageMarcasECategorias;

    const fetchData = useCallback(async () => {
        setLoadingMarcas(true);
        setLoadingGrades(true);
        try {
            const [b, c, m, g, gv] = await Promise.all([
                getBrands(), getCategories(), getProductModels(),
                getGrades(), getGradeValues()
            ]);
            setBrands(b); setCategories(c); setProductModels(m);
            setGrades(g); setGradeValues(gv);
        } catch (error) { showToast('Erro ao carregar dados.', 'error'); }
        finally { setLoadingMarcas(false); setLoadingGrades(false); }
    }, [showToast]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Memoized filters
    const filteredCategories = useMemo(() => categories.filter(c => c.brandId === selectedBrandId), [categories, selectedBrandId]);
    const filteredModels = useMemo(() => productModels.filter(m => m.categoryId === selectedCategoryId), [productModels, selectedCategoryId]);
    const filteredGradeValues = useMemo(() => gradeValues.filter(v => v.gradeId === selectedGradeId), [gradeValues, selectedGradeId]);

    // Handlers for Marcas, Categorias
    const handleSelectBrand = (brandId: string) => { setSelectedBrandId(brandId); setSelectedCategoryId(null); };
    const handleOpenMarcasModal = (type: 'brand' | 'category', item: Partial<Item> | null = null) => setMarcasModal({ type, item });
    const handleSaveMarcas = async (type: 'brand' | 'category', item: Partial<Item>) => {
        setLoadingMarcas(true);
        try {
            if (item.id) {
                if (type === 'brand') await updateBrand(item as Brand, user?.id, user?.name);
                else if (type === 'category') await updateCategory(item as Category, user?.id, user?.name);
            } else {
                if (type === 'brand') await addBrand(item as Omit<Brand, 'id'>, user?.id, user?.name);
                else if (type === 'category') await addCategory({ ...item, brandId: selectedBrandId! } as Omit<Category, 'id'>, user?.id, user?.name);
            }
            const typeName = type === 'brand' ? 'Marca' : type === 'category' ? 'Categoria' : 'Subcategoria';
            showToast(`${typeName} salva com sucesso!`, 'success');
            fetchData();
            window.dispatchEvent(new Event('company-data-updated'));
            const bc = new BroadcastChannel('app-updates'); bc.postMessage('company-data-updated'); bc.close();
        } catch (e) {
            const typeName = type === 'brand' ? 'marca' : type === 'category' ? 'categoria' : 'subcategoria';
            showToast(`Erro ao salvar ${typeName}.`, 'error');
        }
        finally { setLoadingMarcas(false); setMarcasModal(null); }
    };
    const handleDeleteMarcas = async () => {
        if (!marcasItemToDelete) return;
        setLoadingMarcas(true);
        try {
            if (marcasItemToDelete.type === 'brand') await deleteBrand(marcasItemToDelete.item.id, user?.id, user?.name);
            else if (marcasItemToDelete.type === 'category') await deleteCategory(marcasItemToDelete.item.id, user?.id, user?.name);
            else if (marcasItemToDelete.type === 'model') await deleteProductModel(marcasItemToDelete.item.id, user?.id, user?.name);

            const typeName = marcasItemToDelete.type === 'brand' ? 'Marca' : marcasItemToDelete.type === 'category' ? 'Categoria' : 'Subcategoria';
            showToast(`${typeName} excluída com sucesso!`, 'success');

            fetchData();
            window.dispatchEvent(new Event('company-data-updated'));
            const bc = new BroadcastChannel('app-updates'); bc.postMessage('company-data-updated'); bc.close();
        } catch (e) {
            const typeName = marcasItemToDelete.type === 'brand' ? 'marca' : marcasItemToDelete.type === 'category' ? 'categoria' : 'subcategoria';
            showToast(`Erro ao excluir ${typeName}.`, 'error');
        }
        finally { setLoadingMarcas(false); setMarcasItemToDelete(null); }
    };

    // Handlers for Subcategorias/Modelos
    const handleOpenSubcategoryModal = (item: Partial<ProductModel> | null) => {
        setSubcategoryModalItem(item);
        setIsSubcategoryModalOpen(true);
    };

    const handleSaveSubcategory = async (item: Partial<ProductModel>) => {
        setLoadingMarcas(true);
        try {
            if (item.id) {
                await updateProductModel(item as ProductModel, user?.id, user?.name);
            } else {
                await addProductModel({ ...item, categoryId: selectedCategoryId! } as Omit<ProductModel, 'id'>, user?.id, user?.name);
            }
            showToast('Subcategoria salva com sucesso!', 'success');
            fetchData();
            window.dispatchEvent(new Event('company-data-updated'));
            const bc = new BroadcastChannel('app-updates'); bc.postMessage('company-data-updated'); bc.close();
        } catch (e) { showToast(`Erro ao salvar subcategoria.`, 'error'); }
        finally { setLoadingMarcas(false); setIsSubcategoryModalOpen(false); setSubcategoryModalItem(null); }
    };

    const handlePhotoIconClick = (modelId: string) => {
        setEditingPhotoModelId(modelId);
        photoInputRef.current?.click();
    };

    const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && editingPhotoModelId) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64String = reader.result as string;
                const modelToUpdate = productModels.find(m => m.id === editingPhotoModelId);
                if (modelToUpdate) {
                    try {
                        setLoadingMarcas(true);
                        await updateProductModel({ ...modelToUpdate, imageUrl: base64String }, user?.id, user?.name);
                        showToast('Foto da subcategoria atualizada!', 'success');
                        await fetchData();
                        window.dispatchEvent(new Event('company-data-updated'));
                        const bc = new BroadcastChannel('app-updates'); bc.postMessage('company-data-updated'); bc.close();
                    } catch (error) {
                        showToast('Erro ao salvar a foto.', 'error');
                    } finally {
                        setLoadingMarcas(false);
                        setEditingPhotoModelId(null);
                    }
                }
            };
            reader.readAsDataURL(file);
        }
        if (e.target) e.target.value = ""; // Reset file input
    };

    // Handlers for Grades
    const handleSaveGrades = async (type: 'grade' | 'gradeValue', item: Partial<Item>) => {
        setLoadingGrades(true);
        try {
            if (item.id) {
                if (type === 'grade') await updateGrade(item as Grade, user?.id, user?.name);
                else await updateGradeValue(item as GradeValue, user?.id, user?.name);
            } else {
                if (type === 'grade') await addGrade(item as Omit<Grade, 'id'>, user?.id, user?.name);
                else await addGradeValue({ ...item, gradeId: selectedGradeId! } as Omit<GradeValue, 'id'>, user?.id, user?.name);
            }
            const typeName = type === 'grade' ? 'Grupo de Grade' : 'Valor da Grade';
            showToast(`${typeName} salvo com sucesso!`, 'success');
            fetchData();
            window.dispatchEvent(new Event('company-data-updated'));
            const bc = new BroadcastChannel('app-updates'); bc.postMessage('company-data-updated'); bc.close();
        } catch (e) {
            const typeName = type === 'grade' ? 'grupo de grade' : 'valor da grade';
            showToast(`Erro ao salvar ${typeName}.`, 'error');
        }
        finally { setLoadingGrades(false); setGradesModal(null); }
    };
    const handleDeleteGrades = async () => {
        if (!gradesItemToDelete) return;
        setLoadingGrades(true);
        try {
            if (gradesItemToDelete.type === 'grade') await deleteGrade(gradesItemToDelete.item.id, user?.id, user?.name);
            else await deleteGradeValue(gradesItemToDelete.item.id, user?.id, user?.name);

            const typeName = gradesItemToDelete.type === 'grade' ? 'Grupo de Grade' : 'Valor da Grade';
            showToast(`${typeName} excluído com sucesso!`, 'success');

            fetchData();
            window.dispatchEvent(new Event('company-data-updated'));
            const bc = new BroadcastChannel('app-updates'); bc.postMessage('company-data-updated'); bc.close();
        } catch (e) {
            const typeName = gradesItemToDelete.type === 'grade' ? 'grupo de grade' : 'valor da grade';
            showToast(`Erro ao excluir ${typeName}.`, 'error');
        }
        finally { setLoadingGrades(false); setGradesItemToDelete(null); }
    };

    // Generic list renderer
    const renderList = (title: string, items: Item[], type: ModalType, onSelect: ((id: string) => void) | null, selectedId: string | null, onAdd: () => void, disabled: boolean = false) => (
        <div className={`border border-border rounded-lg ${disabled ? 'bg-gray-50' : ''}`}>
            <div className="flex justify-between items-center p-3 bg-surface-secondary border-b border-border">
                <h3 className="font-semibold text-primary">{title}</h3>
                {canManage && (
                    <button onClick={onAdd} disabled={disabled} className="p-1 text-success disabled:text-muted"><PlusIcon className="h-5 w-5" /></button>
                )}
            </div>
            <ul className="p-2 space-y-1 h-64 overflow-y-auto">
                {items.map(item => (
                    <li key={item.id} onClick={() => onSelect && onSelect(item.id)} className={`flex justify-between items-center p-2 rounded-md ${onSelect ? 'cursor-pointer' : ''} ${selectedId === item.id ? 'bg-accent-light text-accent' : (onSelect ? 'hover:bg-gray-100' : '')}`}>
                        <div className="flex items-center gap-3 flex-grow min-w-0">
                            {type === 'model' && (item as ProductModel).imageUrl ? (
                                <img src={(item as ProductModel).imageUrl} alt={item.name} className="h-8 w-8 rounded object-cover flex-shrink-0" />
                            ) : type === 'model' ? (
                                <div className="h-8 w-8 rounded bg-gray-200 flex items-center justify-center flex-shrink-0">
                                    <PhotographIcon className="h-4 w-4 text-gray-400" />
                                </div>
                            ) : null}
                            <span className="truncate">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            {type === 'model' && canManage && (
                                <button onClick={(e) => { e.stopPropagation(); handlePhotoIconClick(item.id); }} className="text-muted hover:text-primary"><PhotographIcon className="h-4 w-4" /></button>
                            )}
                            {canManage && (
                                <>
                                    <button onClick={(e) => { e.stopPropagation(); type.includes('grade') ? setGradesModal({ type, item } as any) : (type === 'model' ? handleOpenSubcategoryModal(item) : handleOpenMarcasModal(type as any, item)); }} className="text-muted hover:text-primary"><EditIcon className="h-4 w-4" /></button>
                                    <button onClick={(e) => { e.stopPropagation(); type.includes('grade') ? setGradesItemToDelete({ type, item } as any) : setMarcasItemToDelete({ type, item }); }} className="text-muted hover:text-danger"><TrashIcon className="h-4 w-4" /></button>
                                </>
                            )}
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );

    return (
        <div className="space-y-8">
            <input type="file" ref={photoInputRef} onChange={handlePhotoChange} className="hidden" accept="image/*" />
            <div className="bg-surface rounded-lg border border-border p-6">
                <h3 className="font-semibold text-lg text-primary mb-4">Marcas, Categorias e Subcategorias</h3>
                {loadingMarcas ? <SpinnerIcon /> : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {renderList('Marcas', brands, 'brand', handleSelectBrand, selectedBrandId, () => handleOpenMarcasModal('brand'))}
                        {renderList('Categorias', filteredCategories, 'category', (id) => setSelectedCategoryId(id), selectedCategoryId, () => handleOpenMarcasModal('category'), !selectedBrandId)}
                        {renderList('Subcategorias/Modelos', filteredModels, 'model', () => { }, null, () => handleOpenSubcategoryModal(null), !selectedCategoryId)}
                    </div>
                )}
            </div>
            <div className="bg-surface rounded-lg border border-border p-6">
                <h3 className="font-semibold text-lg text-primary mb-4">Grades e Variações</h3>
                {loadingGrades ? <SpinnerIcon /> : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {renderList('Grades (Ex: Cor, Armazenamento)', grades, 'grade', (id) => setSelectedGradeId(id), selectedGradeId, () => setGradesModal({ type: 'grade', item: null }))}
                        {renderList('Valores da Grade (Ex: Azul, 256GB)', filteredGradeValues, 'gradeValue', null, null, () => setGradesModal({ type: 'gradeValue', item: null }), !selectedGradeId)}
                    </div>
                )}
            </div>

            {marcasModal && <ManagementModal type={marcasModal.type} item={marcasModal.item} onSave={handleSaveMarcas} onClose={() => setMarcasModal(null)} loading={loadingMarcas} />}
            <ConfirmationModal isOpen={!!marcasItemToDelete} onClose={() => setMarcasItemToDelete(null)} onConfirm={handleDeleteMarcas} title={`Excluir ${marcasItemToDelete?.type}`} message={`Tem certeza que deseja excluir "${marcasItemToDelete?.item.name}"? A exclusão em cascata pode remover itens associados.`} />

            {isSubcategoryModalOpen && (
                <SubcategoryModal
                    item={subcategoryModalItem}
                    brandName={brands.find(b => b.id === selectedBrandId)?.name || ''}
                    categoryName={categories.find(c => c.id === selectedCategoryId)?.name || ''}
                    onSave={handleSaveSubcategory}
                    onClose={() => { setIsSubcategoryModalOpen(false); setSubcategoryModalItem(null); }}
                    isSaving={loadingMarcas}
                />
            )}

            {gradesModal && <ManagementModal type={gradesModal.type} item={gradesModal.item} onSave={handleSaveGrades} onClose={() => setGradesModal(null)} loading={loadingGrades} />}
            <ConfirmationModal isOpen={!!gradesItemToDelete} onClose={() => setGradesItemToDelete(null)} onConfirm={handleDeleteGrades} title={`Excluir ${gradesItemToDelete?.type}`} message={`Tem certeza que deseja excluir "${gradesItemToDelete?.item.name}"?`} />
        </div>
    );
};


// --- AUDITORIA TAB ---
type PeriodFilter = 'last_hour' | 'today' | 'yesterday' | 'custom';

const AuditoriaTab: React.FC = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [sales, setSales] = useState<Sale[]>([]);
    const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('today');
    const [customDate, setCustomDate] = useState<string>(toDateValue());

    // Tradução de nomes de ação para português
    const translateAction = (action: AuditActionType): string => {
        const translations: Record<AuditActionType, string> = {
            [AuditActionType.CREATE]: 'Criação',
            [AuditActionType.UPDATE]: 'Atualização',
            [AuditActionType.DELETE]: 'Exclusão',
            [AuditActionType.SALE_CREATE]: 'Venda Realizada',
            [AuditActionType.SALE_CANCEL]: 'Venda Cancelada',
            [AuditActionType.STOCK_ADJUST]: 'Ajuste de Estoque',
            [AuditActionType.STOCK_LAUNCH]: 'Lançamento no Estoque',
            [AuditActionType.PURCHASE_LAUNCH]: 'Lançamento de Compra',
            [AuditActionType.STOCK_REVERT]: 'Reversão de Estoque',
            [AuditActionType.LOGIN]: 'Login',
            [AuditActionType.LOGOUT]: 'Logout',
            [AuditActionType.CASH_OPEN]: 'Abertura de Caixa',
            [AuditActionType.CASH_CLOSE]: 'Fechamento de Caixa',
            [AuditActionType.CASH_WITHDRAWAL]: 'Sangria',
            [AuditActionType.CASH_SUPPLY]: 'Suprimento',
        };
        return translations[action] || action;
    };

    // Tradução de nomes de entidade para português
    const translateEntity = (entity: AuditEntityType): string => {
        const translations: Record<AuditEntityType, string> = {
            [AuditEntityType.PRODUCT]: 'Produto',
            [AuditEntityType.CUSTOMER]: 'Cliente',
            [AuditEntityType.SUPPLIER]: 'Fornecedor',
            [AuditEntityType.SALE]: 'Venda',
            [AuditEntityType.PURCHASE_ORDER]: 'Compra',
            [AuditEntityType.USER]: 'Usuário',
        };
        return translations[entity] || entity;
    };

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const [logsData, salesData, purchasesData, productsData] = await Promise.all([
                getAuditLogs().catch(() => []),
                getSales().catch(() => []),
                getPurchaseOrders().catch(() => []),
                getProducts().catch(() => [])
            ]);
            setLogs(logsData || []);
            setSales(salesData || []);
            setPurchases(purchasesData || []);
            setProducts(productsData || []);
        } catch (error) {
            console.error('AuditoriaTab fetch error:', error);
        }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);

    const productMap = useMemo(() => products.reduce((acc, p) => ({ ...acc, [p.id]: p }), {} as Record<string, Product>), [products]);
    const saleMap = useMemo(() => sales.reduce((acc, s) => ({ ...acc, [s.id]: s }), {} as Record<string, Sale>), [sales]);
    const purchaseMap = useMemo(() => purchases.reduce((acc, p) => ({ ...acc, [p.id]: p }), {} as Record<string, PurchaseOrder>), [purchases]);

    const getIconAndColor = (log: AuditLog) => {
        if (log.action === AuditActionType.DELETE) return { Icon: TrashIcon, color: 'text-red-600', bg: 'bg-red-100' };
        if (log.action === AuditActionType.CREATE) return { Icon: PlusIcon, color: 'text-green-600', bg: 'bg-green-100' };
        if (log.action === AuditActionType.UPDATE) return { Icon: EditIcon, color: 'text-blue-600', bg: 'bg-blue-100' };
        if (log.action === AuditActionType.LOGIN) return { Icon: UserCircleIcon, color: 'text-green-600', bg: 'bg-green-100' };
        if (log.action === AuditActionType.LOGOUT) return { Icon: UserCircleIcon, color: 'text-gray-600', bg: 'bg-gray-100' };
        if (log.action === AuditActionType.CASH_OPEN) return { Icon: CalculatorIcon, color: 'text-green-600', bg: 'bg-green-100' };
        if (log.action === AuditActionType.CASH_CLOSE) return { Icon: CalculatorIcon, color: 'text-red-600', bg: 'bg-red-100' };
        if (log.action === AuditActionType.CASH_WITHDRAWAL) return { Icon: CalculatorIcon, color: 'text-orange-600', bg: 'bg-orange-100' };
        if (log.action === AuditActionType.CASH_SUPPLY) return { Icon: CalculatorIcon, color: 'text-blue-600', bg: 'bg-blue-100' };

        switch (log.entity) {
            case AuditEntityType.SALE:
                if (log.action === AuditActionType.SALE_CANCEL) return { Icon: XCircleIcon, color: 'text-red-600', bg: 'bg-red-100' };
                return { Icon: ShoppingCartIcon, color: 'text-purple-600', bg: 'bg-purple-100' };
            case AuditEntityType.PRODUCT:
                if (log.action === AuditActionType.STOCK_ADJUST) return { Icon: ArchiveBoxIcon, color: 'text-orange-600', bg: 'bg-orange-100' };
                if (log.action === AuditActionType.STOCK_LAUNCH) return { Icon: ArchiveBoxIcon, color: 'text-teal-600', bg: 'bg-teal-100' };
                return { Icon: ArchiveBoxIcon, color: 'text-indigo-500', bg: 'bg-indigo-100' };
            case AuditEntityType.CUSTOMER:
                return { Icon: UserCircleIcon, color: 'text-pink-500', bg: 'bg-pink-100' };
            case AuditEntityType.SUPPLIER:
                return { Icon: ArchiveBoxIcon, color: 'text-cyan-500', bg: 'bg-cyan-100' };
            default:
                return { Icon: CalculatorIcon, color: 'text-gray-500', bg: 'bg-gray-100' };
        }
    };

    const getRelatedProductInfo = (log: AuditLog) => {
        if (!log.entityId) return null;

        if (log.entity === AuditEntityType.SALE) {
            const sale = saleMap[log.entityId];
            if (sale && sale.items.length > 0) {
                const firstItem = sale.items[0];
                const product = productMap[firstItem.productId];
                const modelName = product ? product.model : 'Produto desconhecido';
                const moreCount = sale.items.length - 1;
                return (
                    <div className="mt-1 flex items-center gap-2 text-sm text-gray-500 bg-gray-50 p-2 rounded border border-gray-100">
                        <ArchiveBoxIcon className="w-4 h-4 text-gray-400" />
                        <span>
                            {modelName}
                            {moreCount > 0 && <span className="text-xs ml-1 bg-gray-200 px-1.5 py-0.5 rounded-full">+{moreCount}</span>}
                        </span>
                    </div>
                );
            }
        }

        if (log.entity === AuditEntityType.PRODUCT) {
            const product = productMap[log.entityId];
            if (product) {
                // Build product identifiers string
                const identifiers = [];
                if (product.imei1) identifiers.push(`IMEI1: ${product.imei1}`);
                if (product.imei2) identifiers.push(`IMEI2: ${product.imei2}`);
                if (product.serialNumber) identifiers.push(`S/N: ${product.serialNumber}`);
                if (product.barcode) identifiers.push(`Cód: ${product.barcode}`);
                if (product.batteryHealth) identifiers.push(`Bateria: ${product.batteryHealth}%`);

                return (
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500 bg-gray-50 p-2 rounded border border-gray-100">
                        <ArchiveBoxIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="font-medium">{product.model}</span>
                        {identifiers.length > 0 && (
                            <span className="text-xs text-gray-400">
                                | {identifiers.join(' | ')}
                            </span>
                        )}
                    </div>
                );
            }
        }

        // For Purchase/Stock Launch, it might be logged as PRODUCT with action STOCK_LAUNCH or maybe PURCHSE_ORDER
        // The mockApi seems to log STOCK_LAUNCH on PRODUCT entity for simple launches, but if we have PURCHASE_ORDER logs:
        if (log.entity === AuditEntityType.PURCHASE_ORDER) {
            const purchase = purchaseMap[log.entityId];
            if (purchase && purchase.items.length > 0) {
                const firstItem = purchase.items[0];
                const modelName = firstItem.productDetails.model; // Purchase items store details directly
                const moreCount = purchase.items.length - 1;
                return (
                    <div className="mt-1 flex items-center gap-2 text-sm text-gray-500 bg-gray-50 p-2 rounded border border-gray-100">
                        <ArchiveBoxIcon className="w-4 h-4 text-gray-400" />
                        <span>
                            {modelName}
                            {moreCount > 0 && <span className="text-xs ml-1 bg-gray-200 px-1.5 py-0.5 rounded-full">+{moreCount}</span>}
                        </span>
                    </div>
                );
            }
        }

        return null;
    };

    // Filtrar logs por período
    const filteredLogs = useMemo(() => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

        return logs.filter(log => {
            const logDate = new Date(log.timestamp);

            switch (periodFilter) {
                case 'last_hour':
                    return logDate >= oneHourAgo;
                case 'today':
                    return logDate >= today;
                case 'yesterday':
                    return logDate >= yesterday && logDate < today;
                case 'custom':
                    const customStart = new Date(customDate + 'T00:00:00');
                    const customEnd = new Date(customDate + 'T23:59:59');
                    return logDate >= customStart && logDate <= customEnd;
                default:
                    return true;
            }
        });
    }, [logs, periodFilter, customDate]);

    const logsByDay = useMemo(() => {
        return filteredLogs.reduce((acc, log) => {
            const dateKey = new Date(log.timestamp).toISOString().split('T')[0];
            if (!acc[dateKey]) {
                acc[dateKey] = [];
            }
            acc[dateKey].push(log);
            return acc;
        }, {} as Record<string, AuditLog[]>);
    }, [filteredLogs]);

    const sortedDateKeys = useMemo(() => Object.keys(logsByDay).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()), [logsByDay]);

    const formatDateHeader = (dateKey: string) => {
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);
        const logDate = new Date(dateKey + 'T00:00:00');

        if (logDate.toDateString() === today.toDateString()) return 'Hoje';
        if (logDate.toDateString() === yesterday.toDateString()) return 'Ontem';
        return logDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    if (loading) return <div className="flex justify-center items-center h-full p-8"><SpinnerIcon /></div>;

    return (
        <div className="bg-surface rounded-lg border border-border p-6">
            {/* Filtros de Período */}
            <div className="flex flex-wrap items-center gap-2 mb-6 pb-4 border-b border-border">
                <span className="text-sm font-medium text-gray-600 mr-2">Período:</span>
                <button
                    onClick={() => setPeriodFilter('last_hour')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${periodFilter === 'last_hour'
                        ? 'bg-primary text-white shadow-md'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                >
                    Últ. hora
                </button>
                <button
                    onClick={() => setPeriodFilter('today')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${periodFilter === 'today'
                        ? 'bg-primary text-white shadow-md'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                >
                    Hoje
                </button>
                <button
                    onClick={() => setPeriodFilter('yesterday')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${periodFilter === 'yesterday'
                        ? 'bg-primary text-white shadow-md'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                >
                    Ontem
                </button>
                <div className="flex items-center gap-2">
                    <input
                        type="date"
                        value={customDate}
                        onChange={(e) => {
                            setCustomDate(e.target.value);
                            setPeriodFilter('custom');
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${periodFilter === 'custom'
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-gray-200 bg-gray-100 text-gray-600'
                            }`}
                    />
                </div>
                <span className="text-xs text-gray-400 ml-auto">
                    {filteredLogs.length} {filteredLogs.length === 1 ? 'evento' : 'eventos'}
                </span>
            </div>

            {filteredLogs.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                    <p className="text-lg font-medium">Nenhum evento encontrado</p>
                    <p className="text-sm mt-1">Não há logs de auditoria para o período selecionado.</p>
                </div>
            ) : (
                <div className="relative pl-8">
                    <div className="absolute left-[23px] top-0 bottom-0 w-0.5 bg-gray-200"></div>
                    {sortedDateKeys.map(dateKey => (
                        <div key={dateKey}>
                            <div className="relative -ml-8 mb-6 mt-8 first:mt-0">
                                <div className="bg-surface pr-4 inline-block relative z-10"><h3 className="font-bold text-lg text-primary">{formatDateHeader(dateKey)}</h3></div>
                            </div>
                            {logsByDay[dateKey].map((log) => {
                                const { Icon, color, bg } = getIconAndColor(log);

                                // Função para simplificar e traduzir os detalhes do log
                                const formatLogDetails = () => {
                                    const text = log.details;

                                    // Primeiro, tentar usar a tradução baseada na ação
                                    const actionText = translateAction(log.action);
                                    const entityText = translateEntity(log.entity);

                                    // Remover JSON técnico e simplificar
                                    if (text.includes('Item adicionado em ') || text.includes('Item atualizado em ') || text.includes('Item excluído de ')) {
                                        try {
                                            // Traduzir nome da tabela
                                            const tableTranslations: Record<string, string> = {
                                                'brands': 'Marca',
                                                'categories': 'Categoria',
                                                'product_models': 'Modelo',
                                                'grades': 'Grupo de Grade',
                                                'grade_values': 'Valor de Grade',
                                                'product_conditions': 'Condição',
                                                'storage_locations': 'Local de Estoque',
                                                'warranties': 'Garantia',
                                                'payment_methods': 'Método de Pagamento',
                                                'receipt_terms': 'Termo de Recebimento',
                                                'users': 'Usuário',
                                                'customers': 'Cliente',
                                                'suppliers': 'Fornecedor'
                                            };

                                            let tableName = '';
                                            let rawTableName = '';
                                            for (const [key, value] of Object.entries(tableTranslations)) {
                                                if (text.includes(key)) {
                                                    tableName = value;
                                                    rawTableName = key;
                                                    break;
                                                }
                                            }

                                            // Tentar extrair nome do JSON se houver
                                            const jsonMatch = text.match(/\{[^}]+\}/);
                                            if (jsonMatch) {
                                                const data = JSON.parse(jsonMatch[0]);
                                                const itemName = data.name || data.id || '';

                                                if (text.includes('adicionado')) return `${tableName || entityText} criado(a): ${itemName}`;
                                                if (text.includes('atualizado')) return `${tableName || entityText} atualizado(a): ${itemName}`;
                                                if (text.includes('excluído')) return `${tableName || entityText} excluído(a): ${itemName}`;
                                            }
                                            // Se não tiver JSON, tentar extrair da própria string (ex: "Item excluído de grade_values: Azul")
                                            else {
                                                const parts = text.split(':');
                                                if (parts.length > 1) {
                                                    const itemName = parts[1].trim();
                                                    if (text.includes('adicionado')) return `${tableName || entityText} criado(a): ${itemName}`;
                                                    if (text.includes('atualizado')) return `${tableName || entityText} atualizado(a): ${itemName}`;
                                                    if (text.includes('excluído')) return `${tableName || entityText} excluído(a): ${itemName}`;
                                                } else if (tableName && rawTableName) {
                                                    // Caso sem nome explícito "Item excluído de grade_values"
                                                    if (text.includes('adicionado')) return `${tableName} criado(a)`;
                                                    if (text.includes('atualizado')) return `${tableName} atualizado(a)`;
                                                    if (text.includes('excluído')) return `${tableName} excluído(a)`;
                                                }
                                            }
                                        } catch (e) {
                                            // Fallback para texto original
                                        }
                                    }

                                    // Simplificar logs com JSON
                                    if (text.includes('Alterações: {') || text.includes('Dados: {')) {
                                        try {
                                            const separator = text.includes('Alterações: {') ? 'Alterações: ' : 'Dados: ';
                                            const [prefix, jsonPart] = text.split(separator);
                                            const data = JSON.parse(jsonPart);

                                            // Simplify payment method logs
                                            if (text.includes('payment_methods')) {
                                                const name = data.name || (data.config ? 'Configuração' : 'Item');
                                                if (prefix.includes('atualizado')) return `Método de Pagamento atualizado: ${name}`;
                                                if (prefix.includes('criado')) return `Novo Método de Pagamento: ${name}`;
                                                if (prefix.includes('removido')) return `Método de Pagamento removido: ${name}`;
                                                return `Método de Pagamento: ${name}`;
                                            }

                                            // Generic simplification - just return the name if available
                                            if (data.name) return `${actionText} - ${entityText}: ${data.name}`;
                                            return prefix.trim();
                                        } catch (e) {
                                            return text;
                                        }
                                    }

                                    return text;
                                };

                                return (
                                    <div key={log.id} className="relative mb-3 pl-2 group hover:bg-gray-50 rounded -ml-2 p-1 transition-colors">
                                        <div className={`absolute left-0 top-2 transform -translate-x-1/2 w-6 h-6 rounded-full flex items-center justify-center ${bg} ring-4 ring-surface shadow-sm`}><Icon className={`w-3.5 h-3.5 ${color}`} /></div>
                                        <div className="ml-6">
                                            <div className="text-sm leading-snug flex flex-wrap items-baseline gap-1">
                                                <span className="font-mono text-gray-400 text-xs tracking-tight">{new Date(log.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                                <span className="font-medium text-gray-800">{formatLogDetails()}</span>
                                                <span className="text-xs text-gray-400 opacity-60 ml-auto sm:ml-0">- {log.userName}</span>
                                            </div>
                                            {getRelatedProductInfo(log)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// FIX: Added ParameterManager component definition
// --- ParameterManager Component ---
interface ParameterManagerProps<T extends { id: string; name: string;[key: string]: any }> {
    permissions: PermissionSet | null;
    title: string;
    items: T[];
    fields: { name: keyof T; label: string; type: 'text' | 'number' }[];
    api: {
        add: (data: Omit<T, 'id'>, userId?: string, userName?: string) => Promise<T>;
        update: (data: T, userId?: string, userName?: string) => Promise<T>;
        del: (id: string, userId?: string, userName?: string) => Promise<void>;
    };
    fetchData: () => void;
}

const ParameterManager = <T extends { id: string; name: string;[key: string]: any }>({
    permissions,
    title,
    items,
    fields,
    api,
    fetchData,
}: ParameterManagerProps<T>) => {
    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Partial<T> | null>(null);
    const [deletingItem, setDeletingItem] = useState<T | null>(null);
    const { showToast } = useToast();
    const { user } = useUser();

    const handleOpenModal = (item: Partial<T> | null = null) => {
        setEditingItem(item || {});
        setModalOpen(true);
    };

    const [saving, setSaving] = useState(false);

    const handleSave = async (itemData: Partial<T>) => {
        setSaving(true);
        try {
            if ('id' in itemData && itemData.id) {
                await api.update(itemData as T, user?.id, user?.name);
                showToast('Item atualizado com sucesso!', 'success');
            } else {
                await api.add(itemData as Omit<T, 'id'>, user?.id, user?.name);
                showToast('Item adicionado com sucesso!', 'success');
            }
            fetchData();
            setModalOpen(false);
            setEditingItem(null);
        } catch (error) {
            showToast('Erro ao salvar item.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deletingItem) return;
        try {
            await api.del(deletingItem.id, user?.id, user?.name);
            showToast('Item excluído com sucesso!', 'success');
            fetchData();
            setDeletingItem(null);
        } catch (error) {
            showToast('Erro ao excluir item.', 'error');
        }
    };

    // Modal component
    const ItemModal: React.FC<{ item: Partial<T> | null, onSave: (data: Partial<T>) => void, onClose: () => void, isSaving: boolean }> = ({ item, onSave, onClose, isSaving }) => {
        const [formData, setFormData] = useState(item || {});

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const { name, value, type } = e.target;
            setFormData(prev => ({ ...prev, [name]: type === 'number' ? Number(value) : value }));
        };

        const handleSubmit = (e: React.FormEvent) => {
            e.preventDefault();
            onSave(formData);
        };

        return (
            <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
                <form onSubmit={handleSubmit} className="bg-surface rounded-lg shadow-xl p-6 w-full max-w-sm">
                    <h3 className="font-bold text-lg mb-4">{item?.id ? 'Editar' : 'Novo'} Item</h3>
                    {fields.map(field => (
                        <div key={String(field.name)} className="mb-4">
                            <label className="block text-sm font-medium mb-1">{field.label}</label>
                            <input
                                type={field.type}
                                name={String(field.name)}
                                value={(formData as any)[field.name] || (field.type === 'number' ? '' : '')}
                                onChange={handleChange}
                                className="w-full p-2 border rounded bg-transparent border-border"
                                required
                            />
                        </div>
                    ))}
                    <div className="flex justify-end gap-2 mt-4">
                        <Button type="button" onClick={onClose} variant="secondary">Cancelar</Button>
                        <Button type="submit" variant="success" loading={isSaving}>Salvar</Button>
                    </div>
                </form>
            </div>
        );
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-gray-100 p-4 rounded-t-lg">
                <div>
                    <h4 className="text-lg font-semibold text-primary">{title}</h4>
                </div>
                {permissions?.canManageCompanyData && (
                    <button onClick={() => handleOpenModal()} className="p-2 bg-gray-300 rounded-full hover:bg-gray-400">
                        <PlusIcon className="h-5 w-5" />
                    </button>
                )}
            </div>
            <div className="border border-gray-200 rounded-b-lg">
                <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                        <tr>
                            {fields.map(field => (
                                <th key={String(field.name)} className="p-3 font-semibold text-left">{field.label}</th>
                            ))}
                            <th className="p-3 font-semibold text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map(item => (
                            <tr key={item.id} className="border-t">
                                {fields.map(field => (
                                    <td key={String(field.name)} className="p-3">{(item as any)[field.name]}</td>
                                ))}
                                <td className="p-3">
                                    <div className="flex justify-end items-center gap-2">
                                        {permissions?.canManageCompanyData && (
                                            <>
                                                <button onClick={() => handleOpenModal(item)}><EditIcon className="h-5 w-5 text-muted hover:text-primary" /></button>
                                                <button onClick={() => setDeletingItem(item)}><TrashIcon className="h-5 w-5 text-muted hover:text-danger" /></button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {modalOpen && <ItemModal item={editingItem} onSave={handleSave} onClose={() => { setModalOpen(false); setEditingItem(null); }} isSaving={saving} />}
            <ConfirmationModal isOpen={!!deletingItem} onClose={() => setDeletingItem(null)} onConfirm={handleDelete} title={`Excluir ${deletingItem?.name}`} message="Tem certeza que deseja excluir este item?" />
        </div>
    );
};

const BackupRestauracaoTab: React.FC = () => {
    const { showToast } = useToast();
    const { user } = useUser();
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleBackup = async () => {
        setIsBackingUp(true);
        try {
            const data = await getFullBackup();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const date = toDateValue();
            a.href = url;
            a.download = `istore_backup_${date}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast('Backup realizado com sucesso!', 'success');
        } catch (error) {
            console.error(error);
            showToast('Erro ao realizar backup.', 'error');
        } finally {
            setIsBackingUp(false);
        }
    };

    const handleRestoreClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const confirmRestore = window.confirm(
            'ATENÇÃO: Restaurar um backup irá SUBSTITUIR todos os dados atuais do sistema. Esta ação não pode ser desfeita. Deseja continuar?'
        );

        if (!confirmRestore) {
            event.target.value = '';
            return;
        }

        setIsRestoring(true);
        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const backupData = JSON.parse(e.target?.result as string);
                    await restoreFullBackup(backupData, user?.id || 'system', user?.name || 'Sistema');
                    showToast('Dados restaurados com sucesso! A página será recarregada.', 'success');
                    setTimeout(() => window.location.reload(), 2000);
                } catch (error: any) {
                    console.error(error);
                    showToast(error.message || 'Erro ao processar arquivo de backup.', 'error');
                    setIsRestoring(false);
                }
            };
            reader.readAsText(file);
        } catch (error) {
            console.error(error);
            showToast('Erro ao ler arquivo.', 'error');
            setIsRestoring(false);
        }
    };

    return (
        <div className="bg-surface rounded-lg border border-border p-8 space-y-8">
            <div className="max-w-2xl">
                <h3 className="text-xl font-bold text-primary mb-2">Backup e Restauração</h3>
                <p className="text-muted text-sm mb-6">
                    Gerencie a segurança dos seus dados. Você pode exportar todas as informações do sistema para um arquivo em seu computador ou restaurar o sistema a partir de um backup anterior.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Backup Section */}
                    <div className="p-6 border border-border rounded-xl bg-gray-50 space-y-4">
                        <div className="flex items-center gap-3 text-primary mb-2">
                            <ArchiveBoxIcon className="h-6 w-6" />
                            <h4 className="font-bold">Realizar Backup</h4>
                        </div>
                        <p className="text-xs text-muted leading-relaxed">
                            Gera um arquivo .json contendo todos os produtos, vendas, clientes, fornecedores e configurações. Recomendado fazer diariamente.
                        </p>
                        <button
                            onClick={handleBackup}
                            disabled={isBackingUp || isRestoring}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-opacity-90 disabled:opacity-50 transition-all"
                        >
                            {isBackingUp ? <SpinnerIcon className="h-5 w-5" /> : <><ArchiveBoxIcon className="h-5 w-5" /> Baixar Backup</>}
                        </button>
                    </div>

                    {/* Restore Section */}
                    <div className="p-6 border border-border rounded-xl bg-orange-50 border-orange-100 space-y-4">
                        <div className="flex items-center gap-3 text-orange-700 mb-2">
                            <DocumentArrowUpIcon className="h-6 w-6" />
                            <h4 className="font-bold">Restaurar Dados</h4>
                        </div>
                        <p className="text-xs text-orange-600 leading-relaxed font-medium">
                            <span className="flex items-center gap-1 text-orange-800 font-bold mb-1">
                                <ErrorIcon className="h-4 w-4" /> AVISO CRÍTICO
                            </span>
                            Isso apagará todos os dados atuais e os substituirá pelas informações do arquivo de backup.
                        </p>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept=".json"
                            className="hidden"
                        />
                        <button
                            onClick={handleRestoreClick}
                            disabled={isBackingUp || isRestoring}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-all shadow-sm"
                        >
                            {isRestoring ? <SpinnerIcon className="h-5 w-5" /> : <><DocumentArrowUpIcon className="h-5 w-5" /> Importar e Restaurar</>}
                        </button>
                    </div>
                </div>

                <div className="mt-8 p-4 bg-blue-50 border border-blue-100 rounded-lg flex items-start gap-3">
                    <InfoIcon className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="text-xs text-blue-800 space-y-1">
                        <p className="font-bold">Informações Importantes:</p>
                        <ul className="list-disc pl-4 space-y-1">
                            <li>O arquivo de backup é criptografado apenas se o seu sistema de arquivos o for.</li>
                            <li>Não altere o nome das tabelas dentro do arquivo JSON.</li>
                            <li>A restauração pode levar alguns segundos dependendo do volume de dados.</li>
                            <li>Após a restauração, o sistema será reiniciado automaticamente.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- PARÂMETROS TAB ---
const ParametrosTab: React.FC = () => {
    const [activeSubTab, setActiveSubTab] = useState('condicao');
    const [conditions, setConditions] = useState<ProductConditionParameter[]>([]);
    const [locations, setLocations] = useState<StorageLocationParameter[]>([]);
    const [warranties, setWarranties] = useState<WarrantyParameter[]>([]);
    const [receiptTerms, setReceiptTerms] = useState<ReceiptTermParameter[]>([]);
    const [isTermModalOpen, setIsTermModalOpen] = useState(false);
    const [editingTerm, setEditingTerm] = useState<Partial<ReceiptTermParameter> | null>(null);
    const [deletingTerm, setDeletingTerm] = useState<ReceiptTermParameter | null>(null);
    const { showToast } = useToast();
    const { permissions, user } = useUser();

    const fetchData = useCallback(async () => {
        const [c, l, w, t] = await Promise.all([
            getProductConditions(),
            getStorageLocations(),
            getWarranties(),
            getReceiptTerms()
        ]);
        setConditions(c); setLocations(l); setWarranties(w); setReceiptTerms(t);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleOpenTermModal = (item: Partial<ReceiptTermParameter> | null = null) => {
        setEditingTerm(item || {});
        setIsTermModalOpen(true);
    }
    const [savingTerm, setSavingTerm] = useState(false);

    const handleSaveTerm = async (item: Partial<ReceiptTermParameter>) => {
        setSavingTerm(true);
        try {
            if (item.id) {
                await updateReceiptTerm(item as ReceiptTermParameter, user?.id, user?.name);
                showToast('Termo atualizado!', 'success');
            } else {
                await addReceiptTerm(item as Omit<ReceiptTermParameter, 'id'>, user?.id, user?.name);
                showToast('Termo adicionado!', 'success');
            }
            fetchData();
            setIsTermModalOpen(false);
            setEditingTerm(null);
        } catch (error) {
            showToast('Erro ao salvar termo.', 'error');
        } finally {
            setSavingTerm(false);
        }
    };
    const handleDeleteTerm = async () => {
        if (!deletingTerm) return;
        try {
            await deleteReceiptTerm(deletingTerm.id, user?.id, user?.name);
            showToast('Termo excluído!', 'success');
            fetchData();
            setDeletingTerm(null);
        } catch (error: any) {
            showToast(error.message || 'Erro ao excluir.', 'error');
        }
    };

    const tabClasses = (tabName: string) => `px-3 py-1 rounded-md text-sm font-medium ${activeSubTab === tabName ? 'bg-primary text-white' : 'hover:bg-gray-200'}`;

    return (
        <div className="bg-surface rounded-lg border border-border p-6 space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
                <button onClick={() => setActiveSubTab('condicao')} className={tabClasses('condicao')}>Condição</button>
                <button onClick={() => setActiveSubTab('local')} className={tabClasses('local')}>Local de estoque</button>
                <button onClick={() => setActiveSubTab('garantia')} className={tabClasses('garantia')}>Garantia</button>
                <button onClick={() => setActiveSubTab('termos')} className={tabClasses('termos')}>Termos de Garantia</button>
            </div>
            {activeSubTab === 'condicao' && <ParameterManager permissions={permissions} title="Condições de Produto" items={conditions} fields={[{ name: 'name', label: 'Nome', type: 'text' }]} api={{ add: addProductCondition, update: updateProductCondition, del: deleteProductCondition }} fetchData={fetchData} />}
            {activeSubTab === 'local' && <ParameterManager permissions={permissions} title="Locais de Estoque" items={locations} fields={[{ name: 'name', label: 'Nome', type: 'text' }]} api={{ add: addStorageLocation, update: updateStorageLocation, del: deleteStorageLocation }} fetchData={fetchData} />}
            {activeSubTab === 'garantia' && <ParameterManager permissions={permissions} title="Garantias" items={warranties} fields={[{ name: 'name', label: 'Nome', type: 'text' }, { name: 'days', label: 'Dias', type: 'number' }]} api={{ add: addWarranty, update: updateWarranty, del: deleteWarranty }} fetchData={fetchData} />}
            {activeSubTab === 'termos' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center bg-gray-100 p-4 rounded-t-lg">
                        <div>
                            <h4 className="text-lg font-semibold text-primary">Termos de Garantia</h4>
                            <p className="text-sm text-muted">Crie termos personalizados para cada tipo de situação. Ex: Termos para vendas de Apple, Xiaomi, etc.</p>
                        </div>
                        {permissions?.canManageCompanyData && <button onClick={() => handleOpenTermModal()} className="p-2 bg-gray-300 rounded-full hover:bg-gray-400"><PlusIcon className="h-5 w-5" /></button>}
                    </div>
                    <div className="border border-gray-200 rounded-b-lg">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-100"><tr><th className="p-3 font-semibold text-left">Nome</th><th className="p-3 font-semibold text-right">Ações</th></tr></thead>
                            <tbody>
                                {receiptTerms.map(term => (
                                    <tr key={term.id} className="border-t">
                                        <td className="p-3">{term.name}</td>
                                        <td className="p-3"><div className="flex justify-end items-center gap-2">
                                            {permissions?.canManageCompanyData && (
                                                <>
                                                    <button onClick={() => handleOpenTermModal(term)}><EditIcon className="h-5 w-5 text-muted hover:text-primary" /></button>
                                                    {term.name !== 'Padrão' && <button onClick={() => setDeletingTerm(term)}><TrashIcon className="h-5 w-5 text-muted hover:text-danger" /></button>}
                                                </>
                                            )}
                                        </div></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {isTermModalOpen && <ReceiptTermModal item={editingTerm} onClose={() => { setIsTermModalOpen(false); setEditingTerm(null); }} onSave={handleSaveTerm} isSaving={savingTerm} />}
            <ConfirmationModal isOpen={!!deletingTerm} onClose={() => setDeletingTerm(null)} onConfirm={handleDeleteTerm} title="Excluir Termo" message={`Deseja excluir o termo "${deletingTerm?.name}"?`} />
        </div>
    );
};

// --- MEIOS DE PAGAMENTO TAB ---

const MeiosDePagamentoTab: React.FC = () => {
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethodParameter[]>([]);
    const [editingMethod, setEditingMethod] = useState<Partial<PaymentMethodParameter> | null>(null);
    const [deletingMethod, setDeletingMethod] = useState<PaymentMethodParameter | null>(null);
    const { showToast } = useToast();
    const { permissions, user } = useUser();

    const fetchData = useCallback(async () => { setPaymentMethods(await getPaymentMethods()); }, []);
    useEffect(() => { fetchData(); }, [fetchData]);

    const handleOpenEdit = (method: PaymentMethodParameter) => { setEditingMethod(method); };

    const [saving, setSaving] = useState(false);

    const handleSave = async (item: Partial<PaymentMethodParameter>) => {
        setSaving(true);
        try {
            if (item.id) {
                await updatePaymentMethod(item as PaymentMethodParameter, user?.id, user?.name);
                showToast('Atualizado!', 'success');
            } else {
                await addPaymentMethod(item as Omit<PaymentMethodParameter, 'id'>, user?.id, user?.name);
                showToast('Adicionado!', 'success');
            }
            fetchData();
            setEditingMethod(null);
        } catch (e) {
            showToast('Erro ao salvar.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deletingMethod) return;
        try {
            await deletePaymentMethod(deletingMethod.id, user?.id, user?.name);
            showToast('Excluído!', 'success');
            fetchData();
            setDeletingMethod(null);
        } catch (e) {
            showToast('Erro ao excluir.', 'error');
        }
    };

    return (
        <div className="bg-surface rounded-lg border border-border p-6 space-y-4">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h4 className="text-xl font-bold text-primary">Meios de Pagamentos</h4>
                </div>
                {permissions?.canManageCompanyData && (
                    <button onClick={() => setEditingMethod({ active: true, type: 'cash' })} className="px-4 py-2 bg-gray-700 text-white text-sm font-medium rounded-md hover:bg-gray-800 flex items-center gap-2">
                        Cadastrar
                    </button>
                )}
            </div>

            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
                        <tr>
                            <th className="px-6 py-3 border-b border-gray-200 w-full">Nome</th>
                            <th className="px-6 py-3 border-b border-gray-200">Tipo</th>
                            <th className="px-6 py-3 border-b border-gray-200">Status</th>
                            {permissions?.canManageCompanyData && <th className="px-6 py-3 border-b border-gray-200 text-right">Ações</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {paymentMethods.map(method => (
                            <tr key={method.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 text-sm font-medium text-gray-900">{method.name}</td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                    {method.type === 'card' ? 'Cartão' : 'Geral'}
                                </td>
                                <td className="px-6 py-4 text-sm">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${method.active !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {method.active !== false ? 'ativo' : 'inativo'}
                                    </span>
                                </td>
                                {permissions?.canManageCompanyData && (
                                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                                        <button onClick={() => handleOpenEdit(method)} className="p-1.5 text-gray-500 border border-gray-300 rounded hover:bg-gray-50 hover:text-primary transition-colors" title="Editar">
                                            <EditIcon className="h-4 w-4" />
                                        </button>
                                        <button onClick={() => setDeletingMethod(method)} className="p-1.5 text-gray-500 border border-gray-300 rounded hover:bg-gray-50 hover:text-danger transition-colors" title="Excluir">
                                            <TrashIcon className="h-4 w-4" />
                                        </button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
                {paymentMethods.length === 0 && (
                    <div className="p-8 text-center text-muted">Nenhum meio de pagamento cadastrado.</div>
                )}
            </div>

            {editingMethod && <PaymentMethodModal item={editingMethod} onClose={() => setEditingMethod(null)} onSave={handleSave} isSaving={saving} />}
            <ConfirmationModal isOpen={!!deletingMethod} onClose={() => setDeletingMethod(null)} onConfirm={handleDelete} title="Excluir" message={`Deseja excluir "${deletingMethod?.name}"?`} />
        </div>
    );
};

// FIX: Added type alias for Perfil form data to fix type errors.
// --- PERFIL TAB ---
type PerfilFormData = Partial<User> & {
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
};

const PerfilTab: React.FC = () => {
    const { user, refreshPermissions, loading, permissions } = useUser();
    const [formData, setFormData] = useState<PerfilFormData>({});
    const photoInputRef = useRef<HTMLInputElement>(null);
    const { showToast } = useToast();

    const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
    const [isPhotoMenuOpen, setIsPhotoMenuOpen] = useState(false);
    const photoMenuRef = useRef<HTMLDivElement>(null);
    const photoButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isPhotoMenuOpen && photoMenuRef.current && !photoMenuRef.current.contains(event.target as Node) && photoButtonRef.current && !photoButtonRef.current.contains(event.target as Node)) {
                setIsPhotoMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isPhotoMenuOpen]);

    useEffect(() => {
        if (user) {
            setFormData(user);
        }
    }, [user]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            address: {
                ...(prev.address || {}),
                [name]: value,
            } as Address,
        }));
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setFormData(prev => ({ ...prev, avatarUrl: base64String }));
                showToast('Foto atualizada. Lembre-se de salvar as alterações.', 'info');
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!user) return;
        // FIX: Destructure password fields from formData to avoid type errors.
        const { currentPassword, newPassword, confirmPassword, ...restOfUserData } = formData;

        if (newPassword && newPassword !== confirmPassword) {
            showToast('As novas senhas não coincidem.', 'error');
            return;
        }

        setSaving(true);
        try {
            const dataToSave: Partial<User> = { ...restOfUserData };
            if (newPassword) {
                dataToSave.password = newPassword;
            }

            await updateUser({ ...user, ...dataToSave } as User);

            refreshPermissions();

            showToast('Perfil atualizado com sucesso!', 'success');

            setFormData(prev => {
                const { currentPassword, newPassword, confirmPassword, ...rest } = prev;
                return rest;
            });

        } catch (error) {
            showToast('Erro ao atualizar o perfil.', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <SpinnerIcon />;
    const canEdit = permissions?.canEditOwnProfile;

    const inputClasses = `w-full p-2 border rounded bg-transparent border-border focus:ring-success focus:border-success text-sm h-10 ${!canEdit ? 'bg-gray-100 opacity-70 cursor-not-allowed' : ''}`;
    const labelClasses = "block text-sm font-medium text-primary mb-1";

    return (
        <div>
            <div className="bg-surface rounded-lg border border-border p-6 space-y-6">
                <div className="flex flex-col lg:flex-row gap-8">
                    <div className="w-full lg:w-52 flex-shrink-0">
                        <div className="p-4 border rounded-lg text-center sticky top-8">
                            <h3 className="font-semibold text-primary mb-4">Foto de Perfil</h3>
                            <input type="file" ref={photoInputRef} onChange={handlePhotoChange} className="hidden" accept="image/*" />
                            <div className="relative w-40 h-40 mx-auto">
                                <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                                    {formData.avatarUrl ? (
                                        <img src={formData.avatarUrl} alt="User Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <UserCircleIcon className="w-32 h-32 text-gray-400" />
                                    )}
                                </div>
                                <button
                                    ref={photoButtonRef}
                                    type="button"
                                    onClick={() => setIsPhotoMenuOpen(p => !p)}
                                    className="absolute -bottom-2 -right-2 bg-white p-2 rounded-full shadow-lg hover:bg-gray-100"
                                    title="Alterar foto"
                                >
                                    <EditIcon className="w-5 h-5 text-primary" />
                                </button>
                                {(isPhotoMenuOpen && canEdit) && (
                                    <div ref={photoMenuRef} className="absolute bottom-0 right-10 mb-2 w-40 bg-white rounded-md shadow-lg border border-border z-10">
                                        <button
                                            type="button"
                                            onClick={() => { photoInputRef.current?.click(); setIsPhotoMenuOpen(false); }}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-100"
                                        >
                                            <PhotographIcon className="h-4 w-4" />
                                            Enviar foto
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setIsCameraModalOpen(true); setIsPhotoMenuOpen(false); }}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-100"
                                        >
                                            <CameraIcon className="h-4 w-4" />
                                            Tirar foto
                                        </button>
                                    </div>
                                )}
                            </div>
                            {formData.avatarUrl && (
                                <button onClick={() => { setFormData(prev => ({ ...prev, avatarUrl: undefined })); if (photoInputRef.current) photoInputRef.current.value = ""; }} className="mt-4 text-sm text-danger hover:underline">Remover Foto</button>
                            )}
                        </div>
                    </div>
                    <div className="flex-1 space-y-6">
                        <div className="p-4 border rounded-lg space-y-4">
                            <h3 className="font-semibold text-primary">Dados Pessoais</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div><label className={labelClasses}>Nome</label><input name="name" value={formData.name || ''} onChange={handleInputChange} className={inputClasses} disabled={!canEdit} /></div>
                                <div><label className={labelClasses}>Email</label><input name="email" type="email" value={formData.email || ''} onChange={handleInputChange} className={inputClasses} disabled={!canEdit} /></div>
                            </div>
                        </div>
                        <div className="p-4 border rounded-lg space-y-4">
                            <h3 className="font-semibold text-primary">Endereço</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                                <div className="sm:col-span-1"><label className={labelClasses}>CEP</label><input name="zip" value={formData.address?.zip || ''} onChange={handleAddressChange} className={inputClasses} disabled={!canEdit} /></div>
                                <div className="sm:col-span-3"><label className={labelClasses}>Logradouro</label><input name="street" value={formData.address?.street || ''} onChange={handleAddressChange} className={inputClasses} disabled={!canEdit} /></div>
                                <div className="sm:col-span-1"><label className={labelClasses}>Número</label><input name="number" value={formData.address?.number || ''} onChange={handleAddressChange} className={inputClasses} disabled={!canEdit} /></div>
                                <div className="sm:col-span-1"><label className={labelClasses}>Complemento</label><input name="complement" value={formData.address?.complement || ''} onChange={handleAddressChange} className={inputClasses} disabled={!canEdit} /></div>
                                <div className="sm:col-span-2"><label className={labelClasses}>Bairro</label><input name="neighborhood" value={formData.address?.neighborhood || ''} onChange={handleAddressChange} className={inputClasses} disabled={!canEdit} /></div>
                                <div className="sm:col-span-3"><label className={labelClasses}>Cidade</label><input name="city" value={formData.address?.city || ''} onChange={handleAddressChange} className={inputClasses} disabled={!canEdit} /></div>
                                <div className="sm:col-span-1"><label className={labelClasses}>UF</label><input name="state" value={formData.address?.state || ''} onChange={handleAddressChange} className={inputClasses} disabled={!canEdit} /></div>
                            </div>
                        </div>
                        <div className="p-4 border rounded-lg space-y-4">
                            <h3 className="font-semibold text-primary">Alterar Senha</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div><label className={labelClasses}>Senha Atual</label><input name="currentPassword" type="password" onChange={handleInputChange} value={formData.currentPassword || ''} className={inputClasses} placeholder="••••••••" disabled={!canEdit} /></div>
                                <div><label className={labelClasses}>Nova Senha</label><input name="newPassword" type="password" onChange={handleInputChange} value={formData.newPassword || ''} className={inputClasses} placeholder="••••••••" disabled={!canEdit} /></div>
                                <div><label className={labelClasses}>Confirmar Nova Senha</label><input name="confirmPassword" type="password" onChange={handleInputChange} value={formData.confirmPassword || ''} className={inputClasses} placeholder="••••••••" disabled={!canEdit} /></div>
                            </div>
                        </div>
                    </div>
                </div>
                {canEdit && (
                    <div className="flex justify-end pt-4 border-t mt-6">
                        <Button onClick={handleSave} variant="success" loading={saving} icon={<CheckIcon className="h-5 w-5" />}>Salvar Alterações</Button>
                    </div>
                )}
            </div>
            <CameraModal
                isOpen={isCameraModalOpen}
                onClose={() => setIsCameraModalOpen(false)}
                onCapture={(imageData) => {
                    setFormData(prev => ({ ...prev, avatarUrl: imageData }));
                    setIsCameraModalOpen(false);
                }}
            />
        </div>
    );
};


// --- MAIN COMPONENT ---
const Company: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const { permissions, user } = useUser();
    const activeTab = searchParams.get('tab') || 'dados';

    const allTabs = useMemo(() => [
        { id: 'dados', label: 'Dados da Empresa', permission: 'canManageCompanyData' },
        { id: 'usuarios', label: 'Usuários e Permissões', permission: 'canManageUsers' },
        { id: 'marcas', label: 'Marcas e Categorias', permission: 'canManageMarcasECategorias' },
        { id: 'perfil', label: 'Perfil', permission: 'canEditOwnProfile' },
        { id: 'parametros', label: 'Parâmetros', permission: 'canManageCompanyData' },
        { id: 'meios_pagamento', label: 'Meios de Pagamento', permission: 'canManageCompanyData' },
        { id: 'auditoria', label: 'Auditoria', permission: 'canViewAudit' },
        { id: 'backup', label: 'Backup e Restauração', permission: 'canManageCompanyData' },
    ], []);

    const visibleTabs = useMemo(() => {
        if (!permissions) return allTabs.filter(t => t.id === 'perfil'); // Only show profile while loading
        return allTabs.filter(tab => {
            if (tab.permission === true) return true;
            if (tab.id === 'usuarios') return permissions.canManageUsers || permissions.canManagePermissions;
            return permissions[tab.permission as keyof PermissionSet];
        });
    }, [permissions, allTabs]);

    useEffect(() => {
        if (visibleTabs.length > 0 && !visibleTabs.find(t => t.id === activeTab)) {
            setSearchParams({ tab: visibleTabs[0].id });
        }
    }, [visibleTabs, activeTab, setSearchParams]);

    const renderContent = () => {
        if (!visibleTabs.find(t => t.id === activeTab)) {
            return <div className="text-center p-8 text-muted">Acesso negado.</div>;
        }

        let content;
        switch (activeTab) {
            case 'dados': content = <DadosEmpresaTab />; break;
            case 'usuarios': content = <Users />; break;
            case 'marcas': content = <MarcasECategoriasTab />; break;
            case 'parametros': content = <ParametrosTab />; break;
            case 'meios_pagamento': content = <MeiosDePagamentoTab />; break;
            case 'auditoria': content = <AuditoriaTab />; break;
            case 'backup': content = <BackupRestauracaoTab />; break;
            case 'perfil': content = <PerfilTab />; break;
            default: content = <DadosEmpresaTab />; break;
        }

        if (activeTab === 'usuarios') {
            return content;
        }

        return <div className="max-w-5xl">{content}</div>;
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-primary">Empresa</h1>
            <div className="flex items-center gap-1 bg-surface-secondary p-1 rounded-lg overflow-x-auto">
                {visibleTabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setSearchParams({ tab: tab.id })}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${activeTab === tab.id ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-primary'}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
            {renderContent()}
        </div>
    );
};

// --- HELPER MODAL COMPONENT ---
interface ManagementModalProps {
    type: ModalType;
    item: Partial<Item> | null;
    onSave: (type: ModalType, item: Partial<Item>) => void;
    onClose: () => void;
    loading?: boolean;
}
const ManagementModal: React.FC<ManagementModalProps> = ({ type, item, onSave, onClose, loading }) => {
    const [name, setName] = useState(item?.name || '');
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSave(type, { ...item, name }); };
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
            <form onSubmit={handleSubmit} className="bg-surface rounded-lg shadow-xl p-6 w-full max-w-sm">
                <h3 className="font-bold text-lg mb-4">{item?.id ? 'Editar' : 'Adicionar'} {type === 'gradeValue' ? 'Valor da Grade' : type}</h3>
                <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full p-2 border rounded bg-transparent border-border mb-4"
                    autoFocus
                    required
                />
                <div className="flex justify-end gap-2">
                    <Button type="button" onClick={onClose} variant="secondary">Cancelar</Button>
                    <Button type="submit" variant="success" loading={loading}>Salvar</Button>
                </div>
            </form>
        </div>
    );
};

export default Company;
