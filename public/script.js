const socket = io();

let gameId;
let symbol;
let selectedMoves = [];

const board = document.getElementById('board');
const status = document.getElementById('status');
const lockButton = document.getElementById('lock-button');
const newGameButton = document.getElementById('new-game-button');
const symbolDisplay = document.getElementById('symbol-display');

function createBoard() {
    board.innerHTML = '';
    for (let i = 0; i < 9; i++) {
        const cell = document.createElement('div');
        cell.classList.add('cell');
        cell.dataset.index = i;
        cell.addEventListener('click', handleCellClick);
        board.appendChild(cell);
    }
    // Disable the board initially
    disableBoard();
}

function handleCellClick(event) {
    const index = parseInt(event.target.dataset.index);
    if (selectedMoves.includes(index)) {
        selectedMoves = selectedMoves.filter(move => move !== index);
        event.target.textContent = '';
        event.target.classList.remove('selected');
    } else if (selectedMoves.length < 2 && !event.target.textContent) {
        selectedMoves.push(index);
        event.target.textContent = symbol;
        event.target.classList.add('selected');
    }

    lockButton.disabled = selectedMoves.length !== 2;
}

lockButton.addEventListener('click', () => {
    socket.emit('move', { gameId, moves: selectedMoves });
    lockButton.disabled = true;
    selectedMoves = [];
    // Removed the code that clears selected spots
});

newGameButton.addEventListener('click', () => {
    socket.emit('newGame', gameId);
});

socket.on('waiting', () => {
    status.textContent = 'Waiting for another player...';
    disableBoard();
});

socket.on('gameStart', (data) => {
    gameId = data.gameId;
    symbol = data.symbol;
    status.textContent = `Game started!`;
    createBoard();
    enableBoard();
    lockButton.disabled = false;
    updateSymbolDisplay(); // Update symbol display
});

socket.on('boardUpdate', (data) => {
    updateBoard(data.board);
    status.textContent = `Turn ${data.turn + 1}`;
    lockButton.disabled = false;
    enableBoard();
});

socket.on('gameOver', (data) => {
    if (data.winner) {
        status.textContent = `Game Over! ${data.winner} wins!`;
    } else {
        status.textContent = "Game Over! It's a draw!";
    }
    lockButton.disabled = true;
    disableBoard();
    newGameButton.style.display = 'inline-block';
});

socket.on('newGame', (data) => {
    updateBoard(data.board);
    status.textContent = `New game started. Turn ${data.turn + 1}`;
    lockButton.disabled = false;
    enableBoard();
    newGameButton.style.display = 'none';
});

function updateBoard(boardState) {
    const cells = document.querySelectorAll('.cell');
    cells.forEach((cell, index) => {
        cell.textContent = boardState[index] || '';
        cell.classList.remove('selected');
    });
}

function disableBoard() {
    const cells = document.querySelectorAll('.cell');
    cells.forEach(cell => {
        cell.removeEventListener('click', handleCellClick);
        cell.style.pointerEvents = 'none';
    });
}

function enableBoard() {
    const cells = document.querySelectorAll('.cell');
    cells.forEach(cell => {
        cell.addEventListener('click', handleCellClick);
        cell.style.pointerEvents = 'auto';
    });
}

function updateSymbolDisplay() {
    symbolDisplay.textContent = `You are placing: ${symbol}`;
    board.parentNode.insertBefore(symbolDisplay, board);
}

createBoard();
