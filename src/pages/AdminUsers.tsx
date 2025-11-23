import React, { useState } from 'react';
import { useBanquito } from '../context/BanquitoContext';
import { Card } from '../components/ui/Card';
import type { User, Permission } from '../types';
import { Trash2, Edit2 } from 'lucide-react';

const AdminUsers: React.FC = () => {
    const { users, addUser, updateUser, deleteUser, currentUser } = useBanquito();
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const initialFormState = {
        username: '',
        password: '',
        name: '',
        role: 'user' as 'user' | 'admin',
        permissions: [] as Permission[],
        active: true
    };

    const [formData, setFormData] = useState(initialFormState);

    const permissionsList: { value: Permission; label: string }[] = [
        { value: 'manage_payments', label: 'Gestionar Pagos' },
        { value: 'manage_loans', label: 'Gestionar Préstamos' },
        { value: 'manage_activities', label: 'Gestionar Actividades' },
        { value: 'manage_members', label: 'Gestionar Socios' },
        { value: 'view_reports', label: 'Ver Reportes' },
        { value: 'admin', label: 'Administrador Total' },
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (editingId) {
            updateUser(editingId, formData);
        } else {
            addUser(formData);
        }

        resetForm();
    };

    const handleEdit = (user: User) => {
        setFormData({
            username: user.username,
            password: user.password || '',
            name: user.name,
            role: user.role,
            permissions: user.permissions,
            active: user.active
        });
        setEditingId(user.id);
        setIsEditing(true);
    };

    const handleDelete = (id: string) => {
        if (window.confirm('¿Estás seguro de eliminar este usuario?')) {
            deleteUser(id);
        }
    };

    const resetForm = () => {
        setFormData(initialFormState);
        setIsEditing(false);
        setEditingId(null);
    };

    const togglePermission = (permission: Permission) => {
        setFormData(prev => {
            const hasPermission = prev.permissions.includes(permission);
            let newPermissions = hasPermission
                ? prev.permissions.filter(p => p !== permission)
                : [...prev.permissions, permission];

            // If admin is selected, ensure role is admin (optional logic, but good for consistency)
            if (permission === 'admin' && !hasPermission) {
                return { ...prev, permissions: newPermissions, role: 'admin' };
            }

            return { ...prev, permissions: newPermissions };
        });
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Gestión de Usuarios</h1>
                <p className="text-slate-500 mt-1">Administra usuarios y sus permisos de acceso.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* User Form */}
                <div className="lg:col-span-1">
                    <Card title={isEditing ? "Editar Usuario" : "Nuevo Usuario"}>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Usuario</label>
                                <input
                                    type="text"
                                    value={formData.username}
                                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
                                <input
                                    type="text"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                                    placeholder={isEditing ? "Dejar en blanco para mantener actual" : "Contraseña"}
                                    required={!isEditing}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Permisos</label>
                                <div className="space-y-2">
                                    {permissionsList.map((perm) => (
                                        <label key={perm.value} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-100">
                                            <input
                                                type="checkbox"
                                                checked={formData.permissions.includes(perm.value)}
                                                onChange={() => togglePermission(perm.value)}
                                                className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                            />
                                            <span className="text-sm text-slate-700">{perm.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-2 pt-4">
                                <button
                                    type="submit"
                                    className="flex-1 bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors font-medium"
                                >
                                    {isEditing ? 'Actualizar' : 'Crear Usuario'}
                                </button>
                                {isEditing && (
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600"
                                    >
                                        Cancelar
                                    </button>
                                )}
                            </div>
                        </form>
                    </Card>
                </div>

                {/* Users List */}
                <div className="lg:col-span-2">
                    <Card padding="none" className="overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Usuario</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Rol / Permisos</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {users.map(user => (
                                    <tr key={user.id} className="hover:bg-slate-50/50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-xs">
                                                    {user.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-slate-900">{user.name}</div>
                                                    <div className="text-xs text-slate-500">@{user.username}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {user.role === 'admin' ? (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-purple-50 text-purple-700 text-xs font-medium ring-1 ring-inset ring-purple-700/10">
                                                        Administrador
                                                    </span>
                                                ) : (
                                                    user.permissions.map(perm => (
                                                        <span key={perm} className="inline-flex items-center px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium ring-1 ring-inset ring-blue-700/10">
                                                            {permissionsList.find(p => p.value === perm)?.label || perm}
                                                        </span>
                                                    ))
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleEdit(user)}
                                                    className="p-1 text-slate-400 hover:text-primary-600 transition-colors"
                                                    title="Editar"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                {user.id !== currentUser?.id && (
                                                    <button
                                                        onClick={() => handleDelete(user.id)}
                                                        className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default AdminUsers;
