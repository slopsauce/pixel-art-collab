// main.js - Pixel Art avec synchronisation temps réel
import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js'

// Configuration
const GRID_SIZE = 16
const COLORS = [
  '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
  '#FFFF00', '#FF00FF', '#00FFFF', '#FF8800', '#8800FF',
  '#88FF00', '#FF0088', '#0088FF', '#666666', '#AAAAAA'
]

// État global
let supabase = null
let currentRoom = null
let selectedColor = COLORS[2] // Rouge par défaut
let pixelCache = new Map() // Cache local des pixels
let subscription = null
let pollingInterval = null // Pour la synchronisation par polling

// Métriques
const metrics = {
  operations: 0,
  lastSyncTime: Date.now()
}

// Initialisation au chargement
document.addEventListener('DOMContentLoaded', () => {
  try {
    initColorPalette()
    initPixelGrid()
    setupEventListeners()
    
    // Debug info
    updateDebugInfo()
    setInterval(updateDebugInfo, 1000)
    
    console.log('✅ Initialisation terminée')
  } catch (error) {
    console.error('❌ Erreur d\'initialisation:', error)
    alert('Erreur d\'initialisation: ' + error.message)
  }
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
  const connectBtn = document.getElementById('connectBtn')
  if (!connectBtn) {
    console.error('❌ Bouton connect non trouvé!')
    return
  }
  
  connectBtn.addEventListener('click', async () => {
    try {
      console.log('🔘 Clic sur Se connecter')
      await connect()
    } catch (error) {
      console.error('❌ Erreur lors de la connexion:', error)
      alert('Erreur: ' + error.message)
    }
  })
  
  document.getElementById('disconnectBtn').addEventListener('click', disconnect)
  document.getElementById('clearBtn').addEventListener('click', clearCanvas)
  document.getElementById('refreshBtn').addEventListener('click', manualRefresh)
  
  // Enter pour se connecter
  document.getElementById('roomInput').addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
      try {
        await connect()
      } catch (error) {
        console.error('❌ Erreur lors de la connexion:', error)
      }
    }
  })
}

// Rafraîchir manuellement
async function manualRefresh() {
  if (!currentRoom || !supabase) return
  
  console.log('🔄 Rafraîchissement manuel...')
  const btn = document.getElementById('refreshBtn')
  btn.disabled = true
  btn.textContent = '⏳ ...'
  
  try {
    const { data: pixels, error } = await supabase
      .from('pixels')
      .select('*')
      .eq('room', currentRoom)
    
    if (!error && pixels) {
      // Effacer et recharger tous les pixels
      pixelCache.clear()
      initPixelGrid()
      
      pixels.forEach(pixel => {
        const key = `${pixel.x},${pixel.y}`
        pixelCache.set(key, pixel)
        updatePixelDisplay(pixel.x, pixel.y, pixel.color)
      })
      
      updatePixelsCount()
      console.log('✅ Rafraîchissement terminé')
    }
  } catch (error) {
    console.error('Erreur rafraîchissement:', error)
  } finally {
    btn.disabled = false
    btn.textContent = '🔄 Rafraîchir'
  }
}

// Connexion à une room
async function connect() {
  const roomName = document.getElementById('roomInput').value.trim()
  if (!roomName) {
    alert('Entre un nom de room !')
    return
  }
  
  currentRoom = roomName
  console.log(`🚀 Connexion à la room: ${currentRoom}`)
  
  try {
    // Initialiser Supabase
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    
    // Créer la table si elle n'existe pas (pour la démo)
    // En production, créez la table via l'interface Supabase
    
    // Charger les pixels existants
    const { data: pixels, error } = await supabase
      .from('pixels')
      .select('*')
      .eq('room', currentRoom)
    
    if (error && error.code !== 'PGRST116') { // Ignorer l'erreur si la table n'existe pas
      console.error('Erreur de chargement:', error)
    } else if (pixels) {
      // Mettre en cache et afficher les pixels existants
      pixels.forEach(pixel => {
        const key = `${pixel.x},${pixel.y}`
        pixelCache.set(key, pixel)
        updatePixelDisplay(pixel.x, pixel.y, pixel.color)
      })
    }
    
    // Mettre à jour l'UI immédiatement
    document.getElementById('connectBtn').disabled = true
    document.getElementById('disconnectBtn').disabled = false
    document.getElementById('refreshBtn').disabled = false
    updatePixelsCount()
    updateConnectionStatus(true)
    
    // Démarrer le polling immédiatement
    startPolling()
    
    // S'abonner aux changements en temps réel (en arrière-plan)
    // Ne pas attendre la connexion WebSocket
    subscription = supabase
      .channel(`room:${currentRoom}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'pixels',
          filter: `room=eq.${currentRoom}`
        }, 
        (payload) => {
          console.log('🔄 Changement reçu:', payload)
          handleRealtimeChange(payload)
        }
      )
      .subscribe((status) => {
        console.log('📡 Statut de l\'abonnement:', status)
        
        // Debug: vérifier l'état du channel
        if (status === 'SUBSCRIBED') {
          console.log('✅ Abonnement réussi au channel:', `room:${currentRoom}`)
          document.getElementById('peersCount').textContent = '✨ Realtime actif'
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Erreur du channel')
          document.getElementById('peersCount').textContent = '🔄 Mode: Polling'
        } else if (status === 'TIMED_OUT') {
          console.error('⏱️ Timeout de connexion')
          document.getElementById('peersCount').textContent = '🔄 Mode: Polling'
        }
      })
    
  } catch (error) {
    console.error('❌ Erreur de connexion:', error)
    alert('Erreur de connexion. Vérifiez la configuration Supabase.')
  }
}

// Polling pour synchronisation (fallback si realtime ne marche pas)
function startPolling() {
  // Arrêter le polling existant
  if (pollingInterval) {
    clearInterval(pollingInterval)
  }
  
  console.log('🔄 Démarrage du polling (intervalle: 2s)')
  document.getElementById('peersCount').textContent = '🔄 Mode: Polling'
  
  // Polling toutes les 2 secondes
  pollingInterval = setInterval(async () => {
    if (!currentRoom || !supabase) return
    
    try {
      const { data: pixels, error } = await supabase
        .from('pixels')
        .select('*')
        .eq('room', currentRoom)
      
      if (!error && pixels) {
        // Comparer avec le cache local
        const serverPixels = new Map()
        pixels.forEach(pixel => {
          const key = `${pixel.x},${pixel.y}`
          serverPixels.set(key, pixel)
        })
        
        // Mettre à jour les pixels modifiés
        let hasChanges = false
        serverPixels.forEach((pixel, key) => {
          const cachedPixel = pixelCache.get(key)
          if (!cachedPixel || cachedPixel.timestamp !== pixel.timestamp) {
            pixelCache.set(key, pixel)
            updatePixelDisplay(pixel.x, pixel.y, pixel.color)
            hasChanges = true
          }
        })
        
        // Supprimer les pixels qui n'existent plus sur le serveur
        pixelCache.forEach((pixel, key) => {
          if (!serverPixels.has(key)) {
            pixelCache.delete(key)
            const [x, y] = key.split(',').map(Number)
            updatePixelDisplay(x, y, '#FFFFFF')
            hasChanges = true
          }
        })
        
        if (hasChanges) {
          updatePixelsCount()
          console.log('🔄 Synchronisation par polling effectuée')
        }
      }
    } catch (error) {
      console.error('Erreur polling:', error)
    }
  }, 2000)
}

// Déconnexion
function disconnect() {
  console.log('👋 Déconnexion...')
  
  if (subscription) {
    subscription.unsubscribe()
    subscription = null
  }
  
  if (pollingInterval) {
    clearInterval(pollingInterval)
    pollingInterval = null
    console.log('🛑 Arrêt du polling')
  }
  
  pixelCache.clear()
  currentRoom = null
  
  // Reset UI
  initPixelGrid()
  document.getElementById('connectBtn').disabled = false
  document.getElementById('disconnectBtn').disabled = true
  document.getElementById('refreshBtn').disabled = true
  updateConnectionStatus(false)
  document.getElementById('peersCount').textContent = '🌐 Mode: Serveur'
  document.getElementById('pixelsCount').textContent = '🎨 0 pixels'
}

// Peindre un pixel
async function paintPixel(x, y) {
  if (!currentRoom || !supabase) {
    alert('Connecte-toi d\'abord !')
    return
  }
  
  const key = `${x},${y}`
  const pixelData = {
    room: currentRoom,
    x: x,
    y: y,
    color: selectedColor,
    author: crypto.randomUUID(),
    timestamp: new Date().toISOString()
  }
  
  try {
    // Upsert (insert ou update) le pixel
    const { error } = await supabase
      .from('pixels')
      .upsert(pixelData, {
        onConflict: 'room,x,y'
      })
    
    if (error) {
      console.error('Erreur lors de la peinture:', error)
      // Si la table n'existe pas, montrer un message d'aide
      if (error.code === '42P01') {
        alert('La table pixels n\'existe pas. Créez-la dans Supabase avec les colonnes: room, x, y, color, author, timestamp')
      }
    } else {
      // Mettre à jour localement immédiatement
      pixelCache.set(key, pixelData)
      updatePixelDisplay(x, y, selectedColor)
      metrics.operations++
    }
  } catch (error) {
    console.error('Erreur:', error)
  }
  
  metrics.operations++
  console.log(`🎨 Pixel peint: ${key} -> ${selectedColor}`)
}

// Gérer les changements en temps réel
function handleRealtimeChange(payload) {
  // Si on reçoit des événements realtime, arrêter le polling
  if (pollingInterval) {
    clearInterval(pollingInterval)
    pollingInterval = null
    console.log('✅ Realtime fonctionne! Arrêt du polling.')
    document.getElementById('peersCount').textContent = '✨ Realtime actif'
  }
  
  if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
    const pixel = payload.new
    const key = `${pixel.x},${pixel.y}`
    pixelCache.set(key, pixel)
    updatePixelDisplay(pixel.x, pixel.y, pixel.color)
  } else if (payload.eventType === 'DELETE') {
    const pixel = payload.old
    const key = `${pixel.x},${pixel.y}`
    pixelCache.delete(key)
    updatePixelDisplay(pixel.x, pixel.y, '#FFFFFF')
  }
  updatePixelsCount()
}

// Mettre à jour l'affichage d'un pixel
function updatePixelDisplay(x, y, color) {
  const pixel = document.querySelector(`[data-x="${x}"][data-y="${y}"]`)
  if (pixel) {
    pixel.style.backgroundColor = color
    pixel.classList.add('pixel-animated')
    setTimeout(() => pixel.classList.remove('pixel-animated'), 300)
  }
}

// Afficher tous les pixels
function renderAllPixels() {
  pixelCache.forEach((pixel, key) => {
    updatePixelDisplay(pixel.x, pixel.y, pixel.color)
  })
  updatePixelsCount()
}

// Effacer le canvas
async function clearCanvas() {
  if (!currentRoom || !supabase) return
  
  if (confirm('Effacer tout le dessin ?')) {
    try {
      const { error } = await supabase
        .from('pixels')
        .delete()
        .eq('room', currentRoom)
      
      if (error) {
        console.error('Erreur lors de l\'effacement:', error)
      } else {
        pixelCache.clear()
        initPixelGrid()
        console.log('🗑️ Canvas effacé')
      }
    } catch (error) {
      console.error('Erreur:', error)
    }
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
  // Avec Supabase, on n'a pas de compteur de peers direct
  document.getElementById('peersCount').textContent = '🌐 Mode: Serveur'
}

function updatePixelsCount() {
  const count = pixelCache.size
  document.getElementById('pixelsCount').textContent = `🎨 ${count} pixels`
  document.getElementById('docSize').textContent = `💾 Supabase`
}

function updateDebugInfo() {
  const debugDiv = document.getElementById('debugInfo')
  
  const syncMode = pollingInterval ? 'Polling (2s)' : 'Realtime ✨'
  
  const debugInfo = {
    'Room': currentRoom || 'Non connecté',
    'Backend': 'Supabase',
    'Sync Mode': syncMode,
    'Operations': metrics.operations,
    'Pixels': pixelCache.size,
    'Status': subscription ? 'Connecté' : 'Déconnecté',
    'Last Sync': new Date(metrics.lastSyncTime).toLocaleTimeString()
  }
  
  debugDiv.textContent = JSON.stringify(debugInfo, null, 2)
}

// Exposer des fonctions pour le debug
window.pixelDebug = {
  getRoom: () => currentRoom,
  getPixels: () => Object.fromEntries(pixelCache),
  getMetrics: () => metrics,
  clearCache: () => {
    pixelCache.clear()
    initPixelGrid()
  },
  // Tester la synchronisation
  testSync: async () => {
    if (!currentRoom || !supabase) {
      console.log('❌ Connectez-vous d\'abord!')
      return
    }
    
    console.log('🧪 Test de synchronisation...')
    
    // Ajouter un pixel de test
    const x = Math.floor(Math.random() * GRID_SIZE)
    const y = Math.floor(Math.random() * GRID_SIZE)
    
    await paintPixel(x, y)
    console.log(`Pixel test ajouté en (${x},${y})`)
  },
  // Vérifier l'état de la connexion realtime
  checkRealtime: () => {
    if (!subscription) {
      console.log('❌ Pas d\'abonnement actif')
      return
    }
    
    console.log('📡 État du channel:', subscription.state)
    console.log('🔌 Socket state:', supabase.getChannels())
    
    // Forcer une reconnexion si nécessaire
    if (subscription.state !== 'joined') {
      console.log('🔄 Tentative de reconnexion...')
      subscription.subscribe()
    }
  }
}

console.log('🛠️ Console debug:')
console.log('  pixelDebug.getRoom()     - Room actuelle')
console.log('  pixelDebug.getPixels()   - Tous les pixels')
console.log('  pixelDebug.getMetrics()  - Statistiques')
console.log('  pixelDebug.testSync()    - Tester la synchronisation')
console.log('  pixelDebug.checkRealtime() - Vérifier connexion realtime')