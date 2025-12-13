import React, { useState, useEffect } from 'react';
import { useBanquito } from '../context/BanquitoContext';
import { Plus, Gift, DollarSign, Calendar, Ticket, CheckCircle, AlertCircle, Trash2, Edit2, AlertTriangle, ArrowUpDown } from 'lucide-react';
import Modal from '../components/Modal';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { clsx } from 'clsx';

const Activities: React.FC = () => {
    const { activities, memberActivities, members, addActivity, deleteActivity, updateMemberActivity, updateActivity, currentUser } = useBanquito();
    // ... existing state ...
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        date: '',
        ticketPrice: 0,
        totalTicketsPerMember: 10,
        investment: 0
    });

    // Initialize state from localStorage if available
    const getInitialYear = () => {
        if (currentUser?.id) {
            const saved = localStorage.getItem(`activities_selected_year_${currentUser.id}`);
            return saved ? parseInt(saved) : new Date().getFullYear();
        }
        return new Date().getFullYear();
    };

    const getInitialMonth = () => {
        if (currentUser?.id) {
            const saved = localStorage.getItem(`activities_selected_month_${currentUser.id}`);
            return saved ? parseInt(saved) : new Date().getMonth();
        }
        return new Date().getMonth();
    };

    const [selectedYear, setSelectedYear] = useState(getInitialYear);
    const [selectedMonth, setSelectedMonth] = useState(getInitialMonth);
    const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    const toggleSort = () => {
        setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
    };

    // Persist filters to localStorage
    React.useEffect(() => {
        if (currentUser?.id) {
            localStorage.setItem(`activities_selected_year_${currentUser.id}`, selectedYear.toString());
            localStorage.setItem(`activities_selected_month_${currentUser.id}`, selectedMonth.toString());
        }
    }, [selectedYear, selectedMonth, currentUser]);


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEditMode && editingActivityId) {
            // Update existing activity
            updateActivity(editingActivityId, {
                name: formData.name,
                date: formData.date,
                ticketPrice: Number(formData.ticketPrice),
                totalTicketsPerMember: Number(formData.totalTicketsPerMember),
                investment: Number(formData.investment)
            });
        } else {
            // Create new activity
            addActivity({
                name: formData.name,
                date: formData.date,
                ticketPrice: Number(formData.ticketPrice),
                totalTicketsPerMember: Number(formData.totalTicketsPerMember),
                investment: Number(formData.investment)
            });
        }
        handleCloseModal();
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setIsEditMode(false);
        setEditingActivityId(null);
        setFormData({ name: '', date: '', ticketPrice: 0, totalTicketsPerMember: 10, investment: 0 });
    };

    const handleEditActivity = (activity: typeof activities[0]) => {
        setFormData({
            name: activity.name,
            date: activity.date,
            ticketPrice: activity.ticketPrice,
            totalTicketsPerMember: activity.totalTicketsPerMember,
            investment: activity.investment || 0
        });
        setEditingActivityId(activity.id);
        setIsEditMode(true);
        setIsModalOpen(true);
    };

    const handleTicketUpdate = (id: string, field: string, value: number) => {
        const activityToUpdate = memberActivities.find(ma => ma.id === id);
        if (activityToUpdate) {
            updateMemberActivity({
                ...activityToUpdate,
                [field]: value
            });
        }
    };

    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [activityToDelete, setActivityToDelete] = useState<typeof activities[0] | null>(null);

    const handleDeleteActivity = (activity: typeof activities[0]) => {
        setActivityToDelete(activity);
        setDeleteConfirmOpen(true);
    };

    const confirmDeleteActivity = () => {
        if (activityToDelete) {
            deleteActivity(activityToDelete.id);
            setDeleteConfirmOpen(false);
            setActivityToDelete(null);
            if (selectedActivityId === activityToDelete.id) {
                setSelectedActivityId(null);
            }
        }
    };

    // Filter and Sort activities
    const [orderedActivities, setOrderedActivities] = useState<typeof activities>([]);

    useEffect(() => {
        const filtered = activities.filter(a => {
            const d = new Date(a.date);
            return d.getFullYear() === selectedYear && (selectedMonth === -1 || d.getMonth() === selectedMonth);
        }).sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        });
        setOrderedActivities(filtered);
    }, [activities, selectedYear, selectedMonth, sortOrder]);

    const filteredActivities = orderedActivities; // Use the ordered state for rendering

    const selectedActivity = filteredActivities.find(a => a.id === selectedActivityId) || filteredActivities[0];
    const currentMemberActivities = memberActivities.filter(ma => ma.activityId === selectedActivity?.id);

    // Calculate stats for selected activity
    const totalRevenue = currentMemberActivities.reduce((acc, curr) => acc + (curr.ticketsSold * (selectedActivity?.ticketPrice || 0)), 0);
    const totalInvestment = selectedActivity?.investment || 0;
    const netProfit = totalRevenue - totalInvestment;

    const allTicketsPaid = currentMemberActivities.every(ma =>
        (ma.ticketsSold + ma.ticketsReturned) === (selectedActivity?.totalTicketsPerMember || 0)
    );

    // Generate years: Current year - 2 up to Current year + 5
    const yearOptions = Array.from({ length: 8 }, (_, i) => new Date().getFullYear() - 2 + i);
    const monthNames = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Actividades y Rifas</h1>
                    <p className="text-slate-500 mt-1">Gestiona rifas, bingos y otras actividades de recaudación.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="px-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-slate-700 font-medium"
                    >
                        {yearOptions.map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        className="px-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-slate-700 font-medium"
                    >
                        <option value={-1}>Todo el año</option>
                        {monthNames.map((month, index) => (
                            <option key={index} value={index}>{month}</option>
                        ))}
                    </select>

                    <button
                        onClick={toggleSort}
                        className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all text-slate-500 hover:text-purple-600"
                        title={`Ordenar por fecha (${sortOrder === 'desc' ? 'Más antiguas' : 'Más recientes'})`}
                    >
                        <ArrowUpDown size={20} />
                    </button>

                    {currentUser?.role !== 'socio' && (
                        <Button
                            onClick={() => {
                                setIsEditMode(false);
                                setFormData({ name: '', date: '', ticketPrice: 0, totalTicketsPerMember: 10, investment: 0 });
                                setIsModalOpen(true);
                            }}
                            className="bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-500/20"
                        >
                            <Plus size={20} className="mr-2" />
                            Nueva Actividad
                        </Button>
                    )}
                </div>
            </div>

            {filteredActivities.length === 0 ? (
                // ... (Empty state remains same)
                <Card className="p-12 text-center text-slate-500 flex flex-col items-center justify-center border-dashed border-2 border-slate-200 bg-slate-50/50">
                    <div className="w-20 h-20 bg-purple-100 text-purple-500 rounded-full flex items-center justify-center mb-6">
                        <Gift size={40} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">
                        No hay actividades en {selectedMonth === -1 ? `el año ${selectedYear}` : `${monthNames[selectedMonth]} ${selectedYear}`}
                    </h3>
                    <p className="max-w-md mx-auto mb-8">Crea una nueva actividad o rifa, o selecciona otro período.</p>
                    <Button onClick={() => setIsModalOpen(true)} variant="outline" className="border-purple-200 text-purple-600 hover:bg-purple-50">
                        Crear actividad
                    </Button>
                </Card>
            ) : (
                <>
                    <Reorder.Group
                        axis="x"
                        values={orderedActivities}
                        onReorder={setOrderedActivities}
                        layoutScroll
                        className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide px-1"
                    >
                        {filteredActivities.map(activity => {
                            const actRevenue = memberActivities
                                .filter(ma => ma.activityId === activity.id)
                                .reduce((acc, curr) => acc + (curr.ticketsSold * activity.ticketPrice), 0);
                            const isCompleted = memberActivities
                                .filter(ma => ma.activityId === activity.id)
                                .every(ma => (ma.ticketsSold + ma.ticketsReturned) === activity.totalTicketsPerMember);

                            return (
                                <Reorder.Item
                                    key={activity.id}
                                    value={activity}
                                    onClick={() => setSelectedActivityId(activity.id)}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    whileDrag={{
                                        scale: 1.05,
                                        boxShadow: "0px 5px 15px rgba(0,0,0,0.15)",
                                        cursor: "grabbing"
                                    }}
                                    transition={{ duration: 0.2 }}
                                    className={clsx(
                                        "flex-shrink-0 px-6 py-4 rounded-2xl border transition-colors duration-200 text-left min-w-[240px] cursor-grab active:cursor-grabbing",
                                        selectedActivity?.id === activity.id
                                            ? "border-purple-500 bg-purple-600 text-white shadow-lg shadow-purple-500/30"
                                            : "border-slate-200 bg-white text-slate-600 hover:border-purple-300 hover:shadow-md"
                                    )}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="w-full">
                                            <div className="flex justify-between items-start w-full">
                                                <div className="font-bold text-lg mb-1 truncate pr-2 select-none">{activity.name}</div>
                                                {isCompleted ? (
                                                    <span className={clsx("text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider", selectedActivity?.id === activity.id ? "bg-emerald-400/20 text-emerald-100" : "bg-emerald-100 text-emerald-700")}>
                                                        Finalizada
                                                    </span>
                                                ) : (
                                                    <span className={clsx("text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider", selectedActivity?.id === activity.id ? "bg-amber-400/20 text-amber-100" : "bg-amber-100 text-amber-700")}>
                                                        Pendiente
                                                    </span>
                                                )}
                                            </div>
                                            <div className={clsx("text-xs flex items-center mb-2", selectedActivity?.id === activity.id ? "text-purple-100" : "text-slate-400")}>
                                                <Calendar size={12} className="mr-1.5" />
                                                {new Date(activity.date).toLocaleDateString()}
                                            </div>
                                            <div className="flex flex-col gap-1 mt-2">
                                                <div className={clsx("text-xs font-medium", selectedActivity?.id === activity.id ? "text-purple-200" : "text-slate-500")}>
                                                    Recaudado: ${actRevenue.toFixed(2)}
                                                </div>
                                                <div className={clsx("text-xs font-bold", selectedActivity?.id === activity.id ? "text-emerald-300" : "text-emerald-600")}>
                                                    Ganancia: ${(actRevenue - (activity.investment || 0)).toFixed(2)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Reorder.Item>
                            )
                        })}
                    </Reorder.Group>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={selectedActivity.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            <Card className="overflow-hidden border-none shadow-xl shadow-slate-200/50" padding="none">
                                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-6">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                        <div>
                                            <h3 className="font-bold text-2xl text-slate-800 flex items-center">
                                                <Gift size={24} className="mr-3 text-purple-500" />
                                                {selectedActivity.name}
                                                {allTicketsPaid ? (
                                                    <span className="ml-3 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-wide">
                                                        Finalizada
                                                    </span>
                                                ) : (
                                                    <span className="ml-3 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold uppercase tracking-wide">
                                                        En Curso
                                                    </span>
                                                )}
                                            </h3>
                                            <div className="flex items-center mt-3 space-x-4 text-sm text-slate-500">
                                                <span className="flex items-center bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
                                                    <DollarSign size={14} className="mr-1 text-emerald-500" />
                                                    Precio: <span className="font-bold text-slate-700 ml-1">${selectedActivity.ticketPrice}</span>
                                                </span>
                                                <span className="flex items-center bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
                                                    <Ticket size={14} className="mr-1 text-purple-500" />
                                                    Tickets/Socio: <span className="font-bold text-slate-700 ml-1">{selectedActivity.totalTicketsPerMember}</span>
                                                </span>
                                            </div>
                                        </div>
                                        {currentUser?.role !== 'socio' && (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleEditActivity(selectedActivity);
                                                    }}
                                                    className="p-2 rounded-xl hover:bg-white hover:shadow-md text-slate-400 hover:text-blue-600 transition-all border border-transparent hover:border-slate-100"
                                                    title="Editar actividad"
                                                >
                                                    <Edit2 size={20} />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteActivity(selectedActivity);
                                                    }}
                                                    className="p-2 rounded-xl hover:bg-white hover:shadow-md text-slate-400 hover:text-red-600 transition-all border border-transparent hover:border-slate-100"
                                                    title="Eliminar actividad"
                                                >
                                                    <Trash2 size={20} />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Financial Stats Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                            <div className="text-sm text-slate-500 mb-1">Recaudación Total</div>
                                            <div className="flex items-baseline gap-3">
                                                <div className="text-2xl font-black text-slate-800">${totalRevenue.toFixed(2)}</div>
                                                <div className="text-sm font-semibold text-slate-400 border-l pl-3 ml-1 border-slate-200">
                                                    Esperado: ${(currentMemberActivities.length * selectedActivity.ticketPrice * selectedActivity.totalTicketsPerMember).toFixed(2)}
                                                </div>
                                            </div>
                                            <div className="text-xs text-emerald-600 font-medium mt-1">Ingresos brutos</div>
                                        </div>
                                        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                            <div className="text-sm text-slate-500 mb-1">Inversión (Costo)</div>
                                            <div className="text-2xl font-black text-slate-800">${totalInvestment.toFixed(2)}</div>
                                            <div className="text-xs text-amber-600 font-medium mt-1">Gastos operativos</div>
                                        </div>
                                        <div className={clsx("p-4 rounded-2xl border shadow-sm", netProfit >= 0 ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100")}>
                                            <div className={clsx("text-sm mb-1", netProfit >= 0 ? "text-emerald-700" : "text-red-700")}>Ganancia Neta</div>
                                            <div className={clsx("text-2xl font-black", netProfit >= 0 ? "text-emerald-700" : "text-red-700")}>
                                                ${netProfit.toFixed(2)}
                                            </div>
                                            <div className={clsx("text-xs font-medium mt-1", netProfit >= 0 ? "text-emerald-600" : "text-red-600")}>
                                                {netProfit >= 0 ? "Beneficio real" : "Pérdida"}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50/50 text-slate-500 font-semibold text-sm uppercase tracking-wider">
                                            <tr>
                                                <th className="px-8 py-5">Socio</th>
                                                <th className="px-6 py-5 text-center">Tickets Vendidos</th>
                                                <th className="px-6 py-5 text-center bg-emerald-50">Valor Cancelado</th>
                                                <th className="px-6 py-5 text-center bg-blue-50">Valor a Pagar</th>
                                                <th className="px-6 py-5 text-center bg-orange-50">Falta por Pagar</th>
                                                <th className="px-6 py-5 text-center">Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {currentMemberActivities.map((ma, index) => {
                                                const member = members.find(m => m.id === ma.memberId);
                                                if (!member) return null;
                                                const totalToPay = ma.ticketsSold * selectedActivity.ticketPrice;
                                                const isFullyAccounted = (ma.ticketsSold + ma.ticketsReturned) === selectedActivity.totalTicketsPerMember;

                                                return (
                                                    <motion.tr
                                                        key={ma.id}
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        transition={{ delay: index * 0.03 }}
                                                        className="hover:bg-purple-50/50 transition-all duration-200 group relative border-l-2 border-l-transparent hover:border-l-purple-400"
                                                    >
                                                        <td className="px-8 py-5">
                                                            <div className="flex items-center space-x-3">
                                                                <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-xs">
                                                                    {member.name.charAt(0).toUpperCase()}
                                                                </div>
                                                                <div>
                                                                    <div className="font-medium text-slate-900">{member.name}</div>
                                                                    {ma.actionAlias && (
                                                                        <div className="text-xs text-purple-600 font-medium bg-purple-50 px-2 py-0.5 rounded-full inline-block mt-1">
                                                                            {ma.actionAlias}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-5 text-center">
                                                            {currentUser?.role === 'socio' ? (
                                                                <span className="font-bold text-slate-700">{ma.ticketsSold}</span>
                                                            ) : (
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    // max={selectedActivity.totalTicketsPerMember} // Removed to allow selling extra tickets
                                                                    value={ma.ticketsSold}
                                                                    onChange={(e) => handleTicketUpdate(ma.id, 'ticketsSold', Number(e.target.value))}
                                                                    className="w-20 text-center bg-white border border-slate-200 rounded-lg py-1.5 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium text-slate-700"
                                                                />
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-5 text-center bg-emerald-50/50">
                                                            <span className="font-bold text-emerald-700">${totalToPay.toFixed(2)}</span>
                                                        </td>
                                                        <td className="px-6 py-5 text-center bg-blue-50/50">
                                                            <span className="font-bold text-blue-700">${(selectedActivity.totalTicketsPerMember * selectedActivity.ticketPrice).toFixed(2)}</span>
                                                        </td>
                                                        <td className="px-6 py-5 text-center bg-orange-50/50">
                                                            <span className={`font-bold ${((selectedActivity.totalTicketsPerMember * selectedActivity.ticketPrice) - totalToPay) > 0
                                                                ? 'text-orange-700'
                                                                : 'text-emerald-700'
                                                                }`}>
                                                                ${((selectedActivity.totalTicketsPerMember * selectedActivity.ticketPrice) - totalToPay).toFixed(2)}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-5 text-center">
                                                            {isFullyAccounted ? (
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                                                    <CheckCircle size={12} className="mr-1" />
                                                                    Completado
                                                                </span>
                                                            ) : totalToPay > (selectedActivity.totalTicketsPerMember * selectedActivity.ticketPrice) ? (
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                                                                    <CheckCircle size={12} className="mr-1" />
                                                                    Superó Meta
                                                                </span>
                                                            ) : currentUser?.role === 'socio' && currentUser.memberId === ma.memberId && totalToPay < (selectedActivity.totalTicketsPerMember * selectedActivity.ticketPrice) ? (
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                                    <AlertTriangle size={12} className="mr-1" />
                                                                    Falta Pagar
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                                                    <AlertCircle size={12} className="mr-1" />
                                                                    Pendiente
                                                                </span>
                                                            )}
                                                        </td>
                                                    </motion.tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        </motion.div>
                    </AnimatePresence>
                </>
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={isEditMode ? "Editar Actividad" : "Nueva Actividad"}
            >
                <form onSubmit={(e) => {
                    e.preventDefault();
                    // Validation
                    const newErrors = {
                        name: !formData.name.trim(),
                        date: !formData.date,
                        ticketPrice: formData.ticketPrice <= 0,
                        totalTicketsPerMember: formData.totalTicketsPerMember <= 0
                    };

                    if (Object.values(newErrors).some(Boolean)) {
                        // Show errors (you might want to add state for this to show UI feedback)
                        alert("Por favor complete todos los campos obligatorios correctamente.");
                        return;
                    }

                    handleSubmit(e);
                }} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Nombre de la Actividad *</label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                            placeholder="Ej. Rifa Navideña"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Fecha *</label>
                        <input
                            type="date"
                            required
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Precio Ticket *</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                                <input
                                    type="number"
                                    required
                                    min="0.01"
                                    step="0.01"
                                    value={formData.ticketPrice}
                                    onChange={(e) => setFormData({ ...formData, ticketPrice: e.target.valueAsNumber })}
                                    className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Tickets por Socio *</label>
                            <input
                                type="number"
                                required
                                min="1"
                                value={formData.totalTicketsPerMember}
                                onChange={(e) => setFormData({ ...formData, totalTicketsPerMember: e.target.valueAsNumber })}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Inversión Inicial (Opcional)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={formData.investment || ''}
                                onChange={(e) => setFormData({ ...formData, investment: e.target.value ? parseFloat(e.target.value) : 0 })}
                                className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                                placeholder="0.00"
                            />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Dinero tomado del banquito para premios u organización. (Por defecto: $0.00)</p>
                    </div>
                    <div className="flex justify-end space-x-3 pt-4">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={handleCloseModal}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            className="bg-purple-600 hover:bg-purple-700 focus:ring-purple-500"
                        >
                            {isEditMode ? "Guardar Cambios" : "Crear Actividad"}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Delete Activity Confirmation Modal */}
            <Modal
                isOpen={deleteConfirmOpen}
                onClose={() => {
                    setDeleteConfirmOpen(false);
                    setActivityToDelete(null);
                }}
                title=""
            >
                <div className="text-center py-4">
                    <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                        <AlertTriangle className="text-red-600" size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">¿Eliminar esta actividad?</h3>
                    <p className="text-slate-600 mb-1">Esta acción no se puede deshacer.</p>
                    {activityToDelete && (
                        <div className="mt-4 p-4 bg-slate-50 rounded-xl">
                            <p className="text-sm text-slate-500">Actividad</p>
                            <p className="text-lg font-bold text-slate-900 mb-2">{activityToDelete.name}</p>
                            <p className="text-sm text-slate-500">Fecha</p>
                            <p className="text-base font-semibold text-slate-700">
                                {new Date(activityToDelete.date).toLocaleDateString('es-EC', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </p>
                        </div>
                    )}
                    <div className="flex gap-3 mt-6">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                                setDeleteConfirmOpen(false);
                                setActivityToDelete(null);
                            }}
                            className="flex-1"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            onClick={confirmDeleteActivity}
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

export default Activities;
