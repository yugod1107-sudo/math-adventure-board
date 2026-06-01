const boardSize = 30;

const characters = [
  { id: "penguin", name: "企鵝", face: "🐧" },
  { id: "raccoon", name: "浣熊", face: "🦝" },
  { id: "deer", name: "花鹿", face: "🦌" },
  { id: "dolphin", name: "海豚", face: "🐬" },
];

const playerColors = ["p0", "p1", "p2", "p3"];

const specialTiles = {
  5: { type: "star", label: "星星格，前進 2 格" },
  9: { type: "bomb", label: "炸彈格，後退 1 格" },
  14: { type: "gift", label: "禮物格，下一次答對多走 1 格" },
  19: { type: "star", label: "星星格，前進 2 格" },
  23: { type: "bomb", label: "炸彈格，後退 1 格" },
  27: { type: "gift", label: "禮物格，下一次答對多走 1 格" },
};

const state = {
  selectedPlayers: 1,
  difficulty: "easy",
  selectedCharacters: ["penguin", "raccoon", "deer", "dolphin"],
  players: [],
  currentPlayerIndex: 0,
  currentQuestion: null,
  canRoll: false,
  isRolling: false,
  isMoving: false,
  movingPlayerIndex: null,
  isGameOver: false,
};

const boardEl = document.querySelector("#board");
const setupView = document.querySelector("#setupView");
const gameView = document.querySelector("#gameView");
const startButton = document.querySelector("#startButton");
const restartButton = document.querySelector("#restartButton");
const rollButton = document.querySelector("#rollButton");
const diceValue = document.querySelector("#diceValue");
const questionText = document.querySelector("#questionText");
const questionTag = document.querySelector("#questionTag");
const answersEl = document.querySelector("#answers");
const messageBox = document.querySelector("#messageBox");
const turnLabel = document.querySelector("#turnLabel");
const statusLabel = document.querySelector("#statusLabel");
const characterSetup = document.querySelector("#characterSetup");

document.querySelectorAll(".player-count").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".player-count").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    state.selectedPlayers = Number(button.dataset.players);
    renderCharacterSetup();
  });
});

document.querySelectorAll(".difficulty-option").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".difficulty-option").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    state.difficulty = button.dataset.difficulty;
  });
});

startButton.addEventListener("click", startGame);
restartButton.addEventListener("click", () => {
  setupView.classList.remove("hidden");
  gameView.classList.add("hidden");
  turnLabel.textContent = "準備開始";
  statusLabel.textContent = "選擇玩家人數";
  renderCharacterSetup();
});
rollButton.addEventListener("click", rollDice);

renderCharacterSetup();

function renderCharacterSetup() {
  characterSetup.innerHTML = "";

  for (let playerIndex = 0; playerIndex < state.selectedPlayers; playerIndex += 1) {
    const row = document.createElement("div");
    row.className = "character-row";
    row.innerHTML = `
      <div class="character-row-title">玩家 ${playerIndex + 1}</div>
      <div class="character-options"></div>
    `;

    const options = row.querySelector(".character-options");
    characters.forEach((character) => {
      const button = document.createElement("button");
      button.className = `character-option ${
        state.selectedCharacters[playerIndex] === character.id ? "active" : ""
      }`;
      button.type = "button";
      button.innerHTML = `
        <span class="character-face">${character.face}</span>
        <span class="character-name">${character.name}</span>
      `;
      button.addEventListener("click", () => {
        state.selectedCharacters[playerIndex] = character.id;
        renderCharacterSetup();
      });
      options.appendChild(button);
    });

    characterSetup.appendChild(row);
  }
}

function startGame() {
  state.players = Array.from({ length: state.selectedPlayers }, (_, index) => {
    const character = findCharacter(state.selectedCharacters[index]);
    return {
      name: `玩家 ${index + 1}`,
      character,
      position: 1,
      correct: 0,
      bonusSteps: 0,
    };
  });
  state.currentPlayerIndex = 0;
  state.canRoll = false;
  state.isGameOver = false;
  renderDice(null);
  setupView.classList.add("hidden");
  gameView.classList.remove("hidden");
  renderBoard();
  nextQuestion();
}

function renderBoard() {
  boardEl.innerHTML = "";
  for (let tile = 1; tile <= boardSize; tile += 1) {
    const cell = document.createElement("div");
    const special = specialTiles[tile];
    cell.className = `tile ${special ? `special-${special.type}` : ""}`;
    cell.innerHTML = `
      <span class="tile-number">${tile}</span>
      ${special ? `<span class="tile-icon tile-icon-${special.type}" title="${special.label}"></span>` : ""}
      <div class="pieces"></div>
    `;
    cell.dataset.tile = String(tile);
    boardEl.appendChild(cell);
  }
  placePieces();
}

function placePieces() {
  document.querySelectorAll(".pieces").forEach((slot) => {
    slot.innerHTML = "";
  });

  state.players.forEach((player, index) => {
    const tile = document.querySelector(`[data-tile="${player.position}"] .pieces`);
    if (!tile) return;
    const piece = document.createElement("span");
    piece.className = `piece ${playerColors[index]} ${state.movingPlayerIndex === index ? "piece-moving" : ""}`;
    piece.title = `${player.name} ${player.character.name}`;
    piece.textContent = player.character.face;
    tile.appendChild(piece);
  });
}

function renderPlayers() {
  updateTurnDisplay();
}

function nextQuestion() {
  const player = currentPlayer();
  state.currentQuestion = createQuestion();
  state.canRoll = false;
  rollButton.disabled = true;
  renderDice(null);
  updateTurnDisplay();
  statusLabel.textContent = "請選答案";
  questionTag.textContent = "本回合題目";
  questionText.textContent = state.currentQuestion.text;
  messageBox.textContent = "答對後就可以擲骰子前進。";
  renderAnswers(state.currentQuestion);
  renderPlayers();
}

function renderAnswers(question) {
  answersEl.innerHTML = "";
  question.choices.forEach((choice) => {
    const button = document.createElement("button");
    button.className = "answer-button";
    button.textContent = choice;
    button.addEventListener("click", () => chooseAnswer(button, choice));
    answersEl.appendChild(button);
  });
}

function chooseAnswer(button, answer) {
  if (state.canRoll || state.isMoving || state.isGameOver) return;

  const buttons = [...document.querySelectorAll(".answer-button")];
  buttons.forEach((item) => {
    item.disabled = true;
    if (Number(item.textContent) === state.currentQuestion.answer) item.classList.add("correct");
  });

  if (answer === state.currentQuestion.answer) {
    currentPlayer().correct += 1;
    button.classList.add("correct");
    state.canRoll = true;
    rollButton.disabled = false;
    statusLabel.textContent = "答對了，可以擲骰子";
    messageBox.textContent = "很棒！按下擲骰子，看看可以前進幾格。";
  } else {
    button.classList.add("wrong");
    statusLabel.textContent = "再想想，換下一位";
    messageBox.textContent = `差一點，正確答案是 ${state.currentQuestion.answer}。下一回合再挑戰。`;
    window.setTimeout(nextTurn, 1400);
  }
  renderPlayers();
}

function rollDice() {
  if (!state.canRoll || state.isRolling || state.isMoving || state.isGameOver) return;
  const player = currentPlayer();
  const roll = randomInt(1, 6);
  const bonus = player.bonusSteps;
  player.bonusSteps = 0;
  state.isRolling = true;
  state.canRoll = false;
  rollButton.disabled = true;
  statusLabel.textContent = "骰子轉動中";
  messageBox.textContent = `${player.name} 正在擲骰子...`;
  diceValue.classList.add("rolling");

  let ticks = 0;
  const timer = window.setInterval(() => {
    renderDice(randomInt(1, 6));
    ticks += 1;

    if (ticks < 12) return;

    window.clearInterval(timer);
    diceValue.classList.remove("rolling");
    renderDice(roll, bonus);
    state.isRolling = false;
    const totalSteps = roll + bonus;
    messageBox.textContent = bonus
      ? `${player.name} 擲到 ${roll}，加上禮物獎勵 ${bonus} 格，一共前進 ${totalSteps} 格！`
      : `${player.name} 擲到 ${roll}，準備前進 ${totalSteps} 格！`;
    window.setTimeout(() => movePlayer(totalSteps), 1600);
  }, 70);
}

async function movePlayer(steps) {
  const player = currentPlayer();
  await animatePlayerSteps(player, steps, 1);

  if (player.position >= boardSize) {
    endGame(player);
    return;
  }

  const special = specialTiles[player.position];
  if (!special) {
    messageBox.textContent = `${player.name} 前進 ${steps} 格，換下一位。`;
    window.setTimeout(nextTurn, 2300);
    return;
  }

  await applySpecialTile(player, special);
}

async function applySpecialTile(player, special) {
  if (special.type === "star") {
    messageBox.textContent = `${player.name} 踩到星星格，前進 2 格！`;
    await sleep(900);
    await animatePlayerSteps(player, 2, 1);
  }

  if (special.type === "bomb") {
    messageBox.textContent = `${player.name} 踩到炸彈格，後退 1 格。`;
    await sleep(900);
    await animatePlayerSteps(player, 1, -1);
  }

  if (special.type === "gift") {
    player.bonusSteps += 1;
    messageBox.textContent = `${player.name} 拿到禮物，下次答對多走 1 格！`;
  }

  if (player.position >= boardSize) {
    endGame(player);
    return;
  }
  window.setTimeout(nextTurn, 2500);
}

function nextTurn() {
  if (state.isGameOver) return;
  state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
  nextQuestion();
}

function endGame(player) {
  state.isGameOver = true;
  questionTag.textContent = "遊戲結束";
  questionText.textContent = `${player.character.face} ${player.name} 獲勝！`;
  answersEl.innerHTML = "";
  statusLabel.textContent = "抵達終點";
  messageBox.textContent = `${player.name} 先到達第 ${boardSize} 格，完成數學探險。`;
}

function currentPlayer() {
  return state.players[state.currentPlayerIndex];
}

function updateTurnDisplay() {
  const player = currentPlayer();
  if (!player) return;
  turnLabel.innerHTML = `
    ${renderTurnAvatar(player.character)}
    <span class="turn-copy">
      <span class="turn-kicker">輪到這位探險家</span>
      <span class="turn-name">${player.name}・${player.character.name}</span>
    </span>
  `;
}

async function animatePlayerSteps(player, steps, direction) {
  const playerIndex = state.players.indexOf(player);
  state.isMoving = true;
  state.movingPlayerIndex = playerIndex;
  statusLabel.textContent = direction > 0 ? "棋子前進中" : "棋子後退中";

  for (let step = 0; step < steps; step += 1) {
    const nextPosition = player.position + direction;
    player.position = Math.max(1, Math.min(boardSize, nextPosition));
    placePieces();
    await sleep(360);
    if (player.position === boardSize || player.position === 1) break;
  }

  state.movingPlayerIndex = null;
  state.isMoving = false;
  placePieces();
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function renderTurnAvatar(character) {
  const avatarPath = `assets/avatar-${character.id}.png`;
  return `
    <span class="turn-avatar avatar-${character.id}" aria-label="${character.name}">
      <img class="turn-photo" src="${avatarPath}" alt="${character.name}" />
    </span>
  `;
}

function avatarSvg(id) {
  if (id === "dolphin") return dolphinAvatar();
  if (id === "deer") return deerAvatar();
  if (id === "raccoon") return raccoonAvatar();
  return penguinAvatar();
}

function explorerBase(bodyExtra, headExtra, feetColor = "#704932") {
  return `
    <svg class="avatar-art" viewBox="0 0 120 120" role="img" aria-hidden="true">
      <ellipse cx="61" cy="111" rx="31" ry="6" fill="rgba(37,48,71,.18)" />
      <path d="M34 64 C25 70 25 88 38 90" fill="none" stroke="#446c86" stroke-width="10" stroke-linecap="round" />
      <path d="M86 64 C96 70 96 88 82 90" fill="none" stroke="#446c86" stroke-width="10" stroke-linecap="round" />
      <path d="M41 58 H80 C87 64 90 78 87 98 H34 C31 78 34 64 41 58 Z" fill="#84bde2" stroke="#446c86" stroke-width="3" />
      <path d="M45 58 L50 96 M76 58 L70 96" stroke="#36677f" stroke-width="4" stroke-linecap="round" />
      <path d="M53 77 H68 V91 H53 Z" fill="#9fcae5" stroke="#446c86" stroke-width="3" rx="3" />
      <rect x="77" y="59" width="24" height="34" rx="11" fill="#6fa083" stroke="#3f6f5f" stroke-width="3" />
      <circle cx="82" cy="76" r="5" fill="#fffaf0" stroke="#446c86" stroke-width="2" />
      ${bodyExtra}
      <path d="M44 98 C41 108 35 111 27 108" fill="none" stroke="${feetColor}" stroke-width="9" stroke-linecap="round" />
      <path d="M75 98 C79 108 85 111 93 108" fill="none" stroke="${feetColor}" stroke-width="9" stroke-linecap="round" />
      ${headExtra}
      <path d="M38 31 C43 14 78 14 83 31 L86 42 H35 Z" fill="#f4c548" stroke="#9c6b20" stroke-width="3" />
      <path d="M30 42 H91" stroke="#9c6b20" stroke-width="6" stroke-linecap="round" />
      <path d="M60 19 V41" stroke="#c8932f" stroke-width="3" />
      <path d="M48 52 Q60 62 72 52" fill="none" stroke="#8b4a2e" stroke-width="5" stroke-linecap="round" />
      <path d="M55 52 L61 60 L67 52" fill="#8b4a2e" />
    </svg>
  `;
}

function dolphinAvatar() {
  const head = `
    <path d="M37 39 C38 22 62 19 78 29 C87 34 93 42 93 51 C82 55 63 57 44 53 C39 50 37 45 37 39 Z" fill="#82c9e8" stroke="#3f8eb3" stroke-width="3" />
    <path d="M76 41 C88 39 99 43 104 49 C96 54 84 54 76 50 Z" fill="#82c9e8" stroke="#3f8eb3" stroke-width="3" />
    <path d="M47 47 C55 58 75 57 87 49 C75 53 58 52 47 47 Z" fill="#eefcff" />
    <path d="M57 21 C62 13 70 15 72 23" fill="#5fb4d7" stroke="#3f8eb3" stroke-width="3" />
    <circle cx="60" cy="40" r="3.2" fill="#253047" />
    <circle cx="54" cy="48" r="4" fill="#ff9c88" opacity=".8" />
    <path d="M70 49 Q76 54 84 50" fill="none" stroke="#253047" stroke-width="2" stroke-linecap="round" />
  `;
  return explorerBase("", head, "#5fb4d7");
}

function deerAvatar() {
  const head = `
    <path d="M39 33 C32 22 30 12 35 7 M35 18 L26 10 M37 23 L27 23" fill="none" stroke="#8b5a30" stroke-width="5" stroke-linecap="round" />
    <path d="M81 33 C88 22 90 12 85 7 M85 18 L94 10 M83 23 L93 23" fill="none" stroke="#8b5a30" stroke-width="5" stroke-linecap="round" />
    <path d="M37 37 C29 29 30 21 40 24" fill="#c68a55" stroke="#7b5230" stroke-width="3" />
    <path d="M83 37 C91 29 90 21 80 24" fill="#c68a55" stroke="#7b5230" stroke-width="3" />
    <path d="M36 40 C36 23 84 23 84 40 C84 58 75 65 60 65 C45 65 36 58 36 40 Z" fill="#c68a55" stroke="#7b5230" stroke-width="3" />
    <path d="M47 47 C49 59 71 59 73 47 C69 55 51 55 47 47 Z" fill="#fff0dd" />
    <circle cx="51" cy="42" r="3" fill="#253047" />
    <circle cx="69" cy="42" r="3" fill="#253047" />
    <circle cx="45" cy="50" r="4" fill="#ff9c88" opacity=".8" />
    <circle cx="75" cy="50" r="4" fill="#ff9c88" opacity=".8" />
    <path d="M57 50 Q60 53 63 50" fill="none" stroke="#253047" stroke-width="2" stroke-linecap="round" />
    <circle cx="47" cy="33" r="2" fill="#f6d6a8" />
    <circle cx="74" cy="35" r="2" fill="#f6d6a8" />
  `;
  return explorerBase("", head);
}

function penguinAvatar() {
  const head = `
    <path d="M36 40 C36 20 84 20 84 40 C84 59 74 66 60 66 C46 66 36 59 36 40 Z" fill="#263246" stroke="#1d2638" stroke-width="3" />
    <path d="M43 42 C45 57 75 57 77 42 C74 51 47 51 43 42 Z" fill="#fffaf0" />
    <circle cx="51" cy="42" r="3" fill="#253047" />
    <circle cx="69" cy="42" r="3" fill="#253047" />
    <circle cx="45" cy="51" r="4" fill="#ff9c88" opacity=".8" />
    <circle cx="75" cy="51" r="4" fill="#ff9c88" opacity=".8" />
    <path d="M56 48 H64 L60 55 Z" fill="#f0a93b" stroke="#b97622" stroke-width="2" />
  `;
  return explorerBase("", head, "#f0a93b");
}

function raccoonAvatar() {
  const head = `
    <path d="M38 35 L29 24 L42 24 Z" fill="#747d8e" stroke="#4d5669" stroke-width="3" />
    <path d="M82 35 L91 24 L78 24 Z" fill="#747d8e" stroke="#4d5669" stroke-width="3" />
    <path d="M36 41 C36 24 84 24 84 41 C84 59 74 66 60 66 C46 66 36 59 36 41 Z" fill="#8a92a1" stroke="#4d5669" stroke-width="3" />
    <path d="M42 42 C48 32 72 32 78 42 C72 52 48 52 42 42 Z" fill="#f7efe6" />
    <path d="M43 41 C49 34 56 34 61 41 C56 49 49 49 43 41 Z" fill="#4d5669" />
    <path d="M59 41 C64 34 72 34 78 41 C72 49 64 49 59 41 Z" fill="#4d5669" />
    <circle cx="52" cy="42" r="3" fill="#253047" />
    <circle cx="68" cy="42" r="3" fill="#253047" />
    <circle cx="60" cy="50" r="4" fill="#253047" />
    <path d="M55 55 Q60 59 65 55" fill="none" stroke="#253047" stroke-width="2" stroke-linecap="round" />
    <circle cx="43" cy="51" r="4" fill="#ff9c88" opacity=".75" />
    <circle cx="77" cy="51" r="4" fill="#ff9c88" opacity=".75" />
  `;
  return explorerBase("", head, "#4d5669");
}

function renderDice(value, bonus = 0) {
  if (!value) {
    diceValue.classList.remove("rolling");
    diceValue.innerHTML = '<span class="dice-placeholder">-</span>';
    return;
  }

  const pipMap = {
    1: [5],
    2: [1, 9],
    3: [1, 5, 9],
    4: [1, 3, 7, 9],
    5: [1, 3, 5, 7, 9],
    6: [1, 3, 4, 6, 7, 9],
  };

  diceValue.innerHTML = `
    <div class="dice-face face-${value}">
      ${pipMap[value].map((position) => `<span class="pip pip-${position}"></span>`).join("")}
    </div>
  `;

  if (bonus) {
    const badge = document.createElement("span");
    badge.className = "dice-bonus";
    badge.textContent = `+${bonus}`;
    diceValue.appendChild(badge);
  }
}

function findCharacter(id) {
  return characters.find((character) => character.id === id) || characters[0];
}

function createQuestion() {
  const operationsByDifficulty = {
    easy: ["+", "-"],
    normal: ["+", "-"],
    challenge: ["+", "-", "×", "÷"],
  };
  const operations = operationsByDifficulty[state.difficulty] || operationsByDifficulty.easy;
  const operation = operations[randomInt(0, operations.length - 1)];

  if (operation === "+") return createAddition(state.difficulty === "easy" ? 20 : 100);
  if (operation === "-") return createSubtraction(state.difficulty === "easy" ? 20 : 100);
  if (operation === "×") return createMultiplication();
  return createDivision();
}

function createAddition(maxAnswer) {
  const answer = randomInt(2, maxAnswer);
  const a = randomInt(0, answer);
  const b = answer - a;
  return withChoices(`${a} + ${b} = ?`, answer);
}

function createSubtraction(maxNumber) {
  const a = randomInt(0, maxNumber);
  const b = randomInt(0, a);
  return withChoices(`${a} - ${b} = ?`, a - b);
}

function createMultiplication() {
  const a = randomInt(0, 10);
  const b = randomInt(0, 10);
  return withChoices(`${a} × ${b} = ?`, a * b);
}

function createDivision() {
  const divisor = randomInt(1, 10);
  const quotient = randomInt(0, 10);
  const dividend = divisor * quotient;
  return withChoices(`${dividend} ÷ ${divisor} = ?`, quotient);
}

function withChoices(text, answer) {
  const choices = new Set([answer]);
  while (choices.size < 4) {
    const offset = randomInt(-12, 12);
    const candidate = Math.max(0, answer + offset);
    choices.add(candidate);
  }

  return {
    text,
    answer,
    choices: shuffle([...choices]),
  };
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(items) {
  return items
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map((item) => item.value);
}
