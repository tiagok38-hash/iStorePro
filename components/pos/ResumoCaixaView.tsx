
import React, { useState } from 'react';
import { CashSession, Sale, Product, Customer, User } from '../../../types.ts';
import { formatCurrency } from '../../services/mockApi.ts';
import {
    CashRegisterIcon, CheckIcon, ShoppingCartPlusIcon, MinusIcon, PlusIcon,
    XCircleIcon, ArrowPathRoundedSquareIcon, ShoppingCartIcon, EditIcon,
    EyeIcon, PrinterIcon, TrashIcon, CashIcon
} from '../icons.tsx';

interface ResumoCaixaViewProps {
    viewSession: CashSession | null;
    currentUserOpenSession: CashSession | null;
    sessionSales: Sale[];
    customers: Customer[];
    handleNewSession: () => void;
    setActiveView: (view: any) => void;
    handleOpenCashMovement: (type: 'suprimento' | 'sangria') => void;
    handleCloseSession: (s: CashSession) => void;
    handleReopenSession: (s: CashSession) => void;
    handleEditSale: (sale: Sale) => void;
    handleViewClick: (sale: Sale) => void;
    handlePrintClick: (sale: Sale) => void;
    cancelSale: (id: string, reason: string) => Promise<any>;
    showToast: (msg: string, type: any) => void;
    fetchData: () => void;
    users: User[];
}

export const ResumoCaixaView: React.FC<ResumoCaixaViewProps> = ({
    viewSession, currentUserOpenSession, sessionSales, customers,
    handleNewSession, setActiveView, handleOpenCashMovement,
    handleCloseSession, handleReopenSession, handleEditSale,
    handleViewClick, handlePrintClick, cancelSale, showToast, fetchData, users
}) => {
    const [viewMovementsType, setViewMovementsType] = useState<'sangria' | 'suprimento' | null>(null);
    const targetSession = viewSession || currentUserOpenSession;
    const isCurrent = targetSession?.id === currentUserOpenSession?.id;
    const isOpen = targetSession?.status === 'aberto';

    // Calcular totais por método de pagamento
    const totalsByMethod: Record<string, number> = {};
    (sessionSales || []).forEach(s => {
        if (s.status === 'Cancelada') return;
        (s.payments || []).forEach(p => {
            totalsByMethod[p.method] = (totalsByMethod[p.method] || 0) + (p.value || 0);
        });
    });

    // Somar todas as variações de "Dinheiro" (case insensitive)
    let cashSales = 0;
    Object.entries(totalsByMethod).forEach(([method, value]) => {
        if (method.trim().toLowerCase() === 'dinheiro') {
            cashSales += Number(value || 0);
        }
    });

    // CORREÇÃO: Usar 'deposits' ao invés de 'supply' conforme renderizado na UI
    const calculatedCashInRegister = Number(targetSession?.openingBalance || 0) + cashSales + Number(targetSession?.deposits || 0) - Number(targetSession?.withdrawals || 0);

    if (!targetSession) {
        return (
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 text-center flex flex-col items-center gap-6">
                <div className="p-4 bg-gray-100 rounded-full">
                    <CashRegisterIcon className="h-16 w-16 text-gray-400" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-gray-700">Seu caixa está fechado</h3>
                    <p className="text-muted">Abra seu caixa para começar a realizar vendas.</p>
                </div>
                <button
                    onClick={handleNewSession}
                    className="px-8 py-4 bg-success text-white rounded-xl font-black text-lg shadow-xl shadow-success/20 hover:bg-success/90 transition-all transform hover:-translate-y-1 active:translate-y-0 flex items-center gap-3"
                >
                    <CheckIcon className="h-6 w-6" />
                    ABRIR MEU CAIXA
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold text-gray-800">{viewSession ? 'Detalhes do Caixa' : 'Meu Caixa'}</h2>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
                {/* Card 1: Faturamento (8/12 width) */}
                <div className="lg:col-span-8 bg-white p-5 rounded-xl shadow-sm border border-primary/20 flex flex-col justify-between relative overflow-hidden h-full">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-success"></div>
                    <div>
                        <div className="flex items-center justify-between gap-4 mb-4">
                            <div className="flex items-center gap-2">
                                <span className="p-1 px-1.5 bg-success/10 rounded text-success">
                                    <ShoppingCartIcon className="h-5 w-5" />
                                </span>
                                <span className="text-xs font-bold text-gray-700 uppercase tracking-widest">Total do Caixa</span>
                            </div>
                            <div className="text-4xl font-black text-gray-800">
                                {formatCurrency(targetSession.transactionsValue)}
                            </div>
                        </div>

                        <div className="pt-4 border-t border-gray-100">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {Object.entries(totalsByMethod).sort((a, b) => (a[0].trim().toLowerCase() === 'dinheiro' ? -1 : 1)).map(([method, value]) => {
                                    const isCash = method.trim().toLowerCase() === 'dinheiro';
                                    const isPromissoria = method.trim().toLowerCase().includes('promiss');
                                    return (
                                        <div key={method} className={`p-2.5 px-4 rounded-xl border flex items-center justify-between gap-2 transition-all ${isCash ? 'bg-success/5 border-success/30 ring-1 ring-success/10' : isPromissoria ? 'bg-red-50 border-red-300 ring-2 ring-red-200' : 'bg-white border-gray-200 shadow-sm'}`}>
                                            <span className={`text-[10px] font-bold uppercase tracking-wider ${isCash ? 'text-success' : isPromissoria ? 'text-red-600' : 'text-gray-500'}`}>
                                                {method} {isCash && '★'} {isPromissoria && '⚠'}
                                            </span>
                                            <span className={`text-base font-black ${isCash ? 'text-success' : isPromissoria ? 'text-red-600' : 'text-gray-800'}`}>
                                                {formatCurrency(value)}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Coluna Direita (Stack - 4/12 width) */}
                <div className="lg:col-span-4 flex flex-col gap-3 h-full">
                    {/* Compact Balance & Movements Card */}
                    <div className={`bg-white p-5 rounded-xl shadow-sm border ${isOpen ? 'border-success/30' : 'border-red-500/30'} relative overflow-hidden flex flex-col justify-between gap-6 h-full text-gray-700`}>
                        <div className={`absolute top-0 left-0 w-1.5 h-full ${isOpen ? 'bg-success' : 'bg-red-500'}`}></div>

                        {/* Header: Title & Total */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold uppercase tracking-widest">Dinheiro espécie na gaveta</span>
                                <span className={`px-2 py-1 ${isOpen ? 'bg-success' : 'bg-red-500'} text-white text-[10px] font-black uppercase rounded shrink-0`}>{targetSession.status === 'aberto' ? 'ABERTO' : 'FECHADO'}</span>
                            </div>
                            <div className="text-4xl font-black text-gray-800 leading-none cursor-help" title={`Abertura: ${formatCurrency(targetSession?.openingBalance || 0)} + Vendas: ${formatCurrency(cashSales)} + Suprim.: ${formatCurrency(targetSession?.deposits || 0)} - Sangrias: ${formatCurrency(targetSession?.withdrawals || 0)}`}>
                                {formatCurrency(calculatedCashInRegister)}
                            </div>
                        </div>

                        {/* Movements Section (Integrated) */}
                        <div className="space-y-4 pt-4 border-t border-gray-100">

                            {/* Sangria Row */}
                            <div className="flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-bold text-red-500 uppercase tracking-widest">Sangria (-)</span>
                                    <span className="text-xl font-black text-gray-800 tracking-tight">{formatCurrency(targetSession.withdrawals || 0)}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={() => setViewMovementsType('sangria')}
                                        title="Visualizar Sangrias"
                                        className="p-2 bg-gray-50 text-gray-400 hover:bg-primary/10 hover:text-primary rounded-lg transition-all border border-gray-100 shadow-sm"
                                    >
                                        <EyeIcon className="h-4 w-4" />
                                    </button>
                                    {isOpen && (
                                        <button onClick={() => handleOpenCashMovement('sangria')} title="Nova Sangria" className="p-2 bg-danger/5 text-danger hover:bg-danger hover:text-white rounded-lg border border-danger/30 transition-all shadow-sm">
                                            <MinusIcon className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>

                            </div>

                            {/* Suprimento Row */}
                            <div className="flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-bold text-green-600 uppercase tracking-widest">Suprimento (+)</span>
                                    <span className="text-xl font-black text-gray-800 tracking-tight">{formatCurrency(targetSession.deposits || 0)}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={() => setViewMovementsType('suprimento')}
                                        title="Visualizar Suprimentos"
                                        className="p-2 bg-gray-50 text-gray-400 hover:bg-primary/10 hover:text-primary rounded-lg transition-all border border-gray-100 shadow-sm"
                                    >
                                        <EyeIcon className="h-4 w-4" />
                                    </button>
                                    {isOpen && (
                                        <button onClick={() => handleOpenCashMovement('suprimento')} title="Novo Suprimento" className="p-2 bg-success/5 text-success hover:bg-success hover:text-white rounded-lg border border-success/30 transition-all shadow-sm">
                                            <PlusIcon className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Ações e Informações da Sessão */}
            <div className="flex flex-wrap items-center gap-4">
                {isOpen && (
                    <>
                        <button
                            onClick={() => setActiveView('pdv')}
                            className="flex-1 min-w-[200px] px-8 py-4 bg-success text-white rounded-xl font-black shadow-lg shadow-success/20 hover:bg-success/90 transition-all flex items-center justify-center gap-3 text-lg uppercase tracking-tight transform hover:-translate-y-0.5 active:translate-y-0"
                        >
                            <ShoppingCartPlusIcon className="h-7 w-7" />
                            NOVA VENDA
                        </button>
                        <button
                            onClick={() => handleCloseSession(targetSession)}
                            className="px-8 py-4 bg-white text-danger border-2 border-danger rounded-xl font-black shadow-sm hover:bg-danger hover:text-white transition-all flex items-center gap-3 text-lg uppercase tracking-tight transform hover:-translate-y-0.5 active:translate-y-0"
                        >
                            <XCircleIcon className="h-7 w-7" />
                            FECHAR CAIXA
                        </button>
                    </>
                )}

                {targetSession.status === 'fechado' && (
                    <button
                        onClick={() => handleReopenSession(targetSession)}
                        className="px-8 py-4 bg-blue-500 text-white rounded-xl font-black shadow-lg shadow-blue-500/20 hover:bg-blue-600 transition-all flex items-center gap-3 text-lg uppercase tracking-tight"
                    >
                        <ArrowPathRoundedSquareIcon className="h-7 w-7" />
                        REABRIR CAIXA
                    </button>
                )}

                <div className="flex-1 flex flex-wrap items-center gap-6 bg-white p-4 rounded-xl border border-gray-100 ml-auto">
                    <div className="px-4 border-r border-gray-100">
                        <p className="text-[10px] text-muted uppercase font-bold tracking-wider">Aberto em</p>
                        <p className="font-bold text-gray-700">{new Date(targetSession.openTime).toLocaleString('pt-BR')}</p>
                    </div>
                    {targetSession.closeTime && (
                        <div className="px-4 border-r border-gray-100">
                            <p className="text-[10px] text-muted uppercase font-bold tracking-wider">Fechado em</p>
                            <p className="font-bold text-gray-700">{new Date(targetSession.closeTime).toLocaleString('pt-BR')}</p>
                        </div>
                    )}
                    <div className="px-4">
                        <p className="text-[10px] text-muted uppercase font-bold tracking-wider">Operador</p>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-success"></div>
                            <p className="font-bold text-gray-700">{users.find(u => u.id === targetSession.userId)?.name || 'Sistema'}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <ShoppingCartIcon className="h-5 w-5 text-primary" />
                        Vendas desta Sessão
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-base text-left">
                        <thead className="bg-gray-50 text-gray-600 uppercase text-xs font-black tracking-widest border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-3">ID Venda</th>
                                <th className="px-6 py-3">Hora</th>
                                <th className="px-6 py-3">Cliente</th>
                                <th className="px-6 py-3 text-right">Valor</th>
                                <th className="px-6 py-3 text-center">Status</th>
                                <th className="px-6 py-3 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-gray-700">
                            {sessionSales.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-muted italic">
                                        Nenhuma venda realizada nesta sessão ainda.
                                    </td>
                                </tr>
                            ) : (
                                sessionSales.map(sale => {
                                    const hasPromissoria = (sale.payments || []).some(p => p.method?.toLowerCase().includes('promiss'));
                                    return (
                                        <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 font-black text-primary">#{sale.id}</td>
                                            <td className="px-6 py-4 text-sm font-semibold text-gray-600">
                                                {new Date(sale.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className="px-6 py-4 font-semibold text-gray-800">
                                                {customers.find(c => c.id === sale.customerId)?.name || 'Cliente'}
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-success">
                                                {formatCurrency(sale.total)}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex gap-1 justify-center items-center flex-wrap">
                                                    {hasPromissoria && (
                                                        <span className="px-2 py-1 rounded text-[10px] font-black uppercase bg-red-100 text-red-600">Promissória</span>
                                                    )}
                                                    {sale.status === 'Editada' ? (
                                                        <>
                                                            <span className="px-2 py-1 rounded text-[10px] font-black uppercase bg-purple-100 text-purple-700">Editada</span>
                                                            <span className="px-2 py-1 rounded text-[10px] font-black uppercase bg-green-100 text-green-700">Finalizada</span>
                                                        </>
                                                    ) : (
                                                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${sale.status === 'Cancelada' ? 'bg-red-100 text-red-600' :
                                                            sale.status === 'Pendente' ? 'bg-orange-100 text-orange-600' :
                                                                'bg-green-100 text-green-600'
                                                            }`}>
                                                            {sale.status}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {sale.status !== 'Cancelada' && (
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            title="Editar Venda"
                                                            className="p-1.5 text-blue-500 hover:bg-blue-50 rounded transition-colors"
                                                            onClick={() => {
                                                                if (!isOpen) {
                                                                    showToast('Você precisa abrir este caixa para poder fazer a modificação.', 'error');
                                                                    return;
                                                                }
                                                                handleEditSale(sale);
                                                            }}
                                                        >
                                                            <EditIcon className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            title="Visualizar Venda"
                                                            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors"
                                                            onClick={() => handleViewClick(sale)}
                                                        >
                                                            <EyeIcon className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            title="Reimprimir Comprovante"
                                                            className="p-1.5 text-blue-500 hover:bg-blue-50 rounded transition-colors"
                                                            onClick={() => handlePrintClick(sale)}
                                                        >
                                                            <PrinterIcon className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            title="Cancelar Venda"
                                                            onClick={() => {
                                                                if (!isOpen) {
                                                                    showToast('Você precisa abrir este caixa para poder fazer a modificação.', 'error');
                                                                    return;
                                                                }
                                                                if (confirm('Tem certeza que deseja cancelar esta venda?')) {
                                                                    cancelSale(sale.id, 'Cancelamento rápido pelo caixa')
                                                                        .then(() => {
                                                                            showToast('Venda cancelada com sucesso.', 'success');
                                                                            fetchData();
                                                                        })
                                                                        .catch(() => showToast('Erro ao cancelar venda.', 'error'));
                                                                }
                                                            }}
                                                            className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                                                        >
                                                            <TrashIcon className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Visualização de Movimentações */}
            {
                viewMovementsType && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-scale-in">
                            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <h3 className="font-black text-gray-800 flex items-center gap-2 uppercase tracking-tight">
                                    <CashIcon className={`h-5 w-5 ${viewMovementsType === 'sangria' ? 'text-red-500' : 'text-green-600'}`} />
                                    Detalhamento de {viewMovementsType === 'sangria' ? 'Sangrias (Saídas)' : 'Suprimentos (Entradas)'}
                                </h3>
                                <button
                                    onClick={() => setViewMovementsType(null)}
                                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <XCircleIcon className="h-6 w-6 text-gray-400" />
                                </button>
                            </div>

                            <div className="max-h-[60vh] overflow-y-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-bold tracking-widest sticky top-0 z-10">
                                        <tr>
                                            <th className="px-6 py-3">Data/Hora</th>
                                            <th className="px-6 py-3">Operador</th>
                                            <th className="px-6 py-3">Motivo</th>
                                            <th className="px-6 py-3 text-right">Valor</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 text-gray-700">
                                        {(!targetSession.movements || targetSession.movements.filter(m => m.type === viewMovementsType).length === 0) ? (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-8 text-center text-muted italic">
                                                    Nenhuma {viewMovementsType} realizada nesta sessão.
                                                </td>
                                            </tr>
                                        ) : (
                                            targetSession.movements
                                                .filter(m => m.type === viewMovementsType)
                                                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                                                .map(mov => (
                                                    <tr key={mov.id} className="hover:bg-gray-50 transition-colors">
                                                        <td className="px-6 py-4 text-xs font-medium text-gray-500">
                                                            {new Date(mov.timestamp).toLocaleString('pt-BR')}
                                                        </td>
                                                        <td className="px-6 py-4 font-medium">
                                                            {users.find(u => u.id === mov.userId)?.name || 'Usuário'}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            {mov.reason}
                                                        </td>
                                                        <td className={`px-6 py-4 text-right font-black ${viewMovementsType === 'sangria' ? 'text-red-500' : 'text-green-600'}`}>
                                                            {viewMovementsType === 'sangria' ? '-' : '+'} {formatCurrency(mov.amount)}
                                                        </td>
                                                    </tr>
                                                ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center text-sm">
                                <span className="font-bold text-gray-500 uppercase tracking-wider">Total Acumulado:</span>
                                <span className={`text-xl font-black ${viewMovementsType === 'sangria' ? 'text-red-500' : 'text-green-600'}`}>
                                    {formatCurrency(viewMovementsType === 'sangria' ? (targetSession.withdrawals || 0) : (targetSession.deposits || 0))}
                                </span>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default React.memo(ResumoCaixaView);
