/* ==========================================================================
   奶蛙拍肚肚 · 音乐 / 音效引擎
   --------------------------------------------------------------------------
   - 原创 120 BPM 轻快小曲“奶盖气泡梦”，全部由 Web Audio 合成
   - 按任意键触发“捧腹大笑”：优先使用 BABY_ASSETS.laughAudio
   - 没有外部音效时，用声门脉冲 + 元音共振峰合成一段哈哈哈，作为兜底
   ========================================================================== */

(function () {
  "use strict";

  const BPM = 120;
  const BEAT = 60 / BPM;
  const EIGHTH = BEAT / 2;
  const SIXTEENTH = BEAT / 4;
  const BAR = BEAT * 4;
  const TOTAL_BARS = 20;
  const SONG_LENGTH = TOTAL_BARS * BAR;
  const ACTIVE_START_BAR = 2;
  const ACTIVE_END_BAR = 17;
  const RESULT_TIME = 38.2;
  const LANE_MIDI = [72, 76, 79, 81];

  const CHORDS = {
    Cmaj7: { root: 36, notes: [60, 64, 67, 71], label: "Cmaj7" },
    Am7: { root: 45, notes: [57, 60, 64, 67], label: "Am7" },
    Fmaj7: { root: 41, notes: [53, 57, 60, 64], label: "Fmaj7" },
    G7: { root: 43, notes: [55, 59, 62, 65], label: "G7" },
    Em7: { root: 40, notes: [52, 55, 59, 62], label: "Em7" },
    Dm7: { root: 38, notes: [50, 53, 57, 60], label: "Dm7" }
  };

  const CHORDS_BY_BAR = [
    "Cmaj7", "G7",
    "Cmaj7", "Am7", "Fmaj7", "G7", "Cmaj7", "Am7", "Fmaj7", "G7",
    "Fmaj7", "G7",
    "Fmaj7", "G7", "Em7", "Am7", "Dm7", "G7",
    "Cmaj7", "Cmaj7"
  ];

  /* 每小节 8 个八分音符，数字是 4 个键位（从左到右）。 */
  const MELODY_BARS = {
    2: [2, 3, 2, 1, 2, 3, 1, 0],
    3: [0, 1, 2, 1, 3, 2, 1, 0],
    4: [1, 2, 1, 0, 1, 3, 2, 1],
    5: [2, 1, 2, 3, 2, 1, 0, 1],
    6: [3, 2, 3, 1, 2, 3, 1, 0],
    7: [0, 2, 1, 2, 3, 2, 1, 0],
    8: [1, 0, 1, 2, 3, 2, 1, 0],
    9: [0, 1, 2, 3, 2, 1, 0, 1],
    10: [1, 0, 1, 2, 1, 0, 2, 1],
    11: [2, 1, 2, 3, 2, 1, 0, 1],
    12: [3, 2, 3, 1, 2, 3, 2, 1],
    13: [2, 3, 2, 1, 0, 1, 2, 3],
    14: [1, 2, 3, 2, 1, 0, 1, 2],
    15: [0, 1, 2, 1, 3, 2, 1, 0],
    16: [1, 2, 1, 0, 2, 1, 0, 1],
    17: [2, 3, 2, 1, 0, 1, 2, 3]
  };

  /* 简单难度的四分音符键位表，和其他难度共用同一段伴奏。 */
  const EASY_LANES = {
    2: [0, 1, 2, 3],
    3: [2, 1, 0, 1],
    4: [1, 2, 3, 2],
    5: [0, 2, 1, 3],
    6: [3, 2, 1, 0],
    7: [1, 0, 2, 1],
    8: [0, 1, 2, 1],
    9: [2, 3, 1, 2],
    10: [1, 2, 0, 1],
    11: [0, 2, 3, 2],
    12: [0, 1, 2, 3],
    13: [3, 2, 1, 0],
    14: [2, 3, 2, 1],
    15: [0, 2, 1, 3],
    16: [1, 3, 2, 0],
    17: [3, 1, 0, 2]
  };

  const ACTIVE_BARS = [];
  for (let bar = ACTIVE_START_BAR; bar <= ACTIVE_END_BAR; bar += 1) {
    ACTIVE_BARS.push(bar);
  }

  const SONG = {
    bpm: BPM,
    beat: BEAT,
    eighth: EIGHTH,
    sixteenth: SIXTEENTH,
    bar: BAR,
    totalBars: TOTAL_BARS,
    length: SONG_LENGTH,
    resultTime: RESULT_TIME,
    activeStartBar: ACTIVE_START_BAR,
    activeEndBar: ACTIVE_END_BAR,
    activeBars: ACTIVE_BARS,
    melodyBars: MELODY_BARS,
    easyLanes: EASY_LANES,
    laneMidi: LANE_MIDI
  };

  function midiToHz(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  function buildMusicEvents() {
    const events = [];
    const add = function (time, type, extra) {
      events.push(Object.assign({ time: time, type: type }, extra || {}));
    };

    /* 倒计时：0 / 1 / 2 / 3 秒各敲一下奶木鱼 */
    [0, 1, 2, 3].forEach(function (time, index) {
      add(time, "tick", { gain: index === 3 ? 0.22 : 0.16, accent: index === 3 });
    });

    /* 前两小节：八音盒前奏 + 很轻的拍子 */
    [0, 1].forEach(function (bar) {
      const time = bar * BAR;
      const chordName = CHORDS_BY_BAR[bar];
      const chord = CHORDS[chordName];
      add(time, "pad", { chordName: chordName, dur: BAR + 0.45, gain: 0.037 });

      for (let index = 0; index < 8; index += 1) {
        const note = chord.notes[(index + bar) % chord.notes.length] + 12;
        add(time + index * EIGHTH, "bell", {
          midi: note,
          dur: 0.44,
          gain: index % 4 === 0 ? 0.06 : 0.036,
          pan: index % 2 === 0 ? -0.18 : 0.18
        });
      }
    });

    for (let index = 0; index < 8; index += 1) {
      add(BAR + index * EIGHTH, "hat", { gain: index % 2 === 0 ? 0.016 : 0.011 });
    }
    add(BAR, "kick", { gain: 0.2 });
    add(BAR + 2 * BEAT, "kick", { gain: 0.14 });
    add(BAR + 3 * BEAT, "bass", { midi: 43, dur: 0.26, gain: 0.045 });

    /* 主歌 / 副歌 / 尾奏 */
    for (let bar = 2; bar <= 19; bar += 1) {
      const barStart = bar * BAR;
      const chordName = CHORDS_BY_BAR[bar];
      const chord = CHORDS[chordName];
      const isBridge = bar === 10 || bar === 11;
      const isB = bar >= 12 && bar <= 17;
      const isEnding = bar >= 18;

      if (bar === 2) {
        add(barStart, "crash", { gain: 0.1 });
      }
      if (bar === 12 || bar === 16) {
        add(barStart, "crash", { gain: 0.085 });
      }

      if (isEnding) {
        add(barStart, "pad", {
          chordName: "Cmaj7",
          dur: bar === 18 ? 3.5 : 3.7,
          gain: bar === 18 ? 0.05 : 0.033
        });
        if (bar === 18) {
          add(barStart, "kick", { gain: 0.5 });
          add(barStart, "crash", { gain: 0.1 });
          add(barStart, "bell", { midi: 84, dur: 1.6, gain: 0.065, pan: 0 });
          [72, 76, 79, 84].forEach(function (note, index) {
            add(barStart + 0.78 + index * BEAT, "bell", {
              midi: note,
              dur: 0.55,
              gain: index === 3 ? 0.055 : 0.042,
              pan: index % 2 === 0 ? -0.12 : 0.12
            });
          });
        } else {
          add(barStart + 1.25, "bell", { midi: 91, dur: 0.85, gain: 0.032, pan: 0.15 });
        }
        continue;
      }

      add(barStart, "pad", {
        chordName: chordName,
        dur: BAR + 0.26,
        gain: isBridge ? 0.046 : 0.04
      });

      if (isBridge) {
        add(barStart, "kick", { gain: 0.36 });
        add(barStart + BAR * 0.5, "kick", { gain: 0.25 });
        add(barStart + BEAT * 2, "clap", { gain: 0.26 });
        for (let beat = 0; beat < 4; beat += 1) {
          add(barStart + beat * BEAT, "hat", { gain: beat % 2 === 0 ? 0.018 : 0.013 });
        }
        [0, 1.5, 2, 3.5].forEach(function (offset, index) {
          add(barStart + offset * BEAT, "bass", {
            midi: chord.root + [0, 7, 0, 12][index],
            dur: 0.3,
            gain: 0.07
          });
        });
        for (let step = 0; step < 8; step += 1) {
          add(barStart + step * EIGHTH, "arp", {
            midi: chord.notes[(step + 2) % chord.notes.length] + 12,
            gain: 0.021,
            pan: step % 2 === 0 ? -0.24 : 0.24
          });
        }
        if (bar === 11) {
          for (let step = 0; step < 8; step += 1) {
            add(barStart + 3 * BEAT + step * BEAT * 0.25, "snare", {
              gain: 0.025 + step * 0.009
            });
          }
        }
      } else if (isB) {
        [0, 1.5, 2.5].forEach(function (offset, index) {
          add(barStart + offset * BEAT, "kick", { gain: index === 0 ? 0.43 : 0.33 });
        });
        if (bar % 4 === 1) {
          add(barStart + 3.75 * BEAT, "kick", { gain: 0.2 });
        }
        [1, 3].forEach(function (offset) {
          add(barStart + offset * BEAT, "clap", { gain: 0.28 });
        });
        for (let step = 0; step < 8; step += 1) {
          add(barStart + step * EIGHTH, "hat", {
            gain: step % 2 === 0 ? 0.024 : 0.016,
            open: step === 7 && bar % 2 === 1
          });
        }
        const bassOffsets = [0, 0, 12, 0, 7, 0, 12, 7];
        for (let step = 0; step < 8; step += 1) {
          add(barStart + step * EIGHTH, "bass", {
            midi: chord.root + bassOffsets[step],
            dur: 0.17,
            gain: step % 2 === 0 ? 0.068 : 0.045
          });
        }
        for (let step = 0; step < 4; step += 1) {
          add(barStart + (step + 0.5) * BEAT, "arp", {
            midi: chord.notes[(step + 1) % chord.notes.length] + 12,
            gain: 0.018,
            pan: step % 2 === 0 ? 0.22 : -0.22
          });
        }
      } else {
        [0, 2].forEach(function (offset, index) {
          add(barStart + offset * BEAT, "kick", { gain: index === 0 ? 0.38 : 0.29 });
        });
        if (bar % 4 === 3) {
          add(barStart + 3.5 * BEAT, "kick", { gain: 0.17 });
        }
        [1, 3].forEach(function (offset) {
          add(barStart + offset * BEAT, "clap", { gain: 0.25 });
        });
        for (let step = 0; step < 8; step += 1) {
          add(barStart + step * EIGHTH, "hat", {
            gain: step % 2 === 0 ? 0.021 : 0.014,
            open: step === 7 && (bar === 9 || bar === 7)
          });
        }
        [0, 1, 2, 3].forEach(function (offset, index) {
          add(barStart + offset * BEAT, "bass", {
            midi: chord.root + [0, 12, 7, 12][index],
            dur: 0.27,
            gain: index % 2 === 0 ? 0.074 : 0.052
          });
        });
        if (bar >= 6) {
          for (let step = 0; step < 4; step += 1) {
            add(barStart + (step + 0.5) * BEAT, "arp", {
              midi: chord.notes[(step + 2) % chord.notes.length] + 12,
              gain: 0.016,
              pan: step % 2 === 0 ? -0.22 : 0.22
            });
          }
        }
      }

      /* 主旋律，和 Normal 难度的音符一一对应 */
      const melody = MELODY_BARS[bar];
      if (melody) {
        melody.forEach(function (lane, index) {
          const isPhraseStart = index === 0 || (index === 4 && bar % 4 === 0);
          add(barStart + index * EIGHTH, "lead", {
            midi: LANE_MIDI[lane],
            dur: isPhraseStart ? 0.3 : 0.16,
            gain: isPhraseStart ? 0.068 : 0.043,
            pan: (lane - 1.5) * 0.11
          });
        });
      }
    }

    events.sort(function (a, b) {
      return a.time - b.time;
    });
    return events;
  }

  function buildNoiseBuffer(context) {
    const seconds = 2;
    const buffer = context.createBuffer(1, Math.floor(context.sampleRate * seconds), context.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i += 1) {
      const white = Math.random() * 2 - 1;
      last = last * 0.18 + white * 0.82;
      data[i] = last;
    }
    return buffer;
  }

  function buildImpulse(context, seconds, decay) {
    const length = Math.floor(context.sampleRate * seconds);
    const impulse = context.createBuffer(2, length, context.sampleRate);
    for (let channel = 0; channel < 2; channel += 1) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < length; i += 1) {
        const envelope = Math.pow(1 - i / length, decay);
        const early = i < context.sampleRate * 0.035 ? 1.35 : 1;
        data[i] = (Math.random() * 2 - 1) * envelope * early;
      }
    }
    return impulse;
  }

  function makeSoftClipCurve(amount) {
    const samples = 1024;
    const curve = new Float32Array(samples);
    const strength = amount || 1;
    for (let index = 0; index < samples; index += 1) {
      const x = (index * 2) / (samples - 1) - 1;
      curve[index] = Math.tanh(x * strength);
    }
    return curve;
  }

  class AudioEngine {
    constructor() {
      this.ctx = null;
      this.master = null;
      this.musicBus = null;
      this.musicFxBus = null;
      this.sfxBus = null;
      this.reverb = null;
      this.noiseBuffer = null;
      this.muted = false;
      this.musicVolume = 0.56;
      this.fxVolume = 0.66;
      this.sfxVolume = 0.94;
      this.musicSources = [];
      this.sfxSources = [];
      this.musicEvents = [];
      this.nextEvent = 0;
      this.scheduler = null;
      this.songStart = null;
      this.finishedScheduling = false;
      this.laughBuffer = null;
      this.laughBufferGain = 1;
      this.laughLoadStarted = false;
      this.laughElements = [];
      this.laughElementReady = false;
      this.laughAudioUrl = null;
      this.recentLaughs = [];
      this.middleBuffer = null;
      this.middleBufferGain = 1;
      this.middleLoadStarted = false;
      this.middleElements = [];
      this.middleElementReady = false;
      this.middleAudioUrl = null;
      this.recentMiddleSounds = [];
      this.supported = false;
    }

    async init() {
      if (!this.ctx) {
        const ContextClass = window.AudioContext || window.webkitAudioContext;
        if (!ContextClass) {
          this.supported = false;
          return false;
        }
        this.ctx = new ContextClass({ latencyHint: "interactive" });
        this.supported = true;
        this.buildGraph();
        this.noiseBuffer = buildNoiseBuffer(this.ctx);
        this.reverb.buffer = buildImpulse(this.ctx, 1.55, 2.8);
      }

      if (this.ctx.state === "suspended") {
        try {
          await this.ctx.resume();
        } catch (error) {
          /* 音游仍可继续，只是没有声音 */
        }
      }

      if (!this.laughLoadStarted) {
        this.laughLoadStarted = true;
        const laughSource = window.BABY_ASSETS && window.BABY_ASSETS.laughAudio;
        if (laughSource) {
          this.loadLaugh(laughSource);
        }
      }

      if (!this.middleLoadStarted) {
        this.middleLoadStarted = true;
        const middleSource = window.BABY_ASSETS && window.BABY_ASSETS.middleAudio;
        if (middleSource) {
          this.loadMiddleEffect(middleSource);
        }
      }

      this.setMuted(this.muted);
      return true;
    }

    buildGraph() {
      const context = this.ctx;
      this.master = context.createGain();
      this.master.gain.value = this.muted ? 0 : 0.82;

      const compressor = context.createDynamicsCompressor();
      compressor.threshold.value = -16;
      compressor.knee.value = 14;
      compressor.ratio.value = 3.4;
      compressor.attack.value = 0.004;
      compressor.release.value = 0.28;
      this.compressor = compressor;

      this.master.connect(compressor);
      compressor.connect(context.destination);

      this.reverb = context.createConvolver();
      this.reverbGain = context.createGain();
      this.reverbGain.gain.value = 0.2;
      this.reverb.connect(this.reverbGain);
      this.reverbGain.connect(this.master);

      this.musicBus = context.createGain();
      this.musicBus.gain.value = this.musicVolume;
      this.musicBus.connect(this.master);

      this.musicFxBus = context.createGain();
      this.musicFxBus.gain.value = this.fxVolume;
      this.musicFxBus.connect(this.master);
      this.musicReverbSend = context.createGain();
      this.musicReverbSend.gain.value = 0.22;
      this.musicFxBus.connect(this.musicReverbSend);
      this.musicReverbSend.connect(this.reverb);

      this.sfxBus = context.createGain();
      this.sfxBus.gain.value = this.sfxVolume;
      this.sfxBus.connect(this.master);

      this.sfxReverbSend = context.createGain();
      this.sfxReverbSend.gain.value = 0.2;
      this.sfxBus.connect(this.sfxReverbSend);
      this.sfxReverbSend.connect(this.reverb);

      this.laughClip = context.createWaveShaper();
      this.laughClip.curve = makeSoftClipCurve(2.5);
      this.laughClip.oversample = "2x";
      this.laughClipGain = context.createGain();
      this.laughClipGain.gain.value = 0.94;
      this.laughClip.connect(this.laughClipGain);
      this.laughClipGain.connect(this.sfxBus);
    }

    setMuted(muted) {
      this.muted = Boolean(muted);
      if (this.master && this.ctx) {
        const now = this.ctx.currentTime;
        this.master.gain.cancelScheduledValues(now);
        this.master.gain.setTargetAtTime(this.muted ? 0 : 0.82, now, 0.015);
      }
      this.laughElements.forEach((element) => {
        element.volume = this.muted ? 0 : 0.78;
      });
      this.middleElements.forEach((element) => {
        element.volume = this.muted ? 0 : 0.78;
      });
    }

    async loadLaugh(url) {
      if (!url || !this.ctx) {
        return;
      }
      this.laughAudioUrl = url;

      if (window.location.protocol !== "file:") {
        try {
          const response = await fetch(url, { cache: "force-cache" });
          if (!response.ok) {
            throw new Error("Laugh asset request failed: " + response.status);
          }
          const data = await response.arrayBuffer();
          this.laughBuffer = await this.ctx.decodeAudioData(data.slice(0));
          this.laughBufferGain = this.measureBufferGain(this.laughBuffer);
          return;
        } catch (error) {
          /* file:// 或解码失败时，退回 <audio> 元素播放 */
        }
      }

      this.prepareElementLaugh(url);
    }

    measureBufferGain(buffer) {
      let peak = 0;
      for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
        const data = buffer.getChannelData(channel);
        for (let index = 0; index < data.length; index += 1) {
          const value = Math.abs(data[index]);
          if (value > peak) peak = value;
        }
      }
      return Math.min(1.8, Math.max(0.55, 0.88 / Math.max(0.04, peak)));
    }

    createLaughElement(url) {
      const audio = new Audio();
      audio.src = url;
      audio.preload = "auto";
      audio.volume = this.muted ? 0 : 0.76;
      audio.load();
      audio.addEventListener(
        "canplaythrough",
        () => {
          this.laughElementReady = true;
        },
        { once: true }
      );
      return audio;
    }

    prepareElementLaugh(url) {
      this.laughAudioUrl = url;
      this.laughElements = [];
      for (let index = 0; index < 14; index += 1) {
        this.laughElements.push(this.createLaughElement(url));
      }
    }

    async loadMiddleEffect(url) {
      if (!url || !this.ctx) {
        return;
      }
      this.middleAudioUrl = url;

      if (window.location.protocol !== "file:") {
        try {
          const response = await fetch(url, { cache: "force-cache" });
          if (!response.ok) {
            throw new Error("Middle effect request failed: " + response.status);
          }
          const data = await response.arrayBuffer();
          this.middleBuffer = await this.ctx.decodeAudioData(data.slice(0));
          this.middleBufferGain = this.measureBufferGain(this.middleBuffer);
          return;
        } catch (error) {
          /* file:// 或解码失败时，退回 <audio> 元素播放 */
        }
      }

      this.prepareMiddleElements(url);
    }

    createMiddleElement(url) {
      const audio = new Audio();
      audio.src = url;
      audio.preload = "auto";
      audio.volume = this.muted ? 0 : 0.76;
      audio.load();
      audio.addEventListener(
        "canplaythrough",
        () => {
          this.middleElementReady = true;
        },
        { once: true }
      );
      return audio;
    }

    prepareMiddleElements(url) {
      this.middleAudioUrl = url;
      this.middleElements = [];
      for (let index = 0; index < 10; index += 1) {
        this.middleElements.push(this.createMiddleElement(url));
      }
    }

    trackSource(node, category) {
      const list = category === "sfx" ? this.sfxSources : this.musicSources;
      list.push(node);
      node.addEventListener(
        "ended",
        () => {
          const index = list.indexOf(node);
          if (index >= 0) {
            list.splice(index, 1);
          }
        },
        { once: true }
      );
    }

    makeNoise(when, duration, filterType, frequency, gainValue, destination, q, category) {
      if (!this.ctx) return;
      const source = this.ctx.createBufferSource();
      source.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = filterType || "highpass";
      filter.frequency.value = frequency || 4000;
      filter.Q.value = typeof q === "number" ? q : 0.8;
      const gain = this.ctx.createGain();
      const offset = Math.random() * 1.4;
      const available = this.noiseBuffer.duration - offset;
      const playDuration = Math.min(duration, available, this.noiseBuffer.duration);

      gain.gain.setValueAtTime(0.0001, when);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, gainValue), when + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, when + playDuration);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(destination || this.musicBus);
      source.start(when, offset, playDuration + 0.01);
      source.stop(when + playDuration + 0.03);
      this.trackSource(source, category === "sfx" ? "sfx" : "music");
      return { source: source, filter: filter, gain: gain };
    }

    playTick(when, gain, accent) {
      const context = this.ctx;
      if (!context) return;
      const oscillator = context.createOscillator();
      const env = context.createGain();
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(accent ? 1420 : 1120, when);
      oscillator.frequency.exponentialRampToValueAtTime(accent ? 820 : 910, when + 0.055);
      env.gain.setValueAtTime(0.0001, when);
      env.gain.exponentialRampToValueAtTime(gain || 0.14, when + 0.003);
      env.gain.exponentialRampToValueAtTime(0.0001, when + 0.08);
      oscillator.connect(env);
      env.connect(this.musicBus);
      oscillator.start(when);
      oscillator.stop(when + 0.1);
      this.trackSource(oscillator, "music");
    }

    playPad(when, chordName, duration, gain) {
      const context = this.ctx;
      if (!context) return;
      const chord = CHORDS[chordName] || CHORDS.Cmaj7;
      const filter = context.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(1700, when);
      filter.frequency.exponentialRampToValueAtTime(850, when + duration);
      filter.Q.value = 0.4;

      const env = context.createGain();
      env.gain.setValueAtTime(0.0001, when);
      env.gain.linearRampToValueAtTime(gain, when + 0.22);
      env.gain.setValueAtTime(gain, when + duration * 0.55);
      env.gain.exponentialRampToValueAtTime(0.0001, when + duration);
      filter.connect(env);
      env.connect(this.musicBus);

      chord.notes.forEach((midi, index) => {
        const oscillator = context.createOscillator();
        oscillator.type = index === chord.notes.length - 1 ? "sine" : "triangle";
        oscillator.frequency.value = midiToHz(midi);
        oscillator.detune.value = index % 2 === 0 ? -5 : 5;
        const voice = context.createGain();
        voice.gain.value = index === 0 ? 0.7 : 0.46;
        oscillator.connect(voice);
        voice.connect(filter);
        oscillator.start(when);
        oscillator.stop(when + duration + 0.04);
        this.trackSource(oscillator, "music");
      });
    }

    playBass(when, midi, duration, gain) {
      const context = this.ctx;
      if (!context) return;
      const frequency = midiToHz(midi);
      const filter = context.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(620, when);
      filter.frequency.exponentialRampToValueAtTime(320, when + duration);
      filter.Q.value = 0.6;

      const env = context.createGain();
      env.gain.setValueAtTime(0.0001, when);
      env.gain.exponentialRampToValueAtTime(gain, when + 0.008);
      env.gain.exponentialRampToValueAtTime(gain * 0.35, when + duration * 0.6);
      env.gain.exponentialRampToValueAtTime(0.0001, when + duration + 0.08);

      const oscillator = context.createOscillator();
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(frequency * 1.015, when);
      oscillator.frequency.exponentialRampToValueAtTime(frequency, when + 0.045);

      const sub = context.createOscillator();
      sub.type = "sine";
      sub.frequency.value = frequency;

      const subGain = context.createGain();
      subGain.gain.value = 0.55;

      oscillator.connect(filter);
      sub.connect(subGain);
      subGain.connect(filter);
      filter.connect(env);
      env.connect(this.musicBus);

      oscillator.start(when);
      sub.start(when);
      oscillator.stop(when + duration + 0.12);
      sub.stop(when + duration + 0.12);
      this.trackSource(oscillator, "music");
      this.trackSource(sub, "music");
    }

    playKick(when, gain) {
      const context = this.ctx;
      if (!context) return;
      const oscillator = context.createOscillator();
      const env = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(155, when);
      oscillator.frequency.exponentialRampToValueAtTime(46, when + 0.13);
      env.gain.setValueAtTime(0.0001, when);
      env.gain.exponentialRampToValueAtTime(gain || 0.4, when + 0.006);
      env.gain.exponentialRampToValueAtTime(0.0001, when + 0.3);
      oscillator.connect(env);
      env.connect(this.musicBus);
      oscillator.start(when);
      oscillator.stop(when + 0.32);
      this.trackSource(oscillator, "music");

      this.makeNoise(when, 0.025, "highpass", 2500, 0.035, this.musicBus);
    }

    playClap(when, gain) {
      const context = this.ctx;
      if (!context) return;
      const source = context.createBufferSource();
      source.buffer = this.noiseBuffer;
      const filter = context.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 1550;
      filter.Q.value = 1.15;
      const highpass = context.createBiquadFilter();
      highpass.type = "highpass";
      highpass.frequency.value = 700;
      const env = context.createGain();
      const level = gain || 0.25;

      env.gain.setValueAtTime(0.0001, when);
      env.gain.exponentialRampToValueAtTime(level, when + 0.004);
      env.gain.exponentialRampToValueAtTime(level * 0.25, when + 0.02);
      env.gain.exponentialRampToValueAtTime(level * 0.9, when + 0.03);
      env.gain.exponentialRampToValueAtTime(0.0001, when + 0.17);

      source.connect(highpass);
      highpass.connect(filter);
      filter.connect(env);
      env.connect(this.musicBus);
      source.start(when, Math.random() * 1.5, 0.22);
      source.stop(when + 0.24);
      this.trackSource(source, "music");
    }

    playHat(when, gain, open) {
      const context = this.ctx;
      if (!context) return;
      const source = context.createBufferSource();
      source.buffer = this.noiseBuffer;
      const filter = context.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.value = 7200;
      filter.Q.value = 0.7;
      const env = context.createGain();
      const duration = open ? 0.16 : 0.045;
      env.gain.setValueAtTime(0.0001, when);
      env.gain.exponentialRampToValueAtTime(Math.max(0.0003, gain || 0.02), when + 0.002);
      env.gain.exponentialRampToValueAtTime(0.0001, when + duration);
      source.connect(filter);
      filter.connect(env);
      env.connect(this.musicBus);
      source.start(when, Math.random() * 1.5, duration + 0.03);
      source.stop(when + duration + 0.04);
      this.trackSource(source, "music");
    }

    playSnare(when, gain) {
      const context = this.ctx;
      if (!context) return;
      const noise = this.makeNoise(when, 0.07, "highpass", 1100, gain || 0.06, this.musicBus);
      if (!noise) return;

      const body = context.createOscillator();
      const bodyEnv = context.createGain();
      body.type = "triangle";
      body.frequency.setValueAtTime(220, when);
      body.frequency.exponentialRampToValueAtTime(150, when + 0.05);
      bodyEnv.gain.setValueAtTime(gain * 0.4 || 0.02, when);
      bodyEnv.gain.exponentialRampToValueAtTime(0.0001, when + 0.075);
      body.connect(bodyEnv);
      bodyEnv.connect(this.musicBus);
      body.start(when);
      body.stop(when + 0.09);
      this.trackSource(body, "music");
    }

    playCrash(when, gain) {
      const context = this.ctx;
      if (!context) return;
      const source = context.createBufferSource();
      source.buffer = this.noiseBuffer;
      const filter = context.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.value = 3200;
      filter.Q.value = 0.4;
      const env = context.createGain();
      env.gain.setValueAtTime(0.0001, when);
      env.gain.exponentialRampToValueAtTime(gain || 0.08, when + 0.005);
      env.gain.exponentialRampToValueAtTime(0.0001, when + 0.75);
      source.connect(filter);
      filter.connect(env);
      env.connect(this.musicFxBus);
      source.start(when, Math.random() * 1.1, 0.8);
      source.stop(when + 0.85);
      this.trackSource(source, "music");
    }

    playBell(when, midi, duration, gain, pan) {
      const context = this.ctx;
      if (!context) return;
      const frequency = midiToHz(midi);
      const carrier = context.createOscillator();
      const modulator = context.createOscillator();
      const modulatorGain = context.createGain();
      const env = context.createGain();
      const panner = context.createStereoPanner ? context.createStereoPanner() : null;

      carrier.type = "sine";
      carrier.frequency.value = frequency;
      modulator.type = "sine";
      modulator.frequency.value = frequency * 3.005;
      modulatorGain.gain.setValueAtTime(frequency * 1.25, when);
      modulatorGain.gain.exponentialRampToValueAtTime(frequency * 0.045, when + Math.max(0.08, duration * 0.55));

      env.gain.setValueAtTime(0.0001, when);
      env.gain.exponentialRampToValueAtTime(Math.max(0.0003, gain), when + 0.008);
      env.gain.exponentialRampToValueAtTime(Math.max(0.0003, gain * 0.3), when + duration * 0.4);
      env.gain.exponentialRampToValueAtTime(0.0001, when + duration * 1.25);

      modulator.connect(modulatorGain);
      modulatorGain.connect(carrier.frequency);
      carrier.connect(env);
      if (panner) {
        panner.pan.value = pan || 0;
        env.connect(panner);
        panner.connect(this.musicFxBus);
      } else {
        env.connect(this.musicFxBus);
      }

      carrier.start(when);
      modulator.start(when);
      carrier.stop(when + duration * 1.35 + 0.02);
      modulator.stop(when + duration * 1.35 + 0.02);
      this.trackSource(carrier, "music");
      this.trackSource(modulator, "music");
    }

    scheduleEvent(event, when) {
      switch (event.type) {
        case "tick":
          this.playTick(when, event.gain, event.accent);
          break;
        case "pad":
          this.playPad(when, event.chordName, event.dur, event.gain);
          break;
        case "bass":
          this.playBass(when, event.midi, event.dur, event.gain);
          break;
        case "kick":
          this.playKick(when, event.gain);
          break;
        case "clap":
          this.playClap(when, event.gain);
          break;
        case "hat":
          this.playHat(when, event.gain, event.open);
          break;
        case "snare":
          this.playSnare(when, event.gain);
          break;
        case "crash":
          this.playCrash(when, event.gain);
          break;
        case "lead":
        case "arp":
        case "bell":
          this.playBell(when, event.midi, event.dur || 0.28, event.gain, event.pan);
          break;
        default:
          break;
      }
    }

    startSong(events) {
      if (!this.ctx) {
        return false;
      }
      this.stopSong();
      this.stopSfx();
      this.musicEvents = events || buildMusicEvents();
      this.nextEvent = 0;
      this.songStart = this.ctx.currentTime + 0.16;
      this.finishedScheduling = false;

      const now = this.ctx.currentTime;
      this.musicBus.gain.cancelScheduledValues(now);
      this.musicBus.gain.setValueAtTime(this.musicVolume, now);
      this.musicFxBus.gain.cancelScheduledValues(now);
      this.musicFxBus.gain.setValueAtTime(this.fxVolume, now);

      this.pump();
      this.scheduler = window.setInterval(() => this.pump(), 45);
      return true;
    }

    pump() {
      if (!this.ctx || this.songStart === null || this.finishedScheduling) {
        return;
      }
      const horizon = this.ctx.currentTime - this.songStart + 0.3;
      while (this.nextEvent < this.musicEvents.length && this.musicEvents[this.nextEvent].time <= horizon) {
        const event = this.musicEvents[this.nextEvent];
        const when = this.songStart + event.time;
        if (when > this.ctx.currentTime - 0.03) {
          this.scheduleEvent(event, when);
        }
        this.nextEvent += 1;
      }
      if (this.nextEvent >= this.musicEvents.length) {
        this.finishedScheduling = true;
        window.clearInterval(this.scheduler);
        this.scheduler = null;
      }
    }

    stopSong() {
      if (this.scheduler) {
        window.clearInterval(this.scheduler);
        this.scheduler = null;
      }
      if (this.ctx) {
        const now = this.ctx.currentTime;
        this.musicSources.slice().forEach((source) => {
          try {
            source.stop(now);
          } catch (error) {
            /* 已经结束的节点忽略即可 */
          }
        });
      }
      this.musicSources = [];
      this.musicEvents = [];
      this.nextEvent = 0;
      this.songStart = null;
      this.finishedScheduling = false;
    }

    stopSfx() {
      if (this.ctx) {
        const now = this.ctx.currentTime;
        this.sfxSources.slice().forEach((source) => {
          try {
            source.stop(now);
          } catch (error) {
            /* noop */
          }
        });
      }
      this.sfxSources = [];
      this.laughElements.forEach((element) => {
        try {
          element.pause();
        } catch (error) {
          /* noop */
        }
      });
      this.middleElements.forEach((element) => {
        try {
          element.pause();
        } catch (error) {
          /* noop */
        }
      });
    }

    pause() {
      this.laughElements.forEach((element) => {
        try {
          element.pause();
        } catch (error) {
          /* noop */
        }
      });
      this.middleElements.forEach((element) => {
        try {
          element.pause();
        } catch (error) {
          /* noop */
        }
      });
      if (this.ctx && this.ctx.state === "running") {
        this.ctx.suspend().catch(() => {});
      }
    }

    resume() {
      if (this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {});
      }
    }

    getSongTime() {
      if (!this.ctx || this.songStart === null) {
        return 0;
      }
      return this.ctx.currentTime - this.songStart;
    }

    getSongLength() {
      return SONG_LENGTH;
    }

    /* ------------------------------------------------------------------
       按键音效：中间 F / J 使用短音效，外侧 D / K 使用完整笑声
       ------------------------------------------------------------------ */

    playLaneSound(lane) {
      if (lane === 1 || lane === 2) {
        this.playMiddleEffect(lane);
      } else {
        this.playLaugh(lane);
      }
    }

    playMiddleEffect(lane) {
      if (!this.ctx || this.muted) {
        return;
      }
      const now = this.ctx.currentTime + 0.004;
      const recentCutoff = now - 0.9;
      this.recentMiddleSounds = this.recentMiddleSounds.filter(
        (time) => time > recentCutoff
      );
      this.recentMiddleSounds.push(now);
      const densityScale = Math.min(
        1,
        Math.max(0.55, 1 / Math.sqrt(Math.max(1, this.recentMiddleSounds.length * 0.75)))
      );

      if (this.middleBuffer) {
        this.playMiddleBuffer(now, lane, densityScale);
      } else if (this.middleElementReady && this.middleElements.length) {
        this.playMiddleElement(lane, densityScale);
      } else {
        this.playLaugh(lane);
      }
    }

    playMiddleBuffer(when, lane, densityScale) {
      const context = this.ctx;
      const source = context.createBufferSource();
      source.buffer = this.middleBuffer;

      const gain = context.createGain();
      gain.gain.value = (this.middleBufferGain || 1) * densityScale;

      const panner = context.createStereoPanner ? context.createStereoPanner() : null;
      if (panner) {
        panner.pan.value = Math.max(-0.35, Math.min(0.35, (lane - 1.5) * 0.18));
        source.connect(gain);
        gain.connect(panner);
        panner.connect(this.sfxBus);
      } else {
        source.connect(gain);
        gain.connect(this.sfxBus);
      }

      source.start(when);
      this.trackSource(source, "sfx");
    }

    playMiddleElement(lane, densityScale) {
      let target = this.middleElements.find(
        (element) => element.paused || element.ended
      );

      if (!target && this.middleAudioUrl && this.middleElements.length < 24) {
        target = this.createMiddleElement(this.middleAudioUrl);
        this.middleElements.push(target);
      }
      if (!target) {
        target = this.middleElements.reduce((oldest, element) => {
          return (element.dataset.startedAt || 0) < (oldest.dataset.startedAt || 0)
            ? element
            : oldest;
        }, this.middleElements[0]);
        try {
          target.pause();
        } catch (error) {
          /* noop */
        }
      }

      try {
        target.currentTime = 0;
        target.playbackRate = 1;
        target.volume = this.muted ? 0 : 0.76 * (densityScale || 1);
        target.dataset.startedAt = String(Date.now());
        const playPromise = target.play();
        if (playPromise && typeof playPromise.catch === "function") {
          playPromise.catch(() => {
            this.playLaugh(lane);
          });
        }
      } catch (error) {
        this.playLaugh(lane);
      }
    }

    /* ------------------------------------------------------------------
       捧腹大笑
       ------------------------------------------------------------------ */

    playLaugh(lane) {
      if (!this.ctx || this.muted) {
        return;
      }
      const now = this.ctx.currentTime + 0.004;
      const recentCutoff = now - 1.2;
      this.recentLaughs = this.recentLaughs.filter((time) => time > recentCutoff);
      this.recentLaughs.push(now);
      const densityScale = Math.min(
        1,
        Math.max(0.48, 1 / Math.sqrt(Math.max(1, this.recentLaughs.length * 0.7)))
      );

      if (this.laughBuffer) {
        this.playBufferLaugh(now, lane, densityScale);
      } else if (this.laughElementReady && this.laughElements.length) {
        this.playElementLaugh(lane, densityScale);
      } else {
        this.synthesizeLaugh(now, lane, densityScale);
      }
    }

    playBufferLaugh(when, lane, densityScale) {
      const context = this.ctx;
      const source = context.createBufferSource();
      source.buffer = this.laughBuffer;
      source.playbackRate.value = 0.97 + Math.random() * 0.06;

      const gain = context.createGain();
      gain.gain.value = (this.laughBufferGain || 1) * densityScale;

      const panner = context.createStereoPanner ? context.createStereoPanner() : null;
      if (panner) {
        panner.pan.value = Math.max(-0.5, Math.min(0.5, (lane - 1.5) * 0.24));
      }

      source.connect(gain);
      if (panner) {
        gain.connect(panner);
        panner.connect(this.sfxBus);
      } else {
        gain.connect(this.sfxBus);
      }

      source.start(when);
      this.trackSource(source, "sfx");
    }

    playElementLaugh(lane, densityScale) {
      if (!this.laughElements.length) {
        return;
      }
      let target = this.laughElements.find(
        (element) => element.paused || element.ended
      );

      // A 2.2 second laugh at four notes per second can need 10+ voices.
      // Prefer growing the pool instead of cutting off a previous laugh.
      if (!target && this.laughAudioUrl && this.laughElements.length < 40) {
        target = this.createLaughElement(this.laughAudioUrl);
        this.laughElements.push(target);
      }
      if (!target) {
        target = this.laughElements.reduce((oldest, element) => {
          return (element.dataset.startedAt || 0) < (oldest.dataset.startedAt || 0)
            ? element
            : oldest;
        }, this.laughElements[0]);
        try {
          target.pause();
        } catch (error) {
          /* noop */
        }
      }

      try {
        target.currentTime = 0;
        target.playbackRate = 0.97 + Math.random() * 0.06;
        target.volume = this.muted ? 0 : 0.76 * (densityScale || 1);
        target.dataset.startedAt = String(Date.now());
        const playPromise = target.play();
        if (playPromise && typeof playPromise.catch === "function") {
          playPromise.catch(() => {
            this.synthesizeLaugh(this.ctx.currentTime + 0.004, lane, 0.8);
          });
        }
      } catch (error) {
        this.synthesizeLaugh(this.ctx.currentTime + 0.004, lane, 0.8);
      }
    }

    synthesizeLaugh(when, lane, densityScale) {
      const context = this.ctx;
      if (!context) return;

      const pan = context.createStereoPanner ? context.createStereoPanner() : null;
      if (pan) {
        pan.pan.value = Math.max(-0.5, Math.min(0.5, (lane - 1.5) * 0.28));
      }

      const output = context.createGain();
      const laughLevel = 1.08 * (densityScale || 1);
      output.gain.value = laughLevel;
      if (pan) {
        output.connect(pan);
        pan.connect(this.laughClip);
      } else {
        output.connect(this.laughClip);
      }

      const basePitch = 176 + lane * 17 + (Math.random() * 16 - 8);
      const syllableCount = 5 + Math.floor(Math.random() * 2);
      const timeJitter = 0.012;
      let cursor = when + 0.015;

      /* 吸气：先来一口奶气 */
      const inhale = this.makeNoise(cursor - 0.03, 0.11, "bandpass", 1350, 0.038, output, 0.9, "sfx");
      if (inhale) {
        try {
          inhale.filter.Q.value = 0.75;
        } catch (error) {
          /* noop */
        }
      }

      for (let index = 0; index < syllableCount; index += 1) {
        const progress = index / Math.max(1, syllableCount - 1);
        const duration = 0.115 + Math.random() * 0.038;
        const gap = 0.026 + Math.random() * 0.016;
        const pitch = basePitch * (1 - progress * 0.2) * (1 + (Math.random() * 0.06 - 0.03));
        const finalPitch = pitch * (0.79 + Math.random() * 0.07);
        const formantShift = 1 - progress * 0.07;

        /* 声门：锯齿波 + 一点点方波，像被笑到发抖的气声 */
        const glottal = context.createOscillator();
        glottal.type = "sawtooth";
        glottal.frequency.setValueAtTime(pitch, cursor);
        glottal.frequency.exponentialRampToValueAtTime(finalPitch, cursor + duration);
        glottal.detune.setValueAtTime(Math.random() * 10 - 5, cursor);

        const glottalEnv = context.createGain();
        glottalEnv.gain.setValueAtTime(0.0001, cursor);
        glottalEnv.gain.linearRampToValueAtTime(0.5, cursor + 0.011);
        glottalEnv.gain.exponentialRampToValueAtTime(0.2, cursor + duration * 0.5);
        glottalEnv.gain.exponentialRampToValueAtTime(0.0001, cursor + duration);
        glottal.connect(glottalEnv);

        const formantOne = context.createBiquadFilter();
        formantOne.type = "bandpass";
        formantOne.frequency.setValueAtTime(830 * formantShift, cursor);
        formantOne.frequency.linearRampToValueAtTime(760 * formantShift, cursor + duration);
        formantOne.Q.value = 4.4;

        const formantTwo = context.createBiquadFilter();
        formantTwo.type = "bandpass";
        formantTwo.frequency.setValueAtTime(1260 * formantShift, cursor);
        formantTwo.frequency.linearRampToValueAtTime(1160 * formantShift, cursor + duration);
        formantTwo.Q.value = 6;

        const formantThree = context.createBiquadFilter();
        formantThree.type = "bandpass";
        formantThree.frequency.setValueAtTime(2700, cursor);
        formantThree.frequency.linearRampToValueAtTime(2450, cursor + duration);
        formantThree.Q.value = 8;

        const formantOneGain = context.createGain();
        formantOneGain.gain.value = 1.1;
        const formantTwoGain = context.createGain();
        formantTwoGain.gain.value = 0.66;
        const formantThreeGain = context.createGain();
        formantThreeGain.gain.value = 0.32;

        glottalEnv.connect(formantOne);
        glottalEnv.connect(formantTwo);
        glottalEnv.connect(formantThree);
        formantOne.connect(formantOneGain);
        formantTwo.connect(formantTwoGain);
        formantThree.connect(formantThreeGain);

        const syllableEnv = context.createGain();
        syllableEnv.gain.setValueAtTime(0.0001, cursor);
        syllableEnv.gain.linearRampToValueAtTime(0.33, cursor + 0.012);
        syllableEnv.gain.exponentialRampToValueAtTime(0.14, cursor + duration * 0.5);
        syllableEnv.gain.exponentialRampToValueAtTime(0.0001, cursor + duration);

        formantOneGain.connect(syllableEnv);
        formantTwoGain.connect(syllableEnv);
        formantThreeGain.connect(syllableEnv);
        syllableEnv.connect(output);

        /* 气声 */
        this.makeNoise(cursor, duration * 0.74, "bandpass", 1750 + Math.random() * 300, 0.012, output, 0.9, "sfx");

        /* 低低的胸腔共鸣，让哈哈哈更有“捧腹”感 */
        const chest = context.createOscillator();
        chest.type = "sine";
        chest.frequency.setValueAtTime(96 - index * 3, cursor);
        chest.frequency.exponentialRampToValueAtTime(68 - index * 2, cursor + duration);
        const chestEnv = context.createGain();
        chestEnv.gain.setValueAtTime(0.0001, cursor);
        chestEnv.gain.linearRampToValueAtTime(0.09, cursor + 0.01);
        chestEnv.gain.exponentialRampToValueAtTime(0.0001, cursor + duration * 0.85);
        chest.connect(chestEnv);
        chestEnv.connect(output);

        glottal.start(cursor);
        glottal.stop(cursor + duration + 0.02);
        chest.start(cursor);
        chest.stop(cursor + duration + 0.02);
        this.trackSource(glottal, "sfx");
        this.trackSource(chest, "sfx");

        cursor += duration + gap + Math.random() * timeJitter;
      }

      output.gain.setValueAtTime(laughLevel, when);
      output.gain.linearRampToValueAtTime(laughLevel, cursor - 0.05);
      output.gain.exponentialRampToValueAtTime(0.0001, cursor + 0.2);
    }
  }

  window.BabyAudio = {
    SONG,
    CHORDS,
    buildMusicEvents,
    AudioEngine,
    midiToHz,
    EIGHTH,
    SIXTEENTH
  };
})();
