/**
 * Pure split-calculation logic, kept separate from React components so it
 * can be unit tested without rendering anything.
 *
 * @param {object} state
 * @param {{id:number, name:string, price:number}[]} state.items
 * @param {{id:number, name:string}[]} state.participants
 * @param {Record<number, Set<number>>} state.assignments - itemId -> set of participant ids
 * @param {number} state.taxPercent
 * @param {number} state.servicePercent
 * @param {number} state.discountAmount - flat rupiah amount
 */
export function calculateSplit(state) {
  const { items, participants, assignments, taxPercent, servicePercent, discountAmount } = state;

  const subtotal = items.reduce((sum, i) => sum + i.price, 0);

  const rawByParticipant = new Map(participants.map((p) => [p.id, 0]));
  items.forEach((item) => {
    const assignees = [...(assignments[item.id] || [])];
    if (assignees.length === 0) return;
    const share = item.price / assignees.length;
    assignees.forEach((pid) => {
      rawByParticipant.set(pid, (rawByParticipant.get(pid) || 0) + share);
    });
  });

  const taxAmount = subtotal * (taxPercent / 100);
  const serviceAmount = subtotal * (servicePercent / 100);
  const clampedDiscount = Math.min(discountAmount, subtotal + taxAmount + serviceAmount);
  const extraTotal = taxAmount + serviceAmount - clampedDiscount;
  const grandTotal = subtotal + taxAmount + serviceAmount - clampedDiscount;

  const results = participants.map((p) => {
    const raw = rawByParticipant.get(p.id) || 0;
    const proportion = subtotal > 0 ? raw / subtotal : 0;
    const final = raw + proportion * extraTotal;
    return { id: p.id, name: p.name, raw, final };
  });

  // Rounding reconciliation: individually rounded shares can drift a
  // rupiah or two away from the rounded grand total. Nudge the largest
  // share so the parts always sum to the same total shown on screen.
  const roundedResults = results.map((r) => ({ ...r, rounded: Math.round(r.final) }));
  const roundedGrandTotal = Math.round(grandTotal);
  const sumRounded = roundedResults.reduce((s, r) => s + r.rounded, 0);
  const diff = roundedGrandTotal - sumRounded;
  if (diff !== 0 && roundedResults.length > 0) {
    const biggest = roundedResults.reduce((a, b) => (b.final > a.final ? b : a));
    biggest.rounded += diff;
  }

  return { results: roundedResults, grandTotal: roundedGrandTotal };
}

export function formatRupiah(n) {
  return "Rp " + Math.round(n).toLocaleString("id-ID");
}
