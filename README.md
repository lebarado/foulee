# Foulée 🏃

PWA mobile, en français et en thème sombre, pour reprendre la course à pied **avec régularité**.
Le principe : des **cartes de séance**. Tu les cales dans les 48 h qui précèdent et tu peux les décaler d'1 ou 2 jours quand le travail l'impose, sans aucune pénalité.

## Démarrer

```powershell
npm install
npm run dev        # http://localhost:5173
npm test           # tests des règles (cartes, gamification, charge, coach)
npm run build      # build statique dans dist/
```

Astuce de test : `http://localhost:5173/?today=2026-11-20` simule une autre date.

## Stack et pourquoi

| Choix | Raison |
|---|---|
| Vite + TypeScript strict | Build rapide, produit un dossier statique `dist/` |
| Preact + Signals | ~4 kB, syntaxe React, état réactif sans boilerplate |
| Dexie (IndexedDB) | Stockage local typé, migrations versionnées |
| vite-plugin-pwa | Manifest, service worker, hors ligne, mises à jour auto |
| Graphiques en SVG maison | Zéro dépendance, rendu net sur mobile |
| Vitest | Tests du cœur métier |

## Architecture

```
src/
  domain/   logique pure, sans UI ni base : testable et réutilisable
    cards.ts         états des cartes, fenêtre 48 h, décalage ±2 j, avertissements
    gamification.ts  XP, niveaux, séries + jokers, quêtes, badges, records
    load.ts          règle des 10 % de volume
    coach.ts         ajustement de la prochaine sortie (règles paramétrables)
    catalog.ts       réglages par défaut, modèles de cartes, exercices de renfo
    seed.ts          données de départ
  data/     Dexie, store (signals), export/import JSON
  ui/       écrans : Aujourd'hui, Planning, Progrès, Réglages, plus les feuilles
```

## Hébergement maison

`npm run build`, puis servir `dist/` avec n'importe quel serveur statique (Caddy, nginx).
Le HTTPS est obligatoire pour le service worker ; Caddy le gère tout seul.
