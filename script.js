// ============================
// 1. Variables globales
// ============================
const canvas = document.getElementById('mapCanvas');
const ctx = canvas.getContext('2d');

// Paramètres
const canvasWidthInput  = document.getElementById('canvasWidth');
const canvasHeightInput = document.getElementById('canvasHeight');

const seedInput               = document.getElementById('seedInput');
const randomSeedBtn           = document.getElementById('randomSeedBtn');
const scaleSlider             = document.getElementById('scale');
const scaleValue              = document.getElementById('scaleValue');
const octavesSlider           = document.getElementById('octaves');
const octavesValue            = document.getElementById('octavesValue');
const persistenceSlider       = document.getElementById('persistence');
const persistenceValue        = document.getElementById('persistenceValue');
const continentCountSlider    = document.getElementById('continentCount');
const continentCountValue     = document.getElementById('continentCountValue');
const maskStrengthSlider      = document.getElementById('maskStrength');
const maskStrengthValue       = document.getElementById('maskStrengthValue');
const continentDensitySlider  = document.getElementById('continentDensity');
const continentDensityValue   = document.getElementById('continentDensityValue');
const continentScaleSlider    = document.getElementById('continentScale');
const continentScaleValue     = document.getElementById('continentScaleValue');

const shapeScaleSlider        = document.getElementById('shapeScale');
const shapeScaleValue         = document.getElementById('shapeScaleValue');
const shapeIntensitySlider    = document.getElementById('shapeIntensity');
const shapeIntensityValue     = document.getElementById('shapeIntensityValue');
const warpAmplitudeSlider     = document.getElementById('warpAmplitude');
const warpAmplitudeValue      = document.getElementById('warpAmplitudeValue');
const ridgedFactorSlider      = document.getElementById('ridgedFactor');
const ridgedFactorValue       = document.getElementById('ridgedFactorValue');

const generateBtn             = document.getElementById('generateBtn');
const randomAllBtn            = document.getElementById('randomAllBtn');

// Édition
const editModeSelect          = document.getElementById('editMode');
const brushRadiusSlider       = document.getElementById('brushRadius');
const brushRadiusValue        = document.getElementById('brushRadiusValue');
const brushIntensitySlider    = document.getElementById('brushIntensity');
const brushIntensityValue     = document.getElementById('brushIntensityValue');
const brushNoiseScaleSlider   = document.getElementById('brushNoiseScale');
const brushNoiseScaleValue    = document.getElementById('brushNoiseScaleValue');

// Données
let mapWidth  = 500;
let mapHeight = 500;
let mapHeightData = [];
let mapTempData   = [];
let mapWetData    = [];

// Bruits
let noiseHeight, noiseTemp, noiseWet;
let shapeNoise, warpNoiseX, warpNoiseY;

// Buffer pixel pour l'affichage (ImageData)
let mapImageData = null; // === OPTIMISATION ===

// Pinceau de bruit
let brushNoise = null;

// Suivi de la souris
let currentMouseX = -9999;
let currentMouseY = -9999;
let isMouseDown = false;

// ============================
// 2. Fonctions utilitaires
// ============================
function updateSliderDisplays() {
    scaleValue.textContent           = scaleSlider.value;
    octavesValue.textContent         = octavesSlider.value;
    persistenceValue.textContent     = persistenceSlider.value;
    continentCountValue.textContent  = continentCountSlider.value;
    maskStrengthValue.textContent    = maskStrengthSlider.value;
    continentDensityValue.textContent= continentDensitySlider.value;
    continentScaleValue.textContent  = continentScaleSlider.value;

    shapeScaleValue.textContent      = shapeScaleSlider.value;
    shapeIntensityValue.textContent  = shapeIntensitySlider.value;
    warpAmplitudeValue.textContent   = warpAmplitudeSlider.value;
    ridgedFactorValue.textContent    = ridgedFactorSlider.value;

    brushRadiusValue.textContent     = brushRadiusSlider.value;
    brushIntensityValue.textContent  = brushIntensitySlider.value;
    brushNoiseScaleValue.textContent = brushNoiseScaleSlider.value;
}
[
    scaleSlider, octavesSlider, persistenceSlider, continentCountSlider,
    maskStrengthSlider, continentDensitySlider, continentScaleSlider,
    shapeScaleSlider, shapeIntensitySlider, warpAmplitudeSlider,
    ridgedFactorSlider, brushRadiusSlider, brushIntensitySlider,
    brushNoiseScaleSlider
].forEach(sl => sl.addEventListener('input', updateSliderDisplays));

function clamp(v, min, max) {
    return v < min ? min : (v > max ? max : v);
}

function randomIntInRange(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randomFloatInRange(min, max, step = 1) {
    const range = (max - min) / step;
    const rnd = Math.floor(Math.random() * (range + 1));
    return min + rnd * step;
}

// ============================
// 3. getBiomeColor => (r,g,b)
// ============================
function getBiomeColor(h, t, w) {
    if (h < 0.35) {
        if (h > 0.25) return '#4F94D4';
        return '#1E90FF';
    }
    if (h < 0.4) {
        if (t < 0.4) return '#8D8D8D';
        else return '#E2C6A1';
    }
    if (h > 0.75) {
        if (t < 0.4) return '#FFFFFF';
        return '#696969';
    }
    if (t < 0.2) {
        if (w > 0.5) return '#A2B578';
        else return '#D9ECC7';
    }
    if (t < 0.4) {
        if (w > 0.5) return '#228B22';
        else return '#A2B578';
    }
    if (t < 0.6) {
        if (w < 0.3) return '#F0E68C';
        else if (w < 0.6) return '#7CFC00';
        else return '#006400';
    }
    if (t < 0.8) {
        if (w < 0.3) return '#EDC9AF';
        else if (w < 0.6) return '#6B8E23';
        else return '#228B22';
    }
    if (w < 0.3) return '#C2B280';
    return '#2E8B57';
}

// Convertit un code hex (“#rrggbb”) en (r,g,b)
function hexToRgb(hex) {
    const c = parseInt(hex.slice(1), 16); // enlève le '#'
    const r = (c >> 16) & 255;
    const g = (c >> 8) & 255;
    const b = c & 255;
    return [r, g, b];
}

// ============================
// 4. multiOctaveNoise
// ============================
function multiOctaveNoise(noiseObj, x, y, octaves, persistence, scale, ridgedFactor=0) {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
        let noiseValue = noiseObj.noise2D((x * frequency) / scale, (y * frequency) / scale);
        if (ridgedFactor > 0) {
            const ridgedVal = 1 - Math.abs(noiseValue);
            noiseValue = (1 - ridgedFactor)*noiseValue + ridgedFactor*ridgedVal;
        }
        total += noiseValue * amplitude;
        maxValue += amplitude;
        amplitude *= persistence;
        frequency *= 2;
    }
    return (total / maxValue + 1) / 2;
}

// ============================
// 5. warpMask
// ============================
function radialMaskForCenter(
    x, y,
    centerX, centerY,
    width, height,
    maskStrength,
    continentScaleUI,
    shapeScale, shapeIntensity,
    warpAmplitude,
    ridgedFactor
) {
    const nx = warpNoiseX.noise2D(x / 100, y / 100);
    const ny = warpNoiseY.noise2D(x / 100, y / 100);
    const warpX = x + nx * warpAmplitude;
    const warpY = y + ny * warpAmplitude;

    const scaleFactor = 0.03 * continentScaleUI;
    const dx = warpX - centerX;
    const dy = warpY - centerY;
    const dist = Math.sqrt(dx*dx + dy*dy);

    const maxDist = Math.sqrt(width*width + height*height) * scaleFactor;
    let m = 1 - dist / maxDist;

    if (shapeIntensity > 0) {
        let sv = shapeNoise.noise2D(warpX / shapeScale, warpY / shapeScale);
        if (ridgedFactor > 0) {
            const rv = 1 - Math.abs(sv);
            sv = (1 - ridgedFactor)*sv + ridgedFactor*rv;
        }
        const svNorm = (sv + 1)/2;
        m += svNorm * shapeIntensity;
    }

    if (m < 0) m = 0;
    if (m > 1) m = 1;
    return Math.pow(m, maskStrength);
}

function warpMask(
    x, y,
    centers,
    maskStrength,
    continentScale,
    shapeScale, shapeIntensity,
    warpAmplitude, ridgedFactor
) {
    let best = 0;
    for (const c of centers) {
        const val = radialMaskForCenter(
            x, y, c.x, c.y,
            mapWidth, mapHeight,
            maskStrength,
            continentScale,
            shapeScale, shapeIntensity,
            warpAmplitude,
            ridgedFactor
        );
        if (val > best) {
            best = val;
        }
    }
    return best;
}

// ============================
// 6. Génération de la carte
// ============================
function generateMap() {
    mapWidth  = parseInt(canvasWidthInput.value, 10);
    mapHeight = parseInt(canvasHeightInput.value, 10);

    canvas.width  = mapWidth;
    canvas.height = mapHeight;

    const seed            = seedInput.value || 'ma_seed';
    const scale           = parseFloat(scaleSlider.value);
    const octaves         = parseInt(octavesSlider.value);
    const persistence     = parseFloat(persistenceSlider.value);
    const nbContinents    = parseInt(continentCountSlider.value);
    const maskStrength    = parseFloat(maskStrengthSlider.value);
    const density         = parseFloat(continentDensitySlider.value);
    const continentScaleUI= parseFloat(continentScaleSlider.value);

    const shapeScale      = parseFloat(shapeScaleSlider.value);
    const shapeIntensity  = parseFloat(shapeIntensitySlider.value);
    const warpAmplitude   = parseFloat(warpAmplitudeSlider.value);
    const ridgedFactor    = parseFloat(ridgedFactorSlider.value);

    // Instanciation des bruits
    noiseHeight = new SimplexNoise(seed + '_H');
    noiseTemp   = new SimplexNoise(seed + '_T');
    noiseWet    = new SimplexNoise(seed + '_W');
    shapeNoise  = new SimplexNoise(seed + '_S');
    warpNoiseX  = new SimplexNoise(seed + '_WX');
    warpNoiseY  = new SimplexNoise(seed + '_WY');

    // Centres
    const centers = [];
    for (let i = 0; i < nbContinents; i++) {
        centers.push({
            x: Math.random() * mapWidth,
            y: Math.random() * mapHeight
        });
    }

    // Tableaux 2D
    mapHeightData = Array.from({ length: mapWidth }, () => new Array(mapHeight));
    mapTempData   = Array.from({ length: mapWidth }, () => new Array(mapHeight));
    mapWetData    = Array.from({ length: mapWidth }, () => new Array(mapHeight));

    // Remplissage des data
    for (let x = 0; x < mapWidth; x++) {
        for (let y = 0; y < mapHeight; y++) {
            let hVal = multiOctaveNoise(noiseHeight, x, y, octaves, persistence, scale, ridgedFactor);
            let tVal = multiOctaveNoise(noiseTemp,   x, y, octaves, persistence, scale, ridgedFactor);
            let wVal = multiOctaveNoise(noiseWet,    x, y, octaves, persistence, scale, ridgedFactor);

            const maskVal = warpMask(
                x, y,
                centers,
                maskStrength,
                continentScaleUI,
                shapeScale, shapeIntensity,
                warpAmplitude,
                ridgedFactor
            );

            hVal *= maskVal;
            hVal += density * maskVal * 0.2;

            const latFactor = 1 - Math.abs(y - mapHeight/2) / (mapHeight/2);
            tVal *= (0.5 + 0.5 * latFactor);
            tVal *= (1 - hVal * 0.4);

            mapHeightData[x][y] = hVal;
            mapTempData[x][y]   = tVal;
            mapWetData[x][y]    = wVal;
        }
    }

    // === OPTIMISATION ===
    // Création d'un ImageData pour stocker le RGBA
    mapImageData = ctx.createImageData(mapWidth, mapHeight);

    // Remplir l'ImageData avec les couleurs
    computeMapImageData();
    // Afficher
    ctx.putImageData(mapImageData, 0, 0);
}

// ============================
// 7. Construction ImageData
// ============================
function computeMapImageData() {
    const data = mapImageData.data;
    let idx = 0; // index RGBA
    for (let y = 0; y < mapHeight; y++) {
        for (let x = 0; x < mapWidth; x++) {
            const hVal = mapHeightData[x][y];
            const tVal = mapTempData[x][y];
            const wVal = mapWetData[x][y];

            // Récupère la couleur hex
            const hex = getBiomeColor(hVal, tVal, wVal);
            const [r, g, b] = hexToRgb(hex);

            data[idx++] = r;   // R
            data[idx++] = g;   // G
            data[idx++] = b;   // B
            data[idx++] = 255; // A (opaque)
        }
    }
}

// Met à jour UN pixel dans l'imageData
function updatePixelInImageData(x, y) {
    const i = (y * mapWidth + x) * 4;
    const hVal = mapHeightData[x][y];
    const tVal = mapTempData[x][y];
    const wVal = mapWetData[x][y];

    const hex = getBiomeColor(hVal, tVal, wVal);
    const [r, g, b] = hexToRgb(hex);

    mapImageData.data[i + 0] = r;
    mapImageData.data[i + 1] = g;
    mapImageData.data[i + 2] = b;
    mapImageData.data[i + 3] = 255;
}

// ============================
// 8. Dessiner le pinceau
// ============================
function drawBrushCursor(x, y, radius) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    ctx.stroke();
}

// ============================
// 9. Gestion souris
// ============================
canvas.addEventListener('mousedown', onMouseDown);
canvas.addEventListener('mousemove', onMouseMove);
canvas.addEventListener('mouseup',   onMouseUp);
canvas.addEventListener('mouseleave', onMouseLeave);

function onMouseDown(e) {
    isMouseDown = true;
    if (editModeSelect.value === 'noiseBrush') {
        const noiseSeed = Math.random().toString(36).substring(2, 10);
        brushNoise = new SimplexNoise(noiseSeed);
    }
    applyBrushAtMouse(e);
}

function onMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    currentMouseX = e.clientX - rect.left;
    currentMouseY = e.clientY - rect.top;

    if (isMouseDown) {
        applyBrushAtMouse(e);
    } else {
        // On réaffiche l'image data pour effacer l'ancien cercle
        ctx.putImageData(mapImageData, 0, 0);
    }

    // Dessine le cercle
    const radius = parseInt(brushRadiusSlider.value);
    drawBrushCursor(currentMouseX, currentMouseY, radius);
}

function onMouseUp(e) {
    isMouseDown = false;
    if (editModeSelect.value === 'noiseBrush') {
        brushNoise = null;
    }
}

function onMouseLeave(e) {
    isMouseDown = false;
    // On réaffiche l'image data pour virer le cercle
    ctx.putImageData(mapImageData, 0, 0);
}

// ============================
// 9.1 Application du pinceau
// ============================
function applyBrushAtMouse(e) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const mode         = editModeSelect.value;
    const radius       = parseInt(brushRadiusSlider.value);
    const intensity    = parseFloat(brushIntensitySlider.value);
    const noiseScale   = parseFloat(brushNoiseScaleSlider.value);

    const rSquared = radius * radius;

    for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
            const nx = Math.floor(mouseX + dx);
            const ny = Math.floor(mouseY + dy);
            if (nx < 0 || nx >= mapWidth || ny < 0 || ny >= mapHeight) continue;
            if (dx*dx + dy*dy <= rSquared) {
                applyEdit(nx, ny, mode, intensity, noiseScale);
                // On met à jour 1 pixel dans l'ImageData
                updatePixelInImageData(nx, ny);
            }
        }
    }
    // On rafraîchit l'affichage => putImageData
    ctx.putImageData(mapImageData, 0, 0);

    // Puis on dessine le cercle
    drawBrushCursor(mouseX, mouseY, radius);
}

// ============================
// 10. Application du mode
// ============================
function applyEdit(x, y, mode, amount, noiseScale) {
    if (mode === 'heightUp') {
        mapHeightData[x][y] = clamp(mapHeightData[x][y] + amount, 0, 1);
    }
    else if (mode === 'heightDown') {
        mapHeightData[x][y] = clamp(mapHeightData[x][y] - amount, 0, 1);
    }
    else if (mode === 'tempUp') {
        mapTempData[x][y] = clamp(mapTempData[x][y] + amount, 0, 1);
    }
    else if (mode === 'tempDown') {
        mapTempData[x][y] = clamp(mapTempData[x][y] - amount, 0, 1);
    }
    else if (mode === 'wetUp') {
        mapWetData[x][y] = clamp(mapWetData[x][y] + amount, 0, 1);
    }
    else if (mode === 'wetDown') {
        mapWetData[x][y] = clamp(mapWetData[x][y] - amount, 0, 1);
    }
    else if (mode === 'noiseBrush' && brushNoise) {
        let val = brushNoise.noise2D(x / noiseScale, y / noiseScale);
        let delta = val * amount;
        mapHeightData[x][y] = clamp(mapHeightData[x][y] + delta, 0, 1);
    }
}

// ============================
// 11. Boutons
// ============================
randomSeedBtn.addEventListener('click', () => {
    const newSeed = Math.random().toString(36).substring(2, 10);
    seedInput.value = 'seed_' + newSeed;
});

generateBtn.addEventListener('click', () => {
    updateSliderDisplays();
    generateMap();
});

randomAllBtn.addEventListener('click', () => {
    // Génération aléatoire
    seedInput.value             = 'seed_' + Math.random().toString(36).substring(2,10);
    scaleSlider.value           = randomIntInRange(20, 300);
    octavesSlider.value         = randomIntInRange(1, 8);
    persistenceSlider.value     = randomFloatInRange(0.1, 0.9, 0.1);
    continentCountSlider.value  = randomIntInRange(1, 5);
    maskStrengthSlider.value    = randomFloatInRange(0.1, 3, 0.1);
    continentDensitySlider.value= randomFloatInRange(0, 2, 0.1);
    continentScaleSlider.value  = randomIntInRange(1, 100);

    shapeScaleSlider.value      = randomIntInRange(10, 300);
    shapeIntensitySlider.value  = (Math.random()).toFixed(2);
    warpAmplitudeSlider.value   = randomIntInRange(0, 200);
    ridgedFactorSlider.value    = (Math.random()).toFixed(1);

    updateSliderDisplays();
    generateMap();
});

// ============================
// 12. Onload
// ============================
window.onload = () => {
    updateSliderDisplays();
    generateMap();
};
