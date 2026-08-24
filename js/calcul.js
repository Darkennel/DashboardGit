// Renvoie la valeur réelle au rang q (ex: 0.25 pour Q1) sans moyenne
function getPercentile(arr, q) {
  if (arr.length === 0) return 0;
  
  // Calcul du rang (index basé sur 1, puis arrondi au supérieur)
  const index = Math.ceil(q * arr.length) - 1;
  
  // Sécurité pour éviter un index négatif si le tableau n'a qu'un élément
  const indexSecurise = Math.max(0, index);
  
  return arr[indexSecurise];
}

// Calcul de ID1 et ID2
// Statistiques IC1 et IC2 avec filtre période
function calculerStatistiquesSurfaces(features, communeNorm, periodeChoisie = "") {
  let iterateur = 0;
  const entitesFiltrees = features.filter(f => {
    const p = f.properties;

    if (communeNorm && normaliserTexte(p.Commune) !== communeNorm) return false;
    if (!testerPeriode(p.DateLivrai, periodeChoisie)) return false;

    // Normalisation des propriétés pour éviter les soucis de casse / espaces
    const destHab = normaliserTexte(p.Destinatio) === 'hab';
    const etatConstruit = normaliserTexte(p.ETAT) === 'construit';
    const urbIntensif = normaliserTexte(p.Urbanisati) === 'intensif';
    
    const type2Norm = normaliserTexte(p.Type2Urban);
    const typeOk = type2Norm === 'dc' || type2Norm === 'dp';

    // IS NULL / vide
    const opBNorm = p.OperationB ? normaliserTexte(p.OperationB) : '';
    const noOpB = opBNorm === '' || opBNorm === 'null' || opBNorm === 'undefined';

    const valide = destHab && etatConstruit && urbIntensif && typeOk && noOpB;
    if (valide) iterateur += 1;

    return valide;
  });

  console.log("i = ", iterateur);

  const surfaces = entitesFiltrees
    .map(f => Number(f.properties.Shape_Area) || 0)
    .sort((a, b) => a - b);

  if (surfaces.length === 0) return { q1: 0, mediane: 0 };

  return {
    q1: getPercentile(surfaces, 0.25),
    mediane: getPercentile(surfaces, 0.50)
  };
}

// Statistique IC3 : Densité en logements par hectare (NBLogement total / Surface totale en ha)
function calculerRatioLogementsParHectare(features, communeNorm, periodeChoisie = "") {
  const entitesFiltrees = features.filter(f => {
    const p = f.properties;

    if (communeNorm && normaliserTexte(p.Commune) !== communeNorm) return false;
    if (!testerPeriode(p.DateLivrai, periodeChoisie)) return false;

    const etatConstruit = p.ETAT === 'CONSTRUIT';
    const isOpGroupee = normaliserTexte(p.OperationB) === 'oui';
    
    // Filtre sur la destination Habitat
    const isHab = normaliserTexte(p.Destinatio).includes("hab");

    return etatConstruit && isOpGroupee && isHab;
  });

  const totals = entitesFiltrees.reduce((acc, f) => {
    const p = f.properties;
    acc.nbLogementTotal += Number(p.NBLogement) || 0;
    acc.surfaceM2Total += Number(p.Shape_Area) || 0;
    return acc;
  }, { nbLogementTotal: 0, surfaceM2Total: 0 });

  if (totals.surfaceM2Total === 0) return 0;

  const surfaceHectares = totals.surfaceM2Total / 10000;
  return totals.nbLogementTotal / surfaceHectares;
}
function testerPeriode(dateLivrai, periodeChoisie) {
  // Nettoyage de la valeur en base
  const dateNorm = dateLivrai ? dateLivrai.toString().trim() : "";

  // 1. "Toutes les périodes" (valeur vide) -> On accepte tout ce qui correspond aux 3 périodes réelles
  if (!periodeChoisie) {
    return dateNorm === '2009_2022' || dateNorm === '2022_2025' || dateNorm === '2026';
  }

  // 2. Période cumulée "2009-2025" -> Uniquement les deux premières tranches
  if (periodeChoisie === '2009_2025') {
    return dateNorm === '2009_2022' || dateNorm === '2022_2025';
  }

  // 3. Périodes simples ("2009_2022", "2022_2025", "2026")
  return dateNorm === periodeChoisie;
}

function calculerSurfacesEnafActuel(features) {
  let surfaceNonEnafHa = 0;
  let surfaceEnafHa = 0;

  features.forEach(f => {
    const p = f.properties || {};
    // La valeur est déjà en hectares
    const area = Number(p.Shape_Area) || 0; 
    const typeEsp = p.EspNAF22 ? p.EspNAF22.toString().trim() : "";

    if (typeEsp === "NonNaf") {
      surfaceNonEnafHa += area;
    } else {
      surfaceEnafHa += area;
    }
  });

  const totalHa = surfaceNonEnafHa + surfaceEnafHa;

  return {
    nonEnafHa: surfaceNonEnafHa,
    nonEnafPct: totalHa > 0 ? (surfaceNonEnafHa / totalHa) * 100 : 0,
    enafHa: surfaceEnafHa,
    enafPct: totalHa > 0 ? (surfaceEnafHa / totalHa) * 100 : 0,
    totalHa: totalHa
  };
}

function calculerConsoEffective(features) {
  let surfaceTotaleHa = 0;

  features.forEach(f => {
    const p = f.properties || {};
    // La surface est déjà exprimée en hectares
    const area = Number(p.Shape_Area) || 0;
    surfaceTotaleHa += area;
  });

  // Période 2009-2022 = 13 ans
  const nbAnnees = 13;
  const consoMoyenneAnnuelleHa = surfaceTotaleHa / nbAnnees;

  return {
    totaleHa: surfaceTotaleHa,
    moyenneAnnuelleHa: consoMoyenneAnnuelleHa
  };
}

// Calculs pour la destination LOGEMENTS (m² vers ha pour la surface)
function calculerConstruLogements(features) {
  let diffuLog = 0;
  let ruLog = 0;
  let extLog = 0;
  let extSurfaceM2 = 0;

  features.forEach(f => {
    const p = f.properties || {};
    const type = normaliserTexte(p.Type2Urban);
    const nbLog = Number(p.NBLogement) || 0;
    const areaM2 = Number(p.Shape_Area) || 0;

    if (type === 'dc' || type === 'dp') {
      diffuLog += nbLog;
    } else if (type === 'ru') {
      ruLog += nbLog;
    } else if (type === 'ext' || type === 'extension') {
      extLog += nbLog;
      extSurfaceM2 += areaM2;
    }
  });

  return { 
    diffuLog, 
    ruLog, 
    extLog, 
    extSurfaceHa: extSurfaceM2 / 10000 
  };
}

// Calculs pour ACTIVITES / EQUIPEMENTS et TOUT (m² vers ha)
function calculerConstruSurfacesConsoDensif(features) {
  let actConsoM2 = 0, actDensifM2 = 0;
  let equipConsoM2 = 0, equipDensifM2 = 0;
  let toutConsoM2 = 0, toutDensifM2 = 0;

  features.forEach(f => {
    const p = f.properties || {};
    const dest = normaliserTexte(p.Destinatio || p.destination);
    const type = normaliserTexte(p.Type2Urban);
    const areaM2 = Number(p.Shape_Area) || 0;

    const isConso = (type === 'ext' || type === 'extension');
    const isDensif = (type === 'dc' || type === 'dp' || type === 'ru');

    // Tout (Global)
    if (isConso) toutConsoM2 += areaM2;
    if (isDensif) toutDensifM2 += areaM2;

    // Activités vs Équipements
    if (dest.includes('act')) {
      if (isConso) actConsoM2 += areaM2;
      if (isDensif) actDensifM2 += areaM2;
    } else if (dest.includes('equip')) {
      if (isConso) equipConsoM2 += areaM2;
      if (isDensif) equipDensifM2 += areaM2;
    }
  });

  return {
    actConsoHa: actConsoM2 / 10000,
    actDensifHa: actDensifM2 / 10000,
    equipConsoHa: equipConsoM2 / 10000,
    equipDensifHa: equipDensifM2 / 10000,
    toutConsoHa: toutConsoM2 / 10000,
    toutDensifHa: toutDensifM2 / 10000
  };
}