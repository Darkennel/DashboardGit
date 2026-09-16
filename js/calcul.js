// Renvoie la valeur réelle au rang q (ex: 0.25 pour Q1) sans moyenne
function getPercentile(arr, q) {
  if (arr.length === 0) return 0;
  
  // Calcul du rang (index basé sur 1, puis arrondi au supérieur)
  const index = Math.ceil(q * arr.length) - 1;
  
  // Sécurité pour éviter un index négatif si le tableau n'a qu'un élément
  const indexSecurise = Math.max(0, index);
  
  return arr[indexSecurise];
}

// Calcul des indicateurs de caractérisation (IC1, IC2, IC3)
function calculerIndicateursCaracterisation(features, communeNorm = "", periodeChoisie = "") {
  // -------------------------------------------------------------
  // IC1 & IC2 : Surface de parcelle (Q1 et Médiane)
  // Filtres : Destinatio='hab', ETAT='CONSTRUIT', Urbanisati='intensif', 
  //           Type2Urban in ['dc', 'dp'], OperationB est vide ou nul
  // -------------------------------------------------------------
  const entitesIc1Ic2 = features.filter(f => {
    const p = f.properties || {};

    if (communeNorm && normaliserTexte(p.Commune) !== communeNorm) return false;
    if (!testerPeriode(p.DateLivrai, periodeChoisie)) return false;

    const destHab = normaliserTexte(p.Destinatio).includes("hab");
    const etatConstruit = normaliserTexte(p.ETAT) === "construit";
    const urbIntensif = normaliserTexte(p.Urbanisati) === "intensif";

    const type2Norm = normaliserTexte(p.Type2Urban);
    const typeOk = type2Norm === "dc" || type2Norm === "dp";

    const opBNorm = p.OperationB ? normaliserTexte(p.OperationB) : "";
    const noOpB = opBNorm === "" || opBNorm === "null" || opBNorm === "undefined" || opBNorm === "non";

    return destHab && etatConstruit && urbIntensif && typeOk && noOpB;
  });

  const surfacesM2 = entitesIc1Ic2
    .map(f => Number(f.properties.Shape_Area || f.properties.SHAPE_AREA) || 0)
    .sort((a, b) => a - b);

  const ic1_q1 = surfacesM2.length > 0 ? getPercentile(surfacesM2, 0.25) : 0;
  const ic2_mediane = surfacesM2.length > 0 ? getPercentile(surfacesM2, 0.50) : 0;

  // -------------------------------------------------------------
  // IC3 : Densité en logements / hectare (Opérations groupées)
  // Filtres : ETAT='CONSTRUIT', OperationB='oui', Destinatio contient 'hab'
  // -------------------------------------------------------------
  const entitesIc3 = features.filter(f => {
    const p = f.properties || {};

    if (communeNorm && normaliserTexte(p.Commune) !== communeNorm) return false;
    if (!testerPeriode(p.DateLivrai, periodeChoisie)) return false;

    const etatConstruit = normaliserTexte(p.ETAT) === "construit";
    const isOpGroupee = normaliserTexte(p.OperationB) === "oui";
    const isHab = normaliserTexte(p.Destinatio).includes("hab");

    return etatConstruit && isOpGroupee && isHab;
  });

  const totalsIc3 = entitesIc3.reduce((acc, f) => {
    const p = f.properties || {};
    acc.nbLogementTotal += Number(p.NBLogement || p.NBLOGEMENT) || 0;
    acc.surfaceM2Total += Number(p.Shape_Area || p.SHAPE_AREA) || 0;
    return acc;
  }, { nbLogementTotal: 0, surfaceM2Total: 0 });

  const surfaceHaIc3 = totalsIc3.surfaceM2Total / 10000;
  const ic3_ratio = surfaceHaIc3 > 0 ? totalsIc3.nbLogementTotal / surfaceHaIc3 : 0;

  return {
    ic1_q1: Math.round(ic1_q1),
    ic2_mediane: Math.round(ic2_mediane),
    ic3_ratio: Math.round(ic3_ratio)
  };
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
    const area = Number(p.Conso0922) || 0;
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

// Calculs pour la destination LOGEMENTS (Conforme à la maquette)
function calculerConstruLogements(features) {
  let diffuLog = 0;
  let ruLog = 0;
  let extLog = 0;
  let extSurfaceM2 = 0;

  features.forEach(f => {
    const p = f.properties || {};
    const type = normaliserTexte(p.Type2Urban);
    const nbLog = Number(p.NBLogement || p.NBLOGEMENT) || 0;
    const areaM2 = Number(p.Shape_Area || p.SHAPE_AREA) || 0;

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

// Calcul en LOGEMENTS pour Habitat / Logements (Constructions Planifiées)
// Dans calcul.js

function calculerPlanifieesLogements(features) {
  let autConso = 0, autDensif = 0;
  let projConso = 0, projDensif = 0;

  features.forEach(f => {
    const p = f.properties || {};
    // Tolérance sur le nom des clés (statut / STATUT / etat / ETAT)
    const statut = normaliserTexte(p.Statut || p.STATUT || p.etat || p.ETAT);
    const type = normaliserTexte(p.Type2Urban || p.type2urban || p.type);
    const nbLog = Number(p.NBLogement || p.NBLOGEMENT || p.nb_logement || p.Nblogement) || 0;

    const isConso = (type === 'ext' || type === 'extension');

    if (statut.includes('autoris') || statut === 'pc') {
      if (isConso) autConso += nbLog;
      else autDensif += nbLog;
    } else if (statut.includes('projet') || statut.includes('u_') || statut.includes('au')) {
      if (isConso) projConso += nbLog;
      else projDensif += nbLog;
    }
  });

  return { autConso, autDensif, projConso, projDensif };
}

function calculerPlanifieesActEquipSurfaces(features) {
  let autConsoM2 = 0, autDensifM2 = 0;
  let projConsoM2 = 0, projDensifM2 = 0;

  features.forEach(f => {
    const p = f.properties || {};
    const statut = normaliserTexte(p.ETAT);
    const type = normaliserTexte(p.Type2Urban);
    const areaM2 = Number(p.Shape_Area)|| 0;

    const isConso = (type === 'EXT' || type === 'extension');

    if (statut.includes('autoris') || statut === 'PC') {
      if (isConso) autConsoM2 += areaM2;
      else autDensifM2 += areaM2;
    } else if (statut.includes('projet') || statut.includes('u_') || statut.includes('au')) {
      if (isConso) projConsoM2 += areaM2;
      else projDensifM2 += areaM2;
    }
  });

  return {
    autConsoHa: autConsoM2 / 10000,
    autDensifHa: autDensifM2 / 10000,
    projConsoHa: projConsoM2 / 10000,
    projDensifHa: projDensifM2 / 10000
  };
}

// Calcul en SURFACES (hectares) pour Activités & Équipements (Constructions Planifiées)
function calculerPlanifieesActEquipSurfaces(features) {
  let autConsoM2 = 0, autDensifM2 = 0;
  let projConsoM2 = 0, projDensifM2 = 0;

  features.forEach(f => {
    const p = f.properties || {};
    const statut = normaliserTexte(p.Statut || p.STATUT);
    const type = normaliserTexte(p.Type2Urban);
    const areaM2 = Number(p.Shape_Area || p.SHAPE_AREA) || 0;

    const isConso = (type === 'ext' || type === 'extension');

    if (statut === 'autorise' || statut === 'autorisee') {
      if (isConso) autConsoM2 += areaM2;
      else autDensifM2 += areaM2;
    } else if (statut === 'projete' || statut === 'projetee') {
      if (isConso) projConsoM2 += areaM2;
      else projDensifM2 += areaM2;
    }
  });

  return {
    autConsoHa: autConsoM2 / 10000,
    autDensifHa: autDensifM2 / 10000,
    projConsoHa: projConsoM2 / 10000,
    projDensifHa: projDensifM2 / 10000
  };
}