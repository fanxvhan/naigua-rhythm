/* ==========================================================================
   奶蛙拍肚肚 · 游戏主程序
   --------------------------------------------------------------------------
   4 键下落式音游：D / F / J / K
   Perfect / Great / Good / Miss、连击、准确率、评级、最高分都齐了。
   ========================================================================== */

(function () {
  "use strict";

  const Art = window.BabyArt;
  const Sound = window.BabyAudio;
  const THEMES = Art.THEMES;
  const SONG = Sound.SONG;

  const DIFFICULTIES = {
    easy: {
      id: "easy",
      menuLabel: "小口抿",
      short: "简单",
      tag: "小口抿",
      approach: 2.35,
      windows: { perfect: 0.1, great: 0.16, good: 0.225 },
      description: "慢慢来，先跟奶蛙熟悉一下拍子。"
    },
    normal: {
      id: "normal",
      menuLabel: "正常吨吨",
      short: "普通",
      tag: "正常吨吨",
      approach: 2.15,
      windows: { perfect: 0.082, great: 0.135, good: 0.195 },
      description: "跟住八分音符，把每一只奶瓶都接住。"
    },
    hard: {
      id: "hard",
      menuLabel: "暴风吸入",
      short: "困难",
      tag: "暴风吸入",
      approach: 1.92,
      windows: { perfect: 0.072, great: 0.12, good: 0.18 },
      description: "十六分音符乱入，奶蛙会笑到拍桌子。"
    }
  };

  const STORAGE_KEYS = {
    difficulty: "babyBellyRhythm.difficulty",
    bests: "babyBellyRhythm.bests",
    muted: "babyBellyRhythm.muted"
  };

  const SCORE_BASE = { perfect: 1000, great: 660, good: 320 };
  const ACCURACY_WEIGHT = { perfect: 1, great: 0.72, good: 0.45, miss: 0 };
  const MILESTONES = [
    { combo: 10, text: "奶蛙开始笑了！" },
    { combo: 25, text: "笑声逐渐失控 ♪" },
    { combo: 50, text: "笑到肚肚都红了！" },
    { combo: 100, text: "邻居来借笑声啦！" },
    { combo: 150, text: "奶蛙申请中场喝奶！" }
  ];

  const DEBUG_ENABLED = new URLSearchParams(window.location.search).has("debug");
  const dom = {};
  const state = {
    screen: "menu",
    difficulty: "normal",
    muted: false,
    paused: false,
    starting: false,
    game: null,
    audio: null,
    bests: {},
    startToken: 0
  };

  const view = {
    width: 0,
    height: 0,
    dpr: 1,
    laneWidth: 0,
    hitY: 0,
    receptorRadius: 32,
    noteWidth: 52,
    noteHeight: 64
  };

  let canvasContext = null;
  let noteSprites = [];
  let particles = [];
  let hitRings = [];
  let animationFrameId = null;
  let resizeFrameId = null;
  const keyTimers = {
    down: [null, null, null, null],
    laugh: [null, null, null, null],
    receptor: [null, null, null, null]
  };

  /* ------------------------------------------------------------------
     启动
     ------------------------------------------------------------------ */

  function init() {
    cacheDom();
    state.difficulty = loadDifficulty();
    state.muted = loadMuted();
    state.bests = loadBests();

    buildInterface();
    bindEvents();
    updateDifficultyUI(state.difficulty);
    updateSoundUI();
    updateBestNote();
    updateStageTipCopy();
    setScreen("menu");

    document.body.classList.toggle("has-user-baby", Art.hasPhoto());
    if (Art.hasPhoto()) {
      document.body.style.setProperty("--user-baby-image", 'url("' + window.BABY_ASSETS.babyImage + '")');
    }
  }

  function cacheDom() {
    const get = (id) => document.getElementById(id);
    dom.menuScreen = get("menuScreen");
    dom.gameScreen = get("gameScreen");
    dom.resultScreen = get("resultScreen");
    dom.startButton = get("startButton");
    dom.difficultyPicker = get("difficultyPicker");
    dom.bestNote = get("bestNote");
    dom.heroBaby = get("heroBaby");
    dom.pauseBaby = get("pauseBaby");
    dom.resultBaby = get("resultBaby");
    dom.gameHud = document.querySelector(".game-hud");
    dom.stage = get("stage");
    dom.laneBed = get("laneBed");
    dom.laneTags = get("laneTags");
    dom.noteCanvas = get("noteCanvas");
    dom.keypad = get("keypad");
    dom.countdown = get("countdown");
    dom.bigCombo = get("bigCombo");
    dom.bigComboNumber = get("bigComboNumber");
    dom.judgeLabel = get("judgeLabel");
    dom.centerToast = get("centerToast");
    dom.stageTip = get("stageTip");
    dom.pauseButton = get("pauseButton");
    dom.soundButton = get("soundButton");
    dom.scoreText = get("scoreText");
    dom.comboText = get("comboText");
    dom.accuracyText = get("accuracyText");
    dom.difficultyTag = get("difficultyTag");
    dom.progressTrack = get("progressTrack");
    dom.progressFill = get("progressFill");
    dom.progressMarker = get("progressMarker");
    dom.pauseOverlay = get("pauseOverlay");
    dom.resumeButton = get("resumeButton");
    dom.restartButton = get("restartButton");
    dom.quitButton = get("quitButton");
    dom.finalScore = get("finalScore");
    dom.rankBadge = get("rankBadge");
    dom.rankLetter = get("rankLetter");
    dom.rankStamp = get("rankStamp");
    dom.resultTitle = get("resultTitle");
    dom.resultCopy = get("resultCopy");
    dom.resultDate = get("resultDate");
    dom.resultDiffPill = get("resultDiffPill");
    dom.perfectCount = get("perfectCount");
    dom.greatCount = get("greatCount");
    dom.goodCount = get("goodCount");
    dom.missCount = get("missCount");
    dom.maxComboText = get("maxComboText");
    dom.finalAccuracy = get("finalAccuracy");
    dom.laughCount = get("laughCount");
    dom.newRecord = get("newRecord");
    dom.confetti = get("confetti");
    dom.replayButton = get("replayButton");
    dom.homeButton = get("homeButton");
    dom.liveStatus = get("liveStatus");

    canvasContext = dom.noteCanvas.getContext("2d");
  }

  function buildInterface() {
    const laneStyles = (theme) =>
      [
        "--lane-color:" + theme.color,
        "--lane-dark:" + theme.dark,
        "--lane-soft:" + theme.soft,
        "--lane-shadow:" + theme.shadow,
        "--lane-ink:" + theme.ink,
        "--lane-glow:" + theme.glow
      ].join(";");

    dom.laneBed.innerHTML = THEMES.map(function (theme, lane) {
      return (
        '<div class="lane" data-lane="' + lane + '" style="' + laneStyles(theme) + '">' +
        '<div class="receptor" data-lane="' + lane + '" aria-hidden="true">' +
        '<span class="receptor-letter">' + theme.key + "</span>" +
        '<span class="receptor-dot"></span>' +
        "</div>" +
        "</div>"
      );
    }).join("");

    dom.laneTags.innerHTML = THEMES.map(function (theme) {
      return (
        '<div class="lane-tag" style="--lane-color:' + theme.color + ';--lane-dark:' + theme.dark + '">' +
        "<i></i><b>" + theme.key + "</b><span>" + theme.name + "</span>" +
        "</div>"
      );
    }).join("");

    dom.keypad.innerHTML = THEMES.map(function (theme, lane) {
      return (
        '<button class="baby-key" type="button" data-lane="' + lane + '" style="' + laneStyles(theme) + '" ' +
        'aria-label="' + theme.name + '奶蛙键，键盘 ' + theme.key + '">' +
        '<span class="key-splash" aria-hidden="true"></span>' +
        '<span class="key-topline">' +
        '<span class="key-name">' + theme.name + "</span>" +
        '<span class="key-letter">' + theme.key + "</span>" +
        "</span>" +
        '<span class="key-laugh-bubble" aria-hidden="true">哈哈!</span>' +
        '<span class="baby-art" aria-hidden="true">' + Art.babyMarkup(lane) + "</span>" +
        '<span class="key-fx" aria-hidden="true"></span>' +
        "</button>"
      );
    }).join("");

    dom.receptors = Array.from(dom.laneBed.querySelectorAll(".receptor"));
    dom.keyButtons = Array.from(dom.keypad.querySelectorAll(".baby-key"));

    dom.heroBaby.innerHTML = Art.babyMarkup(0);
    dom.pauseBaby.innerHTML = Art.babyMarkup(1);
    dom.resultBaby.innerHTML = Art.babyMarkup(2);

    dom.gameScreen.style.setProperty("--hit-target", "0%");
    dom.difficultyPicker.querySelectorAll(".difficulty-chip").forEach(function (chip) {
      const diff = DIFFICULTIES[chip.dataset.difficulty];
      if (diff) {
        chip.querySelector(".chip-sub").textContent = diff.short + " · " + diff.description.split("，")[0].slice(0, 8);
      }
    });
  }

  function bindEvents() {
    dom.startButton.addEventListener("click", function () {
      startGame();
    });

    dom.difficultyPicker.addEventListener("click", function (event) {
      const chip = event.target.closest(".difficulty-chip");
      if (!chip) return;
      selectDifficulty(chip.dataset.difficulty, true);
    });

    dom.keypad.addEventListener("pointerdown", function (event) {
      const button = event.target.closest(".baby-key");
      if (!button) return;
      event.preventDefault();
      pressLane(Number(button.dataset.lane), "pointer");
    });

    dom.stage.addEventListener("pointerdown", function (event) {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      if (state.screen !== "game" || state.paused || !state.game) return;
      event.preventDefault();
      const rect = dom.stage.getBoundingClientRect();
      const relative = Math.max(0, Math.min(0.9999, (event.clientX - rect.left) / rect.width));
      pressLane(Math.floor(relative * 4), "stage");
    });

    dom.stage.addEventListener("contextmenu", function (event) {
      event.preventDefault();
    });
    dom.keypad.addEventListener("contextmenu", function (event) {
      event.preventDefault();
    });

    dom.pauseButton.addEventListener("click", function () {
      pauseGame(false);
    });
    dom.resumeButton.addEventListener("click", function () {
      resumeGame();
    });
    dom.restartButton.addEventListener("click", function () {
      restartFromPause();
    });
    dom.quitButton.addEventListener("click", function () {
      leaveGameToMenu();
    });

    dom.soundButton.addEventListener("click", function () {
      toggleSound();
    });

    dom.replayButton.addEventListener("click", function () {
      startGame();
    });
    dom.homeButton.addEventListener("click", function () {
      leaveResultToMenu();
    });

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    document.addEventListener("visibilitychange", function () {
      if (document.hidden && state.screen === "game" && !state.paused && state.game && !state.game.finished) {
        pauseGame(true);
      }
    });

    window.addEventListener("resize", scheduleCanvasResize);
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(scheduleCanvasResize);
      observer.observe(dom.stage);
    }
  }

  /* ------------------------------------------------------------------
     存储 / 菜单
     ------------------------------------------------------------------ */

  function safeGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function safeSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      /* 无痕模式下忽略 */
    }
  }

  function loadDifficulty() {
    const stored = safeGet(STORAGE_KEYS.difficulty);
    return DIFFICULTIES[stored] ? stored : "normal";
  }

  function loadMuted() {
    return safeGet(STORAGE_KEYS.muted) === "1";
  }

  function defaultBests() {
    return {
      easy: { score: 0, rank: "—" },
      normal: { score: 0, rank: "—" },
      hard: { score: 0, rank: "—" }
    };
  }

  function loadBests() {
    const bests = defaultBests();
    const raw = safeGet(STORAGE_KEYS.bests);
    if (!raw) return bests;
    try {
      const parsed = JSON.parse(raw);
      ["easy", "normal", "hard"].forEach(function (key) {
        if (parsed && parsed[key] && Number.isFinite(parsed[key].score)) {
          bests[key] = {
            score: Math.max(0, Math.round(parsed[key].score)),
            rank: typeof parsed[key].rank === "string" ? parsed[key].rank : "—"
          };
        }
      });
    } catch (error) {
      /* 损坏的数据不阻塞游戏 */
    }
    return bests;
  }

  function saveBests() {
    safeSet(STORAGE_KEYS.bests, JSON.stringify(state.bests));
  }

  function formatNumber(value) {
    return Math.round(value).toLocaleString("en-US");
  }

  function selectDifficulty(id, fromUser) {
    if (!DIFFICULTIES[id]) return;
    state.difficulty = id;
    safeSet(STORAGE_KEYS.difficulty, id);
    updateDifficultyUI(id);
    updateBestNote();
    if (fromUser) {
      const selected = dom.difficultyPicker.querySelector('.difficulty-chip[data-difficulty="' + id + '"]');
      if (selected) {
        selected.animate(
          [
            { transform: "translateY(0) scale(1)" },
            { transform: "translateY(-3px) scale(1.025)" },
            { transform: "translateY(0) scale(1)" }
          ],
          { duration: 260, easing: "ease-out" }
        );
      }
    }
  }

  function updateDifficultyUI(id) {
    dom.difficultyPicker.querySelectorAll(".difficulty-chip").forEach(function (chip) {
      const selected = chip.dataset.difficulty === id;
      chip.classList.toggle("is-selected", selected);
      chip.setAttribute("aria-checked", String(selected));
    });
  }

  function updateBestNote() {
    const best = state.bests[state.difficulty] || { score: 0, rank: "—" };
    if (best.score > 0) {
      dom.bestNote.textContent = "最高 " + formatNumber(best.score) + " · " + best.rank;
    } else {
      dom.bestNote.textContent = "奶蛙热身中…";
    }
  }

  function updateSoundUI() {
    dom.soundButton.setAttribute("aria-pressed", String(!state.muted));
    dom.soundButton.setAttribute("aria-label", state.muted ? "打开声音" : "关闭声音");
    dom.soundButton.classList.toggle("is-muted", state.muted);
  }

  function toggleSound() {
    state.muted = !state.muted;
    safeSet(STORAGE_KEYS.muted, state.muted ? "1" : "0");
    if (state.audio) state.audio.setMuted(state.muted);
    updateSoundUI();
  }

  function setScreen(name) {
    state.screen = name;
    document.body.dataset.screen = name;
    dom.menuScreen.classList.toggle("is-active", name === "menu");
    dom.gameScreen.classList.toggle("is-active", name === "game");
    dom.resultScreen.classList.toggle("is-active", name === "result");
  }

  /* ------------------------------------------------------------------
     歌曲 / 谱面
     ------------------------------------------------------------------ */

  function makeNote(time, lane, extra) {
    return {
      id: 0,
      time: time,
      lane: lane,
      extra: Boolean(extra),
      judged: false,
      result: null,
      judgedAt: null
    };
  }

  const OFFBEAT_SLOTS = [0.25, 0.75, 1.25, 1.75, 2.25, 2.75, 3.25, 3.75];

  /*
   * 每局重新生成的随机谱面：
   * - 节奏骨架保持不变（简单四分、普通八分、困难加十六分彩点）
   * - 困难难度的彩点位置也从十六分音符空档里随机抽取
   * - 键位全部随机洗牌，并避免同一键位在极短时间内连续出现
   */
  function createLanePicker() {
    const lastUse = [-100, -100, -100, -100];
    const recent = [];

    return function pickLane(time) {
      const last = recent[recent.length - 1];
      const secondLast = recent[recent.length - 2];

      let candidates = [0, 1, 2, 3].filter(function (lane) {
        return lane !== last && time - lastUse[lane] >= 0.19;
      });

      if (secondLast !== undefined) {
        const withoutSecondLast = candidates.filter(function (lane) {
          return lane !== secondLast;
        });
        if (withoutSecondLast.length) candidates = withoutSecondLast;
      }

      if (!candidates.length) {
        candidates = [0, 1, 2, 3].filter(function (lane) {
          return lane !== last;
        });
      }
      if (!candidates.length) candidates = [0, 1, 2, 3];

      const lane = candidates[Math.floor(Math.random() * candidates.length)];
      lastUse[lane] = time;
      recent.push(lane);
      if (recent.length > 5) recent.shift();
      return lane;
    };
  }

  function takeRandomItems(items, count) {
    const pool = items.slice();
    const picked = [];
    while (picked.length < count && pool.length) {
      const index = Math.floor(Math.random() * pool.length);
      picked.push(pool.splice(index, 1)[0]);
    }
    return picked;
  }

  function buildChart(difficultyId) {
    const timeline = [];

    SONG.activeBars.forEach(function (bar) {
      const barStart = bar * SONG.bar;
      const times = [];

      if (difficultyId === "easy") {
        for (let index = 0; index < 4; index += 1) {
          times.push({ time: barStart + index * SONG.beat, extra: false });
        }
      } else {
        for (let index = 0; index < 8; index += 1) {
          times.push({ time: barStart + index * SONG.eighth, extra: false });
        }

        if (difficultyId === "hard") {
          const extraCount = bar < 6 ? 1 : bar < 12 ? 2 : 3;
          const offsets = takeRandomItems(OFFBEAT_SLOTS, extraCount);
          offsets.forEach(function (beatOffset) {
            times.push({ time: barStart + beatOffset * SONG.beat, extra: true });
          });
        }
      }

      times.sort(function (a, b) {
        return a.time - b.time;
      });
      times.forEach(function (entry) {
        timeline.push(entry);
      });
    });

    timeline.sort(function (a, b) {
      return a.time - b.time;
    });

    const pickLane = createLanePicker();
    const notes = timeline.map(function (entry, index) {
      const note = makeNote(entry.time, pickLane(entry.time), entry.extra);
      note.id = index;
      return note;
    });
    return notes;
  }

  function createGameState(difficultyId) {
    const diff = DIFFICULTIES[difficultyId];
    const chart = buildChart(difficultyId);
    const laneNotes = [[], [], [], []];
    chart.forEach(function (note) {
      laneNotes[note.lane].push(note);
    });

    return {
      difficulty: difficultyId,
      diff: diff,
      chart: chart,
      totalNotes: chart.length,
      laneNotes: laneNotes,
      laneCursor: [0, 0, 0, 0],
      stats: { perfect: 0, great: 0, good: 0, miss: 0 },
      judgedCount: 0,
      score: 0,
      combo: 0,
      maxCombo: 0,
      presses: 0,
      time: 0,
      lastFrameTime: 0,
      laneFlash: [0, 0, 0, 0],
      shownMilestones: new Set(),
      tipHidden: false,
      finalToastShown: false,
      countdownValue: null,
      running: false,
      paused: false,
      finished: false,
      clockMode: "audio",
      manualStart: 0,
      pauseStartedAt: 0,
      raf: null
    };
  }

  /* ------------------------------------------------------------------
     游戏生命周期
     ------------------------------------------------------------------ */

  async function startGame() {
    if (state.starting) return;
    if (state.screen === "game" && state.game && !state.game.finished) return;

    cleanupPlayback();
    state.starting = true;
    state.startToken += 1;
    const token = state.startToken;
    state.paused = false;
    hidePauseOverlay();
    setScreen("game");
    dom.confetti.innerHTML = "";
    resetResultScreen();
    resetGameUI();

    const game = createGameState(state.difficulty);
    state.game = game;
    dom.difficultyTag.textContent = game.diff.tag;
    updateHud(true);

    if (document.activeElement && typeof document.activeElement.blur === "function") {
      document.activeElement.blur();
    }

    if (!state.audio) {
      state.audio = new Sound.AudioEngine();
    }
    state.audio.setMuted(state.muted);
    updateSoundUI();

    let audioReady = false;
    try {
      audioReady = await state.audio.init();
    } catch (error) {
      console.warn("Audio initialisation failed:", error);
      audioReady = false;
    }

    if (token !== state.startToken || state.screen !== "game") {
      state.starting = false;
      return;
    }

    resizeCanvas();

    const audioStarted = audioReady && state.audio.startSong(Sound.buildMusicEvents());
    game.clockMode = audioStarted ? "audio" : "manual";
    game.manualStart = performance.now() / 1000 + 0.16;
    game.running = true;
    game.paused = false;
    game.lastFrameTime = 0;
    game.time = 0;
    particles = [];
    hitRings = [];
    resetKeyVisuals();
    dom.stageTip.classList.remove("is-hidden");
    updateStageTipCopy();
    dom.countdown.classList.remove("is-visible");
    dom.judgeLabel.classList.remove("is-show");
    dom.bigCombo.classList.remove("is-visible");
    dom.centerToast.classList.remove("is-show");
    updateCountdown(0);
    state.starting = false;
    state.paused = false;
    startLoop();
    announce("开始。按 D、F、J、K 接住奶瓶。");
  }

  function startLoop() {
    if (!state.game) return;
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    state.game.lastFrameTime = 0;
    animationFrameId = requestAnimationFrame(gameFrame);
    state.game.raf = animationFrameId;
  }

  function gameFrame(now) {
    const game = state.game;
    if (!game || !game.running || game.paused || game.finished || state.screen !== "game") {
      animationFrameId = null;
      return;
    }

    if (!game.lastFrameTime) {
      game.lastFrameTime = now;
    }
    const dt = Math.min(0.05, Math.max(0, (now - game.lastFrameTime) / 1000));
    game.lastFrameTime = now;

    const time = getSongTime();
    game.time = time;

    updateGame(time, dt);
    if (game.finished || !game.running) {
      animationFrameId = null;
      return;
    }

    drawScene(time);
    game.raf = requestAnimationFrame(gameFrame);
    animationFrameId = game.raf;
  }

  function getSongTime() {
    const game = state.game;
    if (!game) return 0;
    if (
      game.clockMode === "audio" &&
      state.audio &&
      state.audio.ctx &&
      state.audio.songStart !== null
    ) {
      return state.audio.getSongTime();
    }
    return performance.now() / 1000 - game.manualStart;
  }

  function updateGame(time, dt) {
    const game = state.game;
    if (!game) return;

    updateCountdown(time);
    processMisses(time);
    if (game.finished) return;

    for (let lane = 0; lane < 4; lane += 1) {
      game.laneFlash[lane] = Math.max(0, game.laneFlash[lane] - dt * 3.4);
    }

    updateParticles(dt);
    updateProgress(time);

    if (!game.tipHidden && time > 9) {
      hideStageTip();
    }
    if (!game.finalToastShown && time >= 35.1) {
      game.finalToastShown = true;
      showCenterToast("最后一口奶！");
    }

    if (time >= SONG.resultTime) {
      finishGame();
    }
  }

  function updateCountdown(time) {
    const game = state.game;
    if (!game) return;
    let value = null;
    if (time < 1) value = "3";
    else if (time < 2) value = "2";
    else if (time < 3) value = "1";
    else if (time < 3.82) value = "笑!";

    if (value === game.countdownValue) return;
    game.countdownValue = value;

    if (!value) {
      dom.countdown.classList.remove("is-visible");
      return;
    }

    dom.countdown.innerHTML =
      '<span class="countdown-bubble" data-value="' + value + '">' + value + "</span>";
    dom.countdown.classList.add("is-visible");
  }

  function updateProgress(time) {
    if (!state.game) return;
    const percent = Math.max(0, Math.min(100, (time / SONG.length) * 100));
    dom.progressFill.style.width = percent.toFixed(2) + "%";
    dom.progressMarker.style.left = percent.toFixed(2) + "%";
    dom.progressTrack.setAttribute("aria-valuenow", String(Math.round(percent)));
  }

  function processMisses(time) {
    const game = state.game;
    if (!game || time < 0) return;
    const goodWindow = game.diff.windows.good;
    let changed = false;

    for (let lane = 0; lane < 4; lane += 1) {
      const notes = game.laneNotes[lane];
      let cursor = game.laneCursor[lane];
      while (cursor < notes.length) {
        const note = notes[cursor];
        if (note.judged) {
          cursor += 1;
          continue;
        }
        if (time - note.time > goodWindow) {
          note.judged = true;
          note.result = "miss";
          note.judgedAt = time;
          game.stats.miss += 1;
          game.judgedCount += 1;
          game.combo = 0;
          cursor += 1;
          changed = true;
          continue;
        }
        break;
      }
      game.laneCursor[lane] = cursor;
    }

    if (changed) {
      updateHud(false);
      showJudge("miss");
      game.laneFlash = game.laneFlash.map(function (flash) {
        return Math.max(0, flash - 0.2);
      });
    }
  }

  function finishGame() {
    const game = state.game;
    if (!game || game.finished) return;
    game.finished = true;
    game.running = false;
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    game.raf = null;
    dom.countdown.classList.remove("is-visible");
    dom.judgeLabel.classList.remove("is-show");
    showResults();
  }

  function showResults() {
    const game = state.game;
    if (!game) return;

    const stats = game.stats;
    const total = game.totalNotes;
    const weighted = stats.perfect + stats.great * 0.72 + stats.good * 0.45;
    const accuracy = total > 0 ? (weighted / total) * 100 : 0;
    const rank = calculateRank(accuracy);
    const fullCombo = total > 0 && stats.miss === 0;
    const allPerfect = total > 0 && stats.perfect === total;

    const previousBest = state.bests[game.difficulty] || { score: 0, rank: "—" };
    const isNewRecord = game.score > previousBest.score && game.score > 0;
    if (isNewRecord) {
      state.bests[game.difficulty] = { score: Math.round(game.score), rank: rank };
      saveBests();
      updateBestNote();
    }

    setScreen("result");
    dom.confetti.innerHTML = "";

    dom.finalScore.textContent = formatNumber(game.score);
    dom.rankBadge.dataset.rank = rank;
    dom.rankLetter.textContent = rank;
    dom.resultDiffPill.textContent = game.diff.short;
    dom.perfectCount.textContent = String(stats.perfect);
    dom.greatCount.textContent = String(stats.great);
    dom.goodCount.textContent = String(stats.good);
    dom.missCount.textContent = String(stats.miss);
    dom.maxComboText.textContent = String(game.maxCombo);
    dom.finalAccuracy.textContent = accuracy.toFixed(1) + "%";
    dom.laughCount.textContent = String(game.presses);
    dom.newRecord.hidden = !isNewRecord;
    dom.resultDate.textContent = formatDate(new Date());
    dom.rankStamp.textContent = fullCombo ? "全连认证" : "奶蛙认证";

    const resultCopy = getResultCopy(rank);
    let title = resultCopy.title;
    let copy = resultCopy.copy;

    if (allPerfect) {
      title = "全·完·美！肚肚笑抽筋！";
      copy = "每一个奶瓶都被完美接住，奶蛙宣布你是拍肚肚大师。";
    } else if (fullCombo) {
      title = "全连！奶蛙笑到打滚！";
      copy = "一个奶瓶都没漏掉，肚肚已经拍红啦。";
    }

    dom.resultTitle.textContent = title;
    dom.resultCopy.textContent = copy;

    if (rank === "S" || rank === "A" || rank === "B") {
      createConfetti(rank === "S" ? 36 : rank === "A" ? 24 : 16, rank);
    }

    dom.resultScreen.scrollTop = 0;
    dom.replayButton.focus({ preventScroll: true });
    announce("本局结束。" + title + " 得分 " + formatNumber(game.score) + "，准确率 " + accuracy.toFixed(1) + "%。");
  }

  function calculateRank(accuracy) {
    if (accuracy >= 95) return "S";
    if (accuracy >= 85) return "A";
    if (accuracy >= 70) return "B";
    if (accuracy >= 55) return "C";
    return "D";
  }

  function getResultCopy(rank) {
    const copies = {
      S: {
        title: "笑到全小区都听见！",
        copy: "肚肚拍出了完美节拍，奶蛙已经笑到躺平。"
      },
      A: {
        title: "笑得相当有水准！",
        copy: "再差一点点，就能把奶蛙笑到打滚了。"
      },
      B: {
        title: "肚肚已经热起来了！",
        copy: "节拍感在线，再练一小口就能更奶。"
      },
      C: {
        title: "奶蛙陪你慢慢来。",
        copy: "奶瓶掉了没关系，笑声响起来就赢了一半。"
      },
      D: {
        title: "先把奶喝完，再来！",
        copy: "奶蛙帮你把奶瓶捡回来了，下一局一定更顺。"
      }
    };
    return copies[rank] || copies.D;
  }

  function formatDate(date) {
    return (
      date.getFullYear() +
      "." +
      String(date.getMonth() + 1).padStart(2, "0") +
      "." +
      String(date.getDate()).padStart(2, "0")
    );
  }

  function createConfetti(count, rank) {
    const palette =
      rank === "S"
        ? ["#ffd47e", "#f58fa3", "#9bdfc8", "#c9b6ff", "#f7ead6"]
        : rank === "A"
          ? ["#9bdfc8", "#ffd47e", "#f58fa3", "#fff4df"]
          : ["#f58fa3", "#ffd47e", "#d8c5f5"];
    for (let index = 0; index < count; index += 1) {
      const piece = document.createElement("i");
      piece.className = "confetti-piece";
      piece.style.left = Math.random() * 100 + "%";
      piece.style.width = 5 + Math.random() * 7 + "px";
      piece.style.height = 7 + Math.random() * 9 + "px";
      piece.style.background = palette[index % palette.length];
      piece.style.opacity = String(0.45 + Math.random() * 0.4);
      piece.style.animationDuration = 2.8 + Math.random() * 2.6 + "s";
      piece.style.animationDelay = Math.random() * 0.9 + "s";
      piece.style.setProperty("--drift", Math.random() * 180 - 90 + "px");
      piece.style.borderRadius = index % 3 === 0 ? "50%" : "2px 2px 5px 5px";
      dom.confetti.appendChild(piece);
    }
  }

  function resetResultScreen() {
    dom.newRecord.hidden = true;
    dom.rankBadge.dataset.rank = "D";
    dom.rankLetter.textContent = "—";
    dom.rankStamp.textContent = "奶蛙认证";
    dom.resultTitle.textContent = "笑得非常标准！";
    dom.resultCopy.textContent = "奶蛙表示：这一轮肚肚拍得很舒服。";
    dom.finalScore.textContent = "0";
    dom.perfectCount.textContent = "0";
    dom.greatCount.textContent = "0";
    dom.goodCount.textContent = "0";
    dom.missCount.textContent = "0";
    dom.maxComboText.textContent = "0";
    dom.finalAccuracy.textContent = "0.0%";
    dom.laughCount.textContent = "0";
    dom.confetti.innerHTML = "";
  }

  function resetGameUI() {
    dom.scoreText.textContent = "000000";
    dom.comboText.textContent = "0";
    dom.accuracyText.textContent = "100.0%";
    dom.progressFill.style.width = "0%";
    dom.progressMarker.style.left = "0%";
    dom.progressTrack.setAttribute("aria-valuenow", "0");
    dom.bigCombo.classList.remove("is-visible", "is-pop");
    dom.bigComboNumber.textContent = "0";
    dom.judgeLabel.classList.remove("is-show");
    dom.judgeLabel.textContent = "";
    dom.centerToast.classList.remove("is-show");
    dom.centerToast.textContent = "";
    dom.countdown.classList.remove("is-visible");
    dom.countdown.innerHTML = "";
    dom.stageTip.classList.remove("is-hidden");
    updateStageTipCopy();
    dom.keyButtons.forEach(function (key) {
      key.classList.remove("is-down", "is-celebrating");
      const fx = key.querySelector(".key-fx");
      if (fx) fx.innerHTML = "";
    });
    dom.receptors.forEach(function (receptor) {
      receptor.classList.remove("is-down", "is-hit");
    });
    resetKeyTimers();
    particles = [];
    hitRings = [];
  }

  function resetKeyVisuals() {
    dom.keyButtons.forEach(function (key) {
      key.classList.remove("is-down", "is-celebrating");
    });
    dom.receptors.forEach(function (receptor) {
      receptor.classList.remove("is-down", "is-hit");
    });
    resetKeyTimers();
  }

  /* ------------------------------------------------------------------
     输入与判定
     ------------------------------------------------------------------ */

  function handleKeyDown(event) {
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;

    if (state.screen === "menu") {
      const targetIsButton =
        event.target instanceof Element && Boolean(event.target.closest("button"));
      if ((event.code === "Enter" || event.code === "NumpadEnter") && !targetIsButton) {
        event.preventDefault();
        startGame();
      }
      return;
    }

    if (state.screen === "result") {
      if (event.code === "KeyR") {
        event.preventDefault();
        startGame();
      } else if (event.code === "Escape") {
        event.preventDefault();
        leaveResultToMenu();
      }
      return;
    }

    if (state.screen !== "game") return;

    if (event.code === "Escape") {
      event.preventDefault();
      if (state.paused) resumeGame();
      else pauseGame(false);
      return;
    }

    if (state.paused) return;

    if (event.code === "KeyM") {
      event.preventDefault();
      toggleSound();
      return;
    }

    const lane = THEMES.findIndex(function (item) {
      return item.code === event.code;
    });
    if (lane < 0) return;
    event.preventDefault();
    pressLane(lane, "keyboard");
  }

  function handleKeyUp(event) {
    const theme = THEMES.find(function (item) {
      return item.code === event.code;
    });
    if (!theme) return;
    const lane = THEMES.indexOf(theme);
    setLanePressed(lane, false);
  }

  function pressLane(lane, source) {
    if (
      state.screen !== "game" ||
      state.paused ||
      state.starting ||
      !state.game ||
      !state.game.running ||
      state.game.finished
    ) {
      return;
    }
    const game = state.game;
    const time = getSongTime();

    game.presses += 1;
    if (state.audio) {
      state.audio.playLaneSound(lane);
    }
    animateKeyPress(lane);

    if (source === "stage" || source === "pointer") {
      hideStageTip();
    }

    if (time < 0.02) return;

    processMisses(time);
    if (game.finished) return;

    const note = findHittableNote(lane, time);
    if (!note) {
      return;
    }
    judgeNote(note, lane, time);
  }

  function findHittableNote(lane, time) {
    const game = state.game;
    if (!game) return null;
    const notes = game.laneNotes[lane];
    const good = game.diff.windows.good;
    let from = game.laneCursor[lane];
    let best = null;
    let bestDistance = Infinity;

    for (let index = from; index < notes.length; index += 1) {
      const note = notes[index];
      if (note.judged) continue;
      const delta = note.time - time;
      if (delta > good) break;
      if (delta < -good) continue;
      const distance = Math.abs(delta);
      if (distance <= good && distance < bestDistance) {
        best = note;
        bestDistance = distance;
      }
    }
    return best;
  }

  function judgeNote(note, lane, time) {
    const game = state.game;
    if (!game || note.judged) return;
    const windows = game.diff.windows;
    const distance = Math.abs(time - note.time);
    let grade = "good";
    if (distance <= windows.perfect) grade = "perfect";
    else if (distance <= windows.great) grade = "great";

    note.judged = true;
    note.result = grade;
    note.judgedAt = time;
    game.stats[grade] += 1;
    game.judgedCount += 1;
    game.combo += 1;
    game.maxCombo = Math.max(game.maxCombo, game.combo);

    const multiplier = 1 + Math.min(100, game.combo) * 0.008;
    game.score += Math.round(SCORE_BASE[grade] * multiplier);

    while (
      game.laneCursor[lane] < game.laneNotes[lane].length &&
      game.laneNotes[lane][game.laneCursor[lane]].judged
    ) {
      game.laneCursor[lane] += 1;
    }

    game.laneFlash[lane] = 1;
    spawnHitParticles(lane, grade);
    animateReceptorHit(lane);
    showJudge(grade);
    hideStageTip();
    updateHud(true);

    const milestone = MILESTONES.find(function (item) {
      return item.combo === game.combo && !game.shownMilestones.has(item.combo);
    });
    if (milestone) {
      game.shownMilestones.add(milestone.combo);
      showCenterToast(milestone.text);
    }
    if (game.combo === 1) {
      announce("开始连击。");
    }
    if (game.combo % 25 === 0) {
      announce(game.combo + " 连击！");
    }
  }

  function updateHud(pulseCombo) {
    const game = state.game;
    if (!game) return;
    dom.scoreText.textContent = String(Math.max(0, Math.round(game.score))).padStart(6, "0");
    dom.comboText.textContent = String(game.combo);

    const judged = game.judgedCount;
    const weighted = game.stats.perfect + game.stats.great * 0.72 + game.stats.good * 0.45;
    const accuracy = judged > 0 ? (weighted / judged) * 100 : 100;
    dom.accuracyText.textContent = accuracy.toFixed(1) + "%";

    if (game.combo >= 3) {
      dom.bigCombo.classList.add("is-visible");
      dom.bigComboNumber.textContent = String(game.combo);
      if (pulseCombo) {
        dom.bigCombo.classList.remove("is-pop");
        void dom.bigCombo.offsetWidth;
        dom.bigCombo.classList.add("is-pop");
      }
    } else {
      dom.bigCombo.classList.remove("is-visible", "is-pop");
    }
  }

  function showJudge(grade) {
    const labels = {
      perfect: "PERFECT!",
      great: "GREAT!",
      good: "GOOD!",
      miss: "MISS…"
    };
    const key = grade.toUpperCase();
    dom.judgeLabel.classList.remove("is-show");
    dom.judgeLabel.textContent = labels[grade] || labels.good;
    dom.judgeLabel.dataset.judge = key;
    void dom.judgeLabel.offsetWidth;
    dom.judgeLabel.classList.add("is-show");
  }

  function showCenterToast(text) {
    dom.centerToast.classList.remove("is-show");
    dom.centerToast.textContent = text;
    void dom.centerToast.offsetWidth;
    dom.centerToast.classList.add("is-show");
  }

  function hideStageTip() {
    if (!state.game) return;
    if (state.game.tipHidden) return;
    state.game.tipHidden = true;
    dom.stageTip.classList.add("is-hidden");
  }

  function updateStageTipCopy() {
    const coarsePointer =
      typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;
    const compactViewport = window.innerWidth <= 700;
    if (dom.stageTip) {
      dom.stageTip.textContent =
        coarsePointer || compactViewport ? "点按奶蛙键，接住奶瓶" : "按 D F J K 接住奶瓶";
    }
  }

  function animateKeyPress(lane) {
    const key = dom.keyButtons[lane];
    const receptor = dom.receptors[lane];
    if (!key || !receptor) return;

    setLanePressed(lane, true);
    window.clearTimeout(keyTimers.down[lane]);
    keyTimers.down[lane] = window.setTimeout(function () {
      setLanePressed(lane, false);
    }, 135);

    window.clearTimeout(keyTimers.laugh[lane]);
    key.classList.remove("is-celebrating");
    void key.offsetWidth;
    key.classList.add("is-celebrating");
    keyTimers.laugh[lane] = window.setTimeout(function () {
      key.classList.remove("is-celebrating");
    }, 680);

    const fx = key.querySelector(".key-fx");
    if (fx) {
      while (fx.children.length > 5) {
        fx.removeChild(fx.firstElementChild);
      }
      const symbols = ["♥", "✦", "哈", "♪"];
      const amount = 2 + Math.floor(Math.random() * 2);
      for (let index = 0; index < amount; index += 1) {
        const heart = document.createElement("span");
        heart.className = "key-heart";
        heart.textContent = symbols[Math.floor(Math.random() * symbols.length)];
        heart.style.left = 20 + Math.random() * 55 + "%";
        heart.style.bottom = 18 + Math.random() * 15 + "%";
        heart.style.animationDelay = index * 0.04 + "s";
        heart.style.fontSize = 10 + Math.random() * 8 + "px";
        fx.appendChild(heart);
        window.setTimeout(function () {
          if (heart.parentNode) heart.parentNode.removeChild(heart);
        }, 900);
      }
    }
  }

  function animateReceptorHit(lane) {
    const receptor = dom.receptors[lane];
    if (!receptor) return;
    window.clearTimeout(keyTimers.receptor[lane]);
    receptor.classList.remove("is-hit");
    void receptor.offsetWidth;
    receptor.classList.add("is-hit");
    keyTimers.receptor[lane] = window.setTimeout(function () {
      receptor.classList.remove("is-hit");
    }, 300);
  }

  function setLanePressed(lane, pressed) {
    if (dom.keyButtons[lane]) dom.keyButtons[lane].classList.toggle("is-down", pressed);
    if (dom.receptors[lane]) dom.receptors[lane].classList.toggle("is-down", pressed);
  }

  function resetKeyTimers() {
    for (let lane = 0; lane < 4; lane += 1) {
      window.clearTimeout(keyTimers.down[lane]);
      window.clearTimeout(keyTimers.laugh[lane]);
      window.clearTimeout(keyTimers.receptor[lane]);
    }
  }

  /* ------------------------------------------------------------------
     暂停 / 离开
     ------------------------------------------------------------------ */

  function pauseGame(auto) {
    const game = state.game;
    if (
      !game ||
      state.starting ||
      !game.running ||
      game.finished ||
      game.paused ||
      state.paused ||
      state.screen !== "game"
    ) {
      return;
    }
    state.paused = true;
    game.paused = true;
    game.pauseStartedAt = performance.now();
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    game.raf = null;
    if (state.audio) state.audio.pause();
    resetKeyVisuals();
    dom.pauseOverlay.hidden = false;
    if (!auto) {
      dom.resumeButton.focus({ preventScroll: true });
    }
  }

  async function resumeGame() {
    const game = state.game;
    if (!game || !state.paused || game.finished) return;
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    if (state.audio) {
      try {
        await state.audio.init();
        state.audio.resume();
      } catch (error) {
        /* 即使恢复音频失败也继续游戏 */
      }
    }
    if (game.clockMode === "manual" && game.pauseStartedAt) {
      const pausedFor = performance.now() - game.pauseStartedAt;
      game.manualStart += pausedFor / 1000;
    }
    game.pauseStartedAt = 0;
    game.paused = false;
    state.paused = false;
    dom.pauseOverlay.hidden = true;
    setScreen("game");
    startLoop();
    if (dom.pauseButton) dom.pauseButton.focus({ preventScroll: true });
  }

  function restartFromPause() {
    dom.pauseOverlay.hidden = true;
    state.paused = false;
    cleanupPlayback();
    state.game = null;
    startGame();
  }

  function leaveGameToMenu() {
    cleanupPlayback();
    state.game = null;
    state.paused = false;
    hidePauseOverlay();
    resetKeyVisuals();
    setScreen("menu");
    updateBestNote();
    updateDifficultyUI(state.difficulty);
    if (dom.startButton) dom.startButton.focus({ preventScroll: true });
    announce("回到首页。");
  }

  function leaveResultToMenu() {
    if (state.audio) {
      state.audio.stopSong();
      state.audio.stopSfx();
    }
    state.game = null;
    dom.confetti.innerHTML = "";
    setScreen("menu");
    updateBestNote();
    updateDifficultyUI(state.difficulty);
    if (dom.startButton) dom.startButton.focus({ preventScroll: true });
    announce("回到首页。");
  }

  function hidePauseOverlay() {
    dom.pauseOverlay.hidden = true;
  }

  function cleanupPlayback() {
    state.startToken += 1;
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    if (state.game) {
      state.game.running = false;
      state.game.raf = null;
    }
    resetKeyTimers();
    if (state.audio) {
      state.audio.stopSong();
      state.audio.stopSfx();
    }
  }

  function announce(text) {
    if (!dom.liveStatus) return;
    dom.liveStatus.textContent = "";
    window.setTimeout(function () {
      dom.liveStatus.textContent = text;
    }, 40);
  }

  /* ------------------------------------------------------------------
     画布
     ------------------------------------------------------------------ */

  function scheduleCanvasResize() {
    if (resizeFrameId) return;
    resizeFrameId = requestAnimationFrame(function () {
      resizeFrameId = null;
      if (state.screen === "game") {
        resizeCanvas();
        if (state.game && state.paused) {
          drawScene(state.game.time);
        }
      }
    });
  }

  function resizeCanvas() {
    if (!canvasContext) return;
    const rect = dom.noteCanvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2.25);
    view.width = rect.width;
    view.height = rect.height;
    view.dpr = dpr;
    view.laneWidth = rect.width / 4;

    const pixelWidth = Math.round(rect.width * dpr);
    const pixelHeight = Math.round(rect.height * dpr);
    if (dom.noteCanvas.width !== pixelWidth || dom.noteCanvas.height !== pixelHeight) {
      dom.noteCanvas.width = pixelWidth;
      dom.noteCanvas.height = pixelHeight;
    }
    canvasContext.setTransform(dpr, 0, 0, dpr, 0, 0);

    const receptor = dom.receptors[0];
    if (receptor) {
      const receptorRect = receptor.getBoundingClientRect();
      view.hitY = receptorRect.top + receptorRect.height / 2 - rect.top;
      view.receptorRadius = receptorRect.width / 2;
    } else {
      view.hitY = rect.height - 54;
    }

    view.noteWidth = Math.max(34, Math.min(66, view.laneWidth * 0.5));
    view.noteHeight = view.noteWidth * 1.24;

    buildNoteSprites();
    if (state.game && !state.paused && state.screen === "game") {
      drawScene(getSongTime());
    }
  }

  function roundedRectPath(context, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + width, y, x + width, y + height, r);
    context.arcTo(x + width, y + height, x, y + height, r);
    context.arcTo(x, y + height, x, y, r);
    context.arcTo(x, y, x + width, y, r);
    context.closePath();
  }

  function buildNoteSprites() {
    noteSprites = THEMES.map(function (theme) {
      const width = view.noteWidth;
      const height = view.noteHeight;
      const scale = 3;
      const sprite = document.createElement("canvas");
      sprite.width = Math.ceil(width * scale);
      sprite.height = Math.ceil(height * scale);
      const context = sprite.getContext("2d");
      context.scale(scale, scale);
      drawNoteSprite(context, width, height, theme);
      return { canvas: sprite, width: width, height: height };
    });
  }

  function drawNoteSprite(context, width, height, theme) {
    const centerX = width / 2;
    context.clearRect(0, 0, width, height);

    /* 柔和光晕 */
    const glow = context.createRadialGradient(centerX, height * 0.53, width * 0.08, centerX, height * 0.53, width * 0.66);
    glow.addColorStop(0, theme.glow);
    glow.addColorStop(1, "rgba(255, 255, 255, 0)");
    context.fillStyle = glow;
    context.beginPath();
    context.arc(centerX, height * 0.53, width * 0.66, 0, Math.PI * 2);
    context.fill();

    /* 小影子 */
    context.save();
    context.globalAlpha = 0.16;
    context.fillStyle = "#5d3b32";
    context.beginPath();
    context.ellipse(centerX, height * 0.958, width * 0.28, height * 0.026, 0, 0, Math.PI * 2);
    context.fill();
    context.restore();

    const bodyX = width * 0.155;
    const bodyY = height * 0.185;
    const bodyW = width * 0.69;
    const bodyH = height * 0.755;
    const radius = width * 0.19;

    /* 奶嘴 / 奶瓶盖 */
    roundedRectPath(context, width * 0.43, height * 0.012, width * 0.14, height * 0.09, width * 0.045);
    context.fillStyle = "#ffe7d2";
    context.fill();
    context.strokeStyle = theme.dark;
    context.lineWidth = 2;
    context.stroke();

    roundedRectPath(context, width * 0.34, height * 0.085, width * 0.32, height * 0.08, width * 0.03);
    context.fillStyle = theme.color;
    context.fill();
    context.strokeStyle = theme.dark;
    context.lineWidth = 2.1;
    context.stroke();

    /* 瓶身 */
    roundedRectPath(context, bodyX, bodyY, bodyW, bodyH, radius);
    context.fillStyle = "#fffaf0";
    context.fill();

    context.save();
    roundedRectPath(context, bodyX, bodyY, bodyW, bodyH, radius);
    context.clip();

    /* 奶液 */
    context.globalAlpha = 0.3;
    context.fillStyle = theme.color;
    context.fillRect(bodyX, bodyY + bodyH * 0.49, bodyW, bodyH * 0.54);
    context.globalAlpha = 0.5;
    context.fillStyle = theme.color;
    context.beginPath();
    context.moveTo(bodyX, bodyY + bodyH * 0.49);
    context.quadraticCurveTo(
      bodyX + bodyW * 0.25,
      bodyY + bodyH * 0.46,
      bodyX + bodyW * 0.5,
      bodyY + bodyH * 0.5
    );
    context.quadraticCurveTo(
      bodyX + bodyW * 0.76,
      bodyY + bodyH * 0.53,
      bodyX + bodyW,
      bodyY + bodyH * 0.48
    );
    context.lineTo(bodyX + bodyW, bodyY + bodyH);
    context.lineTo(bodyX, bodyY + bodyH);
    context.closePath();
    context.fill();
    context.globalAlpha = 1;

    /* 标签底 */
    context.fillStyle = "rgba(255, 249, 238, 0.96)";
    context.beginPath();
    context.ellipse(centerX, bodyY + bodyH * 0.61, bodyW * 0.39, bodyH * 0.27, 0, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = theme.dark;
    context.globalAlpha = 0.32;
    context.lineWidth = 1.3;
    context.stroke();
    context.globalAlpha = 1;

    /* 瓶身条纹 */
    context.globalAlpha = 0.7;
    context.fillStyle = theme.color;
    roundedRectPath(context, bodyX + bodyW * 0.14, bodyY + bodyH * 0.84, bodyW * 0.72, bodyH * 0.055, width * 0.03);
    context.fill();
    context.globalAlpha = 1;

    /* 奶蛙小脸 */
    const faceY = bodyY + bodyH * 0.6;
    context.fillStyle = theme.ink;
    context.beginPath();
    context.arc(centerX - width * 0.075, faceY - height * 0.018, Math.max(1, width * 0.018), 0, Math.PI * 2);
    context.arc(centerX + width * 0.075, faceY - height * 0.018, Math.max(1, width * 0.018), 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "rgba(255, 158, 181, 0.6)";
    context.beginPath();
    context.ellipse(centerX - width * 0.13, faceY + height * 0.02, width * 0.035, height * 0.018, 0, 0, Math.PI * 2);
    context.ellipse(centerX + width * 0.13, faceY + height * 0.02, width * 0.035, height * 0.018, 0, 0, Math.PI * 2);
    context.fill();

    context.strokeStyle = theme.ink;
    context.lineWidth = Math.max(1.2, width * 0.022);
    context.lineCap = "round";
    context.beginPath();
    context.arc(centerX, faceY + height * 0.01, width * 0.045, 0.17, Math.PI - 0.17);
    context.stroke();

    /* 高光 */
    context.fillStyle = "rgba(255, 255, 255, 0.64)";
    roundedRectPath(context, bodyX + bodyW * 0.13, bodyY + bodyH * 0.14, bodyW * 0.13, bodyH * 0.34, width * 0.06);
    context.fill();

    context.globalAlpha = 0.62;
    context.fillStyle = theme.color;
    context.beginPath();
    context.arc(bodyX + bodyW * 0.78, bodyY + bodyH * 0.19, width * 0.035, 0, Math.PI * 2);
    context.fill();
    context.globalAlpha = 1;
    context.restore();

    /* 外轮廓 */
    roundedRectPath(context, bodyX, bodyY, bodyW, bodyH, radius);
    context.strokeStyle = theme.dark;
    context.lineWidth = Math.max(1.8, width * 0.036);
    context.stroke();

    /* 小爱心 */
    context.save();
    context.translate(bodyX + bodyW * 0.82, bodyY + bodyH * 0.1);
    context.rotate(0.16);
    context.fillStyle = theme.color;
    context.beginPath();
    context.moveTo(0, width * 0.025);
    context.bezierCurveTo(-width * 0.05, -width * 0.016, -width * 0.07, width * 0.036, 0, width * 0.06);
    context.bezierCurveTo(width * 0.07, width * 0.036, width * 0.05, -width * 0.016, 0, width * 0.025);
    context.fill();
    context.restore();
  }

  function drawScene(time) {
    if (!canvasContext) return;
    const game = state.game;
    const width = view.width;
    const height = view.height;
    if (!width || !height) return;

    const context = canvasContext;
    context.clearRect(0, 0, width, height);

    if (game) {
      for (let lane = 0; lane < 4; lane += 1) {
        const flash = game.laneFlash[lane];
        if (flash <= 0.01) continue;
        const centerX = (lane + 0.5) * view.laneWidth;
        const theme = THEMES[lane];
        const glow = context.createRadialGradient(centerX, view.hitY, 2, centerX, view.hitY, view.laneWidth * 0.95);
        glow.addColorStop(0, theme.glow);
        glow.addColorStop(1, "rgba(255, 255, 255, 0)");
        context.save();
        context.globalAlpha = flash * 0.4;
        context.fillStyle = glow;
        context.fillRect(centerX - view.laneWidth * 0.5, view.hitY - view.laneWidth, view.laneWidth, view.laneWidth * 1.7);
        context.globalAlpha = flash * 0.12;
        context.fillStyle = theme.color;
        context.fillRect(lane * view.laneWidth + 2, 0, view.laneWidth - 4, height);
        context.restore();
      }
    }

    /* 判定虚线 */
    context.save();
    context.strokeStyle = "rgba(93, 59, 50, 0.16)";
    context.lineWidth = 1;
    context.setLineDash([3, 8]);
    context.beginPath();
    context.moveTo(12, view.hitY);
    context.lineTo(width - 12, view.hitY);
    context.stroke();
    context.restore();

    if (game && !game.finished) {
      const approach = game.diff.approach;
      const travel = view.hitY + view.noteHeight * 1.5;
      for (let index = 0; index < game.chart.length; index += 1) {
        const note = game.chart[index];
        if (note.judged) continue;
        const remaining = note.time - time;
        if (remaining > approach + 0.08) continue;
        if (remaining < -0.24) continue;
        if (remaining < -game.diff.windows.good - 0.05) continue;

        const laneX = (note.lane + 0.5) * view.laneWidth;
        const y = view.hitY - (remaining / approach) * travel;
        if (y < -view.noteHeight * 1.6 || y > height + view.noteHeight) continue;

        const sprite = noteSprites[note.lane];
        if (!sprite) continue;
        const near = Math.abs(remaining) < 0.16;
        context.save();
        context.translate(laneX, y);
        context.rotate(Math.sin(time * 3 + note.id * 1.7) * 0.024);
        if (near) {
          context.shadowColor = THEMES[note.lane].glow;
          context.shadowBlur = 13;
        }
        context.drawImage(
          sprite.canvas,
          -sprite.width / 2,
          -sprite.height / 2,
          sprite.width,
          sprite.height
        );
        context.restore();
      }
    }

    /* 命中扩散圈 */
    if (hitRings.length) {
      context.save();
      for (let index = 0; index < hitRings.length; index += 1) {
        const ring = hitRings[index];
        context.globalAlpha = Math.max(0, ring.life / ring.maxLife) * 0.6;
        context.strokeStyle = ring.color;
        context.lineWidth = 2.2;
        context.beginPath();
        context.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
        context.stroke();
      }
      context.restore();
    }

    /* 小爱心 / 星星 / 音符 */
    if (particles.length) {
      context.save();
      context.textAlign = "center";
      context.textBaseline = "middle";
      for (let index = 0; index < particles.length; index += 1) {
        const particle = particles[index];
        const alpha = Math.max(0, 1 - particle.age / particle.maxAge);
        context.globalAlpha = alpha;
        context.fillStyle = particle.color;
        context.font =
          (particle.italic ? "italic " : "") +
          particle.size.toFixed(1) +
          "px " +
          (particle.serif
            ? 'Georgia, "Times New Roman", serif'
            : '"Microsoft YaHei", "PingFang SC", sans-serif');
        context.save();
        context.translate(particle.x, particle.y);
        context.rotate(particle.rotation);
        context.fillText(particle.char, 0, 0);
        context.restore();
      }
      context.restore();
    }
  }

  function spawnHitParticles(lane, grade) {
    const theme = THEMES[lane];
    const centerX = (lane + 0.5) * view.laneWidth;
    const centerY = view.hitY;
    const count = grade === "perfect" ? 15 : grade === "great" ? 11 : 7;
    const symbols = ["♥", "✦", "♪", "✶"];
    const colors = [theme.color, theme.dark, "#ffd47e", "#fff8ea"];

    for (let index = 0; index < count; index += 1) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.2;
      const speed = 65 + Math.random() * 155;
      const life = 0.46 + Math.random() * 0.46;
      particles.push({
        x: centerX + (Math.random() - 0.5) * 22,
        y: centerY + (Math.random() - 0.5) * 12,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 24,
        gravity: 260,
        size: 9 + Math.random() * 12,
        color: colors[Math.floor(Math.random() * colors.length)],
        char: symbols[Math.floor(Math.random() * symbols.length)],
        italic: IndexIsItalic(index),
        serif: index % 2 === 0,
        rotation: (Math.random() - 0.5) * 0.8,
        spin: (Math.random() - 0.5) * 2.3,
        age: 0,
        maxAge: life
      });
    }

    hitRings.push({
      x: centerX,
      y: centerY,
      radius: view.receptorRadius * 0.7,
      startRadius: view.receptorRadius * 0.7,
      endRadius: view.receptorRadius * (grade === "perfect" ? 2.15 : 1.8),
      life: grade === "perfect" ? 0.42 : 0.32,
      maxLife: grade === "perfect" ? 0.42 : 0.32,
      color: theme.color
    });
  }

  function IndexIsItalic(index) {
    return index % 3 === 0;
  }

  function updateParticles(dt) {
    for (let index = particles.length - 1; index >= 0; index -= 1) {
      const particle = particles[index];
      particle.age += dt;
      if (particle.age >= particle.maxAge) {
        particles.splice(index, 1);
        continue;
      }
      particle.vy += (particle.gravity || 0) * dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.rotation += (particle.spin || 0) * dt;
      particle.vx *= 0.997;
    }

    for (let index = hitRings.length - 1; index >= 0; index -= 1) {
      const ring = hitRings[index];
      ring.life -= dt;
      const progress = 1 - ring.life / ring.maxLife;
      ring.radius = ring.startRadius + (ring.endRadius - ring.startRadius) * (1 - Math.pow(1 - progress, 2));
      if (ring.life <= 0) {
        hitRings.splice(index, 1);
      }
    }
  }

  /* ------------------------------------------------------------------
     启动入口
     ------------------------------------------------------------------ */

  if (DEBUG_ENABLED) {
    window.__babyRhythm = {
      state: state,
      getSongTime: getSongTime,
      startGame: startGame,
      pressLane: pressLane,
      finishGame: finishGame,
      audio: function () {
        return state.audio;
      }
    };
  }

  init();
})();
