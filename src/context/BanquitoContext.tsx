import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Member, WeeklyPayment, MonthlyFee, Activity, MemberActivity, Loan, LoanPayment, User } from '../types';

const API_BASE = 'http://localhost:3001/api';

interface BanquitoContextType {
    members: Member[];
    weeklyPayments: WeeklyPayment[];
    monthlyFees: MonthlyFee[];
    activities: Activity[];
    memberActivities: MemberActivity[];
    loans: Loan[];
    isLoading: boolean;

    // Auth State
    users: User[];
    currentUser: User | null;

    // Auth Actions
    login: (username: string, password: string) => Promise<boolean>;
    logout: () => void;
    registerMember: (cedula: string, username: string, password: string) => Promise<{ success: boolean; error?: string }>;
    addUser: (user: Omit<User, 'id'>) => Promise<void>;
    updateUser: (id: string, data: Partial<User>) => Promise<void>;
    deleteUser: (id: string) => Promise<void>;

    addMember: (name: string, cedula?: string, aliases?: string[], phone?: string, active?: boolean) => Promise<void>;
    updateMember: (id: string, data: Partial<Member>) => Promise<void>;
    deleteMember: (id: string) => Promise<void>;

    recordWeeklyPayment: (memberId: string, year: number, month: number, week: number, amount: number, actionAlias?: string) => void;
    recordMonthlyFee: (memberId: string, year: number, month: number, amount: number, actionAlias?: string) => void;

    addActivity: (activity: Omit<Activity, 'id'>) => Promise<void>;
    updateActivity: (id: string, data: Partial<Activity>) => Promise<void>;
    deleteActivity: (id: string) => Promise<void>;
    updateMemberActivity: (data: MemberActivity) => Promise<void>;

    addLoan: (loan: Omit<Loan, 'id'>) => Promise<void>;
    updateLoan: (id: string, data: Partial<Loan>) => Promise<void>;
    deleteLoan: (id: string) => Promise<void>;
    addLoanPayment: (loanId: string, amount: number, paymentType: 'principal' | 'interest', date?: string) => Promise<void>;
    updateLoanPayment: (loanId: string, paymentId: string, amount: number, paymentType: 'principal' | 'interest', date?: string) => Promise<void>;
    deleteLoanPayment: (loanId: string, paymentId: string) => Promise<void>;

    // Data handling
    migrateData: () => Promise<void>;
    importBackup: (data: any) => Promise<boolean>;
}

const BanquitoContext = createContext<BanquitoContextType | undefined>(undefined);

export const BanquitoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [members, setMembers] = useState<Member[]>([]);
    const [weeklyPayments, setWeeklyPayments] = useState<WeeklyPayment[]>([]);
    const [monthlyFees, setMonthlyFees] = useState<MonthlyFee[]>([]);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [memberActivities, setMemberActivities] = useState<MemberActivity[]>([]);
    const [loans, setLoans] = useState<Loan[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [currentUser, setCurrentUser] = useState<User | null>(() => {
        try {
            const saved = localStorage.getItem('banquito_current_user');
            return saved ? JSON.parse(saved) : null;
        } catch {
            return null;
        }
    });
    const [isLoading, setIsLoading] = useState(true);

    // Load all data from API
    const loadData = useCallback(async () => {
        try {
            const [membersRes, weeklyRes, monthlyRes, activitiesRes, memberActRes, loansRes, usersRes] = await Promise.all([
                fetch(`${API_BASE}/members`),
                fetch(`${API_BASE}/payments/weekly`),
                fetch(`${API_BASE}/payments/monthly`),
                fetch(`${API_BASE}/activities`),
                fetch(`${API_BASE}/member-activities`),
                fetch(`${API_BASE}/loans`),
                fetch(`${API_BASE}/users`)
            ]);

            if (membersRes.ok) setMembers(await membersRes.json());
            if (weeklyRes.ok) setWeeklyPayments(await weeklyRes.json());
            if (monthlyRes.ok) setMonthlyFees(await monthlyRes.json());
            if (activitiesRes.ok) setActivities(await activitiesRes.json());
            if (memberActRes.ok) setMemberActivities(await memberActRes.json());
            if (loansRes.ok) setLoans(await loansRes.json());
            if (usersRes.ok) setUsers(await usersRes.json());
        } catch (error) {
            console.error('Error loading data from API:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Save current user to localStorage for session persistence
    useEffect(() => {
        if (currentUser) {
            localStorage.setItem('banquito_current_user', JSON.stringify(currentUser));
        } else {
            localStorage.removeItem('banquito_current_user');
        }
    }, [currentUser]);

    // ==================== AUTH ====================
    const login = async (username: string, password: string): Promise<boolean> => {
        try {
            const res = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (data.success) {
                setCurrentUser(data.user);
                return true;
            }
            return false;
        } catch {
            return false;
        }
    };

    const logout = () => {
        setCurrentUser(null);
    };

    const registerMember = async (cedula: string, username: string, password: string): Promise<{ success: boolean; error?: string }> => {
        try {
            const res = await fetch(`${API_BASE}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cedula, username, password })
            });
            return await res.json();
        } catch {
            return { success: false, error: 'Error de conexión' };
        }
    };

    // ==================== USERS ====================
    const addUser = async (userData: Omit<User, 'id'>) => {
        try {
            const res = await fetch(`${API_BASE}/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });
            if (res.ok) {
                const newUser = await res.json();
                setUsers([...users, newUser]);
            }
        } catch (error) {
            console.error('Error adding user:', error);
        }
    };

    const updateUser = async (id: string, data: Partial<User>) => {
        try {
            const userToUpdate = users.find(u => u.id === id);
            if (!userToUpdate) return;

            const updated = { ...userToUpdate, ...data };
            await fetch(`${API_BASE}/users/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updated)
            });
            setUsers(users.map(u => u.id === id ? updated : u));
            if (currentUser?.id === id) {
                setCurrentUser(updated);
            }
        } catch (error) {
            console.error('Error updating user:', error);
        }
    };

    const deleteUser = async (id: string) => {
        try {
            await fetch(`${API_BASE}/users/${id}`, { method: 'DELETE' });
            setUsers(users.filter(u => u.id !== id));
        } catch (error) {
            console.error('Error deleting user:', error);
        }
    };

    // ==================== MEMBERS ====================
    const addMember = async (name: string, cedula?: string, aliases?: string[], phone?: string, active: boolean = true) => {
        try {
            const res = await fetch(`${API_BASE}/members`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, cedula, aliases, phone, active })
            });
            if (res.ok) {
                const newMember = await res.json();
                setMembers([...members, newMember]);
                // Reload member activities
                const maRes = await fetch(`${API_BASE}/member-activities`);
                if (maRes.ok) setMemberActivities(await maRes.json());
            }
        } catch (error) {
            console.error('Error adding member:', error);
        }
    };

    const updateMember = async (id: string, data: Partial<Member>) => {
        try {
            const memberToUpdate = members.find(m => m.id === id);
            if (!memberToUpdate) return;

            const updated = { ...memberToUpdate, ...data };
            await fetch(`${API_BASE}/members/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updated)
            });
            setMembers(members.map(m => m.id === id ? updated : m));
        } catch (error) {
            console.error('Error updating member:', error);
        }
    };

    const deleteMember = async (id: string) => {
        try {
            await fetch(`${API_BASE}/members/${id}`, { method: 'DELETE' });
            setMembers(members.filter(m => m.id !== id));
        } catch (error) {
            console.error('Error deleting member:', error);
        }
    };

    // ==================== PAYMENTS ====================
    const recordWeeklyPayment = async (memberId: string, year: number, month: number, week: number, amount: number, actionAlias?: string) => {
        try {
            await fetch(`${API_BASE}/payments/weekly`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ memberId, actionAlias, year, month, week, amount })
            });

            // Update local state
            const exists = weeklyPayments.find(p =>
                p.memberId === memberId && p.year === year && p.month === month && p.week === week && p.actionAlias === actionAlias
            );
            if (exists) {
                setWeeklyPayments(weeklyPayments.map(p => p.id === exists.id ? { ...p, amount } : p));
            } else {
                // Reload to get the new payment with ID
                const res = await fetch(`${API_BASE}/payments/weekly`);
                if (res.ok) setWeeklyPayments(await res.json());
            }
        } catch (error) {
            console.error('Error recording weekly payment:', error);
        }
    };

    const recordMonthlyFee = async (memberId: string, year: number, month: number, amount: number, actionAlias?: string) => {
        try {
            await fetch(`${API_BASE}/payments/monthly`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ memberId, actionAlias, year, month, amount })
            });

            const exists = monthlyFees.find(f =>
                f.memberId === memberId && f.year === year && f.month === month && f.actionAlias === actionAlias
            );
            if (exists) {
                setMonthlyFees(monthlyFees.map(f => f.id === exists.id ? { ...f, amount } : f));
            } else {
                const res = await fetch(`${API_BASE}/payments/monthly`);
                if (res.ok) setMonthlyFees(await res.json());
            }
        } catch (error) {
            console.error('Error recording monthly fee:', error);
        }
    };

    // ==================== ACTIVITIES ====================
    const addActivity = async (activityData: Omit<Activity, 'id'>) => {
        try {
            const res = await fetch(`${API_BASE}/activities`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(activityData)
            });
            if (res.ok) {
                const newActivity = await res.json();
                setActivities([...activities, newActivity]);
                // Reload member activities
                const maRes = await fetch(`${API_BASE}/member-activities`);
                if (maRes.ok) setMemberActivities(await maRes.json());
            }
        } catch (error) {
            console.error('Error adding activity:', error);
        }
    };

    const updateActivity = async (id: string, data: Partial<Activity>) => {
        try {
            const activityToUpdate = activities.find(a => a.id === id);
            if (!activityToUpdate) return;

            const updated = { ...activityToUpdate, ...data };
            await fetch(`${API_BASE}/activities/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updated)
            });
            setActivities(activities.map(a => a.id === id ? updated : a));
        } catch (error) {
            console.error('Error updating activity:', error);
        }
    };

    const deleteActivity = async (id: string) => {
        try {
            await fetch(`${API_BASE}/activities/${id}`, { method: 'DELETE' });
            setActivities(activities.filter(a => a.id !== id));
            setMemberActivities(memberActivities.filter(ma => ma.activityId !== id));
        } catch (error) {
            console.error('Error deleting activity:', error);
        }
    };

    const updateMemberActivity = async (data: MemberActivity) => {
        try {
            await fetch(`${API_BASE}/member-activities/${data.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            setMemberActivities(memberActivities.map(ma => ma.id === data.id ? data : ma));
        } catch (error) {
            console.error('Error updating member activity:', error);
        }
    };

    // ==================== LOANS ====================
    const addLoan = async (loanData: Omit<Loan, 'id'>) => {
        try {
            const res = await fetch(`${API_BASE}/loans`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(loanData)
            });
            if (res.ok) {
                const newLoan = await res.json();
                setLoans([...loans, newLoan]);
            }
        } catch (error) {
            console.error('Error adding loan:', error);
        }
    };

    const updateLoan = async (id: string, data: Partial<Loan>) => {
        try {
            const loanToUpdate = loans.find(l => l.id === id);
            if (!loanToUpdate) return;

            const updated = { ...loanToUpdate, ...data };
            await fetch(`${API_BASE}/loans/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updated)
            });
            setLoans(loans.map(l => l.id === id ? updated : l));
        } catch (error) {
            console.error('Error updating loan:', error);
        }
    };

    const deleteLoan = async (id: string) => {
        try {
            await fetch(`${API_BASE}/loans/${id}`, { method: 'DELETE' });
            setLoans(loans.filter(l => l.id !== id));
        } catch (error) {
            console.error('Error deleting loan:', error);
        }
    };

    const addLoanPayment = async (loanId: string, amount: number, paymentType: 'principal' | 'interest', date?: string) => {
        try {
            const res = await fetch(`${API_BASE}/loans/${loanId}/payments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount, paymentType, date })
            });
            if (res.ok) {
                // Reload loans to get updated data
                const loansRes = await fetch(`${API_BASE}/loans`);
                if (loansRes.ok) setLoans(await loansRes.json());
            }
        } catch (error) {
            console.error('Error adding loan payment:', error);
        }
    };

    const updateLoanPayment = async (loanId: string, paymentId: string, amount: number, paymentType: 'principal' | 'interest', date?: string) => {
        try {
            await fetch(`${API_BASE}/loans/${loanId}/payments/${paymentId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount, paymentType, date })
            });
            // Reload loans
            const loansRes = await fetch(`${API_BASE}/loans`);
            if (loansRes.ok) setLoans(await loansRes.json());
        } catch (error) {
            console.error('Error updating loan payment:', error);
        }
    };

    const deleteLoanPayment = async (loanId: string, paymentId: string) => {
        try {
            await fetch(`${API_BASE}/loans/${loanId}/payments/${paymentId}`, { method: 'DELETE' });
            // Reload loans
            const loansRes = await fetch(`${API_BASE}/loans`);
            if (loansRes.ok) setLoans(await loansRes.json());
        } catch (error) {
            console.error('Error deleting loan payment:', error);
        }
    };

    // ==================== MIGRATION ====================
    const migrateData = async () => {
        try {
            // Get data from localStorage
            const oldMembers = JSON.parse(localStorage.getItem('banquito_members') || '[]');
            const oldWeeklyPayments = JSON.parse(localStorage.getItem('banquito_weekly_payments') || '[]');
            const oldMonthlyFees = JSON.parse(localStorage.getItem('banquito_monthly_fees') || '[]');
            const oldActivities = JSON.parse(localStorage.getItem('banquito_activities') || '[]');
            const oldMemberActivities = JSON.parse(localStorage.getItem('banquito_member_activities') || '[]');
            const oldLoans = JSON.parse(localStorage.getItem('banquito_loans') || '[]');
            const oldUsers = JSON.parse(localStorage.getItem('banquito_users') || '[]');

            const res = await fetch(`${API_BASE}/migrate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    members: oldMembers,
                    weeklyPayments: oldWeeklyPayments,
                    monthlyFees: oldMonthlyFees,
                    activities: oldActivities,
                    memberActivities: oldMemberActivities,
                    loans: oldLoans,
                    users: oldUsers
                })
            });

            if (res.ok) {
                console.log('Data migrated successfully!');
                // Reload all data
                await loadData();
            }
        } catch (error) {
            console.error('Migration error:', error);
        }
    };

    const importBackup = async (data: any): Promise<boolean> => {
        try {
            const res = await fetch(`${API_BASE}/migrate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                await loadData();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Import error:', error);
            return false;
        }
    };

    return (
        <BanquitoContext.Provider value={{
            members, weeklyPayments, monthlyFees, activities, memberActivities, loans, isLoading,
            users, currentUser,
            login, logout, registerMember, addUser, updateUser, deleteUser,
            addMember, updateMember, deleteMember,
            recordWeeklyPayment, recordMonthlyFee,
            addActivity, updateActivity, deleteActivity, updateMemberActivity,
            addLoan, updateLoan, deleteLoan, addLoanPayment, updateLoanPayment, deleteLoanPayment,
            migrateData, importBackup
        }}>
            {children}
        </BanquitoContext.Provider>
    );
};

export const useBanquito = () => {
    const context = useContext(BanquitoContext);
    if (context === undefined) {
        throw new Error('useBanquito must be used within a BanquitoProvider');
    }
    return context;
};
