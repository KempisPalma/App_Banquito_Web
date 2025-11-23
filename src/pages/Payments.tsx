import React, { useState } from 'react';
import { useBanquito } from '../context/BanquitoContext';
import { Card } from '../components/ui/Card';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { Calendar, TrendingUp } from 'lucide-react';

// Type for each row in the payment table
type PaymentRow = {
    memberId: string;
    memberName: string;
    actionAlias?: string; // undefined means no specific action
    displayName: string; // What to show in the table
};

const Payments: React.FC = () => {
    const { members, weeklyPayments, monthlyFees, recordWeeklyPayment, recordMonthlyFee, currentUser } = useBanquito();
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const months = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    // Generate payment rows - one row per action (or one row if no actions)
    // Filter by current user if they are a 'socio'
    const filteredMembers = currentUser?.role === 'socio' && currentUser.memberId
        ? members.filter(m => m.id === currentUser.memberId)
        : members;

    const paymentRows: PaymentRow[] = filteredMembers.flatMap(member => {
        if (member.aliases && member.aliases.length > 0) {
            // Create a row for each action
            return member.aliases.map(alias => ({
                memberId: member.id,
                memberName: member.name,
                actionAlias: alias,
                displayName: `${member.name} / ${alias}`
            }));
        } else {
            // Single row for member without actions
            return [{
                memberId: member.id,
                memberName: member.name,
                actionAlias: undefined,
                displayName: member.name
            }];
        }
    });

    // Helper to get payment amount safely
    const getWeeklyAmount = (memberId: string, week: number, actionAlias?: string) => {
        const payment = weeklyPayments.find(p =>
            p.memberId === memberId &&
            p.year === selectedYear &&
            p.month === selectedMonth &&
            p.week === week &&
            p.actionAlias === actionAlias
        );
        return payment ? payment.amount : 0;
    };

    const getMonthlyFeeAmount = (memberId: string, actionAlias?: string) => {
        const fee = monthlyFees.find(f =>
            f.memberId === memberId &&
            f.year === selectedYear &&
            f.month === selectedMonth &&
            f.actionAlias === actionAlias
        );
        return fee ? fee.amount : 0;
    };

    const handleWeeklyChange = (memberId: string, week: number, value: string, actionAlias?: string) => {
        // Prevent editing if user is socio
        if (currentUser?.role === 'socio') return;

        if (value === '') {
            recordWeeklyPayment(memberId, selectedYear, selectedMonth, week, 0, actionAlias);
            return;
        }
        const amount = parseFloat(value);
        if (!isNaN(amount)) {
            recordWeeklyPayment(memberId, selectedYear, selectedMonth, week, amount, actionAlias);
        }
    };

    const handleMonthlyFeeChange = (memberId: string, value: string, actionAlias?: string) => {
        // Prevent editing if user is socio
        if (currentUser?.role === 'socio') return;

        if (value === '') {
            recordMonthlyFee(memberId, selectedYear, selectedMonth, 0, actionAlias);
            return;
        }
        const amount = parseFloat(value);
        if (!isNaN(amount)) {
            recordMonthlyFee(memberId, selectedYear, selectedMonth, amount, actionAlias);
        }
    };

    // Keyboard Navigation Handler
    const handleKeyDown = (e: React.KeyboardEvent, rowIndex: number, colIndex: number) => {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Enter') {
            e.preventDefault();
            let nextRow = rowIndex;
            let nextCol = colIndex;

            if (e.key === 'ArrowUp') nextRow = Math.max(0, rowIndex - 1);
            if (e.key === 'ArrowDown') nextRow = Math.min(paymentRows.length - 1, rowIndex + 1);
            if (e.key === 'ArrowLeft') nextCol = Math.max(0, colIndex - 1);
            if (e.key === 'ArrowRight' || e.key === 'Enter') {
                if (colIndex === 5) { // Last column (Monthly Fee)
                    if (rowIndex < paymentRows.length - 1) {
                        nextRow++;
                        nextCol = 0; // First week of next row
                    }
                } else {
                    nextCol++;
                }
            }

            const nextInput = document.getElementById(`cell-${nextRow}-${nextCol}`);
            if (nextInput) {
                (nextInput as HTMLInputElement).focus();
                (nextInput as HTMLInputElement).select();
            }
        }
    };

    // Calculate totals
    const getRowTotal = (row: PaymentRow) => {
        let total = 0;
        for (let i = 1; i <= 5; i++) {
            total += getWeeklyAmount(row.memberId, i, row.actionAlias);
        }
        return total;
    };

    const getWeekTotal = (week: number) => {
        return paymentRows.reduce((acc, row) => acc + getWeeklyAmount(row.memberId, week, row.actionAlias), 0);
    };

    const getMonthlyFeeTotal = () => {
        return paymentRows.reduce((acc, row) => acc + getMonthlyFeeAmount(row.memberId, row.actionAlias), 0);
    };

    const getGrandTotal = () => {
        let total = 0;
        paymentRows.forEach(row => {
            total += getRowTotal(row);
            total += getMonthlyFeeAmount(row.memberId, row.actionAlias);
        });
        return total;
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-6 border-b border-slate-200/60">
                <div>
                    <h1 className="text-4xl font-bold text-slate-800 tracking-tight">Pagos Semanales</h1>
                    <p className="text-slate-500 mt-2 text-lg">Gestiona los pagos semanales y cuotas mensuales de cada acción.</p>
                </div>

                <div className="flex gap-4 items-center bg-white/80 backdrop-blur-sm p-2 rounded-2xl shadow-sm border border-slate-200/60">
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

                    <div className="w-px h-8 bg-slate-200" />

                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="px-4 py-2.5 bg-transparent border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-slate-700 font-semibold cursor-pointer hover:bg-slate-50 transition-colors appearance-none"
                    >
                        {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>
            </div>

            <Card className="overflow-hidden border-none shadow-xl shadow-slate-200/40 bg-white/50 backdrop-blur-xl rounded-3xl" padding="none">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-200/60">
                                <th className="px-6 py-5 text-slate-600 font-semibold text-sm uppercase tracking-wider sticky left-0 bg-gradient-to-r from-slate-50 to-slate-100/50 z-10">
                                    Socio / Acción
                                </th>
                                {[1, 2, 3, 4, 5].map(week => (
                                    <th key={week} className="px-4 py-5 text-center text-slate-600 font-semibold text-sm uppercase tracking-wider">
                                        Sem {week}
                                    </th>
                                ))}
                                <th className="px-4 py-5 text-center text-purple-600 font-semibold text-sm uppercase tracking-wider bg-purple-50/30">
                                    Cuota Mensual
                                </th>
                                <th className="px-4 py-5 text-right text-slate-800 font-bold text-sm uppercase tracking-wider bg-slate-100/50">
                                    Total
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paymentRows.map((row, rowIndex) => {
                                const rowTotal = getRowTotal(row);
                                const monthlyFee = getMonthlyFeeAmount(row.memberId, row.actionAlias);
                                const total = rowTotal + monthlyFee;

                                return (
                                    <motion.tr
                                        key={`${row.memberId}-${row.actionAlias || 'main'}`}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: rowIndex * 0.02 }}
                                        className="hover:bg-indigo-50/30 transition-all duration-200 group"
                                    >
                                        <td className="px-6 py-4 sticky left-0 bg-white group-hover:bg-indigo-50/30 transition-colors z-10">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 text-indigo-700 flex items-center justify-center font-bold text-xs shadow-sm">
                                                    {row.memberName.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-slate-700">{row.memberName}</div>
                                                    {row.actionAlias && (
                                                        <div className="text-xs text-purple-600 font-medium bg-purple-50 px-2 py-0.5 rounded-full inline-block mt-0.5">
                                                            {row.actionAlias}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>

                                        {[1, 2, 3, 4, 5].map((week, colIndex) => {
                                            const amount = getWeeklyAmount(row.memberId, week, row.actionAlias);
                                            return (
                                                <td key={week} className="px-2 py-3 text-center">
                                                    <div className="relative inline-block">
                                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">$</span>
                                                        <input
                                                            id={`cell-${rowIndex}-${colIndex}`}
                                                            type="number"
                                                            step="0.01"
                                                            value={amount || ''}
                                                            onChange={(e) => handleWeeklyChange(row.memberId, week, e.target.value, row.actionAlias)}
                                                            onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
                                                            className="w-20 pl-5 pr-2 py-2 text-center border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all bg-white hover:bg-slate-50 text-slate-700 font-medium"
                                                            placeholder="0"
                                                            disabled={currentUser?.role === 'socio'}
                                                        />
                                                    </div>
                                                </td>
                                            );
                                        })}

                                        <td className="px-2 py-3 text-center bg-purple-50/20">
                                            <div className="relative inline-block">
                                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">$</span>
                                                <input
                                                    id={`cell-${rowIndex}-5`}
                                                    type="number"
                                                    step="0.01"
                                                    value={monthlyFee || ''}
                                                    onChange={(e) => handleMonthlyFeeChange(row.memberId, e.target.value, row.actionAlias)}
                                                    onKeyDown={(e) => handleKeyDown(e, rowIndex, 5)}
                                                    className="w-20 pl-5 pr-2 py-2 text-center border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all bg-white hover:bg-purple-50 text-purple-700 font-medium"
                                                    placeholder="0"
                                                    disabled={currentUser?.role === 'socio'}
                                                />
                                            </div>
                                        </td>

                                        <td className="px-4 py-4 text-right bg-slate-50/50">
                                            <span className={clsx(
                                                "font-bold text-lg px-3 py-1 rounded-lg",
                                                total > 0 ? "text-emerald-700 bg-emerald-50" : "text-slate-400"
                                            )}>
                                                ${total.toFixed(2)}
                                            </span>
                                        </td>
                                    </motion.tr>
                                );
                            })}
                        </tbody>
                        <tfoot className="bg-gradient-to-r from-slate-100 to-slate-50 border-t-2 border-slate-300 font-bold text-slate-800">
                            <tr>
                                <td className="px-6 py-4 sticky left-0 bg-gradient-to-r from-slate-100 to-slate-50 z-10">
                                    <div className="flex items-center gap-2">
                                        <TrendingUp className="text-indigo-600" size={20} />
                                        <span>TOTALES</span>
                                    </div>
                                </td>
                                {[1, 2, 3, 4, 5].map(week => (
                                    <td key={week} className="px-4 py-4 text-center text-lg">
                                        ${getWeekTotal(week).toFixed(2)}
                                    </td>
                                ))}
                                <td className="px-4 py-4 text-center text-lg text-purple-700 bg-purple-50/30">
                                    ${getMonthlyFeeTotal().toFixed(2)}
                                </td>
                                <td className="px-4 py-4 text-right text-xl bg-slate-100/70">
                                    ${getGrandTotal().toFixed(2)}
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
