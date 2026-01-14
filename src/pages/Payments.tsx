import React, { useState, useEffect } from 'react';
import { useBanquito } from '../context/BanquitoContext';
import { Card } from '../components/ui/Card';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { Calendar, TrendingUp, Users, User } from 'lucide-react';

// Type for each row in the payment table
type PaymentRow = {
    memberId: string;
    memberName: string;
    actionAlias?: string; // undefined means no specific action
    displayName: string; // What to show in the table
};

const Payments: React.FC = () => {
    const { members, weeklyPayments, monthlyFees, recordWeeklyPayment, recordMonthlyFee, currentUser } = useBanquito();

    // Initialize from localStorage - TRUST THE STORED VALUE INITIALLY
    const getInitialMonth = () => {
        if (currentUser?.id) {
            const saved = localStorage.getItem(`payments_selected_month_${currentUser.id}`);
            return saved !== null ? parseInt(saved) : new Date().getMonth();
        }
        return new Date().getMonth();
    };

    const getInitialYear = () => {
        if (currentUser?.id) {
            const saved = localStorage.getItem(`payments_selected_year_${currentUser.id}`);
            return saved !== null ? parseInt(saved) : new Date().getFullYear();
        }
        return new Date().getFullYear();
    };

    const getInitialMemberId = () => {
        if (currentUser?.id) {
            const saved = localStorage.getItem(`payments_selected_member_${currentUser.id}`);
            return saved || '';
        }
        return '';
    };

    const getInitialActionAlias = () => {
        if (currentUser?.id) {
            const saved = localStorage.getItem(`payments_selected_action_${currentUser.id}`);
            return saved || '';
        }
        return '';
    };

    const getInitialViewMode = (): 'all' | 'individual' => {
        if (currentUser?.id) {
            const saved = localStorage.getItem(`payments_view_mode_${currentUser.id}`);
            return (saved === 'individual' ? 'individual' : 'all');
        }
        return 'all';
    };

    // State
    const [viewMode, setViewMode] = useState<'all' | 'individual'>(getInitialViewMode);
    const [selectedMemberId, setSelectedMemberId] = useState<string>(getInitialMemberId);
    const [selectedActionAlias, setSelectedActionAlias] = useState<string>(getInitialActionAlias);
    const [selectedMonth, setSelectedMonth] = useState(getInitialMonth);
    const [selectedYear, setSelectedYear] = useState(getInitialYear);

    // Persist state
    useEffect(() => {
        if (currentUser?.id) {
            localStorage.setItem(`payments_selected_month_${currentUser.id}`, selectedMonth.toString());
            localStorage.setItem(`payments_selected_year_${currentUser.id}`, selectedYear.toString());
            // Only overwrite if we have a value or if we are sure we want to clear it (e.g. explicit clear).
            // But for now, let's just save whatever is in state.
            // The issue before was that state initialized to empty because of the validation check.
            // Now state initializes to the saved value, so we are safe to save it back.
            localStorage.setItem(`payments_selected_member_${currentUser.id}`, selectedMemberId);
            localStorage.setItem(`payments_selected_action_${currentUser.id}`, selectedActionAlias);
            localStorage.setItem(`payments_view_mode_${currentUser.id}`, viewMode);
        }
    }, [selectedMonth, selectedYear, selectedMemberId, selectedActionAlias, viewMode, currentUser]);

    const months = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    // Colors for months - Softer/Pastel palette with border colors included
    const monthClasses = [
        "bg-slate-50 text-slate-700 border-slate-300",         // Enero
        "bg-pink-50 text-pink-700 border-pink-200",           // Febrero
        "bg-violet-50 text-violet-700 border-violet-200",     // Marzo
        "bg-indigo-50 text-indigo-700 border-indigo-200",     // Abril
        "bg-cyan-50 text-cyan-700 border-cyan-200",           // Mayo
        "bg-teal-50 text-teal-700 border-teal-200",           // Junio
        "bg-emerald-50 text-emerald-700 border-emerald-200",   // Julio
        "bg-lime-50 text-lime-700 border-lime-200",           // Agosto
        "bg-amber-50 text-amber-700 border-amber-200",         // Septiembre
        "bg-orange-50 text-orange-700 border-orange-200",     // Octubre
        "bg-red-50 text-red-700 border-red-200",               // Noviembre
        "bg-rose-50 text-rose-700 border-rose-200"              // Diciembre
    ];

    // Filter Logic
    const isSocio = currentUser?.role === 'socio';

    // Find the current member object for socio
    const currentMember = isSocio && currentUser.username
        ? members.find(m => String(m.cedula) === String(currentUser.username))
        : null;

    // Persist/Initialize Action Selection for Socio
    useEffect(() => {
        if (isSocio && currentMember?.aliases && currentMember.aliases.length > 0 && !selectedActionAlias) {
            // Default to first action if none selected
            setSelectedActionAlias(currentMember.aliases[0]);
        }
    }, [isSocio, currentMember, selectedActionAlias]);


    let filteredMembers = isSocio && currentMember
        ? [currentMember]
        : members;

    if (viewMode === 'individual' && selectedMemberId && !isSocio) {
        filteredMembers = members.filter(m => m.id === selectedMemberId);
    }

    // Generate rows
    const paymentRows: PaymentRow[] = filteredMembers.flatMap(member => {
        if (member.aliases && member.aliases.length > 0) {
            let aliasesToShow = member.aliases;

            // Filter by selected action for BOTH socio and admin (if individual view selected)
            if ((isSocio || viewMode === 'individual') && selectedActionAlias) {
                aliasesToShow = member.aliases.filter(alias => alias === selectedActionAlias);
            }

            return aliasesToShow.map(alias => ({
                memberId: member.id,
                memberName: member.name,
                actionAlias: alias,
                displayName: `${member.name} / ${alias}`
            }));
        } else {
            return [{
                memberId: member.id,
                memberName: member.name,
                actionAlias: '',
                displayName: member.name
            }];
        }
    }) as PaymentRow[];

    // Helpers
    const getWeeklyAmount = (memberId: string, year: number, month: number, week: number, actionAlias?: string) => {
        const payment = weeklyPayments.find(p =>
            p.memberId === memberId &&
            p.year === year &&
            p.month === month &&
            p.week === week &&
            p.actionAlias === actionAlias
        );
        return payment ? payment.amount : 0;
    };

    const getMonthlyFeeAmount = (memberId: string, year: number, month: number, actionAlias?: string) => {
        const fee = monthlyFees.find(f =>
            f.memberId === memberId &&
            f.year === year &&
            f.month === month &&
            f.actionAlias === actionAlias
        );
        return fee ? fee.amount : 0;
    };

    const handleWeeklyChange = (memberId: string, year: number, month: number, week: number, value: string, actionAlias?: string) => {
        if (isSocio) return;
        if (value === '') {
            recordWeeklyPayment(memberId, year, month, week, 0, actionAlias);
            return;
        }
        const amount = parseFloat(value);
        if (!isNaN(amount)) {
            recordWeeklyPayment(memberId, year, month, week, amount, actionAlias);
        }
    };

    const handleMonthlyFeeChange = (memberId: string, year: number, month: number, value: string, actionAlias?: string) => {
        if (isSocio) return;
        if (value === '') {
            recordMonthlyFee(memberId, year, month, 0, actionAlias);
            return;
        }
        const amount = parseFloat(value);
        if (!isNaN(amount)) {
            recordMonthlyFee(memberId, year, month, amount, actionAlias);
        }
    };

    // Keyboard Interaction
    const handleKeyDown = (e: React.KeyboardEvent, rowIndex: number, colIndex: number, maxRows: number) => {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(e.key)) {
            e.preventDefault();
            let nextRow = rowIndex;
            let nextCol = colIndex;

            if (e.key === 'ArrowUp') nextRow = Math.max(0, rowIndex - 1);
            if (e.key === 'ArrowDown') nextRow = Math.min(maxRows - 1, rowIndex + 1);
            if (e.key === 'ArrowLeft') nextCol = Math.max(0, colIndex - 1);
            if (e.key === 'ArrowRight' || e.key === 'Enter') {
                if (colIndex === 5) { // Last col
                    if (rowIndex < maxRows - 1) {
                        nextRow++;
                        nextCol = 0;
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


    // Totals Calculations
    const getWeekTotal = (week: number) => {
        return paymentRows.reduce((acc, row) => acc + getWeeklyAmount(row.memberId, selectedYear, selectedMonth, week, row.actionAlias), 0);
    };

    const getMonthlyFeeTotal = () => {
        return paymentRows.reduce((acc, row) => acc + getMonthlyFeeAmount(row.memberId, selectedYear, selectedMonth, row.actionAlias), 0);
    };

    const getGrandTotal = () => {
        let total = 0;
        paymentRows.forEach(row => {
            for (let w = 1; w <= 5; w++) total += getWeeklyAmount(row.memberId, selectedYear, selectedMonth, w, row.actionAlias);
            total += getMonthlyFeeAmount(row.memberId, selectedYear, selectedMonth, row.actionAlias);
        });
        return total;
    };

    // Render Logic
    // Only show placeholder if we have confirmed members list AND specific member is missing
    const showPlaceholder = viewMode === 'individual' && !isSocio && (!selectedMemberId || (members.length > 0 && !members.some(m => m.id === selectedMemberId)));
    const showAnnualView = isSocio || (viewMode === 'individual' && !showPlaceholder);
    const showMonthlyView = !isSocio && viewMode === 'all';

    return (
        <div className="space-y-6">
            <div className="sticky top-0 z-20 bg-gradient-to-b from-slate-50 via-slate-50 to-slate-50/95 backdrop-blur-md pb-4 pt-3">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
                            {isSocio ? `Hola, ${currentMember?.name || 'Socio'}` : 'Pagos Semanales'}
                        </h1>
                        <p className="text-slate-500 mt-1 text-sm">
                            {isSocio
                                ? 'Consulta tu historial de pagos del año.'
                                : 'Gestiona los pagos semanales y cuotas mensuales de cada acción.'}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3 items-center">
                        {/* Action Selector for Socio */}
                        {isSocio && currentMember?.aliases && currentMember.aliases.length > 0 && (
                            <div className="bg-white/80 backdrop-blur-sm p-1.5 rounded-xl shadow-sm border border-slate-200/60">
                                <select
                                    value={selectedActionAlias}
                                    onChange={(e) => setSelectedActionAlias(e.target.value)}
                                    className="px-3 py-2 bg-transparent border-none rounded-lg focus:ring-2 focus:ring-indigo-500/20 text-slate-700 text-sm font-semibold cursor-pointer hover:bg-slate-50 transition-colors appearance-none min-w-[150px]"
                                >
                                    {currentMember.aliases.map(alias => (
                                        <option key={alias} value={alias}>{alias}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="flex gap-3 items-center bg-white/80 backdrop-blur-sm p-1.5 rounded-xl shadow-sm border border-slate-200/60">
                            {/* Month Selector: Only for Admin in 'All' view */}
                            {showMonthlyView && (
                                <>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                                            <Calendar className="h-3.5 w-3.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                        </div>
                                        <select
                                            value={selectedMonth}
                                            onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                            className="pl-8 pr-6 py-2 bg-transparent border-none rounded-lg focus:ring-2 focus:ring-indigo-500/20 text-slate-700 text-sm font-semibold cursor-pointer hover:bg-slate-50 transition-colors appearance-none"
                                        >
                                            {months.map((month, index) => (
                                                <option key={index} value={index}>{month}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="w-px h-6 bg-slate-200" />
                                </>
                            )}

                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(Number(e.target.value))}
                                className="px-3 py-2 bg-transparent border-none rounded-lg focus:ring-2 focus:ring-indigo-500/20 text-slate-700 text-sm font-semibold cursor-pointer hover:bg-slate-50 transition-colors appearance-none"
                            >
                                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* View Switcher for Admins */}
                {!isSocio && (
                    <div className="mt-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                        <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm p-1 rounded-xl shadow-sm border border-slate-200/60">
                            <button
                                onClick={() => setViewMode('all')}
                                className={clsx(
                                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                                    viewMode === 'all'
                                        ? "bg-indigo-500 text-white shadow-md"
                                        : "text-slate-600 hover:bg-slate-100"
                                )}
                            >
                                <Users size={16} />
                                <span>Todos los Socios</span>
                            </button>
                            <button
                                onClick={() => setViewMode('individual')}
                                className={clsx(
                                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                                    viewMode === 'individual'
                                        ? "bg-indigo-500 text-white shadow-md"
                                        : "text-slate-600 hover:bg-slate-100"
                                )}
                            >
                                <User size={16} />
                                <span>Socio Individual</span>
                            </button>
                        </div>

                        {viewMode === 'individual' && (
                            <select
                                value={`${selectedMemberId}|${selectedActionAlias}`}
                                onChange={(e) => {
                                    const [memberId, actionAlias] = e.target.value.split('|');
                                    setSelectedMemberId(memberId);
                                    setSelectedActionAlias(actionAlias === 'undefined' ? '' : actionAlias);
                                }}
                                className="px-4 py-2 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200/60 text-slate-700 text-sm font-medium cursor-pointer hover:bg-white transition-colors"
                            >
                                <option value="">Seleccionar Socio...</option>
                                {members.flatMap(member => {
                                    if (member.aliases && member.aliases.length > 0) {
                                        return member.aliases.map(alias => (
                                            <option key={`${member.id}-${alias}`} value={`${member.id}|${alias}`}>
                                                {member.name} - {alias}
                                            </option>
                                        ));
                                    } else {
                                        return (
                                            <option key={member.id} value={`${member.id}|`}>
                                                {member.name}
                                            </option>
                                        );
                                    }
                                })}
                            </select>
                        )}
                    </div>
                )}
            </div>

            {/* Content Area */}
            {showPlaceholder && (
                <Card className="p-12">
                    <div className="text-center">
                        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                            <User size={40} className="text-indigo-600" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">
                            Selecciona un Socio
                        </h3>
                        <p className="text-slate-500">
                            Elige un socio del menú desplegable para ver y registrar sus pagos del año.
                        </p>
                    </div>
                </Card>
            )}

            {showAnnualView && (
                <>
                    {/* Annual View (12 Months) - Used for Socio AND Admin Individual Mode */}
                    <div className="bg-white/50 backdrop-blur-xl rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-200/60">
                                        <th className="px-4 py-3 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                                            Mes
                                        </th>
                                        {[1, 2, 3, 4, 5].map(week => (
                                            <th key={week} className="px-3 py-3 text-center text-slate-600 font-semibold text-xs uppercase tracking-wider">
                                                Sem {week}
                                            </th>
                                        ))}
                                        <th className="px-3 py-3 text-center text-purple-600 font-semibold text-xs uppercase tracking-wider bg-purple-50/30">
                                            Rifa
                                        </th>
                                        <th className="px-3 py-3 text-right text-slate-800 font-bold text-xs uppercase tracking-wider bg-slate-100/50">
                                            Total
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {months.map((monthName, monthIndex) => {
                                        // Use the first filtered row (specific member/action)
                                        const row = paymentRows[0];
                                        if (!row) return null;

                                        const weeklyAmounts = [1, 2, 3, 4, 5].map(week => getWeeklyAmount(row.memberId, selectedYear, monthIndex, week, row.actionAlias));
                                        const monthlyFee = getMonthlyFeeAmount(row.memberId, selectedYear, monthIndex, row.actionAlias);
                                        const monthTotal = weeklyAmounts.reduce((a, b) => a + b, 0) + monthlyFee;

                                        return (
                                            <motion.tr
                                                key={monthIndex}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ delay: monthIndex * 0.03 }}
                                                className="hover:bg-indigo-50/30 transition-all duration-200 group"
                                            >
                                                <td className={`px-4 py-2.5 font-bold text-sm border-l-4 ${monthClasses[monthIndex]}`}>
                                                    {monthName}
                                                </td>
                                                {weeklyAmounts.map((amount, weekIndex) => {
                                                    const weekNum = weekIndex + 1;
                                                    // Display logic for inputs
                                                    let inputClasses = "w-16 pl-4 pr-1.5 py-1.5 text-center text-sm border rounded-xl focus:ring-2 transition-all font-medium ";
                                                    if (amount === 0 || !amount) {
                                                        inputClasses += "border-slate-200 bg-white hover:bg-slate-50 text-slate-700 focus:ring-indigo-500/30 focus:border-indigo-500";
                                                    } else if (amount >= 1 && amount < 7) {
                                                        inputClasses += "border-amber-300 bg-amber-50/50 hover:bg-amber-50 text-amber-900 focus:ring-amber-500/30 focus:border-amber-500";
                                                    } else if (amount === 7) {
                                                        inputClasses += "border-emerald-300 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-900 focus:ring-emerald-500/30 focus:border-emerald-500";
                                                    } else {
                                                        inputClasses += "border-rose-300 bg-rose-50/50 hover:bg-rose-50 text-rose-900 focus:ring-rose-500/30 focus:border-rose-500";
                                                    }

                                                    return (
                                                        <td key={weekIndex} className="px-2 py-2 text-center">
                                                            <div className="relative inline-block">
                                                                <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none">$</span>
                                                                <input
                                                                    id={`cell-${monthIndex}-${weekIndex}`} // row=month, col=week-1
                                                                    type="number"
                                                                    step="0.01"
                                                                    value={amount || ''}
                                                                    onChange={(e) => handleWeeklyChange(row.memberId, selectedYear, monthIndex, weekNum, e.target.value, row.actionAlias)}
                                                                    onKeyDown={(e) => handleKeyDown(e, monthIndex, weekIndex, 12)}
                                                                    onInput={(e) => {
                                                                        const input = e.target as HTMLInputElement;
                                                                        input.value = input.value.replace(/[^0-9.]/g, '');
                                                                    }}
                                                                    className={inputClasses}
                                                                    placeholder="0"
                                                                    disabled={isSocio}
                                                                />
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                                <td className="px-2 py-2 text-center bg-purple-50/20">
                                                    <div className="relative inline-block">
                                                        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none">$</span>
                                                        <input
                                                            id={`cell-${monthIndex}-5`}
                                                            type="number"
                                                            step="0.01"
                                                            value={monthlyFee || ''}
                                                            onChange={(e) => handleMonthlyFeeChange(row.memberId, selectedYear, monthIndex, e.target.value, row.actionAlias)}
                                                            onKeyDown={(e) => handleKeyDown(e, monthIndex, 5, 12)}
                                                            onInput={(e) => {
                                                                const input = e.target as HTMLInputElement;
                                                                input.value = input.value.replace(/[^0-9.]/g, '');
                                                            }}
                                                            className="w-16 pl-4 pr-1.5 py-1.5 text-sm text-center border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all bg-white hover:bg-purple-50 text-purple-700 font-medium disabled:opacity-75 disabled:bg-slate-50"
                                                            placeholder="0"
                                                            disabled={isSocio}
                                                        />
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2.5 text-right bg-slate-50/50">
                                                    <span className={clsx(
                                                        "font-bold text-sm px-2 py-0.5 rounded-lg",
                                                        monthTotal > 0 ? "text-emerald-700 bg-emerald-50" : "text-slate-400"
                                                    )}>
                                                        ${monthTotal.toFixed(2)}
                                                    </span>
                                                </td>
                                            </motion.tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {showMonthlyView && (
                <>
                    {/* Admin Monthly View (All Members, 1 Month) */}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
                        {/* Weekly Totals */}
                        {[1, 2, 3, 4, 5].map(week => (
                            <motion.div
                                key={week}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: week * 0.05 }}
                                className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-xl p-3 border border-indigo-200/50 shadow-sm hover:shadow-md transition-all"
                            >
                                <div className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wider mb-0.5">
                                    Sem {week}
                                </div>
                                <div className="text-lg font-black text-indigo-900">
                                    ${getWeekTotal(week).toFixed(2)}
                                </div>
                            </motion.div>
                        ))}

                        {/* Monthly Fee */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="bg-gradient-to-br from-purple-50 to-fuchsia-100/50 rounded-xl p-3 border border-purple-200/50 shadow-sm hover:shadow-md transition-all"
                        >
                            <div className="text-[10px] font-semibold text-purple-600 uppercase tracking-wider mb-0.5">
                                Rifa Mensual
                            </div>
                            <div className="text-lg font-black text-purple-900">
                                ${getMonthlyFeeTotal().toFixed(2)}
                            </div>
                        </motion.div>

                        {/* Grand Total */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.35 }}
                            className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl p-3 border border-emerald-200/50 shadow-md hover:shadow-lg transition-all col-span-2 md:col-span-1"
                        >
                            <div className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                                <TrendingUp size={10} />
                                Total General
                            </div>
                            <div className="text-lg font-black text-emerald-900">
                                ${getGrandTotal().toFixed(2)}
                            </div>
                        </motion.div>
                    </div>

                    <Card className="overflow-hidden border-none shadow-lg shadow-slate-200/40 bg-white/50 backdrop-blur-xl rounded-2xl" padding="none">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-200/60">
                                        <th className="px-4 py-3 text-slate-600 font-semibold text-xs uppercase tracking-wider sticky left-0 bg-gradient-to-r from-slate-50 to-slate-100/50 z-10">
                                            Socio / Acción
                                        </th>
                                        {[1, 2, 3, 4, 5].map(week => (
                                            <th key={week} className="px-3 py-3 text-center text-slate-600 font-semibold text-xs uppercase tracking-wider">
                                                Sem {week}
                                            </th>
                                        ))}
                                        <th className="px-3 py-3 text-center text-purple-600 font-semibold text-xs uppercase tracking-wider bg-purple-50/30">
                                            Rifa Mensual
                                        </th>
                                        <th className="px-3 py-3 text-right text-slate-800 font-bold text-xs uppercase tracking-wider bg-slate-100/50">
                                            Total
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {paymentRows.map((row, rowIndex) => {
                                        // Row total calc needs to match week/month
                                        let rowTotal = 0;
                                        for (let w = 1; w <= 5; w++) rowTotal += getWeeklyAmount(row.memberId, selectedYear, selectedMonth, w, row.actionAlias);
                                        rowTotal += getMonthlyFeeAmount(row.memberId, selectedYear, selectedMonth, row.actionAlias);

                                        return (
                                            <motion.tr
                                                key={`${row.memberId}-${row.actionAlias || 'main'}`}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ delay: rowIndex * 0.02 }}
                                                className="hover:bg-indigo-50/30 transition-all duration-200 group"
                                            >
                                                <td className="px-4 py-2.5 sticky left-0 bg-white group-hover:bg-indigo-50/30 transition-colors z-10">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 text-indigo-700 flex items-center justify-center font-bold text-[10px] shadow-sm">
                                                            {row.memberName.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-slate-700 text-sm">{row.memberName}</div>
                                                            {row.actionAlias && (
                                                                <div className="text-[10px] text-purple-600 font-medium bg-purple-50 px-1.5 py-0.5 rounded-full inline-block mt-0.5">
                                                                    {row.actionAlias}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>

                                                {[1, 2, 3, 4, 5].map((week, colIndex) => {
                                                    const amount = getWeeklyAmount(row.memberId, selectedYear, selectedMonth, week, row.actionAlias);

                                                    let inputClasses = "w-16 pl-4 pr-1.5 py-1.5 text-center text-sm border rounded-xl focus:ring-2 transition-all font-medium ";
                                                    if (amount === 0 || !amount) {
                                                        inputClasses += "border-slate-200 bg-white hover:bg-slate-50 text-slate-700 focus:ring-indigo-500/30 focus:border-indigo-500";
                                                    } else if (amount >= 1 && amount < 7) {
                                                        inputClasses += "border-amber-300 bg-amber-50/50 hover:bg-amber-50 text-amber-900 focus:ring-amber-500/30 focus:border-amber-500";
                                                    } else if (amount === 7) {
                                                        inputClasses += "border-emerald-300 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-900 focus:ring-emerald-500/30 focus:border-emerald-500";
                                                    } else {
                                                        inputClasses += "border-rose-300 bg-rose-50/50 hover:bg-rose-50 text-rose-900 focus:ring-rose-500/30 focus:border-rose-500";
                                                    }

                                                    return (
                                                        <td key={week} className="px-2 py-2 text-center">
                                                            <div className="relative inline-block">
                                                                <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none">$</span>
                                                                <input
                                                                    id={`cell-${rowIndex}-${colIndex}`}
                                                                    type="number"
                                                                    step="0.01"
                                                                    value={amount || ''}
                                                                    onChange={(e) => handleWeeklyChange(row.memberId, selectedYear, selectedMonth, week, e.target.value, row.actionAlias)}
                                                                    onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex, paymentRows.length)}
                                                                    onInput={(e) => {
                                                                        const input = e.target as HTMLInputElement;
                                                                        input.value = input.value.replace(/[^0-9.]/g, '');
                                                                    }}
                                                                    className={inputClasses}
                                                                    placeholder="0"
                                                                />
                                                            </div>
                                                        </td>
                                                    );
                                                })}

                                                <td className="px-2 py-2 text-center bg-purple-50/20">
                                                    <div className="relative inline-block">
                                                        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none">$</span>
                                                        <input
                                                            id={`cell-${rowIndex}-5`}
                                                            type="number"
                                                            step="0.01"
                                                            value={getMonthlyFeeAmount(row.memberId, selectedYear, selectedMonth, row.actionAlias) || ''}
                                                            onChange={(e) => handleMonthlyFeeChange(row.memberId, selectedYear, selectedMonth, e.target.value, row.actionAlias)}
                                                            onKeyDown={(e) => handleKeyDown(e, rowIndex, 5, paymentRows.length)}
                                                            onInput={(e) => {
                                                                const input = e.target as HTMLInputElement;
                                                                input.value = input.value.replace(/[^0-9.]/g, '');
                                                            }}
                                                            className="w-16 pl-4 pr-1.5 py-1.5 text-sm text-center border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all bg-white hover:bg-purple-50 text-purple-700 font-medium"
                                                            placeholder="0"
                                                        />
                                                    </div>
                                                </td>

                                                <td className="px-3 py-2.5 text-right bg-slate-50/50">
                                                    <span className={clsx(
                                                        "font-bold text-sm px-2 py-0.5 rounded-lg",
                                                        rowTotal > 0 ? "text-emerald-700 bg-emerald-50" : "text-slate-400"
                                                    )}>
                                                        ${rowTotal.toFixed(2)}
                                                    </span>
                                                </td>
                                            </motion.tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </>
            )}
        </div>
    );
};

export default Payments;
