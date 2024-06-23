const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

let waitingPlayer = null;
let games = {};

io.on('connection', (socket) => {
  console.log(`New connection: ${socket.id}`);

  if (waitingPlayer) {
    // Start a new game
    const gameId = Math.random().toString(36).substring(7);
    games[gameId] = {
      players: [waitingPlayer, socket],
      board: Array(9).fill(null),
      moves: [null, null],
      turn: 0
    };

    waitingPlayer.join(gameId);
    socket.join(gameId);

    console.log(`Game started: ${gameId}`);
    console.log(`Players: ${waitingPlayer.id} (X) and ${socket.id} (O)`);

    waitingPlayer.emit('gameStart', { symbol: 'X', gameId });
    socket.emit('gameStart', { symbol: 'O', gameId });

    waitingPlayer = null;
  } else {
    waitingPlayer = socket;
    socket.emit('waiting');
    console.log(`Player waiting: ${socket.id}`);
  }

  socket.on('move', ({ gameId, moves }) => {
    console.log(`Move received: Game ${gameId}, Player ${socket.id}, Moves ${moves}`);
    const game = games[gameId];
    if (!game) {
      console.log(`Game not found: ${gameId}`);
      return;
    }

    const playerIndex = game.players.indexOf(socket);
    game.moves[playerIndex] = moves;

    if (game.moves[0] && game.moves[1]) {
      console.log(`Both players moved: Game ${gameId}`);
      // Both players have made their moves
      const newBoard = [...game.board];
      for (let i = 0; i < 9; i++) {
        if (game.moves[0].includes(i) && !game.moves[1].includes(i)) {
          newBoard[i] = 'X';
        } else if (game.moves[1].includes(i) && !game.moves[0].includes(i)) {
          newBoard[i] = 'O';
        }
      }

      game.board = newBoard;
      game.moves = [null, null];
      game.turn++;
      io.to(gameId).emit('boardUpdate', { board: newBoard, turn: game.turn });

      console.log(`Board updated: Game ${gameId}, Turn ${game.turn}`);
      console.log(`New board state: ${newBoard}`);

      const winner = checkWinner(newBoard);
      const emptySpots = newBoard.filter(cell => cell === null).length;

      if (winner || game.turn === 5 || emptySpots <= 2) {
        console.log(`Game over: ${gameId}`);
        console.log(`Winner: ${winner || 'None'}, Stalemate: ${!winner && (game.turn === 5 || emptySpots <= 2)}`);
        io.to(gameId).emit('gameOver', { winner: winner, stalemate: !winner && (game.turn === 5 || emptySpots <= 2) });
      }
    }
  });

  socket.on('newGame', (gameId) => {
    console.log(`New game requested: ${gameId}`);
    const game = games[gameId];
    if (!game) {
      console.log(`Game not found: ${gameId}`);
      return;
    }

    game.board = Array(9).fill(null);
    game.moves = [null, null];
    game.turn = 0;

    console.log(`New game started: ${gameId}`);
    io.to(gameId).emit('newGame', { board: game.board, turn: game.turn });
  });

  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    if (waitingPlayer === socket) {
      waitingPlayer = null;
      console.log('Waiting player removed');
    }
  });
});

function checkWinner(board) {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }

  return null;
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
