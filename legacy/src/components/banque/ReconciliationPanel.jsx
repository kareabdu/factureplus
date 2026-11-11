import React, { useState, useEffect, useCallback } from "react";
import { BankAccount, BankTransaction, BankReconciliation } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock, Loader2 } from "lucide-react";
import { getTeamId, getMe } from "@/lib/team";
import { formatAmount } from "@/lib/formatAmount";
import ReconciliationSummary from "@/components/banque/ReconciliationSummary";
import ReconciliationRow from "@/components/banque/ReconciliationRow";
import ReconciliationHistory from "@/components/banque/ReconciliationHistory";
import MatchSuggestionsModal from "@/components/banque/MatchSuggestionsModal";

const today = () => new Date().toISOString().split("T")[0];
const signedAmount = (t) => (t.type === "credit" ? 1 : -1) * (Number(t.amount) || 0);
const round = (n) => Math.round((Number(n) || 0) * 100) / 100;

export default function ReconciliationPanel({ accounts, transactions, sym, selectedAccountId, onPatchTx }) {
  const [accountId, setAccountId] = useState(
    selectedAccountId && selectedAccountId !== "all" ? selectedAccountId : accounts[0]?.id || ""
  );
  const [statementDate, setStatementDate] = useState(today());
  const [statementBalance, setStatementBalance] = useState("");
  const [notes, setNotes] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [matchTx, setMatchTx] = useState(null);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState([]);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    getMe().then((u) => setUserName(u?.full_name || u?.email || "")).catch(() => {});
  }, []);

  useEffect(() => {
    const acc = accounts.find((a) => a.id === accountId);
    if (!acc) return;
    setStatementBalance(acc.statement_balance != null ? String(acc.statement_balance) : "");
    setStatementDate(acc.statement_date ? String(acc.statement_date).split("T")[0] : today());
    setNotes("");
  }, [accountId]);

  const loadHistory = useCallback(async () => {
    if (!accountId) {
      setHistory([]);
      return;
    }
    const page = await BankReconciliation.filter(
      { account_id: accountId },
      { sort: "-statement_date", limit: 20 }
    );
    setHistory(page.items || []);
  }, [accountId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const acc = accounts.find((a) => a.id === accountId);
  const initial = Number(acc?.initial_balance) || 0;

  const accTx = transactions.filter(
    (t) => t.account_id === accountId && (!statementDate || String(t.date || "").slice(0, 10) <= statementDate)
  );
  const bookBalance = round(initial + accTx.reduce((s, t) => s + signedAmount(t), 0));
  const pointedBalance = round(
    initial + accTx.filter((t) => t.reconciled).reduce((s, t) => s + signedAmount(t), 0)
  );
  const unreconciled = accTx.filter((t) => !t.reconciled);
  const unreconciledNet = round(unreconciled.reduce((s, t) => s + signedAmount(t), 0));

  const hasStatement = statementBalance !== "";
  const statement = round(Number(statementBalance) || 0);
  const gap = round(statement - pointedBalance);
  const balanced = Math.abs(gap) < 0.5;

  const visible = (showAll ? accTx : unreconciled)
    .slice()
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

  const canClose = hasStatement && !!accountId && (balanced || notes.trim().length > 0) && !saving;

  const handleToggle = async (tx) => {
    const next = !tx.reconciled;
    const patch = next ? { reconciled: true, reconciled_date: today() } : { reconciled: false };
    onPatchTx(tx.id, patch);
    await BankTransaction.update(tx.id, patch);
  };

  const handlePick = async (doc) => {
    const tx = matchTx;
    if (!tx) return;
    const patch = {
      matched_type: doc.type,
      matched_id: doc.id,
      matched_label: doc.label,
      reconciled: true,
      reconciled_date: today(),
    };
    onPatchTx(tx.id, patch);
    setMatchTx(null);
    await BankTransaction.update(tx.id, patch);
  };

  const handleDetach = async () => {
    const tx = matchTx;
    if (!tx) return;
    const patch = { matched_type: "none", matched_id: "", matched_label: "" };
    onPatchTx(tx.id, patch);
    setMatchTx(null);
    await BankTransaction.update(tx.id, patch);
  };

  const handleClose = async () => {
    if (!canClose) return;
    setSaving(true);
    try {
      const team_id = await getTeamId();
      await BankReconciliation.create({
        account_id: accountId,
        account_name: acc?.name || "",
        statement_date: statementDate,
        statement_balance: statement,
        book_balance: bookBalance,
        pointed_balance: pointedBalance,
        difference: gap,
        unreconciled_count: unreconciled.length,
        unreconciled_balance: unreconciledNet,
        notes: notes.trim(),
        user_name: userName,
        team_id,
      });
      await BankAccount.update(accountId, {
        statement_balance: statement,
        statement_date: statementDate,
        last_reconciled_date: today(),
      });
      setNotes("");
      await loadHistory();
    } finally {
      setSaving(false);
    }
  };

  if (accounts.length === 0) {
    return (
      <p className="text-center py-12 text-sm text-muted-foreground">
        Créez un compte bancaire pour commencer un rapprochement.
      </p>
    );
  }

  return (
    <div className="px-4 md:px-0 pb-6 space-y-3">
      {/* Relevé bancaire */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Compte</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Sélectionner un compte" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Fin du relevé</Label>
            <Input
              type="date"
              value={statementDate}
              onChange={(e) => setStatementDate(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Solde du relevé</Label>
            <Input
              type="number"
              inputMode="decimal"
              value={statementBalance}
              onChange={(e) => setStatementBalance(e.target.value)}
              placeholder="0"
              className="h-9 text-sm"
            />
          </div>
        </div>
      </div>

      <ReconciliationSummary
        bookBalance={bookBalance}
        pointedBalance={pointedBalance}
        statementBalance={statement}
        gap={gap}
        unreconciledCount={unreconciled.length}
        unreconciledNet={unreconciledNet}
        hasStatement={hasStatement}
        sym={sym}
      />

      {/* Opérations à pointer */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border/60">
          <h3 className="text-sm font-semibold text-foreground">Opérations</h3>
          <div className="flex gap-1 rounded-lg bg-[#F5F3F2] p-0.5">
            <button
              type="button"
              onClick={() => setShowAll(false)}
              className={`h-7 min-h-0 px-2.5 rounded-md text-[11px] font-medium ${!showAll ? "bg-white text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              Non pointées ({unreconciled.length})
            </button>
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className={`h-7 min-h-0 px-2.5 rounded-md text-[11px] font-medium ${showAll ? "bg-white text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              Toutes ({accTx.length})
            </button>
          </div>
        </div>

        {visible.length === 0 ? (
          <p className="text-center py-10 text-sm text-muted-foreground">
            {showAll ? "Aucune opération sur la période." : "Toutes les opérations sont pointées."}
          </p>
        ) : (
          visible.map((tx) => (
            <ReconciliationRow
              key={tx.id}
              tx={tx}
              sym={sym}
              onToggle={handleToggle}
              onMatch={setMatchTx}
            />
          ))
        )}
      </div>

      {/* Clôture */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Clôturer le rapprochement</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Enregistre le relevé du {statementDate} et son écart dans l'historique.
          </p>
        </div>
        {hasStatement && !balanced && (
          <div className="space-y-1">
            <Label className="text-xs">Justification de l'écart ({formatAmount(gap, sym)})</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: frais bancaires non encore enregistrés"
              rows={2}
              className="text-sm resize-none"
            />
          </div>
        )}
        {balanced && hasStatement && (
          <p className="text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
            Le relevé est équilibré : vous pouvez clôturer.
          </p>
        )}
        <Button
          onClick={handleClose}
          disabled={!canClose}
          className="w-full bg-emerald-600 hover:bg-emerald-700"
        >
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
          Clôturer
        </Button>
        {!hasStatement && (
          <p className="text-[11px] text-muted-foreground text-center">
            Indiquez le solde du relevé pour clôturer.
          </p>
        )}
      </div>

      <ReconciliationHistory items={history} sym={sym} />

      <MatchSuggestionsModal
        open={!!matchTx}
        tx={matchTx}
        transactions={transactions}
        sym={sym}
        onClose={() => setMatchTx(null)}
        onPick={handlePick}
        onDetach={handleDetach}
      />
    </div>
  );
}