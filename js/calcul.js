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
  const entitesFiltrees = features.filter(f => {
    const p = f.properties;

    if (communeNorm && normaliserTexte(p.Commune) !== communeNorm) return false;
    if (!testerPeriode(p.DateLivrai, periodeChoisie)) return false;

    const destHab = p.Destinatio === 'HAB';
    const etatConstruit = p.ETAT === 'CONSTRUIT';
    const urbIntensif = p.Urbanisati === 'INTENSIF';
    const typeOk = p.Type2Urban === 'DC' || p.Type2Urban === 'DP';
    const noOpB = p.OperationB === null || p.OperationB === undefined || p.OperationB === '';

    return destHab && etatConstruit && urbIntensif && typeOk && noOpB;
  });

  const surfaces = entitesFiltrees
    .map(f => Number(f.properties.Surface) || 0)
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
  if (!periodeChoisie) {
    return dateLivrai === '2009_2022' || dateLivrai === '2022_2025' || dateLivrai === '2026';
  }
  if (periodeChoisie === '2009_2025') {
    return dateLivrai === '2009_2022' || dateLivrai === '2022_2025';
  }
  return dateLivrai === periodeChoisie;
}