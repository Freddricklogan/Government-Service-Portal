/** Benefits pre-screener over the illustrative thresholds in data/services.json. A pre-screen, never a determination. */

export function validateAnswers(a) {
  const p = [];
  if (!(Number.isInteger(a.householdSize) && a.householdSize >= 1 && a.householdSize <= 20)) p.push('Household size must be a whole number from 1 to 20');
  if (!(Number.isFinite(a.monthlyIncome) && a.monthlyIncome >= 0)) p.push('Monthly income must be 0 or more');
  if (typeof a.resident !== 'boolean') p.push('Say whether you live in the city');
  if (a.monthlyRent !== undefined && a.monthlyRent !== null && !(Number.isFinite(a.monthlyRent) && a.monthlyRent >= 0)) p.push('Monthly rent must be 0 or more');
  return p;
}

export function incomeLimit(programme, householdSize) {
  const table = programme.maxMonthlyIncomeByHousehold;
  if (householdSize <= table.length) return table[householdSize - 1];
  return table[table.length - 1] + (householdSize - table.length) * programme.perExtraPerson;
}

/** Returns one row per programme: { id, name, likely, reasons[] }. `likely` is true only when every rule passes. */
export function prescreen(programmes, a) {
  return programmes.map((p) => {
    const reasons = [];
    const limit = incomeLimit(p, a.householdSize);
    if (a.monthlyIncome > limit) reasons.push(`Monthly income $${a.monthlyIncome.toLocaleString()} is above the $${limit.toLocaleString()} limit for a household of ${a.householdSize}`);
    if (p.requiresResident && !a.resident) reasons.push('Applicants must live in the city');
    if (p.requiresRentBurden !== undefined) {
      if (a.monthlyRent === undefined || a.monthlyRent === null) reasons.push('Rent amount needed to check rent burden');
      else if (a.monthlyIncome > 0 && a.monthlyRent / a.monthlyIncome < p.requiresRentBurden) reasons.push(`Rent is ${((a.monthlyRent / a.monthlyIncome) * 100).toFixed(0)}% of income; the programme requires at least ${p.requiresRentBurden * 100}%`);
    }
    return { id: p.id, name: p.name, likely: reasons.length === 0, incomeLimit: limit, reasons };
  });
}
