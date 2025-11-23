export interface Member {
    id: string;
    name: string;
    alias?: string;
    phone?: string;
    active: boolean;
    joinedDate: string;
}

export interface WeeklyPayment {
    id: string;
    memberId: string;
    year: number;
    month: number; // 0-11
    week: number; // 1-5
    amount: number; // Usually 7
    date: string;
}

export interface MonthlyFee {
    id: string;
    memberId: string;
    year: number;
    month: number;
    amount: number; // Usually 5
    date: string;
}

export interface Activity {
    id: string;
    name: string;
    date: string;
    description?: string;
    ticketPrice: number; // Price per ticket
    totalTicketsPerMember: number; // Usually 10
}

export interface MemberActivity {
    id: string;
    activityId: string;
    memberId: string;
    ticketsSold: number;
    ticketsReturned: number;
    amountPaid: number;
    fullyPaid: boolean;
}

export interface Loan {
    id: string;
    memberId?: string; // Optional if external
    clientName?: string; // For external borrowers
    borrowerType: 'member' | 'external';
    amount: number;
    interestRate: number; // Percentage
    startDate: string;
    endDate: string;
    status: 'active' | 'paid' | 'overdue';
    payments: LoanPayment[];
}

export interface LoanPayment {
    id: string;
    loanId: string;
    amount: number;
    paymentType: 'principal' | 'interest'; // Where the payment is applied
    date: string;
}

export type Permission = 'manage_payments' | 'manage_loans' | 'manage_activities' | 'manage_members' | 'admin';

export interface User {
    id: string;
    username: string;
    password?: string; // In a real app, this would be hashed. Here we might store it plain or simple hash for demo.
    name: string;
    role: 'admin' | 'user';
    permissions: Permission[];
    active: boolean;
}
