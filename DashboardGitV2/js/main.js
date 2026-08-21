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
  document.getElementById("commune-select").value = "";
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

  // Filtrage des entités GeoJSON
  const communeNorm = normaliserTexte(document.getElementById("commune-select").value);
  const periodeNorm = document.getElementById("periode-select")?.value;
  const destNorm = document.getElementById("destination-select")?.value;

  const featuresFiltrees = dataRaw.features.filter(f => {
    const p = f.properties || {};
    // Filtre Lieu (Commune / SICOVAL)
    if (communeNorm && normaliserTexte(p.Commune || p.lib_com || p.NOMCOM) !== communeNorm) return false;
    // Filtre Période
    if (periodeNorm && !testerPeriode(p.DateLivrai || p.Millesime, periodeNorm)) return false;
    // Filtre Destination
    if (destNorm && destNorm !== "TOUT") {
      const d = normaliserTexte(p.Destinatio);
      if (destNorm === "LOGEMENTS" && !d.includes("hab")) return false;
      if (destNorm === "ACTIVITES_EQUIPEMENTS" && !d.includes("act") && !d.includes("equip")) return false;
    }
    return true;
  });

  // Mise à jour du compteur
  document.getElementById("entites-count").textContent = featuresFiltrees.length.toLocaleString("fr-FR");

  // Instancier la nouvelle couche GeoJSON avec le style du thème
  activeGeoJsonLayer = L.geoJSON({ type: "FeatureCollection", features: featuresFiltrees }, {
    style: config.style,
    onEachFeature: (feature, layer) => {
      layer.bindPopup(genererContenuPopup(feature.properties));
    }
  }).addTo(map);
if (typeof activeGeoJsonLayer.bringToFront === 'function') {
    activeGeoJsonLayer.bringToFront();
  }
 // Retirer l'ancienne légende si elle existe
if (typeof currentLegendControl !== 'undefined' && currentLegendControl) {
  if (typeof currentLegendControl.remove === 'function') {
    currentLegendControl.remove();
  }
}


// Récupérer la légende configurée pour le thème
const legendConfig = config.legend; // CORRIGÉ : config.legend au lieu de THEMES_CONFIG.legend
  let legendData = typeof legendConfig === 'function' ? legendConfig() : legendConfig;

  // Si une légende valide est retournée
  if (legendData && typeof legendData.addTo === 'function') {
    currentLegendControl = legendData;
    currentLegendControl.addTo(map);
  } else {
    currentLegendControl = null;
  }
  // Mise à jour de la Sidebar (Tableaux récapitulatifs)
  config.updateTable(featuresFiltrees, communeNorm);

  // Zoom sur la commune ou l'emprise globale
  const communeSelectionnee = document.getElementById("commune-select").value;
  gererZoomCommune(communeSelectionnee);
}

// ==========================================
// CALCULS ET TABLEAUX (STUBS)
// ==========================================

function mettreAJourTableauEnafActuel(data, commune) {
  // À compléter plus tard
}

function mettreAJourTableauConsoEffective(data, commune) {
  // À compléter plus tard
}

function mettreAJourTableauConstruEffectives(data, commune) {
  // À compléter plus tard
}

function mettreAJourTableauConstruPlanifiees(data, commune) {
  // À compléter plus tard
}

function mettreAJourTableauConsoPlanifiee(data, commune) {
  // À compléter plus tard
}

function mettreAJourTableauPotentiel(data, commune) {
  // À compléter plus tard
}

// Écouteurs d'événements pour le filtrage
document.getElementById("commune-select").addEventListener("change", () => actualiserCarteEtDonnees());
document.getElementById("periode-select")?.addEventListener("change", () => actualiserCarteEtDonnees());
document.getElementById("destination-select")?.addEventListener("change", () => actualiserCarteEtDonnees());
document.getElementById("btn-reset").addEventListener("click", () => {
  resetFiltresValues();
  actualiserCarteEtDonnees();
});
