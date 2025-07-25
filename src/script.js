import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import GUI from "lil-gui";
import * as CANNON from "cannon-es";
import { Timer } from "three/examples/jsm/Addons.js";

/**
 * Debug
 */
const gui = new GUI();
const debugObject = {};
debugObject.generateSphere = () => {
	generateSphere(Math.random() + 0.25, {
		x: (Math.random() - 0.5) * 5,
		y: 3,
		z: (Math.random() - 0.5) * 5,
	});
};
debugObject.generateBox = () => {
	generateBox(Math.random() + 0.5, {
		x: (Math.random() - 0.5) * 5,
		y: 3,
		z: (Math.random() - 0.5) * 5,
	});
};
debugObject.reset = () => {
	objectsToUpdate.forEach((object) => {
		// Remove the mesh
		scene.remove(object.mesh);

		// Remove the body and the event listener
		world.removeBody(object.body);
		// object.body.removeEventListener("collide", playCollisionSound);

		// Remove all the object from the array
	});
	objectsToUpdate.splice(0, objectsToUpdate.length);
};
gui.add(debugObject, "generateSphere").name("Generate Sphere");
gui.add(debugObject, "generateBox").name("Generate Box");
gui.add(debugObject, "reset").name("Reset scene");

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
// Customs
const concreteMaterial = new CANNON.Material("concrete");
const plasticMaterial = new CANNON.Material("plastic");

const concretePlasticContactMaterial = new CANNON.ContactMaterial(
	concreteMaterial,
	plasticMaterial,
	{
		friction: 0,
		restitution: 1,
	}
);

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

// Sphere shape
// const sphereShape = new CANNON.Sphere(0.5);
// const sphereBody = new CANNON.Body({
// 	mass: 1,
// 	position: new CANNON.Vec3(0, 3, 0),
// 	shape: sphereShape,
// });

// Applying force
// sphereBody.applyLocalForce(
// 	new CANNON.Vec3(150, 300, 0), // Force vector
// 	new CANNON.Vec3(0, 0, 0) // Origin point (where the force is applied)
// );

// Add the sphere body to the physics world
// world.addBody(sphereBody);

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

const poolGreenMaterial = new THREE.MeshStandardMaterial({
	color: "#428F41",
	metalness: 0.3,
	roughness: 0.4,
	envMapIntensity: 0.5,
	// wireframe: true,
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

// floor.receiveShadow = true;
// floor.rotation.x = -Math.PI * 0.5;
// scene.add(floor);

/**
 * Lights
 */
const ambientLight = new THREE.AmbientLight(0xffffff, 2.1);
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
camera.position.set(-5, 5, 5);
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

function generateSphere(radius, position) {
	// ThreeJS mesh
	const mesh = new THREE.Mesh(sphereGeometry, objectMaterial);
	mesh.scale.setScalar(radius);
	mesh.castShadow = true;
	mesh.position.copy(position);
	scene.add(mesh);

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

	// Apply a random force to the sphere
	body.applyLocalForce(
		new CANNON.Vec3(-Math.random() * 400, 300, -Math.random() * 400), // Force vector
		new CANNON.Vec3(0, 0, 0) // Origin point (where the force is applied)
	);
	world.addBody(body);

	// Add to objects to update array
	objectsToUpdate.push({ mesh, body });
}

// Generate 10 spheres on page load with 1s interval between each
for (let i = 0; i < 12; i++) {
	setTimeout(() => {
		generateSphere(Math.random() + 0.25, {
			x: 5,
			y: 3,
			z: 5,
		});
	}, i * 500); // Each sphere generated 500ms after the previous one
}

/**
 * Generate boxes
 */

const boxGeometry = new THREE.BoxGeometry(1, 1, 1);

function generateBox(size, position) {
	// ThreeJS mesh
	const mesh = new THREE.Mesh(boxGeometry, objectMaterial);
	mesh.scale.setScalar(size);
	mesh.castShadow = true;
	mesh.position.copy(position);
	scene.add(mesh);

	// CANNON body
	const shape = new CANNON.Box(new CANNON.Vec3(size / 2, size / 2, size / 2));
	const body = new CANNON.Body({
		mass: 1,
		position: new CANNON.Vec3(position.x, position.y, position.z),
		shape: shape,
		material: defaultMaterial,
	});
	body.position.copy(position);
	body.addEventListener("collide", playCollisionSound);

	body.applyLocalForce(
		new CANNON.Vec3(Math.random() * 400, 300, Math.random() * 400), // Force vector
		new CANNON.Vec3(0, 0, 0) // Origin point (where the force is applied)
	);

	world.addBody(body);

	// Add to objects to update array
	objectsToUpdate.push({ mesh, body });
}
for (let i = 0; i < 12; i++) {
	setTimeout(() => {
		generateBox(Math.random() + 0.5, {
			x: -5,
			y: 3,
			z: -5,
		});
	}, i * 500); // Each sphere generated 500ms after the previous one
}

const axesHelper = new THREE.AxesHelper(5);
axesHelper.position.set(0, 0.1, 0); // Slightly above

/**
 * Animate
 */
// const clock = new THREE.Clock();
// let previousTime = 0;
const timer = new Timer();

const tick = () => {
	// const elapsedTime = clock.getElapsedTime();
	// const deltaTime = elapsedTime - previousTime;
	// previousTime = elapsedTime;

	// Timer
	timer.update();
	const elapsedTime = timer.getElapsed();

	// Wind
	// sphereBody.applyForce(
	// 	new CANNON.Vec3(-1, 0, 0), // Force vector
	// 	sphereBody.position // Origin point (where the force is applied)
	// );

	// Update physics world
	world.step(1 / 60, timer.getDelta(), 3);

	// Update 3D world
	// sphere.position.copy(sphereBody.position);

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
