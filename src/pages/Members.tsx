import React, { useState } from 'react';
import { useBanquito } from '../context/BanquitoContext';
import { Search, Edit2, Trash2, UserPlus, Phone, Calendar, CheckCircle, XCircle } from 'lucide-react';
import Modal from '../components/Modal';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { motion } from 'framer-motion';

const Members: React.FC = () => {
    const { members, addMember, updateMember, deleteMember } = useBanquito();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        alias: '',
        phone: ''
    });
    const [searchTerm, setSearchTerm] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingId) {
            updateMember(editingId, formData);
        } else {
            addMember(formData.name, formData.alias, formData.phone);
        }
        handleClose();
    };

    const handleEdit = (member: any) => {
        setEditingId(member.id);
        setFormData({ name: member.name, alias: member.alias || '', phone: member.phone || '' });
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        if (confirm('¿Estás seguro de eliminar este socio?')) {
            deleteMember(id);
        }
    };

    const handleClose = () => {
        setIsModalOpen(false);
        setEditingId(null);
        setFormData({ name: '', alias: '', phone: '' });
    };

    const filteredMembers = members.filter(m =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.alias && m.alias.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Gestión de Socios</h1>
                    <p className="text-slate-500 mt-1">Administra los miembros de tu banquito.</p>
                </div>
                <Button onClick={() => setIsModalOpen(true)} className="shadow-lg shadow-primary-500/20">
                    <UserPlus size={20} className="mr-2" />
                    Nuevo Socio
                </Button>
            </div>

            <Card className="overflow-hidden border-none shadow-xl shadow-slate-200/50" padding="none">
                <div className="p-6 border-b border-slate-100 bg-white">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar socio por nombre o alias..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50 text-slate-500 font-semibold text-sm uppercase tracking-wider">
                            <tr>
                                <th className="px-8 py-5">Socio / Alias</th>
                                <th className="px-6 py-5">Contacto</th>
                                <th className="px-6 py-5">Fecha Ingreso</th>
                                <th className="px-6 py-5">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredMembers.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-8 py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
                                                <Search size={32} />
                                            </div>
                                            <p className="text-lg font-medium text-slate-900">No se encontraron socios</p>
                                            <p className="text-sm">Intenta con otra búsqueda o agrega un nuevo socio.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredMembers.map((member, index) => (
                                    <motion.tr
                                        key={member.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: index * 0.03 }}
                                        className="hover:bg-primary-50/30 transition-all duration-200 group relative"
                                    >
                                        <td className="px-8 py-5">
                                            <div className="flex items-center space-x-4">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 text-primary-700 flex items-center justify-center font-bold text-sm shadow-sm group-hover:scale-110 transition-transform">
                                                    {member.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-slate-900">{member.name}</div>
                                                    {member.alias && (
                                                        <div className="text-xs text-purple-600 font-medium bg-purple-50 px-2 py-0.5 rounded-full inline-block mt-0.5">
                                                            {member.alias}
                                                        </div>
                                                    )}
                                                    <span className="text-xs text-slate-400 block mt-0.5">ID: {member.id.slice(0, 8)}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center text-slate-600">
                                                <Phone size={16} className="mr-2 text-slate-400" />
                                                {member.phone || 'Sin registro'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center text-slate-600">
                                                <Calendar size={16} className="mr-2 text-slate-400" />
                                                {new Date(member.joinedDate).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 relative">
                                            <div className="flex items-center justify-between">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${member.active
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                    : 'bg-red-50 text-red-700 border-red-100'
                                                    }`}>
                                                    {member.active ? <CheckCircle size={12} className="mr-1.5" /> : <XCircle size={12} className="mr-1.5" />}
                                                    {member.active ? 'Activo' : 'Inactivo'}
                                                </span>

                                                {/* Hover Action Buttons */}
                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 transition-all duration-200">
                                                    <button
                                                        onClick={() => handleEdit(member)}
                                                        className="p-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 shadow-lg hover:shadow-xl transition-all hover:scale-110"
                                                        title="Editar socio"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(member.id)}
                                                        className="p-2 rounded-lg bg-red-600 text-white hover:bg-red-700 shadow-lg hover:shadow-xl transition-all hover:scale-110"
                                                        title="Eliminar socio"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Modal
                isOpen={isModalOpen}
                onClose={handleClose}
                title={editingId ? 'Editar Socio' : 'Nuevo Socio'}
            >
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Nombre Completo</label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                            placeholder="Ej. Juan Pérez"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Alias (Opcional)</label>
                        <input
                            type="text"
                            value={formData.alias}
                            onChange={(e) => setFormData({ ...formData, alias: e.target.value })}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                            placeholder="Ej. Acción 1"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Teléfono (Opcional)</label>
                        <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                            placeholder="Ej. 0991234567"
                        />
                    </div>
                    <div className="flex justify-end space-x-3 pt-4">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={handleClose}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                        >
                            {editingId ? 'Guardar Cambios' : 'Crear Socio'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Members;
