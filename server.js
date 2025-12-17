const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Serve static files
app.use(express.static(path.join(__dirname, '.')));

// Game state
let gameState = {
  adminConnected: false,
  players: [],
  extractedNumbers: [],
  gameActive: false,
  codes: [
    { code: "PLAYER001", used: false, playerName: "" },
    { code: "PLAYER002", used: false, playerName: "" },
    { code: "PLAYER003", used: false, playerName: "" },
    { code: "PLAYER004", used: false, playerName: "" },
    { code: "PLAYER005", used: false, playerName: "" }
  ],
  lastExtracted: null,
  winner: null
};

// Socket.io connections
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Send current game state to new client
  socket.emit('game-state', gameState);

  // Handle player login
  socket.on('player-login', (data) => {
    const { code, name } = data;
    const codeEntry = gameState.codes.find(c => c.code === code);
    
    if (codeEntry) {
      // Check if player already exists
      let player = gameState.players.find(p => p.code === code);
      
      if (!player) {
        // Generate card numbers
        const cardNumbers = generateCardNumbers();
        
        player = {
          id: socket.id,
          code: code,
          name: name || `Giocatore ${gameState.players.length + 1}`,
          cardNumbers: cardNumbers,
          extractedCount: 0,
          connected: true,
          hasWon: false
        };
        
        gameState.players.push(player);
        codeEntry.used = true;
        codeEntry.playerName = player.name;
      } else {
        // Reconnection
        player.connected = true;
        player.id = socket.id;
      }
      
      socket.emit('login-success', { player, gameState });
      socket.join('players');
      io.emit('players-update', gameState.players.filter(p => p.connected));
      io.emit('game-update', gameState);
      
      console.log(`Player ${player.name} logged in`);
    } else {
      socket.emit('login-error', 'Codice non valido');
    }
  });

  // Handle admin login
  socket.on('admin-login', (data) => {
    const { code } = data;
    
    if (code === "PYTHON2024_ADMIN") {
      gameState.adminConnected = true;
      socket.join('admin');
      socket.emit('admin-login-success', gameState);
      io.emit('game-update', gameState);
      console.log('Admin logged in');
    } else {
      socket.emit('login-error', 'Codice admin non valido');
    }
  });

  // Handle number extraction
  socket.on('extract-number', () => {
    if (gameState.extractedNumbers.length < 90) {
      // Generate remaining numbers if not already done
      if (!gameState.remainingNumbers) {
        gameState.remainingNumbers = Array.from({length: 90}, (_, i) => i + 1)
          .sort(() => Math.random() - 0.5);
      }
      
      const extracted = gameState.remainingNumbers.pop();
      gameState.extractedNumbers.push(extracted);
      gameState.lastExtracted = extracted;
      
      // Update players' counts
      gameState.players.forEach(player => {
        if (player.cardNumbers.includes(extracted)) {
          player.extractedCount += 1;
          
          // Check for winner
          if (player.extractedCount === 15 && !player.hasWon) {
            player.hasWon = true;
            gameState.winner = player;
            io.emit('winner', player);
          }
        }
      });
      
      io.emit('number-extracted', {
        number: extracted,
        gameState: gameState
      });
      
      console.log(`Number ${extracted} extracted`);
    }
  });

  // Handle new game
  socket.on('new-game', () => {
    gameState.extractedNumbers = [];
    gameState.remainingNumbers = Array.from({length: 90}, (_, i) => i + 1)
      .sort(() => Math.random() - 0.5);
    gameState.lastExtracted = null;
    gameState.winner = null;
    gameState.gameActive = true;
    
    // Reset players
    gameState.players.forEach(player => {
      player.cardNumbers = generateCardNumbers();
      player.extractedCount = 0;
      player.hasWon = false;
    });
    
    io.emit('game-update', gameState);
    console.log('New game started');
  });

  // Generate codes
  socket.on('generate-codes', (count) => {
    const newCodes = [];
    const start = gameState.codes.length + 1;
    
    for (let i = start; i < start + count; i++) {
      newCodes.push({
        code: `PLAYER${i.toString().padStart(3, '0')}`,
        used: false,
        playerName: ""
      });
    }
    
    gameState.codes.push(...newCodes);
    socket.emit('codes-generated', newCodes);
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    // Mark player as disconnected
    const player = gameState.players.find(p => p.id === socket.id);
    if (player) {
      player.connected = false;
      io.emit('players-update', gameState.players.filter(p => p.connected));
    }
    
    console.log('Client disconnected:', socket.id);
  });
});

// Helper function to generate card numbers
function generateCardNumbers() {
  const numbers = new Set();
  while (numbers.size < 15) {
    numbers.add(Math.floor(Math.random() * 90) + 1);
  }
  return Array.from(numbers).sort((a, b) => a - b);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
