// Initialisation de la carte centrée sur le SICOVAL
const map = L.map('map',{
  preferCanvas: false,
}).setView([43.515, 1.525], 11);

const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
});

const hot = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
});

const EsriImagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  attribution: 'Tiles &copy; Esri'
});

osm.addTo(map);

L.control.layers(
  { 
    "OpenStreetMap": osm, 
    "OpenStreetMap HOT": hot, 
    "Esri World Imagery": EsriImagery 
  },
  {}
).addTo(map);

let communesData = null;
let coucheFondCommunes = null;

async function ajouterFondCommunes() {
  // Attente du chargement effectif des données
  communesData = await chargerDonneesGeoJSON('datageojson/CommunesSico.geojson');

  console.log("ajouterFondCommunes - communesData:", communesData);

  if (!communesData || !communesData.features) return;

  if (!map.getPane('paneCommunes')) {
    map.createPane('paneCommunes');
    map.getPane('paneCommunes').style.zIndex = 350;
  }

  coucheFondCommunes = L.geoJSON(communesData, {
    pane: 'paneCommunes',
    style: {
      color: "#2c3e50",
      weight: 1.5,
      fillColor: "#ecf0f1",
      fillOpacity: 0.1,
      dashArray: "3, 3"
    },
    onEachFeature: (feature, layer) => {
      if (feature.properties && feature.properties.NOMCOM) {
        layer.bindTooltip(feature.properties.NOMCOM, { sticky: true });
      }
    }
  }).addTo(map);

  try {
    map.fitBounds(coucheFondCommunes.getBounds());
  } catch(e) {}
}

// Appeler la fonction d'initialisation
ajouterFondCommunes();

function gererZoomCommune(nomCommune) {
  if (!coucheFondCommunes) {
    console.warn("coucheFondCommunes n'est pas encore prête.");
    return;
  }

  const communeNorm = normaliserTexte(nomCommune);
  let layerCible = null;

  coucheFondCommunes.eachLayer(layer => {
    const props = layer.feature ? layer.feature.properties : {};
    const nomFeature = normaliserTexte(props.NOMCOM || props.nom_com || props.Commune);

    if (communeNorm && nomFeature === communeNorm) {
      layerCible = layer;
      layer.setStyle({
        color: "#d35400",
        weight: 3.5,
        fillColor: "#f39c12",
        fillOpacity: 0.15,
        dashArray: null
      });
    } else {
      layer.setStyle({
        color: "#2c3e50",
        weight: 1.5,
        fillColor: "#ecf0f1",
        fillOpacity: 0.05,
        dashArray: "3, 3"
      });
    }
  });

  if (layerCible) {
    const bounds = layerCible.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 });
    }
  } else {
    try {
      const boundsGlobale = coucheFondCommunes.getBounds();
      if (boundsGlobale.isValid()) {
        map.fitBounds(boundsGlobale, { padding: [10, 10] });
      }
    } catch (e) {
      map.setView([43.515, 1.525], 11);
    }
  }
}

// Charger le fond de carte
ajouterFondCommunes();

// ==========================================
// STYLES ET LÉGENDES DES THÈMES
// ==========================================

function styleEnafActuel(feature) {
  const p = feature.properties || {};
  const valeur = p.EspNAF22 ? p.EspNAF22.toString().trim() : "";

  let fillColor = "#88c437"; // Vert ENAF

  if (valeur === "NonNaf") {
    fillColor = "#eb2026"; // Rouge NonNaf
  }

  return {
    fillColor: fillColor,
    weight: 0.8,
    opacity: 0.9,
    color: "#ffffff",
    fillOpacity: 0.85
  };
}

function styleConsoEffective(feature) {
  return {
    fillColor: "#eb2026",
    weight: 1,
    opacity: 0.9,
    color: "#7a1c1f",
    fillOpacity: 0.8
  };
}

function styleConstruEffectives(feature) {
  const p = feature.properties || {};
  const typeNorm = normaliserTexte(p.Type2Urban);
  const dateNorm = p.DateLivrai ? p.DateLivrai.toString().trim().replace('-', '_') : "";
  const isconstruit = p.ETAT ? p.ETAT.toString().trim().toUpperCase() === "CONSTRUIT" : false;

  if (!isconstruit) {
    return {
      stroke: false,
      fill: false,
      opacity: 0,
      fillOpacity: 0
    };
  }

  let fillColor = "#95a5a6";
  if (typeNorm === 'dp' || typeNorm === 'dc') {
    if (dateNorm === '2009_2022') fillColor = "#4ea3dd";
    else if (dateNorm === '2022_2025') fillColor = "#2f55a4";
    else fillColor = "#3498db";
  } else if (typeNorm === 'ru') {
    if (dateNorm === '2009_2022') fillColor = "#f1c40f";
    else if (dateNorm === '2022_2025') fillColor = "#f39c12";
    else fillColor = "#e67e22";
  } else if (typeNorm === 'ext' || typeNorm === 'extension') {
    if (dateNorm === '2009_2022') fillColor = "#e74c3c";
    else if (dateNorm === '2022_2025') fillColor = "#7b1113";
    else fillColor = "#c0392b";
  }

  return {
    fillColor: fillColor,
    weight: 1,
    opacity: 0.8,
    color: "#2c3e50",
    fillOpacity: 0.85
  };
}
  

function styleConstruPlanifiees(feature) {
  const p = feature.properties || {};
  const etat = p.ETAT ? p.ETAT.toString().trim().toUpperCase() : "";

  // Exclusion des entités déjà construites
  if (etat === "CONSTRUIT") {
    return { opacity: 0, fillOpacity: 0, weight: 0 };
  }

  // Styles spécifiques pour Révision PLU et Emplacement Réservé (Contours / Hachures)
  if (etat === "REV_PLU") {
    return {
      fillColor: "transparent",
      weight: 2,
      color: "#000000",
      dashArray: "4, 4",
      fillOpacity: 0
    };
  }

  if (etat === "ER") {
    return {
      fillColor: "transparent",
      weight: 2,
      color: "#000000",
      dashArray: "2, 4",
      fillOpacity: 0
    };
  }

  // Attribution des couleurs exactes selon la valeur
  let fillColor = "#95a5a6";

  switch (etat) {
    case "PC":
      fillColor = "#dce135"; // Vert/Jaune PC
      break;
    case "U_OAP":
    case "U_RIEN":
    case "U_AU_OAP":
      fillColor = "#fca038"; // Orange U
      break;
    case "AU_OAP":
    case "AU_RIEN":
      fillColor = "#f14125"; // Rouge/Orange AU
      break;
    case "AU0_OAP":
    case "AU0_RIEN":
      fillColor = "#61413a"; // Marron AU0
      break;
  }

  return {
    fillColor: fillColor,
    weight: 1,
    opacity: 0.9,
    color: "#ffffff",
    fillOpacity: 0.85
  };
}


function styleConsoPlanifiee(feature) {
  const p = feature.properties || {};
  const zone = (p.typezone || p.typeZone || p.TYPEZONE || "").toString().trim().toUpperCase();

  let fillColor = "#cccccc"; // Gris par défaut si non trouvé
  if (zone === "U") {
    fillColor = "#f14125"; // Rouge
  } else if (zone === "AU" || zone === "1AU") {
    fillColor = "#eb8f2d"; // Orange
  } else if (zone === "AU0" || zone === "2AU") {
    fillColor = "#dce135"; // Jaune
  }

  return {
    fillColor: fillColor,
    weight: 1,
    opacity: 1,
    color: 'white',
    dashArray: '3',
    fillOpacity: 0.7
  };
}

function stylePotentielDensif(feature) {
  const p = feature.properties || {};
  const potentiel = (p.potentiel || "").toString().trim().toUpperCase();
  let fillColor = "#cccccc"; // Gris par défaut si non trouvé

  if (potentiel === "PDD") {
    fillColor = "#dfe447";
  } else if (potentiel === "P0D") {
    fillColor = "#d94d2e";
  }

  return {
    fillColor: fillColor,
    weight: 1,
    opacity: 1,
    color: 'white',
    dashArray: '3',
    fillOpacity: 0.7
  };
}

// LÉGENDES
const legendConstruEffectives = L.control({ position: 'bottomright' });
legendConstruEffectives.onAdd = function () {
  const div = L.DomUtil.create('div', 'info legend');
  div.style.backgroundColor = 'white';
  div.style.padding = '10px';
  div.style.borderRadius = '5px';
  div.style.boxShadow = '0 0 15px rgba(0,0,0,0.2)';
  div.style.fontSize = '12px';
  div.style.lineHeight = '18px';
  div.innerHTML = `
    <strong style="display:block; margin-bottom:5px; color:#2c3e50;">Densification (DC, DP, RU)</strong>
    <b>Division parcellaire / Dent creuse (DC / DP)</b><br>
    <i style="background:#4ea3dd; width:14px; height:14px; display:inline-block; margin-right:5px; vertical-align:middle;"></i> 2009–2022<br>
    <i style="background:#2f55a4; width:14px; height:14px; display:inline-block; margin-right:5px; vertical-align:middle;"></i> 2022–2025<br>
    
    <b style="margin-top:4px; display:block;">Renouvellement urbain (RU)</b>
    <i style="background:#f1c40f; width:14px; height:14px; display:inline-block; margin-right:5px; vertical-align:middle;"></i> 2009–2022<br>
    <i style="background:#f39c12; width:14px; height:14px; display:inline-block; margin-right:5px; vertical-align:middle;"></i> 2022–2025<br>

    <hr style="margin: 8px 0; border: none; border-top: 3px solid #ddd;">
    
    <strong style="display:block; margin-bottom:5px; color:#2c3e50;">Extension</strong>
    <i style="background:#e74c3c; width:14px; height:14px; display:inline-block; margin-right:5px; vertical-align:middle;"></i> 2009–2022<br>
    <i style="background:#7b1113; width:14px; height:14px; display:inline-block; margin-right:5px; vertical-align:middle;"></i> 2022–2025<br>
  `;
  return div;
};

const legendConsoEffective = L.control({ position: 'bottomright' });
legendConsoEffective.onAdd = function () {
  const div = L.DomUtil.create('div', 'info legend');
  div.style.backgroundColor = 'white';
  div.style.padding = '8px 12px';
  div.style.borderRadius = '5px';
  div.style.boxShadow = '0 0 15px rgba(0,0,0,0.2)';
  div.style.fontSize = '12px';
  div.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="background: #b82c30; width: 16px; height: 16px; border-radius: 3px; display: inline-block;"></span>
      <strong style="color: #2c3e50;">ENAF consommé</strong>
    </div>
  `;
  return div;
};

const legendEnafActuel = L.control({ position: 'bottomright' });
legendEnafActuel.onAdd = function () {
  const div = L.DomUtil.create('div', 'info legend');
  div.style.backgroundColor = 'white';
  div.style.padding = '10px 14px';
  div.style.borderRadius = '5px';
  div.style.boxShadow = '0 0 15px rgba(0,0,0,0.2)';
  div.style.fontSize = '12px';
  div.innerHTML = `
    <strong style="display:block; margin-bottom:8px; color:#2c3e50;">Typologie des espaces</strong>
    <div style="display: flex; align-items: center; margin-bottom: 5px;">
      <span style="background:#88c437; width:16px; height:16px; border-radius:3px; display:inline-block; margin-right:8px;"></span>
      <span>ENAF</span>
    </div>
    <div style="display: flex; align-items: center;">
      <span style="background:#e84a27; width:16px; height:16px; border-radius:3px; display:inline-block; margin-right:8px;"></span>
      <span>non-ENAF</span>
    </div>
  `;
  return div;
};

const legendConstruPlanifiees = L.control({ position: 'bottomright' });
legendConstruPlanifiees.onAdd = function () {
  const div = L.DomUtil.create('div', 'info legend');
  div.style.backgroundColor = 'white';
  div.style.padding = '10px 14px';
  div.style.borderRadius = '5px';
  div.style.boxShadow = '0 0 15px rgba(0,0,0,0.2)';
  div.style.fontSize = '12px';
  div.style.lineHeight = '20px';
  div.innerHTML = `
    <strong style="display:block; margin-bottom:8px; color:#2c3e50;">Logements autorisés et projetés</strong>
    <div style="display:flex; align-items:center; margin-bottom:3px;">
      <span style="background:#dce135; width:16px; height:16px; border-radius:2px; display:inline-block; margin-right:8px; border:1px solid #fff;"></span>
      <span>PC accordés</span>
    </div>
    <div style="display:flex; align-items:center; margin-bottom:3px;">
      <span style="background:#fca038; width:16px; height:16px; border-radius:2px; display:inline-block; margin-right:8px; border:1px solid #fff;"></span>
      <span>U</span>
    </div>
    <div style="display:flex; align-items:center; margin-bottom:3px;">
      <span style="background:#f14125; width:16px; height:16px; border-radius:2px; display:inline-block; margin-right:8px; border:1px solid #fff;"></span>
      <span>AU</span>
    </div>
    <div style="display:flex; align-items:center; margin-bottom:3px;">
      <span style="background:#61413a; width:16px; height:16px; border-radius:2px; display:inline-block; margin-right:8px; border:1px solid #fff;"></span>
      <span>AU0</span>
    </div>
    <div style="display:flex; align-items:center; margin-bottom:3px;">
      <span style="background:repeating-linear-gradient(45deg, #000, #000 2px, #fff 2px, #fff 6px); width:16px; height:16px; border-radius:2px; display:inline-block; margin-right:8px; border:1px solid #000;"></span>
      <span>Révision en cours</span>
    </div>
    <div style="display:flex; align-items:center;">
      <span style="background:repeating-linear-gradient(45deg, #000, #000 2px, #fff 2px, #fff 4px), repeating-linear-gradient(-45deg, #000, #000 2px, #fff 2px, #fff 4px); width:16px; height:16px; border-radius:2px; display:inline-block; margin-right:8px; border:1px solid #000;"></span>
      <span>Emplacement réservé</span>
    </div>
  `;
  return div;
};

const legendConsoPlanifiee = L.control({ position: 'bottomright' });
legendConsoPlanifiee.onAdd = function () {
  const div = L.DomUtil.create('div', 'info legend');
  div.style.backgroundColor = 'white';
  div.style.padding = '10px 14px';
  div.style.borderRadius = '5px';
  div.style.boxShadow = '0 0 15px rgba(0,0,0,0.2)';
  div.style.fontSize = '12px';
  div.style.lineHeight = '20px';
  div.innerHTML = `
    <strong style="display:block; margin-bottom:8px; color:#2c3e50;">Consommation d'ENAF planifiée</strong>
    <div style="display:flex; align-items:center; margin-bottom:4px;">
      <span style="background:#f14125; width:16px; height:16px; border-radius:3px; display:inline-block; margin-right:8px;"></span>
      <span>ENAF en zone U</span>
    </div>
    <div style="display:flex; align-items:center; margin-bottom:4px;">
      <span style="background:#eb8f2d; width:16px; height:16px; border-radius:3px; display:inline-block; margin-right:8px;"></span>
      <span>ENAF en zone AU ouverte</span>
    </div>
    <div style="display:flex; align-items:center;">
      <span style="background:#dce135; width:16px; height:16px; border-radius:3px; display:inline-block; margin-right:8px;"></span>
      <span>ENAF en zone AU fermée</span>
    </div>
  `;
  return div;
};

const legendPotentiel = L.control({ position: 'bottomright' });
legendPotentiel.onAdd = function () {
  const div = L.DomUtil.create('div', 'info legend');
  div.style.backgroundColor = 'white';
  div.style.padding = '10px 14px';
  div.style.borderRadius = '5px';
  div.style.boxShadow = '0 0 15px rgba(0,0,0,0.2)';
  div.style.fontSize = '12px';
  div.style.lineHeight = '20px';
  div.innerHTML = `
    <strong style="display:block; margin-bottom:8px; color:#2c3e50;">Potentiel de densification</strong>
    <div style="display:flex; align-items:center; margin-bottom:4px;">
      <span style="background:#dfe447; width:16px; height:16px; border-radius:3px; display:inline-block; margin-right:8px;"></span>
      <span>PDD (Potentiel diffus)</span>
    </div>
    <div style="display:flex; align-items:center;">
      <span style="background:#d94d2e; width:16px; height:16px; border-radius:3px; display:inline-block; margin-right:8px;"></span>
      <span>P0D (Autre / Sans potentiel)</span>
    </div>
  `;
  return div;
};

function genererPopupConstructionsCommunes(p) {
  if (!p) return "<em>Aucune donnée disponible</em>";
  
  let html = "<div style='font-family: sans-serif; font-size: 13px;'>";
  html += "<strong style='color: #2b5c8f;'>Informations Opération</strong><br><hr style='margin:4px 0;'>";

  const commune = p.Commune || p.NOMCOM || p.nom_com || 'N/C';
  html += `<b>Commune :</b> ${commune}<br>`;

  if (p.ETAT) html += `<b>ETAT :</b> ${p.ETAT}<br>`;
  if (p.DateLivrai) html += `<b>Date de livraison :</b> ${p.DateLivrai}<br>`;
  if (p.Destinatio) html += `<b>Destination :</b> ${p.Destinatio}<br>`;
  if (p.Type2Urban) html += `<b>Type 2 Urban :</b> ${p.Type2Urban}<br>`;
  if (p.Urbanisati || p.Urbanisation) html += `<b>Urbanisation :</b> ${p.Urbanisati || p.Urbanisation}<br>`;
  if (p.NBLogement !== undefined) html += `<b>Nombre de logements :</b> ${p.NBLogement}<br>`;

  // Types de logements affichés uniquement si >= 1
  const typesLogements = [
    { key: 'NBT1', label: 'T1' },
    { key: 'NBT2', label: 'T2' },
    { key: 'NBT3', label: 'T3' },
    { key: 'NBT4', label: 'T4+' },
    { key: 'LgtEtudian', label: 'Logements étudiants' },
    { key: 'LgtSociaux', label: 'Logements sociaux' },
    { key: 'LgtSeniors', label: 'Logements séniors' },
    { key: 'LgtAccesAb', label: 'Logements accès abordable' },
    { key: 'LgtPrives', label: 'Logements privés' },
    { key: 'Collectifs', label: 'Collectifs' },
    { key: 'Individuel', label: 'Individuel' },
    { key: 'GrpHabitat', label: 'Groupement d\'habitat' },
    { key: 'lots', label: 'Lots' }
  ];

  typesLogements.forEach(item => {
    const val = Number(p[item.key]) || 0;
    if (val >= 1) {
      html += `<b>${item.label} :</b> ${val}<br>`;
    }
  });

  if (p.Shape_Area || p.SHAPE_AREA) {
    const surfHa = (Number(p.Shape_Area || p.SHAPE_AREA) / 10000).toLocaleString('fr-FR', { maximumFractionDigits: 2 });
    html += `<b>Surface :</b> ${surfHa} ha<br>`;
  }

  html += "</div>";
  return html;
}

// ==========================================
// EXPORTER LA CARTE EN IMAGE
// ==========================================
function exporterCarteSVG() {
  const paneDonnees = map.getPane('paneDonneesActives')?.querySelector('svg');
  const paneCommunes = map.getPane('paneCommunes')?.querySelector('svg');
  const legendElement = document.querySelector('.info.legend');

  if (!paneDonnees && !paneCommunes) {
    alert("Aucune couche vectorielle n'a été trouvée sur la carte.");
    return;
  }

  // 1. Récupération de la commune sélectionnée et calcul de sa BBox (Bounding Box)
  const communeNorm = normaliserTexte(document.getElementById("commune-select")?.value);
  let targetBounds = null;

  if (communeNorm && coucheFondCommunes) {
    coucheFondCommunes.eachLayer(layer => {
      const props = layer.feature ? layer.feature.properties : {};
      const nomFeature = normaliserTexte(props.NOMCOM || props.nom_com || props.Commune);
      if (nomFeature === communeNorm) {
        targetBounds = layer.getBounds(); // BBox exacte de la commune choisie
      }
    });
  }
  
  // Si aucune commune ou si non trouvée, prend la BBox globale du territoire SICOVAL
  if (!targetBounds && coucheFondCommunes) {
    targetBounds = coucheFondCommunes.getBounds();
  }

  // 2. Fonction de génération du fichier SVG
  const genererSVG = () => {
    const width = map.getSize().x;
    const height = map.getSize().y;

    const svgExport = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svgExport.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svgExport.setAttribute("width", width);
    svgExport.setAttribute("height", height);
    svgExport.setAttribute("viewBox", `0 0 ${width} ${height}`);

    // Fond blanc
    const rectFond = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rectFond.setAttribute("width", "100%");
    rectFond.setAttribute("height", "100%");
    rectFond.setAttribute("fill", "#ffffff");
    svgExport.appendChild(rectFond);

    // Injection des chemins vectoriels
    const injecterCoucheSvg = (svgSource) => {
      if (!svgSource) return;
      const pathsOrigine = svgSource.querySelectorAll('path');
      pathsOrigine.forEach(path => {
        const pathClone = path.cloneNode(true);
        const computedStyle = window.getComputedStyle(path);

        pathClone.style.fill = computedStyle.fill;
        pathClone.style.fillOpacity = computedStyle.fillOpacity;
        pathClone.style.stroke = computedStyle.stroke;
        pathClone.style.strokeWidth = computedStyle.strokeWidth;
        pathClone.style.strokeOpacity = computedStyle.strokeOpacity;
        pathClone.style.strokeDasharray = computedStyle.strokeDasharray;

        svgExport.appendChild(pathClone);
      });
    };

    const svgDonneesFraiches = map.getPane('paneDonneesActives')?.querySelector('svg');
    const svgCommunesFraiches = map.getPane('paneCommunes')?.querySelector('svg');

    injecterCoucheSvg(svgCommunesFraiches);
    injecterCoucheSvg(svgDonneesFraiches);

    // Intégration de la légende
    if (legendElement) {
      const legendWidth = legendElement.offsetWidth || 240;
      const legendHeight = legendElement.offsetHeight || 160;
      const margin = 20;

      const foreignObject = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
      foreignObject.setAttribute("x", width - legendWidth - margin);
      foreignObject.setAttribute("y", height - legendHeight - margin);
      foreignObject.setAttribute("width", legendWidth);
      foreignObject.setAttribute("height", legendHeight);

      const legendClone = legendElement.cloneNode(true);
      legendClone.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
      legendClone.style.margin = "0";
      legendClone.style.backgroundColor = "#ffffff";
      legendClone.style.boxSizing = "border-box";

      foreignObject.appendChild(legendClone);
      svgExport.appendChild(foreignObject);
    }

    // Téléchargement
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgExport);
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const themeSelect = document.getElementById("theme-select")?.value || "carte";
    const communeSelect = document.getElementById("commune-select")?.value || "SICOVAL";

    const link = document.createElement("a");
    link.href = url;
    link.download = `carte_vectorielle_${themeSelect}_${communeSelect}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 3. Recadrage strict sur l'étendue (BBox) de la commune avant la génération
  if (targetBounds && targetBounds.isValid()) {
    map.fitBounds(targetBounds, {
      padding: [20, 20], // Marge régulière autour de la BBox de la commune
      animate: false
    });

    map.once('moveend', () => {
      setTimeout(genererSVG, 50);
    });

    setTimeout(genererSVG, 150);
  } else {
    genererSVG();
  }
}
// ==========================================
// EXPORTER LA CARTE EN PNG (Correction définitive html2canvas)
// ==========================================
function exporterCartePNG() {
  const mapContainer = document.getElementById("map");

  if (!mapContainer) {
    alert("Conteneur de carte introuvable.");
    return;
  }

  const selectCommune = document.getElementById("commune-select");
  const nomCommuneSelectionnee = selectCommune ? selectCommune.value : "";
  const communeNorm = normaliserTexte(nomCommuneSelectionnee);

  let targetBounds = null;

  if (communeNorm && coucheFondCommunes) {
    coucheFondCommunes.eachLayer(layer => {
      const props = layer.feature ? layer.feature.properties : {};
      const nomFeature = normaliserTexte(props.NOMCOM || props.nom_com || props.Commune || props.name);
      
      if (nomFeature === communeNorm) {
        if (typeof layer.getBounds === "function") {
          targetBounds = layer.getBounds();
        }
      }
    });
  }

  const lancerCapture = () => {
    map.invalidateSize(true);

    setTimeout(() => {
      // Utilisation de html2canvas avec la fonction onclone pour corriger le rendu des calques Leaflet
      html2canvas(mapContainer, {
        useCORS: true,
        allowTaint: true,
        logging: false,
        scale: window.devicePixelRatio > 1 ? window.devicePixelRatio : 1, // Conserve une bonne netteté
        onclone: (clonedDoc) => {
          // Dans le document cloné par html2canvas, on s'assure que les panes Leaflet n'ont pas de décalage parasite
          const clonedMap = clonedDoc.getElementById("map");
          if (clonedMap) {
            // Force l'affichage global du conteneur de carte sans transformation globale bloquante
            clonedMap.style.transform = "none";
          }
        }
      }).then(canvas => {
        const imageURL = canvas.toDataURL("image/png");

        const themeSelect = document.getElementById("theme-select")?.value || "carte";
        const nomFichierCommune = nomCommuneSelectionnee ? nomCommuneSelectionnee.replace(/[^a-zA-Z0-9]/g, "_") : "SICOVAL";

        const link = document.createElement("a");
        link.href = imageURL;
        link.download = `carte_${themeSelect}_${nomFichierCommune}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }).catch(err => {
        console.error("Erreur lors de l'export PNG avec html2canvas :", err);
        alert("Une erreur est survenue lors de la génération de l'image PNG.");
      });
    }, 400);
  };

  if (targetBounds && targetBounds.isValid()) {
    map.invalidateSize(true);

    // Centrage propre sur la commune
    map.fitBounds(targetBounds, {
      padding: [40, 40],
      animate: false
    });

    map.once('moveend', () => {
      lancerCapture();
    });
  } else {
    lancerCapture();
  }
}