// 1. Déclarations des éléments DOM et variables globales
const selectCommune = document.getElementById("commune-select");
const selectPeriode = document.getElementById("periode-select");
const btnReset = document.getElementById("btn-reset");

// Style actif par défaut
let styleActuel = styleProductionLgt; 

// Affichage du nombre de communes
document.getElementById("communes-count").textContent = communesLayer.getLayers().length;

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

// 3. Mettre à jour les récapitulatifs dans le DOM
function mettreAJourTableau(features, communeChoisie = "", periodeChoisie = "") {
  let logIntensif = 0, surfIntensif = 0;
  let logEnaf = 0, surfEnaf = 0;
  let surfACTEQPIntensif = 0, surfACTEQEnaf = 0;
  let surfACTEQPTotal = 0;
  
  // Compteurs pour la ventilation Type Intensif
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

// Logements HAB
    if (isIntensif && isHab) {
      logIntensif += nbLog;
      surfIntensif += surf;

      // Ventilation par typologie en zone intensive
      if (typeUrba.includes("dp")) logDP += nbLog;
      else if (typeUrba.includes("dc")) logDC += nbLog;
      else if (typeUrba.includes("ru")) logRU += nbLog;

    } else if (isEnaf && isHab) {
      logEnaf += nbLog;
      surfEnaf += surf;
    }

    // Surfaces Activités et Équipements
    if (isIntensif && isActOrEq) {
      surfACTEQPIntensif += surf;
      surfACTEQPTotal += surf;
    } else if (isEnaf && isActOrEq) {
      surfACTEQEnaf += surf;
      surfACTEQPTotal += surf;
    }  
  });

  // Calculs statistiques
  const stats = calculerStatistiquesSurfaces(features, communeNorm, periodeChoisie);
  const densiteHectare = calculerRatioLogementsParHectare(features, communeNorm, periodeChoisie);

  const logTotal = logIntensif + logEnaf;
  const partIntensif = logTotal > 0 ? Math.round((logIntensif / logTotal) * 100) : 0;
  const partEnaf = logTotal > 0 ? Math.round((logEnaf / logTotal) * 100) : 0;

  // Injection DOM - Logements
  document.getElementById("log-intensif").textContent = logIntensif.toLocaleString("fr-FR");
  document.getElementById("log-enaf").textContent = logEnaf.toLocaleString("fr-FR");
  document.getElementById("log-total").textContent = logTotal.toLocaleString("fr-FR");
  document.getElementById("logDP").textContent = logDP.toLocaleString("fr-FR");
  document.getElementById("logDC").textContent = logDC.toLocaleString("fr-FR");
  document.getElementById("logRU").textContent = logRU.toLocaleString("fr-FR");

    
  document.getElementById("part-logIntensif").textContent = `${partIntensif} %`;
  document.getElementById("part-logEnaf").textContent = `${partEnaf} %`;

  // Injection DOM - Surfaces
  document.getElementById("surf-intensif").textContent = Math.round(surfIntensif).toLocaleString("fr-FR");
  document.getElementById("surf-enaf").textContent = Math.round(surfEnaf).toLocaleString("fr-FR");
  document.getElementById("surf-total").textContent = Math.round(surfIntensif + surfEnaf).toLocaleString("fr-FR");

  document.getElementById("surfACTEQPIntensif").textContent = Math.round(surfACTEQPIntensif).toLocaleString("fr-FR");
  document.getElementById("surfACTEQEnaf").textContent = Math.round(surfACTEQEnaf).toLocaleString("fr-FR");
  document.getElementById("surfARCEQUTOTAL").textContent = Math.round(surfACTEQPTotal).toLocaleString("fr-FR");

  // Injection DOM - Indicateurs
  document.getElementById("log-IC1").textContent = `${Math.round(stats.q1).toLocaleString("fr-FR")} m²`;
  document.getElementById("log-IC2").textContent = `${Math.round(stats.mediane).toLocaleString("fr-FR")} m²`;
  document.getElementById("log-IC3").textContent = `${densiteHectare.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} lgt/ha`;
}

// 4. Gestion unique de l'affichage des légendes
function mettreAJourLegende(styleChoisi) {
  if (map.hasLayer(legendTypologie)) map.removeControl(legendTypologie);
  if (map.hasLayer(legendDestination)) map.removeControl(legendDestination);

  if (styleChoisi === "destination") {
    legendDestination.addTo(map);
  } else {
    legendTypologie.addTo(map);
  }
}

// 5. Fonction principale de filtrage et zoom
function appliquerFiltres() {
  const communeChoisie = selectCommune.value;
  const periodeChoisie = selectPeriode.value;
  const communeNorm = normaliserTexte(communeChoisie);

  const featuresFiltrees = suiviConstru.features.filter(feature => {
    const p = feature.properties;
    const matchCommune = !communeChoisie || normaliserTexte(p.Commune) === communeNorm;
    const matchPeriode = testerPeriode(p.DateLivrai, periodeChoisie);
    
    return matchCommune && matchPeriode;
  });

  suiviLayer.clearLayers();
  suiviLayer.addData(featuresFiltrees);
  suiviLayer.setStyle(styleActuel);

  mettreAJourTableau(featuresFiltrees, communeChoisie, periodeChoisie);

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

      // Vérification que l'emprise existe avant de zoomer
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

// 6. Écouteurs d'événements
selectCommune.addEventListener("change", appliquerFiltres);
selectPeriode.addEventListener("change", appliquerFiltres);

btnReset.addEventListener("click", function() {
  selectCommune.value = "";
  selectPeriode.value = "";
  appliquerFiltres();
});

// Changement dynamique de thème et légende
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
appliquerFiltres();

// Fonction pour exporter les récapitulatifs au format CSV
function exporterTableauxCSV() {
  const commune = selectCommune.value || "Toutes les communes";
  const periode = selectPeriode.value || "Toutes les périodes";

  // En-tête avec métadonnées et colonnes
  let csvContent = "\uFEFF"; // BOM UTF-8 pour un affichage correct des accents dans Excel
  csvContent += `Export Récapitulatif;${commune};Période : ${periode}\n\n`;

  // Section 1 : Logements
  csvContent += "RECAPITULATIF LOGEMENTS\n";
  csvContent += "Type;Logements;Part (%)\n";
  csvContent += `Intensif;${document.getElementById("log-intensif").textContent};${document.getElementById("part-logIntensif").textContent}\n`;
  csvContent += `ConsoEnaf;${document.getElementById("log-enaf").textContent};${document.getElementById("part-logEnaf").textContent}\n`;
  csvContent += `Total;${document.getElementById("log-total").textContent};100 %\n\n`;

  // Section 2 : Surfaces
  csvContent += "RECAPITULATIF SURFACES (m²)\n";
  csvContent += "Type;Surface HAB;Surface ACT-EQP\n";
  csvContent += `Intensif;${document.getElementById("surf-intensif").textContent};${document.getElementById("surfACTEQPIntensif").textContent}\n`;
  csvContent += `ConsoEnaf;${document.getElementById("surf-enaf").textContent};${document.getElementById("surfACTEQEnaf").textContent}\n`;
  csvContent += `Total;${document.getElementById("surf-total").textContent};${document.getElementById("surfARCEQUTOTAL").textContent}\n\n`;

  // Section 3 : Type Intensif
  csvContent += "DETAIL TYPE INTENSIF\n";
  csvContent += "Type Intensif;Valeur\n";
  csvContent += `Division parcellaire;${document.getElementById("logDP").textContent}\n`;
  csvContent += `Dent creuse;${document.getElementById("logDC").textContent}\n`;
  csvContent += `Renouvellement urbain;${document.getElementById("logRU").textContent}\n\n`;

  // Section 4 : Indicateurs
  csvContent += "INDICATEURS LOGEMENTS\n";
  csvContent += "Indicateur;Valeur\n";
  csvContent += `ID1 (Q1);${document.getElementById("log-IC1").textContent}\n`;
  csvContent += `ID2 (Médiane);${document.getElementById("log-IC2").textContent}\n`;
  csvContent += `ID3 (Densité);${document.getElementById("log-IC3").textContent}\n`;

  // Création et déclenchement du téléchargement
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

// Écouteur sur le bouton d'export
document.getElementById("btn-export-csv").addEventListener("click", exporterTableauxCSV);