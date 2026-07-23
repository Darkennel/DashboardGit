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
function calculerStatistiquesSurfaces(features, communeNorm) {
  const entitesFiltrees = features.filter(f => {
    const p = f.properties;
    if (communeNorm && normaliserTexte(p.Commune) !== communeNorm) return false;

    const destHab = p.Destinatio === 'HAB';
    const etatConstruit = p.ETAT === 'CONSTRUIT';
    const urbIntensif = p.Urbanisati === 'INTENSIF';
    const typeOk = p.Type2Urban === 'DC' || p.Type2Urban === 'DP';
    const dateOk = p.DateLivrai === '2009_2022' || p.DateLivrai === '2022_2025';
    const noOpB = p.OperationB === null || p.OperationB === undefined || p.OperationB === '';

    return destHab && etatConstruit && urbIntensif && typeOk && dateOk && noOpB;
  });

  const surfaces = entitesFiltrees
    .map(f => Number(f.properties.Shape_Area) || 0)
    .sort((a, b) => a - b);

  if (surfaces.length === 0) return { q1: 0, mediane: 0 };

  return {
    q1: getPercentile(surfaces, 0.25),
    mediane: getPercentile(surfaces, 0.50)
  };
}

// Calcul de ID3 (opérations groupées)
function calculerMedianeShapeAreaOpGroupee(features, communeNorm) {
  const entitesFiltrees = features.filter(f => {
    const p = f.properties;
    if (communeNorm && normaliserTexte(p.Commune) !== communeNorm) return false;

    const etatConstruit = p.ETAT === 'CONSTRUIT';
    const dateOk = p.DateLivrai === '2009_2022' || p.DateLivrai === '2022_2025';
    const isOpGroupee = normaliserTexte(p.OperationB) === 'oui';

    return etatConstruit && dateOk && isOpGroupee;
  });

  const surfacesArea = entitesFiltrees
    .map(f => Number(f.properties.Shape_Area) || 0)
    .sort((a, b) => a - b);

  if (surfacesArea.length === 0) return 0;

  const mid = Math.floor((surfacesArea.length - 1) / 2);
  return surfacesArea.length % 2 === 0
    ? (surfacesArea[mid] + surfacesArea[mid + 1]) / 2
    : surfacesArea[mid];
}