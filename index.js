// index.js (vervang je huidige script door dit)

// helper
const el = id => document.getElementById(id);

const numbersAudio = ["0","1","2","3","4","5","6","7","8","9","10","11","12","13","14","15","16","17","18","19","20","21","22","23","24","25","26","27","28","29","30","31","32","33","34","35","36","37","38","39","40","41","42","43","44","45","46","47","48","49","50","51","52","53","54","55","56","57","58","59","60","61","62","63","64","65","66","67","68","69","70","71","72","73","74","75","76","77","78","79","80","81","82","83","84","85","86","87","88","89","90","91","92","93","94","95","96","97","98","99","100","101","102","103","104","105","106","107","108","109","110","111","112","113","114","115","116","117","118","119","120","121","122","123","124","125","126","127","128","129","130","131","132","133","134","135","136","137","138","139","140","141","142","143","144","145","146","147","148","149","150","151","152","153","154","155","156","157","158","159","160","161","162","163","164","165","166","167","168","169","170","171","172","173","174","175","176","177","178","179","180"]

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
  currentTurnThrows: [], // objecten: {mult, value, points, label}
  history: [], // snapshots (zonder history)
  matchOver: false,
};

// deep clone maar ZONDER history -> voorkomt exponentiële groei
function deepClone(obj) {
  const clone = JSON.parse(JSON.stringify(obj));
  clone.history = [];
  return clone;
}

// ---------- SETUP UI ----------
function renderPlayerInputs(){
  const n = parseInt(el('numPlayers').value,10);
  const box = el('playerInputs');
  box.innerHTML = '';
  for (let i = 0; i < n; i++) {
    const d = document.createElement('div');
    d.innerHTML = `<label>Speler ${i+1}</label><input type="text" id="pname${i}" placeholder="Naam" value="">`;
    box.appendChild(d);
  }
}

const numPlayers = 3;
const targetSets = 3;
const legsPerSet = 3;
const startingScore = 501;
const pnames = ['Steven', 'Marc', 'Nicolas'];

el('numPlayers').addEventListener('change', renderPlayerInputs);
renderPlayerInputs();

el('demoBtn').addEventListener('click', ()=> {
  const names = ['Speler A','Speler B','Speler C','Speler D'];
  const n = parseInt(el('numPlayers').value,10);
  for (let i = 0; i < n; i++) el(`pname${i}`).value = names[i];
});

// start / nieuw / undo knoppen
el('startBtn').addEventListener('click', startGame);
el('newBtn').addEventListener('click', ()=> { location.reload(); });
el('undoBtn').addEventListener('click', undo);




// ---------- GAME LOGIC ----------
function startGame() {
  state.players = [];
  const n = parseInt(el('numPlayers').value,10);
  // const n = numPlayers;
  state.targetSets = Math.max(1, parseInt(el('targetSets').value,10)||1);
  // state.targetSets = targetSets;
  state.legsPerSet = Math.max(1, parseInt(el('legsPerSet').value,10)||1);
  // state.legsPerSet = legsPerSet;
  state.startingScore = Math.max(101, parseInt(el('startingScore').value,10)||501);
  // state.startingScore = 501;

  for (let i = 0; i < n; i++) {
    const name = (el(`pname${i}`).value||`Speler ${i+1}`).trim();
    // const name = (pnames[i] || `Speler ${i + 1}`).trim();
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
      visitScore: 0,  // Tijdelijke som van de huidige visit
      dartsInLeg: 0, // Aantal pijlen gegooid in de lopende leg
      lastThrows: ['---','---','---'], // 3 slots voor live-visitntPlayer = 0;
      lastThrows: [], // strings zoals ['T20','D20','S19']
      lastVisit: 0,
      visitDist: {
        "0-19": 0,
        "20-39": 0,
        "40-59": 0,
        "60-79": 0,
        "80-99": 0,
        "100-119": 0,
        "120-139": 0,
        "140-159": 0,
        "160-179": 0,
        "180": 0
      },
      bestLeg: null,
      highestCheckout: null
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

  el('setup').style.display='none';
  el('game').style.display='block';

  // visit-score-distributie
 

  buildThrowButtons(); // bouw knoppen met correcte id 'throwButtons'
  startTurn();
  renderAll();
  
  log(`Nieuw spel gestart • Sets: eerste tot ${state.targetSets}, Legs per set: eerste tot ${state.legsPerSet}, Begin: ${state.startingScore}`);
}

function buildThrowButtons(){
  const box = el('throwButtons');
  if(!box) {
    console.error('Geen element met id "throwButtons" gevonden in de HTML.');
    return;
  }
  box.innerHTML = '';

  const groups = [
    { label: 'Singles', mult:1, values:[...Array(20).keys()].map(i=>i+1) },
    { label: 'Doubles', mult:2, values:[...Array(20).keys()].map(i=>i+1) },
    { label: 'Triples', mult:3, values:[...Array(20).keys()].map(i=>i+1) },
  ];

  groups.forEach(g=>{
    const h = document.createElement('div'); h.className='group'; h.textContent = g.label; box.appendChild(h);
    g.values.forEach(v=>{
      const b = document.createElement('button');
      b.textContent = `${g.mult===1?'S':g.mult===2?'D':'T'}${v}`;
      b.addEventListener('click', ()=> handleThrow(g.mult, v, b));
      box.appendChild(b);
    });
  });

  const bullHeader = document.createElement('div'); bullHeader.className='group'; bullHeader.textContent='Bull & Overig'; box.appendChild(bullHeader);
  const s25 = document.createElement('button'); s25.textContent='S25 (Bull)'; s25.addEventListener('click', ()=> handleThrow(1,25,s25)); box.appendChild(s25);
  const d25 = document.createElement('button'); d25.textContent='D25 (Bull)'; d25.addEventListener('click', ()=> handleThrow(2,25,d25)); box.appendChild(d25);
  const miss = document.createElement('button'); miss.textContent='Miss (0)'; miss.addEventListener('click', ()=> handleThrow(1,0,miss)); box.appendChild(miss);
}

function startTurn(){
  const p = current();
  state.dartsInTurn = 0;
  state.currentTurnThrows = [];
  state.turnStartScore = p.score;
  state.currentTurnHadCheckoutChance = (p.score <= 170 && p.score > 1);
  // reset zichtbare laatste 3 worpen bij start van de beurt
  p.lastThrows = ['---','---','---'];
  p.visitScore = 0;
  
}

function current() {
  return state.players[state.currentPlayer];
  
}

function nextPlayerIndex(i) { 
  return (i+1) % state.players.length; 
}

function handleThrow(mult, value, btn){
 
  if(state.matchOver) return;

  // snapshot nemen zonder history om undo mogelijk te maken zonder blowup
  state.history.push(deepClone(state));

  // UI highlight korte tijd
  if (btn) {
    btn.classList.add('clicked');
    setTimeout(() => btn.classList.remove('clicked'), 500);
  }

  const p = current();
  
  state.dartsInTurn += 1;

  const label = value === 0 ? 'XXX' : `${mult === 1 ? 'S' : mult === 2 ? 'D' : 'T'}${value}`;
  let points = value === 0 ? 0 : mult * value;

  if(value === 25 && mult === 3) { 
    points = 0; 
  } // niet geldig in UI maar veilig afvangen



  // vul volgende vrije span in (--- -> label)
  if (!Array.isArray(p.lastThrows) || p.lastThrows.length !== 3) {
    p.lastThrows = ['---','---','---'];
  }
    
  const _slot = p.lastThrows.findIndex(t => t === '---');
  if (_slot !== -1) p.lastThrows[_slot] = label;

  const before = p.score;
  const after = before - points;

  const finishedWithDouble = after===0 && mult===2; // D25 telt mee door mult===2 en value===25
  const invalidFinish = after===0 && !finishedWithDouble;
  const bust = (after < 0) || (after === 1) || invalidFinish;

  state.currentTurnThrows.push({mult, value, points, label});
  //  console.log(`state.currentTurnThrows = ${JSON.stringify(state.currentTurnThrows[0])}`)
  //  console.log(`state.currentTurnThrows length = ${state.currentTurnThrows.length}`)

  if (bust) {
    log(`${p.name}: ${label} → BUST (score blijft ${state.turnStartScore})`);
    endVisit({ visitScore: 0, dartsUsed: state.currentTurnThrows.length, busted: true, finished:false });
    advanceTurn();
    return;
  }

  // update score
  p.score = after;
  log(`${p.name}: ${label} → ${before} ⇒ ${p.score}`);

  p.visitScore += points;  // Score optellen binnen de visit
  p.dartsInLeg += 1   // Aantal gegooide pijlen in de leg

  // console.log(`p.dartsInCurrentLeg = ${p.dartsInCurrentLeg}`)
  // finish
  if (after === 0) {
    let dartsToCheckout = p.dartsInCurrentLeg + state.currentTurnThrows.length
    // console.log(dartsToCheckout);
    // visite stats: bezoekpunt is turnStartScore - after (after==0)
    endVisit({ visitScore: state.turnStartScore - after, dartsUsed: state.currentTurnThrows.length, busted:false, finished:true });
    // handleLegWin(state.currentPlayer, before);
    
    handleLegWin(state.currentPlayer, before, dartsToCheckout)
    return;
  }

  // einde beurt na 3 darts
  if(state.dartsInTurn === 3){
    endVisit({ visitScore: state.turnStartScore - p.score, dartsUsed: state.currentTurnThrows.length, busted:false, finished:false });
    advanceTurn();
  }

  renderAll();
}

function endVisit({visitScore, dartsUsed, busted, finished}){
  const p = current();

  // sla laatste worpen op (strings)
  // p.lastThrows = state.currentTurnThrows.map(t => t.label);
  p.lastThrows = [...state.currentTurnThrows.map(t => t.label), '---', '---', '---'].slice(0,3);
  p.lastVisit = visitScore;

  // first nine logica: verdeel punten per dart gelijkmatig binnen de visit
  const remainingForFirstNine = Math.max(0, 9 - p.dartsInCurrentLeg);
  const dartsToAddFN = Math.min(remainingForFirstNine, dartsUsed);
  const pointsPerDartThisVisit = dartsUsed > 0 ? (visitScore / dartsUsed) : 0;
  const pointsToAddFN = dartsToAddFN * pointsPerDartThisVisit;

  p.stats.totalPoints += visitScore;
  p.stats.totalDarts += dartsUsed;
  p.stats.firstNinePoints += pointsToAddFN;
  p.stats.firstNineDarts += dartsToAddFN;
  p.dartsInCurrentLeg += dartsUsed;
  

  if(state.currentTurnHadCheckoutChance){
    p.stats.checkoutAttempts += 1;
  }
  if(finished){
    p.stats.checkouts += 1;
  }

  let b = p.visitDist;

  console.log(`audio/${numbersAudio[visitScore]}.wav`)
  let audio = new Audio(`audio/${numbersAudio[visitScore]}.wav`);
  audio.play();

  if (visitScore < 20) b["0-19"]++;
  else if (visitScore < 40) b["20-39"]++;
  else if (visitScore < 60) b["40-59"]++;
  else if (visitScore < 80) b["60-79"]++;
  else if (visitScore < 100) b["80-99"]++;
  else if (visitScore < 120) b["100-119"]++;
  else if (visitScore < 140) b["120-139"]++;
  else if (visitScore < 160) b["140-159"]++;
  else if (visitScore < 180) b["160-179"]++;
  else if (visitScore === 180) b["180"]++;

  // reset bezoek
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

function handleLegWin(playerIndex, before, dartsToCheckout){
  const p = state.players[playerIndex];
  p.legs += 1;
  log(`🏁 Leg voor ${p.name}`);
  
  console.log(`Best Leg: ${p.bestLeg}`)
  console.log(`Darts in current leg: ${dartsToCheckout}`)

  if (p.bestLeg === null || dartsToCheckout < p.bestLeg) {
    p.bestLeg = dartsToCheckout;
  }

  if (p.highestCheckout === null || before > p.highestCheckout) {
    p.highestCheckout = before;
  }

  for (let player of state.players) {
    player.visitScore = 0;
    player.dartsInLeg = 0;
  }

  if(p.legs >= state.legsPerSet){
    p.sets += 1;
    log(`🏆 Set voor ${p.name} (sets: ${p.sets})`);
    // reset legs
    state.players.forEach(pl => pl.legs = 0);

    if(p.sets >= state.targetSets){
      log(`🎉 MATCH gewonnen door ${p.name}!`);
      state.matchOver = true;
      renderAll();
      return;
    }
  }


  // nieuwe leg: reset scores en dartsInCurrentLeg
  state.players.forEach(pl => { pl.score = state.startingScore; pl.dartsInCurrentLeg = 0; });

  // roteer starter
  state.startingPlayer = nextPlayerIndex(state.startingPlayer);
  state.currentPlayer = state.startingPlayer;
  startTurn();
  renderAll();
}

function undo(){
  if(state.history.length===0) return;
  const prev = state.history.pop();
  // restore alles behalve history zelf
  Object.keys(prev).forEach(k => {
    if(k !== 'history') state[k] = prev[k];
  });
  log('↩️  Undo');
  renderAll();
}

// ---------- RENDER ----------
function renderAll(){
  renderMatchInfo();
  renderPlayersBoard();
  renderStats();
  renderTurnLabel();
}

function renderMatchInfo() {
  const starters = state.players.map((p,i) => `${i===state.startingPlayer?'➤ ':''}${p.name}`).join(' · ');
  el('matchInfo').textContent = `Sets: eerste tot ${state.targetSets} • Legs per set: eerste tot ${state.legsPerSet} • Starter: ${state.players[state.startingPlayer]?.name || '-'} | Volgorde: ${starters}`;
}

function renderPlayersBoard() {
  const box = el('playersBoard');
  box.innerHTML = '';
  state.players.forEach((p,i) => {
    const d = document.createElement('div');
    d.className = 'player-panel';
    if (i === state.currentPlayer && !state.matchOver) d.classList.add('current');

    // bereken 3-dart gemiddelde
    const avg = (p.stats.totalDarts === 0) ? '—' : ((p.stats.totalPoints / p.stats.totalDarts) * 3).toFixed(2);

    // laatste worpen (toon maximaal 3)
    // const last = p.lastThrows && p.lastThrows.length ? p.lastThrows.slice(0,3).join(' - ') : '---';
    const last = p.lastThrows && p.lastThrows.length ? p.lastThrows.slice(0,3) : ['---', '---', '---'];
    
    

/*    d.innerHTML = `
      <div class="row" style="justify-content:space-between;align-items:center;margin-bottom:6px">
        <div class="pill"><strong>${p.name}</strong></div>
        <div class="pill">Sets: <strong>${p.sets}</strong> · Legs: <strong>${p.legs}</strong></div>
      </div>
      <div class="score">${p.score}</div>
      <div class="sub">Darts in beurt: ${i===state.currentPlayer?state.dartsInTurn:0} / 3</div>
      <div class="sub" style="margin-top:8px">Laatste: ${last} · Laatste score: ${p.lastVisit} · Gemiddelde: ${avg}</div>
    `;*/
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
          <div class="cur-h">Current</div>
				  <div class="cur-v" id="cur-v">${p.visitScore}</div>
        </div>
        <div class="arr">
				  <div class="arr-h">Arrows</div>
				  <div class="arr-v" id="arr-v">${p.dartsInLeg}</div>
			  </div>
        <div class="rem">
          <div class="rem-h">Remain</div>
				  <div class="rem-v" id="rem-v">${p.score}</div>
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
      `;
    box.appendChild(d);
  });
}

function renderTurnLabel(){
  const p = current();
  el('turnLabel').textContent = `${p.name} (score ${p.score})`;
}

function avg3(totalPoints,totalDarts){
  if(totalDarts===0) return '—';
  return ( (totalPoints / totalDarts) * 3 ).toFixed(2);
}

function pct(a,b){ if(b===0) return '—'; return (100*a/b).toFixed(1)+'%'; }

function renderStats(){
  const t = el('statsTable');
  t.innerHTML = `
    <tr>
      <th>Speler</th>
      <th>AVG (3-dart)</th>
      <th>First 9</th>
      <th>Checkout</th>
      <th>Max. Checkout</th>
      <th>Best Leg</th>
      <th>Total Darts</th>
      <th>180</th>
      <th>< 20</th>
      <th>< 40</th>
      <th>< 60</th>
      <th>< 80</th>
      <th>< 100</th>
      <th>< 120</th>
      <th>< 140</th>
      <th>< 160</th>
      <th>< 180</th>
    </tr>`;
  state.players.forEach(p=>{
    const a = avg3(p.stats.totalPoints, p.stats.totalDarts);
    const f9 = avg3(p.stats.firstNinePoints, p.stats.firstNineDarts);
    const co = pct(p.stats.checkouts, p.stats.checkoutAttempts);
    const tr = document.createElement('tr');
    let tds = [];
    
    tr.innerHTML = `
      <td>${p.name}</td>
      <td style="text-align: center;">${a}</td>
      <td style="text-align: center;">${f9}</td>
      <td>${p.stats.checkouts} / ${p.stats.checkoutAttempts} (${co})</td>
      <td style="text-align: center;">${p.highestCheckout !== null ? p.highestCheckout : '-'}</td>
      <td style="text-align: center;">${p.bestLeg !== null ? p.bestLeg : '-'}</td>
      <td style="text-align: center;">${p.stats.totalDarts}</td>`;
    
    for (let [range, val] of Object.entries(p.visitDist)) {
      // console.log(range)
      let td = document.createElement('td')
      td.style.textAlign = 'center';
      td.innerHTML = val;
      tr.append(td);
    }
    
    t.appendChild(tr);
  });
}

// logging
function log(msg){
  const div = el('log');
  const timestamp = new Date().toLocaleTimeString();
  div.innerHTML = `[${timestamp}] ${msg}<br>` + div.innerHTML;
}

