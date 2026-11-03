// 옷을 바닥에 흩뿌리는 배치 (앞면·안쪽 홈 공용)
const Floor = (() => {
  const PART_SCALE = { 모자: 1.1, 상의: 1.7, 하의: 1.6, 신발: 1.15, 아이템: 1.3 }; // 칸 대비 기본 크기
  const MAX_TILT = 14;  // 회전 ±도
  const TOTAL = 150;    // 발표 기준 총 개수 (5명 × 30일)

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // build(piece) → 요소. 위치·크기·기울기를 붙여서 바닥을 채움
  // scale: 옷 크기 배율, bleed: true면 여백 없이 화면 밖까지 걸치게 깔기
  function scatter(floor, build, { scale = 1, bleed = false } = {}) {
    // ponytail: 150개가 모이기 전까진 있는 옷을 반복해서 채움. ?n= 으로 개수 확인 가능
    const count = Number(new URLSearchParams(location.search).get('n')) || TOTAL;
    const pool = Array.from({ length: count }, (_, i) => PIECES[i % PIECES.length]);
    const W = floor.clientWidth, H = floor.clientHeight;
    const cols = Math.max(3, Math.round(Math.sqrt(pool.length * W / H)));
    const rows = Math.ceil(pool.length / cols);
    const cell = Math.min(W / cols, H / rows);
    const pad = bleed ? 0 : cell * 0.5; // 가장자리 옷이 잘리지 않게 바깥쪽 반 칸씩 여백
    const cellW = (W - pad * 2) / cols, cellH = (H - pad * 2) / rows;
    floor.replaceChildren(...shuffle(pool).map((p, i) => {
      const c = i % cols, r = Math.floor(i / cols);
      const size = cell * (PART_SCALE[p.part] ?? 1) * (0.85 + Math.random() * 0.3) * scale;
      const el = build(p);
      el.dataset.part = p.part;
      const x = pad + (c + 0.5 + (Math.random() - 0.5) * 0.6) * cellW;
      const y = pad + (r + 0.5 + (Math.random() - 0.5) * 0.6) * cellH;
      // bleed가 아니면 옷이 영역 밖으로 잘리지 않게 안쪽으로 밀어 넣음
      const keepIn = (v, max) => (bleed ? v : Math.min(max - size / 2, Math.max(size / 2, v)));
      el.style.left = `${keepIn(x, W)}px`;
      el.style.top = `${keepIn(y, H)}px`;
      el.style.width = el.style.height = `${size}px`;
      el.style.setProperty('--r', `${(p.rot ?? 0) + (Math.random() * 2 - 1) * MAX_TILT}deg`);
      return el;
    }));
  }

  // 옷 실루엣을 바닥에 깔기 (앞면·배경 공용)
  const silhouettes = (floor, options) => scatter(floor, p => {
    const s = document.createElement('span');
    s.className = 'silhouette';
    s.setAttribute('aria-hidden', 'true');
    s.style.setProperty('--src', `url("${p.src}")`);
    s.dataset.src = p.src;
    return s;
  }, options);

  // 옅은 실루엣 배경: <div class="backdrop">을 채우고 창 너비가 바뀌면 다시 깜
  function backdrop(el) {
    const draw = () => silhouettes(el, { scale: 1.6, bleed: true });
    let lastW = innerWidth;
    addEventListener('resize', () => { if (innerWidth !== lastW) { lastW = innerWidth; draw(); } });
    draw();
  }

  return { scatter, silhouettes, backdrop };
})();
