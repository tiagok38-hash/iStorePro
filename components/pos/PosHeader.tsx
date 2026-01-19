
import React, { useState, useEffect } from 'react';
import { CashRegisterIcon, ArchiveBoxIcon } from '../icons.tsx';

interface PosHeaderProps {
    cashId?: number;
    onOpenStockSearch: () => void;
}

export const PosHeader: React.FC<PosHeaderProps> = ({ cashId, onOpenStockSearch }) => {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <header className="bg-white h-16 border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
            <div className="flex items-center gap-4">
                <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <CashRegisterIcon className="h-6 w-6 text-primary" /> PDV iStore
                </h1>
                {cashId && (
                    <span className="bg-success-light text-success px-3 py-1 rounded-full text-xs font-bold border border-success animate-pulse">
                        CAIXA #{cashId} ABERTO
                    </span>
                )}
            </div>
            <div className="flex items-center gap-6">
                <button
                    onClick={onOpenStockSearch}
                    className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg font-bold text-xs uppercase transition-colors"
                    title="Busca Rápida Estoque"
                >
                    <ArchiveBoxIcon className="h-5 w-5 text-gray-500" />
                    <span className="hidden sm:inline">Busca Rápida no Estoque</span>
                </button>
                <div className="text-right hidden sm:block">
                    <p className="text-xs text-muted font-medium uppercase tracking-wider">Data e Hora</p>
                    <p className="text-sm font-bold text-primary font-mono">{currentTime.toLocaleString('pt-BR')}</p>
                </div>
            </div>
        </header>
    );
};

export default React.memo(PosHeader);
