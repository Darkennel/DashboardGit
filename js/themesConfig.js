const THEMES_CONFIG = {
  enaf_actuel: {
    label: "1. Surfaces ENAF et non-ENAF",
    url: "datageojson/Enaf2022.geojson",
    pdf:"Definition/SurfacesEnaf_NonEnaf.pdf",
    filters: { millesime: ["2022"] },
    style: (feature) => (typeof styleEnafActuel === 'function' ? styleEnafActuel(feature) : {}),
    popupContent: (p) => {
      const commune = p.Commune || p.__NOMCOM || 'N/C';
      const typeEsp = p.EspNAF22 || 'N/C';
      // La valeur est déjà en ha pour le thème 1
      const surface = p.Shape_Area !== undefined ? Number(p.Shape_Area).toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + ' ha' : 'N/C';
      return `
        <div style='font-family: sans-serif; font-size: 13px;'>
          <strong style='color: #2b5c8f;'>Surfaces ENAF et non-ENAF</strong><br><hr style='margin:4px 0;'>
          <b>Commune :</b> ${commune}<br>
          <b>Type d'espace :</b> ${typeEsp}<br>
          <b>Surface :</b> ${surface}
        </div>
      `;
    },
    updateTable: (data, commune) => {
      if (typeof mettreAJourTableauEnafActuel === 'function') {
        mettreAJourTableauEnafActuel(data, commune);
      }
    },
    legend: () => (typeof legendEnafActuel !== 'undefined' ? legendEnafActuel : null)
  },

  conso_effective: {
    label: "2. Consommation d'ENAF effective 2009-2022",
    url: "datageojson/ConsoEnaf0922vf.geojson",
    pdf:"Definition/ConsoEnafEffective.pdf",
    filters: {
      periode: ["09_22", "09_13", "13_16", "16_19", "19_22"]
    },
    style: (feature) => (typeof styleConsoEffective === 'function' ? styleConsoEffective(feature) : {}),
    popupContent: (p) => {
      const commune = p.Commune || p.lib_com || 'N/C';
      const fmt = (val) => val !== undefined && val !== null ? Number(val).toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + ' ha' : 'N/C';
      return `
        <div style='font-family: sans-serif; font-size: 13px;'>
          <strong style='color: #b82c30;'>Consommation d'ENAF Effective (Commune)</strong><br><hr style='margin:4px 0;'>
          <b>Commune :</b> ${commune}<br>
          <b>Conso 2009-2013 :</b> ${fmt(p.Conso0913)}<br>
          <b>Conso 2013-2016 :</b> ${fmt(p.Conso1316)}<br>
          <b>Conso 2016-2019 :</b> ${fmt(p.Conso1619)}<br>
          <b>Conso 2019-2022 :</b> ${fmt(p.Conso1922)}<br>
          <b>Conso Totale (2009-2022) :</b> ${fmt(p.Conso0922)}
        </div>
      `;
    },
    updateTable: (data, commune, periodeChoisie) => {
      if (typeof mettreAJourTableauConsoEffective === 'function') {
        mettreAJourTableauConsoEffective(data, commune, periodeChoisie);
      }
    },
    legend: () => (typeof legendConsoEffective !== 'undefined' ? legendConsoEffective : null)
  },

  constructions_effectives: {
    label: "3. Constructions effectives (Livrés)",
    url: "datageojson/Sicoval_SCEP_vf.geojson",
    pdf: "Definition/ConstructionsEffectives.pdf",
    filters: { 
      periode: ["2009_2022", "2022_2025", "2009_2025"],
      destination: ["TOUT", "LOGEMENTS", "ACTIVITES_EQUIPEMENTS"]
    },
    style: (feature) => (typeof styleConstruEffectives === 'function' ? styleConstruEffectives(feature) : {}),
    popupContent: (p) => genererPopupConstructionsCommunes(p),
    updateTable: (data, commune) => {
      if (typeof mettreAJourTableauConstruEffectives === 'function') {
        mettreAJourTableauConstruEffectives(data, commune);
      }
    },
    legend: () => (typeof legendConstruEffectives !== 'undefined' ? legendConstruEffectives : null)
  },

constructions_planifiees: {
  label: "4. Constructions planifiées",
  url: "datageojson/Sicoval_SCEP_vf.geojson",
  pdf :"Definition/ConstructionsPlanifiees.pdf",
  filters: { destination: ["TOUT", "LOGEMENTS", "ACTIVITES_EQUIPEMENTS"] },
  style: (feature) => (typeof styleConstruPlanifiees === 'function' ? styleConstruPlanifiees(feature) : {}),
  popupContent: (p) => genererPopupConstructionsCommunes(p),
  onEachFeature: (feature, layer) => (typeof onEachFeaturePlanifiees === 'function' ? onEachFeaturePlanifiees(feature, layer) : null),
  updateTable: (data, commune) => {
    if (typeof mettreAJourTableauConstruPlanifiees === 'function') {
      mettreAJourTableauConstruPlanifiees(data, commune);
    }
  },
  legend: () => (typeof legendConstruPlanifiees !== 'undefined' ? legendConstruPlanifiees : null)
},

  conso_planifiee: {
    label: "5. Consommation d'ENAF planifiée",
    url: "datageojson/ConsoPlanifieevf.geojson",
    pdf:"Definition/ConsoEnafPlanifiee.pdf",
    filters: { zone: ["TOUT", "U", "AU", "AU0"] },
    style: (feature) => (typeof styleConsoPlanifiee === 'function' ? styleConsoPlanifiee(feature) : {}),
    popupContent: (p) => {
      const commune = p.Commune || p.lib_com || 'N/C';
      const typeZone = p.typezone || p.typeZone || p.TYPEZONE || 'N/C';
      const formdomi = p.FORMDOMI || 'N/C';
      const destination = p.Destination || p.destination || 'N/C';
      const surf = p.Surf || p.SURF || p.Shape_area;
      const surfFormatted = surf !== undefined ? Number(surf).toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + ' ha' : 'N/C';

      return `
        <div style='font-family: sans-serif; font-size: 13px;'>
          <strong style='color: #2b5c8f;'>Consommation d'ENAF planifiée</strong><br><hr style='margin:4px 0;'>
          <b>Commune :</b> ${commune}<br>
          <b>Type de zone :</b> ${typeZone}<br>
          <b>Forme dominante :</b> ${formdomi}<br>
          <b>Destination :</b> ${destination}<br>
          <b>Surface :</b> ${surfFormatted}
        </div>
      `;
    },
    updateTable: (data, commune) => {
      if (typeof mettreAJourTableauConsoPlanifiee === 'function') {
        mettreAJourTableauConsoPlanifiee(data, commune);
      }
    },
    legend: () => (typeof legendConsoPlanifiee !== 'undefined' ? legendConsoPlanifiee : null)
  },

potentiel_densification: {
    label: "6. Potentiel de densification",
    url: "datageojson/PotentielDensifBrut.geojson",
    pdf: "Definition/PotentielDensif.pdf",
    filters: {},
    style: (feature) => (typeof stylePotentielDensif === 'function' ? stylePotentielDensif(feature) : {}),
    popupContent: (p) => {
    const commune = p.Commune || p.NOMCOM || p._NOMCOM || p.nom_com || 'N/C';
    const potentiel = p.potentiel || 'N/C';
    
    // Correction ici : 'surface' au lieu de Shape_Area
    const surf = p.surface !== undefined ? p.surface : (p.Shape_Area || p.SHAPE_AREA);
    
    // Si votre GeoJSON stocke la surface en m², on la convertit en hectares (/ 10000)
    // Si elle est déjà en hectares, supprimez la division par 10000.
    const surfFormatted = surf !== undefined ? (Number(surf) / 10000).toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + ' ha' : 'N/C';
    
    return `
      <div style='font-family: sans-serif; font-size: 13px;'>
        <strong style='color: #2b5c8f;'>Potentiel de densification</strong><br><hr style='margin:4px 0;'>
        <b>Commune :</b> ${commune}<br>
        <b>Potentiel :</b> ${potentiel}<br>
        <b>Surface :</b> ${surfFormatted}
      </div>
    `;
  },
    updateTable: (data, commune) => {
      if (typeof mettreAJourTableauPotentiel === 'function') {
        mettreAJourTableauPotentiel(data, commune);
      }
    },
    legend: () => (typeof legendPotentiel !== 'undefined' ? legendPotentiel : null)
  }
};