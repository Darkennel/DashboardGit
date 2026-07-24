// Initialisation de la carte
const map = L.map('map');

const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
});

const hot = L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
});

osm.addTo(map);

L.control.layers(
  { "OpenStreetMap": osm, "OpenStreetMap HOT": hot },
  {}
).addTo(map);

// Styles
const styleNormal = {
  color: "#2b5c8f",
  weight: 2,
  fillColor: "#6baed6",
  fillOpacity: 0.35
};

const styleSelection = {
  color: "#c48a00",
  weight: 3,
  fillColor: "#ffe082",
  fillOpacity: 0.1
};

// Variable globale gardant en mémoire le style actif
let styleActif = "typologie";

// ==========================================
// 1. STYLE TYPOLOGIE (Style existant)
// ==========================================
function styleProductionLgt(feature) {
  const props = feature.properties || {};

  const etat = props.ETAT ? props.ETAT.toString().trim().toUpperCase() : "";
  if (etat !== "CONSTRUIT") {
    return { stroke: false, fill: false, fillOpacity: 0, opacity: 0 };
  }

  const type2 = props.Type2Urban ? props.Type2Urban.toString().trim().toUpperCase() : "";
  const dateLivrai = props.DateLivrai ? props.DateLivrai.toString().trim() : "";
  const urbanisation = normaliserTexte(props.Urbanisati);

  const couleurs = {
    DP_2009_2022: "#29b6f6",
    DP_2022_2025: "#1d22e5",
    DC_2009_2022: "#f48fb1",
    DC_2022_2025: "#a000b2",
    RU_2009_2022: "#ffeb3b",
    RU_2022_2025: "#f57c00",
    EXT_2009_2022: "#ff0000",
    EXT_2022_2025: "#800000"
  };

  let fillColor = "#95a5a6";

  if (urbanisation.includes("conso enaf") || urbanisation.includes("conso_enaf")) {
    fillColor = dateLivrai === "2009_2022" ? couleurs.EXT_2009_2022 : couleurs.EXT_2022_2025;
  } else if (urbanisation.includes("intensif")) {
    if (type2 === "DP") fillColor = dateLivrai === "2009_2022" ? couleurs.DP_2009_2022 : couleurs.DP_2022_2025;
    else if (type2 === "DC") fillColor = dateLivrai === "2009_2022" ? couleurs.DC_2009_2022 : couleurs.DC_2022_2025;
    else if (type2 === "RU") fillColor = dateLivrai === "2009_2022" ? couleurs.RU_2009_2022 : couleurs.RU_2022_2025;
  }

  return { color: "#ffffff", weight: 0.8, fillColor: fillColor, fillOpacity: 0.85 };
}

// Légende Typologie
const legendTypologie = L.control({ position: 'bottomright' });
legendTypologie.onAdd = function () {
  const div = L.DomUtil.create('div', 'info legend');
  div.style.cssText = 'background: white; padding: 10px; border-radius: 5px; box-shadow: 0 0 15px rgba(0,0,0,0.2); font-size: 12px; line-height: 18px; color: #333;';

  const categories = [
    { label: "<b>Division parcellaire</b>", items: [{ color: "#29b6f6", text: "2009–2022" }, { color: "#1d22e5", text: "2022–2025" }] },
    { label: "<b>Comblement de « dent creuse »</b>", items: [{ color: "#f48fb1", text: "2009–2022" }, { color: "#a000b2", text: "2022–2025" }] },
    { label: "<b>Renouvellement urbain</b>", items: [{ color: "#ffeb3b", text: "2009–2022" }, { color: "#f57c00", text: "2022–2025" }] },
    { label: "<b>Extension</b>", items: [{ color: "#ff0000", text: "2009–2022" }, { color: "#800000", text: "2022–2025" }] }
  ];

  let html = '<h4 style="margin:0 0 8px 0; font-size:13px; border-bottom: 1px solid #ccc; padding-bottom: 3px;">Typologie</h4>';
  categories.forEach(cat => {
    html += `<div style="margin-top: 5px;">${cat.label}</div>`;
    cat.items.forEach(item => {
      html += `<div style="display: flex; align-items: center; justify-content: space-between; margin-left: 8px; margin-top: 2px;">
        <span style="margin-right: 8px;">${item.text}</span>
        <i style="background: ${item.color}; width: 18px; height: 18px; display: inline-block; border-radius: 2px; border: 1px solid #fff;"></i>
      </div>`;
    });
  });

  div.innerHTML = html;
  return div;
};

// ==========================================
// 2. STYLE DESTINATION
// ==========================================
function styleDestination(feature) {
  const props = feature.properties || {};
  const dest = props.Destinatio ? props.Destinatio.toString().trim().toUpperCase() : "";

  let fillColor = "#95a5a6"; // Gris par défaut

  switch (dest) {
    case "ACT":
      fillColor = "#9b59b6"; // Violet pour Activités
      break;
    case "HAB":
      fillColor = "#2ecc71"; // Vert pour Habitat
      break;
    case "EQUIP":
      fillColor = "#3498db"; // Bleu pour Équipements
      break;
  }

  return {
    color: "#ffffff",
    weight: 0.8,
    fillColor: fillColor,
    fillOpacity: 0.85
  };
}

// Légende Destination
const legendDestination = L.control({ position: 'bottomright' });
legendDestination.onAdd = function () {
  const div = L.DomUtil.create('div', 'info legend');
  div.style.cssText = 'background: white; padding: 10px; border-radius: 5px; box-shadow: 0 0 15px rgba(0,0,0,0.2); font-size: 12px; line-height: 18px; color: #333;';

  const items = [
    { color: "#2ecc71", text: "Habitat (HAB)" },
    { color: "#9b59b6", text: "Activité (ACT)" },
    { color: "#3498db", text: "Équipement (EQUIP)" }
  ];

  let html = '<h4 style="margin:0 0 8px 0; font-size:13px; border-bottom: 1px solid #ccc; padding-bottom: 3px;">Destination</h4>';
  items.forEach(item => {
    html += `<div style="display: flex; align-items: center; justify-content: space-between; margin-top: 4px;">
      <span style="margin-right: 12px;">${item.text}</span>
      <i style="background: ${item.color}; width: 18px; height: 18px; display: inline-block; border-radius: 2px; border: 1px solid #fff;"></i>
    </div>`;
  });

  div.innerHTML = html;
  return div;
};

// ==========================================
// SÉLECTEUR DE STYLE INTÉGRÉ À LA CARTE
// ==========================================
const styleControl = L.control({ position: 'topright' });

styleControl.onAdd = function () {
  const div = L.DomUtil.create('div', 'leaflet-style-control');
  
  // Style du conteneur sur la carte
  div.style.cssText = `
    background: white;
    padding: 6px 10px;
    border-radius: 5px;
    box-shadow: 0 0 15px rgba(0,0,0,0.2);
    font-size: 13px;
    font-family: Arial, sans-serif;
  `;

  div.innerHTML = `
    <label for="style-select" style="font-weight: bold; margin-right: 6px;">Thème :</label>
    <select id="style-select" style="padding: 4px 8px; border-radius: 4px; border: 1px solid #ccc; font-size: 12px; cursor: pointer; outline: none;">
      <option value="typologie">Typologie / Période</option>
      <option value="destination">Destination (ACT, HAB, EQUIP)</option>
    </select>
  `;

  // Désactiver la propagation du clic/scroll vers la carte lors de l'interaction
  L.DomEvent.disableClickPropagation(div);
  L.DomEvent.disableScrollPropagation(div);

  return div;
};

// Ajout du sélecteur à la carte
styleControl.addTo(map);


// Remplace la création de suiviLayer à la fin de map.js par ceci :
const suiviLayer = L.geoJSON(suiviConstru, {
  style: styleProductionLgt
  // La gestion du click/popup sera faite dynamiquement dans main.js
}).addTo(map);

// Affichage de la légende par défaut
legendTypologie.addTo(map);

// Couches GeoJSON pour les communes
const communesLayer = L.geoJSON(communesData, { style: styleNormal }).addTo(map);

map.fitBounds(communesLayer.getBounds());

// //LEGENDE
// // Ajout de la légende sur la carte
// const legend = L.control({ position: 'bottomright' });

// legend.onAdd = function () {
//   const div = L.DomUtil.create('div', 'info legend');
  
//   // Style du conteneur de la légende
//   div.style.backgroundColor = 'white';
//   div.style.padding = '10px';
//   div.style.borderRadius = '5px';
//   div.style.boxShadow = '0 0 15px rgba(0,0,0,0.2)';
//   div.style.fontSize = '12px';
//   div.style.lineHeight = '18px';
//   div.style.color = '#333';

//   const categories = [
//     { label: "<b>Division parcellaire</b>", items: [
//       { color: "#29b6f6", text: "2009–2022" },
//       { color: "#1d22e5", text: "2022–2025" }
//     ]},
//     { label: "<b>Comblement de « dent creuse »</b>", items: [
//       { color: "#f48fb1", text: "2009–2022" },
//       { color: "#a000b2", text: "2022–2025" }
//     ]},
//     { label: "<b>Renouvellement urbain</b>", items: [
//       { color: "#ffeb3b", text: "2009–2022" },
//       { color: "#f57c00", text: "2022–2025" }
//     ]},
//     { label: "<b>Extension</b>", items: [
//       { color: "#ff0000", text: "2009–2022" },
//       { color: "#800000", text: "2022–2025" }
//     ]}
//   ];

//   let html = '<h4 style="margin:0 0 8px 0; font-size:13px; border-bottom: 1px solid #ccc; padding-bottom: 3px;">Typologie</h4>';

//   categories.forEach(cat => {
//     html += `<div style="margin-top: 5px;">${cat.label}</div>`;
//     cat.items.forEach(item => {
//       html += `
//         <div style="display: flex; align-items: center; justify-content: space-between; margin-left: 8px; margin-top: 2px;">
//           <span style="margin-right: 8px;">${item.text}</span>
//           <i style="background: ${item.color}; width: 18px; height: 18px; display: inline-block; border-radius: 2px; border: 1px solid #fff;"></i>
//         </div>`;
//     });
//   });

//   div.innerHTML = html;
//   return div;
// };

// legend.addTo(map);