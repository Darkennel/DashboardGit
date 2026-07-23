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