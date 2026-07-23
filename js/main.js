// Affichage du nombre de communes
document.getElementById("communes-count").textContent = communesLayer.getLayers().length;

function mettreAJourTableau(features, communeChoisie = "", periodeChoisie = "") {
  let logIntensif = 0, surfIntensif = 0;
  let logEnaf = 0, surfEnaf = 0;
  let surfACTEQPIntensif = 0, surfACTEQEnaf = 0;
  let surfACTEQPTotal = 0;

  const communeNorm = normaliserTexte(communeChoisie);

  features.forEach(f => {
    const p = f.properties;

    // Filtre par période
    if (periodeChoisie && p.DateLivrai !== periodeChoisie) {
      return; // Ignore cette entité si elle ne correspond pas à la période
    }

    const nbLog = Number(p.NBLogement) || 0;
    const surf = Number(p.Shape_Area) || 0;
    const typeUrb = normaliserTexte(p.Urbanisati);
    const destination = normaliserTexte(p.Destinatio);

    const isIntensif = typeUrb.includes("intensif");
    const isEnaf = typeUrb.includes("conso enaf") || typeUrb.includes("conso_enaf") || typeUrb.includes("consoenaf");

    const isHab = destination.includes("hab");
    const isACT = destination.includes("act");
    const isEQ = destination.includes("equip");
    const isActOrEq = isACT || isEQ;

    // 1. Logements HAB
    if (isIntensif && isHab) {
      logIntensif += nbLog;
      surfIntensif += surf;
    } else if (isEnaf && isHab) {
      logEnaf += nbLog;
      surfEnaf += surf;
    }

    // 2. Surfaces Activités et Équipements
    if (isIntensif && isActOrEq) {
      surfACTEQPIntensif += surf;
      surfACTEQPTotal += surf;
    } else if (isEnaf && isActOrEq) {
      surfACTEQEnaf += surf;
      surfACTEQPTotal += surf;

    }  
  });



  // Transmettre la période aux calculs des indicateurs IC
  const stats = calculerStatistiquesSurfaces(features, communeNorm, periodeChoisie);
  const medianeShapeArea = calculerMedianeShapeAreaOpGroupee(features, communeNorm, periodeChoisie);

  // Injections DOM
  document.getElementById("log-intensif").textContent = logIntensif.toLocaleString("fr-FR");
  document.getElementById("surf-intensif").textContent = Math.round(surfIntensif).toLocaleString("fr-FR");

  document.getElementById("surfACTEQPIntensif").textContent =Math.round(surfACTEQPIntensif).toLocaleString("fr-FR");
  document.getElementById("surfACTEQEnaf").textContent = Math.round(surfACTEQEnaf).toLocaleString("fr-FR");
  document.getElementById("surfARCEQUTOTAL").textContent = Math.round(surfACTEQPTotal).toLocaleString("fr-FR");

  document.getElementById("log-IC1").textContent = `${Math.round(stats.q1).toLocaleString("fr-FR")} m²`;
  document.getElementById("log-IC2").textContent = `${Math.round(stats.mediane).toLocaleString("fr-FR")} m²`;
  document.getElementById("log-IC3").textContent = `${Math.round(medianeShapeArea).toLocaleString("fr-FR")} m²`;

  document.getElementById("log-enaf").textContent = logEnaf.toLocaleString("fr-FR");
  document.getElementById("surf-enaf").textContent = Math.round(surfEnaf).toLocaleString("fr-FR");

  document.getElementById("log-total").textContent = (logIntensif + logEnaf).toLocaleString("fr-FR");
  document.getElementById("surf-total").textContent = Math.round(surfIntensif + surfEnaf).toLocaleString("fr-FR");
}
// Initialisation globale
mettreAJourTableau(suiviConstru.features, "");

// Alimentation de la liste déroulante
const select = document.getElementById("commune-select");
const communes = [];

communesLayer.eachLayer(layer => {
  communes.push({
    nom: layer.feature.properties.NOMCOM,
    layer: layer
  });
});

communes.sort((a, b) => a.nom.localeCompare(b.nom));
communes.forEach(c => {
  const option = document.createElement("option");
  option.value = c.nom;
  option.textContent = c.nom;
  select.appendChild(option);
});
const selectCommune = document.getElementById("commune-select");
const selectPeriode = document.getElementById("periode-select");

// Fonction déclenchée à chaque changement de commune OU de période
function appliquerFiltres() {
  const communeChoisie = selectCommune.value;
  const periodeChoisie = selectPeriode.value;
  const communeNorm = normaliserTexte(communeChoisie);

  // 1. Filtrer les entités spatiales pour la carte
  const featuresFiltrees = suiviConstru.features.filter(feature => {
    const p = feature.properties;
    const matchCommune = !communeChoisie || normaliserTexte(p.Commune) === communeNorm;
    const matchPeriode = !periodeChoisie || p.DateLivrai === periodeChoisie;
    
    return matchCommune && matchPeriode;
  });

  // 2. Mettre à jour la couche sur la carte Leaflet
  suiviLayer.clearLayers();
  suiviLayer.addData(featuresFiltrees);

  // 3. Recalculer ET afficher le tableau + les indicateurs IC1, IC2, IC3
  // On passe la liste filtrée à mettreAJourTableau
  mettreAJourTableau(featuresFiltrees, communeChoisie, periodeChoisie);

  // 4. Gestion du zoom et surbrillance de la commune
  communesLayer.eachLayer(layer => layer.setStyle(styleNormal));

  if (communeChoisie !== "") {
    const communeObj = communes.find(c => normaliserTexte(c.nom) === communeNorm);
    if (communeObj) {
      communeObj.layer.setStyle(styleSelection);
      communeObj.layer.bringToFront();
      map.fitBounds(communeObj.layer.getBounds(), { padding: [20, 20], maxZoom: 18 });
    }
  } else {
    map.fitBounds(communesLayer.getBounds());
  }
}

// Écoute des deux sélecteurs
selectCommune.addEventListener("change", appliquerFiltres);
selectPeriode.addEventListener("change", appliquerFiltres);

// Appel initial au chargement de la page
appliquerFiltres();

// Variable globale pour retenir le style en cours
let styleActuel = styleDestination; 

document.addEventListener("change", function (e) {
  if (e.target && e.target.id === "style-select") {
    const styleChoisi = e.target.value;

    if (styleChoisi === "destination") {
      styleActuel = styleDestination;
      
      // Mise à jour de la légende
      if (map.hasLayer(legendTypologie)) map.removeControl(legendTypologie);
      legendDestination.addTo(map);
    } else {
      styleActuel = styleProductionLgt;
      
      // Mise à jour de la légende
      if (map.hasLayer(legendDestination)) map.removeControl(legendDestination);
      legendTypologie.addTo(map);
    }

    // Applique le nouveau style à toutes les entités affichées
    suiviLayer.setStyle(styleActuel);
  }
});
const btnReset = document.getElementById("btn-reset");

btnReset.addEventListener("click", function() {
  // Remet les sélecteurs à leur option par défaut (valeur vide "")
  selectCommune.value = "";
  selectPeriode.value = "";

  // Relance le filtrage global pour tout remettre à jour (carte + tableaux)
  appliquerFiltres();
});