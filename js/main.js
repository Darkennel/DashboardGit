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
    if (periodeNorm && !testerPeriode(p.DateLivrai || p.Millesime || p.millesime, periodeNorm)) {
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
    config.updateTable(featuresFiltrees, communeNorm);
  }
}

// ==========================================
// CALCULS ET TABLEAUX (STUBS)
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
  const fmtNb = (val) => val.toLocaleString("fr-FR");

  const tableStyle = "width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 0.85em; background-color: #f39c12; color: #ffffff; text-align: center;";
  const tdBorder = "border: 1px solid #e67e22; padding: 6px;";

  // CAS 1 : LOGEMENTS
  if (destSelect === "LOGEMENTS") {
    const res = calculerConstruLogements(data);
    container.innerHTML = `
      <table style="${tableStyle}">
        <tbody>
          <tr>
            <td style="${tdBorder} font-weight: bold; text-align: left;">DIFFUS</td>
            <td style="${tdBorder} text-align: right;">${fmtNb(res.diffuLog)} logements</td>
          </tr>
          <tr>
            <td style="${tdBorder} font-weight: bold; text-align: left;">RU</td>
            <td style="${tdBorder} text-align: right;">${fmtNb(res.ruLog)} logements</td>
          </tr>
          <tr>
            <td style="${tdBorder} font-weight: bold; text-align: left;">Extension</td>
            <td style="${tdBorder} text-align: right;">${fmtNb(res.extLog)} logements (${fmtHa(res.extSurfaceHa)})</td>
          </tr>
        </tbody>
      </table>
    `;
  } 
  
  // CAS 2 : ACTIVITES / EQUIPEMENTS
  else if (destSelect === "ACTIVITES_EQUIPEMENTS") {
    const res = calculerConstruSurfacesConsoDensif(data);
    container.innerHTML = `
      <table style="${tableStyle}">
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
  
  // CAS 3 : TOUT
  else {
    const res = calculerConstruSurfacesConsoDensif(data);
    container.innerHTML = `
      <table style="${tableStyle}">
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
function mettreAJourTableauConstruPlanifiees(data, commune) {}
function mettreAJourTableauConsoPlanifiee(data, commune) {}
function mettreAJourTableauPotentiel(data, commune) {}

// Écouteurs d'événements pour le filtrage et le zoom
document.getElementById("commune-select").addEventListener("change", (e) => {
  const nomCommune = e.target.value;
  
  // 1. Zoomer sur la commune (ou recadrer)
  if (typeof gererZoomCommune === "function") {
    gererZoomCommune(nomCommune);
  }
  
  // 2. Mettre à jour le filtrage des données
  actualiserCarteEtDonnees();
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