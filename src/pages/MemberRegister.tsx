import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBanquito } from '../context/BanquitoContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { UserPlus, CreditCard, User, Lock, AlertCircle, CheckCircle } from 'lucide-react';

const MemberRegister: React.FC = () => {
    const navigate = useNavigate();
    const { members, registerMember } = useBanquito();
    const [step, setStep] = useState<'cedula' | 'account'>('cedula');
    const [cedula, setCedula] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [validatedMember, setValidatedMember] = useState<typeof members[0] | null>(null);

    const handleCedulaValidation = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validate cedula format
        const cedulaRegex = /^\d{10}$/;
        if (!cedulaRegex.test(cedula)) {
            setError('La cédula debe contener exactamente 10 dígitos numéricos');
            return;
        }

        // Find member by cedula
        const member = members.find(m => m.cedula === cedula);
        if (!member) {
            setError('No se encontró un socio registrado con esta cédula. Contacte al administrador.');
            return;
        }

        setValidatedMember(member);
        setStep('account');
    };

    const handleAccountCreation = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validate passwords match
        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        // Validate password length
        if (password.length < 4) {
            setError('La contraseña debe tener al menos 4 caracteres');
            return;
        }

        // Validate username
        if (username.length < 3) {
            setError('El nombre de usuario debe tener al menos 3 caracteres');
            return;
        }

        // Register member
        const result = registerMember(cedula, username, password);
        if (!result.success) {
            setError(result.error || 'Error al crear la cuenta');
            return;
        }

        // Success - redirect to login
        navigate('/login', { state: { message: 'Cuenta creada exitosamente. Ya puedes iniciar sesión.' } });
    };

    const handleBack = () => {
        if (step === 'account') {
            setStep('cedula');
            setValidatedMember(null);
            setUsername('');
            setPassword('');
            setConfirmPassword('');
            setError('');
        } else {
            navigate('/login');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-orange-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md shadow-2xl border-none">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <UserPlus className="text-white" size={32} />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900">Crear Cuenta de Socio</h1>
                    <p className="text-slate-500 mt-2">
                        {step === 'cedula'
                            ? 'Ingresa tu cédula para validar tu registro'
                            : 'Crea tu nombre de usuario y contraseña'}
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                        <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                        <p className="text-red-700 text-sm">{error}</p>
                    </div>
                )}

                {step === 'cedula' ? (
                    <form onSubmit={handleCedulaValidation} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Cédula *
                            </label>
                            <div className="relative">
                                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                <input
                                    type="text"
                                    required
                                    value={cedula}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, '');
                                        if (value.length <= 10) {
                                            setCedula(value);
                                            setError('');
                                        }
                                    }}
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                                    placeholder="1234567890"
                                    maxLength={10}
                                    inputMode="numeric"
                                />
                            </div>
                            <p className="text-xs text-slate-500 mt-2">
                                Ingresa la cédula con la que fuiste registrado como socio
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={handleBack}
                                className="flex-1"
                            >
                                Volver al Login
                            </Button>
                            <Button
                                type="submit"
                                className="flex-1"
                            >
                                Continuar
                            </Button>
                        </div>
                    </form>
                ) : (
                    <>
                        {validatedMember && (
                            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
                                <CheckCircle className="text-emerald-600 flex-shrink-0 mt-0.5" size={20} />
                                <div>
                                    <p className="text-emerald-700 font-medium">Socio encontrado</p>
                                    <p className="text-emerald-600 text-sm mt-1">
                                        Nombre: <span className="font-bold">{validatedMember.name}</span>
                                    </p>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleAccountCreation} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Nombre de Usuario *
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                    <input
                                        type="text"
                                        required
                                        value={username}
                                        onChange={(e) => {
                                            setUsername(e.target.value);
                                            setError('');
                                        }}
                                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                                        placeholder="usuario123"
                                        minLength={3}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Contraseña *
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => {
                                            setPassword(e.target.value);
                                            setError('');
                                        }}
                                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                                        placeholder="••••••••"
                                        minLength={4}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Confirmar Contraseña *
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                    <input
                                        type="password"
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => {
                                            setConfirmPassword(e.target.value);
                                            setError('');
                                        }}
                                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                                        placeholder="••••••••"
                                        minLength={4}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={handleBack}
                                    className="flex-1"
                                >
                                    Atrás
                                </Button>
                                <Button
                                    type="submit"
                                    className="flex-1"
                                >
                                    Crear Cuenta
                                </Button>
                            </div>
                        </form>
                    </>
                )}
            </Card>
        </div>
    );
};

export default MemberRegister;
