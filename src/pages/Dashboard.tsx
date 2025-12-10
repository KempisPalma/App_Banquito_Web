import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useBanquito } from '../context/BanquitoContext';
import { Users, DollarSign, TrendingUp, AlertCircle, ArrowUpRight, ArrowDownRight, Activity, Calendar } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { motion } from 'framer-motion';

const StatCard: React.FC<{ title: string; value: string; icon: any; color: string; trend?: string }> = ({ title, value, icon: Icon, color, trend }) => {
    // Map the input color class to a style object
    const getStyle = (colorClass: string) => {
        switch (colorClass) {
            case 'bg-blue-500': return {
                gradient: 'from-blue-500 to-blue-600',
                shadow: 'shadow-blue-500/30',
                light: 'bg-blue-50',
                text: 'text-blue-600'
            };
            case 'bg-emerald-500': return {
                gradient: 'from-emerald-500 to-emerald-600',
                shadow: 'shadow-emerald-500/30',
                light: 'bg-emerald-50',
                text: 'text-emerald-600'
            };
            case 'bg-orange-500': return {
                gradient: 'from-orange-500 to-orange-600',
                shadow: 'shadow-orange-500/30',
                light: 'bg-orange-50',
                text: 'text-orange-600'
            };
            case 'bg-purple-500': return {
                gradient: 'from-purple-500 to-purple-600',
                shadow: 'shadow-purple-500/30',
                light: 'bg-purple-50',
                text: 'text-purple-600'
            };
            default: return {
                gradient: 'from-slate-500 to-slate-600',
                shadow: 'shadow-slate-500/30',
                light: 'bg-slate-50',
                text: 'text-slate-600'
            };
        }
    };

    const style = getStyle(color);

    return (
        <Card className="relative overflow-hidden group hover:-translate-y-2 transition-all duration-300 hover:shadow-xl border border-slate-100">
            {/* Background Decoration */}
            <div className={`absolute -right-6 -top-6 w-32 h-32 rounded-full opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-gradient-to-br ${style.gradient}`} />

            <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${style.gradient} flex items-center justify-center shadow-lg ${style.shadow} group-hover:scale-110 transition-transform duration-300`}>
                        <Icon size={28} className="text-white" />
                    </div>
                    {trend && (
                        <div className="flex items-center px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-xs font-bold text-emerald-600">
                            <TrendingUp size={14} className="mr-1" />
                            {trend}
                        </div>
                    )}
                </div>

                <div className="space-y-1">
                    <p className="text-sm text-slate-500 font-medium">{title}</p>
                    <h3 className="text-3xl font-black text-slate-800 tracking-tight">{value}</h3>
                </div>
            </div>
        </Card>
    );
};

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const { members, weeklyPayments, loans, monthlyFees, currentUser } = useBanquito();

    const isSocio = currentUser?.role === 'socio';

    // Filter data based on role
    const filteredWeeklyPayments = React.useMemo(() => {
        if (isSocio && currentUser?.memberId) {
            return weeklyPayments.filter(p => p.memberId === currentUser.memberId);
        }
        return weeklyPayments;
    }, [weeklyPayments, isSocio, currentUser]);

    const filteredMonthlyFees = React.useMemo(() => {
        if (isSocio && currentUser?.memberId) {
            return monthlyFees.filter(f => f.memberId === currentUser.memberId);
        }
        return monthlyFees;
    }, [monthlyFees, isSocio, currentUser]);

    const filteredLoans = React.useMemo(() => {
        if (isSocio && currentUser?.memberId) {
            return loans.filter(l => l.memberId === currentUser.memberId);
        }
        return loans;
    }, [loans, isSocio, currentUser]);


    // Calculate real-time stats
    const totalSavings = React.useMemo(() => {
        return filteredWeeklyPayments.reduce((acc, curr) => acc + curr.amount, 0) +
            filteredMonthlyFees.reduce((acc, curr) => acc + curr.amount, 0);
    }, [filteredWeeklyPayments, filteredMonthlyFees]);

    const activeLoans = React.useMemo(() => {
        return filteredLoans.filter(l => l.status !== 'paid').length;
    }, [filteredLoans]);

    const totalLoaned = React.useMemo(() => {
        return filteredLoans.reduce((acc, curr) => acc + curr.amount, 0);
    }, [filteredLoans]);

    const totalActions = React.useMemo(() => {
        return members.reduce((acc, m) => {
            // If member has aliases, count them. Otherwise count as 1.
            const actionCount = (m.aliases && m.aliases.length > 0) ? m.aliases.length : 1;
            return acc + actionCount;
        }, 0);
    }, [members]);

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-8"
        >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Resumen General</h1>
                    <p className="text-slate-500 mt-1 text-sm md:text-base">Bienvenido de nuevo, aquí está lo que sucede hoy.</p>
                </div>
                <div className="flex space-x-2">
                    <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium flex items-center">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse" />
                        Sistema Activo
                    </span>
                </div>
            </div>

            <motion.div variants={container} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <motion.div variants={item}>
                    <StatCard
                        title="Total Socios / Acciones"
                        value={`${members.length} / ${totalActions}`}
                        icon={Users}
                        color="bg-blue-500"
                        trend={isSocio ? undefined : "+2 este mes"}
                    />
                </motion.div>
                <motion.div variants={item}>
                    <StatCard
                        title={isSocio ? "Mi Ahorro Total" : "Ahorro Total"}
                        value={`$${totalSavings.toFixed(2)}`}
                        icon={DollarSign}
                        color="bg-emerald-500"
                        trend={isSocio ? undefined : "+12% vs mes anterior"}
                    />
                </motion.div>
                <motion.div variants={item}>
                    <StatCard
                        title={isSocio ? "Mis Préstamos Activos" : "Préstamos Activos"}
                        value={activeLoans.toString()}
                        icon={AlertCircle}
                        color="bg-orange-500"
                    />
                </motion.div>
                <motion.div variants={item}>
                    <StatCard
                        title={isSocio ? "Mi Capital Prestado" : "Capital Prestado"}
                        value={`$${totalLoaned.toFixed(2)}`}
                        icon={TrendingUp}
                        color="bg-purple-500"
                    />
                </motion.div>
            </motion.div>

            {/* Pending Loans Summary */}
            <motion.div variants={item}>
                <Card>
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center">
                            <AlertCircle className="mr-2 text-orange-500" size={20} />
                            {isSocio ? "Mis Préstamos Pendientes" : "Préstamos Pendientes"}
                        </h3>
                        <a href="/loans" className="text-sm text-primary-600 font-medium hover:text-primary-700">Ver todos</a>
                    </div>

                    <div className="space-y-3">
                        {filteredLoans.filter(l => l.status !== 'paid').slice(0, 5).map((loan) => {
                            const member = loan.borrowerType === 'member' ? members.find(m => m.id === loan.memberId) : null;
                            const borrowerName = loan.borrowerType === 'member' ? (member?.name || 'Socio Desconocido') : loan.clientName;
                            const totalPaid = loan.payments.reduce((acc, curr) => acc + curr.amount, 0);
                            const interestAmount = loan.amount * (loan.interestRate / 100);
                            const totalDue = loan.amount + interestAmount;
                            const remaining = totalDue - totalPaid;
                            const daysUntilDue = Math.ceil((new Date(loan.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                            const isOverdue = daysUntilDue < 0;
                            const isDueSoon = daysUntilDue > 0 && daysUntilDue <= 7;

                            return (
                                <div key={loan.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors group">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <p className="font-semibold text-slate-900">{borrowerName}</p>
                                            {isOverdue && (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                                                    VENCIDO
                                                </span>
                                            )}
                                            {isDueSoon && (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700">
                                                    PRÓXIMO
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-4 text-xs text-slate-500">
                                            <span>Restante: <span className="font-bold text-orange-600">${remaining.toFixed(2)}</span></span>
                                            <span>Vence: {new Date(loan.endDate).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-slate-900">${totalDue.toFixed(2)}</p>
                                        <p className="text-xs text-slate-500">{loan.interestRate}% interés</p>
                                    </div>
                                </div>
                            );
                        })}
                        {filteredLoans.filter(l => l.status !== 'paid').length === 0 && (
                            <div className="text-center py-8 text-slate-400">
                                <AlertCircle size={48} className="mx-auto mb-2 opacity-20" />
                                <p className="text-sm">No tienes préstamos pendientes</p>
                            </div>
                        )}
                    </div>
                </Card>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <motion.div variants={item} className="lg:col-span-2">
                    <Card className="h-full">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center">
                                <Activity className="mr-2 text-primary-500" size={20} />
                                {isSocio ? "Mi Actividad Reciente" : "Actividad Reciente"}
                            </h3>
                            <button
                                onClick={() => navigate('/payments')}
                                className="text-sm text-primary-600 font-medium hover:text-primary-700"
                            >
                                Ver todo
                            </button>
                        </div>

                        <div className="space-y-4">
                            {filteredWeeklyPayments
                                .slice()
                                .sort((a, b) => new Date(b.date || Date.now()).getTime() - new Date(a.date || Date.now()).getTime())
                                .slice(0, 5)
                                .map((payment, i) => {
                                    const member = members.find(m => m.id === payment.memberId);
                                    if (!member) return null;

                                    const timeAgo = payment.date
                                        ? Math.floor((Date.now() - new Date(payment.date).getTime()) / (1000 * 60 * 60))
                                        : 0;

                                    return (
                                        <div key={`${payment.memberId}-${payment.week}-${i}`} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors group">
                                            <div className="flex items-center space-x-4">
                                                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-slate-400 group-hover:text-primary-500 group-hover:scale-110 transition-all">
                                                    <DollarSign size={20} />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-900">Pago de Aportación</p>
                                                    <p className="text-sm text-slate-500">
                                                        {member.name} • {timeAgo === 0 ? 'Ahora' : `Hace ${timeAgo} ${timeAgo === 1 ? 'hora' : 'horas'}`}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="font-bold text-emerald-600">+${payment.amount.toFixed(2)}</span>
                                        </div>
                                    );
                                })}
                            {filteredWeeklyPayments.length === 0 && (
                                <div className="text-center py-8 text-slate-400">
                                    <Activity size={48} className="mx-auto mb-2 opacity-20" />
                                    <p className="text-sm">No hay actividad reciente</p>
                                </div>
                            )}
                        </div>
                    </Card>
                </motion.div>

                <motion.div variants={item} className="space-y-6">
                    <Card className="bg-gradient-to-br from-primary-900 to-primary-800 text-white border-none">
                        <h3 className="text-lg font-bold mb-4">Acciones Rápidas</h3>
                        <div className="space-y-3">
                            {isSocio ? (
                                <>
                                    <button
                                        onClick={() => navigate('/payments')}
                                        className="w-full py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-between group"
                                    >
                                        <span className="font-medium">Mis Pagos</span>
                                        <ArrowUpRight size={18} className="text-primary-200 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                    </button>
                                    <button
                                        onClick={() => navigate('/loans')}
                                        className="w-full py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-between group"
                                    >
                                        <span className="font-medium">Mis Préstamos</span>
                                        <ArrowDownRight size={18} className="text-primary-200 group-hover:translate-x-1 group-hover:translate-y-1 transition-transform" />
                                    </button>
                                    <button
                                        onClick={() => navigate('/activities')}
                                        className="w-full py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-between group"
                                    >
                                        <span className="font-medium">Mis Actividades</span>
                                        <Activity size={18} className="text-primary-200 group-hover:scale-110 transition-transform" />
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={() => navigate('/payments')}
                                        className="w-full py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-between group"
                                    >
                                        <span className="font-medium">Registrar Pago</span>
                                        <ArrowUpRight size={18} className="text-primary-200 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                    </button>
                                    <button
                                        onClick={() => navigate('/loans')}
                                        className="w-full py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-between group"
                                    >
                                        <span className="font-medium">Nuevo Préstamo</span>
                                        <ArrowDownRight size={18} className="text-primary-200 group-hover:translate-x-1 group-hover:translate-y-1 transition-transform" />
                                    </button>
                                    <button
                                        onClick={() => navigate('/members')}
                                        className="w-full py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-between group"
                                    >
                                        <span className="font-medium">Agregar Socio</span>
                                        <Users size={18} className="text-primary-200 group-hover:scale-110 transition-transform" />
                                    </button>
                                </>
                            )}
                        </div>

                        <div className="mt-8 p-4 rounded-xl bg-primary-950/50 backdrop-blur-sm">
                            <p className="text-sm text-primary-200 mb-1">Próxima Reunión</p>
                            <p className="font-bold text-lg">Viernes, 24 Nov</p>
                            <p className="text-xs text-primary-300 mt-1">10:00 AM - Casa Comunal</p>
                        </div>
                    </Card>

                    {/* Members List - Visible for everyone but simplified */}
                    <Card title="Nuestros Socios" className="max-h-[400px] overflow-y-auto">
                        <div className="space-y-3">
                            {members.map(member => (
                                <div key={member.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors">
                                    <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-sm">
                                        {member.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-900 text-sm">{member.name}</p>
                                        <div className="flex items-center text-xs text-slate-500">
                                            <Calendar size={12} className="mr-1" />
                                            <span>Miembro desde {new Date(member.joinedDate).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </motion.div>
            </div>
        </motion.div>
    );
};

export default Dashboard;

