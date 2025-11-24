import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Member, WeeklyPayment, MonthlyFee, Activity, MemberActivity, Loan, LoanPayment, User } from '../types';

interface BanquitoContextType {
    members: Member[];
    weeklyPayments: WeeklyPayment[];
    monthlyFees: MonthlyFee[];
    activities: Activity[];
    memberActivities: MemberActivity[];
    loans: Loan[];

    // Auth State
    users: User[];
    currentUser: User | null;

    // Auth Actions
    login: (username: string, password: string) => boolean;
    logout: () => void;
    registerMember: (cedula: string, username: string, password: string) => { success: boolean; error?: string };
    addUser: (user: Omit<User, 'id'>) => void;
    updateUser: (id: string, data: Partial<User>) => void;
    deleteUser: (id: string) => void;

    addMember: (name: string, cedula?: string, aliases?: string[], phone?: string, active?: boolean) => void;
    updateMember: (id: string, data: Partial<Member>) => void;
    deleteMember: (id: string) => void;

    recordWeeklyPayment: (memberId: string, year: number, month: number, week: number, amount: number, actionAlias?: string) => void;
    recordMonthlyFee: (memberId: string, year: number, month: number, amount: number, actionAlias?: string) => void;

    addActivity: (activity: Omit<Activity, 'id'>) => void;
    updateActivity: (id: string, data: Partial<Activity>) => void;
    deleteActivity: (id: string) => void;
    updateMemberActivity: (data: MemberActivity) => void;

    addLoan: (loan: Omit<Loan, 'id'>) => void;
    updateLoan: (id: string, data: Partial<Loan>) => void;
    deleteLoan: (id: string) => void;
    addLoanPayment: (loanId: string, amount: number, paymentType: 'principal' | 'interest') => void;
    updateLoanPayment: (loanId: string, paymentId: string, amount: number, paymentType: 'principal' | 'interest') => void;
    deleteLoanPayment: (loanId: string, paymentId: string) => void;
}

const BanquitoContext = createContext<BanquitoContextType | undefined>(undefined);

export const BanquitoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [members, setMembers] = useState<Member[]>(() => {
        try {
            const saved = localStorage.getItem('banquito_members');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error("Error parsing members:", e);
            return [];
        }
    });

    const [weeklyPayments, setWeeklyPayments] = useState<WeeklyPayment[]>(() => {
        try {
            const saved = localStorage.getItem('banquito_weekly_payments');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error("Error parsing weeklyPayments:", e);
            return [];
        }
    });

    const [monthlyFees, setMonthlyFees] = useState<MonthlyFee[]>(() => {
        try {
            const saved = localStorage.getItem('banquito_monthly_fees');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error("Error parsing monthlyFees:", e);
            return [];
        }
    });

    const [activities, setActivities] = useState<Activity[]>(() => {
        try {
            const saved = localStorage.getItem('banquito_activities');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error("Error parsing activities:", e);
            return [];
        }
    });

    const [memberActivities, setMemberActivities] = useState<MemberActivity[]>(() => {
        try {
            const saved = localStorage.getItem('banquito_member_activities');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error("Error parsing memberActivities:", e);
            return [];
        }
    });

    const [loans, setLoans] = useState<Loan[]>(() => {
        try {
            const saved = localStorage.getItem('banquito_loans');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error("Error parsing loans:", e);
            return [];
        }
    });

    // Auth State Initialization
    const [users, setUsers] = useState<User[]>(() => {
        try {
            const saved = localStorage.getItem('banquito_users');
            if (saved) return JSON.parse(saved);
        } catch (e) {
            console.error("Error parsing users:", e);
        }

        // Default Admin User
        return [{
            id: 'admin-default',
            username: 'admin',
            password: 'admin', // Plain text for this demo as requested
            name: 'Administrador',
            role: 'admin',
            permissions: ['admin'],
            active: true
        }];
    });

    const [currentUser, setCurrentUser] = useState<User | null>(() => {
        try {
            const saved = localStorage.getItem('banquito_current_user');
            return saved ? JSON.parse(saved) : null;
        } catch (e) {
            console.error("Error parsing currentUser:", e);
            return null;
        }
    });

    // Persistence Effects
    useEffect(() => localStorage.setItem('banquito_members', JSON.stringify(members)), [members]);
    useEffect(() => localStorage.setItem('banquito_weekly_payments', JSON.stringify(weeklyPayments)), [weeklyPayments]);
    useEffect(() => localStorage.setItem('banquito_monthly_fees', JSON.stringify(monthlyFees)), [monthlyFees]);
    useEffect(() => localStorage.setItem('banquito_activities', JSON.stringify(activities)), [activities]);
    useEffect(() => localStorage.setItem('banquito_member_activities', JSON.stringify(memberActivities)), [memberActivities]);
    useEffect(() => localStorage.setItem('banquito_loans', JSON.stringify(loans)), [loans]);
    useEffect(() => localStorage.setItem('banquito_users', JSON.stringify(users)), [users]);
    useEffect(() => {
        if (currentUser) {
            localStorage.setItem('banquito_current_user', JSON.stringify(currentUser));
        } else {
            localStorage.removeItem('banquito_current_user');
        }
    }, [currentUser]);

    // Actions
    const login = (username: string, password: string) => {
        const user = users.find(u => u.username === username && u.password === password && u.active);
        if (user) {
            setCurrentUser(user);
            return true;
        }
        return false;
    };

    const logout = () => {
        setCurrentUser(null);
    };

    const addUser = (userData: Omit<User, 'id'>) => {
        const newUser: User = {
            ...userData,
            id: crypto.randomUUID(),
        };
        setUsers([...users, newUser]);
    };

    const updateUser = (id: string, data: Partial<User>) => {
        setUsers(users.map(u => u.id === id ? { ...u, ...data } : u));
        // Update current user if it's the same person
        if (currentUser && currentUser.id === id) {
            setCurrentUser({ ...currentUser, ...data });
        }
    };

    const deleteUser = (id: string) => {
        setUsers(users.filter(u => u.id !== id));
    };

    const registerMember = (cedula: string, username: string, password: string): { success: boolean; error?: string } => {
        // Validate cedula exists in members
        const member = members.find(m => m.cedula === cedula);
        if (!member) {
            return { success: false, error: 'No se encontró un socio registrado con esta cédula' };
        }

        // Check if member already has an account
        const existingUserForMember = users.find(u => u.memberId === member.id);
        if (existingUserForMember) {
            return { success: false, error: 'Este socio ya tiene una cuenta creada' };
        }

        // Check if username is already taken
        const existingUsername = users.find(u => u.username === username);
        if (existingUsername) {
            return { success: false, error: 'Este nombre de usuario ya está en uso' };
        }

        // Create new user account for member
        const newUser: User = {
            id: crypto.randomUUID(),
            username,
            password,
            name: member.name,
            role: 'socio',
            memberId: member.id,
            permissions: [],
            active: true
        };
        setUsers([...users, newUser]);
        return { success: true };
    };

    // Self-healing: Ensure all members have records for all activities (per action/alias)
    useEffect(() => {
        if (members.length === 0 || activities.length === 0) return;

        const missingActivities: MemberActivity[] = [];
        const updatedActivities: MemberActivity[] = [];
        let hasUpdates = false;

        // Helper to get all expected "identities" for a member (base + aliases)
        const getMemberIdentities = (member: Member) => {
            if (member.aliases && member.aliases.length > 0) {
                return member.aliases.map(alias => ({ memberId: member.id, actionAlias: alias }));
            }
            return [{ memberId: member.id, actionAlias: undefined }];
        };

        activities.forEach(activity => {
            members.forEach(member => {
                const identities = getMemberIdentities(member);

                identities.forEach(identity => {
                    // Find existing record for this specific identity
                    const existingRecord = memberActivities.find(ma =>
                        ma.activityId === activity.id &&
                        ma.memberId === member.id &&
                        ma.actionAlias === identity.actionAlias
                    );

                    if (!existingRecord) {
                        // Check if there's a "legacy" record (no alias) that should belong to the first alias
                        const legacyRecord = memberActivities.find(ma =>
                            ma.activityId === activity.id &&
                            ma.memberId === member.id &&
                            !ma.actionAlias
                        );

                        if (legacyRecord && identity.actionAlias && member.aliases && member.aliases[0] === identity.actionAlias) {
                            // Migrate legacy record to first alias
                            updatedActivities.push({ ...legacyRecord, actionAlias: identity.actionAlias });
                            hasUpdates = true;
                        } else {
                            // Create new record
                            missingActivities.push({
                                id: crypto.randomUUID(),
                                activityId: activity.id,
                                memberId: member.id,
                                actionAlias: identity.actionAlias,
                                ticketsSold: 0,
                                ticketsReturned: 0,
                                amountPaid: 0,
                                fullyPaid: false,
                            });
                        }
                    }
                });
            });
        });

        if (missingActivities.length > 0 || hasUpdates) {
            console.log(`Fixing/Migrating member-activity records. New: ${missingActivities.length}, Updates: ${updatedActivities.length}`);

            setMemberActivities(prev => {
                let next = [...prev];

                // Apply updates (migration)
                updatedActivities.forEach(update => {
                    next = next.map(ma => ma.id === update.id ? update : ma);
                });

                // Add missing
                return [...next, ...missingActivities];
            });
        }
    }, [members.length, activities.length, memberActivities.length]);

    const addMember = (name: string, cedula?: string, aliases?: string[], phone?: string, active: boolean = true) => {
        const newMember: Member = {
            id: crypto.randomUUID(),
            name,
            cedula,
            aliases,
            phone,
            active,
            joinedDate: new Date().toISOString(),
        };

        // Create activity records for the new member (per alias)
        const identities = (aliases && aliases.length > 0)
            ? aliases.map(alias => ({ memberId: newMember.id, actionAlias: alias }))
            : [{ memberId: newMember.id, actionAlias: undefined }];

        const newMemberActivities = activities.flatMap(activity =>
            identities.map(identity => ({
                id: crypto.randomUUID(),
                activityId: activity.id,
                memberId: newMember.id,
                actionAlias: identity.actionAlias,
                ticketsSold: 0,
                ticketsReturned: 0,
                amountPaid: 0,
                fullyPaid: false,
            }))
        );

        setMembers([...members, newMember]);
        if (newMemberActivities.length > 0) {
            setMemberActivities(prev => [...prev, ...newMemberActivities]);
        }
    };

    const updateMember = (id: string, data: Partial<Member>) => {
        setMembers(members.map(m => m.id === id ? { ...m, ...data } : m));
    };

    const deleteMember = (id: string) => {
        setMembers(members.filter(m => m.id !== id));
    };

    const recordWeeklyPayment = (memberId: string, year: number, month: number, week: number, amount: number, actionAlias?: string) => {
        const newPayment: WeeklyPayment = {
            id: crypto.randomUUID(),
            memberId,
            actionAlias,
            year,
            month,
            week,
            amount,
            date: new Date().toISOString(),
        };
        // Check if exists and update or add
        const exists = weeklyPayments.find(p => p.memberId === memberId && p.year === year && p.month === month && p.week === week && p.actionAlias === actionAlias);
        if (exists) {
            setWeeklyPayments(weeklyPayments.map(p => p.id === exists.id ? { ...p, amount } : p));
        } else {
            setWeeklyPayments([...weeklyPayments, newPayment]);
        }
    };

    const recordMonthlyFee = (memberId: string, year: number, month: number, amount: number, actionAlias?: string) => {
        const newFee: MonthlyFee = {
            id: crypto.randomUUID(),
            memberId,
            actionAlias,
            year,
            month,
            amount,
            date: new Date().toISOString(),
        };
        const exists = monthlyFees.find(f => f.memberId === memberId && f.year === year && f.month === month && f.actionAlias === actionAlias);
        if (exists) {
            setMonthlyFees(monthlyFees.map(f => f.id === exists.id ? { ...f, amount } : f));
        } else {
            setMonthlyFees([...monthlyFees, newFee]);
        }
    };

    const addActivity = (activityData: Omit<Activity, 'id'>) => {
        const newActivity: Activity = {
            ...activityData,
            id: crypto.randomUUID(),
        };
        setActivities([...activities, newActivity]);

        // Initialize member participation (per alias)
        const newMemberActivities = members.flatMap(m => {
            const identities = (m.aliases && m.aliases.length > 0)
                ? m.aliases.map(alias => ({ memberId: m.id, actionAlias: alias }))
                : [{ memberId: m.id, actionAlias: undefined }];

            return identities.map(identity => ({
                id: crypto.randomUUID(),
                activityId: newActivity.id,
                memberId: m.id,
                actionAlias: identity.actionAlias,
                ticketsSold: 0,
                ticketsReturned: 0,
                amountPaid: 0,
                fullyPaid: false,
            }));
        });
        setMemberActivities([...memberActivities, ...newMemberActivities]);
    };

    const updateMemberActivity = (data: MemberActivity) => {
        setMemberActivities(memberActivities.map(ma => ma.id === data.id ? data : ma));
    };

    const updateActivity = (id: string, data: Partial<Activity>) => {
        setActivities(activities.map(a => a.id === id ? { ...a, ...data } : a));
    };

    const deleteActivity = (id: string) => {
        setActivities(activities.filter(a => a.id !== id));
        setMemberActivities(memberActivities.filter(ma => ma.activityId !== id));
    };

    const addLoan = (loanData: Omit<Loan, 'id'>) => {
        const newLoan: Loan = {
            ...loanData,
            id: crypto.randomUUID(),
        };
        setLoans([...loans, newLoan]);
    };

    const updateLoan = (id: string, data: Partial<Loan>) => {
        setLoans(loans.map(l => l.id === id ? { ...l, ...data } : l));
    };

    const deleteLoan = (id: string) => {
        setLoans(loans.filter(l => l.id !== id));
    };

    const addLoanPayment = (loanId: string, amount: number, paymentType: 'principal' | 'interest') => {
        setLoans(loans.map(l => {
            if (l.id === loanId) {
                const newPayment: LoanPayment = {
                    id: crypto.randomUUID(),
                    loanId,
                    amount,
                    paymentType,
                    date: new Date().toISOString(),
                };

                const updatedPayments = [...l.payments, newPayment];
                const totalPaid = updatedPayments.reduce((acc, curr) => acc + curr.amount, 0);

                // Calculate total due (Principal + Interest)
                let currentInterestAmount = (l.amount * l.interestRate) / 100;
                let totalDue = l.amount + currentInterestAmount;

                const isPaid = totalPaid >= totalDue;

                return {
                    ...l,
                    payments: updatedPayments,
                    status: isPaid ? 'paid' : l.status
                };
            }
            return l;
        }));
    };

    const updateLoanPayment = (loanId: string, paymentId: string, amount: number, paymentType: 'principal' | 'interest') => {
        setLoans(loans.map(l => {
            if (l.id === loanId) {
                return {
                    ...l,
                    payments: l.payments.map(p =>
                        p.id === paymentId ? { ...p, amount, paymentType } : p
                    )
                };
            }
            return l;
        }));
    };

    const deleteLoanPayment = (loanId: string, paymentId: string) => {
        setLoans(loans.map(l => {
            if (l.id === loanId) {
                const updatedPayments = l.payments.filter(p => p.id !== paymentId);
                const totalPaid = updatedPayments.reduce((acc, curr) => acc + curr.amount, 0);
                const interestAmount = l.amount * (l.interestRate / 100);
                const totalDue = l.amount + interestAmount;
                const isPaid = totalPaid >= totalDue;

                return {
                    ...l,
                    payments: updatedPayments,
                    status: isPaid ? 'paid' : 'active'
                };
            }
            return l;
        }));
    };

    return (
        <BanquitoContext.Provider value={{
            members, weeklyPayments, monthlyFees, activities, memberActivities, loans,
            users, currentUser,
            login, logout, registerMember, addUser, updateUser, deleteUser,
            addMember, updateMember, deleteMember,
            recordWeeklyPayment, recordMonthlyFee,
            addActivity, updateActivity, deleteActivity, updateMemberActivity,
            addLoan, updateLoan, deleteLoan, addLoanPayment, updateLoanPayment, deleteLoanPayment
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
