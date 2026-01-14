import React, { useState } from 'react';
import { useBanquito } from '../context/BanquitoContext';
import { Search, Edit2, Trash2, UserPlus, Phone, Calendar, CheckCircle, XCircle, Plus, X as XIcon, CreditCard, AlertTriangle } from 'lucide-react';
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
        cedula: '',
        aliases: [''] as string[],
        phone: '',
        active: true
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [cedulaError, setCedulaError] = useState('');
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [memberToDelete, setMemberToDelete] = useState<{ id: string; name: string; cedula?: string } | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setCedulaError('');

        // Validate name
        if (!formData.name.trim()) {
            return;
        }

        // Validate cedula (now required)
        if (!formData.cedula.trim()) {
            setCedulaError('La cédula es obligatoria');
            return;
        }

        // Validate cedula format: only numbers and exactly 10 digits
        const cedulaRegex = /^\d{10}$/;
        if (!cedulaRegex.test(formData.cedula.trim())) {
            setCedulaError('La cédula debe contener exactamente 10 dígitos numéricos');
            return;
        }

        // Check for duplicate cedula
        const duplicate = members.find(m =>
            m.cedula === formData.cedula.trim() && m.id !== editingId
        );
        if (duplicate) {
            setCedulaError('Ya existe un socio con esta cédula');
            return;
        }

        // Process aliases: auto-number empty ones
        const processedAliases = formData.aliases.map((alias, index) => {
            if (alias.trim() === '') {
                return `Acción ${index + 1}`;
            }
            return alias.trim();
        });

        if (editingId) {
            updateMember(editingId, {
                name: formData.name.trim(),
                cedula: formData.cedula.trim(),
                aliases: processedAliases,
                phone: formData.phone.trim() || undefined,
                active: formData.active
            });
        } else {
            addMember(
                formData.name.trim(),
                formData.cedula.trim(),
                processedAliases,
                formData.phone.trim() || undefined,
                formData.active
            );
        }
        handleClose();
    };

    const handleEdit = (member: any) => {
        setEditingId(member.id);
        setFormData({
            name: member.name,
            cedula: member.cedula || '',
            aliases: member.aliases && member.aliases.length > 0 ? member.aliases : [''],
            phone: member.phone || '',
            active: member.active
        });
        setIsModalOpen(true);
    };

    const handleDelete = (member: typeof members[0]) => {
        setMemberToDelete({ id: member.id, name: member.name, cedula: member.cedula });
        setDeleteConfirmOpen(true);
    };

    const confirmDelete = () => {
        if (memberToDelete) {
            deleteMember(memberToDelete.id);
            setDeleteConfirmOpen(false);
            setMemberToDelete(null);
        }
    };

    const handleClose = () => {
        setIsModalOpen(false);
        setEditingId(null);
        setFormData({ name: '', cedula: '', aliases: [''], phone: '', active: true });
        setCedulaError('');
    };

    const addAliasField = () => {
        setFormData({ ...formData, aliases: [...formData.aliases, ''] });
    };

    const removeAliasField = (index: number) => {
        const newAliases = formData.aliases.filter((_, i) => i !== index);
        setFormData({ ...formData, aliases: newAliases.length > 0 ? newAliases : [''] });
    };

    const updateAlias = (index: number, value: string) => {
        const newAliases = [...formData.aliases];
        newAliases[index] = value;
        setFormData({ ...formData, aliases: newAliases });
    };

    const filteredMembers = members.filter(m =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.aliases && m.aliases.some(a => a.toLowerCase().includes(searchTerm.toLowerCase()))) ||
        (m.cedula && m.cedula.includes(searchTerm))
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
                            placeholder="Buscar por nombre, alias o cédula..."
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

                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredMembers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-12 text-center text-slate-500">
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
                                        className="hover:bg-primary-50/50 transition-all duration-200 group relative border-l-2 border-l-transparent hover:border-l-primary-400"
                                    >
                                        <td className="px-8 py-5">
                                            <div className="flex items-center space-x-4">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 text-primary-700 flex items-center justify-center font-bold text-sm shadow-sm group-hover:scale-110 transition-transform">
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
                                        <td className="px-6 py-5">
                                            <div className="flex items-center text-slate-600">
                                                {member.cedula ? (
                                                    <>
                                                        <CreditCard size={16} className="mr-2 text-slate-400" />
                                                        {member.cedula}
                                                    </>
                                                ) : (
                                                    <span className="text-slate-400 text-sm">Sin registro</span>
                                                )}
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
                                                {member.joinedDate ? new Date(member.joinedDate).toLocaleDateString() : 'Sin fecha'}
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
                                                        onClick={() => handleDelete(member)}
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
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-medium text-slate-700">Nombre Completo *</label>
                            <div className="flex items-center gap-2 bg-slate-50 pl-3 pr-1 py-1 rounded-full border border-slate-200/60">
                                <span className={`text-xs font-semibold transition-colors ${formData.active ? 'text-emerald-600' : 'text-slate-400'}`}>
                                    {formData.active ? 'Activo' : 'Inactivo'}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, active: !formData.active })}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${formData.active
                                        ? 'bg-emerald-500 shadow-md shadow-emerald-500/30'
                                        : 'bg-slate-300 shadow-inner'
                                        }`}
                                >
                                    <span
                                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-300 ${formData.active ? 'translate-x-5' : 'translate-x-0.5'
                                            }`}
                                    />
                                </button>
                            </div>
                        </div>
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
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Cédula *
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.cedula}
                            onChange={(e) => {
                                // Only allow numbers
                                const value = e.target.value.replace(/\D/g, '');
                                // Limit to 10 digits
                                if (value.length <= 10) {
                                    setFormData({ ...formData, cedula: value });
                                    setCedulaError('');
                                }
                            }}
                            className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-primary-500/20 transition-all ${cedulaError ? 'border-red-500' : 'border-slate-200 focus:border-primary-500'
                                }`}
                            placeholder="Ej. 1234567890"
                            maxLength={10}
                            inputMode="numeric"
                            pattern="\d{10}"
                        />
                        {cedulaError && (
                            <p className="text-red-600 text-sm mt-1">{cedulaError}</p>
                        )}
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-sm font-medium text-slate-700">
                                Acciones/Letras (Opcional)
                                <span className="text-xs text-slate-500 ml-2">Ej: Acción 1, Acción 2</span>
                            </label>
                            <button
                                type="button"
                                onClick={addAliasField}
                                className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                            >
                                <Plus size={14} />
                                Agregar
                            </button>
                        </div>
                        <div className="space-y-2">
                            {formData.aliases.map((alias, index) => (
                                <div key={index} className="flex gap-2">
                                    <input
                                        type="text"
                                        value={alias}
                                        onChange={(e) => updateAlias(index, e.target.value)}
                                        className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                                        placeholder={`Acción ${index + 1}`}
                                    />
                                    {formData.aliases.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeAliasField(index)}
                                            className="p-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                                            title="Eliminar"
                                        >
                                            <XIcon size={18} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Teléfono (Opcional)</label>
                        <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => {
                                // Only allow numbers
                                const value = e.target.value.replace(/\D/g, '');
                                // Limit to 10 digits
                                if (value.length <= 10) {
                                    setFormData({ ...formData, phone: value });
                                }
                            }}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                            placeholder="Ej. 0991234567"
                            maxLength={10}
                            inputMode="numeric"
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
                        <Button type="submit">
                            {editingId ? 'Guardar Cambios' : 'Crear Socio'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Delete Member Confirmation Modal */}
            <Modal
                isOpen={deleteConfirmOpen}
                onClose={() => {
                    setDeleteConfirmOpen(false);
                    setMemberToDelete(null);
                }}
                title=""
            >
                <div className="text-center py-4">
                    <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                        <AlertTriangle className="text-red-600" size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">¿Eliminar este socio?</h3>
                    <p className="text-slate-600 mb-1">Esta acción no se puede deshacer.</p>
                    {memberToDelete && (
                        <div className="mt-4 p-4 bg-slate-50 rounded-xl">
                            <p className="text-sm text-slate-500">Socio</p>
                            <p className="text-lg font-bold text-slate-900 mb-2">{memberToDelete.name}</p>
                            {memberToDelete.cedula && (
                                <>
                                    <p className="text-sm text-slate-500">Cédula</p>
                                    <p className="text-base font-semibold text-slate-700">{memberToDelete.cedula}</p>
                                </>
                            )}
                        </div>
                    )}
                    <div className="flex gap-3 mt-6">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                                setDeleteConfirmOpen(false);
                                setMemberToDelete(null);
                            }}
                            className="flex-1"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            onClick={confirmDelete}
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

export default Members;
