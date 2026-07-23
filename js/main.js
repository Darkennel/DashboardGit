// Affichage du nombre de communes
document.getElementById("communes-count").textContent = communesLayer.getLayers().length;

// Mise à jour du tableau d'indicateurs
function mettreAJourTableau(features, communeChoisie = "") {
  let logIntensif = 0, surfIntensif = 0;
  let logEnaf = 0, surfEnaf = 0;

  const communeNorm = normaliserTexte(communeChoisie);

  features.forEach(f => {
    const p = f.properties;
    const nbLog = Number(p.NBLogement) || 0;
    const surf = Number(p.Surface) || 0;
    const typeUrb = normaliserTexte(p.Urbanisati);

    if (typeUrb.includes("intensif")) {
      logIntensif += nbLog;
      surfIntensif += surf;
    } else if (typeUrb.includes("conso enaf") || typeUrb.includes("conso_enaf")) {
      logEnaf += nbLog;
      surfEnaf += surf;
    }
  });

  const stats = calculerStatistiquesSurfaces(features, communeNorm);
  const medianeShapeArea = calculerMedianeShapeAreaOpGroupee(features, communeNorm);

  document.getElementById("log-intensif").textContent = logIntensif.toLocaleString("fr-FR");
  document.getElementById("surf-intensif").textContent = Math.round(surfIntensif).toLocaleString("fr-FR");

  document.getElementById("log-IC1").textContent = Math.round(stats.q1).toLocaleString("fr-FR") + " m²";
  document.getElementById("log-IC2").textContent = Math.round(stats.mediane).toLocaleString("fr-FR") + " m²";
  document.getElementById("log-IC3").textContent = Math.round(medianeShapeArea).toLocaleString("fr-FR") + " m²";

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

// Écouteur sur le changement de commune
select.addEventListener("change", function () {
  const communeChoisie = this.value;
  const communeNorm = normaliserTexte(communeChoisie);

  communesLayer.eachLayer(layer => layer.setStyle(styleNormal));

  if (communeChoisie === "") {
    suiviLayer.clearLayers();
    suiviLayer.addData(suiviConstru.features);
    mettreAJourTableau(suiviConstru.features, "");
    map.fitBounds(communesLayer.getBounds());
    return;
  }

  const featuresFiltrees = suiviConstru.features.filter(feature =>
    normaliserTexte(feature.properties.Commune) === communeNorm
  );

  suiviLayer.clearLayers();
  suiviLayer.addData(featuresFiltrees);
  mettreAJourTableau(featuresFiltrees, communeChoisie);

  const commune = communes.find(c => normaliserTexte(c.nom) === communeNorm);
  if (commune) {
    commune.layer.setStyle(styleSelection);
    commune.layer.bringToFront();
    map.fitBounds(commune.layer.getBounds(), {
      padding: [0,0],
      maxZoom: 20
    });
  }
});

// Écouteur sur le sélecteur de style sur la carte
document.addEventListener("change", function (e) {
  if (e.target && e.target.id === "style-select") {
    const styleChoisi = e.target.value;

    if (styleChoisi === "destination") {
      // Appliquer le style Destination
      suiviLayer.setStyle(styleDestination);

      // Basculer la légende
      map.removeControl(legendTypologie);
      legendDestination.addTo(map);
    } else {
      // Appliquer le style Typologie
      suiviLayer.setStyle(styleProductionLgt);

      // Basculer la légende
      map.removeControl(legendDestination);
      legendTypologie.addTo(map);
    }
  }
});