// ASG Portal settings the owner may change (no build step: edit, commit, done).
// Contest targets are per calendar year. Amounts are TPC (total premium contribution, yearly).
window.ASG_CONFIG = {
  contest: {
    year: 2026,
    targets: [
      { id: 'pwp', label: 'Prudential Wealth Planner', short: 'PWP', tpc: 125000 },
      { id: 'star', label: 'Star Club', short: 'Star Club', tpc: 280000 }
    ],
    // Used only for the "≈ N cases" hint on Home.
    averageCaseTpc: 2500
  },
  features: {
    // Owner-only "Delete customer". Stays off until the Worker has the delete endpoint.
    deleteCustomer: false
  }
};
