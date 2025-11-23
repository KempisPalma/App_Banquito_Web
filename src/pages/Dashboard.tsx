import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useBanquito } from '../context/BanquitoContext';
import { Users, DollarSign, TrendingUp, AlertCircle, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { motion } from 'framer-motion';

const StatCard: React.FC<{ title: string; value: string; icon: any; color: string; trend?: string }> = ({ title, value, icon: Icon, color, trend }) => (
    <Card className="relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
        <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity ${color.replace('bg-', 'text-')}`}>
            <Icon size={80} />
        </div>
        <div className="relative z-10">
            <div className={`w-12 h-12 rounded-xl ${color} bg-opacity-10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <Icon size={24} className={color.replace('bg-', 'text-')} />
            </div>
            <p className="text-sm text-slate-500 font-medium mb-1">{title}</p>
            <h3 className="text-3xl font-bold text-slate-800 tracking-tight">{value}</h3>
            {trend && (
                <div className="flex items-center mt-2 text-sm text-emerald-600 font-medium">
                    <TrendingUp size={16} className="mr-1" />
                    <span>{trend}</span>
                </div>
            )}
        </div>
    </Card>
);

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const { members, weeklyPayments, loans, monthlyFees } = useBanquito();

    // Calculate real-time stats
    const totalSavings = React.useMemo(() => {
        return weeklyPayments.reduce((acc, curr) => acc + curr.amount, 0) +
            monthlyFees.reduce((acc, curr) => acc + curr.amount, 0);
    }, [weeklyPayments, monthlyFees]);

    const activeLoans = React.useMemo(() => {
        return loans.filter(l => l.status !== 'paid').length;
    }, [loans]);

    const totalLoaned = React.useMemo(() => {
        return loans.reduce((acc, curr) => acc + curr.amount, 0);
    }, [loans]);

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
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Resumen General</h1>
                    <p className="text-slate-500 mt-1">Bienvenido de nuevo, aquí está lo que sucede hoy.</p>
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
                        title="Total Socios"
                        value={members.length.toString()}
                        icon={Users}
                        color="bg-blue-500"
                        trend="+2 este mes"
                    />
                </motion.div>
                <motion.div variants={item}>
                    <StatCard
                        title="Ahorro Total"
                        value={`$${totalSavings.toFixed(2)}`}
                        icon={DollarSign}
                        color="bg-emerald-500"
                        trend="+12% vs mes anterior"
                    />
                </motion.div>
                <motion.div variants={item}>
                    <StatCard
                        title="Préstamos Activos"
                        value={activeLoans.toString()}
                        icon={AlertCircle}
                        color="bg-orange-500"
                    />
                </motion.div>
                <motion.div variants={item}>
                    <StatCard
                        title="Capital Prestado"
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
                            Préstamos Pendientes
                        </h3>
                        <a href="/loans" className="text-sm text-primary-600 font-medium hover:text-primary-700">Ver todos</a>
                    </div>

                    <div className="space-y-3">
                        {loans.filter(l => l.status !== 'paid').slice(0, 5).map((loan) => {
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
                        {loans.filter(l => l.status !== 'paid').length === 0 && (
                            <div className="text-center py-8 text-slate-400">
                                <AlertCircle size={48} className="mx-auto mb-2 opacity-20" />
                                <p className="text-sm">No hay préstamos pendientes</p>
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
                                Actividad Reciente
                            </h3>
                            <button
                                onClick={() => navigate('/payments')}
                                className="text-sm text-primary-600 font-medium hover:text-primary-700"
                            >
                                Ver todo
                            </button>
                        </div>

                        <div className="space-y-4">
                            {weeklyPayments
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
                            {weeklyPayments.length === 0 && (
                                <div className="text-center py-8 text-slate-400">
                                    <Activity size={48} className="mx-auto mb-2 opacity-20" />
                                    <p className="text-sm">No hay actividad reciente</p>
                                </div>
                            )}
                        </div>
                    </Card>
                </motion.div>

                <motion.div variants={item}>
                    <Card className="h-full bg-gradient-to-br from-primary-900 to-primary-800 text-white border-none">
                        <h3 className="text-lg font-bold mb-4">Acciones Rápidas</h3>
                        <div className="space-y-3">
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
                        </div>

                        <div className="mt-8 p-4 rounded-xl bg-primary-950/50 backdrop-blur-sm">
                            <p className="text-sm text-primary-200 mb-1">Próxima Reunión</p>
                            <p className="font-bold text-lg">Viernes, 24 Nov</p>
                            <p className="text-xs text-primary-300 mt-1">10:00 AM - Casa Comunal</p>
                        </div>
                    </Card>
                </motion.div>
            </div>
        </motion.div>
    );
};

export default Dashboard;
