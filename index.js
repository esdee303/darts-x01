// Helper function
const el = (id) => document.getElementById(id);


// ---------- STATE ----------
const state = {
  players: [],
  startingScore: 501,
  legsPerSet: 3,
  targetSets: 1,
  currentPlayer: 0,
  startingPlayer: 0,
  dartsInTurn: 0,
  turnStartScore: 501,
  currentTurnHadCheckoutChance: false,
  currentTurnThrows: [], // = objects: {mult, value, points, label}
  history: [], // = Snapshots (without history)
  matchOver: false,
};

// ? Deep clone without history --> to avoid exponential growth
function deepClone(obj) {
  const clone = JSON.parse(JSON.stringify(obj));
  clone.history = [];
  return clone;
}

// ---------- SETUP UI ----------
function renderPlayerInputs() {
  const n = parseInt(el('numPlayers').value, 10);
  const box = el('playerInputs');
  box.innerHTML = '';
  for (let i = 0; i < n; i++) {
    const d = document.createElement('div');
    d.innerHTML = `<label>Player ${i + 1}</label><input type="text" id="pname${i}" placeholder="Name" value="">`;
    box.appendChild(d);
  }
}

el('numPlayers').addEventListener('change', renderPlayerInputs);
renderPlayerInputs();

el('demoBtn').addEventListener('click', () => {
  const names = ['Player A', 'Player B', 'Player C', 'Player D'];
  const n = parseInt(el('numPlayers').value, 10);
  for (let i = 0; i < n; i++) el(`pname${i}`).value = names[i];
});

// Start / New / Undo buttons
el('startBtn').addEventListener('click', startGame);
el('newBtn').addEventListener('click', () => {
  location.reload();
});
el('undoBtn').addEventListener('click', undo);

// ---------- GAME LOGIC ----------
startGame()
function startGame() {
  state.players = [];

  // - Variables to bypass the Start menu
   const n = 3;
   state.targetSets = 5;
   state.legsPerSet = 5;
   state.startingScore = 501;
   const pnames = ['Steven', 'Marc', 'Nicolas']

  //const n = parseInt(el('numPlayers').value, 10);
  //state.targetSets = Math.max(1, parseInt(el('targetSets').value, 10) || 1);
  //state.legsPerSet = Math.max(1, parseInt(el('legsPerSet').value, 10) || 1);
  //state.startingScore = Math.max(101, parseInt(el('startingScore').value, 10) || 501);
  

  for (let i = 0; i < n; i++) {
    //const name = (el(`pname${i}`).value || `Speler ${i + 1}`).trim();
    const name = (pnames[i] || `Speler ${i + 1}`).trim(); // - Variable to bypass the Start menu
    state.players.push({
      name,
      score: state.startingScore,
      legs: 0,
      sets: 0,
      stats: {
        totalPoints: 0,
        totalDarts: 0,
        firstNinePoints: 0,
        firstNineDarts: 0,
        checkoutAttempts: 0,
        checkouts: 0,
      },
      dartsInCurrentLeg: 0,
      visitScore: 0,                        // Temporary sum of current visit
      dartsInLeg: 0,                        // Number of arrows thrown in the current leg
      checkoutOptions: [],
      lastThrows: ['---', '---', '---'],    // 3 slots for displaying throws
      lastThrows: [],                       // Strings, e.g. ['T20','D20','S19']
      lastVisit: 0,
      visitDist: {
        '0-19': 0,
        '20-39': 0,
        '40-59': 0,
        '60-79': 0,
        '80-99': 0,
        '100-119': 0,
        '120-139': 0,
        '140-159': 0,
        '160-179': 0,
        '180': 0,
      },
      bestLeg: null,
      highestCheckout: null,
    });
  }

  state.currentPlayer = 0;
  state.startingPlayer = 0;
  state.turnStartScore = state.startingScore;
  state.dartsInTurn = 0;
  state.currentTurnThrows = [];
  state.history = [];
  state.matchOver = false;
  state.currentTurnHadCheckoutChance = false;

  
  el('setup').style.display = 'none';   // Hide the menu
  el('game').style.display = 'block';   // Display the game
  el('dartboard').style.display = 'block' // Display the board

  // visit-score-distributie

  buildThrowButtons(); // Bild buttons
  startTurn();
  renderAll();

  log(`Sets: first to ${state.targetSets}, Legs: first to ${state.legsPerSet}, Starting score: ${state.startingScore}`);
}

function buildThrowButtons() {
  const box = el('throwButtons');
  if (!box) {
    console.error('No element found with id "throwButtons"');
    return;
  }
  box.innerHTML = '';

  const groups = [
    { label: 'Singles', mult: 1, values: [...Array(20).keys()].map((i) => i + 1) },
    { label: 'Doubles', mult: 2, values: [...Array(20).keys()].map((i) => i + 1) },
    { label: 'Triples', mult: 3, values: [...Array(20).keys()].map((i) => i + 1) },
  ];

  groups.forEach((g) => {
    const h = document.createElement('div');
    h.className = 'group';
    h.textContent = g.label;
    box.appendChild(h);
    const i = document.createElement('div')
    const j = document.createElement('div')
    i.className = 'group-btns'
    j.className = 'group-btns'
    let counter = 0;
    g.values.forEach((v) => {
      counter++;
      const b = document.createElement('button');
      b.classList = "thrwBtn r8";
      b.textContent = `${g.mult === 1 ? 'S' : g.mult === 2 ? 'D' : 'T'}${v}`;
      b.setAttribute('data-text', b.textContent)
      b.addEventListener('click', () => {
        console.log(`g.mult = ${g.mult}`)
        console.log(`v = ${v}`)
        console.log(`b = ${b}`)
        handleThrow(g.mult, v, b)
      });
      if (counter < 11) {
        i.appendChild(b);
      } else {
        j.appendChild(b);
      }
      
    });
    box.append(i)
    box.append(j)



  });
  const h = document.createElement('div');
  h.className = 'group-btns'
  const bullHeader = document.createElement('div');
  bullHeader.className = 'group';
  bullHeader.textContent = 'Bull & Miss';
  box.appendChild(bullHeader);
  
  const s25 = document.createElement('button');
  s25.classList = "thrwBtn r8";
  s25.textContent = 'S25';
  s25.setAttribute('data-text', s25.textContent)
  s25.addEventListener('click', () => handleThrow(1, 25, s25));
  // box.appendChild(s25);
  h.append(s25)
  const d25 = document.createElement('button');
  d25.textContent = 'D25';
  d25.setAttribute('data-text', d25.textContent)
  d25.classList = "thrwBtn r8";
  d25.addEventListener('click', () => handleThrow(2, 25, d25));
  // box.appendChild(d25);
  h.append(d25)

  const miss = document.createElement('button');
  miss.textContent = 'Miss (0)';
  miss.setAttribute('data-text', miss.textContent)
  miss.classList = "thrwBtn r11 crimson";
  miss.addEventListener('click', () => handleThrow(1, 0, miss));
 //  box.appendChild(miss);
  h.append(miss)

  box.append(h)

  const board = document.getElementById('board')
  board.addEventListener('click', (e) => {
    const id = e.target.id;
    const v = id.substring(1) || 0;
    const m = id.substring(0,1) === 'D' ? 2 : id.substring(0,1) === 'T' ? 3 : 1;
    console.log(`id = ${id}`)
    console.log(`v = ${v}`)
    console.log(`m = ${m}`)
    handleThrow(m, v, null)
  });
}

function startTurn() {
  const p = current();
  state.dartsInTurn = 0;
  state.currentTurnThrows = [];
  state.turnStartScore = p.score;
  p.lastThrows = ['---', '---', '---'];
  p.visitScore = 0;
  p.checkoutOptions = getCheckoutOptions(p.score);

  // Checkout attempt true if remaining score < 41, even and > 0
  state.currentTurnHadCheckoutChance = p.score < 41 && p.score % 2 === 0 && p.score > 0;
}

function current() {
  return state.players[state.currentPlayer];
}

function nextPlayerIndex(i) {
  return (i + 1) % state.players.length;
}

function handleThrow(mult, value, btn) {
  console.log(mult, value, btn)
  if (state.matchOver) return;

  // Snapshot without history for Undo
  state.history.push(deepClone(state));

  // UI Button highlight
  if (btn) {
    btn.classList.add('clicked');
    setTimeout(() => btn.classList.remove('clicked'), 500);
  }

  const p = current();

  state.dartsInTurn += 1;

  const label = value === 0 ? 'XXX' : `${mult === 1 ? 'S' : mult === 2 ? 'D' : 'T'}${value}`;
  let points = value === 0 ? 0 : mult * value;

  // Invalid throw (should not happen)
  if (value === 25 && mult === 3) {
    points = 0;
  }

  // Fill in the throw
  if (!Array.isArray(p.lastThrows) || p.lastThrows.length !== 3) {
    p.lastThrows = ['---', '---', '---'];
  }

  const _slot = p.lastThrows.findIndex((t) => t === '---');
  if (_slot !== -1) p.lastThrows[_slot] = label;

  const before = p.score;
  const after = before - points;

  const finishedWithDouble = after === 0 && mult === 2; // D25 telt mee door mult===2 en value===25
  const invalidFinish = after === 0 && !finishedWithDouble;
  const bust = after < 0 || after === 1 || invalidFinish;

  state.currentTurnThrows.push({ mult, value, points, label });

  if (bust) {
    log(`${p.name}: ${label} → BUST (score remains ${state.turnStartScore})`);
    endVisit({ visitScore: 0, dartsUsed: state.currentTurnThrows.length, busted: true, finished: false });
    advanceTurn();
    return;
  }

  // Update score
  p.score = after;
  log(`${p.name}: ${label} → ${before} ⇒ ${p.score}`);
  
  p.checkoutOptions = getCheckoutOptions(p.score);

  if (!state.currentTurnHadCheckoutChance && p.score < 41 && p.score % 2 === 0 && p.score > 0 && state.dartsInTurn < 3) {
    state.currentTurnHadCheckoutChance = true;
  }

  p.visitScore += points; // Add Score
  p.dartsInLeg += 1; // Add arrow thrown


  // Remaining score === 0 --> Leg finished
  if (after === 0) {
    // Darts thrown in leg
    let dartsToCheckout = p.dartsInCurrentLeg + state.currentTurnThrows.length;
    
    endVisit({ visitScore: state.turnStartScore - after, dartsUsed: state.currentTurnThrows.length, busted: false, finished: true });

    handleLegWin(state.currentPlayer, before, dartsToCheckout);

    return;
  }

  // End visit (3 darts thrown)
  if (state.dartsInTurn === 3) {
    endVisit({ visitScore: state.turnStartScore - p.score, dartsUsed: state.currentTurnThrows.length, busted: false, finished: false });
    advanceTurn();
  }

  renderAll();
}

function getCheckoutOptions(score) {
  if (CHECKOUTS[score]) {
    return CHECKOUTS[score]
  }
  return
}

function endVisit({ visitScore, dartsUsed, busted, finished }) {
  const p = current();
  // document.getElementById(`cov-${p.name.toLowerCase()}`).style.opacity = 0;
  // Save last throws, for display
  p.lastThrows = [...state.currentTurnThrows.map((t) => t.label), '---', '---', '---'].slice(0, 3);
  p.lastVisit = visitScore;

  // Count first 9
  const remainingForFirstNine = Math.max(0, 9 - p.dartsInCurrentLeg);
  const dartsToAddFN = Math.min(remainingForFirstNine, dartsUsed);
  const pointsPerDartThisVisit = dartsUsed > 0 ? visitScore / dartsUsed : 0;
  const pointsToAddFN = dartsToAddFN * pointsPerDartThisVisit;

  p.stats.totalPoints += visitScore;
  p.stats.totalDarts += dartsUsed;
  p.stats.firstNinePoints += pointsToAddFN;
  p.stats.firstNineDarts += dartsToAddFN;
  p.dartsInCurrentLeg += dartsUsed;

  if (state.currentTurnHadCheckoutChance) {
    p.stats.checkoutAttempts += 1;
  }
  if (finished) {
    p.stats.checkouts += 1;
  }

  let b = p.visitDist;

  // let audio = new Audio(`audio/${numbersAudio[visitScore]}.wav`);
  // audio.play();

  if (visitScore < 20) b['0-19']++;
  else if (visitScore < 40) b['20-39']++;
  else if (visitScore < 60) b['40-59']++;
  else if (visitScore < 80) b['60-79']++;
  else if (visitScore < 100) b['80-99']++;
  else if (visitScore < 120) b['100-119']++;
  else if (visitScore < 140) b['120-139']++;
  else if (visitScore < 160) b['140-159']++;
  else if (visitScore < 180) b['160-179']++;
  else if (visitScore === 180) b['180']++;

  // Reset Visit
  state.dartsInTurn = 0;
  state.currentTurnThrows = [];
  state.turnStartScore = p.score;
  state.currentTurnHadCheckoutChance = false;
}

function advanceTurn() {
  state.currentPlayer = nextPlayerIndex(state.currentPlayer);
  startTurn();
  renderAll();
}

function handleLegWin(playerIndex, before, dartsToCheckout) {
  const p = state.players[playerIndex];
  p.legs += 1;
  log(`🏁 Leg won by ${p.name}`);

  if (p.bestLeg === null || dartsToCheckout < p.bestLeg) p.bestLeg = dartsToCheckout;

  if (p.highestCheckout === null || before > p.highestCheckout) p.highestCheckout = before;

  for (let player of state.players) {
    player.visitScore = 0;
    player.dartsInLeg = 0;
  }

  if (p.legs >= state.legsPerSet) {
    p.sets += 1;
    log(`🏆 Set won by ${p.name} (sets: ${p.sets})`);
    // Reset Legs
    state.players.forEach((pl) => (pl.legs = 0));

    if (p.sets >= state.targetSets) {
      log(`🎉 MATCH won by ${p.name}!`);
      state.matchOver = true;
      renderAll();
      return;
    }
  }

  // New leg: reset scores and darts in current Leg
  state.players.forEach((pl) => {
    pl.score = state.startingScore;
    pl.dartsInCurrentLeg = 0;
  });

  // Next Player
  state.startingPlayer = nextPlayerIndex(state.startingPlayer);
  state.currentPlayer = state.startingPlayer;
  startTurn();
  renderAll();
}

function undo() {
  if (state.history.length === 0) return;
  const prev = state.history.pop();
  // Restore everything except the history itself
  Object.keys(prev).forEach((k) => {
    if (k !== 'history') state[k] = prev[k];
  });
  log('↩️  Undo');
  renderAll();
}

// ---------- RENDER ----------
function renderAll() {
  renderMatchInfo();
  renderPlayersBoard();
  renderStats();
  renderTurnLabel();
}

function renderMatchInfo() {
  const starters = state.players.map((p, i) => `${i === state.startingPlayer ? '➤ ' : ''}${p.name}`).join(' · ');
  el('matchInfo').innerHTML = `Sets: <strong>First to ${state.targetSets}</strong>&nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp;Legs: <strong>First to ${state.legsPerSet}</strong>`;
}

function renderPlayersBoard() {
  const box = el('playersBoard');
  box.innerHTML = '';
  state.players.forEach((p, i) => {
    const d = document.createElement('div');
    d.className = 'player-panel';
    if (i === state.currentPlayer && !state.matchOver) d.classList.add('current');

    // Calculate 3-dart AVG
    const avg = p.stats.totalDarts === 0 ? '0.00' : ((p.stats.totalPoints / p.stats.totalDarts) * 3).toFixed(2);

    // Show last throws
    const last = p.lastThrows && p.lastThrows.length ? p.lastThrows.slice(0, 3) : ['---', '---', '---'];

    let checkoutHTML = '';
    if (i === state.currentPlayer && p.checkoutOptions && p.checkoutOptions.length > 0) {
      checkoutHTML = `<div id="cov" style="opacity: 1;">${p.checkoutOptions[0]}</div>`
    } else {
      checkoutHTML = `<div id="cov" style="opacity: 0;">No checkout</div>`
    }
    d.innerHTML = `
      <div class="row" style="justify-content:space-between;align-items:center;">
        <div class="pill player-name"><strong>${p.name}</strong></div>
        <div class="pill sets-legs">
          <span style="margin-right:.5rem;">S</span>
          <span style="margin-right: 1rem; font-weight: 700;" id="sets">${p.sets}</span>
          <span style="margin-right:.5rem;">L</span>
          <span style="font-weight: 700;" id="legs">${p.legs}</span>
        </div>
      </div>
      <div class="score">
        <div class="cur">
          <div class="cur-h">Score</div>
				  <div class="cur-v" id="cur-v">${p.visitScore}</div>
        </div>
        <div class="arr">
				  <div class="arr-h">Darts</div>
				  <div class="arr-v" id="arr-v">${p.dartsInLeg}</div>
			  </div>
        <div class="rem">
          <div class="rem-h">Remaining</div>
				  <div class="rem-v font-extrabold bg-clip-text text-transparent bg-gradient-to-tr from-yellow-600 via-yellow-300 to-yellow-100 leading" id="rem-v">${p.score}</div>
        </div>
      </div>
      <div class="sub">
        <div class="player-throws">
          <span>${last[0]}</span>
          <span>${last[1]}</span>
          <span>${last[2]}</span>
        </div>
        <div class="player-avg">
          <div class="player-avg-h">AVG</div>
          <div class="player-avg-set">${avg}</div>
        </div>
      </div>
      <div class="co">
        ${checkoutHTML}
      </div>
      `;
    box.appendChild(d);
  });
}

function renderTurnLabel() {
  const p = current();
  // el('turnLabel').textContent = `${p.name} (score ${p.score})`;
  el('turnLabel').textContent = `${p.name}`;
}

// Calcualte 3-dart AVG
function avg3(totalPoints, totalDarts) {
  if (totalDarts === 0) return '0.00';
  return ((totalPoints / totalDarts) * 3).toFixed(2);
}

// Calculate checkout %
function pct(a, b) {
  if (b === 0) return '—';
  return ((100 * a) / b).toFixed(1) + '%';
}

function renderStats() {
  const gsTable = el('generalStatsTable');
  const rTable = el('rangeStatsTable');

  gsTable.innerHTML = `
    <thead class="">
      <tr>
        <th class="text-left">Player</th>
        <th class="text-center">3-dart AVG</th>
        <th class="text-center">First 9</th>
        <th class="text-center">Checkout</th>
        <th class="text-center">Max. Checkout</th>
        <th class="text-center">Best Leg</th>
        <th class="text-center">Total Darts</th>
      </tr>
    </thead>`;

  rTable.innerHTML = `
    <thead>
      <tr>
        <th class="text-left">Player</th>
        <th class="text-center">180</th>
        <th class="text-center">0-20</th>
        <th class="text-center">20-40</th>
        <th class="text-center">40-60</th>
        <th class="text-center">60-80</th>
        <th class="text-center">80-100</th>
        <th class="text-center">100-120</th>
        <th class="text-center">120-140</th>
        <th class="text-center">140-160</th>
        <th class="text-center">160-180</th>
      </tr>
    </thead>
    `

  const gsTbody = document.createElement('tbody');
  const rTbody = document.createElement('tbody');

  state.players.forEach((p) => {
    const gsTr = document.createElement('tr');
    const rTr = document.createElement('tr');

    const a = avg3(p.stats.totalPoints, p.stats.totalDarts);
    const f9 = avg3(p.stats.firstNinePoints, p.stats.firstNineDarts);
    const co = pct(p.stats.checkouts, p.stats.checkoutAttempts);
    
    gsTr.innerHTML = `
      <td class="">${p.name}</td>
      <td class="text-center">${a}</td>
      <td class="text-center">${f9}</td>
      <td class="text-center">${p.stats.checkouts} / ${p.stats.checkoutAttempts} (${co})</td>
      <td class="text-center">${p.highestCheckout !== null ? p.highestCheckout : '0'}</td>
      <td class="text-center">${p.bestLeg !== null ? p.bestLeg : '0'}</td>
      <td class="text-center">${p.stats.totalDarts}</td>`;
    
      gsTbody.appendChild(gsTr);

    let tdName = document.createElement('td')
    tdName.innerHTML = p.name;
    rTr.append(tdName);
    for (let [range, val] of Object.entries(p.visitDist)) {
      // console.log(range)
      let td = document.createElement('td')
      td.classList.add('text-center')
      td.innerHTML = val;
      rTr.append(td);
    }

    rTbody.appendChild(rTr);
    
  });
  gsTable.appendChild(gsTbody);
  rTable.appendChild(rTbody);
  
}

// Logging
function log(msg) {
  const timestamp = new Date().toLocaleTimeString();
  if (!state.log || !Array.isArray(state.log)) state.log = [];
  state.log.push({ ts: timestamp, msg })
  
  const div = el('log');
  if (!div) return;
  div.innerHTML = `[${timestamp}] ${msg}<br>` + div.innerHTML;
}

function renderLog() {
  const div = el('log');
  if (!div) return;
  div.innerHTML = '';
  if (!state.log || !Array.isArray(state.log) || state.log.length === 0) return;
  for (let i = state.log.length - 1; i >= 0; i--) {
    const e = state.log[i];
    const ts = e.ts || new Date().toLocaleTimeString();
    div.innerHTML += `[${ts}] ${e.msg}<br>`;
  }
}

document.getElementById('saveBtn').addEventListener('click', () => saveGame())
document.getElementById('loadBtn').addEventListener('click', () => {
  document.getElementById('loadFile').click();
});

document.getElementById('loadFile').addEventListener('change' , (e) => {
  if (e.target.files.length > 0) loadGame(e.target.files[0]);
})

function saveGame(filename = "dart_save.json") {
  const snapshot = JSON.stringify(state, null, 2);
  const blob = new Blob([snapshot], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  // Temporary <a> element to download the file.
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function loadGame(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const loadedState = JSON.parse(e.target.result);
      Object.assign(state, loadedState); // Overwrite state
      renderAll();
      renderLog();
    } catch (err) {
      console.error('Unable to load game:', err);
    }
  }
}
