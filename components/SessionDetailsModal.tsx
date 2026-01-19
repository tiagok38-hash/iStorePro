import React, { useMemo } from 'react';
import { CashSession, Sale } from '../../types.ts';
import { XCircleIcon, ShoppingCartIcon, CalendarDaysIcon, UsersIcon, BanknotesIcon } from './icons.tsx';
import { formatCurrency } from '../services/mockApi.ts';

interface SessionDetailsModalProps {
    session: CashSession;
    sales: Sale[];
    userMap: Record<string, string>;
    customerMap: Record<string, string>;
    onClose: () => void;
}

const SessionDetailsModal: React.FC<SessionDetailsModalProps> = ({ session, sales, userMap, customerMap, onClose }) => {
    const totalSales = useMemo(() => sales.reduce((sum, s) => sum + s.total, 0), [sales]);

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="bg-gray-50 border-b border-gray-100 p-6 flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                            <span className="text-primary">#{session.displayId}</span>
                            <span>Detalhes do Caixa</span>
                        </h2>
                        <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
                            <div className="flex items-center gap-1"><UsersIcon className="h-4 w-4" /> {userMap[session.userId]}</div>
                            <div className="flex items-center gap-1"><CalendarDaysIcon className="h-4 w-4" /> {new Date(session.openTime).toLocaleDateString()}</div>
                            <div className={`font-bold px-2 py-0.5 rounded uppercase text-xs ${session.status === 'aberto' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {session.status}
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400 hover:text-red-500">
                        <XCircleIcon className="h-6 w-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 flex-1 overflow-y-auto max-h-[60vh] space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <p className="text-xs uppercase font-bold text-gray-500 mb-1">Total em Vendas</p>
                            <p className="text-2xl font-black text-gray-800">{formatCurrency(totalSales)}</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <p className="text-xs uppercase font-bold text-gray-500 mb-1">Saldo Final (Gaveta)</p>
                            <p className="text-2xl font-black text-success">{formatCurrency(session.cashInRegister)}</p>
                        </div>
                    </div>

                    {/* Sales List */}
                    <div>
                        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2 text-sm uppercase tracking-wider">
                            <ShoppingCartIcon className="h-4 w-4 text-primary" /> Vendas Realizadas ({sales.length})
                        </h3>
                        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-bold tracking-widest border-b border-gray-100">
                                    <tr>
                                        <th className="px-4 py-3">ID</th>
                                        <th className="px-4 py-3">Hora</th>
                                        <th className="px-4 py-3">Cliente</th> {/* Should pass customers map? user prompt said summarized. */}
                                        <th className="px-4 py-3 text-right">Valor</th>
                                        <th className="px-4 py-3 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {sales.length === 0 ? (
                                        <tr><td colSpan={5} className="px-4 py-8 text-center text-muted italic">Nenhuma venda neste caixa.</td></tr>
                                    ) : sales.map(sale => (
                                        <tr key={sale.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 font-bold text-primary">#{sale.id}</td>
                                            <td className="px-4 py-3 text-gray-500 text-xs">{new Date(sale.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td>
                                            <td className="px-4 py-3 font-medium truncate max-w-[150px]">
                                                {customerMap[sale.customerId] || 'Cliente Desconhecido'}
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold text-gray-800">{formatCurrency(sale.total)}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${sale.status === 'Cancelada' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                                    {sale.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SessionDetailsModal;
