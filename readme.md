# 🎱 Three.js – Simulateur de Physique 📦

Une scène 3D interactive de simulation physique créée avec [Three.js](https://threejs.org/) et [Cannon-es](https://pmndrs.github.io/cannon-es/docs/modules.html), inspirée du parcours Three.js Journey par Bruno Simon.

<img src="./docs/scene.png" alt="Aperçu de la simulation physique" width="480"/>

## 🚀 Démo

[Voir la démo](https://rekuiem84.github.io/physics/)

## ✨ Fonctionnalités

- Simulation physique réaliste avec gravité et collisions
- Piscine avec fond et murs de collision
- Génération interactive de sphères et cubes avec propriétés physiques
- Sons de collision basés sur l'intensité de l'impact
- Système de matériaux physiques (friction, rebond)
- Contrôles de caméra libre (OrbitControls)
- Interface de debug (lil-gui) pour générer des objets et réinitialiser la scène

## 🛠️ Installation & Lancement

1. **Cloner le dépôt :**

   ```bash
   git clone https://github.com/Rekuiem84/physics
   cd physics
   ```

2. **Installer les dépendances :**

   ```bash
   npm install
   ```

3. **Lancer le serveur de développement :**

   ```bash
   npm run dev
   ```

4. **Build pour la production :**

   ```bash
   npm run build
   ```

   Les fichiers optimisés seront générés dans le dossier `dist/`.

## 📁 Structure du projet

```
├── src/           # Fichiers sources
├── static/
│   └── sounds/    # Fichiers audio pour les collisions
├── dist/          # Fichiers générés pour la production
├── package.json   # Dépendances et scripts
└── vite.config.js # Configuration Vite
```

## ▶️ Contrôles et interactions

- **Bouton "Generate Sphere"** : Génère une sphère avec taille et position aléatoires
- **Bouton "Generate Box"** : Génère un cube avec taille et position aléatoires
- **Bouton "Reset scene"** : Supprime tous les objets générés
- **Souris** : Contrôles de caméra (rotation, zoom, panoramique)
- **Collisions** : Sons automatiques basés sur l'intensité de l'impact

## ⚙️ Technologies utilisées

- **Three.js** : Rendu 3D et géométries
- **Cannon-es** : Moteur physique réaliste

## 🔗 Mes autres projets Three.js

- [Repo Three.js Journey principal](https://github.com/Rekuiem84/threejs-journey) — pour retrouver tous mes projets suivant ce parcours
