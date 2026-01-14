
const calculateTotalDue = (endDateStr, nowStr, amount, interestRate, payments = []) => {
    const totalPaid = payments.reduce((acc, curr) => acc + curr.amount, 0);
    const now = new Date(nowStr); // Simulate "now"
    const endDate = new Date(endDateStr);
    const baseInterest = amount * (interestRate / 100);

    console.log(`Now: ${now.toISOString()}`);
    console.log(`EndDate: ${endDate.toISOString()}`);

    if (now <= endDate) {
        return { overdueInterest: 0 };
    }

    // CURRENT LOGIC (Broken?)
    let overdueInterest = 0;
    let currentDate = new Date(endDate);
    currentDate.setMonth(currentDate.getMonth() + 1);

    while (currentDate <= now) {
        // Simplified calculation assuming no partial payments involved for this test
        const monthInterest = amount * (interestRate / 100);
        overdueInterest += monthInterest;
        currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return { overdueInterest };
};

const calculateTotalDueProposed = (endDateStr, nowStr, amount, interestRate, payments = []) => {
    const now = new Date(nowStr);
    const endDate = new Date(endDateStr);

    if (now <= endDate) return 0;

    let overdueInterest = 0;
    let periodStart = new Date(endDate); // Start checking from due date

    // Loop for every Started month
    while (periodStart < now) {
        // Simply add interest for this period
        const monthInterest = amount * (interestRate / 100);
        overdueInterest += monthInterest;

        periodStart.setMonth(periodStart.getMonth() + 1);
    }

    return overdueInterest;
};

// Test Case
// Due: Dec 30, 2025
// Now: Jan 14, 2026
// Amount: 100, Rate: 10%
const currentResult = calculateTotalDue('2025-12-30T00:00:00', '2026-01-14T00:00:00', 100, 10);
console.log("Current Logic Result:", currentResult.overdueInterest);

const proposedResult = calculateTotalDueProposed('2025-12-30T00:00:00', '2026-01-14T00:00:00', 100, 10);
console.log("Proposed Logic Result:", proposedResult);
