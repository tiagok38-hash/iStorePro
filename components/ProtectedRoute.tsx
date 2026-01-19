import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useUser } from '../contexts/UserContext.tsx';
import { SpinnerIcon } from './icons.tsx';
import { PermissionSet } from '../../types.ts';

interface ProtectedRouteProps {
    permissionKey?: keyof PermissionSet | (keyof PermissionSet)[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ permissionKey }) => {
    const { isAuthenticated, loading, permissions, user } = useUser();

    if (loading) {
        return (
            <div className="w-screen h-screen flex items-center justify-center bg-background">
                <SpinnerIcon />
            </div>
        );
    }

    // If not authenticated at all, redirect to login
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // If authenticated but permissions are null, allow access with full permissions as fallback
    // This handles edge cases where permissions couldn't be loaded due to network issues
    const effectivePermissions = permissions || {
        canAccessDashboard: true,
        canAccessVendas: true,
        canAccessEstoque: true,
        canAccessClientes: true,
        canAccessRelatorios: true,
        canAccessEmpresa: true,
        canAccessPOS: true,
        canManageProducts: true,
        canEditProductPrices: true,
        canCancelSales: true,
        canApplyDiscounts: true,
    } as any;

    if (permissions === null) {
        console.warn('ProtectedRoute: Authenticated but permissions are null. Using fallback permissions for user:', user?.email);
    }

    const hasPermission = !permissionKey || (
        Array.isArray(permissionKey)
            ? permissionKey.some(key => effectivePermissions[key])
            : effectivePermissions[permissionKey as keyof PermissionSet]
    );


    if (!hasPermission) {
        // Find first available internal page
        if (effectivePermissions.canAccessDashboard) return <Navigate to="/" replace />;
        if (effectivePermissions.canAccessVendas) return <Navigate to="/vendas" replace />;
        if (effectivePermissions.canAccessEstoque) return <Navigate to="/products" replace />;
        if (effectivePermissions.canAccessClientes) return <Navigate to="/customers" replace />;
        if (effectivePermissions.canAccessRelatorios) return <Navigate to="/reports" replace />;
        if (effectivePermissions.canAccessEmpresa) return <Navigate to="/company" replace />;
        if (effectivePermissions.canAccessPOS) return <Navigate to="/pos" replace />;

        // If really NO permissions or at login, final fallback
        return <Navigate to="/login" replace />;
    }


    return <Outlet />;
};

export default ProtectedRoute;
