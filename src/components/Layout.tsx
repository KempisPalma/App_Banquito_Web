import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, DollarSign, Gift, CreditCard, Menu, X, Bell, Search, ChevronLeft, ChevronRight, AlertCircle, Clock, Settings, Download, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { useBanquito } from '../context/BanquitoContext';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { loans, members } = useBanquito();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
    const [isNotificationOpen, setIsNotificationOpen] = React.useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);

    const navItems = [
        { path: '/', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/members', label: 'Socios', icon: Users },
        { path: '/payments', label: 'Pagos', icon: DollarSign },
        { path: '/activities', label: 'Actividades', icon: Gift },
        { path: '/loans', label: 'Préstamos', icon: CreditCard },
    ];

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
                        borrowerName,
                        amount: loan.amount,
                        endDate: loan.endDate,
                        daysUntilDue,
                        isOverdue,
                        isDueSoon
                    };
                }
                return null;
            })
            .filter(Boolean)
            .sort((a, b) => {
                if (a!.isOverdue && !b!.isOverdue) return -1;
                if (!a!.isOverdue && b!.isOverdue) return 1;
                return a!.daysUntilDue - b!.daysUntilDue;
            });
    }, [loans, members]);

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
            <aside className={clsx(
                "hidden md:flex flex-col m-4 rounded-3xl glass-sidebar z-20 relative transition-all duration-300",
                isSidebarCollapsed ? "w-20" : "w-72"
            )}>
                <button
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    className="absolute -right-3 top-8 w-6 h-6 rounded-full bg-white border border-slate-200 shadow-md flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors z-30"
                    title={isSidebarCollapsed ? "Expandir" : "Contraer"}
                >
                    {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>

                {!isSidebarCollapsed && (
                    <div className="p-8 flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg">
                            <span className="text-white font-bold text-xl">B</span>
                        </div>
                        <h1 className="text-2xl font-extrabold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent tracking-tight">Banquito</h1>
                    </div>
                )}

                <nav className="flex-1 px-4 space-y-2 py-4">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={clsx(
                                    "flex items-center px-4 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden",
                                    isSidebarCollapsed ? "justify-center" : "space-x-3",
                                    location.pathname === item.path
                                        ? "bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-500/30"
                                        : "text-slate-600 hover:text-primary-600 hover:bg-gradient-to-r hover:from-primary-50 hover:to-purple-50 hover:shadow-md"
                                )}
                                title={isSidebarCollapsed ? item.label : undefined}
                            >
                                {/* Animated background on hover */}
                                {location.pathname !== item.path && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-primary-100/0 via-primary-100/50 to-primary-100/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
                                )}

                                <Icon
                                    size={22}
                                    className={clsx(
                                        "relative z-10 transition-all duration-300",
                                        location.pathname === item.path
                                            ? "drop-shadow-sm"
                                            : "group-hover:scale-110 group-hover:rotate-3"
                                    )}
                                />
                                {!isSidebarCollapsed && (
                                    <span className="font-medium relative z-10 transition-all duration-300 group-hover:translate-x-1">
                                        {item.label}
                                    </span>
                                )}

                                {/* Active indicator */}
                                {location.pathname === item.path && !isSidebarCollapsed && (
                                    <div className="absolute right-2 w-1.5 h-8 bg-white/40 rounded-full" />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {!isSidebarCollapsed && (
                    <div className="p-6 border-t border-white/5">
                        <div className="flex items-center space-x-3 p-3 rounded-xl bg-white/30 backdrop-blur-sm">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold">
                                U
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-slate-800">Usuario</p>
                                <p className="text-xs text-slate-500">Administrador</p>
                            </div>
                        </div>
                    </div>
                )}
            </aside>

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
                        <div className="flex items-center space-x-3 mb-8">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg">
                                <span className="text-white font-bold text-xl">B</span>
                            </div>
                            <h1 className="text-2xl font-extrabold bg-gradient-to-r from-primary-400 to-primary-200 bg-clip-text text-transparent tracking-tight">Banquito</h1>
                        </div>
                        <nav className="space-y-2">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className={clsx(
                                            "flex items-center space-x-3 px-4 py-4 rounded-xl transition-colors",
                                            location.pathname === item.path
                                                ? "bg-primary-600 text-white"
                                                : "text-slate-400 hover:bg-slate-800 hover:text-white"
                                        )}
                                    >
                                        <Icon size={24} />
                                        <span className="text-lg font-medium">{item.label}</span>
                                    </Link>
                                );
                            })}
                        </nav>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden relative z-10">
                {/* Top Bar */}
                <header className="h-20 px-8 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                            {navItems.find(i => i.path === location.pathname)?.label || 'Dashboard'}
                        </h2>
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className="relative hidden md:block">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input
                                type="text"
                                placeholder="Buscar..."
                                className="pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 w-64 transition-all"
                            />
                        </div>

                        {/* Notification Bell */}
                        <button
                            onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                            className="relative p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-500"
                        >
                            <Bell size={24} />
                            {loanNotifications.length > 0 && (
                                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                            )}
                        </button>

                        {/* Settings Button */}
                        <button
                            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                            className="relative p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-500"
                        >
                            <Settings size={24} />
                        </button>
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
                                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                transition={{ duration: 0.15, ease: "easeOut" }}
                                className="fixed right-8 top-20 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden"
                            >
                                <div className="p-4 border-b border-slate-100 bg-slate-50">
                                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                        <Settings size={18} />
                                        Configuración
                                    </h3>
                                </div>
                                <div className="p-4 space-y-2">
                                    <button
                                        onClick={handleExportData}
                                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors text-left"
                                    >
                                        <div className="p-2 rounded-lg bg-blue-100">
                                            <Download className="text-blue-600" size={20} />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-900 text-sm">Exportar Datos</p>
                                            <p className="text-xs text-slate-500">Descargar respaldo JSON</p>
                                        </div>
                                    </button>
                                    <label className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">
                                        <div className="p-2 rounded-lg bg-emerald-100">
                                            <Upload className="text-emerald-600" size={20} />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-900 text-sm">Importar Datos</p>
                                            <p className="text-xs text-slate-500">Cargar desde archivo JSON</p>
                                        </div>
                                        <input
                                            type="file"
                                            accept=".json"
                                            onChange={handleImportData}
                                            className="hidden"
                                        />
                                    </label>
                                </div>
                                <div className="p-3 bg-slate-50 border-t border-slate-100">
                                    <p className="text-xs text-slate-500 text-center">
                                        Próximamente: Sincronización con Google Drive
                                    </p>
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
                                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                transition={{ duration: 0.15, ease: "easeOut" }}
                                className="fixed right-8 top-20 w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden"
                            >
                                <div className="p-4 border-b border-slate-100 bg-slate-50">
                                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                        <Bell size={18} />
                                        Notificaciones de Préstamos
                                    </h3>
                                </div>
                                <div className="max-h-96 overflow-y-auto">
                                    {loanNotifications.length === 0 ? (
                                        <div className="p-8 text-center text-slate-400">
                                            <Bell size={48} className="mx-auto mb-2 opacity-20" />
                                            <p className="text-sm">No hay notificaciones</p>
                                        </div>
                                    ) : (
                                        loanNotifications.map((notification) => (
                                            <div
                                                key={notification!.loanId}
                                                onClick={() => {
                                                    setIsNotificationOpen(false);
                                                    navigate('/loans');
                                                }}
                                                className="p-4 border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className={`p-2 rounded-full ${notification!.isOverdue ? 'bg-red-100' : 'bg-orange-100'}`}>
                                                        {notification!.isOverdue ? (
                                                            <AlertCircle className="text-red-600" size={20} />
                                                        ) : (
                                                            <Clock className="text-orange-600" size={20} />
                                                        )}
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="font-semibold text-slate-900 text-sm">
                                                            {notification!.borrowerName}
                                                        </p>
                                                        <p className="text-xs text-slate-500 mt-0.5">
                                                            Préstamo de ${notification!.amount.toFixed(2)}
                                                        </p>
                                                        <div className="mt-2">
                                                            {notification!.isOverdue ? (
                                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                                                                    <AlertCircle size={12} />
                                                                    Vencido hace {Math.abs(notification!.daysUntilDue)} días
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700">
                                                                    <Clock size={12} />
                                                                    Vence en {notification!.daysUntilDue} {notification!.daysUntilDue === 1 ? 'día' : 'días'}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                                {loanNotifications.length > 0 && (
                                    <div className="p-3 bg-slate-50 border-t border-slate-100">
                                        <button
                                            onClick={() => {
                                                setIsNotificationOpen(false);
                                                navigate('/loans');
                                            }}
                                            className="w-full text-center text-sm font-medium text-primary-600 hover:text-primary-700"
                                        >
                                            Ver todos los préstamos
                                        </button>
                                    </div>
                                )}
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>

                <main className="flex-1 overflow-auto px-8 pb-8">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default Layout;
