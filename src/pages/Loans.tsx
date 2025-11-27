import React, { useState, useEffect } from 'react';
import { useBanquito } from '../context/BanquitoContext';
import { Plus, DollarSign, TrendingUp, Clock, Edit2, Trash2, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import Modal from '../components/Modal';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { motion } from 'framer-motion';

const Loans: React.FC = () => {
    const { loans, members, addLoan, updateLoan, deleteLoan, addLoanPayment, updateLoanPayment, deleteLoanPayment, currentUser } = useBanquito();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingLoanId, setEditingLoanId] = useState<string | null>(null);
    const [expandedLoanIds, setExpandedLoanIds] = useState<Set<string>>(new Set());
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [isEditingPayment, setIsEditingPayment] = useState(false);
    const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
    const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        borrowerType: 'member' as 'member' | 'external',
        memberId: '',
        actionAlias: '',
        clientName: '',
        amount: 0,
        interestRate: 10,
        startDate: new Date().toISOString().split('T')[0],
        endDate: ''
    });

    const [paymentPrincipalAmount, setPaymentPrincipalAmount] = useState(0);
    const [paymentInterestAmount, setPaymentInterestAmount] = useState(0);
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [loanFilter, setLoanFilter] = useState<'all' | 'pending' | 'paid' | 'due-soon'>('all');
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [paymentToDelete, setPaymentToDelete] = useState<{ loanId: string; paymentId: string; amount: number } | null>(null);
    const [deleteLoanConfirmOpen, setDeleteLoanConfirmOpen] = useState(false);
    const [loanToDelete, setLoanToDelete] = useState<{ loanId: string; borrowerName: string; amount: number } | null>(null);

    // Auto-calculate end date (1 month)
    useEffect(() => {
        if (formData.startDate) {
            const start = new Date(formData.startDate);
            const end = new Date(start);
            end.setMonth(end.getMonth() + 1);
            setFormData(prev => ({ ...prev, endDate: end.toISOString().split('T')[0] }));
        }
    }, [formData.startDate]);

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
        if (isEditMode && editingLoanId) {
            // Update existing loan
            updateLoan(editingLoanId, {
                borrowerType: formData.borrowerType,
                memberId: formData.borrowerType === 'member' ? formData.memberId : undefined,
                actionAlias: formData.borrowerType === 'member' ? formData.actionAlias : undefined,
                clientName: formData.borrowerType === 'external' ? formData.clientName : undefined,
                amount: Number(formData.amount),
                interestRate: Number(formData.interestRate),
                startDate: formData.startDate,
                endDate: formData.endDate
            });
        } else {
            // Create new loan
            addLoan({
                borrowerType: formData.borrowerType,
                memberId: formData.borrowerType === 'member' ? formData.memberId : undefined,
                actionAlias: formData.borrowerType === 'member' ? formData.actionAlias : undefined,
                clientName: formData.borrowerType === 'external' ? formData.clientName : undefined,
                amount: Number(formData.amount),
                interestRate: Number(formData.interestRate),
                startDate: formData.startDate,
                endDate: formData.endDate,
                status: 'active',
                payments: []
            });
        }
        setIsModalOpen(false);
        resetForm();
    };

    const resetForm = () => {
        setFormData({
            borrowerType: 'member',
            memberId: '',
            actionAlias: '',
            clientName: '',
            amount: 0,
            interestRate: 10,
            startDate: new Date().toISOString().split('T')[0],
            endDate: ''
        });
        setIsEditMode(false);
        setEditingLoanId(null);
    };

    const openEditModal = (loan: typeof loans[0]) => {
        setFormData({
            borrowerType: loan.borrowerType,
            memberId: loan.memberId || '',
            actionAlias: loan.actionAlias || '',
            clientName: loan.clientName || '',
            amount: loan.amount,
            interestRate: loan.interestRate,
            startDate: loan.startDate,
            endDate: loan.endDate
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

        // Create date object from selected date, treating it as local time
        const dateToSave = new Date(paymentDate + 'T00:00:00').toISOString();

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
        setPaymentDate(new Date().toISOString().split('T')[0]);
        setIsEditingPayment(false);
        setEditingPaymentId(null);
        setSelectedLoanId(null);
    };

    const openPaymentModal = (loanId: string) => {
        setSelectedLoanId(loanId);
        setPaymentDate(new Date().toISOString().split('T')[0]);
        setPaymentModalOpen(true);
    };

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

    const handleDeletePayment = (loanId: string, paymentId: string, paymentAmount: number) => {
        setPaymentToDelete({ loanId, paymentId, amount: paymentAmount });
        setDeleteConfirmOpen(true);
    };

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

    // Calculate compound interest for overdue loans
    const calculateTotalDue = (loan: typeof loans[0]) => {
        const totalPaid = loan.payments.reduce((acc, curr) => acc + curr.amount, 0);
        const now = new Date();
        const endDate = new Date(loan.endDate);

        if (now <= endDate || loan.status === 'paid') {
            // Not overdue or already paid - simple interest
            const interestAmount = loan.amount * (loan.interestRate / 100);
            return {
                principal: loan.amount,
                baseInterest: interestAmount,
                overdueInterest: 0,
                totalInterest: interestAmount,
                totalDue: loan.amount + interestAmount,
                totalPaid,
                remaining: Math.max(0, loan.amount + interestAmount - totalPaid),
                monthsOverdue: 0
            };
        }

        // Calculate months overdue
        const monthsOverdue = Math.floor((now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24 * 30));

        // Base interest (original)
        const baseInterest = loan.amount * (loan.interestRate / 100);
        const totalWithBaseInterest = loan.amount + baseInterest;

        // Calculate remaining balance after payments
        const remainingAfterPayments = Math.max(0, totalWithBaseInterest - totalPaid);

        // Compound interest on remaining balance for each month overdue
        let overdueInterest = 0;
        let currentBalance = remainingAfterPayments;

        for (let i = 0; i < monthsOverdue; i++) {
            const monthInterest = currentBalance * (loan.interestRate / 100);
            overdueInterest += monthInterest;
            currentBalance += monthInterest;
        }

        const totalDue = totalWithBaseInterest + overdueInterest;

        return {
            principal: loan.amount,
            baseInterest,
            overdueInterest,
            totalInterest: baseInterest + overdueInterest,
            totalDue,
            totalPaid,
            remaining: Math.max(0, totalDue - totalPaid),
            monthsOverdue
        };
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Préstamos</h1>
                    <p className="text-slate-500 mt-1">Gestiona préstamos, intereses y plazos.</p>
                </div>
                {currentUser?.role !== 'socio' && (
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                    if (currentUser?.role === 'socio' && currentUser.memberId) {
                        return loan.borrowerType === 'member' && loan.memberId === currentUser.memberId;
                    }
                    return true;
                }).map((loan, index) => {
                    const member = loan.borrowerType === 'member' ? members.find(m => m.id === loan.memberId) : null;
                    const borrowerName = loan.borrowerType === 'member' ? (member?.name || 'Socio Desconocido') : loan.clientName;

                    const isOverdue = new Date() > new Date(loan.endDate) && loan.status !== 'paid';
                    const calculations = calculateTotalDue(loan);
                    const progress = Math.min((calculations.totalPaid / calculations.totalDue) * 100, 100);
                    const isExpanded = expandedLoanIds.has(loan.id);

                    const toggleExpanded = () => {
                        const newSet = new Set(expandedLoanIds);
                        if (newSet.has(loan.id)) {
                            newSet.delete(loan.id);
                        } else {
                            newSet.add(loan.id);
                        }
                        setExpandedLoanIds(newSet);
                    };

                    return (
                        <motion.div
                            key={loan.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <Card className="h-full flex flex-col border-none shadow-xl shadow-slate-200/50 overflow-hidden group" padding="none">
                                <div className="p-6 flex-1">
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <div className="flex items-center space-x-2">
                                                <h3 className="font-bold text-xl text-slate-800">{borrowerName}</h3>
                                            </div>
                                            {loan.actionAlias && (
                                                <p className="text-sm text-indigo-600 font-bold mt-0.5">
                                                    {loan.actionAlias}
                                                </p>
                                            )}
                                            <div className="flex flex-col mt-2 space-y-1">
                                                <p className={`text-xs flex items-center font-medium ${isOverdue ? 'text-red-500' : 'text-slate-500'}`}>
                                                    <Clock size={12} className="mr-1.5" />
                                                    Vence: {new Date(loan.endDate).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide flex items-center ${loan.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                                            isOverdue ? 'bg-red-100 text-red-700' :
                                                'bg-orange-100 text-orange-700'
                                            }`}>
                                            {loan.status === 'paid' ? 'Pagado' : isOverdue ? 'Vencido' : 'Activo'}
                                        </span>
                                    </div>

                                    <div className="space-y-4 mb-6">
                                        <div className="flex justify-between text-sm items-center p-3 rounded-xl bg-slate-50">
                                            <span className="text-slate-500 font-medium">Monto Prestado</span>
                                            <span className="font-bold text-slate-900 text-lg">${calculations.principal.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm items-center px-2">
                                            <span className="text-slate-500 flex items-center">
                                                <TrendingUp size={14} className="mr-1.5" />
                                                Interés Base ({loan.interestRate}%)
                                            </span>
                                            <span className="font-bold text-orange-600">+${calculations.baseInterest.toFixed(2)}</span>
                                        </div>
                                        {isOverdue && calculations.overdueInterest > 0 && (
                                            <div className="flex justify-between text-sm items-center px-2">
                                                <span className="text-red-500 flex items-center font-medium">
                                                    <TrendingUp size={14} className="mr-1.5" />
                                                    Interés Mora ({calculations.monthsOverdue} {calculations.monthsOverdue === 1 ? 'mes' : 'meses'})
                                                </span>
                                                <span className="font-bold text-red-600">+${calculations.overdueInterest.toFixed(2)}</span>
                                            </div>
                                        )}
                                        <div className="pt-3 border-t border-slate-100 flex justify-between items-end">
                                            <span className="text-sm text-slate-500 font-medium">Total a Pagar</span>
                                            <span className="text-2xl font-bold text-slate-900">${calculations.totalDue.toFixed(2)}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs font-medium text-slate-500">
                                            <span>Pagado: <span className="text-emerald-600">${calculations.totalPaid.toFixed(2)}</span></span>
                                            <span>Restante: <span className="text-orange-600">${calculations.remaining.toFixed(2)}</span></span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                            <motion.div
                                                className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-full rounded-full"
                                                initial={{ width: 0 }}
                                                animate={{ width: `${progress}%` }}
                                                transition={{ duration: 1, ease: "easeOut" }}
                                            />
                                        </div>
                                    </div>

                                    {/* Payment History */}
                                    {loan.payments.length > 0 && (
                                        <div className="mt-4 pt-4 border-t border-slate-100">
                                            <button
                                                onClick={toggleExpanded}
                                                className="flex items-center justify-between w-full text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
                                            >
                                                <span className="flex items-center">
                                                    <DollarSign size={14} className="mr-1.5" />
                                                    Historial de Pagos ({loan.payments.length})
                                                </span>
                                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                            </button>
                                            {isExpanded && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="mt-3 space-y-2 max-h-40 overflow-y-auto"
                                                >
                                                    {loan.payments.map((payment) => (
                                                        <div key={payment.id} className="group/payment flex justify-between items-center text-xs bg-slate-50 hover:bg-slate-100 p-2 rounded-lg transition-colors relative">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-slate-500">
                                                                    {new Date(payment.date).toLocaleDateString()}
                                                                </span>
                                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${payment.paymentType === 'principal'
                                                                    ? 'bg-blue-100 text-blue-700'
                                                                    : 'bg-purple-100 text-purple-700'
                                                                    }`}>
                                                                    {payment.paymentType === 'principal' ? 'Capital' : 'Interés'}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-emerald-600">
                                                                    ${payment.amount.toFixed(2)}
                                                                </span>
                                                                <div className="opacity-0 group-hover/payment:opacity-100 transition-opacity flex gap-1">
                                                                    <button
                                                                        onClick={() => openEditPaymentModal(loan.id, payment)}
                                                                        className="p-1 rounded hover:bg-blue-100 text-blue-600 transition-colors"
                                                                        title="Editar pago"
                                                                    >
                                                                        <Edit2 size={12} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeletePayment(loan.id, payment.id, payment.amount)}
                                                                        className="p-1 rounded hover:bg-red-100 text-red-600 transition-colors"
                                                                        title="Eliminar pago"
                                                                    >
                                                                        <Trash2 size={12} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </motion.div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="bg-white border-t border-slate-100 px-6 py-3">
                                    <div className="flex items-center justify-end gap-2">
                                        {currentUser?.role !== 'socio' && (
                                            <>
                                                <button
                                                    onClick={() => openEditModal(loan)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 hover:border-blue-300 transition-all hover:shadow-sm"
                                                    title="Editar préstamo"
                                                >
                                                    <Edit2 size={14} />
                                                    <span>Editar</span>
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteLoan(loan.id, borrowerName || '', loan.amount)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 hover:border-red-300 transition-all hover:shadow-sm"
                                                    title="Eliminar préstamo"
                                                >
                                                    <Trash2 size={14} />
                                                    <span>Eliminar</span>
                                                </button>
                                            </>
                                        )}
                                        <button
                                            onClick={() => openPaymentModal(loan.id)}
                                            disabled={loan.status === 'paid'}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 hover:border-emerald-300 transition-all hover:shadow-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-emerald-50"
                                            title="Registrar abono"
                                        >
                                            <DollarSign size={14} />
                                            <span>Abonar</span>
                                        </button>
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
                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
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
                    setPaymentDate(new Date().toISOString().split('T')[0]);
                    setIsEditingPayment(false);
                    setEditingPaymentId(null);
                }}
                title={isEditingPayment ? "Editar Abono" : "Registrar Abono"}
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

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Capital ($)</label>
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

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Interés ($)</label>
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
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                            />
                            <p className="text-xs text-slate-500 mt-1">Pago a intereses</p>
                        </div>
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
        </div>
    );
};

export default Loans;
