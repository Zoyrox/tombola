// Game client logic
class TombolaGame {
  constructor() {
    this.socket = null;
    this.user = null;
    this.gameState = null;
    this.init();
  }

  init() {
    // Connect to server
    this.connectToServer();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Show login screen
    this.showLoginScreen();
  }

  connectToServer() {
    // Connect to Socket.io server
    this.socket = io();
    
    this.socket.on('connect', () => {
      this.updateConnectionStatus(true);
      console.log('Connected to server');
    });

    this.socket.on('disconnect', () => {
      this.updateConnectionStatus(false);
      console.log('Disconnected from server');
    });

    // Game state updates
    this.socket.on('game-state', (state) => {
      this.gameState = state;
      this.updateGameUI();
    });

    this.socket.on('game-update', (state) => {
      this.gameState = state;
      this.updateGameUI();
    });

    // Number extraction
    this.socket.on('number-extracted', (data) => {
      this.gameState = data.gameState;
      this.showNotification(`Estratto il numero ${data.number}!`, 'success');
      this.updateGameUI();
    });

    // Players update
    this.socket.on('players-update', (players) => {
      this.gameState.players = players;
      this.updatePlayersList();
    });

    // Winner announcement
    this.socket.on('winner', (player) => {
      this.showWinnerModal(player);
    });

    // Login responses
    this.socket.on('login-success', (data) => {
      this.user = data.player;
      this.gameState = data.gameState;
      this.showGameScreen();
      this.showNotification(`Benvenuto ${this.user.name}!`, 'success');
    });

    this.socket.on('admin-login-success', (state) => {
      this.user = {
        id: 'admin',
        name: 'Amministratore',
        role: 'admin'
      };
      this.gameState = state;
      this.showGameScreen();
      this.showNotification('Accesso admin effettuato!', 'success');
    });

    this.socket.on('login-error', (error) => {
      this.showNotification(error, 'error');
    });

    // Codes generated
    this.socket.on('codes-generated', (codes) => {
      this.showCodesModal(codes);
    });
  }

  setupEventListeners() {
    // Login buttons
    document.getElementById('player-login-btn').addEventListener('click', () => {
      this.loginAsPlayer();
    });

    document.getElementById('admin-login-btn').addEventListener('click', () => {
      this.loginAsAdmin();
    });

    document.getElementById('admin-switch').addEventListener('click', () => {
      this.showAdminLogin();
    });

    document.getElementById('player-switch').addEventListener('click', () => {
      this.showPlayerLogin();
    });

    // Game controls
    document.getElementById('extract-btn').addEventListener('click', () => {
      this.extractNumber();
    });

    document.getElementById('auto-btn').addEventListener('click', () => {
      this.toggleAutoExtract();
    });

    document.getElementById('new-game-btn').addEventListener('click', () => {
      this.startNewGame();
    });

    document.getElementById('manage-codes-btn').addEventListener('click', () => {
      this.showCodeManager();
    });

    document.getElementById('generate-codes-btn').addEventListener('click', () => {
      this.generateCodes();
    });

    document.getElementById('copy-codes-btn').addEventListener('click', () => {
      this.copyCodes();
    });

    document.getElementById('logout-btn').addEventListener('click', () => {
      this.logout();
    });

    // Modal buttons
    document.getElementById('close-winner-modal').addEventListener('click', () => {
      this.closeModal('winner-modal');
    });

    document.getElementById('close-codes-modal').addEventListener('click', () => {
      this.closeModal('codes-modal');
    });

    document.getElementById('new-game-modal-btn').addEventListener('click', () => {
      this.startNewGame();
      this.closeModal('winner-modal');
    });
  }

  loginAsPlayer() {
    const code = document.getElementById('player-code').value.trim().toUpperCase();
    const name = document.getElementById('player-name').value.trim() || `Giocatore_${Date.now()}`;
    
    if (!code) {
      this.showNotification('Inserisci un codice valido', 'error');
      return;
    }

    this.socket.emit('player-login', { code, name });
  }

  loginAsAdmin() {
    const code = document.getElementById('admin-code').value.trim();
    
    if (!code) {
      this.showNotification('Inserisci il codice admin', 'error');
      return;
    }

    this.socket.emit('admin-login', { code });
  }

  extractNumber() {
    if (this.user?.role === 'admin') {
      this.socket.emit('extract-number');
    }
  }

  toggleAutoExtract() {
    const btn = document.getElementById('auto-btn');
    
    if (this.autoExtractInterval) {
      clearInterval(this.autoExtractInterval);
      this.autoExtractInterval = null;
      btn.innerHTML = '<i class="fas fa-robot"></i> Auto Estr.';
      this.showNotification('Auto-estrazione disattivata', 'info');
    } else {
      this.autoExtractInterval = setInterval(() => {
        if (this.user?.role === 'admin' && this.gameState?.extractedNumbers?.length < 90) {
          this.extractNumber();
        } else {
          this.toggleAutoExtract();
        }
      }, 1500);
      
      btn.innerHTML = '<i class="fas fa-stop"></i> Ferma Auto';
      this.showNotification('Auto-estrazione attivata', 'success');
    }
  }

  startNewGame() {
    this.socket.emit('new-game');
  }

  generateCodes() {
    const count = parseInt(document.getElementById('codes-count').value) || 5;
    this.socket.emit('generate-codes', count);
  }

  logout() {
    this.user = null;
    this.gameState = null;
    this.showLoginScreen();
    this.showNotification('Logout effettuato', 'info');
  }

  showLoginScreen() {
    document.querySelector('.login-screen').style.display = 'flex';
    document.querySelector('.game-screen').style.display = 'none';
  }

  showGameScreen() {
    document.querySelector('.login-screen').style.display = 'none';
    document.querySelector('.game-screen').style.display = 'block';
    this.updateGameUI();
  }

  updateGameUI() {
    if (!this.gameState || !this.user) return;

    // Update user info
    document.getElementById('user-name').textContent = this.user.name;
    document.getElementById('user-role').textContent = this.user.role === 'admin' ? 'Admin' : 'Giocatore';
    document.getElementById('user-role').className = `user-role role-${this.user.role}`;

    // Update stats
    document.getElementById('numbers-left').textContent = 90 - (this.gameState.extractedNumbers?.length || 0);
    document.getElementById('extracted-count').textContent = this.gameState.extractedNumbers?.length || 0;
    document.getElementById('players-count').textContent = this.gameState.players?.filter(p => p.connected).length || 0;
    document.getElementById('current-turn').textContent = this.getCurrentTurn();

    // Update number display
    this.updateNumberDisplay();

    // Update extracted numbers
    this.updateExtractedNumbers();

    // Update players list
    this.updatePlayersList();

    // Update tombola card (for players)
    if (this.user.role === 'player') {
      this.updateTombolaCard();
    }

    // Show/hide admin controls
    if (this.user.role === 'admin') {
      document.getElementById('admin-controls').style.display = 'block';
      document.getElementById('player-message').style.display = 'none';
    } else {
      document.getElementById('admin-controls').style.display = 'none';
      document.getElementById('player-message').style.display = 'block';
    }
  }

  updateNumberDisplay() {
    const display = document.getElementById('number-display');
    const noNumber = document.getElementById('no-number');
    const currentNumber = document.getElementById('current-number');
    
    if (this.gameState.lastExtracted) {
      noNumber.style.display = 'none';
      currentNumber.style.display = 'block';
      document.getElementById('current-number-value').textContent = this.gameState.lastExtracted;
    } else {
      noNumber.style.display = 'block';
      currentNumber.style.display = 'none';
    }
  }

  updateExtractedNumbers() {
    const container = document.getElementById('extracted-numbers');
    container.innerHTML = '';
    
    const numbers = this.gameState.extractedNumbers || [];
    const lastNumbers = numbers.slice(-15);
    
    lastNumbers.forEach((num, index) => {
      const bubble = document.createElement('div');
      bubble.className = 'number-bubble';
      if (index === lastNumbers.length - 1) {
        bubble.classList.add('recent');
      }
      bubble.textContent = num;
      container.appendChild(bubble);
    });
  }

  updatePlayersList() {
    const container = document.getElementById('players-list');
    container.innerHTML = '';
    
    const players = this.gameState.players?.filter(p => p.connected) || [];
    
    if (players.length === 0) {
      container.innerHTML = '<div class="empty-state">Nessun giocatore online</div>';
      return;
    }
    
    players.forEach(player => {
      const card = document.createElement('div');
      card.className = 'player-card';
      if (this.user?.id === player.id) {
        card.classList.add('active');
      }
      if (player.hasWon) {
        card.classList.add('winner');
      }
      
      card.innerHTML = `
        <div class="player-info">
          <div class="player-avatar">${player.name.charAt(0)}</div>
          <div class="player-details">
            <h4>${player.name}</h4>
            <div class="player-code">${player.code}</div>
          </div>
        </div>
        <div class="player-score">
          ${player.extractedCount || 0}/15
          ${player.hasWon ? ' 🏆' : ''}
        </div>
      `;
      
      container.appendChild(card);
    });
  }

  updateTombolaCard() {
    const player = this.gameState.players?.find(p => p.id === this.user?.id);
    if (!player?.cardNumbers) return;
    
    const container = document.getElementById('tombola-grid');
    container.innerHTML = '';
    
    const numbers = player.cardNumbers;
    const extracted = this.gameState.extractedNumbers || [];
    
    // Create 27 cells (3 rows × 9 columns)
    for (let i = 0; i < 27; i++) {
      const cell = document.createElement('div');
      const row = Math.floor(i / 9);
      const col = i % 9;
      
      // Number range for this column
      const minNum = col * 10 + 1;
      const maxNum = col * 10 + 10;
      
      // Player's numbers in this column
      const colNumbers = numbers.filter(n => n >= minNum && n <= maxNum).sort((a, b) => a - b);
      
      if (row < colNumbers.length) {
        const num = colNumbers[row];
        cell.textContent = num;
        cell.className = 'cell';
        
        if (extracted.includes(num)) {
          cell.classList.add('extracted');
          if (num === this.gameState.lastExtracted) {
            cell.classList.add('recent');
          }
        }
        
        cell.addEventListener('click', () => {
          if (extracted.includes(num)) {
            cell.classList.toggle('extracted');
          }
        });
      } else {
        cell.className = 'cell empty';
      }
      
      container.appendChild(cell);
    }
  }

  getCurrentTurn() {
    const players = this.gameState.players?.filter(p => p.connected) || [];
    if (players.length === 0) return '-';
    
    const extractedCount = this.gameState.extractedNumbers?.length || 0;
    return players[extractedCount % players.length]?.name || '-';
  }

  showAdminLogin() {
    document.getElementById('player-login').style.display = 'none';
    document.getElementById('admin-login').style.display = 'block';
  }

  showPlayerLogin() {
    document.getElementById('admin-login').style.display = 'none';
    document.getElementById('player-login').style.display = 'block';
  }

  showCodeManager() {
    this.updateCodesList();
    this.showModal('codes-modal');
  }

  updateCodesList() {
    const container = document.getElementById('codes-list');
    container.innerHTML = '';
    
    const codes = this.gameState.codes || [];
    
    codes.forEach(code => {
      const item = document.createElement('div');
      item.className = 'code-item';
      
      item.innerHTML = `
        <div class="code-value">${code.code}</div>
        <div class="code-status ${code.used ? 'status-used' : 'status-available'}">
          ${code.used ? 'Usato' : 'Disponibile'}
        </div>
      `;
      
      container.appendChild(item);
    });
  }

  showCodesModal(codes) {
    const container = document.getElementById('generated-codes');
    container.innerHTML = '';
    
    codes.forEach(code => {
      const item = document.createElement('div');
      item.className = 'code-item';
      item.innerHTML = `
        <div class="code-value">${code.code}</div>
        <div class="code-status status-available">Disponibile</div>
      `;
      container.appendChild(item);
    });
    
    this.showModal('codes-modal');
  }

  copyCodes() {
    const codes = this.gameState.codes
      ?.filter(c => !c.used)
      ?.map(c => c.code)
      ?.join('\n') || '';
    
    if (codes) {
      navigator.clipboard.writeText(codes)
        .then(() => this.showNotification('Codici copiati negli appunti!', 'success'))
        .catch(() => this.showNotification('Errore nella copia', 'error'));
    }
  }

  showWinnerModal(player) {
    document.getElementById('winner-name').textContent = player.name;
    this.showModal('winner-modal');
  }

  showModal(modalId) {
    document.getElementById(`${modalId}-overlay`).style.display = 'flex';
  }

  closeModal(modalId) {
    document.getElementById(`${modalId}-overlay`).style.display = 'none';
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = `
      <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
      <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }

  updateConnectionStatus(connected) {
    const dot = document.getElementById('connection-dot');
    const text = document.getElementById('connection-text');
    
    if (connected) {
      dot.className = 'connection-dot online';
      text.textContent = 'Connesso';
    } else {
      dot.className = 'connection-dot offline';
      text.textContent = 'Disconnesso';
    }
  }
}

// Initialize game when page loads
window.addEventListener('DOMContentLoaded', () => {
  window.game = new TombolaGame();
});
