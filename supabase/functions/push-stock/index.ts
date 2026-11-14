// Envoi des notifications push de stock bas / rupture (file « notifications_push »).
// Appelée par pg_net après chaque ajout dans la file (déclencheur prive.declencher_envoi_push), sans JWT :
// elle n'accepte aucune donnée, se contente de vider la file (réservation « skip locked » en base : un appel
// en double n'envoie rien deux fois). Les jetons refusés par Expo (appareil désinstallé) sont supprimés.
// API push d'Expo : https://exp.host/--/api/v2/push/send (lots de 100 messages au plus).
import { clientService } from "../_shared/unitech.ts";

const URL_EXPO = "https://exp.host/--/api/v2/push/send";
const TAILLE_LOT = 100;

interface Notification {
  id: number;
  produit_id: string;
  niveau: "bas" | "rupture";
  titre: string;
  corps: string;
  jetons: string[];
}

interface Message {
  to: string;
  title: string;
  body: string;
  sound: "default";
  priority: "high";
  channelId: string;
  data: { type: "stock"; produitId: string; url: string };
}

interface Ticket {
  status: "ok" | "error";
  details?: { error?: string };
}

const json = (corps: unknown, status = 200) =>
  new Response(JSON.stringify(corps), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ erreur: "Méthode non autorisée" }, 405);
  const sb = clientService();
  let envoyes = 0;
  const jetonsInvalides = new Set<string>();

  // Plusieurs tours si la file est longue (inventaire, import…)
  for (let tour = 0; tour < 5; tour++) {
    const { data, error } = await sb.rpc("reserver_notifications_push", { p_limite: 200 });
    if (error) return json({ erreur: error.message }, 500);
    const notifications = (data ?? []) as Notification[];
    if (!notifications.length) break;

    const messages: { notification: number; message: Message }[] = notifications.flatMap((n) =>
      n.jetons.map((to) => ({
        notification: n.id,
        message: {
          to,
          title: n.titre,
          body: n.corps,
          sound: "default" as const,
          priority: "high" as const,
          channelId: "stock",
          data: { type: "stock" as const, produitId: n.produit_id, url: `/produit/${n.produit_id}` },
        },
      })));

    const echecs = new Set<number>();
    for (let i = 0; i < messages.length; i += TAILLE_LOT) {
      const lot = messages.slice(i, i + TAILLE_LOT);
      try {
        const rep = await fetch(URL_EXPO, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json", "Accept-Encoding": "gzip, deflate" },
          body: JSON.stringify(lot.map((m) => m.message)),
        });
        if (!rep.ok) throw new Error(`Expo ${rep.status}`);
        const tickets = ((await rep.json()).data ?? []) as Ticket[];
        tickets.forEach((t, j) => {
          if (t.status === "ok") envoyes++;
          else if (t.details?.error === "DeviceNotRegistered") jetonsInvalides.add(lot[j].message.to);
        });
      } catch (e) {
        console.error("Envoi push échoué :", (e as Error).message);
        lot.forEach((m) => echecs.add(m.notification));
      }
    }
    // Échec réseau ou serveur : remises en attente (3 tentatives au plus, voir reserver_notifications_push)
    if (echecs.size) {
      await sb.from("notifications_push").update({ envoyee_le: null }).in("id", [...echecs]);
      break;
    }
    if (notifications.length < 200) break;
  }

  if (jetonsInvalides.size) await sb.from("appareils_push").delete().in("jeton", [...jetonsInvalides]);
  return json({ envoyes, jetons_supprimes: jetonsInvalides.size });
});
