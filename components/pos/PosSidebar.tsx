
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CashRegisterIcon, CalculatorIcon, ShoppingCartPlusIcon, ArchiveBoxIcon, Cog6ToothIcon, LogoutIcon, UserCircleIcon
} from '../icons.tsx';
import { useUser } from '../../contexts/UserContext.tsx';

type PosView = 'caixas' | 'pdv' | 'estoque' | 'resumo' | 'config';

interface PosSidebarProps {
    activeView: PosView;
    onViewChange: (view: PosView) => void;
}

export const PosSidebar: React.FC<PosSidebarProps> = ({ activeView, onViewChange }) => {
    const { logout, user } = useUser();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const items: { label: string; view: PosView; icon: React.ReactElement }[] = [
        { label: 'Meu Caixa', view: 'resumo', icon: <CalculatorIcon /> },
        { label: 'PDV', view: 'pdv', icon: <ShoppingCartPlusIcon /> },
        { label: 'Caixas', view: 'caixas', icon: <ArchiveBoxIcon /> },
        { label: 'Config', view: 'config', icon: <Cog6ToothIcon /> },
    ];

    return (
        <aside className="w-20 bg-gray-900 flex flex-col items-center py-6 gap-6 text-white shrink-0 shadow-2xl z-20">
            <div className="mb-4 animate-pulse-slow">
                <CashRegisterIcon className="h-10 w-10 text-success" />
            </div>

            <nav className="flex flex-col gap-4 w-full px-2">
                {items.map(item => (
                    <button
                        key={item.view}
                        onClick={() => onViewChange(item.view)}
                        className={`p-3 rounded-xl flex flex-col items-center gap-1 transition-all group ${activeView === item.view
                            ? 'bg-success text-white shadow-lg shadow-success/20 scale-105'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                        title={item.label}
                    >
                        {React.cloneElement(item.icon as React.ReactElement, {
                            className: `h-6 w-6 transition-transform group-hover:scale-110 ${activeView === item.view ? 'animate-bounce-subtle' : ''}`
                        })}
                        <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label}</span>
                    </button>
                ))}
            </nav>

            <div className="mt-auto w-full px-2 flex flex-col items-center gap-4 pb-2">
                <div className="w-full h-px bg-white/10 mb-2"></div>

                {/* User Profile */}
                <div className="flex flex-col items-center gap-1 group cursor-default">
                    <div className="h-10 w-10 rounded-full border-2 border-white/20 overflow-hidden bg-gray-800 flex items-center justify-center transition-all group-hover:border-success/50">
                        {user?.avatarUrl ? (
                            <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
                        ) : (
                            <UserCircleIcon className="h-8 w-8 text-gray-500" />
                        )}
                    </div>
                    <span className="text-[9px] font-bold text-gray-400 truncate max-w-[64px] transition-colors group-hover:text-white uppercase tracking-tighter">
                        {user?.name?.split(' ')[0] || 'Usuário'}
                    </span>
                </div>

                {/* Logout Button */}
                <button
                    onClick={handleLogout}
                    className="p-3 w-12 h-12 rounded-xl text-gray-400 hover:text-danger hover:bg-danger/10 transition-all flex items-center justify-center group"
                    title="Sair do PDV"
                >
                    <LogoutIcon className="h-6 w-6 transition-transform group-hover:scale-110" />
                </button>
            </div>
        </aside>
    );
};

export default React.memo(PosSidebar);
