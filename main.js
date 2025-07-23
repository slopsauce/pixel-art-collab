// main.js - Pixel Art Collaboratif avec Supabase
import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js'

// Configuration
const GRID_SIZE = 32
let COLORS = [] // Will be loaded from Supabase colors table

// État global
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
}) // Client unique avec options
let currentRoom = null
let selectedColor = '#FF0000' // Rouge par défaut (sera mis à jour après chargement des couleurs)
let pixelCache = new Map() // Cache local des pixels
let subscription = null
let pollingInterval = null // Pour la synchronisation par polling
let presenceChannel = null // Pour la présence des utilisateurs
let myUserId = null // ID unique de l'utilisateur
let myUserColor = null // Couleur de l'utilisateur
let myUserName = null // Nom personnalisé
let connectedUsers = new Map() // Utilisateurs connectés
let isDrawing = false // Pour le dessin continu
let cursorUpdateTimeout = null // Pour throttle les updates curseur
let lastCursorX = -1 // Position X du dernier curseur
let lastCursorY = -1 // Position Y du dernier curseur
let cursorAnimationFrame = null // Pour l'animation des curseurs


// Métriques
const metrics = {
  operations: 0,
  lastSyncTime: Date.now()
}

// Initialisation au chargement
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Générer un ID utilisateur unique
    myUserId = 'user-' + Math.random().toString(36).substr(2, 9)
    const hue = Math.random() * 360
    myUserColor = `hsl(${hue}, 70%, 50%)`
    
    // Charger le nom sauvegardé
    try {
      const savedName = localStorage.getItem('pixelArtUserName')
      if (savedName) {
        document.getElementById('nameInput').value = savedName
        myUserName = savedName
      }
    } catch (e) {
      console.warn('⚠️ localStorage non disponible:', e)
    }
    
    await loadColors() // Charger les couleurs d'abord
    
    // Ajouter la couleur de l'utilisateur à la palette
    const userColorHex = hslToHex(hue, 70, 50)
    COLORS.push({ hex: userColorHex, name: 'Your Color' })
    selectedColor = userColorHex // Sélectionner par défaut
    
    // Réinitialiser la palette avec la couleur utilisateur
    initColorPalette()
    initPixelGrid()
    setupEventListeners()
    
    // Masquer la palette au démarrage
    hideColorPalette()
    
    // Initialiser le color picker
    setupColorPicker()
    
    
    console.log('✅ Initialisation terminée')
    console.log('👤 Mon ID:', myUserId)
  } catch (error) {
    console.error('❌ Erreur d\'initialisation:', error)
    alert('Erreur d\'initialisation: ' + error.message)
  }
})

// Helper function to convert hex to RGB
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

// Helper function to convert HSL to hex
function hslToHex(h, s, l) {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// Charger les couleurs (maintenant hardcodé)
async function loadColors() {
  // 8 couleurs essentielles
  COLORS = [
    { hex: '#000000', name: 'Black' },
    { hex: '#FFFFFF', name: 'White' }, 
    { hex: '#FF0000', name: 'Red' },
    { hex: '#00FF00', name: 'Green' },
    { hex: '#0000FF', name: 'Blue' },
    { hex: '#FFFF00', name: 'Yellow' },
    { hex: '#FFA500', name: 'Orange' },
    { hex: '#800080', name: 'Purple' }
  ];
  
  console.log('✅ 8 couleurs essentielles chargées (+ couleur utilisateur sera ajoutée)')
  
  // Initialiser la palette après chargement (mais ne pas l'afficher)
  initColorPalette()
}

// Masquer la section couleurs
function hideColorPalette() {
  const colorSection = document.querySelector('.color-section')
  colorSection.style.display = 'none'
}

// Afficher la section couleurs
function showColorPalette() {
  const colorSection = document.querySelector('.color-section')
  colorSection.style.display = 'flex'
}

// Initialiser la palette de couleurs
function initColorPalette() {
  const palette = document.getElementById('colorPalette')
  palette.innerHTML = '' // Clear existing colors
  
  COLORS.forEach((colorData, index) => {
    // Handle both object format {hex, name} and string format
    const colorHex = typeof colorData === 'object' ? colorData.hex : colorData
    const colorName = typeof colorData === 'object' ? colorData.name : colorHex
    
    const colorBtn = document.createElement('button')
    colorBtn.className = 'color-btn'
    colorBtn.style.backgroundColor = colorHex
    colorBtn.title = `${colorName} (${colorHex})`
    
    // Sélectionner la couleur actuellement choisie (par défaut la couleur utilisateur)
    if (colorHex.toLowerCase() === selectedColor.toLowerCase()) {
      colorBtn.classList.add('selected')
    }
    
    colorBtn.addEventListener('click', () => {
      selectedColor = colorHex
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
      
      // Click pour peindre un pixel
      pixel.addEventListener('mousedown', (e) => {
        e.preventDefault()
        isDrawing = true
        paintPixel(x, y)
      })
      
      // Entrer dans un pixel en dessinant
      pixel.addEventListener('mouseenter', () => {
        if (isDrawing) {
          paintPixel(x, y)
        }
      })
      
      canvas.appendChild(pixel)
    }
  }
  
  // Arrêter le dessin quand on relâche le bouton
  document.addEventListener('mouseup', () => {
    isDrawing = false
  })
  
  // Empêcher la sélection de texte pendant le dessin
  canvas.addEventListener('selectstart', (e) => e.preventDefault())
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
  
  // Mettre à jour le texte du bouton si déjà connecté
  document.getElementById('roomInput').addEventListener('input', () => {
    const newRoom = document.getElementById('roomInput').value.trim()
    
    if (currentRoom) {
      // Si connecté, activer le bouton seulement si la room est différente
      if (newRoom && newRoom !== currentRoom) {
        connectBtn.textContent = 'Changer de room'
        connectBtn.disabled = false
      } else {
        connectBtn.textContent = 'Se connecter'
        connectBtn.disabled = true
      }
    } else {
      // Si pas connecté, activer le bouton si un nom est entré
      connectBtn.textContent = 'Se connecter'
      connectBtn.disabled = !newRoom
    }
  })
  
  document.getElementById('disconnectBtn').addEventListener('click', disconnect)
  document.getElementById('clearBtn').addEventListener('click', clearCanvas)
  
  // Toggle instructions functionality
  document.getElementById('toggleInstructions').addEventListener('click', () => {
    const instructions = document.getElementById('instructions')
    const toggleBtn = document.getElementById('toggleInstructions')
    
    if (instructions.classList.contains('collapsed')) {
      instructions.classList.remove('collapsed')
      toggleBtn.textContent = '✕'
      toggleBtn.title = 'Masquer les instructions'
    } else {
      instructions.classList.add('collapsed')
      toggleBtn.textContent = '?'
      toggleBtn.title = 'Afficher les instructions'
    }
  })
  
  // Sauvegarder le nom quand il change
  document.getElementById('nameInput').addEventListener('input', (e) => {
    myUserName = e.target.value.trim() || null
    if (myUserName) {
      localStorage.setItem('pixelArtUserName', myUserName)
    } else {
      localStorage.removeItem('pixelArtUserName')
    }
    
    // Mettre à jour la présence si connecté
    if (subscription && currentRoom) {
      subscription.track({
        userId: myUserId,
        userName: myUserName,
        userColor: myUserColor,
        cursor: { x: lastCursorX, y: lastCursorY }
      }).catch(() => {})
    }
  })
  
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
  
  // Suivi du curseur sur la grille
  let lastUpdateTime = 0
  
  document.getElementById('pixelCanvas').addEventListener('mousemove', async (e) => {
    if (!subscription || !currentRoom) return
    
    // Ne pas envoyer les curseurs si on est seul
    if (connectedUsers.size <= 1) return
    
    const canvas = document.getElementById('pixelCanvas')
    const rect = canvas.getBoundingClientRect()
    
    // Position relative au canvas (pas d'arrondi pour la fluidité)
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    // Limiter à 20 updates par seconde (50ms)
    const now = Date.now()
    if (now - lastUpdateTime < 50) return
    
    lastUpdateTime = now
    lastCursorX = x
    lastCursorY = y
    
    // Envoyer la position
    subscription.track({
      userId: myUserId,
      userName: myUserName,
      userColor: myUserColor,
      cursor: { x: Math.round(x), y: Math.round(y) }
    }).catch(() => {})
  })
  
  // Cacher le curseur quand on quitte la grille
  document.getElementById('pixelCanvas').addEventListener('mouseleave', () => {
    if (!subscription || !currentRoom) return
    
    // Ne pas envoyer les curseurs si on est seul
    if (connectedUsers.size <= 1) return
    
    lastCursorX = -1
    lastCursorY = -1
    
    // Envoyer immédiatement la disparition du curseur
    subscription.track({
      userId: myUserId,
      userName: myUserName,
      userColor: myUserColor,
      cursor: null
    }).catch(() => {})
  })
}

// Initialiser le color picker
function setupColorPicker() {
  const colorInput = document.getElementById('customColorInput')
  
  // Changer la couleur sélectionnée quand l'utilisateur choisit une couleur
  colorInput.addEventListener('change', () => {
    selectedColor = colorInput.value
    
    // Désélectionner les couleurs de la palette
    document.querySelectorAll('.color-btn').forEach(btn => {
      btn.classList.remove('selected')
    })
    
    console.log('Couleur custom sélectionnée:', selectedColor)
  })
}


// Connexion à une room
async function connect() {
  console.log('🔌 Tentative de connexion...')
  
  const roomName = document.getElementById('roomInput').value.trim()
  if (!roomName) {
    alert('Entre un nom de room !')
    return
  }
  
  
  // Validation du nom de room pour la sécurité
  if (roomName.length > 50 || !/^[a-zA-Z0-9-_]+$/.test(roomName)) {
    alert('Le nom de room doit contenir uniquement des lettres, chiffres, tirets et underscores (max 50 caractères)')
    return
  }
  
  // Si déjà connecté à une room différente, se déconnecter d'abord
  if (currentRoom && currentRoom !== roomName) {
    console.log(`🔄 Changement de room: ${currentRoom} → ${roomName}`)
    disconnect()
  }
  
  currentRoom = roomName
  console.log(`🚀 Connexion à la room: ${currentRoom}`)
  
  try {
    // Tester si Supabase est accessible
    console.log('📡 Test de Supabase...')
    const { data: test, error: testError } = await supabase
      .from('pixels')
      .select('count')
      .limit(1)
    
    if (testError) {
      console.error('❌ Erreur Supabase:', testError)
    }
    
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
    updatePixelsCount()
    updateConnectionStatus(true)
    
    // Afficher la palette de couleurs
    showColorPalette()
    
    // Démarrer le polling immédiatement
    startPolling()
    
    // S'abonner aux changements en temps réel et à la présence
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
          handleRealtimeChange(payload)
        }
      )
      .on('presence', { event: 'sync' }, () => {
        handlePresenceSync()
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        handlePresenceSync()
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        handlePresenceSync()
      })
      .subscribe(async (status, error) => {
        console.log('📡 Statut de l\'abonnement:', status)
        
        if (error) {
          console.error('❌ Erreur WebSocket:', error)
          // Safari peut avoir des problèmes avec les WebSockets
          if (navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome')) {
            console.warn('🧭 Safari détecté - problèmes WebSocket possibles')
            alert('Safari peut avoir des problèmes de connexion. Essayez Chrome ou Firefox pour une meilleure expérience.')
          }
        }
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Abonnement réussi au channel:', `room:${currentRoom}`)
          document.getElementById('syncMode').textContent = '✨ Realtime actif'
          
          // Envoyer notre présence
          try {
            await subscription.track({
              userId: myUserId,
              userName: myUserName,
              userColor: myUserColor,
              cursor: { x: -1, y: -1 }
            })
          } catch (trackError) {
            console.error('❌ Erreur track:', trackError)
          }
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Erreur du channel')
          document.getElementById('syncMode').textContent = '🔄 Polling'
        } else if (status === 'TIMED_OUT') {
          console.error('⏱️ Timeout de connexion')
          document.getElementById('syncMode').textContent = '🔄 Polling'
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
  
  // Démarrage du polling silencieux
  document.getElementById('syncMode').textContent = '🔄 Polling'
  
  // Polling toutes les 2 secondes
  pollingInterval = setInterval(async () => {
    if (!currentRoom) return
    
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
          // Synchronisation effectuée silencieusement
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
  document.getElementById('connectBtn').textContent = 'Se connecter'
  document.getElementById('disconnectBtn').disabled = true
  updateConnectionStatus(null)
  document.getElementById('syncMode').textContent = '💤 Hors ligne'
  document.getElementById('peersCount').textContent = '👥 0 utilisateur'
  document.getElementById('pixelsCount').textContent = '🎨 0 pixels'
  
  // Masquer la palette de couleurs
  hideColorPalette()
}

// Peindre un pixel
async function paintPixel(x, y) {
  if (!currentRoom) {
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
  
  // Mettre à jour localement immédiatement pour un feedback instantané
  pixelCache.set(key, pixelData)
  updatePixelDisplay(x, y, selectedColor)
  
  
  try {
    // Envoyer à Supabase en arrière-plan
    const { error } = await supabase
      .from('pixels')
      .upsert(pixelData, {
        onConflict: 'room,x,y'
      })
    
    if (error) {
      console.error('Erreur lors de la peinture:', error)
      // En cas d'erreur, revenir à l'état précédent
      const previousPixel = pixelCache.get(key)
      if (previousPixel) {
        updatePixelDisplay(x, y, previousPixel.color)
      } else {
        pixelCache.delete(key)
        updatePixelDisplay(x, y, '#FFFFFF')
      }
      
      // Si la table n'existe pas, montrer un message d'aide
      if (error.code === '42P01') {
        alert('La table pixels n\'existe pas. Créez-la dans Supabase avec les colonnes: room, x, y, color, author, timestamp')
      }
    } else {
      metrics.operations++
    }
  } catch (error) {
    console.error('Erreur:', error)
    // En cas d'erreur réseau, garder le changement local
  }
  
  metrics.operations++
}

// Gérer les changements en temps réel
function handleRealtimeChange(payload) {
  // Si on reçoit des événements realtime, arrêter le polling
  if (pollingInterval) {
    clearInterval(pollingInterval)
    pollingInterval = null
    // Realtime fonctionne, arrêt du polling
    document.getElementById('syncMode').textContent = '✨ Realtime actif'
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

// Effacer le canvas (désactivé pour la sécurité)
async function clearCanvas() {
  if (!currentRoom) return
  
  // Pour la sécurité publique, désactiver la suppression globale
  alert('La fonction "Effacer tout" est désactivée pour éviter les abus. Vous pouvez peindre par-dessus les pixels existants.')
  return
  
  /* Code original commenté pour sécurité:
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
  */
}

// Mises à jour UI
function updateConnectionStatus(synced) {
  const status = document.getElementById('connectionStatus')
  
  // Retirer toutes les classes de statut
  status.classList.remove('status-connected', 'status-syncing', 'status-disconnected')
  
  if (synced === null) {
    status.textContent = '🔴 Déconnecté'
    status.classList.add('status-disconnected')
  } else if (synced) {
    status.textContent = '🟢 Connecté'
    status.classList.add('status-connected')
  } else {
    status.textContent = '🟡 Synchronisation...'
    status.classList.add('status-syncing')
  }
}

// Gérer la synchronisation de présence
function handlePresenceSync() {
  if (!subscription) return
  
  const state = subscription.presenceState()
  connectedUsers.clear()
  
  // Parcourir tous les utilisateurs présents
  Object.values(state).forEach(presences => {
    presences.forEach(presence => {
      // La donnée trackée est directement dans l'objet presence
      if (presence && presence.userId) {
        connectedUsers.set(presence.userId, {
          userId: presence.userId,
          userName: presence.userName,
          userColor: presence.userColor,
          cursor: presence.cursor
        })
      }
    })
  })
  
  updateUsersList()
  updateCursors()
}

// Mettre à jour la liste des utilisateurs
function updateUsersList() {
  const usersList = document.getElementById('usersList')
  usersList.innerHTML = ''
  
  connectedUsers.forEach(user => {
    const userItem = document.createElement('div')
    userItem.className = 'user-item'
    const displayName = user.userName || user.userId
    const isMe = user.userId === myUserId
    userItem.innerHTML = `
      <div class="user-indicator" style="background-color: ${user.userColor}"></div>
      <span>${isMe ? 'Moi' : displayName}${isMe && user.userName ? ' (' + user.userName + ')' : ''}</span>
    `
    usersList.appendChild(userItem)
  })
  
  // Mettre à jour le compteur
  const count = connectedUsers.size
  document.getElementById('peersCount').textContent = `👥 ${count} utilisateur${count > 1 ? 's' : ''}`
}

// Mettre à jour les curseurs
function updateCursors() {
  const canvas = document.getElementById('pixelCanvas')
  
  // Gérer tous les curseurs existants
  const existingCursors = new Set()
  
  connectedUsers.forEach(user => {
    if (user.userId === myUserId || !user.cursor) return
    
    existingCursors.add(user.userId)
    let cursor = document.getElementById(`cursor-${user.userId}`)
    
    // Créer le curseur s'il n'existe pas
    if (!cursor) {
      cursor = document.createElement('div')
      cursor.id = `cursor-${user.userId}`
      cursor.className = 'user-cursor'
      const displayName = user.userName || user.userId
      cursor.innerHTML = `
        <div class="cursor-pointer" style="border-color: ${user.userColor}"></div>
        <div class="cursor-label" style="background: ${user.userColor}">${displayName}</div>
      `
      canvas.appendChild(cursor)
    }
    
    // Positionner le curseur
    cursor.style.left = user.cursor.x + 'px'
    cursor.style.top = user.cursor.y + 'px'
    
    // Debug: vérifier les positions
    if (user.userId === Array.from(connectedUsers.keys())[0] && user.userId !== myUserId) {
      console.log(`🎯 Cursor position for ${user.userName || user.userId}: x=${user.cursor.x}, y=${user.cursor.y}`)
    }
  })
  
  // Supprimer les curseurs des utilisateurs déconnectés
  document.querySelectorAll('.user-cursor').forEach(cursor => {
    const userId = cursor.id.replace('cursor-', '')
    if (!existingCursors.has(userId)) {
      cursor.remove()
    }
  })
}

function updatePeersCount() {
  // Cette fonction n'est plus utilisée avec Supabase Presence
  // Le compteur est géré dans updateUsersList()
}

function updatePixelsCount() {
  const count = pixelCache.size
  document.getElementById('pixelsCount').textContent = `🎨 ${count} pixels`
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
    if (!currentRoom) {
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
  },
  // Tester la latence réseau
  testLatency: async () => {
    if (!supabase) return
    
    console.log('🏓 Test de latence...')
    const times = []
    
    for (let i = 0; i < 5; i++) {
      const start = Date.now()
      try {
        await supabase.from('pixels').select('count').limit(1)
        const time = Date.now() - start
        times.push(time)
        console.log(`  Ping ${i + 1}: ${time}ms`)
      } catch (error) {
        console.error('  Erreur:', error)
      }
    }
    
    if (times.length > 0) {
      const avg = times.reduce((a, b) => a + b) / times.length
      console.log(`📊 Latence moyenne: ${avg.toFixed(1)}ms`)
      
      if (avg > 200) {
        console.warn('⚠️ Connexion lente détectée!')
        console.log('💡 Les curseurs peuvent être saccadés avec cette latence')
      }
    }
  },
  // Tester CORS
  testCORS: async () => {
    console.log('🔍 Test CORS...')
    console.log('URL Supabase:', SUPABASE_URL)
    console.log('Navigateur:', navigator.userAgent)
    
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
        method: 'OPTIONS',
        headers: {
          'apikey': SUPABASE_ANON_KEY
        }
      })
      console.log('✅ CORS Headers:', response.headers.get('access-control-allow-origin'))
    } catch (error) {
      console.error('❌ CORS Error:', error)
      console.log('💡 Essayez de désactiver les extensions Safari ou le mode privé')
    }
  }
}

console.log('🛠️ Console debug:')
console.log('  pixelDebug.getRoom()     - Room actuelle')
console.log('  pixelDebug.getPixels()   - Tous les pixels')
console.log('  pixelDebug.getMetrics()  - Statistiques')
console.log('  pixelDebug.testSync()    - Tester la synchronisation')
console.log('  pixelDebug.checkRealtime() - Vérifier connexion realtime')
console.log('  pixelDebug.testLatency()   - Tester la latence réseau')
console.log('  pixelDebug.testCORS()      - Tester les problèmes CORS')