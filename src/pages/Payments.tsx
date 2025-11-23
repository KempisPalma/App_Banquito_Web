import React, { useState } from 'react';
import { useBanquito } from '../context/BanquitoContext';
import { Card } from '../components/ui/Card';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { Calendar, TrendingUp } from 'lucide-react';

const Payments: React.FC = () => {
    const { members, weeklyPayments, monthlyFees, recordWeeklyPayment, recordMonthlyFee } = useBanquito();
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const months = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    // Helper to get payment amount safely
    const getWeeklyAmount = (memberId: string, week: number) => {
        const payment = weeklyPayments.find(p =>
            p.memberId === memberId &&
            p.year === selectedYear &&
            p.month === selectedMonth &&
            p.week === week
        );
        return payment ? payment.amount : 0;
    };

    const getMonthlyFeeAmount = (memberId: string) => {
        const fee = monthlyFees.find(f =>
            f.memberId === memberId &&
            f.year === selectedYear &&
            f.month === selectedMonth
        );
        return fee ? fee.amount : 0;
    };

    const handleWeeklyChange = (memberId: string, week: number, value: string) => {
        const amount = parseFloat(value);
        if (!isNaN(amount)) {
            recordWeeklyPayment(memberId, selectedYear, selectedMonth, week, amount);
        }
    };

    const handleMonthlyFeeChange = (memberId: string, value: string) => {
        const amount = parseFloat(value);
        if (!isNaN(amount)) {
            recordMonthlyFee(memberId, selectedYear, selectedMonth, amount);
        }
    };

    // Calculate totals
    const getMemberTotal = (memberId: string) => {
        let total = 0;
        for (let i = 1; i <= 5; i++) {
            total += getWeeklyAmount(memberId, i);
        }
        return total;
    };

    const getWeekTotal = (week: number) => {
        return members.reduce((acc, member) => acc + getWeeklyAmount(member.id, week), 0);
    };

    const getGrandTotal = () => {
        return members.reduce((acc, member) => acc + getMemberTotal(member.id), 0);
    };

    const getMonthlyFeeTotal = () => {
        return members.reduce((acc, member) => acc + getMonthlyFeeAmount(member.id), 0);
    };

    return (
        <div className="space-y-8 max-w-[1600px] mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-6 border-b border-slate-200/60">
                <div>
                    <h1 className="text-4xl font-bold text-slate-800 tracking-tight">Control de Cuotas</h1>
                    <p className="text-slate-500 mt-2 text-lg">Gestiona los pagos semanales y rifas de forma eficiente.</p>
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
                    <div className="w-px h-8 bg-slate-200"></div>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Calendar className="h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                        </div>
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(Number(e.target.value))}
                            className="pl-10 pr-8 py-2.5 bg-transparent border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-slate-700 font-semibold cursor-pointer hover:bg-slate-50 transition-colors appearance-none"
                        >
                            {months.map((month, index) => (
                                <option key={index} value={index}>{month}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <Card className="overflow-hidden border border-slate-200/60 shadow-xl shadow-slate-200/40 bg-white/50 backdrop-blur-xl rounded-3xl" padding="none">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200/60">
                                <th className="px-6 py-5 sticky left-0 bg-white/95 backdrop-blur-md z-20 text-slate-500 font-medium text-xs uppercase tracking-wider w-64">
                                    Socio
                                </th>
                                {[1, 2, 3, 4, 5].map(week => (
                                    <th key={week} className="px-4 py-5 text-center text-slate-500 font-medium text-xs uppercase tracking-wider min-w-[120px]">
                                        Semana {week}
                                    </th>
                                ))}
                                <th className="px-4 py-5 text-center bg-emerald-50/30 text-emerald-600 font-bold text-xs uppercase tracking-wider min-w-[140px]">
                                    Total Pagado
                                </th>
                                <th className="px-4 py-5 text-center bg-indigo-50/30 text-indigo-600 font-bold text-xs uppercase tracking-wider min-w-[140px]">
                                    Rifas
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {members.map((member, index) => {
                                const memberTotal = getMemberTotal(member.id);
                                return (
                                    <motion.tr
                                        key={member.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.03 }}
                                        className="group hover:bg-slate-50/80 transition-colors"
                                    >
                                        <td className="px-6 py-4 sticky left-0 bg-white/95 group-hover:bg-slate-50/95 backdrop-blur-md z-10 border-r border-slate-100 shadow-[4px_0_24px_-2px_rgba(0,0,0,0.02)]">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                                                    {member.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-slate-700 group-hover:text-indigo-600 transition-colors">{member.name}</div>
                                                    {member.alias && <div className="text-xs text-slate-400 font-medium">{member.alias}</div>}
                                                </div>
                                            </div>
                                        </td>
                                        {[1, 2, 3, 4, 5].map(week => {
                                            const amount = getWeeklyAmount(member.id, week);
                                            return (
                                                <td key={week} className="px-2 py-3 text-center">
                                                    <div className="relative flex justify-center group/input">
                                                        <span className={clsx(
                                                            "absolute left-4 top-1/2 -translate-y-1/2 text-xs transition-colors pointer-events-none",
                                                            amount > 0 ? "text-slate-500" : "text-slate-300"
                                                        )}>$</span>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            className={clsx(
                                                                "w-24 pl-7 pr-3 py-2 text-center rounded-xl border transition-all text-sm font-medium outline-none",
                                                                amount > 0
                                                                    ? "bg-white border-slate-200 text-slate-700 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                                                                    : "bg-slate-50/50 border-transparent text-slate-400 hover:bg-white hover:border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                                                            )}
                                                            value={amount === 0 ? '' : amount}
                                                            placeholder="0"
                                                            onChange={(e) => handleWeeklyChange(member.id, week, e.target.value)}
                                                        />
                                                    </div>
                                                </td>
                                            );
                                        })}
                                        <td className="px-4 py-3 text-center bg-emerald-50/30">
                                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-100/50 text-emerald-700 font-bold text-sm">
                                                <TrendingUp className="w-3.5 h-3.5" />
                                                ${memberTotal.toFixed(2)}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center bg-indigo-50/30">
                                            <div className="relative flex justify-center">
                                                <span className={clsx(
                                                    "absolute left-4 top-1/2 -translate-y-1/2 text-xs transition-colors pointer-events-none",
                                                    getMonthlyFeeAmount(member.id) > 0 ? "text-indigo-500" : "text-indigo-300"
                                                )}>$</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    className={clsx(
                                                        "w-24 pl-7 pr-3 py-2 text-center rounded-xl border transition-all text-sm font-medium outline-none",
                                                        getMonthlyFeeAmount(member.id) > 0
                                                            ? "bg-white border-indigo-200 text-indigo-700 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                                                            : "bg-indigo-50/30 border-transparent text-indigo-400 hover:bg-white hover:border-indigo-200 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                                                    )}
                                                    value={getMonthlyFeeAmount(member.id) === 0 ? '' : getMonthlyFeeAmount(member.id)}
                                                    placeholder="0"
                                                    onChange={(e) => handleMonthlyFeeChange(member.id, e.target.value)}
                                                />
                                            </div>
                                        </td>
                                    </motion.tr>
                                );
                            })}
                        </tbody>
                        <tfoot className="bg-slate-50/80 backdrop-blur-sm border-t border-slate-200/60">
                            <tr>
                                <td className="px-6 py-5 sticky left-0 bg-slate-50/95 backdrop-blur-md z-10 text-right font-bold text-slate-600 uppercase text-xs tracking-wider shadow-[4px_0_24px_-2px_rgba(0,0,0,0.02)]">
                                    Totales Generales
                                </td>
                                {[1, 2, 3, 4, 5].map(week => (
                                    <td key={week} className="px-4 py-5 text-center">
                                        <div className="text-slate-700 font-bold text-sm">
                                            ${getWeekTotal(week).toFixed(2)}
                                        </div>
                                    </td>
                                ))}
                                <td className="px-4 py-5 text-center bg-emerald-50/50">
                                    <div className="text-emerald-700 font-black text-base">
                                        ${getGrandTotal().toFixed(2)}
                                    </div>
                                </td>
                                <td className="px-4 py-5 text-center bg-indigo-50/50">
                                    <div className="text-indigo-700 font-black text-base">
                                        ${getMonthlyFeeTotal().toFixed(2)}
                                    </div>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default Payments;
