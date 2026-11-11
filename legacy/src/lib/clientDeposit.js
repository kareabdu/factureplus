import { Customer, ClientDeposit } from "@/entities/all";

// Trouve un client par son nom (correspondance exacte, comme le fait le sélecteur client)
export async function findCustomerByName(name) {
  if (!name) return null;
  try {
    const list = await Customer.filter({ name });
    return list[0] || null;
  } catch {
    return null;
  }
}

// Impute un montant sur les acomptes actifs du client (FIFO par date croissante).
// Retourne la liste des acomptes consommés : [{ deposit_id, amount }]
export async function consumeDeposit(customerName, amount) {
  if (!customerName || !amount || amount <= 0) return [];
  const cust = await findCustomerByName(customerName);
  if (!cust) return [];
  const deposits = (await ClientDeposit.filter({ customer_id: cust.id, status: "active" }))
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  let remaining = amount;
  const consumed = [];
  for (const d of deposits) {
    if (remaining <= 0) break;
    const avail = (Number(d.amount) || 0) - (Number(d.used_amount) || 0);
    if (avail <= 0) continue;
    const take = Math.min(avail, remaining);
    const newUsed = (Number(d.used_amount) || 0) + take;
    const newRemaining = (Number(d.amount) || 0) - newUsed;
    await ClientDeposit.update(d.id, {
      used_amount: newUsed,
      status: newRemaining <= 0 ? "used" : "active",
    });
    consumed.push({ deposit_id: d.id, amount: take });
    remaining -= take;
  }
  return consumed;
}

// Annule une imputation précédemment enregistrée (rembourse les acomptes consommés).
export async function refundDeposit(consumed) {
  if (!consumed || !consumed.length) return;
  for (const c of consumed) {
    const list = await ClientDeposit.filter({ id: c.deposit_id });
    const d = list[0];
    if (!d) continue;
    const newUsed = Math.max(0, (Number(d.used_amount) || 0) - c.amount);
    await ClientDeposit.update(d.id, {
      used_amount: newUsed,
      status: newUsed <= 0 ? "active" : d.status,
    });
  }
}

// Calcule le solde d'acompte disponible pour un client (somme des acomptes actifs)
export async function getAvailableDeposit(customerName) {
  if (!customerName) return 0;
  const cust = await findCustomerByName(customerName);
  if (!cust) return 0;
  const deposits = await ClientDeposit.filter({ customer_id: cust.id, status: "active" });
  return deposits.reduce(
    (s, d) => s + ((Number(d.amount) || 0) - (Number(d.used_amount) || 0)),
    0
  );
}