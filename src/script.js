import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import GUI from "lil-gui";
import CANNON from "cannon";
import { Timer } from "three/examples/jsm/Addons.js";

/**
 * Debug
 */
const gui = new GUI();

/**
 * Base
 */
// Canvas
const canvas = document.querySelector("canvas.webgl");

// Scene
const scene = new THREE.Scene();

/**
 * Textures
 */
const textureLoader = new THREE.TextureLoader();
const cubeTextureLoader = new THREE.CubeTextureLoader();

const environmentMapTexture = cubeTextureLoader.load([
	"/textures/environmentMaps/0/px.png",
	"/textures/environmentMaps/0/nx.png",
	"/textures/environmentMaps/0/py.png",
	"/textures/environmentMaps/0/ny.png",
	"/textures/environmentMaps/0/pz.png",
	"/textures/environmentMaps/0/nz.png",
]);

/**
 * Physics
 */
const world = new CANNON.World();
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
		friction: 0.1,
		restitution: 0.66, // bounciness
	}
);

// Add the contact material to the world
world.addContactMaterial(defaultContactMaterial);
// Set the default contact material to all bodies that do not have a specific contact material defined
world.defaultContactMaterial = defaultContactMaterial;

// Sphere shape
const sphereShape = new CANNON.Sphere(0.5);
const sphereBody = new CANNON.Body({
	mass: 1,
	position: new CANNON.Vec3(0, 3, 0),
	shape: sphereShape,
});

// Applying force
sphereBody.applyLocalForce(
	new CANNON.Vec3(150, 300, 0), // Force vector
	new CANNON.Vec3(0, 0, 0) // Origin point (where the force is applied)
);

// Add the sphere body to the physics world
world.addBody(sphereBody);

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

/**
 *  Test sphere
 */
const sphere = new THREE.Mesh(
	new THREE.SphereGeometry(0.5, 32, 32),
	new THREE.MeshStandardMaterial({
		metalness: 0.3,
		roughness: 0.4,
		envMap: environmentMapTexture,
		envMapIntensity: 0.5,
	})
);
sphere.castShadow = true;
sphere.position.y = 0.5;
scene.add(sphere);

/**
 * Floor
 */
const floor = new THREE.Mesh(
	new THREE.PlaneGeometry(10, 10),
	new THREE.MeshStandardMaterial({
		color: "#777777",
		metalness: 0.3,
		roughness: 0.4,
		envMap: environmentMapTexture,
		envMapIntensity: 0.5,
	})
);
floor.receiveShadow = true;
floor.rotation.x = -Math.PI * 0.5;
scene.add(floor);

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
	sphereBody.applyForce(
		new CANNON.Vec3(-0.5, 0, 0), // Force vector
		sphereBody.position // Origin point (where the force is applied)
	);

	// Update physics world
	world.step(1 / 60, timer.getDelta(), 3);

	// Update 3D world
	sphere.position.copy(sphereBody.position);

	// Update controls
	controls.update();

	// Render
	renderer.render(scene, camera);

	// Call tick again on the next frame
	window.requestAnimationFrame(tick);
};

tick();
