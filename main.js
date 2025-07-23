// main.js - Pixel Art CRDT avec Yjs
import * as Y from 'yjs'
import { WebrtcProvider } from 'y-webrtc'
import { IndexeddbPersistence } from 'y-indexeddb'

// Configuration
const GRID_SIZE = 16
const COLORS = [
  '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
  '#FFFF00', '#FF00FF', '#00FFFF', '#FF8800', '#8800FF',
  '#88FF00', '#FF0088', '#0088FF', '#666666', '#AAAAAA'
]

// État global
let ydoc = null
let provider = null
let persistence = null
let pixelMap = null
let awareness = null
let selectedColor = COLORS[2] // Rouge par défaut
let room = null

// Métriques
const metrics = {
  operations: 0,
  lastSyncTime: Date.now()
}

// Initialisation au chargement
document.addEventListener('DOMContentLoaded', () => {
  initColorPalette()
  initPixelGrid()
  setupEventListeners()
  
  // Debug info
  updateDebugInfo()
  setInterval(updateDebugInfo, 1000)
})

// Initialiser la palette de couleurs
function initColorPalette() {
  const palette = document.getElementById('colorPalette')
  
  COLORS.forEach((color, index) => {
    const colorBtn = document.createElement('button')
    colorBtn.className = 'color-btn'
    colorBtn.style.backgroundColor = color
    colorBtn.title = color
    
    if (index === 2) colorBtn.classList.add('selected')
    
    colorBtn.addEventListener('click', () => {
      selectedColor = color
      document.querySelectorAll('.color-btn').forEach(btn => {
        btn.classList.remove('selected')
      })
      colorBtn.classList.add('selected')
    })
    
    palette.appendChild(colorBtn)
  })
}

// Initialiser la grille de pixels
function initPixelGrid() {
  const canvas = document.getElementById('pixelCanvas')
  canvas.style.gridTemplateColumns = `repeat(${GRID_SIZE}, 1fr)`
  canvas.innerHTML = ''
  
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const pixel = document.createElement('div')
      pixel.className = 'pixel'
      pixel.dataset.x = x
      pixel.dataset.y = y
      pixel.addEventListener('click', () => paintPixel(x, y))
      canvas.appendChild(pixel)
    }
  }
}

// Event listeners
function setupEventListeners() {
  document.getElementById('connectBtn').addEventListener('click', connect)
  document.getElementById('disconnectBtn').addEventListener('click', disconnect)
  document.getElementById('clearBtn').addEventListener('click', clearCanvas)
  
  // Enter pour se connecter
  document.getElementById('roomInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') connect()
  })
}

// Connexion à une room
async function connect() {
  const roomName = document.getElementById('roomInput').value.trim()
  if (!roomName) {
    alert('Entre un nom de room !')
    return
  }
  
  room = roomName
  console.log(`🚀 Connexion à la room: ${room}`)
  
  // Créer le document Yjs
  ydoc = new Y.Doc()
  
  // Map CRDT pour les pixels
  pixelMap = ydoc.getMap('pixels')
  
  // Observer les changements
  pixelMap.observe(handlePixelChanges)
  
  // Persistance locale avec IndexedDB
  persistence = new IndexeddbPersistence(room, ydoc)
  persistence.on('synced', () => {
    console.log('💾 Persistance locale synchronisée')
  })
  
  // Provider WebRTC pour P2P
  provider = new WebrtcProvider(room, ydoc, {
    signaling: [
      'wss://signaling.yjs.dev',
      'wss://y-webrtc-signaling-eu.herokuapp.com',
      'wss://y-webrtc-signaling-us.herokuapp.com'
    ],
    password: null,
    maxConns: 20,
    filterBcConns: true,
    peerOpts: {} // Options WebRTC
  })
  
  awareness = provider.awareness
  
  // Observer l'awareness (présence)
  awareness.on('change', updatePeersCount)
  
  // Observer la synchronisation
  provider.on('synced', (synced) => {
    updateConnectionStatus(synced)
    console.log('🔄 État de synchronisation:', synced)
  })
  
  // Charger les pixels existants
  renderAllPixels()
  
  // Mettre à jour l'UI
  document.getElementById('connectBtn').disabled = true
  document.getElementById('disconnectBtn').disabled = false
  updateConnectionStatus(false)
}

// Déconnexion
function disconnect() {
  console.log('👋 Déconnexion...')
  
  if (provider) {
    provider.destroy()
    provider = null
  }
  
  if (persistence) {
    persistence.destroy()
    persistence = null
  }
  
  if (ydoc) {
    ydoc.destroy()
    ydoc = null
  }
  
  pixelMap = null
  awareness = null
  room = null
  
  // Reset UI
  initPixelGrid()
  document.getElementById('connectBtn').disabled = false
  document.getElementById('disconnectBtn').disabled = true
  updateConnectionStatus(null)
  document.getElementById('peersCount').textContent = '👥 0 peers'
  document.getElementById('pixelsCount').textContent = '🎨 0 pixels'
}

// Peindre un pixel
function paintPixel(x, y) {
  if (!pixelMap) {
    alert('Connecte-toi d\'abord !')
    return
  }
  
  const key = `${x},${y}`
  
  // Transaction CRDT
  ydoc.transact(() => {
    pixelMap.set(key, {
      color: selectedColor,
      author: awareness.clientID,
      timestamp: Date.now()
    })
  }, 'local') // Origin de la transaction
  
  metrics.operations++
  console.log(`🎨 Pixel peint: ${key} -> ${selectedColor}`)
}

// Gérer les changements de pixels
function handlePixelChanges(event, transaction) {
  console.log('📝 Changements CRDT:', event)
  
  // Mettre à jour seulement les pixels qui ont changé
  event.keysChanged.forEach(key => {
    const pixelData = pixelMap.get(key)
    if (pixelData) {
      const [x, y] = key.split(',').map(Number)
      updatePixelDisplay(x, y, pixelData)
    }
  })
  
  // Mettre à jour les métriques
  metrics.lastSyncTime = Date.now()
  updatePixelsCount()
  
  // Log l'origine de la transaction
  if (transaction.origin) {
    console.log(`📍 Origine: ${transaction.origin}`)
  }
}

// Mettre à jour l'affichage d'un pixel
function updatePixelDisplay(x, y, pixelData) {
  const pixel = document.querySelector(`[data-x="${x}"][data-y="${y}"]`)
  if (pixel && pixelData) {
    pixel.style.backgroundColor = pixelData.color
    pixel.classList.add('pixel-animated')
    setTimeout(() => pixel.classList.remove('pixel-animated'), 300)
  }
}

// Afficher tous les pixels
function renderAllPixels() {
  if (!pixelMap) return
  
  pixelMap.forEach((pixelData, key) => {
    const [x, y] = key.split(',').map(Number)
    updatePixelDisplay(x, y, pixelData)
  })
  
  updatePixelsCount()
}

// Effacer le canvas
function clearCanvas() {
  if (!pixelMap) return
  
  if (confirm('Effacer tout le dessin ?')) {
    ydoc.transact(() => {
      pixelMap.clear()
    }, 'clear')
    
    initPixelGrid()
    console.log('🗑️ Canvas effacé')
  }
}

// Mises à jour UI
function updateConnectionStatus(synced) {
  const status = document.getElementById('connectionStatus')
  if (synced === null) {
    status.textContent = '🔴 Déconnecté'
    status.className = 'status-disconnected'
  } else if (synced) {
    status.textContent = '🟢 Connecté'
    status.className = 'status-connected'
  } else {
    status.textContent = '🟡 Synchronisation...'
    status.className = 'status-syncing'
  }
}

function updatePeersCount() {
  if (!awareness) return
  
  const states = awareness.getStates()
  const peersCount = states.size - 1 // -1 pour ne pas se compter
  document.getElementById('peersCount').textContent = `👥 ${peersCount} peers`
}

function updatePixelsCount() {
  if (!pixelMap) return
  
  const count = pixelMap.size
  document.getElementById('pixelsCount').textContent = `🎨 ${count} pixels`
}

function updateDebugInfo() {
  const debugDiv = document.getElementById('debugInfo')
  
  if (!ydoc) {
    debugDiv.textContent = 'Document non initialisé'
    return
  }
  
  // Calculer la taille du document
  const state = Y.encodeStateAsUpdate(ydoc)
  const sizeKB = (state.byteLength / 1024).toFixed(2)
  document.getElementById('docSize').textContent = `📄 ${sizeKB} KB`
  
  // Info debug
  const debugInfo = {
    'Room': room || 'Non connecté',
    'Client ID': ydoc.clientID,
    'Doc GUID': ydoc.guid,
    'Operations': metrics.operations,
    'Pixels': pixelMap ? pixelMap.size : 0,
    'Doc Size': `${sizeKB} KB`,
    'Last Sync': new Date(metrics.lastSyncTime).toLocaleTimeString()
  }
  
  debugDiv.textContent = JSON.stringify(debugInfo, null, 2)
}

// Exposer des fonctions pour le debug
window.crdtDebug = {
  getDoc: () => ydoc,
  getPixels: () => pixelMap ? pixelMap.toJSON() : null,
  getState: () => ydoc ? Y.encodeStateAsUpdate(ydoc) : null,
  getHistory: () => {
    if (!ydoc) return null
    const state = Y.encodeStateAsUpdate(ydoc)
    return {
      size: state.byteLength,
      pixels: pixelMap ? pixelMap.size : 0,
      clients: awareness ? awareness.getStates().size : 0
    }
  },
  // Simuler des changements concurrents
  simulateConcurrent: () => {
    if (!pixelMap) return
    
    console.log('🔀 Simulation de changements concurrents...')
    
    // Changements rapides sur le même pixel
    const x = Math.floor(Math.random() * GRID_SIZE)
    const y = Math.floor(Math.random() * GRID_SIZE)
    const key = `${x},${y}`
    
    // Changement 1
    setTimeout(() => {
      ydoc.transact(() => {
        pixelMap.set(key, {
          color: '#FF0000',
          author: 'simulation-1',
          timestamp: Date.now()
        })
      }, 'sim1')
    }, 0)
    
    // Changement 2 (presque simultané)
    setTimeout(() => {
      ydoc.transact(() => {
        pixelMap.set(key, {
          color: '#0000FF',
          author: 'simulation-2',
          timestamp: Date.now()
        })
      }, 'sim2')
    }, 10)
    
    console.log(`Conflits simulés sur pixel (${x},${y})`)
  }
}

console.log('🛠️ Console debug:')
console.log('  crdtDebug.getDoc()     - Document Yjs')
console.log('  crdtDebug.getPixels()  - Tous les pixels')
console.log('  crdtDebug.getHistory() - Statistiques')
console.log('  crdtDebug.simulateConcurrent() - Tester les conflits')