import os
import re
import tkinter as tk
from tkinter import filedialog
import pandas as pd
import geopandas as gpd

# ==========================================
# 1. INTERFACE GRAPHIQUE (TKINTER)
# ==========================================

def selectionner_fichiers_et_dossier():
    # Création et masquage de la fenêtre racine Tkinter
    root = tk.Tk()
    root.withdraw()
    root.attributes('-topmost', True) # Forcer la fenêtre au premier plan

    print("📁 Sélection du fichier des Permis...")
    fichier_permis = filedialog.askopenfilename(
        title="1/3 - Sélectionner le fichier des Permis (Excel ou CSV)",
        filetypes=[("Fichiers Excel / CSV", "*.xlsx *.xls *.csv"), ("Tous les fichiers", "*.*")]
    )

    if not fichier_permis:
        print("❌ Opération annulée : Aucun fichier Permis sélectionné.")
        return None, None, None

    print("📁 Sélection du fichier Cadastre...")
    fichier_cadastre = filedialog.askopenfilename(
        title="2/3 - Sélectionner le fichier Cadastre (GeoJSON)",
        filetypes=[("Fichiers GeoJSON", "*.geojson *.json"), ("Tous les fichiers", "*.*")]
    )

    if not fichier_cadastre:
        print("❌ Opération annulée : Aucun fichier Cadastre sélectionné.")
        return None, None, None

    print("📁 Sélection du dossier de sortie...")
    dossier_sortie = filedialog.askdirectory(
        title="3/3 - Sélectionner le dossier où enregistrer le résultat"
    )

    if not dossier_sortie:
        print("❌ Opération annulée : Aucun dossier de sortie sélectionné.")
        return None, None, None

    fichier_sortie = os.path.join(dossier_sortie, "permis_geometries.geojson")
    
    return fichier_permis, fichier_cadastre, fichier_sortie


# Lancement des boîtes de dialogue
FICHIER_PERMIS, FICHIER_CADASTRE, FICHIER_SORTIE = selectionner_fichiers_et_dossier()

# Arrêt du script si l'utilisateur a fermé ou annulé une fenêtre
if not FICHIER_PERMIS:
    raise SystemExit("Traitement interrompu par l'utilisateur.")

# ==========================================
# 2. PARAMÈTRES ET CONFIGURATION DES CHAMPS
# ==========================================

COL_ID_PERMIS = "dossier"      # Champ identifiant du permis
COL_PARCELLES = "parcelles"      # Champ avec les codes parcelles
COL_EMPLACEMENT = "Emplacement"  # Champ identifiant dans le cadastre

# ==========================================
# 3. CHARGEMENT ET TRAITEMENT DES DONNÉES
# ==========================================

print("\n1️⃣ Chargement des données...")
if FICHIER_PERMIS.endswith('.csv'):
    df_permis = pd.read_csv(FICHIER_PERMIS)
else:
    df_permis = pd.read_excel(FICHIER_PERMIS)

cadastre = gpd.read_file(FICHIER_CADASTRE)

print("2️⃣ Extraction et nettoyage des parcelles...")

def nettoyer_code(code_str):
    if pd.isna(code_str):
        return ""
    return re.sub(r'\s+', ' ', str(code_str)).strip().upper()

cadastre['code_cadastre_clean'] = cadastre[COL_EMPLACEMENT].apply(nettoyer_code)

lignes_association = []
for idx, row in df_permis.iterrows():
    raw_parcelles = str(row[COL_PARCELLES]) if pd.notna(row[COL_PARCELLES]) else ""
    if not raw_parcelles.strip():
        continue
    
    liste_codes = [c.strip() for c in raw_parcelles.split(',') if c.strip()]
    for code_brut in liste_codes:
        code_propre = nettoyer_code(code_brut)
        dict_ligne = row.to_dict()
        dict_ligne['code_parcelle_match'] = code_propre
        lignes_association.append(dict_ligne)

df_association = pd.DataFrame(lignes_association)

# ==========================================
# 4. JOINTURE ET FUSION (DISSOLVE)
# ==========================================

print("3️⃣ Recherche des géométries dans le cadastre...")
gdf_merged = cadastre.merge(
    df_association,
    left_on='code_cadastre_clean',
    right_on='code_parcelle_match',
    how="inner"
)

# Gestion et affichage des parcelles manquantes
df_manquants = df_association[~df_association['code_parcelle_match'].isin(gdf_merged['code_parcelle_match'])]

if not df_manquants.empty:
    dossiers_incomplets = (
        df_manquants.groupby(COL_ID_PERMIS)['code_parcelle_match']
        .apply(list)
        .reset_index()
    )
    print(f"\n⚠️ {len(dossiers_incomplets)} dossier(s) contiennent des parcelles non retrouvées :")
    for idx, row in dossiers_incomplets.iterrows():
        print(f"  • Dossier '{row[COL_ID_PERMIS]}' ➔ Introuvable : {', '.join(row['code_parcelle_introuvable'])}")
        
    # Export facultatif de la liste des manquants dans le même dossier de sortie
    fichier_manquants = os.path.join(os.path.dirname(FICHIER_SORTIE), "dossiers_parcelles_manquantes.xlsx")
    dossiers_incomplets.to_excel(fichier_manquants, index=False)
    print(f"➜ Rapport d'erreurs généré : {fichier_manquants}")

print("\n4️⃣ Fusion des géométries par permis (Dissolve)...")
permis_geometries = gdf_merged.dissolve(by=COL_ID_PERMIS, as_index=False)

# Nettoyage des colonnes temporaires
cols_temp = ['code_cadastre_clean', 'code_parcelle_match']
permis_geometries = permis_geometries.drop(columns=[c for c in cols_temp if c in permis_geometries.columns])

# ==========================================
# 5. EXPORT
# ==========================================

print(f"\n5️⃣ Sauvegarde dans : {FICHIER_SORTIE}")
permis_geometries.to_file(FICHIER_SORTIE, driver="GeoJSON")

print("\n✨ Traitement terminé avec succès !")