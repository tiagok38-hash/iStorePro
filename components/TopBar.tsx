import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellIcon, ArrowRightCircleIcon } from './icons.tsx';
import { CompanyInfo } from '../../types.ts';
import { getCompanyInfo } from '../services/mockApi.ts';
import { useUser } from '../contexts/UserContext.tsx';

const TopBar: React.FC = () => {
    const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
    const { logout } = useUser();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchInfo = () => {
            getCompanyInfo().then(setCompanyInfo);
        };

        fetchInfo(); // Initial fetch

        window.addEventListener('companyInfoUpdated', fetchInfo); // Listen for updates

        return () => {
            window.removeEventListener('companyInfoUpdated', fetchInfo); // Cleanup
        };
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="hidden lg:flex items-center justify-end h-14 px-6 bg-surface border-b border-border">
            <div className="flex items-center gap-6">
                <div className="text-right">
                    <p className="text-sm text-muted">Você está logado na empresa</p>
                    <p className="font-bold text-primary">{companyInfo?.name || 'Carregando...'}</p>
                </div>
                {companyInfo?.logoUrl && (
                    <img src={companyInfo.logoUrl} alt={companyInfo.name} className="h-10 w-10 rounded-full object-contain border-2 border-border" />
                )}
                <div className="flex items-center gap-4">
                    <button className="relative text-muted hover:text-primary">
                        <BellIcon className="h-6 w-6" />
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">1</span>
                    </button>
                    <button onClick={handleLogout} className="text-muted hover:text-primary" title="Sair">
                        <ArrowRightCircleIcon className="h-7 w-7" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TopBar;