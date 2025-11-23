import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useBanquito } from '../context/BanquitoContext';
import type { Permission } from '../types';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredPermission?: Permission;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredPermission }) => {
    const { currentUser } = useBanquito();
    const location = useLocation();

    if (!currentUser) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (requiredPermission) {
        const hasPermission = currentUser.role === 'admin' || currentUser.permissions.includes(requiredPermission);
        if (!hasPermission) {
            // Redirect to dashboard if authorized but no permission for specific route
            return <Navigate to="/" replace />;
        }
    }

    return <>{children}</>;
};

export default ProtectedRoute;
