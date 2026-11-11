import React, { useState, useEffect } from "react";
import { BankAccount, BankTransaction } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Plus, Wallet, Landmark, ArrowDownCircle, ArrowUpCircle, Scale, Pencil, Trash2, Building2, List, Check } from "lucide-react";
import { getTeamId } from "@/lib/team";
import { getTeamSettings } from "@/lib/teamSettings";
import { formatAmount } from "@/lib/formatAmount";
import BankAccountModal from "@/components/banque/BankAccountModal";
import BankTransactionModal from "@/components/banque/BankTransactionModal";
import BankTransactionRow from "@/components/banque/BankTransactionRow";
import BankTransactionDesktopTable from "@/components/banque/BankTransactionDesktopTable";
import ReconciliationPanel from "@/components/banque/ReconciliationPanel";

export default function Banque() {
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [editAccount, setEditAccount] = useState(null);
  const [editTx, setEditTx] = useState(null);
  const [selectedAccountId, setSelectedAccountId] = useState("all");
  const [currencySymbol, setCurrencySymbol] = useState("CFA");
  const [tab, setTab] = useState("operations");

  useEffect(() => {
    loadData();
    getTeamSettings().then((s) => { if (s?.currency_symbol) setCurrencySymbol(s.currency_symbol); }).catch(() => {});
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [accs, txs] = await Promise.all([
        BankAccount.list("-created_date"),
        BankTransaction.list("-date", 200),
      ]);
      setAccounts(Array.isArray(accs) ? accs : []);
      setTransactions(Array.isArray(txs) ? txs : []);
    } finally {
      setLoading(false);
    }
  };

  const computeBalance = (accountId) => {
    const acc = accounts.find((a) => a.id === accountId);
    const initial = acc?.initial_balance || 0;
    const txs = transactions.filter((t) => t.account_id === accountId);
    return txs.reduce((sum, t) => sum + (t.type === "credit" ? 1 : -1) * (Number(t.amount) || 0), initial);
  };

  const totalBalance = accounts.reduce((sum, a) => sum + computeBalance(a.id), 0);

  const filteredTx = selectedAccountId === "all"
    ? transactions
    : transactions.filter((t) => t.account_id === selectedAccountId);

  const totalCredit = filteredTx.filter((t) => t.type === "credit").reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const totalDebit = filteredTx.filter((t) => t.type === "debit").reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const netFlow = totalCredit - totalDebit;

  const handleSaveAccount = async (data) => {
    const team_id = await getTeamId();
    if (editAccount?.id) {
      await BankAccount.update(editAccount.id, { ...data, team_id });
    } else {
      await BankAccount.create({ ...data, team_id });
    }
    setAccountModalOpen(false);
    setEditAccount(null);
    await loadData();
  };

  const handleDeleteAccount = async (acc) => {
    if (!confirm(`Supprimer le compte "${acc.name}" ? Les opérations liées seront aussi supprimées.`)) return;
    await BankTransaction.deleteMany({ account_id: acc.id });
    await BankAccount.delete(acc.id);
    if (selectedAccountId === acc.id) setSelectedAccountId("all");
    await loadData();
  };

  const handleSaveTx = async (data) => {
    const team_id = await getTeamId();
    const s = await getTeamSettings().catch(() => ({}));
    const acc = accounts.find((a) => a.id === data.account_id);
    const payload = {
      ...data,
      account_name: acc?.name || "",
      currency: s?.currency || "XOF",
      currency_symbol: s?.currency_symbol || "CFA",
      team_id,
    };
    if (editTx?.id) {
      await BankTransaction.update(editTx.id, payload);
    } else {
      await BankTransaction.create(payload);
    }
    setTxModalOpen(false);
    setEditTx(null);
    await loadData();
  };

  const handleDeleteTx = async (tx) => {
    await BankTransaction.delete(tx.id);
    setTransactions((prev) => prev.filter((x) => x.id !== tx.id));
  };

  const patchTx = (id, patch) => {
    setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };

  const openNewTx = () => { setEditTx(null); setTxModalOpen(true); };
  const openEditTx = (tx) => { setEditTx(tx); setTxModalOpen(true); };
  const openNewAccount = () => { setEditAccount(null); setAccountModalOpen(true); };
  const openEditAccount = (acc) => { setEditAccount(acc); setAccountModalOpen(true); };

  const summaryCards = [
    { label: "Solde total", value: formatAmount(totalBalance, currencySymbol), icon: Wallet, color: "#07A43F", bg: "#E6F4EE" },
    { label: "Entrées", value: formatAmount(totalCredit, currencySymbol), icon: ArrowDownCircle, color: "#3A64D4", bg: "#E8EDFB" },
    { label: "Sorties", value: formatAmount(totalDebit, currencySymbol), icon: ArrowUpCircle, color: "#F07E2F", bg: "#FDEEE2" },
    { label: "Flux net", value: formatAmount(netFlow, currencySymbol), icon: Scale, color: netFlow >= 0 ? "#07A43F" : "#DC2626", bg: netFlow >= 0 ? "#E6F4EE" : "#FEE2E2" },
  ];

  return (
    <div className="min-h-screen bg-[#F5F3F2] md:bg-background">
      {/* Desktop header */}
      <div className="hidden md:block pt-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="font-heading text-3xl font-semibold text-foreground">Banque</h1>
            <p className="text-muted-foreground mt-1">
              {accounts.length} compte{accounts.length > 1 ? "s" : ""} · {filteredTx.length} opération{filteredTx.length > 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={openNewAccount}>
              <Building2 className="w-4 h-4 mr-2" /> Compte
            </Button>
            <Button onClick={openNewTx} className="bg-emerald-600 hover:bg-emerald-700 shadow-lg">
              <Plus className="w-4 h-4 mr-2" /> Opération
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        </div>
      ) : accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4">
            <Landmark className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-1">Aucun compte bancaire</h2>
          <p className="text-sm text-muted-foreground mb-6">Créez votre premier compte pour suivre vos flux de trésorerie.</p>
          <Button onClick={openNewAccount} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-4 h-4 mr-2" /> Créer un compte
          </Button>
        </div>
      ) : (
        <div className="md:pt-4 md:pb-8">
          {/* Comptes en cartes */}
          <div className="px-4 md:px-0 pt-3 md:pt-0 pb-3">
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
              <button
                onClick={() => setSelectedAccountId("all")}
                className={`flex-shrink-0 rounded-2xl px-4 py-3 text-left transition-all border ${selectedAccountId === "all" ? "bg-emerald-600 text-white border-emerald-600 shadow-sm" : "bg-white text-foreground border-gray-200"}`}
              >
                <p className="text-[11px] font-medium opacity-80">Tous les comptes</p>
                <p className="text-base font-bold mt-0.5">{formatAmount(totalBalance, currencySymbol)}</p>
              </button>
              {accounts.map((acc) => {
                const balance = computeBalance(acc.id);
                const active = selectedAccountId === acc.id;
                return (
                  <button
                    key={acc.id}
                    onClick={() => setSelectedAccountId(acc.id)}
                    className={`flex-shrink-0 rounded-2xl px-4 py-3 text-left transition-all border min-w-[160px] ${active ? "bg-emerald-600 text-white border-emerald-600 shadow-sm" : "bg-white text-foreground border-gray-200"}`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Landmark className="w-3.5 h-3.5 opacity-70" />
                      <p className="text-[11px] font-medium opacity-80 truncate">{acc.bank_name || acc.name}</p>
                    </div>
                    <p className="text-base font-bold mt-0.5 truncate">{formatAmount(balance, currencySymbol)}</p>
                    <p className="text-[10px] opacity-60 truncate mt-0.5">{acc.name}</p>
                  </button>
                );
              })}
              <button
                onClick={openNewAccount}
                className="flex-shrink-0 rounded-2xl px-4 py-3 border border-dashed border-gray-300 text-gray-400 hover:text-emerald-600 hover:border-emerald-400 transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span className="text-xs font-medium">Compte</span>
              </button>
            </div>
          </div>

          {/* Onglets */}
          <div className="px-4 md:px-0 pb-3">
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-[#EDEAE8] p-1 max-w-md">
              <button
                type="button"
                onClick={() => setTab("operations")}
                className={`h-9 min-h-0 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${tab === "operations" ? "bg-white text-foreground shadow-sm" : "text-gray-500"}`}
              >
                <List className="w-3.5 h-3.5" /> Opérations
              </button>
              <button
                type="button"
                onClick={() => setTab("reconciliation")}
                className={`h-9 min-h-0 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${tab === "reconciliation" ? "bg-white text-foreground shadow-sm" : "text-gray-500"}`}
              >
                <Check className="w-3.5 h-3.5" /> Rapprochement
              </button>
            </div>
          </div>

          {tab === "operations" ? (
            <>
          {/* KPI cards */}
          <div className="px-4 md:px-0 pb-3">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {summaryCards.map((c) => (
                <div key={c.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: c.bg }}>
                    <c.icon className="w-5 h-5" style={{ color: c.color }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500">{c.label}</p>
                    <p className="text-sm font-bold text-foreground truncate">{c.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile add button */}
          <div className="md:hidden px-4 pb-3">
            <Button onClick={openNewTx} className="w-full bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" /> Nouvelle opération
            </Button>
          </div>

          {/* Transactions list */}
          {filteredTx.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Aucune opération enregistrée.
            </div>
          ) : (
            <>
              <div className="lg:hidden md:rounded-2xl md:border md:border-border/60 md:shadow-sm md:overflow-hidden md:bg-card">
                {filteredTx.map((tx) => (
                  <BankTransactionRow key={tx.id} tx={tx} sym={currencySymbol} onEdit={openEditTx} onDelete={handleDeleteTx} />
                ))}
              </div>
              <BankTransactionDesktopTable transactions={filteredTx} sym={currencySymbol} onEdit={openEditTx} onDelete={handleDeleteTx} />
            </>
          )}
            </>
          ) : (
            <ReconciliationPanel
              accounts={accounts}
              transactions={transactions}
              sym={currencySymbol}
              selectedAccountId={selectedAccountId}
              onPatchTx={patchTx}
            />
          )}

          {/* Account management (desktop) */}
          <div className="hidden md:block mt-6">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">Comptes</h3>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {accounts.map((acc) => (
                <div key={acc.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{acc.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{acc.bank_name}</p>
                      {acc.account_number && <p className="text-xs text-muted-foreground mt-1">N° {acc.account_number}</p>}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => openEditAccount(acc)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleDeleteAccount(acc)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-foreground mt-2">{formatAmount(computeBalance(acc.id), currencySymbol)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <BankAccountModal open={accountModalOpen} onClose={() => { setAccountModalOpen(false); setEditAccount(null); }} onSave={handleSaveAccount} initial={editAccount} />
      <BankTransactionModal open={txModalOpen} onClose={() => { setTxModalOpen(false); setEditTx(null); }} onSave={handleSaveTx} initial={editTx} accounts={accounts} />
    </div>
  );
}