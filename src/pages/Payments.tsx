import React, { useState } from 'react';
import { useBanquito } from '../context/BanquitoContext';
import { Card } from '../components/ui/Card';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';

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
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Control de Cuotas</h1>
                    <p className="text-slate-500 mt-1">Vista detallada de pagos semanales y rifas.</p>
                </div>

                <div className="flex gap-4 items-center bg-white p-3 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-slate-700">Año:</label>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all font-medium text-slate-700"
                        >
                            {Array.from({ length: 7 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-slate-700">Mes:</label>
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(Number(e.target.value))}
                            className="px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all font-medium text-slate-700"
                        >
                            {months.map((month, index) => (
                                <option key={index} value={index}>{month}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <Card className="overflow-hidden border-none shadow-xl shadow-slate-200/50" padding="none">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-800 text-white font-semibold text-sm uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4 sticky left-0 bg-slate-800 z-10">Socios</th>
                                {[1, 2, 3, 4, 5].map(week => (
                                    <th key={week} className="px-4 py-4 text-center border-l border-slate-700">Semana {week}</th>
                                ))}
                                <th className="px-4 py-4 text-center bg-emerald-600 border-l border-emerald-500">Total Pagado</th>
                                <th className="px-4 py-4 text-center bg-blue-600 border-l border-blue-500">Rifas Pagadas</th>
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
                                        transition={{ delay: index * 0.02 }}
                                        className="hover:bg-slate-50 transition-colors"
                                    >
                                        <td className="px-6 py-3 sticky left-0 bg-white hover:bg-slate-50 z-10 border-r border-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                            <div className="font-semibold text-slate-900">{member.name}</div>
                                            {member.alias && <div className="text-xs text-slate-500">{member.alias}</div>}
                                        </td>
                                        {[1, 2, 3, 4, 5].map(week => {
                                            const amount = getWeeklyAmount(member.id, week);
                                            return (
                                                <td key={week} className="px-2 py-3 text-center border-l border-slate-100">
                                                    <div className="relative flex justify-center">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            className={clsx(
                                                                "w-20 pl-6 pr-2 py-1.5 text-center rounded-lg border focus:ring-2 focus:outline-none transition-all text-sm font-medium",
                                                                amount > 0
                                                                    ? "bg-white border-slate-200 text-slate-900 focus:border-primary-500 focus:ring-primary-500/20"
                                                                    : "bg-slate-50 border-transparent text-slate-400 focus:bg-white focus:border-primary-500 focus:ring-primary-500/20"
                                                            )}
                                                            value={amount === 0 ? '' : amount}
                                                            placeholder="0.00"
                                                            onChange={(e) => handleWeeklyChange(member.id, week, e.target.value)}
                                                        />
                                                    </div>
                                                </td>
                                            );
                                        })}
                                        <td className="px-4 py-3 text-center bg-emerald-50/50 border-l border-emerald-100">
                                            <span className="font-bold text-emerald-700">${memberTotal.toFixed(2)}</span>
                                        </td>
                                        <td className="px-4 py-3 text-center bg-blue-50/50 border-l border-blue-100">
                                            <div className="relative flex justify-center">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 text-xs">$</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    className={clsx(
                                                        "w-20 pl-6 pr-2 py-1.5 text-center rounded-lg border focus:ring-2 focus:outline-none transition-all text-sm font-medium",
                                                        getMonthlyFeeAmount(member.id) > 0
                                                            ? "bg-white border-blue-200 text-blue-700 focus:border-blue-500 focus:ring-blue-500/20"
                                                            : "bg-blue-50/50 border-transparent text-blue-400 focus:bg-white focus:border-blue-500 focus:ring-blue-500/20"
                                                    )}
                                                    value={getMonthlyFeeAmount(member.id) === 0 ? '' : getMonthlyFeeAmount(member.id)}
                                                    placeholder="0.00"
                                                    onChange={(e) => handleMonthlyFeeChange(member.id, e.target.value)}
                                                />
                                            </div>
                                        </td>
                                    </motion.tr>
                                );
                            })}
                        </tbody>
                        <tfoot className="bg-slate-800 text-white font-bold text-sm">
                            <tr>
                                <td className="px-6 py-4 sticky left-0 bg-slate-800 z-10 text-right uppercase tracking-wider">Total</td>
                                {[1, 2, 3, 4, 5].map(week => (
                                    <td key={week} className="px-4 py-4 text-center border-l border-slate-700">
                                        ${getWeekTotal(week).toFixed(2)}
                                    </td>
                                ))}
                                <td className="px-4 py-4 text-center bg-emerald-600 border-l border-emerald-500">
                                    ${getGrandTotal().toFixed(2)}
                                </td>
                                <td className="px-4 py-4 text-center bg-blue-600 border-l border-blue-500">
                                    ${getMonthlyFeeTotal().toFixed(2)}
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
