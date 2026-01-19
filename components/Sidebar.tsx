
import React, { useState, useEffect, useMemo } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
    ChevronLeftIcon,
    UserCircleIcon, LogoutIcon,
    Squares2x2Icon, ArchiveBoxIcon, ShoppingCartIcon, CashRegisterIcon, ChartBarIcon,
    UsersIcon, BuildingOffice2Icon, BanknotesIcon
} from './icons.tsx';
// navItems is defined inside the Sidebar component
import { User, PermissionSet } from '../../types.ts';
import { getPermissionProfiles } from '../services/mockApi.ts';
import { useUser } from '../contexts/UserContext.tsx';

// Sub-component for User Avatar to avoid repetition
const UserAvatar: React.FC<{ user: User | null; size?: string; ringColor?: string }> = ({ user, size = 'h-9 w-9', ringColor = 'ring-border' }) => {
    if (!user) {
        return <div className={`${size} rounded-full bg-gray-300 animate-pulse`}></div>;
    }
    if (user.avatarUrl) {
        return <img src={user.avatarUrl} alt={user.name} className={`${size} rounded-full object-cover ring-2 ${ringColor}`} />;
    }
    return <UserCircleIcon className={`${size} text-muted`} />;
};

const NavItem: React.FC<{ to: string, icon: React.ReactElement<{ className?: string }>, label: string, isCollapsed: boolean, onCloseSidebar: () => void; target?: React.HTMLAttributeAnchorTarget }> = ({ to, icon, label, isCollapsed, onCloseSidebar, target }) => (
    <div className="relative group">
        <NavLink
            to={to}
            target={target}
            onClick={onCloseSidebar}
            title={isCollapsed ? label : undefined}
            className={({ isActive }) => {
                const baseClasses = "flex items-center px-3 py-2.5 rounded-md text-sm transition-all duration-200";
                const activeClasses = 'text-white bg-gray-800 font-medium shadow-sm ring-1 ring-white/10';
                const inactiveClasses = 'text-gray-400 hover:text-white hover:bg-gray-800/50';

                if (isCollapsed) {
                    return `${baseClasses} justify-center ${isActive ? activeClasses : inactiveClasses}`;
                }

                return `${baseClasses} ${isActive ? activeClasses : inactiveClasses}`;
            }}
        >
            {React.cloneElement(icon, { className: 'h-6 w-6 flex-shrink-0' })}
            {!isCollapsed && <span className="ml-3 whitespace-nowrap">{label}</span>}
        </NavLink>
        {isCollapsed && (
            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-2 py-1 bg-primary text-on-primary text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                {label}
            </div>
        )}
    </div>
);

interface SidebarProps {
    isOpen: boolean;
    isCollapsed: boolean;
    toggleCollapse: () => void;
    onCloseSidebar: () => void;
}


const Sidebar: React.FC<SidebarProps> = ({ isOpen, isCollapsed, toggleCollapse, onCloseSidebar }) => {
    const { user, permissions, loading, logout } = useUser();
    const navigate = useNavigate();
    const [userProfileName, setUserProfileName] = useState('');
    const [isHovered, setIsHovered] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const effectiveIsCollapsed = isCollapsed && !isHovered;

    useEffect(() => {
        if (user && !loading) {
            getPermissionProfiles().then(profiles => {
                const profile = profiles.find(p => p.id === user.permissionProfileId);
                setUserProfileName(profile?.name || '');
            });
        }
    }, [user, loading]);

    const handleLogout = async () => {
        setIsLoggingOut(true);
        // Aguarda animação de saída
        await new Promise(resolve => setTimeout(resolve, 400));
        logout();
        navigate('/login');
    };

    const navItems = [
        { name: 'Dashboard', to: '/', icon: <Squares2x2Icon />, permissionKey: 'canAccessDashboard' },
        { name: 'Estoque', to: '/products', icon: <ArchiveBoxIcon />, permissionKey: 'canAccessEstoque' },
        { name: 'Vendas', to: '/vendas', icon: <BanknotesIcon />, permissionKey: 'canAccessVendas' },
        { name: 'PDV (Frente de Caixa)', to: '/pos', icon: <CashRegisterIcon />, permissionKey: 'canAccessPOS', target: '_blank' },
        { name: 'Clientes e Fornecedores', to: '/customers', icon: <UsersIcon />, permissionKey: 'canAccessClientes' },
        { name: 'Relatórios', to: '/reports', icon: <ChartBarIcon />, permissionKey: 'canAccessRelatorios' },
        { name: 'Empresa', to: '/company', icon: <BuildingOffice2Icon />, permissionKey: ['canAccessEmpresa', 'canEditOwnProfile', 'canManageMarcasECategorias'] },
    ];

    const visibleNavItems = useMemo(() => {
        if (!permissions) {
            return [];
        }
        return navItems.filter(item => {
            if (item.name === 'Clientes e Fornecedores') {
                return permissions.canAccessClientes || permissions.canAccessFornecedores;
            }
            const keys = Array.isArray(item.permissionKey) ? item.permissionKey : [item.permissionKey];
            return keys.some(key => permissions[key as keyof PermissionSet]);
        });
    }, [permissions]);

    return (
        <aside
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`fixed inset-y-0 left-0 z-40 bg-[#111827] text-gray-200 flex flex-col h-screen border-r border-gray-800 transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:sticky ${isOpen ? 'translate-x-0' : '-translate-x-full'} ${effectiveIsCollapsed ? 'lg:w-20' : 'lg:w-64'} ${isLoggingOut ? 'opacity-0 -translate-x-full' : ''}`}
        >
            <div className="flex items-center h-16 overflow-hidden">
                {/* Fixed Logo Container - Matches collapsed sidebar width (w-20) */}
                <div className="flex items-center justify-center w-20 flex-shrink-0">
                    <Link to="/">
                        <img src="/sidebar-logo.png" alt="Logo" className="h-14 w-auto object-contain" />
                    </Link>
                </div>

                {/* Expanded Content: Text and Toggle Button */}
                {!effectiveIsCollapsed && (
                    <div className="flex flex-1 items-center justify-between pr-4 min-w-0 animate-fade-in -ml-3">
                        <Link to="/" className="transition-opacity duration-200">
                            <span className="font-bold text-2xl tracking-tight text-white whitespace-nowrap">iStorePro</span>
                        </Link>
                        <button
                            onClick={toggleCollapse}
                            className="hidden lg:flex p-1.5 rounded-md text-gray-500 hover:bg-gray-800 hover:text-white transition-colors"
                        >
                            <ChevronLeftIcon className={`h-5 w-5 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} />
                        </button>
                    </div>
                )}
            </div>
            <nav className="flex-1 px-3 py-6 overflow-y-auto overflow-x-hidden custom-scrollbar">
                <div className="space-y-1">
                    {visibleNavItems.map(item => (
                        <NavItem key={item.name} to={item.to} icon={item.icon} label={item.name} isCollapsed={effectiveIsCollapsed} onCloseSidebar={onCloseSidebar} target={item.target as React.HTMLAttributeAnchorTarget} />
                    ))}
                </div>
            </nav>
            <div className="px-4 py-4 border-t border-gray-800 mt-auto">
                <div className="space-y-4">
                    {effectiveIsCollapsed ? (
                        <>
                            <div className="text-center">
                                {permissions?.canEditOwnProfile ? (
                                    <Link to="/company?tab=perfil" className="relative group inline-block" title="Editar Perfil">
                                        <UserAvatar user={user} />
                                        {user && (
                                            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-2 py-1 bg-primary text-on-primary text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                                {user.name}
                                            </div>
                                        )}
                                    </Link>
                                ) : (
                                    <div className="relative group inline-block cursor-default">
                                        <UserAvatar user={user} />
                                    </div>
                                )}
                            </div>
                            <div className="text-center pt-4 border-t border-border">
                                <button onClick={handleLogout} title="Sair" className="text-muted hover:text-danger p-1 rounded-md transition-colors">
                                    <LogoutIcon className="h-5 w-5" />
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center gap-3">
                            {permissions?.canEditOwnProfile ? (
                                <Link to="/company?tab=perfil" title="Editar Perfil" className="flex items-center gap-3 flex-1 min-w-0 group">
                                    <div className="flex-shrink-0">
                                        <UserAvatar user={user} ringColor="ring-border group-hover:ring-accent" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        {user ? (
                                            <div>
                                                <p className="font-semibold text-sm text-white truncate group-hover:text-blue-400 transition-colors">{user.name}</p>
                                                <p className="text-[11px] text-muted truncate uppercase tracking-wider">{userProfileName}</p>
                                            </div>
                                        ) : (
                                            <div className="animate-pulse">
                                                <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                                                <div className="h-3 bg-gray-300 rounded w-1/2 mt-1"></div>
                                            </div>
                                        )}
                                    </div>
                                </Link>
                            ) : (
                                <div className="flex items-center gap-3 flex-1 min-w-0 cursor-default">
                                    <div className="flex-shrink-0">
                                        <UserAvatar user={user} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        {user ? (
                                            <div>
                                                <p className="font-semibold text-sm text-white truncate">{user.name}</p>
                                                <p className="text-[11px] text-muted truncate uppercase tracking-wider">{userProfileName}</p>
                                            </div>
                                        ) : (
                                            <div className="animate-pulse">
                                                <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                                                <div className="h-3 bg-gray-300 rounded w-1/2 mt-1"></div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            <button onClick={handleLogout} title="Sair" className="text-muted hover:text-danger p-1 rounded-md transition-colors">
                                <LogoutIcon className="h-5 w-5" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
