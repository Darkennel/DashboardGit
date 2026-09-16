// Variable globale de la couche GeoJSON dynamique active
let activeGeoJsonLayer = null;
let currentLegendControl = null;

// Initialisation au chargement de la page
document.addEventListener("DOMContentLoaded", () => {
  initThemeSelector();
  initCommunes();
  changerTheme(document.getElementById("theme-select").value);
});

// 1. Alimentation du Selecteur de Thèmes
function initThemeSelector() {
  const selectTheme = document.getElementById("theme-select");
  selectTheme.innerHTML = "";
  Object.keys(THEMES_CONFIG).forEach(key => {
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = THEMES_CONFIG[key].label;
    selectTheme.appendChild(opt);
  });
  selectTheme.addEventListener("change", (e) => changerTheme(e.target.value));
}

// 2. Gestionnaire de Changement de Thème (Adaptation UI & Data)
function changerTheme(themeKey) {
  const config = THEMES_CONFIG[themeKey];
  if (!config) return;

  // A. Adapter l'affichage des filtres (Masquer/Afficher les sélecteurs utiles)
  adapterSelecteursFiltres(config.filters);

  // B. Réinitialiser la valeur des filtres (Reset)
  resetFiltresValues();

  // C. Mettre à jour les données sur la carte et le tableau récapitulatif
  actualiserCarteEtDonnees(themeKey);
}

// 3. Masquer/Afficher les filtres selon la configuration du thème
function adapterSelecteursFiltres(allowedFilters) {
  const wrapPeriode = document.getElementById("wrapper-periode");
  const wrapDest = document.getElementById("wrapper-destination");

  wrapPeriode.style.display = allowedFilters.periode ? "block" : "none";
  wrapDest.style.display = allowedFilters.destination ? "block" : "none";

  // Recharger les options du sélecteur de période si spécifiées
  if (allowedFilters.periode) {
    const selectPeriode = document.getElementById("periode-select");
    selectPeriode.innerHTML = '<option value="">-- Toutes les périodes --</option>';
    allowedFilters.periode.forEach(p => {
      const opt = document.createElement("option");
      opt.value = p;
      opt.textContent = p.replace("_", " - ");
      selectPeriode.appendChild(opt);
    });
  }
}

// 4. Reset des filtres
function resetFiltresValues() {
  const selectCommune = document.getElementById("commune-select");
  if (selectCommune) selectCommune.value = "";
  
  const selectPeriode = document.getElementById("periode-select");
  if (selectPeriode) selectPeriode.value = "";
  
  const selectDest = document.getElementById("destination-select");
  if (selectDest) selectDest.value = "TOUT";
}

// 5. Rechargement des données Leaflet + Légende + Tableau
function actualiserCarteEtDonnees(themeKey) {
  const config = THEMES_CONFIG[themeKey || document.getElementById("theme-select").value];
  const dataRaw = config.source();

  // Supprimer l'ancienne couche Leaflet si elle existe
  if (activeGeoJsonLayer) {
    map.removeLayer(activeGeoJsonLayer);
  }

  if (!dataRaw) {
    console.warn(`Aucune donnée disponible pour le thème : ${themeKey}`);
    document.getElementById("entites-count").textContent = "0";
    return;
  }

  // Valeurs actuelles des sélecteurs
  const communeNorm = normaliserTexte(document.getElementById("commune-select").value);
  const wrapPeriode = document.getElementById("wrapper-periode");
  const wrapDest = document.getElementById("wrapper-destination");

  // On ne récupère les filtres QUE si leur wrapper est visible à l'écran
  const periodeNorm = wrapPeriode.style.display !== "none" ? document.getElementById("periode-select")?.value : "";
  const destNorm = wrapDest.style.display !== "none" ? document.getElementById("destination-select")?.value : "TOUT";

  // Filtrage des entités GeoJSON
  const featuresFiltrees = dataRaw.features.filter(f => {
    const p = f.properties || {};

    // 1. Filtre Lieu (Gestion de __NOMCOM et des autres variantes possibles)
    if (communeNorm) {
      const nomComProp = p.__NOMCOM || p.NOMCOM || p.nom_com || p.Commune || 
                         p.commune || p.COMMUNE || p.nomcom || p.nom_commune || p.lib_com;
      
      if (normaliserTexte(nomComProp) !== communeNorm) return false;
    }

    // 2. Filtre Période (uniquement si le filtre est actif)
    if (periodeNorm && config.filters.periode && !testerPeriode(p.DateLivrai || p.Millesime || p.millesime, periodeNorm)) {
      return false;
    }
    // 3. Filtre Destination (uniquement si le filtre est actif)
    if (destNorm && destNorm !== "TOUT") {
      const d = normaliserTexte(p.Destinatio || p.destination || p.DESTINATIO);
      if (destNorm === "LOGEMENTS" && !d.includes("hab")) return false;
      if (destNorm === "ACTIVITES_EQUIPEMENTS" && !d.includes("act") && !d.includes("equip")) return false;
    }

    return true;
  });

  // Mise à jour du compteur
  document.getElementById("entites-count").textContent = featuresFiltrees.length.toLocaleString("fr-FR");

  // Créer un Pane dédié aux données actives si non existant (zIndex 450 > paneCommunes 350)
  if (!map.getPane('paneDonneesActives')) {
    map.createPane('paneDonneesActives');
    map.getPane('paneDonneesActives').style.zIndex = 450;
  }

  // Instancier la nouvelle couche GeoJSON avec le Pane dédié
  activeGeoJsonLayer = L.geoJSON({ type: "FeatureCollection", features: featuresFiltrees }, {
    pane: 'paneDonneesActives',
    style: config.style,
    onEachFeature: (feature, layer) => {
      // 1. Liaison du Popup d'information
      layer.bindPopup(genererContenuPopup(feature.properties));

      // 2. Appel spécifique au thème si présent (ex: marqueurs de logement)
      if (typeof config.onEachFeature === 'function') {
        config.onEachFeature(feature, layer);
      }
    }
  }).addTo(map);

  // 1. Retirer l'ancienne légende proprement
  if (currentLegendControl) {
    map.removeControl(currentLegendControl);
    currentLegendControl = null;
  }

  // 2. Récupérer et afficher la nouvelle légende
  if (typeof config.legend === 'function') {
    const legendInst = config.legend();
    if (legendInst && typeof legendInst.addTo === 'function') {
      currentLegendControl = legendInst;
      currentLegendControl.addTo(map);
    }
  }

  // Mise à jour de la Sidebar
  if (typeof config.updateTable === 'function') {
      // Passer la commune sélectionnée
      config.updateTable(featuresFiltrees, communeNorm); 
    }
}

// ==========================================
// CALCULS ET TABLEAUX
// ==========================================

function mettreAJourTableauEnafActuel(data, commune) {
  const container = document.getElementById("sidebar-recap-container");
  if (!container) return;

  const stats = calculerSurfacesEnafActuel(data);

  // Formatage des nombres avec séparateurs et décimales
  const fmtHa = (val) => val.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + " ha";
  const fmtPct = (val) => val.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + " %";

  container.innerHTML = `
    <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 0.85em; background-color: #c6c7c6; color: #ffffff;">
      <tbody>
        <tr style="border-bottom: 1px solid ;">
          <td style="padding: 8px; font-weight: bold;">Espaces urbanisés (non-ENAF)</td>
          <td style="padding: 8px; text-align: right;">${fmtHa(stats.nonEnafHa)} (${fmtPct(stats.nonEnafPct)})</td>
        </tr>
        <tr>
          <td style="padding: 8px; font-weight: bold;">Espaces Naturels, Agricoles et Forestiers (ENAF)</td>
          <td style="padding: 8px; text-align: right;">${fmtHa(stats.enafHa)} (${fmtPct(stats.enafPct)})</td>
        </tr>
      </tbody>
    </table>
  `;
}

function mettreAJourTableauConsoEffective(data, commune) {
  const container = document.getElementById("sidebar-recap-container");
  if (!container) return;

  const stats = calculerConsoEffective(data);

  // Formatage avec 1 décimale
  const fmtHa = (val) => val.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  container.innerHTML = `
    <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 0.85em; background-color: #f39c12; color: #ffffff;">
      <tbody>
        <tr>
          <td style="padding: 10px; font-weight: bold; vertical-align: middle;">Consommation d’ENAF</td>
          <td style="padding: 10px; text-align: right; line-height: 1.5;">
            <div>${fmtHa(stats.totaleHa)} ha</div>
            <div style="font-size: 0.9em; opacity: 0.9;">${fmtHa(stats.moyenneAnnuelleHa)} ha/an</div>
          </td>
        </tr>
      </tbody>
    </table>
  `;
}

function mettreAJourTableauConstruEffectives(data, commune) {
  const container = document.getElementById("sidebar-recap-container");
  if (!container) return;

  const destSelect = document.getElementById("destination-select")?.value || "TOUT";
  const fmtHa = (val) => val.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + " ha";
  const fmtNb = (val) => val.toLocaleString("fr-FR") + " log.";

  const tableStyle = "width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 0.85em; background-color: #f39c12; color: #ffffff;";
  const tdBorder = "border: 1px solid #e67e22; padding: 6px;";

  // SÉLECTEUR 1 : LOGEMENTS / HABITATION
  if (destSelect === "LOGEMENTS") {
    const res = calculerConstruLogements(data);
    container.innerHTML = `
      <table style="${tableStyle}">
        <tbody>
          <tr>
            <td style="${tdBorder} font-weight: bold;">Densification diffuse (DC + DP)</td>
            <td style="${tdBorder} text-align: right;">${fmtNb(res.diffuLog)}</td>
          </tr>
          <tr>
            <td style="${tdBorder} font-weight: bold;">Renouvellement urbain</td>
            <td style="${tdBorder} text-align: right;">${fmtNb(res.ruLog)}</td>
          </tr>
          <tr>
            <td style="${tdBorder} font-weight: bold;">Extension</td>
            <td style="${tdBorder} text-align: right;">${fmtNb(res.extLog)} (${fmtHa(res.extSurfaceHa)})</td>
          </tr>
        </tbody>
      </table>
    `;
  } 
  
  // SÉLECTEUR 2 : ACTIVITÉ / ÉQUIPEMENTS
  else if (destSelect === "ACTIVITES_EQUIPEMENTS") {
    const res = calculerConstruSurfacesConsoDensif(data);
    container.innerHTML = `
      <table style="${tableStyle} text-align: center;">
        <thead>
          <tr>
            <th colspan="2" style="${tdBorder} font-size: 1.05em;">Activités</th>
            <th colspan="2" style="${tdBorder} font-size: 1.05em;">Équipements</th>
          </tr>
          <tr>
            <th style="${tdBorder}">Conso</th>
            <th style="${tdBorder}">Densif</th>
            <th style="${tdBorder}">Conso</th>
            <th style="${tdBorder}">Densif</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="${tdBorder}">${fmtHa(res.actConsoHa)}</td>
            <td style="${tdBorder}">${fmtHa(res.actDensifHa)}</td>
            <td style="${tdBorder}">${fmtHa(res.equipConsoHa)}</td>
            <td style="${tdBorder}">${fmtHa(res.equipDensifHa)}</td>
          </tr>
        </tbody>
      </table>
    `;
  } 
  
  // SÉLECTEUR 3 : TOUT
  else {
    const res = calculerConstruSurfacesConsoDensif(data);
    container.innerHTML = `
      <table style="${tableStyle} text-align: center;">
        <thead>
          <tr>
            <th colspan="2" style="${tdBorder} font-size: 1.05em;">Tout</th>
          </tr>
          <tr>
            <th style="${tdBorder}">Conso</th>
            <th style="${tdBorder}">Densif</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="${tdBorder}">${fmtHa(res.toutConsoHa)}</td>
            <td style="${tdBorder}">${fmtHa(res.toutDensifHa)}</td>
          </tr>
        </tbody>
      </table>
    `;
  }
}

function mettreAJourTableauConstruPlanifiees(data, commune) {
  const container = document.getElementById("sidebar-recap-container");
  if (!container) return;

  const destSelect = document.getElementById("destination-select")?.value || "TOUT";
  const fmtLog = (val) => val.toLocaleString("fr-FR") + " log.";
  const fmtHa = (val) => val.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + " ha";

  const tableStyle = "width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 0.85em; background-color: #e67e22; color: #ffffff; text-align: center;";
  const tdBorder = "border: 1px solid #d35400; padding: 6px;";

  // 1. HABITATION / LOGEMENTS -> Unité : log.
  if (destSelect === "LOGEMENTS") {
    const res = calculerPlanifieesLogements(data);
    container.innerHTML = `
      <table style="${tableStyle}">
        <thead>
          <tr>
            <th style="${tdBorder}"></th>
            <th colspan="2" style="${tdBorder} font-size: 1.05em;">Habitat ou mixte</th>
          </tr>
          <tr>
            <th style="${tdBorder}"></th>
            <th style="${tdBorder}">Conso</th>
            <th style="${tdBorder}">Densif</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="${tdBorder} text-align: left; font-weight: bold;">Constructions autorisées</td>
            <td style="${tdBorder}">${fmtLog(res.autConso)}</td>
            <td style="${tdBorder}">${fmtLog(res.autDensif)}</td>
          </tr>
          <tr>
            <td style="${tdBorder} text-align: left; font-weight: bold;">Constructions projetées</td>
            <td style="${tdBorder}">${fmtLog(res.projConso)}</td>
            <td style="${tdBorder}">${fmtLog(res.projDensif)}</td>
          </tr>
        </tbody>
      </table>
    `;
  } 
  
  // 2. ACTIVITÉS / ÉQUIPEMENTS -> Unité : ha
  else if (destSelect === "ACTIVITES_EQUIPEMENTS") {
    const res = calculerPlanifieesActEquipSurfaces(data);
    container.innerHTML = `
      <table style="${tableStyle}">
        <thead>
          <tr>
            <th style="${tdBorder}"></th>
            <th colspan="2" style="${tdBorder} font-size: 1.05em;">Activités - Equipements</th>
          </tr>
          <tr>
            <th style="${tdBorder}"></th>
            <th style="${tdBorder}">Conso</th>
            <th style="${tdBorder}">Densif</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="${tdBorder} text-align: left; font-weight: bold;">Constructions autorisées</td>
            <td style="${tdBorder}">${fmtHa(res.autConsoHa)}</td>
            <td style="${tdBorder}">${fmtHa(res.autDensifHa)}</td>
          </tr>
          <tr>
            <td style="${tdBorder} text-align: left; font-weight: bold;">Constructions projetées</td>
            <td style="${tdBorder}">${fmtHa(res.projConsoHa)}</td>
            <td style="${tdBorder}">${fmtHa(res.projDensifHa)}</td>
          </tr>
        </tbody>
      </table>
    `;
  } 
  
  // 3. TOUT -> Unité : ha
  else {
    const res = calculerPlanifieesActEquipSurfaces(data);
    container.innerHTML = `
      <table style="${tableStyle}">
        <thead>
          <tr>
            <th style="${tdBorder}"></th>
            <th colspan="2" style="${tdBorder} font-size: 1.05em;">Tout</th>
          </tr>
          <tr>
            <th style="${tdBorder}"></th>
            <th style="${tdBorder}">Conso</th>
            <th style="${tdBorder}">Densif</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="${tdBorder} text-align: left; font-weight: bold;">Constructions autorisées</td>
            <td style="${tdBorder}">${fmtHa(res.autConsoHa)}</td>
            <td style="${tdBorder}">${fmtHa(res.autDensifHa)}</td>
          </tr>
          <tr>
            <td style="${tdBorder} text-align: left; font-weight: bold;">Constructions projetées</td>
            <td style="${tdBorder}">${fmtHa(res.projConsoHa)}</td>
            <td style="${tdBorder}">${fmtHa(res.projDensifHa)}</td>
          </tr>
        </tbody>
      </table>
    `;
  }
}

function mettreAJourTableauConsoPlanifiee(data, commune) {}
function mettreAJourTableauPotentiel(data, commune) {}

// Écouteurs d'événements pour le filtrage et le zoom
document.getElementById("commune-select").addEventListener("change", (e) => {
  const nomCommune = e.target.value;
  
  if (typeof gererZoomCommune === "function") {
    gererZoomCommune(nomCommune);
  }
  
  // Transmettre le thème actuel à actualiserCarteEtDonnees
  const currentTheme = document.getElementById("theme-select").value;
  actualiserCarteEtDonnees(currentTheme);
});

document.getElementById("periode-select")?.addEventListener("change", () => actualiserCarteEtDonnees());
document.getElementById("destination-select")?.addEventListener("change", () => actualiserCarteEtDonnees());

document.getElementById("btn-reset").addEventListener("click", () => {
  resetFiltresValues();
  if (typeof gererZoomCommune === "function") {
    gererZoomCommune(""); // Recadre sur l'ensemble du SICOVAL
  }
  actualiserCarteEtDonnees();
});

// Écouteur pour l'export vectoriel SVG
document.getElementById("btn-export-svg")?.addEventListener("click", () => {
  exporterCarteSVG();
});

function mettreAJourTableauIndicateursCaracterisation(features, communeNorm = "") {
  const container = document.getElementById("sidebar-recap-container");
  if (!container) return;

  const periodeChoisie = document.getElementById("periode-select")?.value || "";
  const stats = calculerIndicateursCaracterisation(features, communeNorm, periodeChoisie);

  const tableStyle = "width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 0.85em; background-color: #2c3e50; color: #ffffff;";
  const tdLabelStyle = "padding: 8px; border-bottom: 1px solid #34495e; font-weight: bold;";
  const tdValStyle = "padding: 8px; border-bottom: 1px solid #34495e; text-align: right; white-space: nowrap;";

  container.innerHTML = `
    <div style="font-weight: bold; font-size: 0.9em; margin-top: 15px; color: #2c3e50;">
      Indicateurs de caractérisation
    </div>
  `;
}

// ==========================================
// 1. Déclarations DOM et variables
// ==========================================
const selectCommune = document.getElementById("commune-select");
const selectPeriode = document.getElementById("periode-select");
const btnReset = document.getElementById("btn-reset");
const selectMode = document.getElementById("mode-select");

let styleActuel = styleProductionLgt; 

// 2. Remplissage du sélecteur des communes
const communes = [];
communesLayer.eachLayer(layer => {
  const nom = layer.feature.properties.NOMCOM || layer.feature.properties.nom || "";
  communes.push({ nom: nom, layer: layer });
});

communes.sort((a, b) => a.nom.localeCompare(b.nom));
communes.forEach(c => {
  const option = document.createElement("option");
  option.value = c.nom;
  option.textContent = c.nom;
  selectCommune.appendChild(option);
});

// 3. Mettre à jour le tableau récapitulatif
function mettreAJourTableau(features, communeChoisie = "", periodeChoisie = "") {
  let logIntensif = 0, surfIntensif = 0;
  let logEnaf = 0, surfEnaf = 0;
  let surfACTEQPIntensif = 0, surfACTEQEnaf = 0;
  let surfACTEQPTotal = 0;
  
  let logDP = 0, logDC = 0, logRU = 0;

  const communeNorm = normaliserTexte(communeChoisie);

  features.forEach(f => {
    const p = f.properties;

    if (!testerPeriode(p.DateLivrai, periodeChoisie)) return;

    const nbLog = Number(p.NBLogement) || 0;
    const surf = Number(p.Shape_Area) || 0;
    const typeUrb = normaliserTexte(p.Urbanisati);
    const destination = normaliserTexte(p.Destinatio);
    const typeUrba = normaliserTexte(p.Type2Urban);
    
    const isIntensif = typeUrb.includes("intensif");
    const isEnaf = typeUrb.includes("conso enaf") || typeUrb.includes("conso_enaf") || typeUrb.includes("consoenaf");

    const isHab = destination.includes("hab");
    const isACT = destination.includes("act");
    const isEQ = destination.includes("equip");
    const isActOrEq = isACT || isEQ;

    if (isIntensif && isHab) {
      logIntensif += nbLog;
      surfIntensif += surf;

      if (typeUrba.includes("dp")) logDP += nbLog;
      else if (typeUrba.includes("dc")) logDC += nbLog;
      else if (typeUrba.includes("ru")) logRU += nbLog;

    } else if (isEnaf && isHab) {
      logEnaf += nbLog;
      surfEnaf += surf;
    }

    if (isIntensif && isActOrEq) {
      surfACTEQPIntensif += surf;
      surfACTEQPTotal += surf;
    } else if (isEnaf && isActOrEq) {
      surfACTEQEnaf += surf;
      surfACTEQPTotal += surf;
    }  
  });

  const stats = calculerStatistiquesSurfaces(features, communeNorm, periodeChoisie);
  const densiteHectare = calculerRatioLogementsParHectare(features, communeNorm, periodeChoisie);

  const logTotal = logIntensif + logEnaf;
  const partIntensif = logTotal > 0 ? Math.round((logIntensif / logTotal) * 100) : 0;
  const partEnaf = logTotal > 0 ? Math.round((logEnaf / logTotal) * 100) : 0;

  document.getElementById("log-intensif").textContent = logIntensif.toLocaleString("fr-FR");
  document.getElementById("log-enaf").textContent = logEnaf.toLocaleString("fr-FR");
  document.getElementById("log-total").textContent = logTotal.toLocaleString("fr-FR");
  document.getElementById("logDP").textContent = logDP.toLocaleString("fr-FR");
  document.getElementById("logDC").textContent = logDC.toLocaleString("fr-FR");
  document.getElementById("logRU").textContent = logRU.toLocaleString("fr-FR");
    
  document.getElementById("part-logIntensif").textContent = `${partIntensif} %`;
  document.getElementById("part-logEnaf").textContent = `${partEnaf} %`;

  document.getElementById("surf-intensif").textContent = Math.round(surfIntensif).toLocaleString("fr-FR");
  document.getElementById("surf-enaf").textContent = Math.round(surfEnaf).toLocaleString("fr-FR");
  document.getElementById("surf-total").textContent = Math.round(surfIntensif + surfEnaf).toLocaleString("fr-FR");

  document.getElementById("surfACTEQPIntensif").textContent = Math.round(surfACTEQPIntensif).toLocaleString("fr-FR");
  document.getElementById("surfACTEQEnaf").textContent = Math.round(surfACTEQEnaf).toLocaleString("fr-FR");
  document.getElementById("surfARCEQUTOTAL").textContent = Math.round(surfACTEQPTotal).toLocaleString("fr-FR");

  document.getElementById("log-IC1").textContent = `${Math.round(stats.q1).toLocaleString("fr-FR")} m²`;
  document.getElementById("log-IC2").textContent = `${Math.round(stats.mediane).toLocaleString("fr-FR")} m²`;
  document.getElementById("log-IC3").textContent = `${Math.round(densiteHectare).toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} lgt/ha`;
}

// 2. Calcul du tableau récapitulatif Consommation (ENAF)
function mettreAJourTableauConso(features, champAnnee = "ENAF2022") {
  // Somme des surfaces où le champ ENAF sélectionné vaut "oui"
  const surfaceEnafOui = features
    .filter(f => normaliserTexte(f.properties[champAnnee]) === "oui")
    .reduce((acc, f) => acc + (Number(f.properties.Shape_Area) || 0), 0);

  // Conversion en hectares (1 ha = 10 000 m²)
  const surfaceOuiHa = surfaceEnafOui / 10000;

  const elEnafHa = document.getElementById("surf-enaf-ha");
  if (elEnafHa) {
    elEnafHa.textContent = `${surfaceOuiHa.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} ha`;
  }
}

// 4. Gestion unique de l'affichage des légendes
function mettreAJourLegende(styleChoisi) {
  if (map.hasLayer(legendTypologie)) map.removeControl(legendTypologie);
  if (map.hasLayer(legendDestination)) map.removeControl(legendDestination);
  if (map.hasLayer(legendConso)) map.removeControl(legendConso);

  if (styleChoisi === "destination") {
    legendDestination.addTo(map);
  } else if (styleChoisi === "conso") {
    legendConso.addTo(map);
  } else {
    legendTypologie.addTo(map);
  }
}

// 5. Fonction principale de filtrage, zoom et popups
// ==========================================
// APPLICATION DES FILTRES ET MISE À JOUR
// ==========================================
function appliquerFiltres() {
  const modeActif = selectMode.value;
  const communeChoisie = selectCommune.value;
  const periodeChoisie = selectPeriode.value;
  const communeNorm = normaliserTexte(communeChoisie);

  suiviLayer.clearLayers();
  consoLayer.clearLayers();

  if (modeActif === "suivi") {
    // Mode SUIVI CONSTRUCTION
    const featuresFiltrees = suiviConstru.features.filter(feature => {
      const p = feature.properties;
      const matchCommune = !communeChoisie || normaliserTexte(p.Commune) === communeNorm;
      const matchPeriode = testerPeriode(p.DateLivrai, periodeChoisie);
      return matchCommune && matchPeriode;
    });

    document.getElementById("entites-count").textContent = featuresFiltrees.length.toLocaleString("fr-FR");

    suiviLayer.addData(featuresFiltrees);
    suiviLayer.eachLayer(layer => {
      if (layer.feature) onEachSuiviFeature(layer.feature, layer);
    });

    suiviLayer.setStyle(styleActuel);
    suiviLayer.bringToFront();

    mettreAJourTableau(featuresFiltrees, communeChoisie, periodeChoisie);

  } else if (modeActif === "conso") {
    const sourceEnaf = (typeof Enaf !== 'undefined' && Enaf && Array.isArray(Enaf.features))
      ? Enaf.features
      : [];

    // Récupération du champ ENAF choisi (ex: ENAF2022, ENAF2019, ...)
    const selectEnaf = document.getElementById("periode-enaf-select");
    const champAnnee = selectEnaf ? selectEnaf.value : "ENAF2022";

    // Filtrage dynamique : commune choisie ET champ ENAF sélectionné = "oui"
    const featuresFiltrees = sourceEnaf.filter(feature => {
      if (!feature || !feature.properties) return false;
      const p = feature.properties;

      const nomCommune = p.lib_com || p.LIB_COM || p.Commune || p.COMMUNE || p.nom_com || "";
      const matchCommune = !communeChoisie || normaliserTexte(nomCommune) === communeNorm;
      const matchEnaf = normaliserTexte(p[champAnnee]) === "oui";

      return matchCommune && matchEnaf;
    });

    // Mise à jour de la carte
    consoLayer.clearLayers();
    if (featuresFiltrees.length > 0) {
      consoLayer.addData(featuresFiltrees);
      consoLayer.eachLayer(layer => {
        if (layer.feature) onEachEnafFeature(layer.feature, layer);
      });
      consoLayer.setStyle(styleConsommation);
      consoLayer.bringToFront();
    }

    const elCount = document.getElementById("entites-count");
    if (elCount) elCount.textContent = featuresFiltrees.length.toLocaleString("fr-FR");

    mettreAJourLegende("conso");
    mettreAJourTableauConso(featuresFiltrees, champAnnee);
  }
  // Zoom et mise en valeur de la commune sélectionnée
  communesLayer.eachLayer(layer => layer.setStyle(styleNormal));

  if (communeChoisie !== "") {
    let communeTrouvee = null;

    communesLayer.eachLayer(layer => {
      const nomCommuneLayer = normaliserTexte(layer.feature.properties.NOMCOM || layer.feature.properties.nom || "");
      if (nomCommuneLayer === communeNorm) {
        communeTrouvee = layer;
      }
    });

    if (communeTrouvee) {
      communeTrouvee.setStyle(styleSelection);
      communeTrouvee.bringToFront();
      
      const bounds = communeTrouvee.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [20, 20], maxZoom: 16 });
      }
    }
  } else {
    if (communesLayer.getLayers().length > 0) {
      map.fitBounds(communesLayer.getBounds());
    }
  }
}

function changerModeAnalyse() {
  const modeActif = selectMode.value;

  if (modeActif === "suivi") {
    // 1. Gestion des couches sur la carte
    if (map.hasLayer(consoLayer)) map.removeLayer(consoLayer);
    if (!map.hasLayer(suiviLayer)) map.addLayer(suiviLayer);

    // 2. Affichage des panneaux dans la sidebar
    document.getElementById("section-suivi").style.display = "block";
    document.getElementById("section-conso").style.display = "none";

    // 3. Mise à jour de la légende et du style si besoin
    mettreAJourLegende("typologie");
    basculerSelecteursPeriode("suivi");

  } else if (modeActif === "conso") {
    // 1. Gestion des couches
    if (map.hasLayer(suiviLayer)) map.removeLayer(suiviLayer);
    if (!map.hasLayer(consoLayer)) map.addLayer(consoLayer);

    // 2. Affichage des panneaux
    document.getElementById("section-suivi").style.display = "none";
    document.getElementById("section-conso").style.display = "block";

    // 3. Légende spécifique au mode consommation
    mettreAJourLegende("conso");
    basculerSelecteursPeriode("conso");
  }

  // Ré-appliquer les filtres (commune/période) sur le nouveau mode
  appliquerFiltres();
}

// 6. Écouteurs d'événements
selectCommune.addEventListener("change", appliquerFiltres);
selectPeriode.addEventListener("change", appliquerFiltres);
selectMode.addEventListener("change", changerModeAnalyse);
btnReset.addEventListener("click", function() {
  selectCommune.value = "";
  selectPeriode.value = "";
  appliquerFiltres();
});

document.addEventListener("change", function (e) {
  if (e.target && e.target.id === "style-select") {
    const styleChoisi = e.target.value;

    if (styleChoisi === "destination") {
      styleActuel = styleDestination;
    } else {
      styleActuel = styleProductionLgt;
    }

    mettreAJourLegende(styleChoisi);
    suiviLayer.setStyle(styleActuel);
  }
});

// Initialisations au chargement
mettreAJourLegende("typologie");
basculerSelecteursPeriode(selectMode.value);
appliquerFiltres();

// Export CSV
function exporterTableauxCSV() {
  const commune = selectCommune.value || "Toutes les communes";
  const periode = selectPeriode.value || "Toutes les périodes";

  let csvContent = "\uFEFF";
  csvContent += `Export Récapitulatif;${commune};Période : ${periode}\n\n`;

  csvContent += "RECAPITULATIF LOGEMENTS\n";
  csvContent += "Type;Logements;Part (%)\n";
  csvContent += `Intensif;${document.getElementById("log-intensif").textContent};${document.getElementById("part-logIntensif").textContent}\n`;
  csvContent += `ConsoEnaf;${document.getElementById("log-enaf").textContent};${document.getElementById("part-logEnaf").textContent}\n`;
  csvContent += `Total;${document.getElementById("log-total").textContent};100 %\n\n`;

  csvContent += "RECAPITULATIF SURFACES (m²)\n";
  csvContent += "Type;Surface HAB;Surface ACT-EQP\n";
  csvContent += `Intensif;${document.getElementById("surf-intensif").textContent};${document.getElementById("surfACTEQPIntensif").textContent}\n`;
  csvContent += `ConsoEnaf;${document.getElementById("surf-enaf").textContent};${document.getElementById("surfACTEQEnaf").textContent}\n`;
  csvContent += `Total;${document.getElementById("surf-total").textContent};${document.getElementById("surfARCEQUTOTAL").textContent}\n\n`;

  csvContent += "DETAIL TYPE INTENSIF\n";
  csvContent += "Type Intensif;Valeur\n";
  csvContent += `Division parcellaire;${document.getElementById("logDP").textContent}\n`;
  csvContent += `Dent creuse;${document.getElementById("logDC").textContent}\n`;
  csvContent += `Renouvellement urbain;${document.getElementById("logRU").textContent}\n\n`;

  csvContent += "INDICATEURS LOGEMENTS\n";
  csvContent += "Indicateur;Valeur\n";
  csvContent += `ID1 (Q1);${document.getElementById("log-IC1").textContent}\n`;
  csvContent += `ID2 (Médiane);${document.getElementById("log-IC2").textContent}\n`;
  csvContent += `ID3 (Densité);${document.getElementById("log-IC3").textContent}\n`;

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  
  const nomFichier = `recapitulatif_${commune.toLowerCase().replace(/\s+/g, "_")}.csv`;
  link.setAttribute("href", url);
  link.setAttribute("download", nomFichier);
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

document.getElementById("btn-export-csv").addEventListener("click", exporterTableauxCSV);

// Changer le champ ENAF affiché (2022, 2019, ...) réapplique immédiatement filtres, style, popups, légende et tableau
document.getElementById("periode-enaf-select")?.addEventListener("change", appliquerFiltres);

function basculerSelecteursPeriode(mode) {
  const selectClassique = document.getElementById("periode-select");
  const labelClassique = document.getElementById("label-periode-classique");
  const selectEnaf = document.getElementById("periode-enaf-select");
  const labelEnaf = document.getElementById("label-periode-enaf");

  if (mode === "conso") {
    if (selectClassique) selectClassique.style.display = "none";
    if (labelClassique) labelClassique.style.display = "none";
    if (selectEnaf) selectEnaf.style.display = "block";
    if (labelEnaf) labelEnaf.style.display = "block";
  } else {
    if (selectClassique) selectClassique.style.display = "block";
    if (labelClassique) labelClassique.style.display = "inline-block";
    if (selectEnaf) selectEnaf.style.display = "none";
    if (labelEnaf) labelEnaf.style.display = "none";
  }
}


