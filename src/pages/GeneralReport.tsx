import React, { useState, useMemo } from 'react';
import { useBanquito } from '../context/BanquitoContext';
import { Card } from '../components/ui/Card';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, TrendingUp, Gift, Calendar, ChevronRight, X, Download } from 'lucide-react';

const StatCard: React.FC<{ title: string; value: string; icon: any; color: string; subtitle?: string }> = ({ title, value, icon: Icon, color, subtitle }) => {
    const getStyle = (colorClass: string) => {
        switch (colorClass) {
            case 'bg-blue-500': return {
                gradient: 'from-blue-500 to-blue-600',
                shadow: 'shadow-blue-500/30',
            };
            case 'bg-emerald-500': return {
                gradient: 'from-emerald-500 to-emerald-600',
                shadow: 'shadow-emerald-500/30',
            };
            case 'bg-purple-500': return {
                gradient: 'from-purple-500 to-purple-600',
                shadow: 'shadow-purple-500/30',
            };
            default: return {
                gradient: 'from-slate-500 to-slate-600',
                shadow: 'shadow-slate-500/30',
            };
        }
    };

    const style = getStyle(color);

    return (
        <Card className="relative overflow-hidden group hover:-translate-y-2 transition-all duration-300 hover:shadow-xl border border-slate-100">
            <div className={`absolute -right-6 -top-6 w-32 h-32 rounded-full opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-gradient-to-br ${style.gradient}`} />

            <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${style.gradient} flex items-center justify-center shadow-lg ${style.shadow} group-hover:scale-110 transition-transform duration-300`}>
                        <Icon size={28} className="text-white" />
                    </div>
                </div>

                <div className="space-y-1">
                    <p className="text-sm text-slate-500 font-medium">{title}</p>
                    <h3 className="text-3xl font-black text-slate-800 tracking-tight">{value}</h3>
                    {subtitle && (
                        <p className="text-xs text-slate-400 font-medium mt-1">{subtitle}</p>
                    )}
                </div>
            </div>
        </Card>
    );
};

const GeneralReport: React.FC = () => {
    const { members, weeklyPayments, monthlyFees, loans, activities, memberActivities } = useBanquito();
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

    // --- CALCULATIONS ---

    // 1. Total Savings per Member (Weekly + Monthly Fees)
    const getMemberSavings = (memberId: string) => {
        const weekly = weeklyPayments
            .filter(p => p.memberId === memberId && p.year === selectedYear)
            .reduce((acc, curr) => acc + curr.amount, 0);

        const monthly = monthlyFees
            .filter(f => f.memberId === memberId && f.year === selectedYear)
            .reduce((acc, curr) => acc + curr.amount, 0);

        return { weekly, monthly, total: weekly + monthly };
    };

    // 2. Loan Profits (Interest Collected)
    const loanProfits = useMemo(() => {
        return loans.reduce((total, loan) => {
            // Only count interest payments made in the selected year
            const interestPayments = loan.payments
                .filter(p => new Date(p.date).getFullYear() === selectedYear && p.paymentType === 'interest')
                .reduce((acc, curr) => acc + curr.amount, 0);
            return total + interestPayments;
        }, 0);
    }, [loans, selectedYear]);

    // 3. Activity Profits (Total Revenue)
    const activityProfits = useMemo(() => {
        // Filter activities by year
        const yearActivities = activities.filter(a => new Date(a.date).getFullYear() === selectedYear);

        return yearActivities.reduce((total, activity) => {
            // Find all sales for this activity
            const sales = memberActivities
                .filter(ma => ma.activityId === activity.id)
                .reduce((acc, curr) => acc + (curr.ticketsSold * activity.ticketPrice), 0);
            return total + sales;
        }, 0);
    }, [activities, memberActivities, selectedYear]);

    // 4. Eligibility for Loan Profit Share
    // Rule: Has a loan OR paid >= $10 in interest
    const getMemberLoanEligibility = (memberId: string) => {
        const memberLoans = loans.filter(l => l.memberId === memberId && l.borrowerType === 'member');
        const hasLoan = memberLoans.length > 0;

        const totalInterestPaid = memberLoans.reduce((total, loan) => {
            return total + loan.payments
                .filter(p => p.paymentType === 'interest')
                .reduce((acc, curr) => acc + curr.amount, 0);
        }, 0);

        // Threshold: Interest of $100 loan at 10% = $10
        return hasLoan || totalInterestPaid >= 10;
    };

    // Calculate Shares
    const eligibleForLoansCount = members.filter(m => getMemberLoanEligibility(m.id)).length;
    const loanSharePerMember = eligibleForLoansCount > 0 ? loanProfits / eligibleForLoansCount : 0;

    const activitySharePerMember = members.length > 0 ? activityProfits / members.length : 0;

    // Compile Report Data
    const reportData = members.map(member => {
        const savings = getMemberSavings(member.id);
        const isEligibleForLoans = getMemberLoanEligibility(member.id);
        const loanShare = isEligibleForLoans ? loanSharePerMember : 0;
        const totalReceive = savings.total + loanShare + activitySharePerMember;

        return {
            ...member,
            savings,
            isEligibleForLoans,
            loanShare,
            activityShare: activitySharePerMember,
            totalReceive
        };
    });

    const grandTotalSavings = reportData.reduce((acc, curr) => acc + curr.savings.total, 0);
    const grandTotalDistributed = reportData.reduce((acc, curr) => acc + curr.totalReceive, 0);

    const selectedMemberData = selectedMemberId ? reportData.find(m => m.id === selectedMemberId) : null;

    return (
        <div className="space-y-8 max-w-[1600px] mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-6 border-b border-slate-200/60">
                <div>
                    <h1 className="text-4xl font-bold text-slate-800 tracking-tight">Reporte General</h1>
                    <p className="text-slate-500 mt-2 text-lg">Resumen financiero y distribución de ganancias {selectedYear}.</p>
                </div>

                <div className="flex gap-4 items-center bg-white/80 backdrop-blur-sm p-2 rounded-2xl shadow-sm border border-slate-200/60">
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Calendar className="h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                        </div>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="pl-10 pr-8 py-2.5 bg-transparent border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-slate-700 font-semibold cursor-pointer hover:bg-slate-50 transition-colors appearance-none"
                        >
                            {Array.from({ length: 7 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    title="Ahorro Total Socios"
                    value={`$${grandTotalSavings.toFixed(2)}`}
                    icon={Wallet}
                    color="bg-blue-500"
                />
                <StatCard
                    title="Ganancias Préstamos"
                    value={`$${loanProfits.toFixed(2)}`}
                    icon={TrendingUp}
                    color="bg-emerald-500"
                    subtitle={`$${loanSharePerMember.toFixed(2)} por socio elegible (${eligibleForLoansCount})`}
                />
                <StatCard
                    title="Ganancias Actividades"
                    value={`$${activityProfits.toFixed(2)}`}
                    icon={Gift}
                    color="bg-purple-500"
                    subtitle={`$${activitySharePerMember.toFixed(2)} por socio (Todos)`}
                />
            </div>

            {/* Main Table */}
            <Card className="overflow-hidden border border-slate-200/60 shadow-xl shadow-slate-200/40 bg-white/50 backdrop-blur-xl rounded-3xl" padding="none">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-200/60">
                                <th className="px-6 py-5 text-slate-500 font-medium text-xs uppercase tracking-wider">Socio</th>
                                <th className="px-6 py-5 text-right text-slate-500 font-medium text-xs uppercase tracking-wider">Ahorro Total</th>
                                <th className="px-6 py-5 text-right text-emerald-600 font-medium text-xs uppercase tracking-wider bg-emerald-50/30">Part. Préstamos</th>
                                <th className="px-6 py-5 text-right text-purple-600 font-medium text-xs uppercase tracking-wider bg-purple-50/30">Part. Actividades</th>
                                <th className="px-6 py-5 text-right text-slate-800 font-bold text-xs uppercase tracking-wider bg-slate-100/50">Total a Recibir</th>
                                <th className="px-6 py-5 text-center text-slate-500 font-medium text-xs uppercase tracking-wider">Detalle</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {reportData.map((data, index) => (
                                <motion.tr
                                    key={data.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="group hover:bg-slate-50/80 transition-colors cursor-pointer"
                                    onClick={() => setSelectedMemberId(data.id)}
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-600 font-bold text-xs">
                                                {data.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-slate-700">{data.name}</div>
                                                {data.aliases && data.aliases.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-0.5">
                                                        {data.aliases.map((alias: string, idx: number) => (
                                                            <span key={idx} className="text-xs text-slate-400">
                                                                {alias}{idx < data.aliases!.length - 1 ? ', ' : ''}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right font-medium text-slate-600">
                                        ${data.savings.total.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 text-right font-medium text-emerald-600 bg-emerald-50/10 group-hover:bg-emerald-50/30 transition-colors">
                                        ${data.loanShare.toFixed(2)}
                                        {!data.isEligibleForLoans && <span className="text-[10px] text-slate-400 block">No elegible</span>}
                                    </td>
                                    <td className="px-6 py-4 text-right font-medium text-purple-600 bg-purple-50/10 group-hover:bg-purple-50/30 transition-colors">
                                        ${data.activityShare.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-slate-800 bg-slate-50/30 group-hover:bg-slate-100/50 text-lg">
                                        ${data.totalReceive.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button className="p-2 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors">
                                            <ChevronRight size={18} />
                                        </button>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-slate-50/90 border-t border-slate-200 font-bold text-slate-700">
                            <tr>
                                <td className="px-6 py-4">TOTALES</td>
                                <td className="px-6 py-4 text-right">${grandTotalSavings.toFixed(2)}</td>
                                <td className="px-6 py-4 text-right text-emerald-700">${loanProfits.toFixed(2)}</td>
                                <td className="px-6 py-4 text-right text-purple-700">${activityProfits.toFixed(2)}</td>
                                <td className="px-6 py-4 text-right text-xl">${grandTotalDistributed.toFixed(2)}</td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </Card>

            {/* Member Detail Modal */}
            <AnimatePresence>
                {selectedMemberId && selectedMemberData && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedMemberId(null)}
                            className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-50"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
                        >
                            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden pointer-events-auto flex flex-col max-h-[90vh]">
                                <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-500/30">
                                            {selectedMemberData.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold text-slate-900">{selectedMemberData.name}</h2>
                                            <p className="text-slate-500">Detalle de Fin de Año {selectedYear}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSelectedMemberId(null)}
                                        className="p-2 rounded-full hover:bg-slate-200 text-slate-400 transition-colors"
                                    >
                                        <X size={24} />
                                    </button>
                                </div>

                                <div className="p-8 overflow-y-auto space-y-8">
                                    {/* Total Big Number */}
                                    <div className="text-center">
                                        <p className="text-slate-500 font-medium mb-1">Total a Recibir</p>
                                        <h3 className="text-5xl font-black text-slate-900 tracking-tight">
                                            ${selectedMemberData.totalReceive.toFixed(2)}
                                        </h3>
                                    </div>

                                    {/* Breakdown */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100">
                                            <div className="flex items-center gap-2 mb-2 text-blue-700 font-bold">
                                                <Wallet size={18} />
                                                Ahorros
                                            </div>
                                            <div className="text-2xl font-bold text-slate-800">${selectedMemberData.savings.total.toFixed(2)}</div>
                                            <div className="text-xs text-slate-500 mt-1">
                                                Semanal: ${selectedMemberData.savings.weekly.toFixed(2)}<br />
                                                Mensual: ${selectedMemberData.savings.monthly.toFixed(2)}
                                            </div>
                                        </div>

                                        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                                            <div className="flex items-center gap-2 mb-2 text-emerald-700 font-bold">
                                                <TrendingUp size={18} />
                                                Préstamos
                                            </div>
                                            <div className="text-2xl font-bold text-slate-800">${selectedMemberData.loanShare.toFixed(2)}</div>
                                            <div className="text-xs text-slate-500 mt-1">
                                                {selectedMemberData.isEligibleForLoans
                                                    ? "Socio Elegible"
                                                    : "No cumple requisitos (Min $10 interés o 1 préstamo)"}
                                            </div>
                                        </div>

                                        <div className="p-4 rounded-2xl bg-purple-50 border border-purple-100">
                                            <div className="flex items-center gap-2 mb-2 text-purple-700 font-bold">
                                                <Gift size={18} />
                                                Actividades
                                            </div>
                                            <div className="text-2xl font-bold text-slate-800">${selectedMemberData.activityShare.toFixed(2)}</div>
                                            <div className="text-xs text-slate-500 mt-1">
                                                Distribución igualitaria
                                            </div>
                                        </div>
                                    </div>

                                    {/* Detailed Stats */}
                                    <div className="space-y-3">
                                        <h4 className="font-bold text-slate-900">Resumen de Actividad</h4>
                                        <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Pagos Semanales Realizados</span>
                                                <span className="font-medium text-slate-900">${selectedMemberData.savings.weekly.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Cuotas Mensuales (Rifas)</span>
                                                <span className="font-medium text-slate-900">${selectedMemberData.savings.monthly.toFixed(2)}</span>
                                            </div>
                                            <div className="border-t border-slate-200 my-2 pt-2 flex justify-between font-bold">
                                                <span className="text-slate-700">Subtotal Ahorrado</span>
                                                <span className="text-slate-900">${selectedMemberData.savings.total.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
                                    <button
                                        onClick={() => window.print()}
                                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors font-medium"
                                    >
                                        <Download size={18} />
                                        Imprimir Reporte
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default GeneralReport;
