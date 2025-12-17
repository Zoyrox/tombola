// Gioco Tombola Python
class TombolaGame {
  constructor() {
    this.user = null;
    this.gameState = null;
    this.syncInterval = null;
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.showLoginScreen();
    this.startSync();
  }

  setupEventListeners() {
    // Login
    document.getElementById('player-login-btn').addEventListener('click', () => this.loginAsPlayer());
    document.getElementById('admin-login-btn').addEventListener('click', () => this.loginAsAdmin());
    document.getElementById('admin-switch').addEventListener('click', () => this.showAdminLogin());
    document.getElementById('player-switch').addEventListener('click', () => this.showPlayerLogin());
    
    // Game controls
    document.getElementById('extract-btn').addEventListener('click', () => this.extractNumber());
    document.getElementById('auto-btn').addEventListener('click', () => this.toggleAutoExtract());
    document.getElementById('new-game-btn').addEventListener('click', () => this.startNewGame());
    document.getElementById('manage-codes-btn').addEventListener('click', () => this.showCodeManager());
    document.getElementById('generate-codes-btn').addEventListener('click', () => this.generateCodes());
    document.getElementById('copy-codes-btn').addEventListener('click', () => this.copyCodes());
    document.getElementById('logout-btn').addEventListener('click', () => this.logout());
    
    // Modal buttons
    document.getElementById('close-winner-modal').addEventListener('click', () => this.closeModal('winner-modal'));
    document.getElementById('close-codes-modal').addEventListener('click', () => this.closeModal('codes-modal'));
    document.getElementById('new-game-modal-btn').addEventListener('click', () => {
      this.startNewGame();
      this.closeModal('winner-modal');
    });
    
    // Tasto invio sui form
    document.getElementById('player-code').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.loginAsPlayer();
    });
    
    document.getElementById('admin-code').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.loginAsAdmin();
    });
  }

  startSync() {
    this.syncInterval = setInterval(() => {
      if (this.user) {
        this.syncGameState();
      }
    }, 2000);
  }

  syncGameState() {
    const gameState = window.tombolaServer.getGameState();
    
    // Aggiorna solo se ci sono cambiamenti
    if (JSON.stringify(gameState) !== JSON.stringify(this.gameState)) {
      this.gameState = gameState;
      this.updateGameUI();
      
      // Controlla vincitori
      if (this.gameState.winner && !document.getElementById('winner-modal-overlay').style.display === 'flex') {
        this.showWinnerModal(this.gameState.winner);
      }
    }
    
    // Aggiorna attività utente
    if (this.user?.role === 'player') {
      const player = this.gameState.players.find(p => p.code === this.user.code);
      if (player) {
        player.lastActivity = Date.now();
      }
    }
  }

  loginAsPlayer() {
    const code = document.getElementById('player-code').value.trim().toUpperCase();
    const name = document.getElementById('player-name').value.trim() || `Giocatore_${Date.now().toString().slice(-4)}`;
    
    if (!code) {
      this.showNotification('Inserisci un codice valido', 'error');
      return;
    }
    
    this.showLoading(true);
    
    setTimeout(() => {
      const result = window.tombolaServer.loginPlayer(code, name);
      
      if (result.success) {
        this.user = {
          role: 'player',
          code: code,
          name: result.player.name,
          id: result.player.id,
          cardNumbers: result.player.cardNumbers
        };
        
        this.gameState = result.gameState;
        this.showGameScreen();
        this.showNotification(`Benvenuto ${this.user.name}!`, 'success');
      } else {
        this.showNotification(result.error, 'error');
      }
      
      this.showLoading(false);
    }, 500);
  }

  loginAsAdmin() {
    const code = document.getElementById('admin-code').value.trim();
    
    if (!code) {
      this.showNotification('Inserisci il codice admin', 'error');
      return;
    }
    
    this.showLoading(true);
    
    setTimeout(() => {
      const result = window.tombolaServer.loginAdmin(code);
      
      if (result.success) {
        this.user = {
          role: 'admin',
          code: code,
          name: 'Amministratore',
          id: 'admin'
        };
        
        this.gameState = result.gameState;
        this.showGameScreen();
        this.showNotification('Accesso admin effettuato!', 'success');
      } else {
        this.showNotification(result.error, 'error');
      }
      
      this.showLoading(false);
    }, 500);
  }

  extractNumber() {
    if (this.user?.role !== 'admin') {
      this.showNotification('Solo l\'amministratore può estrarre numeri', 'error');
      return;
    }
    
    const result = window.tombolaServer.extractNumber();
    
    if (result.success) {
      this.gameState = result.gameState;
      this.updateGameUI();
      this.showNotification(`Estratto il numero ${result.number}!`, 'success');
    } else {
      this.showNotification(result.error, 'error');
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
        if (this.user?.role === 'admin' && this.gameState?.gameActive) {
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
    this.gameState = window.tombolaServer.startNewGame();
    
    // Aggiorna numeri carta per il giocatore corrente
    if (this.user?.role === 'player') {
      const player = this.gameState.players.find(p => p.code === this.user.code);
      if (player) {
        this.user.cardNumbers = player.cardNumbers;
      }
    }
    
    this.updateGameUI();
    this.showNotification('Nuova partita iniziata!', 'success');
  }

  generateCodes() {
    const count = parseInt(document.getElementById('codes-count').value) || 5;
    const newCodes = window.tombolaServer.generateCodes(count);
    
    this.gameState = window.tombolaServer.getGameState();
    this.showGeneratedCodesModal(newCodes);
    this.showNotification(`${count} nuovi codici generati!`, 'success');
  }

  logout() {
    if (this.user?.role === 'player') {
      const player = this.gameState.players.find(p => p.code === this.user.code);
      if (player) {
        player.connected = false;
      }
    }
    
    this.user = null;
    this.gameState = null;
    this.showLoginScreen();
    this.showNotification('Logout effettuato', 'info');
  }

  showLoginScreen() {
    document.querySelector('.login-screen').style.display = 'flex';
    document.querySelector('.game-screen').style.display = 'none';
    
    // Reset form
    document.getElementById('player-code').value = '';
    document.getElementById('player-name').value = '';
    document.getElementById('admin-code').value = '';
    
    // Mostra login giocatore di default
    this.showPlayerLogin();
  }

  showGameScreen() {
    document.querySelector('.login-screen').style.display = 'none';
    document.querySelector('.game-screen').style.display = 'block';
    this.updateGameUI();
  }

  showAdminLogin() {
    document.getElementById('player-login').style.display = 'none';
    document.getElementById('admin-login').style.display = 'block';
  }

  showPlayerLogin() {
    document.getElementById('admin-login').style.display = 'none';
    document.getElementById('player-login').style.display = 'block';
  }

  updateGameUI() {
    if (!this.gameState || !this.user) return;

    // Aggiorna info utente
    document.getElementById('user-name').textContent = this.user.name;
    document.getElementById('user-role').textContent = this.user.role === 'admin' ? 'Admin' : 'Giocatore';
    document.getElementById('user-role').className = `user-role role-${this.user.role}`;

    // Aggiorna statistiche
    document.getElementById('numbers-left').textContent = this.gameState.numbersLeft || 90 - (this.gameState.extractedNumbers?.length || 0);
    document.getElementById('extracted-count').textContent = this.gameState.extractedNumbers?.length || 0;
    document.getElementById('players-count').textContent = this.gameState.players?.length || 0;
    document.getElementById('current-turn').textContent = this.getCurrentTurn();

    // Aggiorna display numero
    this.updateNumberDisplay();

    // Aggiorna numeri estratti
    this.updateExtractedNumbers();

    // Aggiorna lista giocatori
    this.updatePlayersList();

    // Aggiorna cartella tombola (per giocatori)
    if (this.user.role === 'player') {
      this.updateTombolaCard();
    }

    // Mostra/nascondi controlli admin
    if (this.user.role === 'admin') {
      document.getElementById('admin-controls').style.display = 'block';
      document.getElementById('player-message').style.display = 'none';
    } else {
      document.getElementById('admin-controls').style.display = 'none';
      document.getElementById('player-message').style.display = 'block';
    }
  }

  updateNumberDisplay() {
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
    
    const players = this.gameState.players || [];
    
    if (players.length === 0) {
      container.innerHTML = '<div style="color: var(--text-secondary); text-align: center; padding: 20px;">Nessun giocatore online</div>';
      return;
    }
    
    players.forEach(player => {
      const card = document.createElement('div');
      card.className = 'player-card';
      if (this.user?.role === 'player' && this.user.code === player.code) {
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
    const container = document.getElementById('tombola-grid');
    container.innerHTML = '';
    
    if (!this.user?.cardNumbers) return;
    
    const numbers = this.user.cardNumbers;
    const extracted = this.gameState.extractedNumbers || [];
    
    for (let i = 0; i < 27; i++) {
      const cell = document.createElement('div');
      const row = Math.floor(i / 9);
      const col = i % 9;
      
      const minNum = col * 10 + 1;
      const maxNum = col * 10 + 10;
      
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
    const players = this.gameState.players || [];
    if (players.length === 0) return '-';
    
    const extractedCount = this.gameState.extractedNumbers?.length || 0;
    return players[extractedCount % players.length]?.name || '-';
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
      item.style.cssText = `
        padding: 10px;
        margin-bottom: 8px;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 6px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      `;
      
      item.innerHTML = `
        <div>
          <strong style="font-family: monospace;">${code.code}</strong>
          ${code.playerName ? `<div style="font-size: 12px; color: var(--text-secondary);">${code.playerName}</div>` : ''}
        </div>
        <div style="
          background: ${code.used ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'};
          color: ${code.used ? 'var(--danger)' : 'var(--success)'};
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
        ">
          ${code.used ? 'Usato' : 'Disponibile'}
        </div>
      `;
      
      container.appendChild(item);
    });
  }

  showGeneratedCodesModal(codes) {
    const container = document.getElementById('generated-codes');
    if (!container) return;
    
    container.innerHTML = '';
    
    codes.forEach(code => {
      const item = document.createElement('div');
      item.style.cssText = `
        padding: 8px;
        margin-bottom: 6px;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 4px;
        font-family: monospace;
      `;
      item.textContent = code.code;
      container.appendChild(item);
    });
    
    this.showModal('generated-codes-modal');
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
    } else {
      this.showNotification('Nessun codice disponibile', 'info');
    }
  }

  showWinnerModal(player) {
    document.getElementById('winner-name').textContent = player.name;
    this.showModal('winner-modal');
  }

  showModal(modalId) {
    const modal = document.getElementById(`${modalId}-overlay`);
    if (modal) {
      modal.style.display = 'flex';
    }
  }

  closeModal(modalId) {
    const modal = document.getElementById(`${modalId}-overlay`);
    if (modal) {
      modal.style.display = 'none';
    }
  }

  showNotification(message, type = 'info') {
    // Rimuovi notifiche precedenti
    const oldNotifications = document.querySelectorAll('.notification');
    oldNotifications.forEach(n => n.remove());
    
    // Crea nuova notifica
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? 'var(--success)' : 
                  type === 'error' ? 'var(--danger)' : 
                  type === 'warning' ? 'var(--warning)' : 'var(--primary)'};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: var(--shadow);
      display: flex;
      align-items: center;
      gap: 10px;
      z-index: 3000;
      animation: slideIn 0.3s ease;
    `;
    
    notification.innerHTML = `
      <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
      <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
          notification.parentNode.removeChild(notification);
        }, 300);
      }
    }, 3000);
    
    // Aggiungi animazioni CSS se non esistono
    if (!document.querySelector('#notification-animations')) {
      const style = document.createElement('style');
      style.id = 'notification-animations';
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }
  }

  showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
  }
}

// Inizializza il gioco quando la pagina è pronta
document.addEventListener('DOMContentLoaded', () => {
  window.tombolaGame = new TombolaGame();
});
