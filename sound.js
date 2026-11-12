// 규칙은 두 줄뿐
//   1) 부위 = 악기: 신발=킥, 모자=하이햇, 하의=베이스, 상의=코드, 아이템=멜로디
//   2) 밝기 = 음높이: 어두운 옷은 낮게, 밝은 옷은 높게 (data.js의 tone.L, 0 검정 – 100 흰색)
//      멜로디는 음계 칸 단위, 코드는 자리바꿈 단위로 옷마다 다른 음. 드럼은 음높이·길이가 연속으로 바뀜
//      베이스(하의)는 더 내리면 스피커에서 안 들려서: 어두우면 뭉툭, 밝으면 또렷 + 밝은 옷은 한 옥타브 위
// 리듬은 고정. 크기 = 볼륨, 좌우 위치 = 패닝
const Sound = (() => {
  const BPM = 118;
  const STEP = 60 / BPM / 4;   // 16분음표 길이(초)
  const LOOKAHEAD = 0.12;      // 초, 미리 예약하는 구간
  const TICK_MS = 25;
  // 빈티지 옷 밝기가 대부분 10–70이라 이 구간을 0–1로 펼침 (그 밖은 끝에 붙음)
  const L_MIN = 10, L_MAX = 70;
  const STEPS = 5;           // 음 있는 악기: 가운데서 위아래로 몇 칸까지 (멜로디 = 음계 칸, 코드 = 자리바꿈)
  const L_BASS_UP = 50;      // 이 밝기부터 베이스 한 옥타브 위
  const PENTA = [0, 3, 5, 7, 10]; // A단조 펜타토닉 (A 기준 반음)

  // A단조 4마디 진행: Am7 – Fmaj7 – Cmaj7 – G6
  const ROOTS = [45, 41, 48, 43];
  const CHORDS = [[57, 60, 64, 67], [57, 60, 64, 65], [55, 59, 60, 64], [55, 59, 62, 64]];
  const _ = null;
  // 16칸 고정 리듬
  const KICK = [0, 4, 8, 12];
  const HAT = [2, 6, 10, 14];
  const CHORD = [2, 6, 10, 14];
  const BASS = [0, _, _, 0, _, _, 0, _, 0, _, _, 0, _, 12, _, _];              // 근음 기준 반음
  const MELODY = [69, _, _, 72, _, _, 76, _, _, 74, _, _, 72, _, 67, _];       // A단조 펜타토닉
  const DECAY = { 신발: 0.3, 하의: 0.22, 상의: 0.28, 아이템: 0.2 }; // 모자는 밝기 따라 (아래)
  const LEVEL = { 신발: 0.9, 모자: 0.18, 하의: 0.5, 상의: 0.12, 아이템: 0.16 };

  const lerp = (a, b, t) => a + (b - a) * t;

  // 밝기 → 이 옷의 소리 설정
  function voiceFor(L) {
    // 제곱근: 몰려 있는 어두운 옷들 사이를 더 벌림
    const bright = Math.sqrt(Math.max(0, Math.min(1, (L - L_MIN) / (L_MAX - L_MIN))));
    return {
      bright,                                        // 드럼·베이스 음색 (연속)
      steps: Math.round(lerp(-STEPS, STEPS, bright)), // 멜로디·코드 (11칸)
      bassUp: L >= L_BASS_UP ? 12 : 0,
    };
  }

  // 펜타토닉 위에서 n칸 이동
  function penta(midi, n) {
    const r = midi - 45, idx = PENTA.indexOf(((r % 12) + 12) % 12);
    const k = Math.floor(r / 12) * 5 + idx + n;
    return 45 + Math.floor(k / 5) * 12 + PENTA[((k % 5) + 5) % 5];
  }
  // 코드 자리바꿈 n번: 위로는 맨 아래 음을 옥타브 올림, 아래로는 맨 위 음을 내림 (화음은 그대로)
  function invert(notes, n) {
    let v = [...notes].sort((a, b) => a - b);
    for (let i = 0; i < Math.abs(n); i++) {
      v = n > 0 ? [...v.slice(1), v[0] + 12] : [v.at(-1) - 12, ...v.slice(0, -1)];
    }
    return v;
  }

  let ctx, master, noise, timer;
  let step = 0, nextTime = 0, on = false;
  let layers = {}; // part → { id, voice, gain, pan }

  const midiHz = m => 440 * 2 ** ((m - 69) / 12);

  function init() {
    ctx = new AudioContext();
    const comp = ctx.createDynamicsCompressor();
    master = ctx.createGain();
    master.gain.value = 0.7;
    master.connect(comp).connect(ctx.destination);
    noise = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
    noise.getChannelData(0).forEach((_, i, d) => { d[i] = Math.random() * 2 - 1; });
  }

  function layerOut(part) {
    const L = layers[part];
    if (!L.gain) {
      L.gain = ctx.createGain();
      L.pan = ctx.createStereoPanner();
      L.gain.connect(L.pan).connect(master);
    }
    return L.gain;
  }

  function env(node, t, peak, decay) {
    node.gain.setValueAtTime(peak, t);
    node.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  }

  function voice(part, t, build, decay, peak = 1) {
    const g = ctx.createGain();
    env(g, t, peak, decay);
    g.connect(layerOut(part));
    build(g, t, t + decay + 0.02);
  }

  const play = {
    신발: (t, v) => voice('신발', t, (out, s, e) => {
      const o = ctx.createOscillator();
      o.frequency.setValueAtTime(lerp(110, 260, v.bright), s);
      o.frequency.exponentialRampToValueAtTime(lerp(35, 120, v.bright), s + 0.12); // 밝을수록 높은 킥
      o.connect(out); o.start(s); o.stop(e);
    }, DECAY.신발),
    모자: (t, v, accent) => voice('모자', t, (out, s, e) => {
      const src = ctx.createBufferSource();
      const hp = ctx.createBiquadFilter();
      src.buffer = noise; hp.type = 'highpass'; hp.frequency.value = lerp(3000, 12000, v.bright);
      src.connect(hp).connect(out); src.start(s); src.stop(e);
    }, lerp(0.14, 0.03, v.bright), accent ? 1 : 0.6), // 어두우면 길게 '츠-', 밝으면 짧게 '칫'
    하의: (t, v, note) => voice('하의', t, (out, s, e) => {
      const o = ctx.createOscillator(), lp = ctx.createBiquadFilter();
      o.type = 'sawtooth'; o.frequency.value = midiHz(note);
      lp.type = 'lowpass'; lp.frequency.value = lerp(200, 4000, v.bright); // 밝을수록 또렷
      o.connect(lp).connect(out); o.start(s); o.stop(e);
    }, DECAY.하의),
    상의: (t, v, notes) => voice('상의', t, (out, s, e) => {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = lerp(800, 3300, v.bright); lp.connect(out);
      notes.forEach(n => [-6, 6].forEach(cents => {
        const o = ctx.createOscillator();
        o.type = 'sawtooth'; o.frequency.value = midiHz(n); o.detune.value = cents;
        o.connect(lp); o.start(s); o.stop(e);
      }));
    }, DECAY.상의),
    아이템: (t, v, note) => voice('아이템', t, (out, s, e) => {
      const o = ctx.createOscillator();
      o.type = 'triangle'; o.frequency.value = midiHz(note);
      o.connect(out); o.start(s); o.stop(e);
    }, DECAY.아이템),
  };

  function schedule(s, t) {
    const bar = Math.floor(s / 16) % 4, i = s % 16;
    Object.entries(layers).forEach(([part, L]) => {
      const v = L.voice;
      if (part === '신발' && KICK.includes(i)) play.신발(t, v);
      if (part === '모자' && HAT.includes(i)) play.모자(t, v, i % 4 === 2);
      if (part === '상의' && CHORD.includes(i)) play.상의(t, v, invert(CHORDS[bar], Math.round(v.steps * 0.8)));
      if (part === '하의' && BASS[i] !== null) play.하의(t, v, ROOTS[bar] + BASS[i] + v.bassUp);
      if (part === '아이템' && MELODY[i]) play.아이템(t, v, penta(MELODY[i], v.steps));
    });
  }

  function tick() {
    while (nextTime < ctx.currentTime + LOOKAHEAD) {
      schedule(step, nextTime);
      nextTime += STEP;
      step = (step + 1) % 64;
    }
  }

  return {
    get on() { return on; },
    toggle() {
      if (!ctx) init();
      on = !on;
      if (on) {
        ctx.resume();
        step = 0; nextTime = ctx.currentTime + 0.05;
        timer = setInterval(tick, TICK_MS);
      } else {
        clearInterval(timer);
        ctx.suspend();
      }
      return on;
    },
    // look: part → id|null, offsets: part → [dx, dy, scale]
    sync(look, offsets) {
      const next = {};
      Object.entries(look).forEach(([part, id]) => {
        if (!id) return;
        const prev = layers[part];
        const piece = PIECES.find(p => p.id === id);
        if (!piece?.tone) return;
        const L = prev && prev.id === id ? prev : { ...prev, id, voice: voiceFor(piece.tone.L) };
        next[part] = L;
      });
      Object.entries(layers).forEach(([part, L]) => {
        if (!next[part] && L.gain) L.gain.disconnect();
      });
      layers = next;
      if (!ctx) return;
      Object.entries(layers).forEach(([part, L]) => {
        const [dx, , sc] = offsets[part];
        layerOut(part).gain.setTargetAtTime(LEVEL[part] * Math.sqrt(sc), ctx.currentTime, 0.05);
        L.pan.pan.setTargetAtTime(Math.max(-1, Math.min(1, dx / 40)), ctx.currentTime, 0.05);
      });
    },
  };
})();
