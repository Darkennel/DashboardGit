// Helper privé pour les percentiles
function getPercentile(arr, q) {
  const pos = (arr.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (arr[base + 1] !== undefined) {
    return arr[base] + rest * (arr[base + 1] - arr[base]);
  } else {
    return arr[base];
  }
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