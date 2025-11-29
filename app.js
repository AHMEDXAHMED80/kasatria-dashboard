// ============================================================
// GOOGLE SHEETS CONFIGURATION
// ============================================================
// 👉 PASTE YOUR SPREADSHEET ID HERE:
const SPREADSHEET_ID = '1YU0bPbBEUefVL73LAFTStTkDluLGgYkO8O4xETzdCTI';
// 👉 SPECIFY THE RANGE (e.g., 'sheet1!A2:F' to read from row 2 onwards)
// Reading up to row 200 to ensure we capture all data
const SHEET_RANGE = 'sheet1!A2:F200';

// Google API settings
// 👉 Get your API Key from Google Cloud Console:
// 1. Go to https://console.cloud.google.com/apis/credentials
// 2. Click "Create Credentials" > "API Key"
// 3. Restrict the key to "Google Sheets API" (recommended)
// 4. Also make sure your Google Sheet is PUBLIC or "Anyone with link can view"
const API_KEY = 'AIzaSyBmA5G3SnMQsF3I9nty9rf_WYm_04Pf0OU';
const DISCOVERY_DOCS = ['https://sheets.googleapis.com/$discovery/rest?version=v4'];
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets.readonly';

// ============================================================
// THREE.JS VARIABLES
// ============================================================
let camera, scene, renderer, controls;
const objects = [];
const targets = { table: [], sphere: [], helix: [], grid: [] };

// ============================================================
// GOOGLE AUTH & DATA LOADING
// ============================================================

/**
 * Called from index.html after successful Google login.
 * This function loads Sheet data and initializes the scene.
 */
async function startAppAfterLogin(googleCredential) {
  console.log('🔐 User logged in, credential:', googleCredential);
  
  try {
    // Fetch data from Google Sheets using public API
    const people = await fetchSheetData();
    
    console.log('📊 Loaded', people.length, 'people from Google Sheets');
    
    // Initialize the Three.js scene with the data
    initThreeScene(people);
    
  } catch (error) {
    console.error('❌ Error loading data:', error);
    
    // If Sheet fails, use dummy data so you can still test
    console.warn('⚠️ Using dummy data for testing...');
    const dummyPeople = [];
    for (let i = 0; i < 80; i++) {
      dummyPeople.push({
        name: 'Person ' + (i + 1),
        country: 'Country ' + ((i % 5) + 1),
        netWorth: 50000 + i * 5000
      });
    }
    initThreeScene(dummyPeople);
  }
}

/**
 * Fetch data from Google Sheets using public access
 * Make sure your sheet is published to the web or shared as "Anyone with the link can view"
 * Returns an array of person objects: { name, country, netWorth, ... }
 */
async function fetchSheetData() {
  try {
    // Using Google Sheets API v4 with public access
    // Format: https://sheets.googleapis.com/v4/spreadsheets/{spreadsheetId}/values/{range}
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_RANGE}?key=${API_KEY}`;
    
    console.log('📡 Fetching data from Google Sheets...');
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} - Make sure your sheet is public and API key is valid`);
    }
    
    const data = await response.json();
    const rows = data.values;
    
    if (!rows || rows.length === 0) {
      console.warn('⚠️ No data found in sheet');
      return [];
    }

    // Map rows to person objects
    // Columns: Name(A), Photo(B), Age(C), Country(D), Interest(E), NetWorth(F)
    const people = rows
      .filter(row => {
        // Only filter out completely empty rows (all cells empty)
        return row && row.length > 0 && row.some(cell => cell && cell.trim() !== '');
      })
      .map((row, index) => ({
        name: row[0] || `Person ${index + 1}`,
        photo: row[1] || '',
        age: row[2] || '',
        country: row[3] || 'Unknown',
        interest: row[4] || '',
        netWorth: parseFloat(row[5]?.replace(/[^0-9.,]/g, '').replace(/,/g, '')) || 0,
      }));

    console.log(`✅ Processed ${people.length} valid rows from sheet`);
    return people;
    
  } catch (error) {
    console.error('❌ Error fetching sheet data:', error);
    throw error;
  }
}

// ============================================================
// THREE.JS SCENE INITIALIZATION
// ============================================================

/**
 * Initialize the Three.js scene with person data
 */
function initThreeScene(people) {
  const container = document.getElementById('threejs-container');

  // CAMERA
  camera = new THREE.PerspectiveCamera(
    40,
    window.innerWidth / window.innerHeight,
    1,
    10000
  );
  camera.position.z = 3000;

  // SCENE
  scene = new THREE.Scene();

  // CREATE 3D TILES FOR EACH PERSON
  people.forEach((person, i) => {
    const element = createPersonTile(person, i);
    
    const objectCSS = new THREE.CSS3DObject(element);
    
    // Start at random positions
    objectCSS.position.x = Math.random() * 4000 - 2000;
    objectCSS.position.y = Math.random() * 4000 - 2000;
    objectCSS.position.z = Math.random() * 4000 - 2000;
    
    scene.add(objectCSS);
    objects.push(objectCSS);
  });

  // GENERATE LAYOUT TARGETS
  generateTableLayout(people.length);    // 20 x 10 grid
  generateSphereLayout(people.length);   // Sphere distribution
  generateHelixLayout(people.length);    // Double helix
  generateGridLayout(people.length);     // 5 x 4 x 10 grid

  // RENDERER
  renderer = new THREE.CSS3DRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  // CONTROLS
  controls = new THREE.TrackballControls(camera, renderer.domElement);
  controls.rotateSpeed = 0.5;
  controls.minDistance = 500;
  controls.maxDistance = 6000;
  controls.addEventListener('change', render);

  // CREATE UI BUTTONS
  createLayoutButtons();

  // WINDOW RESIZE
  window.addEventListener('resize', onWindowResize);

  // START WITH TABLE LAYOUT
  transform(targets.table, 2000);
  animate();
}

// ============================================================
// TILE CREATION
// ============================================================

/**
 * Create a styled tile (card) for a person
 */
function createPersonTile(person, index) {
  const element = document.createElement('div');
  element.className = 'element';
  
  // Base styling
  element.style.width = '140px';
  element.style.height = '180px';
  element.style.borderRadius = '12px';
  element.style.border = '1px solid #4e5b9a';
  element.style.boxShadow = '0 10px 25px rgba(0,0,0,0.6)';
  element.style.display = 'flex';
  element.style.flexDirection = 'column';
  element.style.alignItems = 'center';
  element.style.justifyContent = 'center';
  element.style.padding = '12px';
  element.style.boxSizing = 'border-box';
  element.style.fontFamily = 'system-ui, sans-serif';
  element.style.color = '#fff';
  element.style.cursor = 'pointer';
  element.style.transition = 'transform 0.2s';

  // ⭐ COLOR BY NET WORTH
  const worth = person.netWorth || 0;
  if (worth < 100000) {
    element.style.backgroundColor = '#d32f2f'; // Red
  } else if (worth < 200000) {
    element.style.backgroundColor = '#f57c00'; // Orange
  } else {
    element.style.backgroundColor = '#388e3c'; // Green
  }

  // Hover effect
  element.addEventListener('mouseenter', () => {
    element.style.transform = 'scale(1.05)';
  });
  element.addEventListener('mouseleave', () => {
    element.style.transform = 'scale(1)';
  });

  // NAME (large, bold)
  const nameDiv = document.createElement('div');
  nameDiv.textContent = person.name;
  nameDiv.style.fontWeight = 'bold';
  nameDiv.style.fontSize = '16px';
  nameDiv.style.marginBottom = '8px';
  nameDiv.style.textAlign = 'center';
  nameDiv.style.lineHeight = '1.2';
  element.appendChild(nameDiv);

  // COUNTRY
  const countryDiv = document.createElement('div');
  countryDiv.textContent = person.country;
  countryDiv.style.fontSize = '12px';
  countryDiv.style.marginBottom = '8px';
  countryDiv.style.opacity = '0.9';
  element.appendChild(countryDiv);

  // NET WORTH
  const worthDiv = document.createElement('div');
  worthDiv.textContent = '$' + worth.toLocaleString();
  worthDiv.style.fontSize = '14px';
  worthDiv.style.fontWeight = '600';
  worthDiv.style.marginTop = 'auto';
  element.appendChild(worthDiv);

  // Optional: Index number (for debugging)
  const indexDiv = document.createElement('div');
  indexDiv.textContent = '#' + (index + 1);
  indexDiv.style.fontSize = '10px';
  indexDiv.style.opacity = '0.6';
  indexDiv.style.marginTop = '4px';
  element.appendChild(indexDiv);

  return element;
}

// ============================================================
// LAYOUT GENERATORS
// ============================================================

/**
 * TABLE LAYOUT: Periodic table style (dynamic grid based on count)
 */
function generateTableLayout(count) {
  const cols = 20;
  const rows = Math.ceil(count / cols); // Dynamic rows based on actual count
  
  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    
    const target = new THREE.Object3D();
    target.position.x = (col - cols / 2) * 160;
    target.position.y = (rows / 2 - row) * 200;
    target.position.z = 0;
    
    targets.table.push(target);
  }
}

/**
 * SPHERE LAYOUT: Distribute on a sphere surface
 */
function generateSphereLayout(count) {
  const radius = 800;
  
  for (let i = 0; i < count; i++) {
    const phi = Math.acos(-1 + (2 * i) / count);
    const theta = Math.sqrt(count * Math.PI) * phi;
    
    const target = new THREE.Object3D();
    target.position.setFromSphericalCoords(radius, phi, theta);
    
    const vector = new THREE.Vector3();
    vector.copy(target.position).multiplyScalar(2);
    target.lookAt(vector);
    
    targets.sphere.push(target);
  }
}

/**
 * DOUBLE HELIX LAYOUT: Two intertwined helices
 */
function generateHelixLayout(count) {
  const radius = 600;
  const height = 1500;
  const turns = 5; // Number of full turns
  
  for (let i = 0; i < count; i++) {
    // Alternate between two helices
    const helixOffset = (i % 2) * Math.PI; // 180 degrees offset
    const t = i / count;
    
    const angle = t * turns * 2 * Math.PI + helixOffset;
    const y = (t - 0.5) * height;
    
    const target = new THREE.Object3D();
    target.position.x = radius * Math.cos(angle);
    target.position.y = y;
    target.position.z = radius * Math.sin(angle);
    
    targets.helix.push(target);
  }
}

/**
 * GRID LAYOUT: 5 x 4 x 10 (x, y, z)
 */
function generateGridLayout(count) {
  const gridX = 5;
  const gridY = 4;
  const gridZ = 10;
  const spacing = 200;
  
  for (let i = 0; i < count; i++) {
    const x = i % gridX;
    const y = Math.floor(i / gridX) % gridY;
    const z = Math.floor(i / (gridX * gridY)) % gridZ;
    
    const target = new THREE.Object3D();
    target.position.x = (x - gridX / 2) * spacing;
    target.position.y = (y - gridY / 2) * spacing;
    target.position.z = (z - gridZ / 2) * spacing;
    
    targets.grid.push(target);
  }
}

// ============================================================
// ANIMATION & LAYOUT SWITCHING
// ============================================================

/**
 * Animate transition to a target layout
 */
function transform(targetsArray, duration) {
  TWEEN.removeAll();

  objects.forEach((object, i) => {
    const target = targetsArray[i];
    if (!target) return;

    // Animate position
    new TWEEN.Tween(object.position)
      .to(
        {
          x: target.position.x,
          y: target.position.y,
          z: target.position.z
        },
        Math.random() * duration + duration
      )
      .easing(TWEEN.Easing.Exponential.InOut)
      .start();

    // Animate rotation
    new TWEEN.Tween(object.rotation)
      .to(
        {
          x: target.rotation.x,
          y: target.rotation.y,
          z: target.rotation.z
        },
        Math.random() * duration + duration
      )
      .easing(TWEEN.Easing.Exponential.InOut)
      .start();
  });

  new TWEEN.Tween({})
    .to({}, duration * 2)
    .onUpdate(render)
    .start();
}

// ============================================================
// UI CONTROLS
// ============================================================

/**
 * Create buttons to switch between layouts
 */
function createLayoutButtons() {
  const buttonContainer = document.createElement('div');
  buttonContainer.style.position = 'fixed';
  buttonContainer.style.top = '20px';
  buttonContainer.style.right = '20px';
  buttonContainer.style.display = 'flex';
  buttonContainer.style.gap = '10px';
  buttonContainer.style.zIndex = '1000';
  buttonContainer.style.flexDirection = 'column';

  const layouts = [
    { name: 'TABLE', target: targets.table },
    { name: 'SPHERE', target: targets.sphere },
    { name: 'HELIX', target: targets.helix },
    { name: 'GRID', target: targets.grid }
  ];

  layouts.forEach(layout => {
    const button = document.createElement('button');
    button.textContent = layout.name;
    button.style.padding = '12px 20px';
    button.style.fontSize = '14px';
    button.style.fontWeight = 'bold';
    button.style.border = 'none';
    button.style.borderRadius = '8px';
    button.style.background = '#4285f4';
    button.style.color = '#fff';
    button.style.cursor = 'pointer';
    button.style.transition = 'all 0.2s';
    button.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';

    button.addEventListener('mouseenter', () => {
      button.style.background = '#357ae8';
      button.style.transform = 'translateY(-2px)';
      button.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.background = '#4285f4';
      button.style.transform = 'translateY(0)';
      button.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
    });

    button.addEventListener('click', () => {
      transform(layout.target, 2000);
    });

    buttonContainer.appendChild(button);
  });

  document.body.appendChild(buttonContainer);
}

// ============================================================
// THREE.JS CORE FUNCTIONS
// ============================================================

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  render();
}

function animate() {
  requestAnimationFrame(animate);
  TWEEN.update();
  controls.update();
}

function render() {
  renderer.render(scene, camera);
}
