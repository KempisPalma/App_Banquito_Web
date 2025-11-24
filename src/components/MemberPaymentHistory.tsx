import React, { useState, useMemo } from 'react';
import type { Member, WeeklyPayment, MonthlyFee } from '../types';
import { Check, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';

interface MemberPaymentHistoryProps {
    member: Member;
    year: number;
    weeklyPayments: WeeklyPayment[];
    monthlyFees: MonthlyFee[];
    initialAction?: string;
}

const MONTHS = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export const MemberPaymentHistory: React.FC<MemberPaymentHistoryProps> = ({
    member,
    year,
    weeklyPayments,
    monthlyFees,
    initialAction
}) => {
    const [selectedAction, setSelectedAction] = useState<string>(
        initialAction || (member.aliases && member.aliases.length > 0 ? member.aliases[0] : 'default')
    );

    // Filter data for the specific member, year, and action
    const filteredPayments = useMemo(() => {
        return weeklyPayments.filter(p =>
            p.memberId === member.id &&
            p.year === year &&
            (member.aliases?.length ? p.actionAlias === selectedAction : true)
        );
    }, [weeklyPayments, member.id, year, selectedAction, member.aliases]);

    const filteredFees = useMemo(() => {
        return monthlyFees.filter(f =>
            f.memberId === member.id &&
            f.year === year &&
            (member.aliases?.length ? f.actionAlias === selectedAction : true)
        );
    }, [monthlyFees, member.id, year, selectedAction, member.aliases]);

    // Calculate totals
    const totalWeeklyPaid = filteredPayments.reduce((acc, curr) => acc + curr.amount, 0);
    const totalFeesPaid = filteredFees.reduce((acc, curr) => acc + curr.amount, 0);
    const totalPaid = totalWeeklyPaid + totalFeesPaid;

    // Helper to check payment status
    const getPaymentStatus = (monthIndex: number, week: number) => {
        const payment = filteredPayments.find(p => p.month === monthIndex && p.week === week);
        return payment ? { paid: true, amount: payment.amount } : { paid: false, amount: 0 };
    };

    const getFeeStatus = (monthIndex: number) => {
        const fee = filteredFees.find(f => f.month === monthIndex);
        return fee ? { paid: true, amount: fee.amount } : { paid: false, amount: 0 };
    };

    return (
        <div className="space-y-6">
            {/* Header / Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                <div>
                    <h3 className="text-lg font-bold text-slate-800">Historial de Pagos {year}</h3>
                    <p className="text-sm text-slate-500">Detalle mensual de aportaciones y rifas</p>
                </div>

                {member.aliases && member.aliases.length > 0 && (
                    <div className="relative">
                        <select
                            value={selectedAction}
                            onChange={(e) => setSelectedAction(e.target.value)}
                            className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 py-2 pl-4 pr-10 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer hover:bg-slate-100 transition-colors"
                        >
                            {member.aliases.map(alias => (
                                <option key={alias} value={alias}>{alias}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                    </div>
                )}
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 text-white shadow-lg shadow-blue-500/20">
                    <p className="text-blue-100 text-xs font-medium mb-1">Total Aportaciones</p>
                    <p className="text-2xl font-bold">${totalWeeklyPaid.toFixed(2)}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-4 text-white shadow-lg shadow-purple-500/20">
                    <p className="text-purple-100 text-xs font-medium mb-1">Total Rifas</p>
                    <p className="text-2xl font-bold">${totalFeesPaid.toFixed(2)}</p>
                </div>
                <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl p-4 text-white shadow-lg shadow-slate-500/20">
                    <p className="text-slate-300 text-xs font-medium mb-1">Gran Total</p>
                    <p className="text-2xl font-bold">${totalPaid.toFixed(2)}</p>
                </div>
            </div>

            {/* Detailed Table */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 bg-white">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-4 py-3 text-left font-semibold text-slate-600 w-32">Mes</th>
                                {[1, 2, 3, 4, 5].map(week => (
                                    <th key={week} className="px-2 py-3 text-center font-semibold text-slate-500">
                                        Sem {week}
                                    </th>
                                ))}
                                <th className="px-4 py-3 text-center font-semibold text-purple-600 bg-purple-50/50">
                                    Rifa
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {MONTHS.map((monthName, monthIndex) => {
                                const feeStatus = getFeeStatus(monthIndex);

                                return (
                                    <motion.tr
                                        key={monthName}
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: monthIndex * 0.03 }}
                                        className="hover:bg-slate-50/50 transition-colors"
                                    >
                                        <td className="px-4 py-3 font-medium text-slate-700 bg-slate-50/30">
                                            {monthName}
                                        </td>

                                        {[1, 2, 3, 4, 5].map(week => {
                                            const status = getPaymentStatus(monthIndex, week);
                                            return (
                                                <td key={week} className="px-2 py-2 text-center">
                                                    <div className={`
                                                        mx-auto w-10 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all duration-300
                                                        ${status.paid
                                                            ? 'bg-emerald-100 text-emerald-700 shadow-sm shadow-emerald-200'
                                                            : 'bg-slate-100 text-slate-300'
                                                        }
                                                    `}>
                                                        {status.paid ? (
                                                            <span>${status.amount}</span>
                                                        ) : (
                                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                                        )}
                                                    </div>
                                                </td>
                                            );
                                        })}

                                        <td className="px-4 py-2 text-center bg-purple-50/10">
                                            <div className={`
                                                mx-auto px-3 py-1.5 rounded-full text-xs font-bold inline-flex items-center gap-1.5
                                                ${feeStatus.paid
                                                    ? 'bg-purple-100 text-purple-700 shadow-sm shadow-purple-200'
                                                    : 'bg-red-50 text-red-300 border border-red-100'
                                                }
                                            `}>
                                                {feeStatus.paid ? (
                                                    <>
                                                        <Check size={12} strokeWidth={3} />
                                                        ${feeStatus.amount}
                                                    </>
                                                ) : (
                                                    <span className="text-[10px] uppercase tracking-wider">Pend</span>
                                                )}
                                            </div>
                                        </td>
                                    </motion.tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
