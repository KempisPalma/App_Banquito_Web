import React, { useState, useMemo } from 'react';
import { useBanquito } from '../context/BanquitoContext';
import { Card } from '../components/ui/Card';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, TrendingUp, Gift, Calendar, ChevronRight, X, Download } from 'lucide-react';
import { MemberPaymentHistory } from '../components/MemberPaymentHistory';

const StatCard: React.FC<{ title: string; value: string; icon: any; color: string; subtitle?: string; children?: React.ReactNode }> = ({ title, value, icon: Icon, color, subtitle, children }) => {
    const getStyle = (colorClass: string) => {
        switch (colorClass) {
            case 'bg-blue-500': return {
                gradient: 'from-blue-500 to-blue-600',
                shadow: 'shadow-blue-500/30',
                text: 'text-blue-600',
                bg: 'bg-blue-50'
            };
            case 'bg-emerald-500': return {
                gradient: 'from-emerald-500 to-emerald-600',
                shadow: 'shadow-emerald-500/30',
                text: 'text-emerald-600',
                bg: 'bg-emerald-50'
            };
            case 'bg-purple-500': return {
                gradient: 'from-purple-500 to-purple-600',
                shadow: 'shadow-purple-500/30',
                text: 'text-purple-600',
                bg: 'bg-purple-50'
            };
            default: return {
                gradient: 'from-slate-500 to-slate-600',
                shadow: 'shadow-slate-500/30',
                text: 'text-slate-600',
                bg: 'bg-slate-50'
            };
        }
    };

    const style = getStyle(color);

    return (
        <Card className="relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 hover:shadow-xl border border-slate-100 h-full flex flex-col">
            <div className={`absolute -right-6 -top-6 w-32 h-32 rounded-full opacity-0 group-hover:opacity-5 transition-opacity duration-500 bg-gradient-to-br ${style.gradient}`} />

            <div className="relative z-10 flex-1 p-1">
                <div className="flex justify-between items-start mb-4">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${style.gradient} flex items-center justify-center shadow-lg ${style.shadow} group-hover:scale-110 transition-transform duration-300`}>
                        <Icon size={24} className="text-white" />
                    </div>
                </div>

                <div className="space-y-1 mb-4">
                    <p className="text-sm text-slate-500 font-medium">{title}</p>
                    <h3 className="text-3xl font-black text-slate-800 tracking-tight">{value}</h3>
                    {subtitle && (
                        <p className="text-xs text-slate-400 font-medium">{subtitle}</p>
                    )}
                </div>

                {children && (
                    <div className={`mt-auto pt-4 border-t border-slate-100 ${style.bg} -mx-6 -mb-6 px-6 py-4`}>
                        {children}
                    </div>
                )}
            </div>
        </Card>
    );
};

const GeneralReport: React.FC = () => {
    const { members, weeklyPayments, monthlyFees, loans, activities, memberActivities } = useBanquito();
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

    // --- CALCULATIONS ---

    // Helper: Get all "identities" (member + action)
    const allIdentities = useMemo(() => {
        return members.flatMap(m => {
            if (m.aliases && m.aliases.length > 0) {
                return m.aliases.map(alias => ({ member: m, actionAlias: alias }));
            }
            return [{ member: m, actionAlias: undefined }];
        });
    }, [members]);

    // 1. Savings per Identity (Weekly + Monthly Fees)
    const getIdentitySavings = (memberId: string, actionAlias?: string) => {
        const weekly = weeklyPayments
            .filter(p => p.memberId === memberId && p.year === selectedYear && p.actionAlias === actionAlias)
            .reduce((acc, curr) => acc + curr.amount, 0);

        const monthly = monthlyFees
            .filter(f => f.memberId === memberId && f.year === selectedYear && f.actionAlias === actionAlias)
            .reduce((acc, curr) => acc + curr.amount, 0);

        return { weekly, monthly, total: weekly + monthly };
    };

    // 2. Loan Calculations
    const loanStats = useMemo(() => {
        const yearLoans = loans; // Consider all loans for principal outstanding, or filter by year if needed. Usually outstanding is global.

        // Principal currently lent out (Active loans)
        const principalOutstanding = yearLoans
            .filter(l => l.status === 'active')
            .reduce((total, loan) => {
                const principalPaid = loan.payments
                    .filter(p => p.paymentType === 'principal')
                    .reduce((acc, curr) => acc + curr.amount, 0);
                return total + (loan.amount - principalPaid);
            }, 0);

        // Interest collected this year (Profit)
        const interestCollected = yearLoans.reduce((total, loan) => {
            const interestPayments = loan.payments
                .filter(p => new Date(p.date).getFullYear() === selectedYear && p.paymentType === 'interest')
                .reduce((acc, curr) => acc + curr.amount, 0);
            return total + interestPayments;
        }, 0);

        // Total amount ever lent (Volume)
        const totalLentVolume = yearLoans
            .filter(l => new Date(l.startDate).getFullYear() === selectedYear)
            .reduce((acc, curr) => acc + curr.amount, 0);

        return { principalOutstanding, interestCollected, totalLentVolume };
    }, [loans, selectedYear]);

    // 3. Activity Calculations
    const activityStats = useMemo(() => {
        const yearActivities = activities.filter(a => new Date(a.date).getFullYear() === selectedYear);

        const totalRevenue = yearActivities.reduce((total, activity) => {
            const sales = memberActivities
                .filter(ma => ma.activityId === activity.id)
                .reduce((acc, curr) => acc + (curr.ticketsSold * activity.ticketPrice), 0);
            return total + sales;
        }, 0);

        const totalInvestment = yearActivities.reduce((acc, curr) => acc + (curr.investment || 0), 0);
        const netProfit = totalRevenue - totalInvestment;

        return { totalRevenue, totalInvestment, netProfit, count: yearActivities.length };
    }, [activities, memberActivities, selectedYear]);

    // 4. Eligibility for Loan Profit Share (Per Action)
    const getIdentityLoanEligibility = (memberId: string, actionAlias?: string) => {
        // Loans taken by this specific action
        const identityLoans = loans.filter(l =>
            l.memberId === memberId &&
            l.borrowerType === 'member' &&
            l.actionAlias === actionAlias
        );
        const hasLoan = identityLoans.length > 0;

        const totalInterestPaid = identityLoans.reduce((total, loan) => {
            return total + loan.payments
                .filter(p => p.paymentType === 'interest')
                .reduce((acc, curr) => acc + curr.amount, 0);
        }, 0);

        return hasLoan || totalInterestPaid >= 10;
    };

    // Calculate Shares
    // Calculate Shares
    // Distribute loan interest among all actions (identities)
    const loanSharePerIdentity = allIdentities.length > 0 ? loanStats.interestCollected / allIdentities.length : 0;

    const activitySharePerIdentity = allIdentities.length > 0 ? activityStats.netProfit / allIdentities.length : 0;

    // Compile Report Data
    const reportData = allIdentities.map(({ member, actionAlias }) => {
        const savings = getIdentitySavings(member.id, actionAlias);
        // Everyone is eligible for loan shares now
        const loanShare = loanSharePerIdentity;

        // Activity share can be negative if there's a loss, but usually we distribute profits. 
        // If netProfit is negative, share is negative (loss sharing) or zero depending on rules. 
        // Assuming simple division of net result.
        const activityShare = activitySharePerIdentity;

        const totalReceive = savings.total + loanShare + activityShare;

        return {
            id: member.id, // Keep member ID for reference
            uniqueId: `${member.id}-${actionAlias || 'default'}`, // Unique ID for list
            name: member.name,
            actionAlias,
            savings,
            savings,
            loanShare,
            activityShare,
            totalReceive,
            memberObj: member // Pass full member object for modal
        };
    });

    const grandTotalSavings = reportData.reduce((acc, curr) => acc + curr.savings.total, 0);
    const grandTotalDistributed = reportData.reduce((acc, curr) => acc + curr.totalReceive, 0);

    // Cash on Hand: Total Savings - Money Lent Out - Money Spent on Activities + Activity Revenue (Revenue is already in Banquito? No, revenue comes in. Investment goes out.)
    // Actually simpler: Cash = (Savings + Loan Interest + Activity Revenue) - (Loan Principal Outstanding + Activity Investment)
    // Wait, "Savings" is money IN. "Loan Interest" is money IN. "Activity Revenue" is money IN.
    // "Loan Principal" is money OUT (when lent) but comes back. "Principal Outstanding" is money currently OUT.
    // "Activity Investment" is money OUT.
    // So Cash Available = (Total Savings Collected) + (Total Interest Collected) + (Total Activity Revenue) - (Principal Currently Outstanding) - (Total Activity Investment)
    // However, usually "Total Savings" displayed is just the sum of member contributions.

    // Let's stick to the user request: "dinero que se tiene y el que se deberia tener".
    // "Debería tener" (Total Assets) = Total Savings + Total Profits (Loan Interest + Activity Net Profit)
    // "Se tiene" (Cash/Liquidity) = Total Assets - Principal Outstanding - Activity Investment (if not recovered yet? No, Net Profit accounts for investment).
    // Actually: Cash = Total Assets - Principal Outstanding.

    const totalAssets = grandTotalSavings + loanStats.interestCollected + activityStats.netProfit;
    const cashOnHand = totalAssets - loanStats.principalOutstanding;


    const selectedReportItem = selectedMemberId ? reportData.find(r => r.uniqueId === selectedMemberId) : null;

    return (
        <div className="space-y-8 max-w-[1600px] mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-6 border-b border-slate-200/60">
                <div>
                    <h1 className="text-4xl font-bold text-slate-800 tracking-tight">Reporte General</h1>
                    <p className="text-slate-500 mt-2 text-lg">Resumen financiero y distribución de ganancias {selectedYear}.</p>
                </div>

                <div className="flex gap-4 items-center">
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

                    <button
                        onClick={() => window.print()}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-slate-800 to-slate-900 text-white rounded-xl hover:from-slate-700 hover:to-slate-800 transition-all shadow-md hover:shadow-lg font-medium"
                    >
                        <Download size={18} />
                        Imprimir Reporte
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    title="Ahorro Total (Activos)"
                    value={`$${totalAssets.toFixed(2)}`}
                    icon={Wallet}
                    color="bg-blue-500"
                    subtitle="Total acumulado + Ganancias"
                >
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500">Dinero en Caja (Disponible)</span>
                        <span className="font-bold text-slate-700">${cashOnHand.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm mt-1">
                        <span className="text-slate-500">Dinero Prestado/Invertido</span>
                        <span className="font-bold text-slate-700">${loanStats.principalOutstanding.toFixed(2)}</span>
                    </div>
                </StatCard>

                <StatCard
                    title="Ganancias Préstamos"
                    value={`$${loanStats.interestCollected.toFixed(2)}`}
                    icon={TrendingUp}
                    color="bg-emerald-500"
                    subtitle={`$${loanSharePerIdentity.toFixed(2)} por acción (Todas)`}
                >
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-emerald-700/70">Capital Prestado (Activo)</span>
                        <span className="font-bold text-emerald-700">${loanStats.principalOutstanding.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm mt-1">
                        <span className="text-emerald-700/70">Volumen Prestado {selectedYear}</span>
                        <span className="font-bold text-emerald-700">${loanStats.totalLentVolume.toFixed(2)}</span>
                    </div>
                </StatCard>

                <StatCard
                    title="Ganancias Actividades"
                    value={`$${activityStats.netProfit.toFixed(2)}`}
                    icon={Gift}
                    color="bg-purple-500"
                    subtitle={`$${activitySharePerIdentity.toFixed(2)} por acción (Todas)`}
                >
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-purple-700/70">Ingresos Totales</span>
                        <span className="font-bold text-purple-700">${activityStats.totalRevenue.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm mt-1">
                        <span className="text-purple-700/70">Inversión Total</span>
                        <span className="font-bold text-purple-700">${activityStats.totalInvestment.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm mt-1 pt-1 border-t border-purple-200/50">
                        <span className="text-purple-700/70">Actividades Realizadas</span>
                        <span className="font-bold text-purple-700">{activityStats.count}</span>
                    </div>
                </StatCard>
            </div>

            {/* Main Table */}
            <Card className="overflow-hidden border border-slate-200/60 shadow-xl shadow-slate-200/40 bg-white/50 backdrop-blur-xl rounded-3xl" padding="none">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-200/60">
                                <th className="px-6 py-5 text-slate-500 font-medium text-xs uppercase tracking-wider">Socio / Acción</th>
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
                                    key={data.uniqueId}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="group hover:bg-slate-50/80 transition-colors cursor-pointer"
                                    onClick={() => setSelectedMemberId(data.uniqueId)}
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-600 font-bold text-xs">
                                                {data.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-slate-700">{data.name}</div>
                                                {data.actionAlias && (
                                                    <div className="text-xs text-purple-600 font-medium bg-purple-50 px-2 py-0.5 rounded-full inline-block mt-0.5">
                                                        {data.actionAlias}
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
                                <td className="px-6 py-4 text-right text-emerald-700">
                                    ${reportData.reduce((acc, curr) => acc + curr.loanShare, 0).toFixed(2)}
                                </td>
                                <td className="px-6 py-4 text-right text-purple-700">
                                    ${reportData.reduce((acc, curr) => acc + curr.activityShare, 0).toFixed(2)}
                                </td>
                                <td className="px-6 py-4 text-right text-xl">${grandTotalDistributed.toFixed(2)}</td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </Card>

            {/* Member Detail Modal */}
            <AnimatePresence>
                {selectedMemberId && selectedReportItem && (
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
                            <div className="print-report bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden pointer-events-auto flex flex-col max-h-[90vh]">
                                <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-500/30">
                                            {selectedReportItem.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold text-slate-900">{selectedReportItem.name}</h2>
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
                                            ${selectedReportItem.totalReceive.toFixed(2)}
                                        </h3>
                                    </div>

                                    {/* Detailed Payment History Table */}
                                    <MemberPaymentHistory
                                        member={selectedReportItem.memberObj}
                                        year={selectedYear}
                                        weeklyPayments={weeklyPayments}
                                        monthlyFees={monthlyFees}
                                        initialAction={selectedReportItem.actionAlias}
                                        reportData={reportData}
                                    />
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
