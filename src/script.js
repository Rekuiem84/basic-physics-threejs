import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import GUI from "lil-gui";
import * as CANNON from "cannon-es";
import { Timer } from "three/examples/jsm/Addons.js";

/**
 * Debug
 */
const gui = new GUI({ width: 350 });

const debugObject = {};

debugObject.generateSphere = () => {
	// Rayon de la sphère
	const radius = Math.random() * 0.5 + 0.25; // Random radius between 0.2 and 0.75

	// Position de la sphère
	const position = new THREE.Vector3(
		(Math.random() - 0.5) * poolWidth,
		Math.random() * 5 + 5,
		(Math.random() - 0.5) * poolWidth
	);

	// Créer la sphère
	const { mesh, body } = createSphere(radius, position);

	// Ajouter la sphère à la scène et au monde physique
	scene.add(mesh);
	world.addBody(body);
	objectsToUpdate.push({ mesh, body });
};
debugObject.shootSphere = () => {
	shootSphere();
};

debugObject.remoteAllObjects = () => {
	objectsToUpdate.forEach((object) => {
		// Remove the mesh
		scene.remove(object.mesh);

		// Remove the body and the event listener
		world.removeBody(object.body);
		object.body.removeEventListener("collide", playCollisionSound);

		// Remove all the object from the array
	});
	objectsToUpdate.splice(0, objectsToUpdate.length);
};

gui.add(debugObject, "generateSphere").name("Generate Sphere");
gui.add(debugObject, "shootSphere").name("Shoot Sphere");
gui.add(debugObject, "remoteAllObjects").name("Remove all objects");

/**
 * Base
 */
// Canvas
const canvas = document.querySelector("canvas.webgl");

// Scene
const scene = new THREE.Scene();

// Sound
const collisionSound = new Audio("./sounds/hit.mp3");

function playCollisionSound(collision) {
	// Get collision strength
	const impactStrength = collision.contact.getImpactVelocityAlongNormal();

	if (impactStrength > 1.5) {
		collisionSound.volume = Math.min(impactStrength / 10, 1); // Adjust volume based on impact strength
		collisionSound.currentTime = 0; // Reset sound to allow multiple plays
		collisionSound.play();
	}
}

/**
 * Physics
 */
const world = new CANNON.World();
world.broadphase = new CANNON.SAPBroadphase(world); // Algorithm to optimize collision detection
world.allowSleep = true; // Allow bodies to sleep when they are not moving (performance optimization)
world.gravity.set(0, -9.81, 0); // gravity

// Materials
//
// Customs materials interactions
// const concreteMaterial = new CANNON.Material("concrete");
// const plasticMaterial = new CANNON.Material("plastic");

// const concretePlasticContactMaterial = new CANNON.ContactMaterial(
// 	concreteMaterial,
// 	plasticMaterial,
// 	{
// 		friction: 0,
// 		restitution: 1,
// 	}
// );

// world.addContactMaterial(concretePlasticContactMaterial);

// Default
const defaultMaterial = new CANNON.Material("default");
const defaultContactMaterial = new CANNON.ContactMaterial(
	defaultMaterial,
	defaultMaterial,
	{
		friction: 0.2,
		restitution: 0.5, // bounciness
	}
);

// Add the contact material to the world
world.addContactMaterial(defaultContactMaterial);
// Set the default contact material to all bodies that do not have a specific contact material defined
world.defaultContactMaterial = defaultContactMaterial;

// Floor
const floorShape = new CANNON.Plane();
const floorBody = new CANNON.Body({
	mass: 0, // the floor will not be affected by gravity
	shape: floorShape,
});
// Set the position of the floor
// Dans CANNON, on doit utiliser un quaternion pour la rotation
// Ici, on fait une rotation de 90 degrés autour de l'axe X
// X doit être négatif pour que le plan soit bien orienté comme le sol
floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(-1, 0, 0), Math.PI * 0.5);
world.addBody(floorBody);

const poolGroup = new THREE.Group();
scene.add(poolGroup);

const poolWidth = 8;
const poolWallThickness = 0.5;
const poolWallHeight = 1.5;

const poolGreenMaterial = new THREE.MeshPhysicalMaterial({
	color: "#08770a",
	metalness: 0.5,
	roughness: 1,
	sheen: 1,
	sheenRoughness: 1,
	sheenColor: "#2c5431",
	clearcoat: 1,
	clearcoatRoughness: 1,
	side: THREE.DoubleSide,
});
const poolWoodMaterial = new THREE.MeshStandardMaterial({
	color: "#91542B",
	metalness: 0.3,
	roughness: 0.4,
	envMapIntensity: 0.5,
	// wireframe: true,
	side: THREE.DoubleSide,
});

const pool = new THREE.Shape();
pool.moveTo(poolWidth, poolWidth);
pool.lineTo(poolWidth, -poolWidth);
pool.lineTo(-poolWidth, -poolWidth);
pool.lineTo(-poolWidth, poolWidth);

const hole = new THREE.Path();
hole.moveTo(poolWidth - poolWallThickness, poolWidth - poolWallThickness);
hole.lineTo(poolWidth - poolWallThickness, -(poolWidth - poolWallThickness));
hole.lineTo(-(poolWidth - poolWallThickness), -(poolWidth - poolWallThickness));
hole.lineTo(-(poolWidth - poolWallThickness), poolWidth - poolWallThickness);
pool.holes.push(hole);

const poolFloor = new THREE.Mesh(
	new THREE.PlaneGeometry(poolWidth * 2, poolWidth * 2),
	poolGreenMaterial
);
poolFloor.rotation.x = -Math.PI * 0.5; // Rotate the floor to be horizontal

const extrudeSettings = {
	steps: 1,
	depth: poolWallHeight,
	bevelEnabled: true,
	bevelThickness: 0.1,
	bevelSize: 0.1,
	bevelOffset: 0,
	bevelSegments: 1,
};

const poolGeometry = new THREE.ExtrudeGeometry(pool, extrudeSettings);
poolGeometry.rotateX(-Math.PI * 0.5); // Rotate the geometry to be horizontal
const poolMesh = new THREE.Mesh(poolGeometry, poolWoodMaterial);

poolGroup.add(poolMesh);
poolGroup.add(poolFloor);

// Pool physics bodies to match the visual pool
const poolPhysicsBody = new CANNON.Body({ mass: 0 });

// Pool floor (bottom of the pool)
const poolFloorShape = new CANNON.Box(
	new CANNON.Vec3(
		poolWidth - poolWallThickness,
		0.1,
		poolWidth - poolWallThickness
	)
);
poolPhysicsBody.addShape(poolFloorShape, new CANNON.Vec3(0, 0.1, 0));

// Pool walls
// Front wall
const frontWallShape = new CANNON.Box(
	new CANNON.Vec3(poolWidth, poolWallHeight / 2, poolWallThickness / 2)
);
poolPhysicsBody.addShape(
	frontWallShape,
	new CANNON.Vec3(0, poolWallHeight / 2, poolWidth - poolWallThickness / 2)
);

// Back wall
poolPhysicsBody.addShape(
	frontWallShape,
	new CANNON.Vec3(0, poolWallHeight / 2, -poolWidth + poolWallThickness / 2)
);

// Left wall
const sideWallShape = new CANNON.Box(
	new CANNON.Vec3(
		poolWallThickness / 2,
		poolWallHeight / 2,
		poolWidth - poolWallThickness
	)
);
poolPhysicsBody.addShape(
	sideWallShape,
	new CANNON.Vec3(-poolWidth + poolWallThickness / 2, poolWallHeight / 2, 0)
);

// Right wall
poolPhysicsBody.addShape(
	sideWallShape,
	new CANNON.Vec3(poolWidth - poolWallThickness / 2, poolWallHeight / 2, 0)
);

world.addBody(poolPhysicsBody);

/**
 * Lights
 */
const ambientLight = new THREE.AmbientLight(0xffffff, 2.2);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.set(1024, 1024);
directionalLight.shadow.camera.far = 15;
directionalLight.shadow.camera.left = -7;
directionalLight.shadow.camera.top = 7;
directionalLight.shadow.camera.right = 7;
directionalLight.shadow.camera.bottom = -7;
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

/**
 * Sizes
 */
const sizes = {
	width: window.innerWidth,
	height: window.innerHeight,
};

window.addEventListener("resize", () => {
	// Update sizes
	sizes.width = window.innerWidth;
	sizes.height = window.innerHeight;

	// Update camera
	camera.aspect = sizes.width / sizes.height;
	camera.updateProjectionMatrix();

	// Update renderer
	renderer.setSize(sizes.width, sizes.height);
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(
	75,
	sizes.width / sizes.height,
	0.1,
	100
);
camera.position.set(-12, 12, -12);
scene.add(camera);

// Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
	canvas: canvas,
});
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

/**
 * Generate spheres
 */
const objectsToUpdate = [];

const sphereGeometry = new THREE.SphereGeometry(1, 32, 32);
const objectMaterial = new THREE.MeshStandardMaterial({
	metalness: 0.3,
	roughness: 0.4,
});

function createSphere(radius, position) {
	// ThreeJS mesh
	const mesh = new THREE.Mesh(sphereGeometry, objectMaterial);
	mesh.scale.setScalar(radius);
	mesh.castShadow = true;
	mesh.position.copy(position);

	// CANNON body
	const shape = new CANNON.Sphere(radius);
	const body = new CANNON.Body({
		mass: 1,
		position: new CANNON.Vec3(position.x, position.y, position.z),
		shape: shape,
		material: defaultMaterial,
	});
	body.position.copy(position);
	body.addEventListener("collide", playCollisionSound);

	return { mesh, body };
}

function shootSphere() {
	// Rayon de la sphère
	const radius = 0.5;

	// Obtenir la position globale du canon dans le monde
	const canonWorldPosition = new THREE.Vector3();
	canon.getWorldPosition(canonWorldPosition);

	// Calculer la direction de tir
	// On place la direction de tir sur la face haut du canon
	const canonDirection = new THREE.Vector3(0, canonHeight, 0); // Direction locale du canon vers le haut

	// Créer une matrice pour représenter la transformation du canon
	const canonWorldMatrix = new THREE.Matrix4();
	canon.updateMatrixWorld();
	canonWorldMatrix.copy(canon.matrixWorld);

	// On applique la transformation du monde pour obtenir la direction de tir correcte
	canonDirection.transformDirection(canonWorldMatrix);
	canonDirection.normalize();

	// On positionne la sphère un peu devant le canon
	const shootPosition = canonWorldPosition
		.clone()
		.add(canonDirection.clone().multiplyScalar(0.8));

	// Créer la sphère
	const { mesh, body } = createSphere(radius, shootPosition);

	// Appliquer une force dans la direction de tir
	const shootingPower = debugObject.canonShootingPower;
	const shootForce = new CANNON.Vec3(
		canonDirection.x * shootingPower,
		canonDirection.y * shootingPower,
		canonDirection.z * shootingPower
	);

	// Appliquer la force au corps de la sphère
	body.applyLocalForce(shootForce, new CANNON.Vec3(0, 0, 0));

	// Ajouter la sphère à la scène et au monde physique
	// Ajouter la sphère à l'array des objets à mettre à jour
	scene.add(mesh);
	world.addBody(body);
	objectsToUpdate.push({ mesh, body });
}

/**
 * Canon
 */
debugObject.canonAltitude = 0.5; // Height of the cannon above the ground
debugObject.canonHorizontalOrientation = 0; // Rotation angle in radians
debugObject.canonVerticalOrientation = Math.PI * 0.25; // Vertical orientation of the cannon

debugObject.canonOrbitAngle = Math.PI * 0.25;
debugObject.canonOrbitRadius = 14; // Distance from the center of the pool
debugObject.canonOrbitSpeed = 1.5;

debugObject.canonShootingPower = 650; // Shooting power
debugObject.canonShootingDelay = 200; // Frequency of shooting in milliseconds

debugObject.canonIsRotating = false;
debugObject.canonIsShooting = false;
debugObject.shootingInterval = null; // Store the interval ID for proper cleanup

const canonGroup = new THREE.Group();
canonGroup.position.set(0, debugObject.canonAltitude, 0); // Set initial position of the canon group
scene.add(canonGroup);

const canonHeight = 1;
const canon = new THREE.Mesh(
	new THREE.CylinderGeometry(1, 0.4, canonHeight, 16),
	new THREE.MeshStandardMaterial({
		color: "#444444",
		metalness: 0.3,
		roughness: 0.4,
	})
);
canonGroup.add(canon);
canonGroup.rotateY(debugObject.canonOrbitAngle); // Set initial rotation of the canon group

const canonFolder = gui.addFolder("Canon Controls");

canonFolder
	.add(debugObject, "canonAltitude")
	.min(0)
	.max(10)
	.step(0.01)
	.name("Canon Altitude")
	.onChange((value) => {
		canonGroup.position.set(0, value, 0);
	}); // Update the position of the canon group when altitude changes

canonFolder
	.add(debugObject, "canonHorizontalOrientation")
	.min(-Math.PI)
	.max(Math.PI)
	.step(0.01)
	.name("Horizontal Orientation")
	.onChange((value) => {
		canon.rotation.y = value;
	});

canonFolder
	.add(debugObject, "canonVerticalOrientation")
	.min(0)
	.max(Math.PI)
	.step(0.01)
	.name("Vertical Orientation")
	.onChange((value) => {
		canon.rotation.z = value;
	});
canonFolder
	.add(debugObject, "canonOrbitAngle")
	.min(0)
	.max(Math.PI * 2)
	.step(0.01)
	.name("Orbit Angle")
	.onChange((value) => {
		if (!debugObject.canonIsRotating) {
			canonGroup.rotation.y = value; // Update the rotation of the canon group
		}
	});

canonFolder
	.add(debugObject, "canonOrbitRadius")
	.min(0)
	.max(25)
	.step(0.1)
	.name("Orbit Radius")
	.onChange((value) => {
		canon.position.setX(value);
	});
canonFolder
	.add(debugObject, "canonOrbitSpeed")
	.min(0)
	.max(10)
	.step(0.001)
	.name("Rotation Speed");

canonFolder
	.add(debugObject, "canonShootingPower")
	.min(0)
	.max(2500)
	.step(50)
	.name("Shooting Power (N)");

canonFolder
	.add(debugObject, "canonShootingDelay")
	.min(50)
	.max(2000)
	.step(50)
	.name("Shooting Interval (ms)")
	.onChange((value) => {
		if (value < 50) {
			debugObject.canonShootingDelay = 50;
		}
		// If currently shooting, restart the interval with new speed
		if (debugObject.canonIsShooting && debugObject.shootingInterval) {
			clearInterval(debugObject.shootingInterval);
			debugObject.shootingInterval = setInterval(() => {
				if (debugObject.canonIsShooting) {
					shootSphere();
				}
			}, debugObject.canonShootingDelay);
		}
	});
canonFolder
	.add(debugObject, "canonIsShooting")
	.name("Canon shooting")
	.onChange((value) => {
		if (value) {
			// Start shooting
			debugObject.shootingInterval = setInterval(() => {
				if (debugObject.canonIsShooting) {
					shootSphere();
				}
			}, debugObject.canonShootingDelay);
		} else {
			// Stop shooting
			if (debugObject.shootingInterval) {
				clearInterval(debugObject.shootingInterval);
				debugObject.shootingInterval = null;
			}
		}
	});
canonFolder.add(debugObject, "canonIsRotating").name("Canon orbiting");
// .onChange((value) => {
// 	if (value) {
// 		canonGroup.rotation.y = debugObject.canonRotationAngle; // Reset rotation to the specified angle
// 	} else {
// 		canonGroup.rotation.y = 0; // Reset rotation to 0 if not rotating
// 	}
// });

canon.position.set(debugObject.canonOrbitRadius, debugObject.canonAltitude, 0);
canon.rotation.y = debugObject.canonHorizontalOrientation; // Set initial horizontal orientation
canon.rotation.z = debugObject.canonVerticalOrientation;
canon.castShadow = true;

/**
 * Animate
 */
const timer = new Timer();

const tick = () => {
	// Timer
	timer.update();
	const elapsedTime = timer.getElapsed();

	// Wind
	// sphereBody.applyForce(
	// 	new CANNON.Vec3(-1, 0, 0), // Force vector
	// 	sphereBody.position // Origin point (where the force is applied)
	// );

	// Canon rotation
	if (debugObject.canonIsRotating) {
		canonGroup.rotation.y += debugObject.canonOrbitSpeed * timer.getDelta();
	}

	// Update physics world
	world.step(1 / 60, timer.getDelta(), 3);

	// Update 3D world
	// sphere.position.copy(sphereBody.position);       // single sphere update

	objectsToUpdate.forEach((object) => {
		// Update mesh position
		object.mesh.position.copy(object.body.position);
		object.mesh.quaternion.copy(object.body.quaternion);
	});

	// Update controls
	controls.update();

	// Render
	renderer.render(scene, camera);

	// Call tick again on the next frame
	window.requestAnimationFrame(tick);
};

tick();
