import React, { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { useSidebar } from "@/components/ui/sidebar";
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import {
  LayoutDashboard, Package, FileText, ReceiptText, Tags, Crown, Users,
  ShieldCheck, Wallet, Truck, PackageOpen, MapPin, Gift, ClipboardList, Bike,
  ChevronRight, ShoppingBag, Boxes, UserCircle, Settings2, Landmark, ShoppingCart,
} from "lucide-react";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { isTeamEnabled, isInventoryEnabled, loadTeamPlan } from "@/lib/planLimits";
import { isTeamOwner } from "@/lib/team";

const allNavigationItems = [
  { title: "Tableau de bord", url: createPageUrl("Dashboard"), icon: LayoutDashboard },
  { title: "Stock", url: createPageUrl("Products"), icon: Package, inventoryOnly: true, group: "inventaire" },
  { title: "Nouvel achat", url: "/NewPurchase", icon: ShoppingCart, inventoryOnly: true, group: "inventaire" },
  { title: "Factures", url: createPageUrl("Invoices"), icon: FileText, group: "ventes" },
  { title: "Devis", url: createPageUrl("Proformas"), icon: ReceiptText, group: "ventes" },
  { title: "Bons", url: createPageUrl("BordereauxLivraison"), icon: Truck, group: "ventes" },
  { title: "Livreurs", url: createPageUrl("Livreurs"), icon: Bike, group: "ventes" },
  { title: "Clients", url: createPageUrl("Customers"), icon: Users },
  { title: "Fournisseurs", url: createPageUrl("Suppliers"), icon: PackageOpen, inventoryOnly: true, ownerOnly: true, group: "inventaire" },
  { title: "Catégories", url: createPageUrl("Categories"), icon: Tags, inventoryOnly: true, group: "inventaire" },
  { title: "Emplacements", url: createPageUrl("Locations"), icon: MapPin, inventoryOnly: true, group: "inventaire" },
  { title: "Dépenses", url: createPageUrl("Expenses"), icon: Wallet },
  { title: "Banque", url: createPageUrl("Banque"), icon: Landmark },
  { title: "Inventaire", url: createPageUrl("Inventaire"), icon: ClipboardList, inventoryOnly: true, group: "inventaire" },
  { title: "Équipe & Activité", url: createPageUrl("TeamActivity"), icon: Users },
  { title: "Abonnement", url: createPageUrl("Subscription"), icon: Crown, group: "compte" },
  { title: "Parrainage", url: "/Referral", icon: Gift, group: "compte" },
  { title: "Parrainages", url: "/AdminReferral", icon: Gift, adminOnly: true, group: "admin" },
  { title: "Administration", url: "/AdminDashboard", icon: ShieldCheck, adminOnly: true, group: "admin" },
];

const groupConfig = {
  ventes: { title: "Ventes", icon: ShoppingBag },
  inventaire: { title: "Inventaire", icon: Boxes },
  compte: { title: "Compte", icon: UserCircle },
  admin: { title: "Administration", icon: Settings2 },
};

export default function SidebarNav() {
  const location = useLocation();
  const { setOpenMobile } = useSidebar();
  const [user, setUser] = React.useState(null);
  const [, setPlanTick] = React.useState(0);

  React.useEffect(() => {
    let mounted = true;
    base44.auth.me().then(async (u) => {
      setUser(u);
      await loadTeamPlan(u);
      if (mounted) setPlanTick((t) => t + 1);
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  const userRole = user?.role ?? null;
  const navigationItems = allNavigationItems.filter(item => {
    if (item.adminOnly && userRole !== "admin") return false;
    if (item.ownerOnly && !isTeamOwner(user)) return false;
    if (item.title === "Équipe & Activité" && !isTeamEnabled(user)) return false;
    if (item.inventoryOnly && !isInventoryEnabled(user)) return false;
    return true;
  });

  // Split into standalone items and grouped items
  const standaloneItems = navigationItems.filter(item => !item.group);
  const groupedItems = navigationItems.filter(item => item.group);

  // Determine which groups have items
  const activeGroups = useMemo(() => {
    const groups = {};
    groupedItems.forEach(item => {
      if (!groups[item.group]) groups[item.group] = [];
      groups[item.group].push(item);
    });
    return groups;
  }, [groupedItems]);

  // Auto-expand the group containing the active route
  const activeGroupKeys = useMemo(() => {
    const keys = new Set();
    Object.entries(activeGroups).forEach(([key, items]) => {
      if (items.some(item => location.pathname === item.url)) {
        keys.add(key);
      }
    });
    return keys;
  }, [activeGroups, location.pathname]);

  const [openGroups, setOpenGroups] = useState(() => new Set(activeGroupKeys));

  // Sync open state when route changes
  useEffect(() => {
    setOpenGroups(prev => {
      const next = new Set(prev);
      activeGroupKeys.forEach(k => next.add(k));
      return next;
    });
  }, [activeGroupKeys]);

  const handleClick = () => setOpenMobile(false);
  const toggleGroup = (key) => {
    setOpenGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const isActive = (url) => location.pathname === url;

  const groupOrderBefore = ["ventes", "inventaire"];
  const groupOrderAfter = ["compte", "admin"];

  const standaloneBeforeGroups = standaloneItems.filter(item => 
    item.title === "Tableau de bord"
  );
  const standaloneAfterGroups = standaloneItems.filter(item => 
    item.title !== "Tableau de bord"
  );

  return (
    <SidebarContent className="p-2">
      <SidebarGroup>
        <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2">
          Navigation
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {/* Standalone items before groups */}
            {standaloneBeforeGroups.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  className={`hover:bg-gray-100 hover:text-foreground transition-all duration-200 rounded-lg mb-1 ${
                    isActive(item.url) ? 'bg-green-600 text-white hover:bg-green-700 hover:text-white shadow-sm' : ''
                  }`}
                >
                  <Link to={item.url} onClick={handleClick} className="flex items-center gap-3 px-3 py-2.5">
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}

            {/* Collapsible groups (before standalone items) */}
            {groupOrderBefore.map((groupKey) => {
              const items = activeGroups[groupKey];
              if (!items || items.length === 0) return null;
              const config = groupConfig[groupKey];
              const isOpen = openGroups.has(groupKey);
              const hasActiveChild = items.some(item => isActive(item.url));

              return (
                <Collapsible
                  key={groupKey}
                  open={isOpen}
                  onOpenChange={() => toggleGroup(groupKey)}
                  asChild
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        className={`hover:bg-gray-100 hover:text-foreground transition-all duration-200 rounded-lg mb-1 w-full ${
                          hasActiveChild ? 'text-green-700 font-semibold' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3 px-3 py-2.5 w-full">
                          <config.icon className="w-5 h-5" />
                          <span className="font-medium flex-1 text-left">{config.title}</span>
                          <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
                        </div>
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {items.map((item) => (
                          <SidebarMenuSubItem key={item.title}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isActive(item.url)}
                              className={isActive(item.url) ? 'bg-green-50 text-green-700 font-medium' : ''}
                            >
                              <Link to={item.url} onClick={handleClick} className="flex items-center gap-2 px-2 py-1.5">
                                <item.icon className="w-4 h-4" />
                                <span>{item.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              );
            })}
            {/* Standalone items after first groups */}
            {standaloneAfterGroups.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  className={`hover:bg-gray-100 hover:text-foreground transition-all duration-200 rounded-lg mb-1 ${
                    isActive(item.url) ? 'bg-green-600 text-white hover:bg-green-700 hover:text-white shadow-sm' : ''
                  }`}
                >
                  <Link to={item.url} onClick={handleClick} className="flex items-center gap-3 px-3 py-2.5">
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}

            {/* Collapsible groups (after standalone items) */}
            {groupOrderAfter.map((groupKey) => {
              const items = activeGroups[groupKey];
              if (!items || items.length === 0) return null;
              const config = groupConfig[groupKey];
              const isOpen = openGroups.has(groupKey);
              const hasActiveChild = items.some(item => isActive(item.url));

              return (
                <Collapsible
                  key={groupKey}
                  open={isOpen}
                  onOpenChange={() => toggleGroup(groupKey)}
                  asChild
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        className={`hover:bg-gray-100 hover:text-foreground transition-all duration-200 rounded-lg mb-1 w-full ${
                          hasActiveChild ? 'text-green-700 font-semibold' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3 px-3 py-2.5 w-full">
                          <config.icon className="w-5 h-5" />
                          <span className="font-medium flex-1 text-left">{config.title}</span>
                          <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
                        </div>
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {items.map((item) => (
                          <SidebarMenuSubItem key={item.title}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isActive(item.url)}
                              className={isActive(item.url) ? 'bg-green-50 text-green-700 font-medium' : ''}
                            >
                              <Link to={item.url} onClick={handleClick} className="flex items-center gap-2 px-2 py-1.5">
                                <item.icon className="w-4 h-4" />
                                <span>{item.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              );
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  );
}