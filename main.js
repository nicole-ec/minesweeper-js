//The following code was referenced from Pavol Federl's Lights Out game, with many changes: https://gitlab.com/seng513/lights-out-game
//Code used to detect if it's a mobile device: https://www.w3schools.com/howto/howto_js_media_queries.asp
//Timer code referenced from Emmanuel Onu's jsfiddle: https://jsfiddle.net/emmynex2007/wt2nx8f7/#
let game = new MSGame();
window.addEventListener('load', main);
let startTime, endTime, longpress;
let fireClick = true;
let t = 0;
let timer = null;
let startingGame = false;


/**
 * creates the timer for the game
 * - based on Emmanuel Onu's timer code
 * */
function startTimer() {
    timer = setInterval(function () {
        if (t >= 999) {
            window.clearInterval(timer);
        }
        else {
            t++;
            document.getElementById("timer-text").innerHTML = ('000' + t).substr(-3);
        }
    }, 1000);
}

/**
 * creates largest board (24x20)
 * - assign correct mouse events based on screen size (ASSUMED MOBILE DEVICE SCREEN < 1024px)
 *
 * @param {state} s
 */
function prepare_dom(s) {
    startingGame = true;
    const grid = document.querySelector(".grid");
    const nCards = 24 * 20; // max grid size
    for (let i = 0; i < nCards; i++) {
        const card = document.createElement("div");
        card.className = "card";
        card.setAttribute("data-cardInd", i);
        card.addEventListener("click", async () => {
            if (fireClick) {
                squareClickCallback(s, card, i, false);
            }
            fireClick = true;
        });

        let isMobile = window.matchMedia("(max-width: 1024px)");

        if (isMobile.matches) {
            //I imported jquery mobile specifically for this one event ; _ ;
            $(card).on("taphold", function (e) {
                fireClick = false;
                squareClickCallback(s, card, i, true);
            });
            $(card).on("contextmenu", function (e) {
                e.preventDefault();
            });
        }
        else {
            //right-click event
            card.addEventListener("contextmenu", (e) => {
                e.preventDefault();
                squareClickCallback(s, card, i, true);
            });
        }

        grid.appendChild(card);
    }
}

/**
 * Renders whole game
 * - displays status of mine locations based on square clicked
 * - remove flags on uncovered safe squares
 * - show bombs if uncovered mine squares
 * - updates flag count
 *
 * @param {object} s
 */
function render(gameState, card_div) {
    let index = 0;

    for (let row = 0; row < gameState.nrows; row++) {
        for (let col = 0; col < gameState.ncols; col++) {

            let item = gameState.arr[row][col];
            let square = document.querySelector(`[data-cardInd="${index}"]`);

            if (gameState.exploded && item.mine) {
                square.style.backgroundImage = "url('bomb.png')";
            }
            else if (item.state === "shown" && !item.mine) {
                square.style.backgroundColor = "#99c7b1";

                //if the square was originally marked, remove it now
                if (square.style.backgroundImage.indexOf("flag") > -1) gameState.nmarked--;
                square.style.backgroundImage = "";

                if (item.count > 0) {
                    let num = item.count;
                    square.style.backgroundColor = "#5bd49b";
                    square.style.backgroundImage = `url("${num}.png")`;
                }
            }
            index++;
        }
    }
    document.querySelector("#flag-text").innerHTML = gameState.nmines - gameState.nmarked;
}

/**
 * Renders a fresh minesweeper board.
 * @param {any} s
 */
function renderNewGame(s) {
    const grid = document.querySelector(".grid");
    grid.style.gridTemplateColumns = `repeat(${s.ncols}, 1fr)`;
    grid.style.gridTemplateRows = `repeat(${s.nrows}, 1fr)`;
    for (let i = 0; i < grid.children.length; i++) {
        const card = grid.children[i];
        const ind = Number(card.getAttribute("data-cardInd"));
        card.style.backgroundImage = "";
        card.style.backgroundColor = "#00bd65";
        if (ind >= s.nrows * s.ncols) {
            card.style.display = "none";
        }
        else {
            card.style.display = "block";
        }
    }
}

/**
 * callback function for a square
 * - mark or uncover a square
 * - render new game state
 * - check for winning/losing condition
 * @param {state} s
 * @param {HTMLElement} card_div
 * @param {number} ind
 */
function squareClickCallback(s, card_div, ind, mark) {
    const ncol = ind % s.ncols;
    const nrow = Math.floor(ind / s.ncols);

    //if this is a new game, start the timer
    if (startingGame) {
        startTimer();
        startingGame = false;
    }

    //do different things for flagging and uncovering a square
    if (mark) {
        let success = s.mark(nrow, ncol);
        let state = s.arr[nrow][ncol].state;
        if (success && state === "marked") card_div.style.backgroundImage = `url("flag.png")`;
        else card_div.style.backgroundImage = "";
    }
    else {
        s.uncover(nrow, ncol);
    }

    render(s, card_div);
    game.getStatus();

    //check losing and winning conditions
    if (s.exploded) {
        document.querySelector("#overlay-lose").classList.toggle("active");
        window.clearInterval(timer);
    }
    else if (isPlayerWin(s)) {
        document.querySelector("#overlay-win").classList.toggle("active");
        showRemainingBombs(s)
        window.clearInterval(timer);
    }
}

/**
  * Show remaining bombs
  * - if the square state is hidden and it's a bomb, show the bomb
  */
function showRemainingBombs(gameState) {
  let index = 0;
  for (let i = 0; i < gameState.arr.length; i++) {
      for (let j = 0; j < gameState.arr[i].length; j++) {
          square = gameState.arr[i][j];
          //if the square is a mine and it's state is hidden, assign bomb img
          if (square.state === "hidden" && square.mine) {
              let element = document.querySelector(`[data-cardInd="${index}"]`);
              element.style.backgroundImage = "url('bomb.png')";
          }
          index++;
      }
  }
}

/**
 * Returns true if all non-mine squares have been uncovered
 * @param {any} gameState
 */
function isPlayerWin(gameState) {
    let won = true;
    for (let i = 0; i < gameState.arr.length; i++) {
        for (let j = 0; j < gameState.arr[i].length; j++) {
            //if there is at least one square that is not a mine and is hidden, not won. else won
            square = gameState.arr[i][j];
            if (square.state === "hidden" && !square.mine) {
                won = false;
                break;
            }
        }
    }
    return won;
}

/**
 * callback for difficulty modes
 * - renders a new game with corresponding difficulty level
 *
 * @param {state} s
 * @param {number} cols
 * @param {number} rows
 */
function menuButtonCallback(s, cols, rows, mines) {
    game.init(rows, cols, mines);

    //set the number of flags available
    document.querySelector("#flag-text").innerHTML = game.nmines;
    window.clearInterval(timer);

    //reset the timer
    document.getElementById("timer-text").innerHTML = '000'
    renderNewGame(game);

    startingGame = true;
    t = 0;
}

/**
  * This code adds event listeners and starts the game off on easy mode.
  */
function main() {
    // register callbacks for buttons
    document.querySelectorAll(".menuButton").forEach((button) => {
        [rows, cols] = button.getAttribute("data-size").split("x").map(s => Number(s));
        let mines = Number(button.getAttribute("mines"));
        button.addEventListener("click", menuButtonCallback.bind(null, game, cols, rows, mines));
    });

    // callback for overlay click - hide overlay and regenerate game
    document.querySelectorAll(".overlay").forEach((overlay) => {
        overlay.addEventListener("click", () => {
            menuButtonCallback(game, game.ncols, game.nrows, game.nmines);
            overlay.classList.remove("active");
        });
    });

    // create enough cards for largest game and register click callbacks
    prepare_dom(game);

    // simulate pressing 4x4 button to start new game
    menuButtonCallback(game, game.ncols, game.nrows, game.nmines);
}
