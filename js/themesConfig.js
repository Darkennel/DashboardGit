const THEMES_CONFIG = {
  enaf_actuel: {
    label: "1. Surfaces ENAF et non-ENAF",
    url: "datageojson/Enaf2022.geojson",
    pdf:"Definition/SurfacesEnaf_NonEnaf.pdf",
    filters: { millesime: ["2022"] },
    style: (feature) => (typeof styleEnafActuel === 'function' ? styleEnafActuel(feature) : {}),
    // Ne pas exécuter la fonction ici, la placer dans un callback :
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
    updateTable: (data, commune) => {
      if (typeof mettreAJourTableauConsoPlanifiee === 'function') {
        mettreAJourTableauConsoPlanifiee(data, commune);
      }
    },
    legend: () => (typeof legendConsoPlanifiee !== 'undefined' ? legendConsoPlanifiee : null)
  },

  potentiel_densification: {
    label: "6. Potentiel de densification",
    pdf:"Definition/PotentielDensif.pdf",
    source: () => (typeof PotentielDensifData !== 'undefined' ? PotentielDensifData : null),
    filters: {},
    style: (feature) => (typeof stylePotentielDensif === 'function' ? stylePotentielDensif(feature) : {}),
    updateTable: (data, commune) => {
      if (typeof mettreAJourTableauPotentiel === 'function') {
        mettreAJourTableauPotentiel(data, commune);
      }
    },
    legend: () => (typeof legendPotentiel !== 'undefined' ? legendPotentiel : null)
  }
};