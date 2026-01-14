import { useState, useEffect, useCallback } from 'react';
import { useBanquito } from '../context/BanquitoContext';
import type { Loan, Activity } from '../types';

export interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    date: string;
    read: boolean;
    link?: string;
}

export const useNotifications = () => {
    const { loans, activities, members, currentUser } = useBanquito();
    const [notifications, setNotifications] = useState<Notification[]>(() => {
        try {
            const saved = localStorage.getItem('banquito_notifications');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    // Persist notifications updates
    useEffect(() => {
        try {
            localStorage.setItem('banquito_notifications', JSON.stringify(notifications));
        } catch (e) {
            console.error("Error saving notifications", e);
        }
    }, [notifications]);

    // Track "Known" items to detect new ones
    useEffect(() => {
        if (!currentUser) return;

        // --- Activities Tracking ---
        const knownActivityIdsStr = localStorage.getItem('known_activity_ids');
        let knownActivityIds: string[] = [];
        try {
            knownActivityIds = knownActivityIdsStr ? JSON.parse(knownActivityIdsStr) : [];
        } catch (e) {
            console.error("Error parsing known_activity_ids", e);
            knownActivityIds = [];
        }

        // If first run (no known activities detected yet), just mark all current as known to avoid spam
        if (knownActivityIds.length === 0 && activities.length > 0) {
            knownActivityIds = activities.map(a => a.id);
            localStorage.setItem('known_activity_ids', JSON.stringify(knownActivityIds));
        } else if (activities.length > 0) {
            // Find new activities
            const newActivities = activities.filter(a => !knownActivityIds.includes(a.id));

            if (newActivities.length > 0) {
                const newNotifs: Notification[] = newActivities.map(a => ({
                    id: `new-activity-${a.id}`,
                    title: '🎉 Nueva Actividad',
                    message: `Se ha creado la actividad "${a.name}". ¡Participa!`,
                    type: 'success',
                    date: new Date().toISOString(),
                    read: false,
                    link: '/activities'
                }));

                setNotifications(prev => [...newNotifs, ...prev]);

                // Update known IDs
                const updatedKnownIds = [...knownActivityIds, ...newActivities.map(a => a.id)];
                localStorage.setItem('known_activity_ids', JSON.stringify(updatedKnownIds));
            }
        }

        // --- Loans Tracking ---
        const knownLoanIdsStr = localStorage.getItem('known_loan_ids');
        let knownLoanIds: string[] = [];
        try {
            knownLoanIds = knownLoanIdsStr ? JSON.parse(knownLoanIdsStr) : [];
        } catch (e) {
            console.error("Error parsing known_loan_ids", e);
            knownLoanIds = [];
        }

        if (knownLoanIds.length === 0 && loans.length > 0) {
            knownLoanIds = loans.map(l => l.id);
            localStorage.setItem('known_loan_ids', JSON.stringify(knownLoanIds));
        } else if (loans.length > 0) {
            const newLoans = loans.filter(l => !knownLoanIds.includes(l.id));

            if (newLoans.length > 0) {
                const newNotifs: Notification[] = newLoans.map(loan => {
                    const member = members.find(m => m.id === loan.memberId);
                    const borrowerName = loan.borrowerType === 'member' ? (member?.name || 'Socio') : loan.clientName;

                    return {
                        id: `new-loan-${loan.id}`,
                        title: '💰 Nuevo Préstamo',
                        message: `Préstamo a ${borrowerName}. Acción: ${loan.actionAlias || 'Principal'}. Monto: $${loan.amount.toFixed(2)}. Interés: ${loan.interestRate}%.`,
                        type: 'info',
                        date: new Date().toISOString(),
                        read: false,
                        link: '/loans'
                    };
                });

                setNotifications(prev => [...newNotifs, ...prev]);

                const updatedKnown = [...knownLoanIds, ...newLoans.map(l => l.id)];
                localStorage.setItem('known_loan_ids', JSON.stringify(updatedKnown));
            }
        }

    }, [activities, loans, members, currentUser]);

    // Check for Due Loans (This is state-based, not event-based, so we regenerate it or check if it exists)
    // Actually, distinct event vs state notifications.
    // The previous implementation calculated "due soon" on the fly.
    // We can keep calculating "due soon" on the fly and MERGE it with stored notifications for display.
    // However, if we want to "read" them, they need to be persistent.
    // For now, let's keep the user's request: "Notify when created".
    // I will primarily handle the "New Creation" notifications here. The "Due" notifications can be kept as transient or added if I want.
    // I'll add the transient "Due" logic here as derived state if needed, but Layout usually handles it.
    // Let's stick to the persistent "New Event" notifications which is what was mostly requested.

    // BUT Layout had "loanNotifications" (due date). I should probably PRESERVE that functionality.
    // I will export a helper to get due loans.

    const dueLoanNotifications = useCallback(() => {
        const now = new Date();
        let relevantLoans = loans.filter(loan => loan.status !== 'paid');

        if (currentUser?.role === 'socio' && currentUser.memberId) {
            relevantLoans = relevantLoans.filter(loan =>
                loan.borrowerType === 'member' && loan.memberId === currentUser.memberId
            );
        }

        return relevantLoans
            .map(loan => {
                const endDate = new Date(loan.endDate);
                const daysUntilDue = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                const isOverdue = daysUntilDue < 0;
                const isDueSoon = daysUntilDue > 0 && daysUntilDue <= 7;

                if (isOverdue || isDueSoon) {
                    const member = loan.borrowerType === 'member' ? members.find(m => m.id === loan.memberId) : null;
                    const borrowerName = loan.borrowerType === 'member' ? (member?.name || 'Socio') : loan.clientName;

                    return {
                        id: `due-loan-${loan.id}`,
                        title: isOverdue ? '⚠️ Préstamo Vencido' : '⏰ Préstamo Vence Pronto',
                        message: `${borrowerName}: Vence el ${new Date(loan.endDate).toLocaleDateString()} (${Math.abs(daysUntilDue)} días ${isOverdue ? 'hace' : 'restantes'})`,
                        type: isOverdue ? 'error' : 'warning',
                        date: loan.endDate,
                        read: false, // These are always "unread" while active essentially
                        link: '/loans'
                    } as Notification;
                }
                return null;
            })
            .filter(Boolean) as Notification[];
    }, [loans, members, currentUser]);

    const markAsRead = (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    };

    const clearAll = () => {
        setNotifications([]);
        localStorage.removeItem('banquito_notifications');
    };

    return {
        notifications,
        dueLoanNotifications: dueLoanNotifications(),
        markAsRead,
        clearAll
    };
};
