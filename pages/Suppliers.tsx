import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Supplier } from '../types.ts';
import { getSuppliers, addSupplier, updateSupplier, deleteSupplier } from '../iStorePro/services/mockApi.ts';
import { useToast } from '../contexts/ToastContext.tsx';
import ConfirmationModal from '../components/ConfirmationModal.tsx';
import SupplierModal from '../components/SupplierModal.tsx';
import { SpinnerIcon, EditIcon, TrashIcon, SearchIcon } from '../components/icons.tsx';


const Suppliers: React.FC = () => {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Partial<Supplier> | null>(null);
    const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const { showToast } = useToast();

    const fetchSuppliers = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getSuppliers();
            setSuppliers(data);
        } catch (error) {
            showToast('Erro ao carregar fornecedores.', 'error');
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        fetchSuppliers();
    }, [fetchSuppliers]);

    const filteredSuppliers = useMemo(() =>
        suppliers.filter(s =>
            s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.cnpj.toLowerCase().includes(searchTerm.toLowerCase())
        ),
        [suppliers, searchTerm]);

    const handleOpenModal = (supplier: Partial<Supplier> | null = null) => {
        setEditingSupplier(supplier ? { ...supplier } : {});
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingSupplier(null);
    };

    const handleSaveSupplier = async (supplierData: Omit<Supplier, 'id'> | Supplier) => {
        try {
            if ('id' in supplierData && supplierData.id) {
                await updateSupplier(supplierData as Supplier);
                showToast('Fornecedor atualizado com sucesso!', 'success');
            } else {
                await addSupplier(supplierData);
                showToast('Fornecedor adicionado com sucesso!', 'success');
            }
            fetchSuppliers();
            handleCloseModal();
        } catch (error) {
            showToast('Erro ao salvar fornecedor.', 'error');
        }
    };

    const handleDeleteConfirm = async () => {
        if (!supplierToDelete) return;
        try {
            await deleteSupplier(supplierToDelete.id);
            showToast('Fornecedor excluído com sucesso!', 'success');
            fetchSuppliers();
            setSupplierToDelete(null);
        } catch (error) {
            showToast('Erro ao excluir fornecedor.', 'error');
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-primary">Fornecedores</h1>
            <div className="bg-surface rounded-lg border border-border p-6">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                    <div className="relative w-full sm:w-auto">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted"><SearchIcon /></span>
                        <input
                            type="text"
                            placeholder="Buscar por nome ou CNPJ..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="pl-10 p-2 border rounded-md w-full sm:w-80 bg-transparent border-border focus:ring-success focus:border-success"
                        />
                    </div>
                    <button onClick={() => handleOpenModal()} className="px-4 py-2 bg-success text-white rounded-md hover:bg-success/90 w-full sm:w-auto">
                        Adicionar Fornecedor
                    </button>
                </div>
                {loading ? <div className="flex justify-center py-8"><SpinnerIcon /></div> : (
                    filteredSuppliers.length === 0 ? <p className="text-center text-muted py-8">Nenhum fornecedor encontrado.</p> : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-muted">
                                <thead className="text-xs text-secondary uppercase bg-surface-secondary">
                                    <tr>
                                        <th scope="col" className="px-6 py-3">Fornecedor</th>
                                        <th scope="col" className="px-6 py-3">Contato</th>
                                        <th scope="col" className="px-6 py-3">CNPJ</th>
                                        <th scope="col" className="px-6 py-3">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredSuppliers.map(supplier => (
                                        <tr key={supplier.id} className="bg-surface border-b border-border hover:bg-surface-secondary">
                                            <td className="px-6 py-4 font-medium text-primary">{supplier.name}</td>
                                            <td className="px-6 py-4">{supplier.contactPerson} ({supplier.phone})</td>
                                            <td className="px-6 py-4">{supplier.cnpj}</td>
                                            <td className="px-6 py-4 flex items-center space-x-2">
                                                <button onClick={() => handleOpenModal(supplier)} className="text-success hover:text-success/80 p-1"><EditIcon /></button>
                                                <button onClick={() => setSupplierToDelete(supplier)} className="text-danger hover:text-danger/80 p-1"><TrashIcon /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
                )}
                {isModalOpen && <SupplierModal supplier={editingSupplier} onClose={handleCloseModal} onSave={handleSaveSupplier} />}
                <ConfirmationModal
                    isOpen={!!supplierToDelete}
                    onClose={() => setSupplierToDelete(null)}
                    onConfirm={handleDeleteConfirm}
                    title="Confirmar Exclusão"
                    message={`Tem certeza que deseja excluir o fornecedor "${supplierToDelete?.name}"?`}
                />
            </div>
        </div>
    );
};

export default Suppliers;