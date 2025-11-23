import React, { useState } from 'react';
import { useBanquito } from '../context/BanquitoContext';
import { Plus, Gift, DollarSign, Calendar, Ticket, CheckCircle, AlertCircle, Trash2, Edit2, AlertTriangle } from 'lucide-react';
import Modal from '../components/Modal';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';

const Activities: React.FC = () => {
    const { activities, memberActivities, members, addActivity, deleteActivity, updateMemberActivity } = useBanquito();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        date: '',
        ticketPrice: 0,
        totalTicketsPerMember: 10
    });

    // Filter states
    const currentDate = new Date();
    const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
    const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth());
    const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [activityToDelete, setActivityToDelete] = useState<{ id: string; name: string; date: string } | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEditMode && editingActivityId) {
            // Update existing activity
            const activity = activities.find(a => a.id === editingActivityId);
            if (activity) {
                const updatedActivity = {
                    ...activity,
                    name: formData.name,
                    date: formData.date,
                    ticketPrice: Number(formData.ticketPrice),
                    totalTicketsPerMember: Number(formData.totalTicketsPerMember)
                };
                // Since there's no updateActivity in context, we need to delete and re-add
                deleteActivity(editingActivityId);
                addActivity(updatedActivity);
            }
        } else {
            // Create new activity
            addActivity({
                name: formData.name,
                date: formData.date,
                ticketPrice: Number(formData.ticketPrice),
                totalTicketsPerMember: Number(formData.totalTicketsPerMember)
            });
        }
        handleCloseModal();
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setIsEditMode(false);
        setEditingActivityId(null);
        setFormData({ name: '', date: '', ticketPrice: 0, totalTicketsPerMember: 10 });
    };

    const handleEditActivity = (activity: typeof activities[0]) => {
        setFormData({
            name: activity.name,
            date: activity.date,
            ticketPrice: activity.ticketPrice,
            totalTicketsPerMember: activity.totalTicketsPerMember
        });
        setEditingActivityId(activity.id);
        setIsEditMode(true);
        setIsModalOpen(true);
    };

    const handleTicketUpdate = (memberActivityId: string, field: 'ticketsSold' | 'ticketsReturned', value: number) => {
        const ma = memberActivities.find(m => m.id === memberActivityId);
        if (!ma) return;

        const activity = activities.find(a => a.id === ma.activityId);
        if (!activity) return;

        const newValue = Math.max(0, Math.min(value, activity.totalTicketsPerMember));

        const updates: any = { [field]: newValue };

        if (field === 'ticketsSold') {
            updates.amountPaid = newValue * activity.ticketPrice;
            updates.fullyPaid = newValue * activity.ticketPrice === updates.amountPaid;
        }

        updateMemberActivity({ ...ma, ...updates });
    };

    const handleDeleteActivity = (activity: typeof activities[0]) => {
        setActivityToDelete({ id: activity.id, name: activity.name, date: activity.date });
        setDeleteConfirmOpen(true);
    };

    const confirmDeleteActivity = () => {
        if (activityToDelete) {
            deleteActivity(activityToDelete.id);
            setSelectedActivityId(null);
            setDeleteConfirmOpen(false);
            setActivityToDelete(null);
        }
    };

    // Filter and sort activities
    const filteredActivities = activities
        .filter(activity => {
            const activityDate = new Date(activity.date);
            return activityDate.getFullYear() === selectedYear && activityDate.getMonth() === selectedMonth;
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Most recent first

    const selectedActivity = filteredActivities.find(a => a.id === selectedActivityId) || filteredActivities[0];
    const currentMemberActivities = memberActivities.filter(ma => ma.activityId === selectedActivity?.id);

    // Generate year options (last 5 years + current + next year)
    const yearOptions = Array.from({ length: 7 }, (_, i) => currentDate.getFullYear() - 2 + i);

    // Month names in Spanish
    const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Actividades y Rifas</h1>
                    <p className="text-slate-500 mt-1">Gestiona la venta de tickets y actividades especiales.</p>
                </div>
                <Button onClick={() => setIsModalOpen(true)} className="shadow-lg shadow-purple-500/20 bg-purple-600 hover:bg-purple-700 focus:ring-purple-500">
                    <Plus size={20} className="mr-2" />
                    Nueva Actividad
                </Button>
            </div>

            {/* Year and Month Filters */}
            <div className="flex gap-4 items-center mb-4">
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-slate-700">Año:</label>
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium text-slate-700"
                    >
                        {yearOptions.map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-slate-700">Mes:</label>
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        className="px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium text-slate-700"
                    >
                        {monthNames.map((month, index) => (
                            <option key={index} value={index}>{month}</option>
                        ))}
                    </select>
                </div>
            </div>

            {filteredActivities.length === 0 ? (
                <Card className="p-12 text-center text-slate-500 flex flex-col items-center justify-center border-dashed border-2 border-slate-200 bg-slate-50/50">
                    <div className="w-20 h-20 bg-purple-100 text-purple-500 rounded-full flex items-center justify-center mb-6">
                        <Gift size={40} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">No hay actividades en {monthNames[selectedMonth]} {selectedYear}</h3>
                    <p className="max-w-md mx-auto mb-8">Crea una nueva actividad o rifa, o selecciona otro período.</p>
                    <Button onClick={() => setIsModalOpen(true)} variant="outline" className="border-purple-200 text-purple-600 hover:bg-purple-50">
                        Crear actividad
                    </Button>
                </Card>
            ) : (
                <>
                    <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide">
                        {filteredActivities.map(activity => (
                            <motion.button
                                key={activity.id}
                                onClick={() => setSelectedActivityId(activity.id)}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className={clsx(
                                    "flex-shrink-0 px-6 py-4 rounded-2xl border transition-all duration-300 text-left min-w-[200px]",
                                    selectedActivity?.id === activity.id
                                        ? "border-purple-500 bg-purple-600 text-white shadow-lg shadow-purple-500/30"
                                        : "border-slate-200 bg-white text-slate-600 hover:border-purple-300 hover:shadow-md"
                                )}
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="font-bold text-lg mb-1">{activity.name}</div>
                                        <div className={clsx("text-xs flex items-center", selectedActivity?.id === activity.id ? "text-purple-100" : "text-slate-400")}>
                                            <Calendar size={12} className="mr-1.5" />
                                            {new Date(activity.date).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteActivity(activity);
                                            }}
                                            className={clsx(
                                                "p-1.5 rounded-lg transition-colors",
                                                selectedActivity?.id === activity.id
                                                    ? "hover:bg-purple-700 text-purple-100"
                                                    : "hover:bg-red-50 text-slate-400 hover:text-red-600"
                                            )}
                                            title="Eliminar actividad"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleEditActivity(activity);
                                            }}
                                            className={clsx(
                                                "p-1.5 rounded-lg transition-colors",
                                                selectedActivity?.id === activity.id
                                                    ? "hover:bg-purple-700 text-purple-100"
                                                    : "hover:bg-blue-50 text-slate-400 hover:text-blue-600"
                                            )}
                                            title="Editar actividad"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </motion.button>
                        ))}
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={selectedActivity.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            <Card className="overflow-hidden border-none shadow-xl shadow-slate-200/50" padding="none">
                                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                    <div>
                                        <h3 className="font-bold text-xl text-slate-800 flex items-center">
                                            <Gift size={20} className="mr-2 text-purple-500" />
                                            {selectedActivity.name}
                                        </h3>
                                        <div className="flex items-center mt-2 space-x-4 text-sm text-slate-500">
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
                                    <div className="text-right">
                                        <div className="text-sm text-slate-500">Total Recaudado</div>
                                        <div className="text-2xl font-bold text-emerald-600">
                                            ${currentMemberActivities.reduce((acc, curr) => acc + (curr.ticketsSold * selectedActivity.ticketPrice), 0).toFixed(2)}
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
                                                        className="hover:bg-slate-50/80 transition-colors"
                                                    >
                                                        <td className="px-8 py-5">
                                                            <div className="flex items-center space-x-3">
                                                                <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-xs">
                                                                    {member.name.charAt(0).toUpperCase()}
                                                                </div>
                                                                <div>
                                                                    <div className="font-medium text-slate-900">{member.name}</div>
                                                                    {member.aliases && member.aliases.length > 0 && (
                                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                                            {member.aliases.map((alias, idx) => (
                                                                                <span key={idx} className="text-xs text-purple-600 font-medium bg-purple-50 px-2 py-0.5 rounded-full">
                                                                                    {alias}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-5 text-center">
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max={selectedActivity.totalTicketsPerMember}
                                                                value={ma.ticketsSold}
                                                                onChange={(e) => handleTicketUpdate(ma.id, 'ticketsSold', Number(e.target.value))}
                                                                className="w-20 text-center bg-white border border-slate-200 rounded-lg py-1.5 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium text-slate-700"
                                                            />
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
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Nombre de la Actividad</label>
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
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Fecha</label>
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
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Precio Ticket</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    step="0.01"
                                    value={formData.ticketPrice}
                                    onChange={(e) => setFormData({ ...formData, ticketPrice: e.target.valueAsNumber })}
                                    className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Tickets por Socio</label>
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
