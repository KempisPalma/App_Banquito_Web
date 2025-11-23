import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, DollarSign, Gift, CreditCard, Menu, X, Bell, Search, ChevronLeft, ChevronRight, Clock, Settings, Download, Upload, LogOut, Shield, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { useBanquito } from '../context/BanquitoContext';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { loans, members, currentUser, logout, activities } = useBanquito();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
    const [isNotificationOpen, setIsNotificationOpen] = React.useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [isSearchOpen, setIsSearchOpen] = React.useState(false);

    const navItems = [
        { path: '/', label: 'Dashboard', icon: LayoutDashboard, permission: null },
        { path: '/members', label: 'Socios', icon: Users, permission: 'manage_members' },
        { path: '/payments', label: 'Pagos', icon: DollarSign, permission: 'manage_payments' },
        { path: '/activities', label: 'Actividades', icon: Gift, permission: 'manage_activities' },
        { path: '/loans', label: 'Préstamos', icon: CreditCard, permission: 'manage_loans' },
        { path: '/report', label: 'Reporte', icon: FileText, permission: 'view_reports' },
        { path: '/admin/users', label: 'Usuarios', icon: Shield, permission: 'admin' },
    ];

    const filteredNavItems = navItems.filter(item => {
        if (!currentUser) return false;
        if (!item.permission) return true; // Dashboard and Report are for everyone
        return currentUser.role === 'admin' || currentUser.permissions.includes(item.permission as any);
    });

    const activeIndex = filteredNavItems.findIndex(item => item.path === location.pathname);

    // Search functionality
    const searchResults = React.useMemo(() => {
        if (!searchQuery.trim()) return [];

        const query = searchQuery.toLowerCase();
        const results: Array<{ type: string; title: string; subtitle: string; path: string; icon: any }> = [];

        // Search members
        members.forEach(member => {
            if (member.name.toLowerCase().includes(query) || member.alias?.toLowerCase().includes(query)) {
                results.push({
                    type: 'Socio',
                    title: member.name,
                    subtitle: member.alias || member.phone || '',
                    path: '/members',
                    icon: Users
                });
            }
        });

        // Search loans
        loans.forEach(loan => {
            const member = loan.borrowerType === 'member' ? members.find(m => m.id === loan.memberId) : null;
            const borrowerName = loan.borrowerType === 'member' ? (member?.name || 'Socio Desconocido') : loan.clientName || '';

            if (borrowerName.toLowerCase().includes(query)) {
                results.push({
                    type: 'Préstamo',
                    title: borrowerName,
                    subtitle: `$${loan.amount.toFixed(2)} - ${loan.status}`,
                    path: '/loans',
                    icon: CreditCard
                });
            }
        });

        // Search activities
        activities.forEach(activity => {
            if (activity.name.toLowerCase().includes(query)) {
                results.push({
                    type: 'Actividad',
                    title: activity.name,
                    subtitle: new Date(activity.date).toLocaleDateString(),
                    path: '/activities',
                    icon: Gift
                });
            }
        });

        return results.slice(0, 8); // Limit to 8 results
    }, [searchQuery, members, loans, activities]);

    const handleSearchResultClick = (path: string) => {
        navigate(path);
        setSearchQuery('');
        setIsSearchOpen(false);
    };

    // Calculate loan notifications
    const loanNotifications = React.useMemo(() => {
        const now = new Date();
        return loans
            .filter(loan => loan.status !== 'paid')
            .map(loan => {
                const endDate = new Date(loan.endDate);
                const daysUntilDue = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                const isOverdue = daysUntilDue < 0;
                const isDueSoon = daysUntilDue > 0 && daysUntilDue <= 7;

                if (isOverdue || isDueSoon) {
                    const member = loan.borrowerType === 'member' ? members.find(m => m.id === loan.memberId) : null;
                    const borrowerName = loan.borrowerType === 'member' ? (member?.name || 'Socio Desconocido') : loan.clientName;

                    return {
                        loanId: loan.id,
                        message: `${borrowerName}: Préstamo ${isOverdue ? 'vencido' : 'vence pronto'} (${Math.abs(daysUntilDue)} días)`,
                        type: isOverdue ? 'error' : 'warning',
                        date: loan.endDate
                    };
                }
                return null;
            })
            .filter(Boolean) as { loanId: string; message: string; type: 'error' | 'warning'; date: string }[];
    }, [loans, members]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleExportData = () => {
        const data = {
            members: members,
            loans: loans,
            weeklyPayments: JSON.parse(localStorage.getItem('banquito_weeklyPayments') || '[]'),
            monthlyFees: JSON.parse(localStorage.getItem('banquito_monthlyFees') || '[]'),
            activities: JSON.parse(localStorage.getItem('banquito_activities') || '[]'),
            memberActivities: JSON.parse(localStorage.getItem('banquito_memberActivities') || '[]'),
            exportDate: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `banquito-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setIsSettingsOpen(false);
    };

    const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target?.result as string);

                if (data.members) localStorage.setItem('banquito_members', JSON.stringify(data.members));
                if (data.loans) localStorage.setItem('banquito_loans', JSON.stringify(data.loans));
                if (data.weeklyPayments) localStorage.setItem('banquito_weeklyPayments', JSON.stringify(data.weeklyPayments));
                if (data.monthlyFees) localStorage.setItem('banquito_monthlyFees', JSON.stringify(data.monthlyFees));
                if (data.activities) localStorage.setItem('banquito_activities', JSON.stringify(data.activities));
                if (data.memberActivities) localStorage.setItem('banquito_memberActivities', JSON.stringify(data.memberActivities));

                alert('Datos importados correctamente. La página se recargará.');
                window.location.reload();
            } catch (error) {
                alert('Error al importar datos. Verifica que el archivo sea válido.');
            }
        };
        reader.readAsText(file);
        setIsSettingsOpen(false);
    };

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
            {/* Background Gradients */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-purple-50 opacity-60" />
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary-200 rounded-full filter blur-3xl opacity-20 animate-blob" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-200 rounded-full filter blur-3xl opacity-20 animate-blob animation-delay-2000" />

            {/* Desktop Sidebar */}
            <motion.aside
                layout
                initial={false}
                animate={{
                    width: isSidebarCollapsed ? 80 : 288,
                    borderRadius: isSidebarCollapsed ? 50 : 24,
                    left: isSidebarCollapsed ? 24 : 16,
                    top: isSidebarCollapsed ? "50%" : 16,
                    y: isSidebarCollapsed ? "-50%" : 0,
                    height: isSidebarCollapsed ? "auto" : "calc(100vh - 32px)"
                }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className={clsx(
                    "hidden md:flex flex-col z-30 bg-white/90 backdrop-blur-xl shadow-2xl shadow-slate-200/50 border border-white/20 fixed",
                    !isSidebarCollapsed && "bottom-4"
                )}
            >
                <button
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    className={clsx(
                        "absolute w-6 h-6 rounded-full bg-white border border-slate-200 shadow-md flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors z-30",
                        isSidebarCollapsed ? "left-1/2 -translate-x-1/2 -bottom-3" : "-right-3 top-8"
                    )}
                    title={isSidebarCollapsed ? "Expandir" : "Contraer"}
                >
                    {isSidebarCollapsed ? <ChevronRight size={14} className="rotate-90" /> : <ChevronLeft size={14} />}
                </button>

                {!isSidebarCollapsed && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="p-8 flex items-center space-x-3"
                    >
                        <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/30">
                            <DollarSign className="text-white" size={24} />
                        </div>
                        <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600">
                            Banquito
                        </span>
                    </motion.div>
                )}

                {isSidebarCollapsed && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="py-8 flex justify-center"
                    >
                        <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/30">
                            <DollarSign className="text-white" size={24} />
                        </div>
                    </motion.div>
                )}

                <nav className={clsx("flex-1 px-4 space-y-2 overflow-y-auto scrollbar-hide", isSidebarCollapsed ? "mt-4" : "mt-8")}>
                    {filteredNavItems.map((item, index) => {
                        const isActive = index === activeIndex;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className="block relative group"
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className={clsx(
                                            "absolute inset-0 bg-gradient-to-r from-primary-50 to-purple-50 rounded-xl",
                                            isSidebarCollapsed && "hidden" // Hide standard background in collapsed mode
                                        )}
                                        initial={false}
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    />
                                )}

                                {/* Collapsed Mode Active Indicator (Liquid Ball) */}
                                {isSidebarCollapsed && isActive && (
                                    <motion.div
                                        layoutId="activeBall"
                                        className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-12 h-12 bg-primary-100 rounded-full z-0"
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    >
                                        <div className="absolute top-2 right-3 w-2 h-2 bg-white/40 rounded-full blur-[1px]" />
                                    </motion.div>
                                )}

                                <div className={clsx(
                                    "relative z-10 flex items-center transition-colors duration-200",
                                    isSidebarCollapsed ? "justify-center py-4" : "px-4 py-3",
                                    isActive ? "text-primary-700 font-semibold" : "text-slate-500 group-hover:text-slate-700"
                                )}>
                                    <item.icon size={22} className={clsx(isActive && "text-primary-600")} />
                                    {!isSidebarCollapsed && (
                                        <span className="ml-3">{item.label}</span>
                                    )}
                                </div>
                            </Link>
                        );
                    })}
                </nav>

                {/* User Profile Section */}
                <div className={clsx(
                    "mt-auto border-t border-slate-100 bg-slate-50/50",
                    isSidebarCollapsed ? "p-4 flex justify-center" : "p-6"
                )}>
                    {currentUser && (
                        <div className={clsx("flex items-center", isSidebarCollapsed ? "justify-center" : "space-x-3")}>
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white font-bold shadow-md">
                                {currentUser.username.charAt(0).toUpperCase()}
                            </div>
                            {!isSidebarCollapsed && (
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-slate-800 truncate">{currentUser.username}</p>
                                    <p className="text-xs text-slate-500 truncate capitalize">{currentUser.role}</p>
                                </div>
                            )}
                            {!isSidebarCollapsed && (
                                <button
                                    onClick={handleLogout}
                                    className="p-2 text-slate-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                                    title="Cerrar Sesión"
                                >
                                    <LogOut size={18} />
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </motion.aside>

            {/* Mobile Menu Button */}
            <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden fixed top-4 left-4 z-50 p-3 rounded-xl bg-white shadow-lg text-slate-700"
            >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Mobile Menu */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ x: '-100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '-100%' }}
                        transition={{ type: 'tween' }}
                        className="md:hidden fixed inset-y-0 left-0 w-72 bg-slate-900 z-40 p-6"
                    >
                        <div className="flex items-center space-x-3 mb-10 text-white">
                            <DollarSign size={24} />
                            <span className="text-xl font-bold">Banquito</span>
                        </div>
                        <nav className="space-y-2">
                            {filteredNavItems.map((item) => (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={clsx(
                                        "flex items-center px-4 py-3 rounded-xl transition-colors",
                                        location.pathname === item.path
                                            ? "bg-primary-600 text-white"
                                            : "text-slate-400 hover:bg-slate-800 hover:text-white"
                                    )}
                                >
                                    <item.icon size={20} className="mr-3" />
                                    {item.label}
                                </Link>
                            ))}
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-colors mt-8"
                            >
                                <LogOut size={20} className="mr-3" />
                                Cerrar Sesión
                            </button>
                        </nav>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <motion.div
                layout
                className={clsx(
                    "flex-1 flex flex-col overflow-hidden relative z-10",
                    isSidebarCollapsed ? "md:ml-32" : "md:ml-80"
                )}
            >
                {/* Top Bar */}
                <header className="h-20 px-8 flex items-center justify-between">
                    <div className="relative w-96">
                        <div className="flex items-center bg-white/80 backdrop-blur-md px-4 py-2 rounded-2xl shadow-sm border border-slate-200/60">
                            <Search className="text-slate-400 mr-3" size={20} />
                            <input
                                type="text"
                                placeholder="Buscar socios, préstamos, actividades..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setIsSearchOpen(e.target.value.length > 0);
                                }}
                                onFocus={() => setIsSearchOpen(searchQuery.length > 0)}
                                className="bg-transparent border-none outline-none text-slate-700 placeholder-slate-400 w-full"
                            />
                        </div>

                        {/* Search Results Dropdown */}
                        <AnimatePresence>
                            {isSearchOpen && searchResults.length > 0 && (
                                <>
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        onClick={() => setIsSearchOpen(false)}
                                        className="fixed inset-0 z-30"
                                    />
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="absolute top-full mt-2 w-full bg-white rounded-2xl shadow-2xl border border-slate-100 z-40 overflow-hidden"
                                    >
                                        <div className="max-h-96 overflow-y-auto">
                                            {searchResults.map((result, index) => (
                                                <button
                                                    key={index}
                                                    onClick={() => handleSearchResultClick(result.path)}
                                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-50 last:border-b-0"
                                                >
                                                    <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600">
                                                        <result.icon size={20} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-medium text-slate-400 uppercase">{result.type}</span>
                                                        </div>
                                                        <p className="font-semibold text-slate-900 truncate">{result.title}</p>
                                                        {result.subtitle && (
                                                            <p className="text-sm text-slate-500 truncate">{result.subtitle}</p>
                                                        )}
                                                    </div>
                                                    <ChevronRight size={16} className="text-slate-400" />
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="flex items-center space-x-4">
                        <div className="relative">
                            <button
                                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                                className="p-3 bg-white/80 backdrop-blur-md rounded-xl shadow-sm border border-slate-200/60 text-slate-600 hover:text-primary-600 transition-colors relative"
                            >
                                <Bell size={20} />
                                {loanNotifications.length > 0 && (
                                    <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                                )}
                            </button>
                        </div>

                        <div className="relative">
                            <button
                                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                                className="p-3 bg-white/80 backdrop-blur-md rounded-xl shadow-sm border border-slate-200/60 text-slate-600 hover:text-primary-600 transition-colors"
                            >
                                <Settings size={20} />
                            </button>
                        </div>
                    </div>
                </header>

                {/* Settings Dropdown */}
                <AnimatePresence>
                    {isSettingsOpen && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsSettingsOpen(false)}
                                className="fixed inset-0 z-40"
                            />
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute top-20 right-8 w-72 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden"
                            >
                                <div className="p-4 border-b border-slate-100">
                                    <h3 className="font-bold text-slate-800">Configuración</h3>
                                </div>
                                <div className="p-2">
                                    <button
                                        onClick={handleExportData}
                                        className="w-full flex items-center px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-primary-600 transition-colors"
                                    >
                                        <Download size={18} className="mr-3" />
                                        Exportar Datos
                                    </button>
                                    <label className="w-full flex items-center px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-primary-600 transition-colors cursor-pointer">
                                        <Upload size={18} className="mr-3" />
                                        Importar Datos
                                        <input type="file" accept=".json" onChange={handleImportData} className="hidden" />
                                    </label>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>

                {/* Notifications Dropdown */}
                <AnimatePresence>
                    {isNotificationOpen && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsNotificationOpen(false)}
                                className="fixed inset-0 z-40"
                            />
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute top-20 right-24 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden"
                            >
                                <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                                    <h3 className="font-bold text-slate-800">Notificaciones</h3>
                                    <span className="bg-primary-100 text-primary-700 text-xs font-bold px-2 py-1 rounded-full">
                                        {loanNotifications.length}
                                    </span>
                                </div>
                                <div className="max-h-80 overflow-y-auto">
                                    {loanNotifications.length === 0 ? (
                                        <div className="p-8 text-center text-slate-400">
                                            <Bell size={32} className="mx-auto mb-3 opacity-50" />
                                            <p className="text-sm">No hay notificaciones nuevas</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-slate-50">
                                            {loanNotifications.map((notification) => (
                                                <div key={notification.loanId} className="p-4 hover:bg-slate-50 transition-colors">
                                                    <div className="flex items-start">
                                                        <div className={clsx(
                                                            "mt-1 w-2 h-2 rounded-full flex-shrink-0",
                                                            notification.type === 'error' ? "bg-red-500" : "bg-amber-500"
                                                        )} />
                                                        <div className="ml-3">
                                                            <p className="text-sm text-slate-700 font-medium">{notification.message}</p>
                                                            <p className="text-xs text-slate-400 mt-1 flex items-center">
                                                                <Clock size={10} className="mr-1" />
                                                                {new Date(notification.date).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>

                <main className="flex-1 overflow-auto px-8 pb-8">
                    {children}
                </main>
            </motion.div>
        </div>
    );
};

export default Layout;
