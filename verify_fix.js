
const calculateTotalDueNew = (endDateStr, nowStr, amount, interestRate, payments = []) => {
    const now = new Date(nowStr);
    const endDate = new Date(endDateStr);

    // Logic from the updated Loans.tsx
    let overdueInterest = 0;
    let breakdown = [];
    let currentDate = new Date(endDate); // Start at Due Date

    // Iterate while the milestone date is strictly before 'now'
    while (currentDate < now) {
        // Simplified payment check (assuming empty payments for this test)
        const remainingPrincipalAtCutoff = amount;

        const monthInterest = remainingPrincipalAtCutoff * (interestRate / 100);
        overdueInterest += monthInterest;

        // Move to next month
        currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return overdueInterest;
};

// Test Case 1: Just expired (14 days past due)
// Due: Dec 30, 2025. Now: Jan 14, 2026.
// Expectation: 1 month of interest charged (period Dec 30 - Jan 30 started)
const result1 = calculateTotalDueNew('2025-12-30T00:00:00', '2026-01-14T00:00:00', 100, 10);
console.log("Test 1 (14 days late): Expected > 0. Got:", result1);

// Test Case 2: Not expired yet
// Due: Jan 20, 2026. Now: Jan 14, 2026.
const result2 = calculateTotalDueNew('2026-01-20T00:00:00', '2026-01-14T00:00:00', 100, 10);
console.log("Test 2 (Not late): Expected 0. Got:", result2);

// Test Case 3: Expired exactly 1 month + 1 day
// Due: Dec 13, 2025. Now: Jan 14, 2026.
// Dec 13 -> Jan 13 (1 month). Jan 13 < Jan 14 (2nd month started).
// Expectation: 2 months interest?
// Iter 1: Dec 13 < Jan 14. Charge. Next: Jan 13.
// Iter 2: Jan 13 < Jan 14. Charge. Next: Feb 13.
// Iter 3: Feb 13 < Jan 14. Stop.
// Total: 2 charges.
const result3 = calculateTotalDueNew('2025-12-13T00:00:00', '2026-01-14T00:00:00', 100, 10);
console.log("Test 3 (32 days late): Expected 20. Got:", result3);
