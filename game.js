(() => {
  'use strict';

  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const W = canvas.width;
  const H = canvas.height;

  const UI = {
    score: document.getElementById('scoreValue'),
    best: document.getElementById('bestValue'),
    rowTimer: document.getElementById('rowTimer'),
    dangerFill: document.getElementById('dangerFill'),
    combo: document.getElementById('comboBadge'),
    powerStatus: document.getElementById('powerStatus'),
    loading: document.getElementById('loadingOverlay'),
    start: document.getElementById('startOverlay'),
    pause: document.getElementById('pauseOverlay'),
    over: document.getElementById('gameOverOverlay'),
    finalScore: document.getElementById('finalScore'),
    finalCombo: document.getElementById('finalCombo'),
    resultTitle: document.getElementById('resultTitle'),
    resultMessage: document.getElementById('resultMessage'),
    resultKicker: document.getElementById('resultKicker'),
    play: document.getElementById('playButton'),
    resume: document.getElementById('resumeButton'),
    restartPause: document.getElementById('restartFromPause'),
    playAgain: document.getElementById('playAgainButton'),
    pauseButton: document.getElementById('pauseButton'),
    mute: document.getElementById('muteButton'),
    swap: document.getElementById('swapButton'),
  };

  const CONFIG = {
    cols: 11,
    rowsMax: 22,
    startRows: 7,
    bubbleSize: 68,
    bubbleRadius: 31,
    rowHeight: 58.9,
    topY: 154,
    shooterY: 1042,
    loseY: 895,
    shotSpeed: 940,
    secondsPerRow: 20,
    minAim: -Math.PI + 0.22,
    maxAim: -0.22,
    colors: ['coral', 'gold', 'mint', 'cyan', 'violet', 'pink'],
    giftTypes: ['bomb', 'fire', 'clock'],
    incomingGiftChance: 0.075,
    freezeSeconds: 15,
  };

  CONFIG.fieldWidth = CONFIG.cols * CONFIG.bubbleSize + CONFIG.bubbleSize / 2;
  CONFIG.fieldLeft = (W - CONFIG.fieldWidth) / 2;
  CONFIG.fieldRight = CONFIG.fieldLeft + CONFIG.fieldWidth;
  CONFIG.minX = CONFIG.fieldLeft + CONFIG.bubbleRadius;
  CONFIG.maxX = CONFIG.fieldRight - CONFIG.bubbleRadius;

  const assets = {
    images: {},
    audio: {},
    backgrounds: [],
    activeBackground: null,
  };

  const imageSources = {
    background: 'assets/images/aurora-bg.png',
    backgroundAlt1: 'assets/images/backgrounds/bg-neon-01.png',
    backgroundAlt2: 'assets/images/backgrounds/bg-neon-02.png',
    backgroundAlt3: 'assets/images/backgrounds/bg-neon-03.png',
    backgroundAlt4: 'assets/images/backgrounds/bg-neon-04.png',
    launcher: 'assets/images/launcher.png',
    popSheet: 'assets/animations/pop-spritesheet.png',
    sparkleSheet: 'assets/animations/sparkle-spritesheet.png',
    gift_bomb: 'assets/images/powerups/bomb.png',
    gift_fire: 'assets/images/powerups/fire.png',
    gift_clock: 'assets/images/powerups/clock.png',
    ...Object.fromEntries(CONFIG.colors.map(name => [`bubble_${name}`, `assets/images/bubbles/${name}.png`])),
  };

  const audioSources = {
    music: 'assets/audio/neon-orbit.wav',
    shoot: 'assets/audio/shoot.wav',
    pop: 'assets/audio/pop.wav',
    drop: 'assets/audio/drop.wav',
    bounce: 'assets/audio/bounce.wav',
    tick: 'assets/audio/tick.wav',
    win: 'assets/audio/win.wav',
    lose: 'assets/audio/lose.wav',
    bomb: 'assets/audio/bomb.wav',
    fire: 'assets/audio/fire.wav',
    clock: 'assets/audio/clock.wav',
  };

  const state = {
    mode: 'loading',
    grid: [],
    parity: 0,
    incomingRow: [],
    currentColor: 0,
    nextColor: 1,
    projectile: null,
    aim: -Math.PI / 2,
    pointer: { x: W / 2, y: CONFIG.shooterY - 300, active: false },
    score: 0,
    best: Number(localStorage.getItem('bobblePopNeonBest') || 0),
    combo: 0,
    maxCombo: 1,
    shots: 0,
    rowProgress: 0,
    gameTime: 0,
    lastTime: performance.now(),
    particles: [],
    bursts: [],
    fallers: [],
    trails: [],
    floatTexts: [],
    fireWaves: [],
    bombRings: [],
    stars: [],
    shake: 0,
    flash: 0,
    muted: localStorage.getItem('bobblePopNeonMuted') === '1',
    keyboardAim: false,
    heldLeft: false,
    heldRight: false,
    swapCooldown: 0,
    freezeTimer: 0,
    assetsReady: false,
  };

  UI.best.textContent = state.best.toLocaleString('vi-VN');

  class AudioManager {
    constructor() {
      this.music = null;
      this.unlocked = false;
    }

    init() {
      for (const [key, src] of Object.entries(audioSources)) {
        const audio = new Audio(src);
        audio.preload = 'auto';
        if (key === 'music') {
          audio.loop = true;
          audio.volume = 0.28;
          this.music = audio;
        } else {
          audio.volume = key === 'pop' ? 0.55 : 0.42;
        }
        assets.audio[key] = audio;
      }
    }

    unlock() {
      this.unlocked = true;
      if (!state.muted && this.music) {
        this.music.currentTime = 0;
        this.music.play().catch(() => {});
      }
    }

    play(name, volume = 1, rate = 1) {
      if (state.muted || !this.unlocked || !assets.audio[name]) return;
      const sound = assets.audio[name].cloneNode();
      sound.volume = Math.min(1, assets.audio[name].volume * volume);
      sound.playbackRate = rate;
      sound.play().catch(() => {});
    }

    setMuted(muted) {
      state.muted = muted;
      localStorage.setItem('bobblePopNeonMuted', muted ? '1' : '0');
      if (this.music) {
        if (muted) this.music.pause();
        else if (this.unlocked && state.mode === 'playing') this.music.play().catch(() => {});
      }
      UI.mute.textContent = muted ? '♩' : '♫';
      UI.mute.setAttribute('aria-label', muted ? 'Unmute audio' : 'Mute audio');
    }
  }

  const audio = new AudioManager();
  audio.init();
  audio.setMuted(state.muted);

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Could not load image: ${src}`));
      image.src = src;
    });
  }

  async function loadAssets() {
    try {
      await Promise.all(Object.entries(imageSources).map(async ([key, src]) => {
        assets.images[key] = await loadImage(src);
      }));
      assets.backgrounds = [
        assets.images.background,
        assets.images.backgroundAlt1,
        assets.images.backgroundAlt2,
        assets.images.backgroundAlt3,
        assets.images.backgroundAlt4,
      ].filter(Boolean);
      assets.activeBackground = assets.backgrounds[Math.floor(Math.random() * assets.backgrounds.length)] || null;
      state.assetsReady = true;
      state.mode = 'menu';
      UI.loading.classList.add('hidden');
      UI.start.classList.remove('hidden');
      initAmbientStars();
      resetGame(false);
    } catch (error) {
      console.error(error);
      UI.loading.querySelector('p').textContent = 'Could not load assets. Please open the game from the correct folder.';
      state.assetsReady = false;
    }
  }

  function initAmbientStars() {
    state.stars = Array.from({ length: 75 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: 0.7 + Math.random() * 2.2,
      speed: 4 + Math.random() * 12,
      phase: Math.random() * Math.PI * 2,
    }));
  }

  function emptyGrid() {
    return Array.from({ length: CONFIG.rowsMax }, () => Array(CONFIG.cols).fill(null));
  }

  function makeCell(color, delay = 0) {
    return { type: 'bubble', color, born: state.gameTime + delay, wobble: Math.random() * Math.PI * 2 };
  }

  function makeGift(gift, delay = 0) {
    return { type: 'gift', gift, born: state.gameTime + delay, wobble: Math.random() * Math.PI * 2 };
  }

  function randomGiftType() {
    return CONFIG.giftTypes[Math.floor(Math.random() * CONFIG.giftTypes.length)];
  }

  function incomingToCell(item, delay = 0) {
    if (item === null || item === undefined) return null;
    if (typeof item === 'object' && item.gift) return makeGift(item.gift, delay);
    return makeCell(item, delay);
  }

  function resetGame(startPlaying = true) {
    state.grid = emptyGrid();
    state.parity = 0;
    state.projectile = null;
    state.aim = -Math.PI / 2;
    state.score = 0;
    state.combo = 0;
    state.maxCombo = 1;
    state.shots = 0;
    state.rowProgress = 0;
    state.gameTime = 0;
    if (assets.backgrounds && assets.backgrounds.length) {
      assets.activeBackground = assets.backgrounds[Math.floor(Math.random() * assets.backgrounds.length)];
    }
    state.particles.length = 0;
    state.bursts.length = 0;
    state.fallers.length = 0;
    state.trails.length = 0;
    state.floatTexts.length = 0;
    state.fireWaves.length = 0;
    state.bombRings.length = 0;
    state.shake = 0;
    state.flash = 0;
    state.swapCooldown = 0;
    state.freezeTimer = 0;
    UI.powerStatus.classList.add('hidden');

    for (let r = 0; r < CONFIG.startRows; r++) {
      for (let c = 0; c < CONFIG.cols; c++) {
        const gapChance = r < 3 ? 0.02 : r < 5 ? 0.12 : 0.24;
        if (Math.random() < gapChance) continue;
        state.grid[r][c] = makeCell(randomColor(), -1 - Math.random() * 2);
      }
    }

    // Luôn đặt đủ 3 quà tặng trên bàn đầu tiên để người chơi thấy và thử ngay.
    const starterGifts = [
      { gift: 'bomb', r: 2, c: 2 + Math.floor(Math.random() * 2) },
      { gift: 'fire', r: 4, c: 5 + Math.floor(Math.random() * 2) },
      { gift: 'clock', r: 5, c: 8 + Math.floor(Math.random() * 2) },
    ];
    for (const item of starterGifts) {
      state.grid[item.r][item.c] = makeGift(item.gift, -0.8 - Math.random());
    }

    generateIncomingRow();
    state.currentColor = pickPlayableColor();
    state.nextColor = pickPlayableColor();
    updateHUD();

    if (startPlaying) {
      state.mode = 'playing';
      hideAllOverlays();
      if (!state.muted && audio.music) audio.music.play().catch(() => {});
    }
  }

  function hideAllOverlays() {
    UI.start.classList.add('hidden');
    UI.pause.classList.add('hidden');
    UI.over.classList.add('hidden');
  }

  function randomColor() {
    return Math.floor(Math.random() * CONFIG.colors.length);
  }

  function generateIncomingRow() {
    let giftPlaced = false;
    state.incomingRow = Array.from({ length: CONFIG.cols }, (_, c) => {
      if (Math.random() < 0.1 && c !== 0 && c !== CONFIG.cols - 1) return null;
      if (!giftPlaced && c > 0 && c < CONFIG.cols - 1 && Math.random() < CONFIG.incomingGiftChance) {
        giftPlaced = true;
        return { gift: randomGiftType() };
      }
      return randomColor();
    });
  }

  function presentColors() {
    const set = new Set();
    for (const row of state.grid) {
      for (const cell of row) if (cell && cell.type === 'bubble') set.add(cell.color);
    }
    for (const item of state.incomingRow) {
      if (typeof item === 'number') set.add(item);
    }
    return [...set];
  }

  function pickPlayableColor() {
    const colors = presentColors();
    return colors.length ? colors[Math.floor(Math.random() * colors.length)] : randomColor();
  }

  function gridToWorld(r, c) {
    const offset = ((r ^ state.parity) & 1) ? CONFIG.bubbleSize / 2 : 0;
    return {
      x: CONFIG.fieldLeft + CONFIG.bubbleRadius + offset + c * CONFIG.bubbleSize,
      y: CONFIG.topY + r * CONFIG.rowHeight + state.rowProgress * CONFIG.rowHeight,
    };
  }

  function worldToGrid(x, y) {
    let r = Math.round((y - CONFIG.topY - state.rowProgress * CONFIG.rowHeight) / CONFIG.rowHeight);
    r = clamp(r, 0, CONFIG.rowsMax - 1);
    const offset = ((r ^ state.parity) & 1) ? CONFIG.bubbleSize / 2 : 0;
    let c = Math.round((x - CONFIG.fieldLeft - CONFIG.bubbleRadius - offset) / CONFIG.bubbleSize);
    c = clamp(c, 0, CONFIG.cols - 1);
    return { r, c };
  }

  function inBounds(r, c) {
    return r >= 0 && r < CONFIG.rowsMax && c >= 0 && c < CONFIG.cols;
  }

  function neighbors(r, c) {
    const odd = (r ^ state.parity) & 1;
    const candidates = [
      [r, c - 1], [r, c + 1],
      [r - 1, c + (odd ? 0 : -1)], [r - 1, c + (odd ? 1 : 0)],
      [r + 1, c + (odd ? 0 : -1)], [r + 1, c + (odd ? 1 : 0)],
    ];
    return candidates.filter(([rr, cc]) => inBounds(rr, cc));
  }

  function nearestEmptyCell(x, y) {
    const base = worldToGrid(x, y);
    let best = null;
    let bestDistance = Infinity;

    for (let radius = 0; radius <= 3; radius++) {
      for (let dr = -radius; dr <= radius; dr++) {
        for (let dc = -radius; dc <= radius; dc++) {
          const r = base.r + dr;
          const c = base.c + dc;
          if (!inBounds(r, c) || state.grid[r][c]) continue;
          const p = gridToWorld(r, c);
          const dist = (p.x - x) ** 2 + (p.y - y) ** 2;
          if (dist < bestDistance) {
            best = { r, c };
            bestDistance = dist;
          }
        }
      }
      if (best) break;
    }
    return best;
  }

  function getCluster(startR, startC) {
    const start = state.grid[startR][startC];
    if (!start || start.type !== 'bubble') return [];
    const targetColor = start.color;
    const stack = [[startR, startC]];
    const visited = new Set([`${startR},${startC}`]);
    const cluster = [];

    while (stack.length) {
      const [r, c] = stack.pop();
      cluster.push([r, c]);
      for (const [nr, nc] of neighbors(r, c)) {
        const key = `${nr},${nc}`;
        const cell = state.grid[nr][nc];
        if (visited.has(key) || !cell || cell.type !== 'bubble' || cell.color !== targetColor) continue;
        visited.add(key);
        stack.push([nr, nc]);
      }
    }
    return cluster;
  }

  function findFloatingCells() {
    const anchored = new Set();
    const stack = [];
    for (let c = 0; c < CONFIG.cols; c++) {
      if (state.grid[0][c]) {
        stack.push([0, c]);
        anchored.add(`0,${c}`);
      }
    }

    while (stack.length) {
      const [r, c] = stack.pop();
      for (const [nr, nc] of neighbors(r, c)) {
        const key = `${nr},${nc}`;
        if (!state.grid[nr][nc] || anchored.has(key)) continue;
        anchored.add(key);
        stack.push([nr, nc]);
      }
    }

    const floating = [];
    for (let r = 0; r < CONFIG.rowsMax; r++) {
      for (let c = 0; c < CONFIG.cols; c++) {
        if (state.grid[r][c] && !anchored.has(`${r},${c}`)) floating.push([r, c]);
      }
    }
    return floating;
  }

  function getShooterCenter() {
    return { x: W / 2, y: CONFIG.shooterY - 10 };
  }

  function getAimDirection() {
    return { x: Math.cos(state.aim), y: Math.sin(state.aim) };
  }

  function getMuzzlePosition(distance = 50) {
    const center = getShooterCenter();
    const dir = getAimDirection();
    return { x: center.x + dir.x * distance, y: center.y + dir.y * distance };
  }

  function shoot() {
    if (state.mode !== 'playing' || state.projectile) return;
    const dir = getAimDirection();
    const muzzle = getMuzzlePosition(56);
    state.projectile = {
      x: muzzle.x,
      y: muzzle.y,
      vx: dir.x * CONFIG.shotSpeed,
      vy: dir.y * CONFIG.shotSpeed,
      color: state.currentColor,
      rotation: 0,
    };
    state.currentColor = state.nextColor;
    state.nextColor = pickPlayableColor();
    state.shots++;
    audio.play('shoot', 1, 0.96 + Math.random() * 0.08);
    spawnMuzzleParticles();
  }

  function placeProjectile(x, y) {
    const projectile = state.projectile;
    if (!projectile) return;
    const slot = nearestEmptyCell(x, y);
    if (!slot) {
      state.projectile = null;
      endGame(false);
      return;
    }

    const p = gridToWorld(slot.r, slot.c);
    state.grid[slot.r][slot.c] = makeCell(projectile.color, 0);
    state.projectile = null;
    spawnSnapRing(p.x, p.y, CONFIG.colors[projectile.color]);
    resolvePlacement(slot.r, slot.c, p);
  }


  function hitGift(r, c) {
    const cell = state.grid[r][c];
    if (!cell || cell.type !== 'gift') return false;
    const impact = gridToWorld(r, c);
    state.projectile = null;
    state.grid[r][c] = null;
    activateGift(cell.gift, r, c, impact);
    return true;
  }

  function activateGift(type, row, col, impact) {
    let removed = 0;
    let label = '';
    let labelColor = '#ffffff';

    spawnPowerParticles(type, impact.x, impact.y, type === 'bomb' ? 42 : 30);

    if (type === 'bomb') {
      const radius = CONFIG.bubbleSize * 2.15;
      const radiusSquared = radius * radius;
      state.bombRings.push({ x: impact.x, y: impact.y, time: 0, life: 0.72, radius });

      for (let r = 0; r < CONFIG.rowsMax; r++) {
        for (let c = 0; c < CONFIG.cols; c++) {
          const cell = state.grid[r][c];
          if (!cell) continue;
          const p = gridToWorld(r, c);
          if ((p.x - impact.x) ** 2 + (p.y - impact.y) ** 2 <= radiusSquared) {
            removeCellWithPowerFX(r, c, Math.random() * 0.12);
            removed++;
          }
        }
      }

      const points = 350 + removed * 140;
      state.score += points;
      label = `BOMB BLAST +${points}`;
      labelColor = '#ff7aa8';
      audio.play('bomb', 1, 0.96 + Math.random() * 0.06);
      state.shake = Math.max(state.shake, 25);
      state.flash = Math.max(state.flash, 0.32);
    } else if (type === 'fire') {
      state.fireWaves.push({ row, y: impact.y, time: 0, life: 1.05 });
      for (let c = 0; c < CONFIG.cols; c++) {
        if (!state.grid[row][c]) continue;
        removeCellWithPowerFX(row, c, c * 0.035);
        removed++;
      }

      const points = 500 + removed * 170;
      state.score += points;
      label = `FIRE LINE +${points}`;
      labelColor = '#ffd36a';
      audio.play('fire', 1, 1);
      state.shake = Math.max(state.shake, 17);
      state.flash = Math.max(state.flash, 0.22);
    } else if (type === 'clock') {
      state.freezeTimer = Math.min(30, state.freezeTimer + CONFIG.freezeSeconds);
      state.score += 500;
      label = `TIME FREEZE +${CONFIG.freezeSeconds}s`;
      labelColor = '#70f3ff';
      audio.play('clock', 1, 1);
      state.flash = Math.max(state.flash, 0.16);
      updatePowerStatus();
    }

    addFloatText(impact.x, Math.max(170, impact.y - 38), label, labelColor, 30);

    const floating = findFloatingCells();
    if (floating.length) {
      const bonus = floating.length * 160;
      state.score += bonus;
      addFloatText(W / 2, 430, `ORBIT DROP +${bonus}`, '#6ff7df', 30);
      dropFloating(floating, impact);
      audio.play('drop', 0.9, 0.98);
    }

    state.combo += 1;
    state.maxCombo = Math.max(state.maxCombo, state.combo);
    showCombo(state.combo);

    if (countBubbles() === 0) {
      endGame(true);
      return;
    }
    if (bubblePastLoseLine()) endGame(false);
    updateHUD();
  }

  function removeCellWithPowerFX(r, c, delay = 0) {
    const cell = state.grid[r][c];
    if (!cell) return;
    const p = gridToWorld(r, c);
    if (cell.type === 'bubble') {
      spawnPop(p.x, p.y, cell.color, delay);
    } else {
      spawnPowerParticles(cell.gift, p.x, p.y, 14);
    }
    state.grid[r][c] = null;
  }

  function spawnPowerParticles(type, x, y, count = 24) {
    const palette = type === 'bomb'
      ? ['#ff4d87', '#ffb04f', '#ffffff']
      : type === 'fire'
        ? ['#ff6b2f', '#ffd05a', '#fff2ae']
        : ['#55ecff', '#8c7cff', '#ffffff'];

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 100 + Math.random() * (type === 'bomb' ? 480 : 300);
      state.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        gravity: type === 'fire' ? -45 : 260,
        life: 0.45 + Math.random() * 0.55,
        maxLife: 1,
        size: 4 + Math.random() * 12,
        color: palette[Math.floor(Math.random() * palette.length)],
        rotation: angle,
        spin: (Math.random() - 0.5) * 12,
        shape: Math.random() > 0.45 ? 'spark' : 'dot',
      });
    }
  }

  function resolvePlacement(r, c, impact) {
    const cluster = getCluster(r, c);
    if (cluster.length >= 3) {
      state.combo += 1;
      state.maxCombo = Math.max(state.maxCombo, state.combo);
      const multiplier = Math.min(6, 1 + (state.combo - 1) * 0.35);
      const points = Math.round(cluster.length * 100 * multiplier);
      state.score += points;
      showCombo(state.combo);
      addFloatText(impact.x, impact.y - 20, `+${points}`, '#ffffff', 34);

      for (const [rr, cc] of cluster) {
        const cell = state.grid[rr][cc];
        if (!cell) continue;
        const p = gridToWorld(rr, cc);
        spawnPop(p.x, p.y, cell.color, Math.random() * 0.08);
        state.grid[rr][cc] = null;
      }
      audio.play('pop', 1, 0.92 + Math.min(0.25, cluster.length * 0.015));
      state.shake = Math.min(18, 4 + cluster.length * 0.7);
      state.flash = Math.min(0.22, 0.05 + cluster.length * 0.006);

      const floating = findFloatingCells();
      if (floating.length) {
        const bonus = floating.length * 160;
        state.score += bonus;
        addFloatText(W / 2, 430, `ORBIT DROP +${bonus}`, '#6ff7df', 30);
        dropFloating(floating, impact);
        audio.play('drop', 0.95, 0.95 + Math.random() * 0.08);
      }
    } else {
      state.combo = 0;
      audio.play('tick', 0.65, 0.85);
    }

    if (countBubbles() === 0) {
      endGame(true);
      return;
    }
    if (bubblePastLoseLine()) endGame(false);
    updateHUD();
  }

  function countBubbles() {
    let count = 0;
    for (const row of state.grid) for (const cell of row) if (cell) count++;
    return count;
  }

  function dropFloating(cells, impact) {
    let maxR = 0;
    for (const [r] of cells) maxR = Math.max(maxR, r);
    for (const [r, c] of cells) {
      const cell = state.grid[r][c];
      if (!cell) continue;
      const p = gridToWorld(r, c);
      state.fallers.push({
        x: p.x,
        y: p.y,
        vx: clamp((p.x - impact.x) * 1.2, -230, 230) + (Math.random() - 0.5) * 70,
        vy: -80 - Math.random() * 80,
        type: cell.type,
        color: cell.color,
        gift: cell.gift,
        delay: (maxR - r) * 0.035,
        rotation: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 6,
        scale: 1,
      });
      state.grid[r][c] = null;
    }
  }

  function addRow() {
    for (let r = CONFIG.rowsMax - 1; r > 0; r--) {
      state.grid[r] = state.grid[r - 1];
    }
    state.grid[0] = state.incomingRow.map((item, c) => incomingToCell(item, c * 0.025));
    state.parity ^= 1;
    generateIncomingRow();
    audio.play('tick', 0.9, 0.75);
    state.shake = Math.max(state.shake, 4);
    if (bubblePastLoseLine()) endGame(false);
  }

  function bubblePastLoseLine() {
    for (let r = 0; r < CONFIG.rowsMax; r++) {
      for (let c = 0; c < CONFIG.cols; c++) {
        if (!state.grid[r][c]) continue;
        if (gridToWorld(r, c).y + CONFIG.bubbleRadius >= CONFIG.loseY) return true;
      }
    }
    return false;
  }

  function endGame(won) {
    if (state.mode === 'gameover') return;
    state.mode = 'gameover';
    state.projectile = null;
    state.freezeTimer = 0;
    updatePowerStatus();

    if (state.score > state.best) {
      state.best = state.score;
      localStorage.setItem('bobblePopNeonBest', String(state.best));
    }
    updateHUD();

    UI.resultKicker.textContent = won ? 'GALAXY CLEARED' : 'ORBIT DESTABILIZED';
    UI.resultTitle.textContent = won ? 'YOU WIN!' : 'GAME OVER';
    UI.resultMessage.textContent = won
      ? 'You popped every bubble and kept the orbit safe.'
      : 'The bubbles crossed the danger line. Try a new combo run.';
    UI.finalScore.textContent = state.score.toLocaleString('vi-VN');
    UI.finalCombo.textContent = `×${Math.max(1, state.maxCombo)}`;
    UI.over.classList.remove('hidden');
    audio.play(won ? 'win' : 'lose', 1, 1);
    if (audio.music) audio.music.volume = 0.12;
  }

  function pauseGame() {
    if (state.mode !== 'playing') return;
    state.mode = 'paused';
    UI.pause.classList.remove('hidden');
    if (audio.music) audio.music.volume = 0.12;
  }

  function resumeGame() {
    if (state.mode !== 'paused') return;
    state.mode = 'playing';
    UI.pause.classList.add('hidden');
    state.lastTime = performance.now();
    if (audio.music) audio.music.volume = 0.28;
  }

  function swapBubbles() {
    if (state.mode !== 'playing' || state.projectile || state.swapCooldown > 0) return;
    [state.currentColor, state.nextColor] = [state.nextColor, state.currentColor];
    state.swapCooldown = 1.6;
    audio.play('tick', 0.75, 1.3);
    spawnSwapSparkles();
  }

  function update(dt) {
    for (const star of state.stars) {
      star.y += star.speed * dt;
      if (star.y > H + 5) {
        star.y = -5;
        star.x = Math.random() * W;
      }
    }

    if (state.mode !== 'playing') {
      updateEffects(dt * 0.55);
      return;
    }

    state.gameTime += dt;
    state.swapCooldown = Math.max(0, state.swapCooldown - dt);
    UI.swap.disabled = state.swapCooldown > 0 || !!state.projectile;

    if (state.heldLeft || state.heldRight) {
      state.keyboardAim = true;
      const direction = (state.heldRight ? 1 : 0) - (state.heldLeft ? 1 : 0);
      state.aim = clamp(state.aim + direction * 1.8 * dt, CONFIG.minAim, CONFIG.maxAim);
    }

    if (state.freezeTimer > 0) {
      state.freezeTimer = Math.max(0, state.freezeTimer - dt);
      updatePowerStatus();
    } else {
      state.rowProgress += dt / CONFIG.secondsPerRow;
      if (state.rowProgress >= 1) {
        state.rowProgress -= 1;
        addRow();
      }
    }

    if (state.projectile) updateProjectile(dt);
    updateEffects(dt);
    updateHUD();
  }

  function updateProjectile(dt) {
    const p = state.projectile;
    const previous = { x: p.x, y: p.y };
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rotation += dt * 4;

    state.trails.push({ x: previous.x, y: previous.y, color: p.color, life: 0.22, maxLife: 0.22, size: 18 });

    if (p.x <= CONFIG.minX) {
      p.x = CONFIG.minX;
      p.vx = Math.abs(p.vx);
      audio.play('bounce', 0.55, 0.9 + Math.random() * 0.18);
      spawnWallSpark(p.x, p.y);
    } else if (p.x >= CONFIG.maxX) {
      p.x = CONFIG.maxX;
      p.vx = -Math.abs(p.vx);
      audio.play('bounce', 0.55, 0.9 + Math.random() * 0.18);
      spawnWallSpark(p.x, p.y);
    }

    const ceilingY = CONFIG.topY + state.rowProgress * CONFIG.rowHeight;
    if (p.y <= ceilingY) {
      placeProjectile(p.x, ceilingY);
      return;
    }

    const hitDistance = (CONFIG.bubbleRadius * 1.83) ** 2;
    for (let r = 0; r < CONFIG.rowsMax; r++) {
      for (let c = 0; c < CONFIG.cols; c++) {
        if (!state.grid[r][c]) continue;
        const q = gridToWorld(r, c);
        if ((q.x - p.x) ** 2 + (q.y - p.y) ** 2 <= hitDistance) {
          const target = state.grid[r][c];
          if (target && target.type === 'gift') hitGift(r, c);
          else placeProjectile(p.x, p.y);
          return;
        }
      }
    }
  }

  function updateEffects(dt) {
    for (let i = state.trails.length - 1; i >= 0; i--) {
      const item = state.trails[i];
      item.life -= dt;
      item.size *= 0.965;
      if (item.life <= 0) state.trails.splice(i, 1);
    }

    for (let i = state.bursts.length - 1; i >= 0; i--) {
      const item = state.bursts[i];
      item.time += dt;
      if (item.time >= item.life) state.bursts.splice(i, 1);
    }

    for (let i = state.fireWaves.length - 1; i >= 0; i--) {
      const wave = state.fireWaves[i];
      wave.time += dt;
      if (wave.time >= wave.life) state.fireWaves.splice(i, 1);
    }

    for (let i = state.bombRings.length - 1; i >= 0; i--) {
      const ring = state.bombRings[i];
      ring.time += dt;
      if (ring.time >= ring.life) state.bombRings.splice(i, 1);
    }

    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.pow(0.985, dt * 60);
      p.vy += p.gravity * dt;
      p.rotation += p.spin * dt;
      if (p.life <= 0) state.particles.splice(i, 1);
    }

    for (let i = state.fallers.length - 1; i >= 0; i--) {
      const f = state.fallers[i];
      if (f.delay > 0) {
        f.delay -= dt;
        continue;
      }
      f.vy += 820 * dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.rotation += f.spin * dt;
      f.scale *= Math.pow(0.996, dt * 60);
      if (f.y > H + 100) state.fallers.splice(i, 1);
    }

    for (let i = state.floatTexts.length - 1; i >= 0; i--) {
      const text = state.floatTexts[i];
      text.life -= dt;
      text.y -= 48 * dt;
      if (text.life <= 0) state.floatTexts.splice(i, 1);
    }

    state.shake = Math.max(0, state.shake - 30 * dt);
    state.flash = Math.max(0, state.flash - dt * 0.7);
  }

  function spawnMuzzleParticles() {
    const dir = getAimDirection();
    const muzzle = getMuzzlePosition(62);
    for (let i = 0; i < 14; i++) {
      const spread = (Math.random() - 0.5) * 0.9;
      const angle = state.aim + spread;
      const speed = 100 + Math.random() * 180;
      state.particles.push({
        x: muzzle.x + dir.x * 3,
        y: muzzle.y + dir.y * 3,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        gravity: 40,
        life: 0.28 + Math.random() * 0.18,
        maxLife: 0.46,
        size: 3 + Math.random() * 8,
        color: '#8cf7ff',
        rotation: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 8,
        shape: 'spark',
      });
    }
  }

  function spawnPop(x, y, colorIndex, delay = 0) {
    state.bursts.push({ x, y, color: colorIndex, time: -delay, life: 0.48, scale: 1 });
    const color = CONFIG.colors[colorIndex];
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 110 + Math.random() * 300;
      state.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        gravity: 420,
        life: 0.45 + Math.random() * 0.4 + delay,
        maxLife: 0.85 + delay,
        size: 5 + Math.random() * 10,
        color,
        rotation: angle,
        spin: (Math.random() - 0.5) * 10,
        shape: Math.random() > 0.42 ? 'dot' : 'spark',
      });
    }
  }

  function spawnSnapRing(x, y, color) {
    state.bursts.push({ x, y, color: CONFIG.colors.indexOf(color), time: 0.18, life: 0.5, scale: 0.55 });
  }

  function spawnWallSpark(x, y) {
    for (let i = 0; i < 8; i++) {
      state.particles.push({
        x, y,
        vx: (x < W / 2 ? 1 : -1) * (40 + Math.random() * 120),
        vy: (Math.random() - 0.5) * 190,
        gravity: 80,
        life: 0.2 + Math.random() * 0.25,
        maxLife: 0.45,
        size: 3 + Math.random() * 6,
        color: '#8cf7ff',
        rotation: Math.random() * Math.PI,
        spin: 8,
        shape: 'spark',
      });
    }
  }

  function spawnSwapSparkles() {
    for (const x of [W / 2, W / 2 + 145]) {
      for (let i = 0; i < 10; i++) {
        const angle = Math.random() * Math.PI * 2;
        state.particles.push({
          x, y: CONFIG.shooterY + 10,
          vx: Math.cos(angle) * (60 + Math.random() * 120),
          vy: Math.sin(angle) * (60 + Math.random() * 120),
          gravity: 70,
          life: 0.45 + Math.random() * 0.25,
          maxLife: 0.7,
          size: 5 + Math.random() * 6,
          color: '#ffffff',
          rotation: angle,
          spin: 5,
          shape: 'spark',
        });
      }
    }
  }

  function addFloatText(x, y, text, color, size) {
    state.floatTexts.push({ x, y, text, color, size, life: 1.15, maxLife: 1.15 });
  }

  function showCombo(combo) {
    if (combo <= 1) return;
    UI.combo.textContent = `COMBO ×${combo}`;
    UI.combo.classList.remove('show');
    void UI.combo.offsetWidth;
    UI.combo.classList.add('show');
  }

  function updatePowerStatus() {
    if (state.freezeTimer > 0) {
      UI.powerStatus.textContent = `⏱ TIME FREEZE ${Math.ceil(state.freezeTimer)}s`;
      UI.powerStatus.classList.remove('hidden');
    } else {
      UI.powerStatus.classList.add('hidden');
    }
  }

  function updateHUD() {
    UI.score.textContent = state.score.toLocaleString('vi-VN');
    UI.best.textContent = Math.max(state.best, state.score).toLocaleString('vi-VN');
    const seconds = Math.max(0, Math.ceil((1 - state.rowProgress) * CONFIG.secondsPerRow));
    UI.rowTimer.textContent = state.freezeTimer > 0 ? `⏱ ${Math.ceil(state.freezeTimer)}` : String(seconds);
    UI.dangerFill.style.width = `${state.rowProgress * 100}%`;
    updatePowerStatus();
  }

  function draw() {
    ctx.save();
    ctx.clearRect(0, 0, W, H);

    if (!state.assetsReady) {
      drawLoadingFallback();
      ctx.restore();
      return;
    }

    const shakeX = state.shake ? (Math.random() - 0.5) * state.shake : 0;
    const shakeY = state.shake ? (Math.random() - 0.5) * state.shake : 0;
    ctx.translate(shakeX, shakeY);

    drawBackground();
    drawPlayfield();
    drawAimGuide();
    drawTrails();
    drawGrid();
    drawPowerEffects();
    drawFallers();
    drawProjectile();
    drawBursts();
    drawParticles();
    drawShooter();
    drawFloatTexts();

    if (state.flash > 0) {
      ctx.fillStyle = `rgba(155, 244, 255, ${state.flash})`;
      ctx.fillRect(-30, -30, W + 60, H + 60);
    }

    ctx.restore();
  }

  function drawLoadingFallback() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#081030');
    g.addColorStop(0.6, '#090b28');
    g.addColorStop(1, '#050719');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    const glowA = ctx.createRadialGradient(W * 0.2, H * 0.2, 10, W * 0.2, H * 0.2, 260);
    glowA.addColorStop(0, 'rgba(74, 244, 255, 0.20)');
    glowA.addColorStop(1, 'rgba(74, 244, 255, 0)');
    ctx.fillStyle = glowA;
    ctx.fillRect(0, 0, W, H);

    const glowB = ctx.createRadialGradient(W * 0.82, H * 0.16, 10, W * 0.82, H * 0.16, 300);
    glowB.addColorStop(0, 'rgba(171, 92, 255, 0.22)');
    glowB.addColorStop(1, 'rgba(171, 92, 255, 0)');
    ctx.fillStyle = glowB;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    for (let y = 0; y < H; y += 28) {
      for (let x = 0; x < W; x += 28) {
        ctx.fillRect(x, y, 2, 2);
      }
    }

    ctx.fillStyle = 'rgba(210, 240, 255, 0.8)';
    ctx.textAlign = 'center';
    ctx.font = '800 30px Segoe UI, sans-serif';
    ctx.fillText('Loading Bobble Pop...', W / 2, H / 2);
  }

  function drawBackground() {
    const bg = assets.activeBackground || assets.images.background;
    if (bg) ctx.drawImage(bg, 0, 0, W, H);
    const time = performance.now() / 1000;
    const glow = ctx.createRadialGradient(W * 0.5, 890, 20, W * 0.5, 890, 520);
    glow.addColorStop(0, 'rgba(50, 228, 255, .08)');
    glow.addColorStop(0.5, 'rgba(112, 70, 255, .045)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    for (const star of state.stars) {
      const alpha = 0.2 + 0.45 * (0.5 + 0.5 * Math.sin(time * 1.8 + star.phase));
      ctx.fillStyle = `rgba(215,248,255,${alpha})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawPlayfield() {
    const top = 110;
    const bottom = 930;
    const left = CONFIG.fieldLeft - 12;
    const right = CONFIG.fieldRight + 12;

    const panel = ctx.createLinearGradient(0, top, 0, bottom);
    panel.addColorStop(0, 'rgba(17, 35, 92, .34)');
    panel.addColorStop(0.55, 'rgba(12, 18, 66, .25)');
    panel.addColorStop(1, 'rgba(8, 10, 38, .56)');
    ctx.fillStyle = panel;
    roundRect(ctx, left, top, right - left, bottom - top, 34);
    ctx.fill();

    ctx.save();
    ctx.shadowBlur = 22;
    ctx.shadowColor = 'rgba(75, 230, 255, .42)';
    ctx.strokeStyle = 'rgba(123, 237, 255, .42)';
    ctx.lineWidth = 3;
    roundRect(ctx, left, top, right - left, bottom - top, 34);
    ctx.stroke();
    ctx.restore();

    const dangerPulse = 0.5 + 0.5 * Math.sin(performance.now() / 170);
    const frozen = state.freezeTimer > 0;
    ctx.save();
    ctx.setLineDash([12, 12]);
    ctx.lineDashOffset = -performance.now() / 35;
    ctx.strokeStyle = frozen
      ? `rgba(91, 239, 255, ${0.55 + dangerPulse * 0.3})`
      : `rgba(255, 91, 148, ${0.46 + dangerPulse * 0.25})`;
    ctx.lineWidth = frozen ? 5 : 3;
    ctx.shadowBlur = frozen ? 22 : 12;
    ctx.shadowColor = frozen ? '#5befff' : '#ff4b93';
    ctx.beginPath();
    ctx.moveTo(CONFIG.fieldLeft + 8, CONFIG.loseY);
    ctx.lineTo(CONFIG.fieldRight - 8, CONFIG.loseY);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = frozen ? 'rgba(126, 247, 255, .9)' : 'rgba(255, 118, 168, .72)';
    ctx.font = '800 14px Segoe UI, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(frozen ? `TIME FROZEN ${Math.ceil(state.freezeTimer)}s` : 'DANGER ORBIT', CONFIG.fieldLeft + 18, CONFIG.loseY - 12);
  }

  function drawGrid() {
    const now = state.gameTime;
    for (let r = 0; r < CONFIG.rowsMax; r++) {
      for (let c = 0; c < CONFIG.cols; c++) {
        const cell = state.grid[r][c];
        if (!cell) continue;
        const p = gridToWorld(r, c);
        if (p.y < 80 || p.y > H + 80) continue;
        const age = now - cell.born;
        const intro = clamp(age / 0.24, 0, 1);
        const eased = 1 - Math.pow(1 - intro, 3);
        const wobble = 1 + Math.sin(now * 2.1 + cell.wobble) * 0.012;
        const nearDanger = p.y + CONFIG.bubbleRadius > CONFIG.loseY - 70;
        const pulse = nearDanger ? 1 + Math.sin(performance.now() / 100) * 0.045 : 1;
        if (cell.type === 'gift') drawGift(p.x, p.y, cell.gift, eased * wobble * pulse, cell.wobble);
        else drawBubble(p.x, p.y, cell.color, eased * wobble * pulse, 0);
      }
    }
  }

  function drawBubble(x, y, colorIndex, scale = 1, rotation = 0, alpha = 1) {
    const image = assets.images[`bubble_${CONFIG.colors[colorIndex]}`];
    if (!image) return;
    const size = 76 * scale;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.drawImage(image, -size / 2, -size / 2, size, size);
    ctx.restore();
  }

  function drawGift(x, y, gift, scale = 1, phase = 0, alpha = 1) {
    const image = assets.images[`gift_${gift}`];
    if (!image) return;
    const time = performance.now() / 1000;
    const pulse = 1 + Math.sin(time * 4.2 + phase) * 0.055;
    const size = 78 * scale * pulse;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(Math.sin(time * 2.2 + phase) * 0.055);
    ctx.shadowBlur = 22;
    ctx.shadowColor = gift === 'bomb' ? '#ff4d87' : gift === 'fire' ? '#ff9a3c' : '#62efff';
    ctx.drawImage(image, -size / 2, -size / 2, size, size);
    ctx.restore();
  }

  function drawAimGuide() {
    if (state.mode !== 'playing' || state.projectile) return;
    const muzzle = getMuzzlePosition(60);
    let x = muzzle.x;
    let y = muzzle.y;
    let dx = Math.cos(state.aim);
    let dy = Math.sin(state.aim);
    const step = 14;
    const maxSteps = 110;
    const hitDistance = (CONFIG.bubbleRadius * 1.75) ** 2;

    ctx.save();
    for (let i = 0; i < maxSteps; i++) {
      x += dx * step;
      y += dy * step;
      if (x <= CONFIG.minX) {
        x = CONFIG.minX;
        dx = Math.abs(dx);
      } else if (x >= CONFIG.maxX) {
        x = CONFIG.maxX;
        dx = -Math.abs(dx);
      }
      if (y <= CONFIG.topY + state.rowProgress * CONFIG.rowHeight) break;

      let hit = false;
      for (let r = 0; r < CONFIG.rowsMax && !hit; r++) {
        for (let c = 0; c < CONFIG.cols && !hit; c++) {
          if (!state.grid[r][c]) continue;
          const p = gridToWorld(r, c);
          if ((p.x - x) ** 2 + (p.y - y) ** 2 < hitDistance) hit = true;
        }
      }
      if (hit) break;

      if (i % 2 === 0) {
        const alpha = 0.62 * (1 - i / maxSteps);
        const radius = i < 8 ? 5 : 3.3;
        ctx.fillStyle = `rgba(199, 250, 255, ${alpha})`;
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#5eeeff';
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawTrails() {
    for (const trail of state.trails) {
      const alpha = trail.life / trail.maxLife;
      drawBubble(trail.x, trail.y, trail.color, trail.size / 76, 0, alpha * 0.4);
    }
  }

  function drawProjectile() {
    if (!state.projectile) return;
    const p = state.projectile;
    drawBubble(p.x, p.y, p.color, 1.04, p.rotation * 0.08);
  }

  function drawPowerEffects() {
    for (const ring of state.bombRings) {
      const t = clamp(ring.time / ring.life, 0, 1);
      const radius = ring.radius * (0.2 + t * 1.25);
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 1 - t;
      const glow = ctx.createRadialGradient(ring.x, ring.y, radius * 0.2, ring.x, ring.y, radius);
      glow.addColorStop(0, 'rgba(255,245,205,.9)');
      glow.addColorStop(.28, 'rgba(255,116,86,.75)');
      glow.addColorStop(.72, 'rgba(255,50,126,.28)');
      glow.addColorStop(1, 'rgba(255,50,126,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(255,240,205,${1 - t})`;
      ctx.lineWidth = 10 * (1 - t) + 2;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, radius * .78, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    for (const wave of state.fireWaves) {
      const t = clamp(wave.time / wave.life, 0, 1);
      const sweep = CONFIG.fieldLeft + (CONFIG.fieldRight - CONFIG.fieldLeft) * Math.min(1, t * 1.35);
      const alpha = 1 - t;
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = alpha;
      const grad = ctx.createLinearGradient(CONFIG.fieldLeft, wave.y, sweep, wave.y);
      grad.addColorStop(0, 'rgba(255,73,28,0)');
      grad.addColorStop(.35, 'rgba(255,92,31,.85)');
      grad.addColorStop(.75, 'rgba(255,208,75,.95)');
      grad.addColorStop(1, 'rgba(255,255,220,.98)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 34 + Math.sin(t * Math.PI) * 26;
      ctx.shadowBlur = 28;
      ctx.shadowColor = '#ff6b2f';
      ctx.beginPath();
      ctx.moveTo(CONFIG.fieldLeft, wave.y);
      ctx.lineTo(sweep, wave.y);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawFallers() {
    for (const f of state.fallers) {
      if (f.delay > 0) continue;
      if (f.type === 'gift') drawGift(f.x, f.y, f.gift, f.scale, f.rotation, 0.95);
      else drawBubble(f.x, f.y, f.color, f.scale, f.rotation, 0.95);
    }
  }

  function drawBursts() {
    const sheet = assets.images.popSheet;
    if (!sheet) return;
    const frames = 10;
    const frameSize = 128;
    for (const burst of state.bursts) {
      if (burst.time < 0) continue;
      const progress = clamp(burst.time / burst.life, 0, 0.999);
      const frame = Math.floor(progress * frames);
      const size = 96 + progress * 74;
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 1 - progress;
      ctx.drawImage(sheet, frame * frameSize, 0, frameSize, frameSize, burst.x - size / 2, burst.y - size / 2, size, size);
      ctx.restore();
    }
  }

  function drawParticles() {
    for (const p of state.particles) {
      const alpha = clamp(p.life / p.maxLife, 0, 1);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = cssColor(p.color, alpha);
      ctx.shadowBlur = 10;
      ctx.shadowColor = cssColor(p.color, 0.8);
      if (p.shape === 'spark') {
        const s = p.size;
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.lineTo(s * 0.28, -s * 0.28);
        ctx.lineTo(s, 0);
        ctx.lineTo(s * 0.28, s * 0.28);
        ctx.lineTo(0, s);
        ctx.lineTo(-s * 0.28, s * 0.28);
        ctx.lineTo(-s, 0);
        ctx.lineTo(-s * 0.28, -s * 0.28);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawShooter() {
    const center = getShooterCenter();
    const dir = getAimDirection();
    const angle = Math.atan2(dir.y, dir.x);
    const nextX = center.x + 145;

    ctx.save();
    const glow = ctx.createRadialGradient(center.x, center.y + 18, 10, center.x, center.y + 18, 110);
    glow.addColorStop(0, 'rgba(44, 231, 255, 0.26)');
    glow.addColorStop(0.55, 'rgba(90, 110, 255, 0.12)');
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(center.x, center.y + 18, 110, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(center.x, center.y + 14);
    ctx.rotate(angle);
    ctx.lineWidth = 7;
    ctx.strokeStyle = 'rgba(127, 238, 255, 0.95)';
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#66f2ff';
    ctx.beginPath();
    ctx.arc(-24, 14, 34, 0.35 * Math.PI, 1.6 * Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(18, 28, 44, 0.65 * Math.PI, 1.82 * Math.PI);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.rotate(angle);
    ctx.shadowBlur = 18;
    ctx.shadowColor = 'rgba(102, 242, 255, 0.55)';
    ctx.fillStyle = 'rgba(23, 38, 92, 0.95)';
    ctx.strokeStyle = 'rgba(188, 245, 255, 0.9)';
    ctx.lineWidth = 4;
    roundRect(ctx, -4, -20, 78, 40, 20);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(10, 20, 58, 1)';
    roundRect(ctx, 10, -12, 56, 24, 12);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(74, 0, 16, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(24, 36, 86, 1)';
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(74, 0, 9, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(220, 248, 255, 0.88)';
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = 'rgba(22, 34, 84, 0.96)';
    ctx.strokeStyle = 'rgba(83, 234, 255, 0.95)';
    ctx.lineWidth = 5;
    ctx.shadowBlur = 16;
    ctx.shadowColor = 'rgba(83, 234, 255, 0.35)';
    roundRect(ctx, center.x - 66, center.y + 30, 132, 36, 18);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    drawBubble(center.x, center.y, state.currentColor, 1.03);

    ctx.save();
    ctx.fillStyle = 'rgba(8, 14, 45, .72)';
    ctx.strokeStyle = 'rgba(129, 235, 255, .28)';
    ctx.lineWidth = 2;
    roundRect(ctx, nextX - 52, CONFIG.shooterY - 66, 104, 118, 24);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#a7bedc';
    ctx.font = '800 14px Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('NEXT', nextX, CONFIG.shooterY - 38);
    ctx.restore();
    drawBubble(nextX, CONFIG.shooterY + 6, state.nextColor, 0.72);

    ctx.save();
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(203,232,248,.72)';
    ctx.font = '700 14px Segoe UI, sans-serif';
    ctx.fillText('BUBBLES', center.x - 115, CONFIG.shooterY - 18);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 28px Segoe UI, sans-serif';
    ctx.fillText(String(countBubbles()), center.x - 115, CONFIG.shooterY + 17);
    ctx.restore();
  }

  function drawFloatTexts() {
    for (const text of state.floatTexts) {
      const alpha = clamp(text.life / text.maxLife, 0, 1);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `900 ${text.size}px Segoe UI, sans-serif`;
      ctx.fillStyle = text.color;
      ctx.shadowBlur = 20;
      ctx.shadowColor = text.color;
      ctx.fillText(text.text, text.x, text.y);
      ctx.restore();
    }
  }

  function cssColor(value, alpha) {
    if (!value.startsWith('#')) return value;
    const hex = value.slice(1);
    const full = hex.length === 3 ? hex.split('').map(ch => ch + ch).join('') : hex;
    const number = Number.parseInt(full, 16);
    const r = (number >> 16) & 255;
    const g = (number >> 8) & 255;
    const b = number & 255;
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function roundRect(context, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + width, y, x + width, y + height, r);
    context.arcTo(x + width, y + height, x, y + height, r);
    context.arcTo(x, y + height, x, y, r);
    context.arcTo(x, y, x + width, y, r);
    context.closePath();
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function pointerToCanvas(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (W / rect.width),
      y: (event.clientY - rect.top) * (H / rect.height),
    };
  }

  function updateAimFromPointer(event) {
    if (state.mode !== 'playing') return;
    const p = pointerToCanvas(event);
    state.pointer = { ...p, active: true };
    state.keyboardAim = false;
    const angle = Math.atan2(p.y - CONFIG.shooterY, p.x - W / 2);
    state.aim = clamp(angle, CONFIG.minAim, CONFIG.maxAim);
  }

  canvas.addEventListener('pointermove', updateAimFromPointer);
  canvas.addEventListener('pointerdown', event => {
    if (event.button !== undefined && event.button !== 0) return;
    updateAimFromPointer(event);
    canvas.setPointerCapture?.(event.pointerId);
    shoot();
  });
  canvas.addEventListener('contextmenu', event => event.preventDefault());

  window.addEventListener('keydown', event => {
    const code = event.code;
    if (['ArrowLeft', 'ArrowRight', 'Space'].includes(code)) event.preventDefault();
    if (code === 'ArrowLeft' || code === 'KeyA') state.heldLeft = true;
    if (code === 'ArrowRight' || code === 'KeyD') state.heldRight = true;
    if (code === 'Space') shoot();
    if (code === 'KeyP' || code === 'Escape') {
      if (state.mode === 'playing') pauseGame();
      else if (state.mode === 'paused') resumeGame();
    }
    if (code === 'KeyR') resetGame(true);
    if (code === 'KeyM') audio.setMuted(!state.muted);
    if (code === 'KeyS') swapBubbles();
  });

  window.addEventListener('keyup', event => {
    if (event.code === 'ArrowLeft' || event.code === 'KeyA') state.heldLeft = false;
    if (event.code === 'ArrowRight' || event.code === 'KeyD') state.heldRight = false;
  });

  window.addEventListener('blur', () => {
    state.heldLeft = false;
    state.heldRight = false;
    if (state.mode === 'playing') pauseGame();
  });

  UI.play.addEventListener('click', () => {
    audio.unlock();
    resetGame(true);
    if (audio.music) audio.music.volume = 0.28;
  });
  UI.resume.addEventListener('click', resumeGame);
  UI.restartPause.addEventListener('click', () => resetGame(true));
  UI.playAgain.addEventListener('click', () => {
    if (audio.music) {
      audio.music.currentTime = 0;
      audio.music.volume = 0.28;
      if (!state.muted) audio.music.play().catch(() => {});
    }
    resetGame(true);
  });
  UI.pauseButton.addEventListener('click', () => {
    if (state.mode === 'playing') pauseGame();
    else if (state.mode === 'paused') resumeGame();
  });
  UI.mute.addEventListener('click', () => audio.setMuted(!state.muted));
  UI.swap.addEventListener('click', swapBubbles);

  function frame(now) {
    const dt = Math.min(0.033, Math.max(0, (now - state.lastTime) / 1000));
    state.lastTime = now;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  loadAssets();
  requestAnimationFrame(frame);
})();
