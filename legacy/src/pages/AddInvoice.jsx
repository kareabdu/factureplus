import React, { useState, useEffect, useRef, useMemo } from "react";
import { Invoice, InvoiceItem, Settings, Product, Location, Livreur } from "@/entities/all";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MoreVertical, Check, Share2, Copy, Trash2, CreditCard, CheckCircle, XCircle, Eye, Pencil, Truck, Ban, RotateCcw } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { formatAmount } from "@/lib/formatAmount";
import InvoiceDocument from "@/components/InvoiceDocument";

import EditorHeader from "@/components/invoice-editor/EditorHeader";
import MetaCard from "@/components/invoice-editor/MetaCard";
import ClientCard from "@/components/invoice-editor/ClientCard";
import ItemsCard from "@/components/invoice-editor/ItemsCard";
import SummaryCard from "@/components/invoice-editor/SummaryCard";
import PaymentDialog from "@/components/invoice-editor/PaymentDialog";
import FloatingActionBar from "@/components/invoice-editor/FloatingActionBar";
import ItemModal from "@/components/invoice-editor/ItemModal";
import ImagesCard from "@/components/invoice-editor/ImagesCard";
import LivreurCard from "@/components/invoice-editor/LivreurCard";
import { getTeamId, getMe } from "@/lib/team";
import { getTeamSettings } from "@/lib/teamSettings";
import { getProducts } from "@/lib/productCache";
import { logActivity } from "@/lib/activity";
import { generateDocNumber, nextNumberField } from "@/lib/docNumber";
import { restoreStockByReference } from "@/lib/stockRestore";
import { buildBLDisplayRows } from "@/lib/stockAllocations";
import { syncInvoiceStock, itemsStockKey } from "@/lib/invoiceStockSync";
import { computeTax } from "@/lib/tax";
import { consumeDeposit, refundDeposit, getAvailableDeposit } from "@/lib/clientDeposit";
import { deductLivreurStock, refundLivreurStock, checkLivreurStock, applyBLStatusChange } from "@/lib/livreurStock";
import { base44 } from "@/api/base44Client";
import { isBlEnabled, canCreateInvoice } from "@/lib/planLimits";
import TrialGate from "@/components/TrialGate";
import { toast } from "@/components/ui/use-toast";


const WORKING_KEY = (t) => `working_invoice_id_${t}`;
const PICK_KEY = (t) => `picked_customer_${t}`;
const today = () => new Date().toISOString().split("T")[0];

const TABS = [
  { key: "edit", label: "Modifier" },
  { key: "preview", label: "Aperçu" },
  { key: "history", label: "Historique" },
];

export default function AddInvoice() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const docType = searchParams.get("type") || "invoice";
  const editIdParam = searchParams.get("id");
  const livreurIdParam = searchParams.get("livreur_id");
  const livreurNameParam = searchParams.get("livreur_name");
  const isBL = docType === "bl";

  const [invoiceId, setInvoiceId] = useState(null);
  const [settings, setSettings] = useState(null);
  const [formData, setFormData] = useState({
    invoice_number: "", date: today(), customer_name: "", customer_phone: "",
    billing_address: "", type: docType, deposit_amount: 0, payment_terms: "",
    due_date: "", currency: "XOF", currency_symbol: "CFA", notes: "", status: "draft", payments: [], images: [],
    livreur_id: "", livreur_name: "",
  });
  const [items, setItems] = useState([]);
  const [activeTab, setActiveTab] = useState("edit");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [availableDeposit, setAvailableDeposit] = useState(0);
  const [itemModal, setItemModal] = useState(null);
  const [stockDeducted, setStockDeducted] = useState(false);
  const [itemsChanged, setItemsChanged] = useState(false);
  const [scrollSignal, setScrollSignal] = useState(0);
  const [locations, setLocations] = useState([]);
  const [products, setProducts] = useState([]);
  const [livreurs, setLivreurs] = useState([]);
  const dirtyRef = useRef(false);
  const loadedRef = useRef(false);
  const existsRef = useRef(false);
  const lastStockKeyRef = useRef("");
  const syncChainRef = useRef(Promise.resolve());
  const creatingRef = useRef(null);
  const backedOutRef = useRef(false);
  const formDataRef = useRef(formData);
  const itemsRef = useRef(items);
  const navigatingToSubPageRef = useRef(false);

  const [initError, setInitError] = useState(null);

  useEffect(() => { init(); }, []);
  useEffect(() => { formDataRef.current = formData; }, [formData]);
  useEffect(() => { itemsRef.current = items; }, [items]);

  const init = async () => {
    try {
    const [sObj, me] = await Promise.all([
      getTeamSettings(),
      getMe(),
    ]);
    const settingsObj = sObj || {};
    setSettings(settingsObj);

    if (docType === "bl" && !isBlEnabled(me)) {
      alert("La génération de bons de livraison n'est pas disponible sur votre plan. Passez au plan Mensuel ou Annuel.");
      navigate(createPageUrl("Invoices"));
      return;
    }

    let id = editIdParam;
    let fromWorking = false;
    if (!id) {
      id = sessionStorage.getItem(WORKING_KEY(docType));
      if (id) fromWorking = true;
    }
    // Arrière-plan : produits + emplacements (non bloquant, partagé par les deux chemins)
    Promise.all([Location.list(), getProducts(), isBL ? Livreur.list("-created_date") : Promise.resolve([])]).then(([locs, prods, livs]) => {
      setLocations(locs);
      setProducts(prods);
      if (isBL) setLivreurs(livs);
    }).catch(() => {});

    if (id) {
      // --- Édition d'un document existant (chargement bloquant, chemin critique) ---
      const [invList, itemsList] = await Promise.all([
        Invoice.filter({ id }),
        InvoiceItem.filter({ invoice_id: id }, "created_date"),
      ]);
      let inv = invList[0] || null;
      if (!inv) {
        if (fromWorking) sessionStorage.removeItem(WORKING_KEY(docType));
        if (editIdParam) {
          window.history.replaceState({}, document.title, `${createPageUrl("AddInvoice")}?type=${docType}`);
        }
        id = null;
      } else {
        setInvoiceId(id);
        existsRef.current = true;
        setFormData({
          invoice_number: inv.invoice_number || "",
          date: inv.date ? inv.date.split("T")[0] : today(),
          customer_name: inv.customer_name || "",
          customer_phone: inv.customer_phone || "",
          billing_address: inv.billing_address || "",
          type: inv.type || docType,
          deposit_amount: inv.deposit_amount || 0,
          payment_terms: inv.payment_terms || "",
          due_date: inv.due_date ? inv.due_date.split("T")[0] : "",
          currency: inv.currency || "XOF",
          currency_symbol: inv.currency_symbol || "CFA",
          notes: inv.notes || "",
          status: inv.status || "draft",
          payments: inv.payments || [],
          images: inv.images || [],
          livreur_id: inv.livreur_id || "",
          livreur_name: inv.livreur_name || "",
        });
        setStockDeducted(!!inv.stock_deducted);
        const mapped = itemsList.map((it) => ({ ...it, total_price: it.total_price || (it.unit_price || 0) * (it.quantity || 0) }));
        setItems(mapped);
        // Défilement auto si un nouvel article a été ajouté depuis AddInvoiceItem (mobile)
        const prevCount = parseInt(sessionStorage.getItem(`invoice_prev_count_${docType}`) || "0", 10);
        if (prevCount > 0 && mapped.length > prevCount) {
          setScrollSignal((s) => s + 1);
        }
        sessionStorage.removeItem(`invoice_prev_count_${docType}`);
        // Rapprochement du stock à l'ouverture d'une facture existante (idempotent, arrière-plan)
        if (docType === "invoice" && mapped.length > 0) {
          syncChainRef.current = syncChainRef.current
            .then(() => syncInvoiceStock({ invoiceId: id, invoiceNumber: inv.invoice_number, items: mapped, products: [] }))
            .then(() => { lastStockKeyRef.current = itemsStockKey(mapped); })
            .catch(() => {});
        } else {
          lastStockKeyRef.current = itemsStockKey(mapped);
        }
        loadedRef.current = true;
        setLoading(false);
      }
    }

    if (!id) {
      // --- Nouveau document : offline-first ---
      // L'éditeur s'affiche immédiatement avec un brouillon local (numéro, devise,
      // date générés à partir des settings). La création serveur (Invoice.create +
      // incrément du compteur) se fait en arrière-plan — l'utilisateur ne voit
      // plus de spinner pendant la création.
      const check = docType === "invoice" ? await canCreateInvoice(me) : { ok: true };
      if (docType === "invoice" && !check.ok) {
        alert(`Vous avez atteint la limite de ${check.limit} factures de votre plan. Passez à un plan supérieur.`);
        navigate(createPageUrl("Subscription"));
        return;
      }
      const number = generateNumber(settingsObj, docType);
      const due = new Date(); due.setDate(due.getDate() + 7);
      setFormData({
        invoice_number: number, date: today(), customer_name: "Client de passage",
        customer_phone: "", billing_address: "", type: docType, deposit_amount: 0,
        payment_terms: "", due_date: due.toISOString().split("T")[0],
        currency: settingsObj.currency || "XOF", currency_symbol: settingsObj.currency_symbol || "CFA",
        notes: "", status: "draft", payments: [], images: [],
        livreur_id: livreurIdParam || "", livreur_name: livreurNameParam || "",
      });
      setItems([]);
      lastStockKeyRef.current = itemsStockKey([]);
      loadedRef.current = true;
      setLoading(false);

      // Création serveur en arrière-plan (non bloquant)
      const field = nextNumberField(docType);
      creatingRef.current = (async () => {
        const teamId = await getTeamId();
        const [draft] = await Promise.all([
          Invoice.create({
            invoice_number: number, date: today(), type: docType, status: "draft",
            customer_name: "Client de passage", total_amount: 0, balance_due: 0, deposit_amount: 0,
            currency: settingsObj.currency || "XOF", currency_symbol: settingsObj.currency_symbol || "CFA",
            due_date: due.toISOString().split("T")[0], payment_terms: "",
            livreur_id: livreurIdParam || "", livreur_name: livreurNameParam || "",
            team_id: teamId,
          }),
          settingsObj.id
            ? Settings.update(settingsObj.id, { [field]: (settingsObj[field] || 1) + 1 })
            : Promise.resolve(),
        ]);
        setInvoiceId(draft.id);
        existsRef.current = true;
        if (!backedOutRef.current) sessionStorage.setItem(WORKING_KEY(docType), draft.id);
        const createLabel = docType === "proforma" ? "Devis" : docType === "bl" ? "Bon de livraison" : "Facture";
        logActivity({ action_type: "create", entity_type: docType, entity_id: draft.id, description: `${createLabel} créé(e) en brouillon`, metadata: { number } });
        return draft;
      })().catch((e) => {
        console.error("AddInvoice: échec création brouillon", e);
        toast({ title: "Erreur", description: "Impossible de créer le brouillon. Vérifiez votre connexion.", variant: "destructive" });
        throw e;
      });
    }

    const picked = sessionStorage.getItem(PICK_KEY(docType));
    if (picked) {
      sessionStorage.removeItem(PICK_KEY(docType));
      const c = JSON.parse(picked);
      setFormData((prev) => ({ ...prev, customer_name: c.name || "", customer_phone: c.phone || "", billing_address: c.address || "" }));
      dirtyRef.current = true;
    }
    } catch (e) {
      console.error("AddInvoice: échec d'initialisation", e);
      setInitError(e);
    } finally {
      setLoading(false);
    }
  };

  const generateNumber = (s, type) => generateDocNumber(s, type);

  // Attend que le brouillon soit créé côté serveur (offline-first) avant
  // d'exécuter une action nécessitant l'ID réel (ajout d'article, sauvegarde…).
  const ensureCreated = async () => {
    if (invoiceId) return invoiceId;
    if (creatingRef.current) {
      try { const draft = await creatingRef.current; return draft.id; } catch { return null; }
    }
    return invoiceId;
  };

  const subtotal = items.reduce((s, it) => s + (it.total_price || 0), 0);
  const taxableSubtotal = items.filter((it) => it.taxable !== false).reduce((s, it) => s + (it.total_price || 0), 0);
  const taxInfo = computeTax(settings, subtotal, taxableSubtotal);
  const total = taxInfo ? taxInfo.total : subtotal;
  const payments = parseFloat(formData.deposit_amount) || 0;
  const balanceDue = total - payments;
  const sym = formData.currency_symbol || "CFA";
  const isPaid = formData.status === "paid";
  // Pour l'aperçu BL : résout les allocations manquantes depuis les emplacements du produit
  const previewItems = useMemo(() => {
    if (!isBL) return items;
    const byId = new Map(products.map((p) => [p.id, p]));
    return items.map((it) => ({ ...it, _blAllocRows: buildBLDisplayRows(it, byId.get(it.product_id), locations) }));
  }, [items, products, locations, isBL]);
  const isProforma = docType === "proforma";
  const isReturn = docType === "return";
  // Les factures annulées et les bons de retour sont en lecture seule.
  const isReadOnly = isReturn || (docType === "invoice" && formData.status === "cancelled");
  // Les bons de livraison sont modifiables tant qu'ils sont en brouillon
  // (ajout d'articles, client, notes, images). Verrouillé une fois livré ou annulé.
  // L'action « Marquer livré » reste disponible (conditionnée au statut, pas au verrouillage).
  const isFieldLocked = isReadOnly
    || (isBL && (formData.status === "sent" || formData.status === "cancelled"))
    || (isProforma && (formData.status === "refused" || formData.status === "accepted"));
  const isLocked = isReadOnly
    || (isBL && formData.status === "cancelled")
    || (isProforma && (formData.status === "refused" || formData.status === "accepted"));

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    dirtyRef.current = true;
  };

  // Auto-save invoice fields (debounced)
  useEffect(() => {
    if (!loadedRef.current || !invoiceId || !existsRef.current || !dirtyRef.current) return;
    const t = setTimeout(async () => {
      setSaving(true);
      try {
        await Invoice.update(invoiceId, {
          customer_name: formData.customer_name,
          customer_phone: formData.customer_phone,
          billing_address: formData.billing_address,
          date: formData.date,
          due_date: formData.due_date,
          payment_terms: formData.payment_terms,
          notes: formData.notes,
          type: docType,
          currency: formData.currency,
          currency_symbol: formData.currency_symbol,
          images: formData.images,
          livreur_id: formData.livreur_id,
          livreur_name: formData.livreur_name,
        });
        dirtyRef.current = false;
      } catch (e) {
        // La facture n'existe plus (supprimée entre-temps) : on arrête les sauvegardes
        // automatiques pour éviter les erreurs « Invoice not found ».
        existsRef.current = false;
        clearWorking();
      } finally { setSaving(false); }
    }, 900);
    return () => clearTimeout(t);
  }, [formData, invoiceId, docType]);

  // Auto-save totals when items change
  useEffect(() => {
    if (!loadedRef.current || !invoiceId || !existsRef.current) return;
    const sub = items.reduce((s, it) => s + (it.total_price || 0), 0);
    const taxSub = items.filter((it) => it.taxable !== false).reduce((s, it) => s + (it.total_price || 0), 0);
    const ti = computeTax(settings, sub, taxSub);
    const tot = ti ? ti.total : sub;
    const pay = parseFloat(formData.deposit_amount) || 0;
    const t = setTimeout(async () => {
      try {
        await Invoice.update(invoiceId, { total_amount: tot, balance_due: tot - pay, deposit_amount: pay });
      } catch (e) {
        existsRef.current = false;
        clearWorking();
      }
    }, 500);
    return () => clearTimeout(t);
  }, [items, invoiceId, formData.deposit_amount, settings]);

  // Recharger les articles au retour depuis un autre onglet/app (pas au
  // simple focus de la fenêtre, qui se déclenche au moindre clic).
  useEffect(() => {
    if (!invoiceId) return;
    const onVisibility = () => { if (document.visibilityState === "visible") reloadItems(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => { document.removeEventListener("visibilitychange", onVisibility); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceId, stockDeducted]);

  // Déduction automatique du stock sur la facture à chaque changement d'articles
  // (ajout/modification via ItemModal sur desktop, suppression). Idempotent :
  // recalcule le delta entre les quantités requises et les mouvements déjà
  // enregistrés. Les synchronisations sont sérialisées pour éviter toute double
  // déduction. (Le cas mobile ajout/modification est géré dans init au remontage.)
  useEffect(() => {
    if (!invoiceId || docType !== "invoice" || !loadedRef.current) return;
    const key = itemsStockKey(items);
    if (key === lastStockKeyRef.current) return;
    const currentItems = items;
    const currentRef = formData.invoice_number;
    // Debounce 300ms : regroupe les changements rapides (ajout/suppression
    // en cascade) en une seule synchro de stock au lieu d'en empiler plusieurs.
    const t = setTimeout(() => {
      syncChainRef.current = syncChainRef.current
        .then(() => syncInvoiceStock({ invoiceId, invoiceNumber: currentRef, items: currentItems, products }))
        .then(() => { lastStockKeyRef.current = itemsStockKey(currentItems); })
        .catch(() => {});
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, invoiceId, docType]);

  const clearWorking = () => { if (!editIdParam) sessionStorage.removeItem(WORKING_KEY(docType)); };

  // Mémorise le document créé/modifié pour le surligner au retour sur la liste.
  const HIGHLIGHT_KEY = (t) => t === "proforma" ? "proformas_last_opened" : t === "bl" ? "bls_last_opened" : "invoices_last_opened";
  const markHighlight = () => {
    const isEmpty = !formDataRef.current.customer_name || formDataRef.current.customer_name === "Client de passage";
    if (isEmpty && itemsRef.current.length === 0) return;
    if (invoiceId) {
      sessionStorage.setItem(HIGHLIGHT_KEY(docType), invoiceId);
    } else if (creatingRef.current) {
      creatingRef.current.then((draft) => {
        if (draft?.id) sessionStorage.setItem(HIGHLIGHT_KEY(docType), draft.id);
      }).catch(() => {});
    }
  };

  // Suppression en arrière-plan du brouillon vide (fire-and-forget, non bloquant).
  const cleanupEmptyDraft = () => {
    const isEmpty = !formDataRef.current.customer_name || formDataRef.current.customer_name === "Client de passage";
    if (editIdParam || !isEmpty || itemsRef.current.length > 0) return;
    const p = creatingRef.current;
    if (p) {
      p.then((draft) => {
        if (draft?.id) {
          InvoiceItem.deleteMany({ invoice_id: draft.id }).then(() => Invoice.delete(draft.id)).catch(() => {});
        }
      }).catch(() => {});
    } else if (invoiceId) {
      InvoiceItem.deleteMany({ invoice_id: invoiceId }).then(() => Invoice.delete(invoiceId)).catch(() => {});
    }
  };

  const handleBack = () => {
    backedOutRef.current = true;
    clearWorking();
    markHighlight();
    navigate(docType === "proforma" ? createPageUrl("Proformas") : docType === "bl" ? createPageUrl("BordereauxLivraison") : createPageUrl("Invoices"));
    cleanupEmptyDraft();
  };

  // Nettoyage du brouillon vide au démontage (couvre le swipe-to-back natif
  // qui déclenche history.back() sans passer par handleBack).
  useEffect(() => {
    return () => {
      if (backedOutRef.current || navigatingToSubPageRef.current) return;
      backedOutRef.current = true;
      clearWorking();
      markHighlight();
      cleanupEmptyDraft();
    };
  }, []);

  const openClientPicker = () => { navigatingToSubPageRef.current = true; navigate(`${createPageUrl("ClientPicker")}?type=${docType}`); };
  const openAddItem = async () => {
    const id = await ensureCreated();
    if (!id) return;
    if (window.innerWidth >= 768) setItemModal({ itemId: null });
    else {
      navigatingToSubPageRef.current = true;
      sessionStorage.setItem(`invoice_prev_count_${docType}`, String(items.length));
      navigate(`${createPageUrl("AddInvoiceItem")}?type=${docType}&invoice_id=${id}`);
    }
  };
  const openEditItem = async (item) => {
    const id = await ensureCreated();
    if (!id) return;
    if (window.innerWidth >= 768) setItemModal({ itemId: item.id });
    else { navigatingToSubPageRef.current = true; navigate(`${createPageUrl("AddInvoiceItem")}?type=${docType}&invoice_id=${id}&item_id=${item.id}`); }
  };

  const removeItem = async (item) => {
    if (!confirm("Supprimer cet article ?")) return;
    await InvoiceItem.delete(item.id);
    const newItems = items.filter((i) => i.id !== item.id);
    setItems(newItems);
    setItemsChanged(true);
    // La synchro de stock est déclenchée par le useEffect sur items — pas
    // besoin de l'appeler ici (évite une double déduction).
  };

  const reloadItems = async () => {
    if (!invoiceId) return;
    const dbItems = await InvoiceItem.filter({ invoice_id: invoiceId }, "created_date");
    const mapped = dbItems.map((it) => ({ ...it, total_price: it.total_price || (it.unit_price || 0) * (it.quantity || 0) }));
    if (mapped.length > items.length) {
      setScrollSignal((s) => s + 1);
    }
    setItems(mapped);
    setItemsChanged(true);
    // La synchro de stock est déclenchée par le useEffect sur items — pas
    // besoin de l'appeler ici (évite une double déduction).
  };

  const handleFinish = async () => {
    const id = await ensureCreated();
    if (id) {
      await Invoice.update(id, {
        customer_name: formData.customer_name,
        customer_phone: formData.customer_phone,
        billing_address: formData.billing_address,
        date: formData.date,
        due_date: formData.due_date,
        payment_terms: formData.payment_terms,
        notes: formData.notes,
        type: docType,
        currency: formData.currency,
        currency_symbol: formData.currency_symbol,
        images: formData.images,
        livreur_id: formData.livreur_id,
        livreur_name: formData.livreur_name,
        total_amount: total,
        balance_due: balanceDue,
        deposit_amount: payments,
      });
      sessionStorage.setItem(HIGHLIGHT_KEY(docType), id);
      dirtyRef.current = false;
    }
    backedOutRef.current = true;
    clearWorking();
    navigate(docType === "proforma" ? createPageUrl("Proformas") : docType === "bl" ? createPageUrl("BordereauxLivraison") : createPageUrl("Invoices"));
  };

  const BL_STATUS_LABELS = { draft: "remis en attente", sent: "marqué livré", cancelled: "annulé" };

  const handleSetBLStatus = async (targetStatus) => {
    const id = await ensureCreated();
    if (!id || formData.status === targetStatus) return;
    if (targetStatus === "cancelled" && !confirm("Annuler ce bon de livraison ?")) return;
    if (targetStatus === "sent" && formData.livreur_id) {
      const missing = await checkLivreurStock(formData.livreur_id, items);
      if (missing.length && !confirm(`Stock livreur insuffisant pour : ${missing.join(", ")}. Livrer quand même ?`)) return;
    }
    const prev = formData.status;
    try {
      await Invoice.update(id, { status: targetStatus });
      try { await applyBLStatusChange(prev, targetStatus, formData.livreur_id, items, formData.livreur_name); } catch { /* ignore */ }
      logActivity({ action_type: "update", entity_type: "bl", entity_id: id, description: `Bon de livraison ${BL_STATUS_LABELS[targetStatus] || targetStatus}`, metadata: { number: formData.invoice_number } });
      setFormData((p) => ({ ...p, status: targetStatus }));
    } catch { /* ignore */ }
  };

  const handleCancelBL = () => handleSetBLStatus("cancelled");
  const handleMarkDelivered = () => handleSetBLStatus("sent");

  const handleDelete = async () => {
    if (!confirm(isBL ? "Supprimer ce bon de livraison ?" : "Supprimer ce document ?")) return;
    const delId = await ensureCreated();
    if (delId) {
      // Réinjecter le stock déduit sur la facture avant suppression (les BL ne
      // déduisent plus le stock). Inconditionnel : restoreStockByReference est un
      // no-op si aucun mouvement n'existe pour cette réf. — le flag stock_deducted
      // peut être faux même quand des mouvements ont été créés (factures anciennes).
      if (docType === "invoice" && formData.invoice_number) { try { await restoreStockByReference(formData.invoice_number); } catch { /* ignore */ } }
      await InvoiceItem.deleteMany({ invoice_id: delId });
      await Invoice.delete(delId);
    }
    backedOutRef.current = true;
    clearWorking();
    logActivity({ action_type: "delete", entity_type: docType, description: `Supprimé ${formData.invoice_number || ""}`, metadata: { number: formData.invoice_number } });
    navigate(docType === "proforma" ? createPageUrl("Proformas") : docType === "bl" ? createPageUrl("BordereauxLivraison") : createPageUrl("Invoices"));
  };

  const buildInvoice = () => ({ ...formData, total_amount: total, balance_due: balanceDue, deposit_amount: payments });

  const handleShare = async () => {
    const { generateInvoicePDF } = await import("@/lib/generateInvoicePDF");
    const doc = await generateInvoicePDF({ invoice: buildInvoice(), items: previewItems, settings, locations });
    const file = new File([doc.output("blob")], `${formData.invoice_number || "document"}.pdf`, { type: "application/pdf" });
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: formData.invoice_number || "Facture" }); return; } catch { /* ignore */ }
    }
    doc.save(`${formData.invoice_number || "document"}.pdf`);
  };

  const handleGenerateBL = async () => {
    const id = await ensureCreated();
    if (!id) return;
    const me = await base44.auth.me().catch(() => null);
    if (!isBlEnabled(me)) {
      alert("La génération de bons de livraison n'est pas disponible sur votre plan. Passez au plan Mensuel ou Annuel.");
      return;
    }
    const [freshSettings, teamId] = await Promise.all([getTeamSettings(), getTeamId()]);
    const fs = freshSettings || settings;
    const blNumber = generateNumber(fs, "bl");
    const bl = await Invoice.create({
      invoice_number: blNumber,
      date: today(),
      type: "bl",
      status: "draft",
      customer_name: formData.customer_name,
      customer_phone: formData.customer_phone,
      billing_address: formData.billing_address,
      total_amount: 0,
      balance_due: 0,
      deposit_amount: 0,
      currency: formData.currency,
      currency_symbol: formData.currency_symbol,
      notes: formData.notes,
      team_id: teamId,
    });
    if (items.length) {
      await InvoiceItem.bulkCreate(
        items.map((it) => ({
          invoice_id: bl.id,
          product_id: it.product_id || "",
          product_name: it.product_name,
          unit_price: 0,
          quantity: it.quantity || 1,
          unit: it.unit || "Pcs",
          total_price: 0,
          location_id: it.location_id || "",
          allocations: Array.isArray(it.allocations) ? it.allocations : [],
          team_id: teamId,
        }))
      );
    }
    if (fs?.id) {
      const field = nextNumberField("bl");
      await Settings.update(fs.id, { [field]: (fs[field] || 1) + 1 });
    }
    logActivity({ action_type: "create", entity_type: "bl", entity_id: bl.id, description: `Bon de livraison généré depuis ${formData.invoice_number || ""}`, metadata: { number: blNumber } });
    toast({ title: "Bon de livraison créé", description: blNumber });
  };

  const handleDuplicate = async () => {
    const id = await ensureCreated();
    if (!id || !settings) return;
    const number = generateNumber(settings, docType);
    const teamId = await getTeamId();
    const copy = await Invoice.create({ ...formData, invoice_number: number, status: "draft", date: today(), total_amount: total, balance_due: total, deposit_amount: 0, payments: [], team_id: teamId });
    if (items.length) {
      await InvoiceItem.bulkCreate(items.map((it) => ({ invoice_id: copy.id, product_id: it.product_id || "", product_name: it.product_name, unit_price: it.unit_price || 0, quantity: it.quantity || 1, unit: it.unit || "Pcs", total_price: it.total_price || 0, team_id: teamId })));
    }
    if (settings.id) {
      const field = nextNumberField(docType);
      await Settings.update(settings.id, { [field]: (settings[field] || 1) + 1 });
    }
    logActivity({ action_type: "duplicate", entity_type: docType, entity_id: copy.id, description: `Document dupliqué ${formData.invoice_number || ""}`, metadata: { number: copy.invoice_number } });
    alert("Document dupliqué");
  };

  const handlePaymentClick = async () => {
    setAvailableDeposit(await getAvailableDeposit(formData.customer_name));
    setShowPaymentDialog(true);
  };

  const handleAcceptProforma = async () => {
    const id = await ensureCreated();
    if (!id) return;
    // 1. Copie historique du devis (reste proforma, statut accepté)
    const copy = await Invoice.create({
      invoice_number: formData.invoice_number,
      date: formData.date,
      type: "proforma",
      status: "accepted",
      team_id: await getTeamId(),
      customer_name: formData.customer_name,
      customer_phone: formData.customer_phone,
      billing_address: formData.billing_address,
      total_amount: subtotal,
      balance_due: subtotal,
      deposit_amount: 0,
      payment_terms: formData.payment_terms,
      due_date: formData.due_date,
      currency: formData.currency,
      currency_symbol: formData.currency_symbol,
      notes: formData.notes,
      payments: [],
    });
    const acceptTeamId = await getTeamId();
    if (items.length) {
      await InvoiceItem.bulkCreate(items.map((it) => ({
        invoice_id: copy.id,
        product_id: it.product_id || "",
        product_name: it.product_name,
        unit_price: it.unit_price || 0,
        quantity: it.quantity || 1,
        unit: it.unit || "Pcs",
        total_price: it.total_price || 0,
        team_id: acceptTeamId,
      })));
    }
    // 2. Transformer l'original en facture avec le prochain numéro de facture
    const freshSettings = (await getTeamSettings()) || settings;
    const invoiceNumber = freshSettings ? generateNumber(freshSettings, "invoice") : formData.invoice_number;
    await Invoice.update(id, {
      ...formData,
      total_amount: total,
      balance_due: balanceDue,
      deposit_amount: payments,
      type: "invoice",
      status: "draft",
      invoice_number: invoiceNumber,
    });
    if (freshSettings?.id) {
      await Settings.update(freshSettings.id, { invoice_next_number: (freshSettings.invoice_next_number || 1) + 1 });
    }
    // Le devis devient une facture : déduire le stock des articles sous la nouvelle réf.
    try { await syncInvoiceStock({ invoiceId: id, invoiceNumber, items, products, reason: "Facture (devis accepté)" }); } catch { /* ignore */ }
    logActivity({ action_type: "accept", entity_type: "proforma", entity_id: id, description: `Devis accepté ${formData.invoice_number || ""}`, metadata: { number: formData.invoice_number } });
    backedOutRef.current = true;
    clearWorking();
    navigate(createPageUrl("Invoices"));
  };

  const handleRefuseProforma = async () => {
    const id = await ensureCreated();
    if (!id) return;
    await Invoice.update(id, { status: "refused" });
    logActivity({ action_type: "refuse", entity_type: "proforma", entity_id: id, description: `Devis refusé ${formData.invoice_number || ""}`, metadata: { number: formData.invoice_number } });
    backedOutRef.current = true;
    clearWorking();
    navigate(createPageUrl("Proformas"));
  };

  const handleRecordPayment = async ({ amount, method, date }) => {
    const id = await ensureCreated();
    if (!id) return;
    // Le solde dû est déduit de l'acompte disponible (dans la limite du disponible)
    const consumed = await consumeDeposit(formData.customer_name, balanceDue);
    const newBalance = Math.max(0, balanceDue - amount);
    const newStatus = newBalance <= 0 ? "paid" : formData.status === "draft" ? "draft" : "sent";
    const newPayment = { amount, date: date ? new Date(date).toISOString() : new Date().toISOString(), method, deposit_consumed: consumed };
    const updatedPayments = [...(formData.payments || []), newPayment];
    const newDeposit = (parseFloat(formData.deposit_amount) || 0) + amount;
    await Invoice.update(id, { status: newStatus, balance_due: newBalance, deposit_amount: newDeposit, payments: updatedPayments });
    setFormData((prev) => ({ ...prev, status: newStatus, balance_due: newBalance, deposit_amount: newDeposit, payments: updatedPayments }));
    logActivity({ action_type: "payment", entity_type: docType, entity_id: id, description: "Paiement enregistré", metadata: { number: formData.invoice_number, amount } });
    setShowPaymentDialog(false);
  };

  const recomputeFromPayments = async (updatedPayments) => {
    const id = await ensureCreated();
    if (!id) return;
    const totalDeposit = updatedPayments.reduce((s, p) => s + (p.amount || 0), 0);
    const newBalance = Math.max(0, total - totalDeposit);
    const newStatus = newBalance <= 0 ? "paid" : formData.status === "draft" ? "draft" : "sent";
    await Invoice.update(id, { status: newStatus, balance_due: newBalance, deposit_amount: totalDeposit, payments: updatedPayments });
    setFormData((prev) => ({ ...prev, status: newStatus, balance_due: newBalance, deposit_amount: totalDeposit, payments: updatedPayments }));
  };

  const handleEditPaymentClick = async (index) => {
    setAvailableDeposit(await getAvailableDeposit(formData.customer_name));
    setEditingPayment({ ...formData.payments[index], index });
    setShowPaymentDialog(true);
  };

  const handleUpdatePayment = async ({ amount, method, date }) => {
    const id = await ensureCreated();
    if (!id) return;
    const idx = editingPayment?.index;
    const updated = [...(formData.payments || [])];
    const old = updated[idx];
    if (old?.deposit_consumed) await refundDeposit(old.deposit_consumed);
    const consumed = await consumeDeposit(formData.customer_name, amount);
    updated[idx] = { ...updated[idx], amount, method, date: date ? new Date(date).toISOString() : updated[idx].date, deposit_consumed: consumed };
    logActivity({ action_type: "update", entity_type: docType, entity_id: id, description: "Paiement modifié", metadata: { number: formData.invoice_number, amount } });
    await recomputeFromPayments(updated);
    setEditingPayment(null);
    setShowPaymentDialog(false);
  };

  const handleDeletePayment = async (index) => {
    if (!confirm("Supprimer ce paiement ?")) return;
    const id = await ensureCreated();
    if (!id) return;
    const pay = (formData.payments || [])[index];
    if (pay?.deposit_consumed) await refundDeposit(pay.deposit_consumed);
    const updated = (formData.payments || []).filter((_, i) => i !== index);
    logActivity({ action_type: "delete", entity_type: docType, entity_id: id, description: "Paiement supprimé", metadata: { number: formData.invoice_number } });
    await recomputeFromPayments(updated);
  };

  const menuActions = [
    { label: isBL ? "Supprimer le bon" : "Supprimer", danger: true, bold: true, icon: Trash2, onClick: handleDelete },
    { label: "Partager", icon: Share2, onClick: handleShare },
    ...(isReadOnly ? [] :
      docType === "proforma"
      ? (!isLocked
        ? [
            { label: "Accepter", icon: CheckCircle, onClick: handleAcceptProforma },
            { label: "Refuser", danger: true, icon: XCircle, onClick: handleRefuseProforma },
          ]
        : [])
      : isBL
        ? [
            ...(formData.status !== "sent" ? [{ label: "Marquer livré", icon: CheckCircle, onClick: () => handleSetBLStatus("sent") }] : []),
            ...(formData.status === "sent" ? [{ label: "Remettre en attente", icon: RotateCcw, onClick: () => handleSetBLStatus("draft") }] : []),
            ...(formData.status === "cancelled" ? [{ label: "Réactiver", icon: RotateCcw, onClick: () => handleSetBLStatus("draft") }] : []),
            ...(formData.status !== "cancelled" ? [{ label: "Annuler", danger: true, icon: Ban, onClick: handleCancelBL }] : []),
          ]
        : [
            { label: "Bon de livraison", icon: Truck, onClick: handleGenerateBL },
            { label: "Paiement", icon: CreditCard, onClick: handlePaymentClick },
          ]),
  ];

  const moreActions = isBL
    ? [{ label: "Supprimer le bon", danger: true, bold: true, icon: Trash2, onClick: handleDelete }]
    : [
        { label: "Dupliquer", icon: Copy, onClick: handleDuplicate },
        { label: "Supprimer", danger: true, bold: true, icon: Trash2, onClick: handleDelete },
      ];

  const floatingActions = [
    { label: "Aperçu", icon: Eye, onClick: () => setActiveTab("preview") },
    { label: "Partager", icon: Share2, onClick: handleShare },
    ...(docType === "proforma"
      ? [
          { label: "Accepter", icon: CheckCircle, onClick: handleAcceptProforma },
          { label: "Refuser", danger: true, icon: XCircle, onClick: handleRefuseProforma },
        ]
      : isBL
        ? [
            ...(formData.status !== "sent" ? [{ label: "Marquer livré", icon: CheckCircle, onClick: () => handleSetBLStatus("sent") }] : []),
            ...(formData.status === "sent" ? [{ label: "Remettre en attente", icon: RotateCcw, onClick: () => handleSetBLStatus("draft") }] : []),
            ...(formData.status === "cancelled" ? [{ label: "Réactiver", icon: RotateCcw, onClick: () => handleSetBLStatus("draft") }] : []),
            ...(formData.status !== "cancelled" ? [{ label: "Annuler", icon: Ban, onClick: handleCancelBL }] : []),
            { label: "Supprimer", danger: true, icon: Trash2, onClick: handleDelete },
          ]
        : [
            { label: "Bon de livraison", icon: Truck, onClick: handleGenerateBL },
            { label: "Paiement", icon: CreditCard, onClick: handlePaymentClick },
          ]),
  ];

  const title = docType === "proforma" ? "Proforma" : isBL ? "Bon de livraison" : "Facture";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  if (initError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
        <p className="text-sm text-muted-foreground mb-4">Impossible de charger le document. Vérifiez votre connexion.</p>
        <button onClick={() => { setInitError(null); setLoading(true); init(); }} className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium">Réessayer</button>
      </div>
    );
  }

  return (
    <TrialGate>
    <div className="min-h-screen bg-background">
      <EditorHeader
        title={title}
        onBack={handleBack}
        rightElement={
          <>
            <div className="hidden md:flex items-center gap-1">
              {menuActions.map((a, i) => {
                const Icon = a.icon;
                return (
                  <button key={i} onClick={a.onClick} title={a.label} className={`flex items-center gap-1.5 ${a.danger ? "text-red-600 hover:bg-red-50" : "text-foreground hover:bg-muted"} px-2.5 py-1.5 rounded-lg transition-colors text-sm font-medium`}>
                    {Icon && <Icon className="w-4 h-4" />}
                    <span className="hidden lg:inline">{a.label}</span>
                  </button>
                );
              })}
            </div>
          </>
        }
      >
        <div className="flex justify-center px-4 pb-3 gap-1.5">
          {((isBL || isReturn) ? TABS.filter((t) => t.key !== "history") : TABS).map((t) => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} className={`px-4 py-1 text-xs font-semibold rounded-full transition-colors ${activeTab === t.key ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>{t.label}</button>
          ))}
        </div>
      </EditorHeader>

      <div className="max-w-2xl mx-auto p-4 pb-32 space-y-3">
        {activeTab === "edit" && (
          <>
            <MetaCard invoiceNumber={formData.invoice_number} companyName={settings?.company_name} date={formData.date} onDateChange={(v) => updateField("date", v)} readOnly={isFieldLocked} />
            <ClientCard
              customerName={formData.customer_name}
              customerPhone={formData.customer_phone}
              billingAddress={formData.billing_address}
              onPick={openClientPicker}
              onSelect={(c) => {
                setFormData((prev) => ({ ...prev, customer_name: c.name || "", customer_phone: c.phone || "", billing_address: c.address || "" }));
                dirtyRef.current = true;
              }}
              onPhoneChange={(v) => updateField("customer_phone", v)}
              onAddressChange={(v) => updateField("billing_address", v)}
              readOnly={isFieldLocked}
              />

              {isBL && (
              <LivreurCard
                livreurId={formData.livreur_id}
                livreurName={formData.livreur_name}
                livreurs={livreurs}
                readOnly={isFieldLocked}
                onChange={({ livreur_id, livreur_name }) => {
                  setFormData((prev) => ({ ...prev, livreur_id, livreur_name }));
                  dirtyRef.current = true;
                }}
              />
              )}

              <ItemsCard items={items} onAdd={openAddItem} onEdit={openEditItem} onRemove={removeItem} sym={sym} readOnly={isFieldLocked} blMode={isBL} scrollSignal={scrollSignal} />
            {isBL ? (
              <SummaryCard subtotal={subtotal} total={subtotal} sym={sym} blMode />
            ) : (
              <SummaryCard subtotal={subtotal} total={total} payments={payments} balanceDue={balanceDue} sym={sym} tax={taxInfo} hasTaxableItems={taxableSubtotal > 0} onTaxClick={() => navigate(createPageUrl("Taxe"))} />
            )}
            <div className="bg-card rounded-2xl shadow-sm p-4 space-y-3">
              {!isBL && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Date d'échéance</label>
                    <Input type="date" value={formData.due_date} onChange={(e) => updateField("due_date", e.target.value)} className="text-sm" disabled={isFieldLocked} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Conditions de paiement</label>
                    <Input value={formData.payment_terms} onChange={(e) => updateField("payment_terms", e.target.value)} placeholder="Dû à réception" className="text-sm" readOnly={isFieldLocked} />
                  </div>
                </>
              )}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Notes</label>
                <Textarea value={formData.notes} onChange={(e) => updateField("notes", e.target.value)} placeholder="Notes…" className={`text-sm resize-none ${isFieldLocked && !isBL ? "opacity-60" : ""}`} rows={2} readOnly={isFieldLocked && !isBL} />
              </div>
            </div>
            {isBL && (
              <ImagesCard images={formData.images} onChange={(imgs) => updateField("images", imgs)} readOnly={isFieldLocked && !isBL} />
            )}
            {!isLocked && (
              <button onClick={handleFinish} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3.5 rounded-2xl shadow-sm flex items-center justify-center gap-2 transition-colors"><Check className="w-5 h-5" /> Terminer</button>
            )}
          </>
        )}
        {activeTab === "preview" && (
          <>
          <InvoiceDocument invoice={{ ...formData, total_amount: total, balance_due: balanceDue, deposit_amount: payments }} items={previewItems} settings={settings} locations={locations} />
          </>
        )}
        {activeTab === "history" && (
          <div className="bg-card rounded-2xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-foreground">Historique des paiements</p>
              {!isReadOnly && <button onClick={() => { setEditingPayment(null); setShowPaymentDialog(true); }} className="text-sm font-medium text-green-600 hover:text-green-700">+ Paiement</button>}
            </div>
            {(formData.payments?.length || 0) === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun paiement enregistré.</p>
            ) : (
              <div className="space-y-2">
                {formData.payments.map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-sm bg-muted/50 rounded-lg px-3 py-2">
                    <div className="flex flex-col">
                      <span className="text-foreground font-medium">{formatAmount(p.amount, sym)}</span>
                      <span className="text-xs text-muted-foreground">{p.method}{p.date ? ` — ${p.date.split("T")[0]}` : ""}</span>
                    </div>
                    {!isReadOnly && <div className="flex items-center gap-1">
                      <button onClick={() => handleEditPaymentClick(i)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground" title="Modifier"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleDeletePayment(i)} className="p-1.5 rounded-lg hover:bg-red-100 text-red-500" title="Supprimer"><Trash2 className="w-4 h-4" /></button>
                    </div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <PaymentDialog open={showPaymentDialog} onClose={() => { setShowPaymentDialog(false); setEditingPayment(null); }} onRecord={handleRecordPayment} onUpdate={handleUpdatePayment} editingPayment={editingPayment} balanceDue={balanceDue} sym={sym} availableDeposit={availableDeposit} />
      <ItemModal open={!!itemModal} invoiceId={invoiceId} itemId={itemModal?.itemId} docType={docType} onClose={() => setItemModal(null)} onSaved={reloadItems} products={products} locations={locations} />
      {(isBL || !isLocked) && <FloatingActionBar actions={floatingActions} moreActions={moreActions} />}
    </div>
    </TrialGate>
  );
}