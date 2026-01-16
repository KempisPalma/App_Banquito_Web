import React, { useState, useEffect } from 'react';
import { useBanquito } from '../context/BanquitoContext';
import { Plus, DollarSign, TrendingUp, Clock, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import Modal from '../components/Modal';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { motion } from 'framer-motion';

const getTodayString = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const Loans: React.FC = () => {
    const { loans, members, addLoan, updateLoan, deleteLoan, addLoanPayment, updateLoanPayment, deleteLoanPayment, currentUser } = useBanquito();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingLoanId, setEditingLoanId] = useState<string | null>(null);
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [isEditingPayment, setIsEditingPayment] = useState(false);
    const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
    const [editingPaymentType, setEditingPaymentType] = useState<'principal' | 'interest' | null>(null);
    const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
    const [historyModalOpen, setHistoryModalOpen] = useState(false);
    const [selectedLoanHistory, setSelectedLoanHistory] = useState<typeof loans[0] | null>(null);

    const initialFormState = {
        borrowerType: 'member' as 'member' | 'external',
        memberId: '',
        actionAlias: '',
        clientName: '',
        amount: 0,
        interestRate: 10,
        startDate: getTodayString(),
        endDate: ''
    };

    const [formData, setFormData] = useState(initialFormState);

    const [paymentPrincipalAmount, setPaymentPrincipalAmount] = useState(0);
    const [paymentInterestAmount, setPaymentInterestAmount] = useState(0);
    const [paymentDate, setPaymentDate] = useState(getTodayString());
    const [loanFilter, setLoanFilter] = useState<'all' | 'pending' | 'paid' | 'due-soon'>('all');
    const [socioViewMode, setSocioViewMode] = useState<'my-loans' | 'all-loans'>('my-loans'); // For socio users
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [paymentToDelete, setPaymentToDelete] = useState<{ loanId: string; paymentId: string; amount: number } | null>(null);
    const [deleteLoanConfirmOpen, setDeleteLoanConfirmOpen] = useState(false);
    const [loanToDelete, setLoanToDelete] = useState<{ loanId: string; borrowerName: string; amount: number } | null>(null);



    // Auto-set interest based on borrower type
    useEffect(() => {
        if (formData.borrowerType === 'member') {
            setFormData(prev => ({ ...prev, interestRate: 10 }));
        } else {
            setFormData(prev => ({ ...prev, interestRate: 15 })); // Default for external
        }
    }, [formData.borrowerType]);

    // Reset action alias when member changes
    useEffect(() => {
        if (formData.borrowerType === 'member' && formData.memberId) {
            const member = members.find(m => m.id === formData.memberId);
            // If member has aliases but none selected (or invalid), select the first one by default if only 1 exists
            if (member?.aliases && member.aliases.length === 1) {
                setFormData(prev => ({ ...prev, actionAlias: member.aliases![0] }));
            } else if (!member?.aliases || member.aliases.length === 0) {
                setFormData(prev => ({ ...prev, actionAlias: '' }));
            }
            // If multiple aliases, we leave it empty or keep existing if valid, user must select
        } else {
            setFormData(prev => ({ ...prev, actionAlias: '' }));
        }
    }, [formData.memberId, formData.borrowerType, members]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Helper to convert input date (YYYY-MM-DD) to ISO string at Local Midnight
        // This prevents the "UTC Midnight = Previous Day Local" issue
        const toIsoDate = (dateStr: string) => {
            if (!dateStr) return '';
            // Append local midnight time so Date(...) constructs it in local time
            // Then toISOString() converts to UTC correctly
            return new Date(dateStr + 'T00:00:00').toISOString();
        };

        const startDateIso = toIsoDate(formData.startDate);
        const endDateIso = toIsoDate(formData.endDate);

        if (isEditMode && editingLoanId) {
            // Update existing loan
            updateLoan(editingLoanId, {
                borrowerType: formData.borrowerType,
                memberId: formData.borrowerType === 'member' ? formData.memberId : undefined,
                actionAlias: formData.borrowerType === 'member' ? formData.actionAlias : undefined,
                clientName: formData.borrowerType === 'external' ? formData.clientName : undefined,
                amount: Number(formData.amount),
                interestRate: Number(formData.interestRate),
                startDate: startDateIso,
                endDate: endDateIso
            });
        } else {
            // Create new loan
            const pendingInterest = Number(formData.amount) * (Number(formData.interestRate) / 100);
            addLoan({
                borrowerType: formData.borrowerType,
                memberId: formData.borrowerType === 'member' ? formData.memberId : undefined,
                actionAlias: formData.borrowerType === 'member' ? formData.actionAlias : undefined,
                clientName: formData.borrowerType === 'external' ? formData.clientName : undefined,
                amount: Number(formData.amount),
                interestRate: Number(formData.interestRate),
                startDate: startDateIso,
                endDate: endDateIso,
                status: 'active',
                payments: [],
                pendingPrincipal: formData.amount,
                pendingInterest: pendingInterest
            });
        }
        setIsModalOpen(false);
        setFormData(initialFormState);
    };

    const resetForm = () => {
        setFormData(initialFormState);
        setIsEditMode(false);
        setEditingLoanId(null);
    };

    const openEditModal = (loan: typeof loans[0]) => {
        // Helper to safely format any date string to YYYY-MM-DD for input
        const toInputDate = (dateStr: string) => {
            if (!dateStr) return '';
            // If already YYYY-MM-DD, return as is
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

            // Otherwise parse as date and return local YYYY-MM-DD
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return '';

            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        };

        // Calculate dynamic due date based on last principal payment
        // We use local date parts to avoid UTC timezone shifts
        let currentDueDateStr = toInputDate(loan.endDate);

        const principalPayments = loan.payments
            .filter(p => p.paymentType === 'principal')
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        if (principalPayments.length > 0) {
            // Parse the payment date string safely
            const lastPaymentDateStr = principalPayments[0].date;

            // Create a Local Date object to avoid UTC shift
            let lastPaymentDate: Date;
            if (lastPaymentDateStr.includes('T')) {
                lastPaymentDate = new Date(lastPaymentDateStr);
            } else {
                // If simple YYYY-MM-DD, manually construct local midnight
                const [y, m, d] = lastPaymentDateStr.split('-').map(Number);
                lastPaymentDate = new Date(y, m - 1, d);
            }

            // Create new date for calculation
            const nextDue = new Date(lastPaymentDate);
            nextDue.setMonth(nextDue.getMonth() + 1);

            // Format back to YYYY-MM-DD using Local getters
            currentDueDateStr = `${nextDue.getFullYear()}-${String(nextDue.getMonth() + 1).padStart(2, '0')}-${String(nextDue.getDate()).padStart(2, '0')}`;
        }

        setFormData({
            borrowerType: loan.borrowerType,
            memberId: loan.memberId || '',
            actionAlias: loan.actionAlias || '',
            clientName: loan.clientName || '',
            amount: loan.amount,
            interestRate: loan.interestRate,
            startDate: toInputDate(loan.startDate),
            endDate: currentDueDateStr
        });
        setEditingLoanId(loan.id);
        setIsEditMode(true);
        setIsModalOpen(true);
    };

    const handlePaymentSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validate that at least one amount is entered
        if (!selectedLoanId || (paymentPrincipalAmount <= 0 && paymentInterestAmount <= 0)) {
            return;
        }

        // Create date object
        // If the selected date is today, use the current time
        // If it's a past/future date, use midnight (local)
        let dateToSave: string;
        const todayStr = getTodayString();

        if (paymentDate === todayStr) {
            dateToSave = new Date().toISOString();
        } else {
            dateToSave = new Date(paymentDate + 'T00:00:00').toISOString();
        }

        // Register principal payment if amount > 0
        if (paymentPrincipalAmount > 0) {
            if (isEditingPayment && editingPaymentId) {
                updateLoanPayment(selectedLoanId, editingPaymentId, paymentPrincipalAmount, 'principal', dateToSave);
            } else {
                addLoanPayment(selectedLoanId, paymentPrincipalAmount, 'principal', dateToSave);
            }
        }

        // Register interest payment if amount > 0
        if (paymentInterestAmount > 0) {
            if (isEditingPayment && editingPaymentId) {
                // For editing, we only update one payment at a time
                // This logic might need adjustment based on your requirements
            } else {
                addLoanPayment(selectedLoanId, paymentInterestAmount, 'interest', dateToSave);
            }
        }

        setPaymentModalOpen(false);
        setPaymentPrincipalAmount(0);
        setPaymentInterestAmount(0);
        setPaymentDate(getTodayString());
        setIsEditingPayment(false);
        setEditingPaymentId(null);
        setSelectedLoanId(null);
    };

    const openPaymentModal = (loanId: string) => {
        setSelectedLoanId(loanId);
        setPaymentDate(getTodayString());
        setPaymentModalOpen(true);
    };

    /*
    const openEditPaymentModal = (loanId: string, payment: typeof loans[0]['payments'][0]) => {
        setSelectedLoanId(loanId);
        setEditingPaymentId(payment.id);
        setPaymentDate(payment.date.split('T')[0]);
    
        if (payment.paymentType === 'principal') {
            setPaymentPrincipalAmount(payment.amount);
            setPaymentInterestAmount(0);
        } else {
            setPaymentInterestAmount(payment.amount);
            setPaymentPrincipalAmount(0);
        }
    
        setIsEditingPayment(true);
        setPaymentModalOpen(true);
    };
    */

    const confirmDeletePayment = () => {
        if (paymentToDelete) {
            deleteLoanPayment(paymentToDelete.loanId, paymentToDelete.paymentId);
            setDeleteConfirmOpen(false);
            setPaymentToDelete(null);
        }
    };

    const handleDeleteLoan = (loanId: string, borrowerName: string, amount: number) => {
        setLoanToDelete({ loanId, borrowerName, amount });
        setDeleteLoanConfirmOpen(true);
    };

    const confirmDeleteLoan = () => {
        if (loanToDelete) {
            deleteLoan(loanToDelete.loanId);
            setDeleteLoanConfirmOpen(false);
            setLoanToDelete(null);
        }
    };

    const openHistoryModal = (loan: typeof loans[0]) => {
        setSelectedLoanHistory(loan);
        setHistoryModalOpen(true);
    };





    // Calculate compound interest for overdue loans
    const calculateTotalDue = (loan: typeof loans[0]) => {
        const totalPaid = loan.payments.reduce((acc, curr) => acc + curr.amount, 0);
        const now = new Date();
        const endDate = new Date(loan.endDate);
        // Base interest (always on original amount)
        const baseInterest = loan.amount * (loan.interestRate / 100);

        if (now <= endDate) {
            return {
                principal: loan.amount,
                baseInterest,
                overdueInterest: 0,
                totalInterest: baseInterest,
                totalDue: loan.amount + baseInterest,
                totalPaid,
                remaining: Math.max(0, loan.amount + baseInterest - totalPaid),
                monthsOverdue: 0,
                breakdown: []
            };
        }

        // Calculate overdue interest step-by-step
        let overdueInterest = 0;
        let breakdown = [];
        let currentDate = new Date(endDate);

        // Start checking strictly from the due date
        // If we are past the due date (now > endDate), the first period has started.
        // We iterate while the 'milestone' date is earlier than 'now'.
        // This effectively charges for every 'month started' after the due date.

        while (currentDate < now) {
            // Find payments made BEFORE OR ON this cutoff date
            // Note: If payment is made on the exact cutoff date, it reduces the principal for that period's calculation?
            // Usually, penalty is calculated on the OUTSTANDING balance at that moment.
            // If I pay on the day of renewal, typically that reduces the balance for the NEXT period.
            // But for the period just starting?
            // Let's stick to the user's logic: "con el capital que aun se debe".

            const paymentsUntilCutoff = loan.payments.filter(p =>
                p.paymentType === 'principal' && new Date(p.date) <= currentDate
            );
            const principalPaidAtCutoff = paymentsUntilCutoff.reduce((acc, p) => acc + p.amount, 0);
            const remainingPrincipalAtCutoff = Math.max(0, loan.amount - principalPaidAtCutoff);

            // If principal is fully paid, no more interest generated
            if (remainingPrincipalAtCutoff <= 0.01) break;

            const monthInterest = remainingPrincipalAtCutoff * (loan.interestRate / 100);
            overdueInterest += monthInterest;

            breakdown.push({
                date: new Date(currentDate), // Clone date
                principal: remainingPrincipalAtCutoff,
                interest: monthInterest
            });

            // Move to next month
            currentDate.setMonth(currentDate.getMonth() + 1);
        }

        const totalDue = loan.amount + baseInterest + overdueInterest;

        return {
            principal: loan.amount,
            baseInterest,
            overdueInterest,
            totalInterest: baseInterest + overdueInterest,
            totalDue,
            totalPaid,
            remaining: Math.max(0, totalDue - totalPaid),
            monthsOverdue: breakdown.length,
            breakdown
        };
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Préstamos</h1>
                    <p className="text-slate-500 mt-1">Gestiona préstamos, intereses y plazos.</p>
                </div>

                {/* Socio Toggle or New Loan Button */}
                {currentUser?.role === 'socio' ? (
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-slate-700">Vista:</span>
                        <div className="relative inline-flex bg-slate-100 p-1.5 rounded-xl shadow-inner">
                            {/* Sliding background indicator */}
                            <div
                                className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-slate-100/50 transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) ${socioViewMode === 'my-loans'
                                    ? 'left-1.5'
                                    : 'left-[calc(50%+0px)]'
                                    }`}
                            />
                            <button
                                onClick={() => setSocioViewMode('my-loans')}
                                className={`relative z-10 w-44 py-2.5 rounded-lg text-sm font-bold transition-colors duration-300 text-center flex items-center justify-center gap-2 ${socioViewMode === 'my-loans'
                                    ? 'text-indigo-600'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                Mis Préstamos
                            </button>
                            <button
                                onClick={() => setSocioViewMode('all-loans')}
                                className={`relative z-10 w-44 py-2.5 rounded-lg text-sm font-bold transition-colors duration-300 text-center flex items-center justify-center gap-2 ${socioViewMode === 'all-loans'
                                    ? 'text-indigo-600'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                Todos los Préstamos
                            </button>
                        </div>
                    </div>
                ) : (
                    <Button onClick={() => setIsModalOpen(true)} className="shadow-lg shadow-orange-500/20 bg-orange-600 hover:bg-orange-700 focus:ring-orange-500">
                        <Plus size={20} className="mr-2" />
                        Nuevo Préstamo
                    </Button>
                )}
            </div>

            {/* Filter Buttons */}
            <div className="flex gap-2 flex-wrap">
                <button
                    onClick={() => setLoanFilter('all')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${loanFilter === 'all'
                        ? 'bg-slate-900 text-white shadow-md'
                        : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                        }`}
                >
                    Todos ({loans.length})
                </button>
                <button
                    onClick={() => setLoanFilter('pending')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${loanFilter === 'pending'
                        ? 'bg-orange-600 text-white shadow-md'
                        : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                        }`}
                >
                    Pendientes ({loans.filter(l => l.status !== 'paid').length})
                </button>
                <button
                    onClick={() => setLoanFilter('paid')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${loanFilter === 'paid'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                        }`}
                >
                    Pagados ({loans.filter(l => l.status === 'paid').length})
                </button>
                <button
                    onClick={() => setLoanFilter('due-soon')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${loanFilter === 'due-soon'
                        ? 'bg-red-600 text-white shadow-md'
                        : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                        }`}
                >
                    Próximos a Vencer ({loans.filter(l => {
                        const daysUntilDue = Math.ceil((new Date(l.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                        return daysUntilDue > 0 && daysUntilDue <= 7 && l.status !== 'paid';
                    }).length})
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {loans.filter(loan => {
                    // Filter by loan status
                    if (loanFilter === 'all') return true;
                    if (loanFilter === 'paid') return loan.status === 'paid';
                    if (loanFilter === 'pending') return loan.status !== 'paid';
                    if (loanFilter === 'due-soon') {
                        const daysUntilDue = Math.ceil((new Date(loan.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                        return daysUntilDue > 0 && daysUntilDue <= 7 && loan.status !== 'paid';
                    }
                    return true;
                }).filter(loan => {
                    // Filter by member if user is 'socio'
                    if (currentUser?.role === 'socio') {
                        // If viewing "my loans", only show loans for this member
                        if (socioViewMode === 'my-loans') {
                            // Find the member associated with this loan
                            const borrower = members.find(m => m.id === loan.memberId);
                            // Compare the member's cedula with the current user's username (which is the cedula)
                            // Relaxed comparison to handle string/number differences
                            return loan.borrowerType === 'member' && borrower && String(borrower.cedula) === String(currentUser.username);
                        }
                        // If viewing "all loans", show all loans (no filter)
                        return true;
                    }
                    return true;
                }).sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
                    .map((loan, index) => {
                        const member = loan.borrowerType === 'member' ? members.find(m => m.id === loan.memberId) : null;
                        const borrowerName = loan.borrowerType === 'member' ? (member?.name || 'Socio Desconocido') : loan.clientName;

                        // Calculate Dynamic Due Date
                        const getNextDueDate = () => {
                            const principalPayments = loan.payments
                                .filter(p => p.paymentType === 'principal')
                                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                            // If there are capital payments, take the last one and add 1 month
                            if (principalPayments.length > 0) {
                                const lastPaymentDate = new Date(principalPayments[0].date);
                                // Add 1 month safely
                                const nextDue = new Date(lastPaymentDate);
                                nextDue.setMonth(nextDue.getMonth() + 1);
                                return nextDue;
                            }

                            // Default to original end date if no capital payments
                            return new Date(loan.endDate);
                        };

                        const nextDueDate = getNextDueDate();
                        const isOverdue = new Date() > nextDueDate && loan.status !== 'paid';
                        const calculations = calculateTotalDue(loan);
                        const progress = Math.min((calculations.totalPaid / calculations.totalDue) * 100, 100);


                        return (
                            <motion.div
                                key={loan.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className=""
                            >
                                <Card className="flex flex-col border-none shadow-lg shadow-slate-200/40 hover:shadow-xl hover:shadow-slate-300/50 transition-all duration-300 overflow-hidden group rounded-2xl" padding="none">
                                    <div className="p-4 flex-1">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <div className="flex items-center space-x-1.5">
                                                    <h3 className="font-bold text-base text-slate-800">{borrowerName}</h3>
                                                </div>
                                                {loan.actionAlias && (
                                                    <p className="text-xs text-indigo-600 font-bold mt-0.5">
                                                        {loan.actionAlias}
                                                    </p>
                                                )}
                                                <div className="flex flex-col mt-1 space-y-0.5">
                                                    <p className="text-[10px] flex items-center font-medium text-slate-400">
                                                        <Clock size={10} className="mr-1" />
                                                        Inicio: {new Date(loan.startDate).toLocaleDateString()}
                                                    </p>
                                                    <p className={`text-[10px] flex items-center font-medium ${isOverdue ? 'text-red-500' : 'text-slate-500'}`}>
                                                        <Clock size={10} className="mr-1" />
                                                        Vence: {nextDueDate.toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${Math.abs(calculations.totalPaid - calculations.totalDue) < 0.1 || calculations.totalPaid >= calculations.totalDue
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : 'bg-orange-100 text-orange-700'
                                                }`}>
                                                {Math.abs(calculations.totalPaid - calculations.totalDue) < 0.1 || calculations.totalPaid >= calculations.totalDue ? 'PAGADO' : 'ACTIVO'}
                                            </span>
                                        </div>

                                        <div className="space-y-2 mb-3">
                                            <div className="flex justify-between text-xs items-center p-2 rounded-lg bg-slate-50">
                                                <span className="text-slate-500 font-medium">Monto Prestado</span>
                                                <span className="font-bold text-slate-900 text-sm">${calculations.principal.toFixed(2)}</span>
                                            </div>

                                            <div className="flex justify-between text-xs items-center px-1.5 pt-1">
                                                <span className="text-slate-500 flex items-center font-medium">
                                                    <TrendingUp size={11} className="mr-1 text-orange-500" />
                                                    Interés Base ({loan.interestRate}%)
                                                </span>
                                                <span className="font-bold text-orange-600 text-xs py-0.5 px-1 bg-orange-50 rounded">
                                                    +${calculations.baseInterest.toFixed(2)}
                                                </span>
                                            </div>

                                            <div className="pt-2 border-t border-slate-100 flex justify-between items-end">
                                                <span className="text-xs text-slate-500 font-medium">Total a Pagar</span>
                                                <span className="text-lg font-bold text-slate-900">${calculations.remaining.toFixed(2)}</span>
                                            </div>
                                        </div>

                                        {/* Progress & Balances */}
                                        <div className="space-y-3 mb-2">
                                            <div className="flex justify-between text-[10px] uppercase font-bold text-slate-500">
                                                <span>Progreso</span>
                                                <div className="flex items-center gap-1">
                                                    <span className="text-slate-400 font-normal normal-case mr-1">
                                                        (${calculations.totalPaid.toFixed(2)} de ${calculations.totalDue.toFixed(2)})
                                                    </span>
                                                    <span className="text-emerald-600">{Math.round(progress)}%</span>
                                                </div>
                                            </div>
                                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                                <div
                                                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                                                    style={{ width: `${progress}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* View Details Button (Replaces inline history) */}
                                        <div className="mt-3">
                                            <button
                                                onClick={() => openHistoryModal(loan)}
                                                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                                            >
                                                <DollarSign size={14} />
                                                Ver Detalles y Pagos
                                            </button>
                                        </div>

                                    </div>

                                    <div className="bg-white border-t border-slate-100 px-3 py-3 mt-auto">
                                        <div className="flex items-center justify-between gap-2">
                                            {currentUser?.role !== 'socio' ? (
                                                <>
                                                    <button
                                                        onClick={() => openEditModal(loan)}
                                                        className="p-1.5 rounded-lg text-blue-600 bg-blue-50 border border-blue-100 hover:bg-blue-500 hover:text-white hover:shadow-md transition-all duration-300 transform active:scale-95"
                                                        title="Editar préstamo"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>

                                                    <button
                                                        onClick={() => openPaymentModal(loan.id)}
                                                        disabled={calculations.remaining <= 0.01}
                                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 group/btn disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none"
                                                        title={calculations.remaining <= 0.01 ? "Préstamo pagado" : "Registrar abono"}
                                                    >
                                                        <DollarSign size={16} className="group-hover/btn:rotate-12 transition-transform" />
                                                        <span>ABONAR</span>
                                                    </button>

                                                    <button
                                                        onClick={() => handleDeleteLoan(loan.id, borrowerName || '', loan.amount)}
                                                        className="p-1.5 rounded-lg text-rose-600 bg-rose-50 border border-rose-100 hover:bg-rose-500 hover:text-white hover:shadow-md transition-all duration-300 transform active:scale-95"
                                                        title="Eliminar préstamo"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </>
                                            ) : null}
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        );
                    })}
            </div>

            {/* New/Edit Loan Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    resetForm();
                }}
                title={isEditMode ? "Editar Préstamo" : "Nuevo Préstamo"}
            >
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Tipo de Deudor</label>
                        <div className="flex space-x-4">
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="radio"
                                    checked={formData.borrowerType === 'member'}
                                    onChange={() => setFormData({ ...formData, borrowerType: 'member' })}
                                    className="text-orange-600 focus:ring-orange-500"
                                />
                                <span>Socio</span>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="radio"
                                    checked={formData.borrowerType === 'external'}
                                    onChange={() => setFormData({ ...formData, borrowerType: 'external' })}
                                    className="text-orange-600 focus:ring-orange-500"
                                />
                                <span>Externo</span>
                            </label>
                        </div>
                    </div>

                    {formData.borrowerType === 'member' ? (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Socio</label>
                                <select
                                    required
                                    value={formData.memberId}
                                    onChange={(e) => setFormData({ ...formData, memberId: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                                >
                                    <option value="">Seleccionar Socio</option>
                                    {members.map(m => (
                                        <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                </select>
                            </div>
                            {formData.memberId && members.find(m => m.id === formData.memberId)?.aliases && (members.find(m => m.id === formData.memberId)?.aliases?.length || 0) > 1 && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Acción / Letra</label>
                                    <select
                                        required
                                        value={formData.actionAlias}
                                        onChange={(e) => setFormData({ ...formData, actionAlias: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                                    >
                                        <option value="">Seleccionar Acción</option>
                                        {members.find(m => m.id === formData.memberId)?.aliases?.map((alias, idx) => (
                                            <option key={idx} value={alias}>{alias}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </>
                    ) : (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Nombre del Cliente</label>
                            <input
                                type="text"
                                required
                                value={formData.clientName}
                                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                                placeholder="Ej. Cliente Externo"
                            />
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Monto ($)</label>
                            <input
                                type="number"
                                required
                                min="1"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.valueAsNumber })}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Interés (%)</label>
                            <input
                                type="number"
                                required
                                min="0"
                                value={formData.interestRate}
                                onChange={(e) => setFormData({ ...formData, interestRate: e.target.valueAsNumber })}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Fecha Inicio</label>
                            <input
                                type="date"
                                required
                                value={formData.startDate}
                                onChange={(e) => {
                                    const newStartDate = e.target.value;
                                    setFormData(prev => {
                                        // Only auto-update end date if it's NOT edit mode (fresh loan) 
                                        // OR if you want it to always update when start date changes?
                                        // Usually safer to always update IF the user explicitly changes start date.

                                        const start = new Date(newStartDate);
                                        const end = new Date(start);
                                        end.setMonth(end.getMonth() + 1);

                                        return {
                                            ...prev,
                                            startDate: newStartDate,
                                            endDate: end.toISOString().split('T')[0]
                                        };
                                    });
                                }}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Fecha Vencimiento</label>
                            <input
                                type="date"
                                required
                                value={formData.endDate}
                                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                        <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" className="bg-orange-600 hover:bg-orange-700">
                            {isEditMode ? 'Guardar Cambios' : 'Crear Préstamo'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Payment Modal */}
            <Modal
                isOpen={paymentModalOpen}
                onClose={() => {
                    setPaymentModalOpen(false);
                    setPaymentPrincipalAmount(0);
                    setPaymentInterestAmount(0);
                    setPaymentDate(getTodayString());
                    setIsEditingPayment(false);
                    setEditingPaymentId(null);
                    setEditingPaymentType(null);
                }}
                title={isEditingPayment ? `Editar Abono (${editingPaymentType === 'principal' ? 'Capital' : 'Interés'})` : "Registrar Abono"}
            >
                <form onSubmit={handlePaymentSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Fecha del Abono</label>
                        <input
                            type="date"
                            value={paymentDate}
                            onChange={(e) => setPaymentDate(e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                        />
                    </div>

                    <div className={isEditingPayment ? "" : "grid grid-cols-2 gap-4"}>
                        {(!isEditingPayment || editingPaymentType === 'principal') && (
                            <div>
                                <div className="flex justify-between mb-1.5 items-center">
                                    <label className="block text-sm font-medium text-slate-700">Capital ($)</label>
                                    {selectedLoanId && (() => {
                                        const loan = loans.find(l => l.id === selectedLoanId);
                                        if (!loan) return null;
                                        const paidPrincipal = loan.payments.filter(p => p.paymentType === 'principal').reduce((a, c) => a + c.amount, 0);
                                        const pendingPrincipal = Math.max(0, loan.amount - paidPrincipal);
                                        return (
                                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                                Debe: ${pendingPrincipal.toFixed(2)}
                                            </span>
                                        );
                                    })()}
                                </div>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={paymentPrincipalAmount || ''}
                                    onChange={(e) => setPaymentPrincipalAmount(e.target.value === '' ? 0 : Math.max(0, e.target.valueAsNumber))}
                                    onKeyDown={(e) => {
                                        if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                                            e.preventDefault();
                                        }
                                    }}
                                    placeholder="0.00"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                />
                                <p className="text-xs text-slate-500 mt-1">Pago al monto prestado</p>
                            </div>
                        )}

                        {(!isEditingPayment || editingPaymentType === 'interest') && (
                            <div>
                                <div className="flex justify-between mb-1.5 items-center">
                                    <label className="block text-sm font-medium text-slate-700">Interés ($)</label>
                                    {selectedLoanId && (() => {
                                        const loan = loans.find(l => l.id === selectedLoanId);
                                        if (!loan) return null;
                                        const calcs = calculateTotalDue(loan);
                                        const paidInterest = loan.payments.filter(p => p.paymentType === 'interest').reduce((a, c) => a + c.amount, 0);
                                        // Total interest due is baseInterest + overdueInterest (from calcs)
                                        const pendingInterest = Math.max(0, calcs.totalInterest - paidInterest);
                                        return (
                                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                                Debe: ${pendingInterest.toFixed(2)}
                                            </span>
                                        );
                                    })()}
                                </div>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={paymentInterestAmount || ''}
                                    onChange={(e) => setPaymentInterestAmount(e.target.value === '' ? 0 : Math.max(0, e.target.valueAsNumber))}
                                    onKeyDown={(e) => {
                                        if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                                            e.preventDefault();
                                        }
                                    }}
                                    placeholder="0.00"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                />
                                <p className="text-xs text-slate-500 mt-1">Pago a intereses</p>
                            </div>
                        )}


                    </div>

                    {(paymentPrincipalAmount <= 0 && paymentInterestAmount <= 0) && (
                        <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
                            Debe ingresar al menos un monto (Capital o Interés)
                        </p>
                    )}

                    <div className="flex justify-end space-x-3 pt-4">
                        <Button type="button" variant="ghost" onClick={() => setPaymentModalOpen(false)}>
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            className="bg-emerald-600 hover:bg-emerald-700"
                            disabled={paymentPrincipalAmount <= 0 && paymentInterestAmount <= 0}
                        >
                            {isEditingPayment ? 'Guardar Cambios' : 'Registrar Pago'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Delete Payment Confirmation Modal */}
            <Modal
                isOpen={deleteConfirmOpen}
                onClose={() => {
                    setDeleteConfirmOpen(false);
                    setPaymentToDelete(null);
                }}
                title=""
            >
                <div className="text-center py-4">
                    <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                        <AlertTriangle className="text-red-600" size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">¿Eliminar este pago?</h3>
                    <p className="text-slate-600 mb-1">Esta acción no se puede deshacer.</p>
                    {paymentToDelete && (
                        <div className="mt-4 p-4 bg-slate-50 rounded-xl">
                            <p className="text-sm text-slate-500">Monto del pago</p>
                            <p className="text-2xl font-bold text-slate-900">${paymentToDelete.amount.toFixed(2)}</p>
                        </div>
                    )}
                    <div className="flex gap-3 mt-6">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                                setDeleteConfirmOpen(false);
                                setPaymentToDelete(null);
                            }}
                            className="flex-1"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            onClick={confirmDeletePayment}
                            className="flex-1 bg-red-600 hover:bg-red-700"
                        >
                            Sí, Eliminar
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Delete Loan Confirmation Modal */}
            <Modal
                isOpen={deleteLoanConfirmOpen}
                onClose={() => {
                    setDeleteLoanConfirmOpen(false);
                    setLoanToDelete(null);
                }}
                title=""
            >
                <div className="text-center py-4">
                    <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                        <AlertTriangle className="text-red-600" size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">¿Eliminar este préstamo?</h3>
                    <p className="text-slate-600 mb-1">Esta acción no se puede deshacer.</p>
                    {loanToDelete && (
                        <div className="mt-4 p-4 bg-slate-50 rounded-xl">
                            <p className="text-sm text-slate-500">Préstamo de</p>
                            <p className="text-lg font-bold text-slate-900 mb-2">{loanToDelete.borrowerName}</p>
                            <p className="text-sm text-slate-500">Monto prestado</p>
                            <p className="text-2xl font-bold text-slate-900">${loanToDelete.amount.toFixed(2)}</p>
                        </div>
                    )}
                    <div className="flex gap-3 mt-6">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                                setDeleteLoanConfirmOpen(false);
                                setLoanToDelete(null);
                            }}
                            className="flex-1"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            onClick={confirmDeleteLoan}
                            className="flex-1 bg-red-600 hover:bg-red-700"
                        >
                            Sí, Eliminar
                        </Button>
                    </div>
                </div>
            </Modal>


            {/* History Modal */}
            <Modal
                isOpen={historyModalOpen}
                onClose={() => {
                    setHistoryModalOpen(false);
                    setSelectedLoanHistory(null);
                }}
                title="Historial de Pagos"
                maxWidth="max-w-2xl"
            >
                {selectedLoanHistory && (() => {
                    const member = selectedLoanHistory.borrowerType === 'member' ? members.find(m => m.id === selectedLoanHistory.memberId) : null;
                    const borrowerName = selectedLoanHistory.borrowerType === 'member' ? (member?.name || 'Socio Desconocido') : selectedLoanHistory.clientName;

                    // Re-calculate local check specifically for the modal
                    const getNextDueDate = () => {
                        const principalPayments = selectedLoanHistory.payments
                            .filter(p => p.paymentType === 'principal')
                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                        let baseDate;
                        if (principalPayments.length > 0) {
                            const lastPaymentDate = new Date(principalPayments[0].date);
                            baseDate = new Date(lastPaymentDate);
                            baseDate.setMonth(baseDate.getMonth() + 1);
                        } else {
                            baseDate = new Date(selectedLoanHistory.endDate);
                        }

                        // Auto-advance due date if it's in the past (Rolling Due Date)
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);

                        // While the due date is strictly in the past, move to the next month to show the NEXT deadline.
                        // Standard setMonth behavior handles day overflow automatically (e.g. Jan 30 + 1 month -> Mar 2 if non-leap year)
                        // This matches the user's request for "sumar los dias del mes anterior" in overflow cases.
                        while (baseDate < today) {
                            baseDate.setMonth(baseDate.getMonth() + 1);
                        }

                        return baseDate;
                    };

                    const nextDueDate = getNextDueDate();
                    const isOverdue = new Date() > nextDueDate && selectedLoanHistory.status !== 'paid';
                    const calculations = calculateTotalDue(selectedLoanHistory);

                    return (
                        <div className="space-y-6">
                            {/* Loan Header Card with Summary */}
                            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden">
                                {/* Decorative background elements */}
                                <div className="absolute top-0 right-0 p-4 opacity-5">
                                    <DollarSign size={100} className="text-indigo-900" />
                                </div>

                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="font-bold text-slate-800 text-xl leading-tight">{borrowerName}</h3>
                                            {selectedLoanHistory.actionAlias && (
                                                <p className="text-sm font-bold text-indigo-600 mt-0.5">{selectedLoanHistory.actionAlias}</p>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wide border shadow-sm ${calculations.remaining <= 0.01 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                isOverdue ? 'bg-red-50 text-red-700 border-red-100' :
                                                    'bg-blue-50 text-blue-700 border-blue-100'
                                                }`}>
                                                {calculations.remaining <= 0.01 ? 'Pagado' : isOverdue ? 'Vencido' : 'Activo'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Monto Original</p>
                                            <p className="text-lg font-black text-slate-900">${selectedLoanHistory.amount.toFixed(2)}</p>
                                        </div>
                                        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Total a Pagar</p>
                                            <p className="text-lg font-black text-slate-900">${calculations.remaining.toFixed(2)}</p>
                                        </div>
                                    </div>

                                    {/* Dates */}
                                    <div className="flex gap-4 text-xs text-slate-500 font-medium bg-white/50 p-2 rounded-lg inline-flex">
                                        <div className="flex items-center gap-1.5">
                                            <Clock size={12} className="text-slate-400" />
                                            <span>Inicio: {new Date(selectedLoanHistory.startDate).toLocaleDateString()}</span>
                                        </div>
                                        <div className="w-px h-4 bg-slate-300"></div>
                                        <div className="flex items-center gap-1.5">
                                            <Clock size={12} className={isOverdue ? "text-red-500" : "text-slate-400"} />
                                            <span className={isOverdue ? "text-red-600 font-bold" : ""}>
                                                Vence: {nextDueDate.toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="mt-4 pt-4 border-t border-slate-200/60">
                                        <div className="flex justify-between items-end mb-2">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Progreso</span>
                                            <div className="text-xs font-medium">
                                                <span className="text-slate-400 mr-1">
                                                    (${calculations.totalPaid.toFixed(2)} de ${calculations.totalDue.toFixed(2)})
                                                </span>
                                                <span className="text-emerald-600 font-bold">
                                                    {Math.round((calculations.totalPaid / calculations.totalDue) * 100)}%
                                                </span>
                                            </div>
                                        </div>
                                        <div className="h-2 bg-slate-200/50 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                                style={{ width: `${Math.min(100, Math.max(0, (calculations.totalPaid / calculations.totalDue) * 100))}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Breakdown Section */}
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1 flex items-center gap-2">
                                    <TrendingUp size={14} />
                                    Detalle Financiero
                                </h4>
                                <div className="bg-white border boundary-slate-100 rounded-xl overflow-hidden divide-y divide-slate-50">
                                    {/* Base Interest */}
                                    <div className="p-3 flex justify-between items-center hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center">
                                                <TrendingUp size={14} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-700">Interés Base</p>
                                                <p className="text-[10px] text-slate-400">Tasa fija del {selectedLoanHistory.interestRate}%</p>
                                            </div>
                                        </div>
                                        <p className="font-bold text-slate-900">+${calculations.baseInterest.toFixed(2)}</p>
                                    </div>

                                    {/* Overdue Interest Rows */}
                                    {calculations.breakdown.length > 0 ? (
                                        calculations.breakdown.map((item, idx) => (
                                            <div key={idx} className="p-3 flex justify-between items-center hover:bg-red-50/50 transition-colors bg-red-50/10">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center border border-red-200">
                                                        <AlertTriangle size={14} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-red-700">Mora Mes {idx + 1}</p>
                                                        <p className="text-[10px] text-red-500">
                                                            Calculado el {new Date(item.date).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-red-700">+${item.interest.toFixed(2)}</p>
                                                    <p className="text-[9px] text-red-400">sobre ${item.principal.toFixed(2)} pendientes</p>
                                                </div>
                                            </div>
                                        ))
                                    ) : null}


                                    {/* Total Footer */}
                                    <div className="p-3 bg-slate-50 flex justify-between items-center">
                                        <p className="text-xs font-bold text-slate-500 uppercase">Total Intereses</p>
                                        <p className="text-sm font-black text-slate-800">${(calculations.baseInterest + calculations.overdueInterest).toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Consolidated Transaction History */}
                            <div className="mt-6">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">Historial de Pagos y Abonos</h4>
                                <div className="max-h-[50vh] overflow-y-auto pr-1 space-y-2">
                                    {(() => {
                                        let runningBalance = selectedLoanHistory.amount + calculations.baseInterest;
                                        const rawTransactions = [
                                            ...selectedLoanHistory.payments.map(p => ({
                                                ...p,
                                                type: 'payment',
                                                dateObj: new Date(p.date),
                                            })),
                                            ...(calculations.breakdown || []).map((b: any) => ({
                                                id: `int-${new Date(b.date).getTime()}`,
                                                type: 'charge',
                                                paymentType: 'interest_charge',
                                                amount: b.interest,
                                                date: b.date,
                                                dateObj: new Date(b.date)
                                            }))
                                        ].sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

                                        const transactionsWithBalance = rawTransactions.map(t => {
                                            if (t.type === 'charge') {
                                                runningBalance += t.amount;
                                            } else {
                                                runningBalance -= t.amount;
                                            }
                                            return { ...t, postBalance: Math.max(0, runningBalance) };
                                        });

                                        const displayTransactions = transactionsWithBalance
                                            .filter(t => t.type === 'payment')
                                            .sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());

                                        if (displayTransactions.length === 0) {
                                            return (
                                                <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                                    <p className="text-sm text-slate-400 font-medium">No hay pagos registrados</p>
                                                </div>
                                            );
                                        }

                                        return displayTransactions.map((item) => (
                                            <div key={item.id} className="flex justify-between items-center p-3 border rounded-xl transition-all group bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${item.paymentType === 'principal' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-purple-50 text-purple-600 border-purple-100'}`}>
                                                        <DollarSign size={14} strokeWidth={2.5} />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm text-slate-800">
                                                            ${item.amount.toFixed(2)}
                                                        </p>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-[9px] font-bold px-1.5 py-px rounded-md uppercase tracking-wide ${item.paymentType === 'principal' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                                                {item.paymentType === 'principal' ? 'Abono Capital' : 'Abono Interés'}
                                                            </span>
                                                            <span className="text-[10px] text-slate-400">
                                                                {item.dateObj.toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4">
                                                    <div className="text-right">
                                                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Restante</p>
                                                        <p className="font-bold text-slate-600 text-sm">${item.postBalance.toFixed(2)}</p>
                                                    </div>

                                                    {currentUser?.role !== 'socio' && (
                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white shadow-sm border border-slate-100 rounded-lg p-0.5">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedLoanId(selectedLoanHistory.id);
                                                                    setEditingPaymentId(item.id);
                                                                    setPaymentPrincipalAmount(item.amount);
                                                                    setPaymentDate(item.dateObj.toISOString().split('T')[0]);
                                                                    setIsEditingPayment(true);
                                                                    setPaymentModalOpen(true);
                                                                }}
                                                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                                                title="Editar pago"
                                                            >
                                                                <Edit2 size={14} />
                                                            </button>
                                                            <div className="w-px h-3 bg-slate-200" />
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setPaymentToDelete({
                                                                        loanId: selectedLoanHistory.id,
                                                                        paymentId: item.id,
                                                                        amount: item.amount
                                                                    });
                                                                    setDeleteConfirmOpen(true);
                                                                }}
                                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                                title="Eliminar pago"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ));
                                    })()}
                                </div>
                            </div>
                        </div>
                    );
                })()}
            </Modal >
        </div >
    );
};

export default Loans;
