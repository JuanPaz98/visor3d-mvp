
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';

// Configuración inicial
const scene = new THREE.Scene();
scene.background = new THREE.Color("lightblue");
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(800, 500);
document.body.appendChild(renderer.domElement);


// Controles de órbita
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// Configuración de iluminación
function setupLights() {
    // Luz principal (sol)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 5);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    
    directionalLight.shadow.mapSize.width = 4096;
    directionalLight.shadow.mapSize.height = 4096;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -20;
    directionalLight.shadow.camera.right = 20;
    directionalLight.shadow.camera.top = 20;
    directionalLight.shadow.camera.bottom = -20;
    directionalLight.shadow.bias = -0.0001;
    
    scene.add(directionalLight);

    // Luz ambiental
    const ambientLight = new THREE.AmbientLight(0x404040, 10);
    scene.add(ambientLight);

}

// Configuración del suelo
function setupGround() {
    const groundGeometry = new THREE.PlaneGeometry(50, 50);
    const groundMaterial = new THREE.ShadowMaterial({ 
        opacity: 0.3,
        color: 0x111111
    });
    
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -2;
    ground.receiveShadow = true;
    scene.add(ground);
}

// Configuración del renderizador
function setupRenderer() {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.gammaOutput = true;
    renderer.gammaFactor = 2.2;
}

// Variables globales
let model = null;
let isAnimating = false;
let rotationSpeed = 0.01;

// Cargador de modelos
function loadModel(url, format) {
    const loader = format === 'stl' ? new STLLoader() : new PLYLoader();
    
    loader.load(url, (geometry) => {
        // Centrar la geometría
        geometry.computeBoundingBox();
        const center = geometry.boundingBox.getCenter(new THREE.Vector3());
        geometry.translate(-center.x, -center.y, -center.z);

        // Material mejorado para sombras
        const material = new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.4,
            metalness: 0.1,
            side: THREE.DoubleSide
        });

        // Crear malla del modelo
        model = new THREE.Mesh(geometry, material);
        model.castShadow = true;
        model.receiveShadow = true;
        scene.add(model);

        // Ajustar cámara al modelo
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3()).length();
        const center2 = box.getCenter(new THREE.Vector3());
        
        camera.position.copy(center2);
        camera.position.z += size * 1.5;
        controls.target.copy(center2);
        controls.update();
    }, undefined, (error) => {
        console.error('Error loading model:', error);
    });
}

// Interfaz de usuario
function setupUI() {
    const uiContainer = document.createElement('div');
    Object.assign(uiContainer.style, {
        position: 'absolute',
        top: '10px',
        left: '10px',
        background: 'rgba(43, 0, 255, 0.52)',
        padding: '10px',
        borderRadius: '5px',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
    });

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.stl,.ply';
    fileInput.style.padding = '8px';
    fileInput.style.cursor = 'pointer';
    uiContainer.appendChild(fileInput);

    document.body.appendChild(uiContainer);

    // Botón Play/Pause
    const playButton = document.createElement('button');
    playButton.innerText = 'Play';
    playButton.style.padding = '8px';
    playButton.style.cursor = 'pointer';
    playButton.onclick = () => {
        isAnimating = !isAnimating;
        playButton.innerText = isAnimating ? 'Pause' : 'Play';
    };
    uiContainer.appendChild(playButton);

    // Control de velocidad
    const speedSlider = document.createElement('input');
    speedSlider.type = 'range';
    speedSlider.min = '0';
    speedSlider.max = '0.1';
    speedSlider.step = '0.005';
    speedSlider.value = rotationSpeed;
    speedSlider.oninput = (e) => rotationSpeed = parseFloat(e.target.value);
    uiContainer.appendChild(speedSlider);

    // Botón de reinicio
    const resetButton = document.createElement('button');
    resetButton.innerText = 'Reset';
    resetButton.style.padding = '8px';
    resetButton.style.cursor = 'pointer';
    resetButton.onclick = () => {
        if (model) {
            model.rotation.set(0, 0, 0);
            rotationSpeed = 0.01;
            speedSlider.value = rotationSpeed;
        }
    };
    uiContainer.appendChild(resetButton);

    manageUploadFile(fileInput);
}

// Bucle de animación
function animate() {
    requestAnimationFrame(animate);
    
    if (isAnimating && model) {
        model.rotation.y += rotationSpeed;
    }

    controls.update();
    renderer.render(scene, camera);
}

// Inicialización
function init() {
    setupGround();
    setupRenderer();
    setupUI();
    setupLights();
    
    // Posición inicial de cámara
    camera.position.set(3, 3, 8);
    
    // Iniciar animación
    animate();
}

// Manejo de redimensionamiento
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});



// 🚨 Eliminar modelo anterior (si hay uno)
function clearModel() {
    if (model) {
        scene.remove(model);
        model.geometry.dispose();
        if (model.material) model.material.dispose();
        model = null;
    }
}

// 🧠 Detectar tipo de archivo por extensión
function getFileFormat(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    return ext === 'stl' || ext === 'ply' ? ext : null;
}

// 📥 Manejar subida de archivo
function manageUploadFile(fileInput) {
    fileInput.addEventListener('change', (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
    
        const format = getFileFormat(file.name);
        if (!format) {
            alert("Solo se permiten archivos STL o PLY");
            return;
        }
    
        const reader = new FileReader();
        reader.onload = (e) => {
            const buffer = e.target?.result;
            if (!buffer) return;
    
            clearModel(); // Quitar el modelo anterior
    
            if (format === 'stl') {
                const loader = new STLLoader();
                const geometry = loader.parse(buffer);
                geometry.computeVertexNormals();
                const material = new THREE.MeshStandardMaterial({
                    color: 0xcccccc,
                    metalness: 0.2,
                    roughness: 0.3
                });
                model = new THREE.Mesh(geometry, material);
            } else if (format === 'ply') {
                const loader = new PLYLoader();
                const geometry = loader.parse(buffer);
                geometry.computeVertexNormals();
                const material = new THREE.MeshStandardMaterial({
                    vertexColors: true,
                    // color: 0xcccccc,
                    metalness: 0.2,
                    roughness: 0.3
                });
                model = new THREE.Mesh(geometry, material);
            }
    
            if (model) {
                model.position.set(0, -1, 0);
                model.castShadow = true;
                model.receiveShadow = true;
                scene.add(model);
    
                // Ajustar cámara al nuevo modelo
                const box = new THREE.Box3().setFromObject(model);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3()).length();
    
                camera.position.copy(center);
                camera.position.z += size / 1.5;
                controls.target.copy(center);
                controls.update();
            }
        };
    
        reader.readAsArrayBuffer(file);
    });
}

// Iniciar la aplicación
init();