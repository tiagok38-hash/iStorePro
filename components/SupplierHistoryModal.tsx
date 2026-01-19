import React, { useState, useMemo } from 'react';
import { Supplier, PurchaseOrder, StockStatus, FinancialStatus, User, Product } from '../../types.ts';
import { formatCurrency } from '../services/mockApi.ts';
import { CloseIcon, EyeIcon } from './icons.tsx';
import PurchaseOrderDetailModal from './PurchaseOrderDetailModal.tsx';

const formatDateTime = (dateString: string) => new Date(dateString).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

const stockStatusStyles: Record<StockStatus, string> = { 'Lançado': 'bg-green-100 text-green-600', 'Pendente': 'bg-orange-100 text-orange-600', 'Parcialmente Lançado': 'bg-yellow-100 text-yellow-600' };
const financialStatusStyles: Record<FinancialStatus, string> = { 'Pago': 'bg-green-100 text-green-600', 'Pendente': 'bg-orange-100 text-orange-600' };

interface SupplierHistoryModalProps {
    supplier: Supplier;
    purchases: PurchaseOrder[];
    onClose: () => void;
    users?: User[];
    products?: Product[];
}

const SupplierHistoryModal: React.FC<SupplierHistoryModalProps> = ({ supplier, purchases, onClose, users = [], products = [] }) => {
    const [purchaseToView, setPurchaseToView] = useState<PurchaseOrder | null>(null);

    // Helper to resolve user name - first try by ID, then by name
    const resolveUserName = (createdBy: string | undefined): string => {
        if (!createdBy) return 'Sistema';

        // Try lookup by ID first
        const byId = users.find(u => u.id === createdBy);
        if (byId) return byId.name;

        // Try exact name match
        const byName = users.find(u => u.name === createdBy);
        if (byName) return byName.name;

        // For legacy "Admin User", try to find an admin
        if (createdBy === 'Admin User') {
            const admin = users.find(u => u.permissionProfileId === 'profile-admin');
            if (admin) return admin.name;
            return 'Administrador';
        }

        return createdBy;
    };

    // Get products associated with the selected purchase
    const associatedProducts = useMemo(() => {
        if (!purchaseToView) return [];
        return products.filter(p => p.purchaseOrderId === purchaseToView.id);
    }, [purchaseToView, products]);

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
                <div className="bg-surface rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
                    <div className="flex justify-between items-center p-4 border-b border-border">
                        <h2 className="text-2xl font-bold text-primary">Histórico de Compras - {supplier.name}</h2>
                        <button onClick={onClose} className="p-1 text-muted hover:text-danger"><CloseIcon className="h-6 w-6" /></button>
                    </div>
                    <div className="p-6 flex-1 overflow-y-auto">
                        {purchases.length === 0 ? <p className="text-muted text-center py-8">Nenhuma compra encontrada para este fornecedor.</p> : (
                            <div className="border border-border rounded-lg overflow-hidden">
                                <table className="w-full text-sm text-left text-muted">
                                    <thead className="text-xs text-secondary uppercase bg-surface-secondary">
                                        <tr>
                                            <th scope="col" className="px-4 py-3">ID</th>
                                            <th scope="col" className="px-4 py-3">Localizador</th>
                                            <th scope="col" className="px-4 py-3">Data</th>
                                            <th scope="col" className="px-4 py-3">Responsável</th>
                                            <th scope="col" className="px-4 py-3 text-right">Total</th>
                                            <th scope="col" className="px-4 py-3 text-center">Estoque</th>
                                            <th scope="col" className="px-4 py-3 text-center">Financeiro</th>
                                            <th scope="col" className="px-4 py-3 text-center">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {purchases.map(purchase => (
                                            <tr key={purchase.id} className="bg-surface border-b border-border last:border-b-0 hover:bg-surface-secondary">
                                                <td className="px-4 py-3 font-medium text-primary">#{purchase.displayId}</td>
                                                <td className="px-4 py-3">
                                                    <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                                                        {purchase.locatorId || '-'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-xs">{formatDateTime(purchase.purchaseDate)}</td>
                                                <td className="px-4 py-3 text-xs">
                                                    {resolveUserName(purchase.createdBy)}
                                                </td>
                                                <td className="px-4 py-3 text-right font-semibold text-primary">{formatCurrency(purchase.total)}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${stockStatusStyles[purchase.stockStatus]}`}>
                                                        {purchase.stockStatus}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${financialStatusStyles[purchase.financialStatus]}`}>
                                                        {purchase.financialStatus}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <button
                                                        onClick={() => setPurchaseToView(purchase)}
                                                        className="p-1.5 text-secondary hover:text-primary hover:bg-gray-100 rounded-md transition-colors"
                                                        title="Ver detalhes da compra"
                                                    >
                                                        <EyeIcon className="w-5 h-5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                    <div className="flex justify-end items-center p-4 border-t border-border mt-auto">
                        <button onClick={onClose} className="px-6 py-2 bg-danger text-white rounded-md hover:bg-danger/90">Fechar</button>
                    </div>
                </div>
            </div>

            {purchaseToView && (
                <PurchaseOrderDetailModal
                    purchase={purchaseToView}
                    onClose={() => setPurchaseToView(null)}
                    associatedProducts={associatedProducts}
                />
            )}
        </>
    );
};

export default SupplierHistoryModal;