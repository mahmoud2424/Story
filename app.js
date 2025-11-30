// Global Variables and Constants
const GAMES_JSON_PATH = 'games.json';
const PUZZLE_BOARD_ID = 'puzzle-board';
const GAME_LIST_CONTAINER = document.getElementById('game-list');
const GAME_AREA = document.getElementById('game-area');
const GAME_TITLE = document.getElementById('game-title');
const CELEBRATION_CONTAINER = document.getElementById('celebration-container'); 

let gamesData = [];
let currentPieceOrder = [];
let selectedPiece = null;
let currentPuzzle = null;

// --- 1. Utility Functions ---

/**
 * Loads game data from the JSON file.
 */
async function loadGamesData() {
    try {
        const response = await fetch(GAMES_JSON_PATH);
        if (!response.ok) {
            // Handle HTTP errors (e.g., 404 Not Found)
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        gamesData = await response.json();
        renderGameList();
    } catch (error) {
        console.error('Error loading game data:', error);
        // Display a fallback message if loading fails
        GAME_LIST_CONTAINER.innerHTML = `<p style="text-align:center; color:red;">Failed to load data: Check games.json file path and Live Server status.</p>`;
    }
}

/**
 * Shuffles an array (Fisher-Yates algorithm).
 * @param {Array} array 
 * @returns {Array} Shuffled array
 */
function shuffle(array) {
    let currentIndex = array.length, randomIndex;
    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
}

// --- 2. Rendering Functions ---

/**
 * Creates and displays the puzzle game card on the homepage.
 */
function renderGameList() {
    // Find the puzzle game data
    const puzzleGame = gamesData.find(game => game.type === 'puzzle');

    if (!puzzleGame) {
        console.warn('No puzzle game found in games.json.');
        return;
    }

    // Create the structure for the puzzle card (App.js creates this)
    const cardDiv = document.createElement('div');
    cardDiv.className = 'story-card game-card'; 
    cardDiv.dataset.gameId = puzzleGame.id;

    cardDiv.innerHTML = `
        <img src="${puzzleGame.thumbnail}" alt="${puzzleGame.title}">
        <h3>${puzzleGame.title.toUpperCase()}</h3>
    `;

    // Append the card to the list container (below the article and story card)
    GAME_LIST_CONTAINER.appendChild(cardDiv); 

    // Add event listener to start the game
    cardDiv.addEventListener('click', () => {
        currentPuzzle = puzzleGame;
        startGame(puzzleGame);
    });
}

/**
 * Initiates the puzzle game view.
 * @param {Object} gameData 
 */
function startGame(gameData) {
    // 1. Hide the homepage and show the game area
    GAME_LIST_CONTAINER.classList.add('hidden');
    GAME_AREA.classList.remove('hidden');
    
    // 2. Set the title
    GAME_TITLE.textContent = gameData.title;

    // 3. Show puzzle container and setup controls
    document.getElementById('puzzle-container').classList.remove('hidden');
    document.getElementById('next-puzzle-btn').classList.remove('hidden');
    document.getElementById('feedback-message').textContent = 'Ready to play?';
    
    // 4. Initialize the puzzle
    initializePuzzle(gameData);

    // 5. Setup controls
    document.getElementById('next-puzzle-btn').onclick = () => {
        initializePuzzle(gameData); 
    };

    // 6. Setup Home button visibility
    document.getElementById('home-btn').style.display = 'block';
}

/**
 * Initializes/shuffles the puzzle board with pieces.
 * @param {Object} gameData 
 */
function initializePuzzle(gameData) {
    const board = document.getElementById(PUZZLE_BOARD_ID);
    board.innerHTML = ''; // Clear previous board

    const pieces = gameData.pieces;
    const rows = gameData.rows;
    const cols = gameData.cols;
    const image = gameData.image;

    // Create piece order array (0 to pieces-1)
    currentPieceOrder = Array.from({ length: pieces }, (_, i) => i);
    
    // Shuffle the piece IDs 
    shuffle(currentPieceOrder);

    // Reset selection and feedback
    selectedPiece = null;
    document.getElementById('feedback-message').textContent = 'Puzzle shuffled!';
    CELEBRATION_CONTAINER.innerHTML = ''; // Clear celebration artifacts

    // Calculate background sizes and positions (must match CSS width/height for precision)
    const boardWidth = 450; 
    const boardHeight = 300; 
    const pieceWidth = boardWidth / cols;
    const pieceHeight = boardHeight / rows;

    for (let i = 0; i < pieces; i++) {
        const piece = document.createElement('div');
        piece.className = 'puzzle-piece';
        piece.dataset.currentId = currentPieceOrder[i]; // The piece this tile currently holds (0-3 shuffled)
        piece.dataset.correctId = i; // The correct position for this tile (0-3 linear)

        // Calculate background position based on the CURRENT ID (where the piece comes from)
        const currentPieceId = currentPieceOrder[i];
        const bgX = (currentPieceId % cols) * pieceWidth;
        const bgY = Math.floor(currentPieceId / cols) * pieceHeight;

        piece.style.backgroundImage = `url(${image})`;
        piece.style.backgroundSize = `${boardWidth}px ${boardHeight}px`; 
        piece.style.backgroundPosition = `-${bgX}px -${bgY}px`; // Shift to show the correct part

        piece.addEventListener('click', handlePieceClick);
        board.appendChild(piece);
    }
}


// --- 3. Game Logic Functions ---

/**
 * Handles clicks on puzzle pieces for swapping.
 * @param {Event} e 
 */
function handlePieceClick(e) {
    const clickedPiece = e.currentTarget;
    const feedback = document.getElementById('feedback-message');
    
    if (selectedPiece === clickedPiece) {
        // Deselect
        selectedPiece.classList.remove('selected');
        selectedPiece = null;
        feedback.textContent = 'Piece deselected.';
        return;
    }

    if (selectedPiece === null) {
        // Select first piece
        selectedPiece = clickedPiece;
        selectedPiece.classList.add('selected');
        feedback.textContent = 'Piece selected. Now choose the piece to swap with.';
    } else {
        // Swap logic
        swapPieces(selectedPiece, clickedPiece);
        
        // Deselect both
        selectedPiece.classList.remove('selected');
        clickedPiece.classList.remove('selected');
        selectedPiece = null;

        // Check for win condition
        if (checkWinCondition()) {
            feedback.textContent = '🥳 Fantastic! You solved the puzzle!';
            launchCelebration();
        } else {
            feedback.textContent = 'Pieces swapped.';
        }
    }
}

/**
 * Swaps the content (background/position data) of two DOM elements.
 * @param {HTMLElement} piece1 
 * @param {HTMLElement} piece2 
 */
function swapPieces(piece1, piece2) {
    // 1. Swap data attributes (the identity of the content)
    const tempCurrentId = piece1.dataset.currentId;
    piece1.dataset.currentId = piece2.dataset.currentId;
    piece2.dataset.currentId = tempCurrentId;
    
    // 2. Swap visual background position (the display)
    const tempBgPosition = piece1.style.backgroundPosition;
    piece1.style.backgroundPosition = piece2.style.backgroundPosition;
    piece2.style.backgroundPosition = tempBgPosition;
}

/**
 * Checks if all pieces are in their correct positions.
 * @returns {boolean} True if puzzle is solved.
 */
function checkWinCondition() {
    const board = document.getElementById(PUZZLE_BOARD_ID);
    const pieces = Array.from(board.children);

    // The puzzle is solved if the current ID of the content matches the correct position ID.
    return pieces.every(piece => piece.dataset.currentId === piece.dataset.correctId);
}

// --- 4. Effects and Navigation ---

/**
 * Celebratory effect (e.g., balloons).
 */
function launchCelebration() {
    // FIX: Clear the container before generating new balloons
    CELEBRATION_CONTAINER.innerHTML = ''; 

    const colors = ['#FF6B6B', '#FFE66D', '#4ECDC4', '#5BC0EB', '#2ECC71'];

    for (let i = 0; i < 10; i++) {
        const balloon = document.createElement('div');
        balloon.className = 'balloon';
        balloon.style.left = `${Math.random() * 100}vw`;
        balloon.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        balloon.style.animationDelay = `${Math.random() * 1.5}s`;
        CELEBRATION_CONTAINER.appendChild(balloon);

        // Remove balloon after animation to clean up DOM
        balloon.addEventListener('animationend', () => balloon.remove());
    }
}

/**
 * Navigates back to the homepage.
 */
function goHome() {
    // Hide game area and show game list
    GAME_AREA.classList.add('hidden');
    GAME_LIST_CONTAINER.classList.remove('hidden');
    
    // Hide the game-specific elements
    document.getElementById('puzzle-container').classList.add('hidden');
    document.getElementById('feedback-message').textContent = '';
    document.getElementById('home-btn').style.display = 'none';

    // FIX: Clear celebration artifacts when going home
    CELEBRATION_CONTAINER.innerHTML = '';
}


// --- 5. Initialization ---

// Set up the Home button listener
document.getElementById('home-btn').addEventListener('click', goHome);

// Start the application by loading data
loadGamesData();