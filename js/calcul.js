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
    
    // Filtre période dynamique
    if (periodeChoisie) {
      if (p.DateLivrai !== periodeChoisie) return false;
    } else {
      // Par défaut si pas de sélection : accepter les 2 périodes
      if (p.DateLivrai !== '2009_2022' && p.DateLivrai !== '2022_2025') return false;
    }

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

  function getPercentile(arr, q) {
    const pos = (arr.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    return arr[base + 1] !== undefined ? arr[base] + rest * (arr[base + 1] - arr[base]) : arr[base];
  }

  return {
    q1: getPercentile(surfaces, 0.25),
    mediane: getPercentile(surfaces, 0.50)
  };
}

// Statistique IC3 avec filtre période
function calculerMedianeShapeAreaOpGroupee(features, communeNorm, periodeChoisie = "") {
  const entitesFiltrees = features.filter(f => {
    const p = f.properties;

    if (communeNorm && normaliserTexte(p.Commune) !== communeNorm) return false;

    // Filtre période dynamique
    if (periodeChoisie) {
      if (p.DateLivrai !== periodeChoisie) return false;
    } else {
      if (p.DateLivrai !== '2009_2022' && p.DateLivrai !== '2022_2025') return false;
    }

    const etatConstruit = p.ETAT === 'CONSTRUIT';
    const isOpGroupee = normaliserTexte(p.OperationB) === 'oui';

    return etatConstruit && isOpGroupee;
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