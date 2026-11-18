// Visuels de la fiche App Store (1284 × 2778) à partir des captures de capture/input.
// Usage : node capture/generer.mjs   → PNG dans capture/output
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join } from "node:path";

const ici = fileURLToPath(new URL(".", import.meta.url));
const entree = (n) => pathToFileURL(join(ici, "input", `${n}.PNG`)).href;
const sortie = join(ici, "output");
const travail = join(ici, ".rendu");
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const L = 1284, H = 2778;

// --- Icônes (traits, 24 × 24) ---
const ic = {
  facture: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8M8 9h2"/>',
  proforma: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 7h8M8 11h8M8 15h5"/><circle cx="17" cy="17" r="0"/>',
  camion: '<path d="M1 3h15v13H1zM16 8h4l3 3v5h-7z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',
  stock: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.3 7L12 12l8.7-5M12 22V12"/>',
  achats: '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/>',
  clients: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
  signature: '<path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.6 7.6"/><circle cx="11" cy="11" r="2"/>',
  excel: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 12l4 6M12 12l-4 6"/>',
  envoyer: '<path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/>',
  cloche: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/>',
  graphique: '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 6-6"/><path d="M15 8h5v5"/>',
  eclair: '<path d="M13 2L3 14h9l-1 8 10-12h-9z"/>',
};
const svg = (nom, taille, couleur = "#fff", ep = 2) =>
  `<svg width="${taille}" height="${taille}" viewBox="0 0 24 24" fill="none" stroke="${couleur}" stroke-width="${ep}" stroke-linecap="round" stroke-linejoin="round">${ic[nom]}</svg>`;

// --- Barre d'état propre (9:41, réseau, batterie pleine) posée sur la capture ---
function barreEtat(sombre) {
  const c = sombre ? "#fff" : "#111";
  const fond = sombre ? "#1C1C1E" : "#F4F6F4";
  return `<div class="barre" style="background:${fond};color:${c}">
    <span class="heure">9:41</span>
    <span class="droite">
      <svg width="34" height="22" viewBox="0 0 34 22"><g fill="${c}"><rect x="0" y="14" width="6" height="8" rx="1.5"/><rect x="9" y="10" width="6" height="12" rx="1.5"/><rect x="18" y="5" width="6" height="17" rx="1.5"/><rect x="27" y="0" width="6" height="22" rx="1.5"/></g></svg>
      <svg width="30" height="22" viewBox="0 0 30 22"><g fill="${c}"><path d="M15 21l-4.2-4.6a6 6 0 0 1 8.4 0z"/><path d="M15 9.5a11.5 11.5 0 0 1 8 3.3l-2.3 2.5a8.2 8.2 0 0 0-11.4 0L7 12.8a11.5 11.5 0 0 1 8-3.3z"/><path d="M15 2.5a18.5 18.5 0 0 1 13 5.3l-2.3 2.5a15 15 0 0 0-21.4 0L2 7.8a18.5 18.5 0 0 1 13-5.3z"/></g></svg>
      <svg width="52" height="24" viewBox="0 0 52 24"><rect x="1" y="1" width="44" height="22" rx="7" fill="none" stroke="${c}" stroke-opacity=".4" stroke-width="2"/><rect x="4" y="4" width="38" height="16" rx="4.5" fill="${c}"/><path d="M48 8v8c1.6-.5 2.6-2.2 2.6-4s-1-3.5-2.6-4z" fill="${c}" fill-opacity=".45"/></svg>
    </span>
  </div>`;
}

/** Téléphone : cadre, îlot dynamique, capture et barre d'état. */
function telephone({ image, largeur, sombre = false, masque = 150, style = "", retouche = "" }) {
  const ecran = largeur - 44;
  const hauteurEcran = Math.round(ecran * 2556 / 1179);
  const echelle = ecran / 1179;
  return `<div class="tel" style="width:${largeur}px;height:${hauteurEcran + 44}px;${style}">
    <div class="ecran" style="width:${ecran}px;height:${hauteurEcran}px">
      <img src="${entree(image)}" style="width:${ecran}px;height:${hauteurEcran}px">
      <div style="position:absolute;inset:0 0 auto 0;height:${Math.round(masque * echelle)}px;overflow:hidden">
        <div style="transform:scale(${echelle});transform-origin:0 0;width:1179px">${barreEtat(sombre)}</div>
      </div>
      <div style="position:absolute;inset:0;transform:scale(${echelle});transform-origin:0 0;width:1179px;height:2556px">${retouche}</div>
      <div class="ilot" style="width:${Math.round(370 * echelle)}px;height:${Math.round(108 * echelle)}px;top:${Math.round(32 * echelle)}px"></div>
    </div>
  </div>`;
}

const pastille = (nom, style) =>
  `<div class="pastille" style="${style}">${svg(nom, 104, "#fff", 2.2)}</div>`;

const decor = `
  <svg class="pointilles" width="${L}" height="${H}" viewBox="0 0 ${L} ${H}">
    ${Array.from({ length: 420 }, (_, i) => {
      const x = (i * 97.3) % L, y = H * 0.55 + ((i * 53.7) % (H * 0.45));
      const p = Math.min(1, (y - H * 0.55) / (H * 0.45));
      const c = i % 11 === 0 ? "#9BE3AE" : i % 17 === 0 ? "#3CCB6A" : "#ffffff";
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${i % 11 === 0 ? 6 : 3.4}" fill="${c}" opacity="${(0.05 + p * 0.22).toFixed(2)}"/>`;
    }).join("")}
  </svg>`;

const page = (corps) => `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@500;600;700&display=block" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0}
  html,body{width:${L}px;height:${H}px;overflow:hidden}
  body{font-family:Quicksand,sans-serif;color:#fff;position:relative;
    background:radial-gradient(120% 70% at 50% 0%,#1d3a26 0%,#11231a 45%,#0a150f 100%)}
  .pointilles{position:absolute;inset:0}
  .titre{position:absolute;left:0;right:0;text-align:center;letter-spacing:-1px}
  .titre b{display:block;font-size:168px;font-weight:700;line-height:1.02}
  .titre span{display:block;font-size:92px;font-weight:600;line-height:1.08;margin-top:12px}
  .titre em{font-style:normal;color:#9BE3AE}
  .tel{position:absolute;background:#0d0d0f;border-radius:110px;padding:22px;
    box-shadow:0 0 0 4px #3a3d40,0 0 0 7px #17181a,0 60px 120px rgba(0,0,0,.55)}
  .ecran{position:relative;border-radius:90px;overflow:hidden;background:#F4F6F4}
  .ecran>img{display:block}
  .ilot{position:absolute;left:50%;transform:translateX(-50%);background:#000;border-radius:999px}
  .barre{height:150px;display:flex;align-items:center;justify-content:space-between;padding:22px 92px 0 140px;
    font-family:-apple-system,"SF Pro Text","Segoe UI",sans-serif}
  .barre .heure{font-size:52px;font-weight:600}
  .barre .droite{display:flex;gap:14px;align-items:center;transform:scale(1.25);transform-origin:right center}
  .pastille{position:absolute;width:210px;height:210px;border-radius:50%;background:linear-gradient(145deg,#2fb45a,#147A2E);
    display:grid;place-items:center;box-shadow:0 24px 60px rgba(0,0,0,.45),inset 0 2px 0 rgba(255,255,255,.25)}
  .fleche{position:absolute;opacity:.55}
  .carte{position:absolute;background:#fff;border-radius:22px;overflow:hidden;box-shadow:0 50px 110px rgba(0,0,0,.55)}
</style></head><body>${decor}${corps}</body></html>`;

const flecheCourbe = (style) => `<svg class="fleche" style="${style}" width="300" height="260" viewBox="0 0 300 260" fill="none" stroke="#fff" stroke-width="5" stroke-dasharray="14 14" stroke-linecap="round"><path d="M40 10 C 10 120, 120 230, 270 200"/><path d="M248 182 L272 200 L246 220" stroke-dasharray="0"/></svg>`;

/** Facture PDF seule, recadrée dans la capture de partage WhatsApp (zone blanche du document). */
function carteDocument(style, largeur = 900) {
  const s = largeur / 1164; // document : x 8 → 1172, y 517 → 2024 dans la capture
  return `<div class="carte" style="width:${largeur}px;height:${Math.round(1507 * s)}px;${style}">
    <img src="${entree("IMG_5996")}" style="display:block;width:${Math.round(1179 * s)}px;margin:-${Math.round(517 * s)}px 0 0 -${Math.round(8 * s)}px">
  </div>`;
}

/** Notification « Rupture de stock » sortie de la capture, agrandie au-dessus du téléphone. */
function notification(style) {
  // bannière : x 26 → 1157, y 166 → 372 dans la capture
  const l = 1164, s = l / 1131;
  return `<div style="position:absolute;height:${Math.round(206 * s)}px;border-radius:${Math.round(70 * s)}px;overflow:hidden;
    box-shadow:0 40px 90px rgba(0,0,0,.6);${style}">
    <img src="${entree("IMG_5982")}" style="display:block;width:${Math.round(1179 * s)}px;margin:-${Math.round(166 * s)}px 0 0 -${Math.round(26 * s)}px">
  </div>`;
}

// Client réel de la capture (nom, téléphone) remplacé par un client fictif
const CLIENT_FICTIF = `<div style="position:absolute;left:40px;top:470px;width:900px;height:170px;background:#F4F6F4;
  font-family:-apple-system,'SF Pro Display','Segoe UI',sans-serif;padding-left:22px">
  <div style="font-size:62px;font-weight:700;color:#111;line-height:1;margin-top:10px">Mamadou Diop</div>
  <div style="font-size:42px;color:#5f6b63;margin-top:28px">+221 77 000 00 02</div></div>`;

// --- Écrans ---
const ecrans = [
  {
    nom: "01-creez-vos-factures",
    corps: `
      <div class="titre" style="top:150px;text-align:left;left:110px"><b>Créez</b><span>vos factures en<br>quelques secondes</span></div>
      ${telephone({ image: "IMG_5995", largeur: 860, style: "left:390px;top:880px;transform:rotate(4deg)" })}
      ${carteDocument("left:70px;top:1180px;transform:rotate(-6deg)")}
      ${flecheCourbe("left:60px;top:2420px;transform:rotate(-10deg)")}`,
  },
  {
    nom: "02-pilotez-votre-boutique",
    corps: `
      <div class="titre" style="top:150px"><b>Pilotez</b><span>votre boutique<br>d'un coup d'œil</span></div>
      ${telephone({ image: "IMG_5990", largeur: 900, style: "left:192px;top:820px" })}
      ${pastille("graphique", "left:900px;top:760px")}`,
  },
  {
    nom: "03-alertes-de-stock",
    corps: `
      ${telephone({ image: "IMG_5982", largeur: 780, masque: 165, style: "left:252px;top:330px", retouche: CLIENT_FICTIF })}
      ${notification("left:60px;top:400px;width:1164px")}
      ${pastille("cloche", "left:70px;top:1500px")}
      <div class="titre" style="top:2040px"><b>Soyez alerté</b><span>avant la <em>rupture</em> de stock</span></div>`,
  },
  {
    nom: "04-tout-pour-votre-commerce",
    corps: (() => {
      const lignes = [
        ["facture", "Factures et proformas"],
        ["camion", "Bons de livraison"],
        ["stock", "Stock et inventaires"],
        ["achats", "Achats et dépenses"],
        ["clients", "Clients et fournisseurs"],
        ["signature", "Logo et signature"],
        ["excel", "Import / export Excel"],
      ];
      return `
      <div style="position:absolute;left:150px;top:200px;display:flex;flex-direction:column;gap:56px">
        ${lignes.map(([i, t]) => `<div style="display:flex;align-items:center;gap:56px">
          <div style="width:170px;height:170px;border-radius:42px;background:linear-gradient(145deg,#2fb45a,#147A2E);display:grid;place-items:center;box-shadow:0 18px 40px rgba(0,0,0,.35),inset 0 2px 0 rgba(255,255,255,.2)">${svg(i, 92, "#fff", 1.8)}</div>
          <div style="font-size:84px;font-weight:600;line-height:1.05;max-width:760px">${t}</div></div>`).join("")}
      </div>
      <svg class="fleche" style="right:70px;top:120px" width="260" height="300" viewBox="0 0 260 300" fill="none" stroke="#fff" stroke-width="5" stroke-dasharray="14 14" stroke-linecap="round"><path d="M60 10 C 10 170, 120 250, 230 230"/><path d="M208 212 L232 230 L206 250" stroke-dasharray="0"/></svg>
      <div style="position:absolute;left:0;right:0;top:2060px;text-align:center">
        <div style="display:inline-flex;align-items:center;gap:30px">
          <svg width="90" height="170" viewBox="0 0 90 170" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"><path d="M70 10 C 10 50, 10 120, 70 160"/>${[30, 58, 86, 114].map((y, k) => `<path d="M${42 - k * 3} ${y + 8} q -26 -6 -30 -28" />`).join("")}</svg>
          <div><div style="font-size:96px;font-weight:700;line-height:1">Simple et rapide</div>
            <div style="font-size:52px;font-weight:600;line-height:1.2;margin-top:12px;color:#cfe9d6">pensé pour les commerçants<br>d'Afrique de l'Ouest</div></div>
          <svg width="90" height="170" viewBox="0 0 90 170" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" style="transform:scaleX(-1)"><path d="M70 10 C 10 50, 10 120, 70 160"/>${[30, 58, 86, 114].map((y, k) => `<path d="M${42 - k * 3} ${y + 8} q -26 -6 -30 -28" />`).join("")}</svg>
        </div>
        <div style="margin-top:90px;font-size:50px;font-weight:600;color:#cfe9d6">Vos données synchronisées, toujours à jour</div>
      </div>`;
    })(),
  },
  {
    nom: "05-envoyez-sur-whatsapp",
    corps: `
      <div class="titre" style="top:150px"><b>Envoyez-les</b><span>à vos clients<br>sur <em>WhatsApp</em></span></div>
      ${telephone({ image: "IMG_5996", largeur: 900, sombre: true, style: "left:192px;top:880px" })}
      ${pastille("envoyer", "left:880px;top:780px")}`,
  },
  {
    nom: "06-suivez-vos-ventes",
    corps: `
      <div class="titre" style="top:150px"><b>Suivez</b><span>chaque facture,<br>payée ou non</span></div>
      ${telephone({ image: "IMG_5994", largeur: 900, style: "left:192px;top:820px" })}
      ${pastille("eclair", "left:110px;top:760px")}`,
  },
];

if (existsSync(travail)) rmSync(travail, { recursive: true, force: true });
mkdirSync(travail, { recursive: true });
mkdirSync(sortie, { recursive: true });
for (const e of ecrans) {
  let html = page(e.corps);
  if (e.apres) html = e.apres(html);
  const fichier = join(travail, `${e.nom}.html`);
  writeFileSync(fichier, html);
  const png = join(sortie, `${e.nom}.png`);
  execFileSync(CHROME, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--allow-file-access-from-files",
    `--window-size=${L},${H}`, "--force-device-scale-factor=1", "--virtual-time-budget=8000",
    `--screenshot=${png}`, pathToFileURL(fichier).href], { stdio: "ignore" });
  console.log("✓", png);
}
rmSync(travail, { recursive: true, force: true });
