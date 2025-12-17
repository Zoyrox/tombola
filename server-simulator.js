// Server simulato per Tombola Python
class TombolaServer {
  constructor() {
    this.STORAGE_KEY = 'tombola_server_data';
    this.SYNC_INTERVAL = 2000; // 2 secondi
    this.init();
  }

  init() {
    // Carica dati esistenti
    this.loadFromStorage();
    
    // Inizializza se vuoto
    if (!this.data) {
      this.data = {
        adminCode: "PYTHON2024_ADMIN",
        gameActive: false,
        extractedNumbers: [],
        lastExtracted: null,
        players: [],
        codes: this.generateDefaultCodes(),
        winner: null,
        lastUpdated: Date.now()
      };
      this.saveToStorage();
    }
    
    // Avvia sincronizzazione periodica
    setInterval(() => this.syncWithStorage(), this.SYNC_INTERVAL);
  }

  generateDefaultCodes() {
    const codes = [];
    for (let i = 1; i <= 20; i++) {
      codes.push({
        code: `PLAYER${i.toString().padStart(3, '0')}`,
        used: false,
        playerName: ""
      });
    }
    return codes;
  }

  loadFromStorage() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        this.data = JSON.parse(saved);
        console.log("Dati server caricati");
      }
    } catch (e) {
      console.error("Errore nel caricamento:", e);
    }
  }

  saveToStorage() {
    try {
      this.data.lastUpdated = Date.now();
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
      console.log("Dati server salvati");
    } catch (e) {
      console.error("Errore nel salvataggio:", e);
    }
  }

  syncWithStorage() {
    this.loadFromStorage();
  }

  // Metodi del server
  loginPlayer(code, name) {
    const codeEntry = this.data.codes.find(c => c.code === code);
    
    if (!codeEntry) {
      return { success: false, error: "Codice non valido" };
    }
    
    // Verifica se il giocatore esiste già
    let player = this.data.players.find(p => p.code === code);
    
    if (!player) {
      // Crea nuovo giocatore
      player = {
        id: 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        code: code,
        name: name || `Giocatore ${this.data.players.length + 1}`,
        cardNumbers: this.generateCardNumbers(),
        extractedCount: 0,
        connected: true,
        hasWon: false,
        lastActivity: Date.now()
      };
      
      this.data.players.push(player);
      codeEntry.used = true;
      codeEntry.playerName = player.name;
    } else {
      // Aggiorna giocatore esistente
      player.connected = true;
      player.lastActivity = Date.now();
    }
    
    this.saveToStorage();
    return { success: true, player, gameState: this.getGameState() };
  }

  loginAdmin(code) {
    if (code === this.data.adminCode) {
      this.data.gameActive = true;
      this.saveToStorage();
      return { success: true, gameState: this.getGameState() };
    }
    return { success: false, error: "Codice admin non valido" };
  }

  extractNumber() {
    if (!this.data.gameActive) {
      return { success: false, error: "Il gioco non è attivo" };
    }
    
    // Genera numeri rimanenti se non esistono
    if (!this.data.remainingNumbers || this.data.remainingNumbers.length === 0) {
      this.data.remainingNumbers = Array.from({length: 90}, (_, i) => i + 1)
        .sort(() => Math.random() - 0.5);
    }
    
    if (this.data.remainingNumbers.length === 0) {
      return { success: false, error: "Tutti i numeri sono stati estratti" };
    }
    
    const extracted = this.data.remainingNumbers.pop();
    this.data.extractedNumbers.push(extracted);
    this.data.lastExtracted = extracted;
    
    // Aggiorna conteggio giocatori
    this.updatePlayersExtractedCount(extracted);
    
    // Controlla vincitori
    this.checkForWinners();
    
    this.saveToStorage();
    
    return { 
      success: true, 
      number: extracted, 
      gameState: this.getGameState() 
    };
  }

  updatePlayersExtractedCount(number) {
    this.data.players.forEach(player => {
      if (player.cardNumbers.includes(number)) {
        player.extractedCount += 1;
        
        // Controlla se ha vinto
        if (player.extractedCount === 15 && !player.hasWon) {
          player.hasWon = true;
          this.data.winner = player;
        }
      }
    });
  }

  checkForWinners() {
    // Già gestito in updatePlayersExtractedCount
  }

  startNewGame() {
    this.data.extractedNumbers = [];
    this.data.remainingNumbers = Array.from({length: 90}, (_, i) => i + 1)
      .sort(() => Math.random() - 0.5);
    this.data.lastExtracted = null;
    this.data.winner = null;
    this.data.gameActive = true;
    
    // Resetta giocatori
    this.data.players.forEach(player => {
      if (player.connected) {
        player.cardNumbers = this.generateCardNumbers();
        player.extractedCount = 0;
        player.hasWon = false;
      }
    });
    
    this.saveToStorage();
    return this.getGameState();
  }

  generateCardNumbers() {
    const numbers = new Set();
    while (numbers.size < 15) {
      numbers.add(Math.floor(Math.random() * 90) + 1);
    }
    return Array.from(numbers).sort((a, b) => a - b);
  }

  generateCodes(count) {
    const newCodes = [];
    const start = this.data.codes.length + 1;
    
    for (let i = start; i < start + count; i++) {
      newCodes.push({
        code: `PLAYER${i.toString().padStart(3, '0')}`,
        used: false,
        playerName: ""
      });
    }
    
    this.data.codes.push(...newCodes);
    this.saveToStorage();
    return newCodes;
  }

  getGameState() {
    return {
      gameActive: this.data.gameActive,
      extractedNumbers: [...this.data.extractedNumbers],
      lastExtracted: this.data.lastExtracted,
      players: this.data.players.filter(p => p.connected).map(p => ({...p})),
      codes: [...this.data.codes],
      winner: this.data.winner,
      numbersLeft: 90 - this.data.extractedNumbers.length
    };
  }
}

// Server globale
window.tombolaServer = new TombolaServer();
