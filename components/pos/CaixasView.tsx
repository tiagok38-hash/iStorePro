
import React from 'react';
import { CashSession } from '../../../types.ts';
import { formatCurrency } from '../../services/mockApi.ts';
import { PlusIcon, EyeIcon, XCircleIcon, ArrowPathRoundedSquareIcon, SearchIcon } from '../icons.tsx';

interface CaixasViewProps {
    sessions: CashSession[];
    userMap: Record<string, string>;
    onReopen: (s: CashSession) => void;
    onCloseSession: (s: CashSession) => void;
    onViewDetails: (s: CashSession) => void;
    startDate: string;
    setStartDate: (v: string) => void;
    endDate: string;
    setEndDate: (v: string) => void;
    userOptions: { value: string, label: string }[];
    userFilter: string | null;
    setUserFilter: (v: string | null) => void;
    currentUserOpenSession: CashSession | null;
    currentUserId?: string;
    onNewSession: () => void;
    searchTerm: string;
    setSearchTerm: (v: string) => void;
}

export const CaixasView: React.FC<CaixasViewProps> = ({
    sessions, userMap, onReopen, onCloseSession, onViewDetails,
    startDate, setStartDate, endDate, setEndDate,
    userOptions, userFilter, setUserFilter,
    currentUserOpenSession, currentUserId, onNewSession,
    searchTerm, setSearchTerm
}) => {
    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-2xl font-bold text-gray-800">Gerenciamento de Caixas</h2>
                {currentUserOpenSession && (
                    <button onClick={() => onViewDetails(currentUserOpenSession)} className="px-5 py-2.5 bg-success text-white rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-success/20 hover:bg-success/90 transition-all transform hover:-translate-y-0.5 active:translate-y-0 uppercase text-xs">
                        <PlusIcon className="h-5 w-5" /> IR PARA MEU CAIXA
                    </button>
                )}
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-wrap items-end gap-5">
                <div className="w-auto"><label className="block text-xs font-black text-gray-600 mb-1.5 uppercase tracking-wider">Período de Abertura</label>
                    <div className="flex items-center gap-2">
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-2 border rounded-lg text-sm bg-gray-50 border-gray-300 w-36 focus:ring-2 focus:ring-success/20 outline-none" />
                        <span className="text-gray-400 font-bold">à</span>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-2 border rounded-lg text-sm bg-gray-50 border-gray-300 w-36 focus:ring-2 focus:ring-success/20 outline-none" />
                    </div>
                </div>
                <div className="flex-grow min-w-[300px]">
                    <label className="block text-xs font-black text-gray-600 mb-1.5 uppercase tracking-wider">Buscar</label>
                    <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <SearchIcon className="h-5 w-5 text-gray-400" />
                        </span>
                        <input
                            type="text"
                            placeholder="Buscar por operador, ID do caixa ou ID da venda (ex: ID-10 ou 10)"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full p-2.5 pl-10 border rounded-lg text-sm bg-gray-50 border-gray-300 focus:ring-2 focus:ring-success/20 outline-none"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-base text-left">
                    <thead className="bg-gray-50 text-gray-600 uppercase text-xs font-black tracking-widest border-b border-gray-100">
                        <tr><th className="px-6 py-4">ID / Status</th><th className="px-6 py-4">Operador</th><th className="px-6 py-4">Datas</th><th className="px-6 py-4 text-right">Abertura</th><th className="px-6 py-4 text-right">Movimentação</th><th className="px-6 py-4 text-right">Saldo Atual</th><th className="px-6 py-4 text-center">Ações</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-700">
                        {sessions.length === 0 ? (
                            <tr><td colSpan={7} className="px-6 py-12 text-center text-muted italic">Nenhum caixa encontrado para os filtros selecionados.</td></tr>
                        ) : sessions.map(session => (
                            <tr key={session.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-primary">#{session.displayId}</span>
                                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase border ${session.status === 'aberto' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                                            {session.status}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 font-semibold text-gray-800">{userMap[session.userId]}</td>
                                <td className="px-6 py-4 text-sm">
                                    <div className="flex flex-col gap-0.5">
                                        <span><span className="text-muted font-bold">Aberto:</span> {new Date(session.openTime).toLocaleString('pt-BR')}</span>
                                        {session.closeTime && <span><span className="text-muted font-bold">Fechado:</span> {new Date(session.closeTime).toLocaleString('pt-BR')}</span>}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right font-semibold">{formatCurrency(session.openingBalance)}</td>
                                <td className="px-6 py-4 text-right font-bold text-success">{formatCurrency(session.transactionsValue)}</td>
                                <td className="px-6 py-4 text-right font-black text-gray-900">{formatCurrency(session.cashInRegister)}</td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center justify-center gap-2">
                                        <button onClick={() => onViewDetails(session)} title="Ver Detalhes" className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"><EyeIcon className="h-5 w-5" /></button>
                                        {session.status === 'aberto' && <button onClick={() => onCloseSession(session)} title="Fechar Caixa" className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"><XCircleIcon className="h-5 w-5" /></button>}
                                        {session.status === 'fechado' && <button onClick={() => onReopen(session)} title="Reabrir Caixa" className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"><ArrowPathRoundedSquareIcon className="h-5 w-5" /></button>}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default React.memo(CaixasView);
