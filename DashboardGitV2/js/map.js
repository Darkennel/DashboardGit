// Initialisation de la carte centrée sur le SICOVAL (Labège / Lauragais)
const map = L.map('map').setView([43.515, 1.525], 5);

const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
});

const hot = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
});

const EsriImagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
});

osm.addTo(map);

const layerControl = L.control.layers(
  { 
    "OpenStreetMap": osm, 
    "OpenStreetMap HOT": hot, 
    "Esri World Imagery": EsriImagery 
  },
  {}
).addTo(map);

let coucheFondCommunes = null;

function ajouterFondCommunes() {
  if (typeof communesData === "undefined" || !communesData) return;

  coucheFondCommunes = L.geoJSON(communesData, {
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

  map.fitBounds(coucheFondCommunes.getBounds());
}

function gererZoomCommune(nomCommune) {
  if (!coucheFondCommunes) return;

  const communeNorm = normaliserTexte(nomCommune);
  let layerCible = null;

  // 1. Mise à jour visuelle du fond de carte des communes
  coucheFondCommunes.eachLayer(layer => {
    const nomFeature = layer.feature && layer.feature.properties ? normaliserTexte(layer.feature.properties.NOMCOM) : "";

    if (communeNorm && nomFeature === communeNorm) {
      layerCible = layer;
      // Contour orange de la commune sélectionnée
      layer.setStyle({
        color: "#d35400",
        weight: 3.5,
        fillColor: "#f39c12",
        fillOpacity: 0.1,
        dashArray: null
      });
    } else {
      // Style neutre des autres communes
      layer.setStyle({
        color: "#2c3e50",
        weight: 1.5,
        fillColor: "#ecf0f1",
        fillOpacity: 0.05,
        dashArray: "3, 3"
      });
    }
  });

  // 2. Repositionnement du zoom
  if (layerCible) {
    map.fitBounds(layerCible.getBounds(), { padding: [30, 30], maxZoom: 15 });
  } else {
    try {
      map.fitBounds(coucheFondCommunes.getBounds(), { padding: [10, 10] });
    } catch (e) {
      map.setView([43.515, 1.525], 11);
    }
  }

  // 3. Forcer la couche du thème actif à rester au tout premier plan
  if (activeGeoJsonLayer && typeof activeGeoJsonLayer.bringToFront === 'function') {
    activeGeoJsonLayer.bringToFront();
  }
}
// Lancer l'affichage du fond de carte au chargement
ajouterFondCommunes();

// ==========================================
// STYLES DES THÈMES (STUBS)
// ==========================================

function styleEnafActuel(feature) {

  return {};
}

function styleConsoEffective(feature) {
  return {};
}

function styleConstruEffectives(feature) {
  return {};
}

function styleConstruPlanifiees(feature) {
  return {};
}

function styleConsoPlanifiee(feature) {
  return {};
}

function stylePotentielDensif(feature) {
  return {};
}

// ==========================================
// UTILITAIRES DE POPUP ET ZOOM
// ==========================================

// Génération automatique du contenu de la popup lors du clic sur un polygone
function genererContenuPopup(properties) {
  if (!properties) return "<em>Aucune donnée disponible</em>";
  
  let html = "<div style='font-family: sans-serif; font-size: 13px;'>";
  html += "<strong style='color: #2b5c8f;'>Informations Foncieres</strong><br><hr style='margin:4px 0;'>";
  
  for (const [key, value] of Object.entries(properties)) {
    // Masquer les champs techniques internes
    if (["gid", "id", "fid", "geom"].includes(key.toLowerCase())) continue;
    if (value !== null && value !== undefined) {
      html += `<b>${key} :</b> ${value}<br>`;
    }
  }
  
  html += "</div>";
  return html;
}

// Recadrer la vue sur une commune sélectionnée
function gererZoomCommune(nomCommune) {
  if (!coucheFondCommunes) {
    console.warn("La couche de fond des communes n'est pas encore chargée.");
    return;
  }

  const communeNorm = normaliserTexte(nomCommune);
  let coucheCible = null;

  // 1. Mise à jour du style des communes
  coucheFondCommunes.eachLayer(layer => {
    const props = layer.feature ? layer.feature.properties : {};
    const nomFeature = normaliserTexte(props.NOMCOM || props.nom_com || props.Commune);

    if (communeNorm && nomFeature === communeNorm) {
      coucheCible = layer;
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

  // 2. Repositionnement
  if (coucheCible) {
    const bounds = coucheCible.getBounds();
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

  // 3. Maintenir le thème actif au-dessus du fond de carte
  if (typeof activeGeoJsonLayer !== 'undefined' && activeGeoJsonLayer && typeof activeGeoJsonLayer.bringToFront === 'function') {
    activeGeoJsonLayer.bringToFront();
  }
}