import React, { useState, useEffect } from 'react';
import { useBanquito } from '../context/BanquitoContext';
import { Plus, DollarSign, TrendingUp, Clock, Edit2, Trash2, AlertTriangle, ChevronRight } from 'lucide-react';
import Modal from '../components/Modal';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { motion } from 'framer-motion';

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
        startDate: new Date().toISOString().split('T')[0],
        endDate: ''
    };

    const [formData, setFormData] = useState(initialFormState);

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
                payments: [],
                pendingPrincipal: formData.amount,
                pendingInterest: 0
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

    const handleEditPaymentFromHistory = (loanId: string, payment: typeof loans[0]['payments'][0]) => {
        setHistoryModalOpen(false);
        setSelectedLoanId(loanId);
        setEditingPaymentId(payment.id);
        setIsEditingPayment(true);
        setPaymentDate(payment.date.split('T')[0]);
        setEditingPaymentType(payment.paymentType as 'principal' | 'interest');

        if (payment.paymentType === 'principal') {
            setPaymentPrincipalAmount(payment.amount);
            setPaymentInterestAmount(0);
        } else {
            setPaymentInterestAmount(payment.amount);
            setPaymentPrincipalAmount(0);
        }

        setPaymentModalOpen(true);
    };

    const handleDeletePaymentFromHistory = (loanId: string, paymentId: string, amount: number) => {
        // setHistoryModalOpen(false); // Optional: keep history open? No, confirmation modal will overlay
        setPaymentToDelete({ loanId, paymentId, amount });
        setDeleteConfirmOpen(true);
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
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


                    return (
                        <motion.div
                            key={loan.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="h-full"
                        >
                            <Card className="h-full flex flex-col border-none shadow-lg shadow-slate-200/40 hover:shadow-xl hover:shadow-slate-300/50 transition-all duration-300 overflow-hidden group rounded-2xl" padding="none">
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
                                                <p className={`text-[10px] flex items-center font-medium ${isOverdue ? 'text-red-500' : 'text-slate-500'}`}>
                                                    <Clock size={10} className="mr-1" />
                                                    Vence: {new Date(loan.endDate).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide flex items-center ${loan.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                                            isOverdue ? 'bg-red-100 text-red-700' :
                                                'bg-orange-100 text-orange-700'
                                            }`}>
                                            {loan.status === 'paid' ? 'Pagado' : isOverdue ? 'Vencido' : 'Activo'}
                                        </span>
                                    </div>

                                    <div className="space-y-2 mb-3">
                                        <div className="flex justify-between text-xs items-center p-2 rounded-lg bg-slate-50">
                                            <span className="text-slate-500 font-medium">Monto Prestado</span>
                                            <span className="font-bold text-slate-900 text-sm">${calculations.principal.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-xs items-center px-1.5">
                                            <span className="text-slate-500 flex items-center">
                                                <TrendingUp size={11} className="mr-1" />
                                                Interés Base ({loan.interestRate}%)
                                            </span>
                                            <span className="font-bold text-orange-600 text-xs">+${calculations.baseInterest.toFixed(2)}</span>
                                        </div>
                                        {isOverdue && calculations.overdueInterest > 0 && (
                                            <div className="flex justify-between text-xs items-center px-1.5">
                                                <span className="text-red-500 flex items-center font-medium">
                                                    <TrendingUp size={11} className="mr-1" />
                                                    Interés Mora ({calculations.monthsOverdue} {calculations.monthsOverdue === 1 ? 'mes' : 'meses'})
                                                </span>
                                                <span className="font-bold text-red-600 text-xs">+${calculations.overdueInterest.toFixed(2)}</span>
                                            </div>
                                        )}
                                        <div className="pt-2 border-t border-slate-100 flex justify-between items-end">
                                            <span className="text-xs text-slate-500 font-medium">Total a Pagar</span>
                                            <span className="text-lg font-bold text-slate-900">${calculations.totalDue.toFixed(2)}</span>
                                        </div>
                                    </div>

                                    {/* Progress & Balances */}
                                    <div className="space-y-3 mb-4">
                                        <div className="flex justify-between text-[10px] uppercase font-bold text-slate-500">
                                            <span>Progreso</span>
                                            <span className="text-emerald-600">{Math.round(progress)}%</span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                            <div
                                                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>

                                        {/* New Detailed Balances */}
                                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                                            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                                <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Capital Pendiente</p>
                                                <p className="text-sm font-bold text-slate-700">
                                                    ${(loan.pendingPrincipal ?? calculations.remaining).toFixed(2)}
                                                </p>
                                            </div>
                                            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                                <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Interés Pendiente</p>
                                                <p className="text-sm font-bold text-slate-700">
                                                    ${(loan.pendingInterest ?? 0).toFixed(2)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Payment History Summary */}
                                    {loan.payments.length > 0 && (
                                        <div className="mt-2 pt-2 border-t border-slate-100">
                                            <button
                                                onClick={() => openHistoryModal(loan)}
                                                className="flex items-center justify-between w-full text-xs font-medium text-slate-700 hover:text-slate-900 transition-colors group/hist"
                                            >
                                                <span className="flex items-center whitespace-nowrap text-[10px]">
                                                    <DollarSign size={11} className="mr-1" />
                                                    Historial de Pagos ({loan.payments.length})
                                                </span>
                                                <div className="flex items-center gap-1 text-blue-600 opacity-0 group-hover/hist:opacity-100 transition-opacity whitespace-nowrap ml-2">
                                                    <span className="text-[10px]">Ver detalle</span>
                                                    <ChevronRight size={12} />
                                                </div>
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="bg-white border-t border-slate-100 px-3 py-3 mt-auto">
                                    <div className="flex items-center justify-between gap-2">
                                        {currentUser?.role !== 'socio' ? (
                                            <button
                                                onClick={() => openEditModal(loan)}
                                                className="p-1.5 rounded-lg text-blue-600 bg-blue-50 border border-blue-100 hover:bg-blue-500 hover:text-white hover:shadow-md transition-all duration-300 transform active:scale-95"
                                                title="Editar préstamo"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                        ) : <div className="w-8"></div>}

                                        <button
                                            onClick={() => openPaymentModal(loan.id)}
                                            disabled={loan.status === 'paid'}
                                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 group/btn disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none"
                                            title="Registrar abono"
                                        >
                                            <DollarSign size={16} className="group-hover/btn:rotate-12 transition-transform" />
                                            <span>ABONAR</span>
                                        </button>

                                        {currentUser?.role !== 'socio' ? (
                                            <button
                                                onClick={() => handleDeleteLoan(loan.id, borrowerName || '', loan.amount)}
                                                className="p-1.5 rounded-lg text-rose-600 bg-rose-50 border border-rose-100 hover:bg-rose-500 hover:text-white hover:shadow-md transition-all duration-300 transform active:scale-95"
                                                title="Eliminar préstamo"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        ) : <div className="w-8"></div>}
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
                        )}

                        {(!isEditingPayment || editingPaymentType === 'interest') && (
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
            >
                {selectedLoanHistory && (() => {
                    const member = selectedLoanHistory.borrowerType === 'member' ? members.find(m => m.id === selectedLoanHistory.memberId) : null;
                    const borrowerName = selectedLoanHistory.borrowerType === 'member' ? (member?.name || 'Socio Desconocido') : selectedLoanHistory.clientName;
                    const isOverdue = new Date() > new Date(selectedLoanHistory.endDate) && selectedLoanHistory.status !== 'paid';

                    return (
                        <div className="space-y-5">
                            {/* Loan Header */}
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h3 className="font-bold text-slate-800 text-lg leading-tight">{borrowerName}</h3>
                                        {selectedLoanHistory.actionAlias && (
                                            <p className="text-xs font-bold text-indigo-600 mt-0.5">{selectedLoanHistory.actionAlias}</p>
                                        )}
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${selectedLoanHistory.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                isOverdue ? 'bg-red-50 text-red-700 border-red-100' :
                                                    'bg-blue-50 text-blue-700 border-blue-100'
                                                }`}>
                                                {selectedLoanHistory.status === 'paid' ? 'Pagado' : isOverdue ? 'Vencido' : 'Activo'}
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                                                <Clock size={10} />
                                                {selectedLoanHistory.status === 'paid' ? 'Finalizado' : (
                                                    <>Vence: {new Date(selectedLoanHistory.nextDueDate || selectedLoanHistory.endDate).toLocaleDateString()}</>
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Monto Original</p>
                                        <p className="text-base font-black text-slate-900">${selectedLoanHistory.amount.toFixed(2)}</p>
                                    </div>
                                </div>

                                {/* Progress Bar / Mini Stats */}
                                <div className="flex gap-4 border-t border-slate-200/60 pt-3 mt-3">
                                    <div className="flex-1">
                                        <div className="flex justify-between text-[10px] uppercase font-bold text-slate-500 mb-1">
                                            <span>Pagado</span>
                                            <span className="text-emerald-600">${selectedLoanHistory.payments.reduce((acc, p) => acc + p.amount, 0).toFixed(2)}</span>
                                        </div>
                                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                            <div
                                                className="bg-emerald-500 h-full rounded-full"
                                                style={{ width: `${Math.min((selectedLoanHistory.payments.reduce((acc, p) => acc + p.amount, 0) / (selectedLoanHistory.amount + (selectedLoanHistory.amount * (selectedLoanHistory.interestRate / 100)))) * 100, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Payment List */}
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">Historial de Abonos</h4>
                                <div className="max-h-[50vh] overflow-y-auto pr-1 space-y-2">
                                    {selectedLoanHistory.payments.length === 0 ? (
                                        <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                            <p className="text-sm text-slate-400 font-medium">No hay pagos registrados</p>
                                        </div>
                                    ) : (
                                        [...selectedLoanHistory.payments]
                                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                            .map((payment) => (
                                                <div key={payment.id} className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-xl hover:border-slate-200 hover:shadow-sm transition-all group">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${payment.paymentType === 'principal' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-purple-50 text-purple-600 border-purple-100'
                                                            }`}>
                                                            <DollarSign size={14} strokeWidth={2.5} />
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-800 text-sm">${payment.amount.toFixed(2)}</p>
                                                            <div className="flex items-center gap-2">
                                                                <span className={`text-[9px] font-bold px-1.5 py-px rounded-md uppercase tracking-wide ${payment.paymentType === 'principal' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                                                                    }`}>
                                                                    {payment.paymentType === 'principal' ? 'Capital' : 'Interés'}
                                                                </span>
                                                                <span className="text-[10px] text-slate-400 font-medium">
                                                                    {new Date(payment.date.split('T')[0] + 'T00:00:00').toLocaleDateString()}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {currentUser?.role !== 'socio' && (
                                                        <div className="flex items-center gap-1 opacity-100 bg-white shadow-sm border border-slate-100 rounded-lg p-0.5">
                                                            <button
                                                                onClick={() => handleEditPaymentFromHistory(selectedLoanHistory.id, payment)}
                                                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all"
                                                                title="Editar"
                                                            >
                                                                <Edit2 size={14} />
                                                            </button>
                                                            <div className="w-px h-3 bg-slate-200"></div>
                                                            <button
                                                                onClick={() => handleDeletePaymentFromHistory(selectedLoanHistory.id, payment.id, payment.amount)}
                                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"
                                                                title="Eliminar"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })()}
            </Modal>
        </div>
    );
};

export default Loans;
