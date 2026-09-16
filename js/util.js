// Normaliser les chaînes de texte
function normaliserTexte(str) {
  if (!str) return "";
  return str
    .toString()
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Supprime les accents
    .replace(/[-_']/g, " ")                           // Remplace tirets/apostrophes
    .replace(/\s+/g, " ")                             // Nettoie espaces multiples
    .trim();
}

function initCommunes() {
  const selectCommune = document.getElementById("commune-select");
  if (!selectCommune) return;

  // Conserver l'option par défaut (SICOVAL - Ensemble du territoire)
  selectCommune.innerHTML = '<option value="">-- SICOVAL (Ensemble du territoire) --</option>';

  // Vérification de la présence des données
  if (typeof communesData === "undefined" || !communesData.features) {
    console.warn("La variable communesData n'est pas chargée.");
    return;
  }

  // Extraire les noms des communes (NOMCOM), retirer les doublons et trier par ordre alphabétique
  const listeCommunes = communesData.features
    .map(f => f.properties ? f.properties.NOMCOM : null)
    .filter(nom => nom !== null && nom !== undefined && nom !== "")
    .filter((nom, index, self) => self.indexOf(nom) === index)
    .sort((a, b) => a.localeCompare(b, "fr"));

  // Injecter les options dans le <select>
  listeCommunes.forEach(nomCommune => {
    const opt = document.createElement("option");
    opt.value = nomCommune;
    opt.textContent = nomCommune;
    selectCommune.appendChild(opt);
  });
}