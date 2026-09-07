const THEMES_CONFIG = {
  enaf_actuel: {
    label: "1. Surfaces ENAF et non-ENAF",
    source: () => (typeof Enaf2022 !== 'undefined' ? Enaf2022 : null),
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
    source: () => (typeof ConsoEnaf0922 !== 'undefined' ? ConsoEnaf0922 : null),
    filters: {},
    style: (feature) => (typeof styleConsoEffective === 'function' ? styleConsoEffective(feature) : {}),
    updateTable: (data, commune) => {
      if (typeof mettreAJourTableauConsoEffective === 'function') {
        mettreAJourTableauConsoEffective(data, commune);
      }
    },
    legend: () => (typeof legendConsoEffective !== 'undefined' ? legendConsoEffective : null)
  },

  constructions_effectives: {
    label: "3. Constructions effectives (Livrés)",
    source: () => (typeof suiviConstru !== 'undefined' ? suiviConstru : null),
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
  source: () => (typeof suiviConstru !== 'undefined' ? suiviConstru : null),
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
    source: () => (typeof EnafPlanifieeData !== 'undefined' ? EnafPlanifieeData : null),
    filters: { zone: ["TOUT", "U", "AU", "AUO"] },
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