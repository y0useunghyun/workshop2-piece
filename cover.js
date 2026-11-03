// 앞면: 꽉 찬 조각 바닥 위에 151번째 조각인 영수증. 다 끌 수 있고, 바코드를 눌러야 안으로 들어감
(() => {
  const SCALE_MIN = 1.7, SCALE_MAX = 2.4; // 옷 크기 배율: 새로고침마다 뽑음. 주소에 ?full=2 처럼 넣으면 고정
  const HIT_SIZE = 64, ALPHA_MIN = 128;   // 옷 모양 판별용 축소 크기·불투명 기준

  const floor = document.querySelector('.cover-floor');
  const fixedScale = Number(new URLSearchParams(location.search).get('full'));
  const options = { scale: fixedScale || SCALE_MIN + Math.random() * (SCALE_MAX - SCALE_MIN), bleed: true };

  const receipt = floor.querySelector('.receipt');
  const paper = receipt.querySelector('.paper');
  const TEAR_STEP = 9;      // px, 찢긴 가장자리 간격
  const TEAR_DEPTH = 7;     // px, 위쪽 찢긴 깊이

  // 영수증 가장자리: 위는 불규칙하게 찢기고, 아래는 톱니
  function tearPaper() {
    const W = paper.offsetWidth, H = paper.offsetHeight;
    const top = [], bottom = [];
    for (let x = 0; x <= W; x += TEAR_STEP) top.push(`${x}px ${Math.random() * TEAR_DEPTH}px`);
    for (let x = W, up = true; x >= 0; x -= TEAR_STEP, up = !up) bottom.push(`${x}px ${H - (up ? TEAR_DEPTH : 0)}px`);
    paper.style.clipPath = `polygon(${[...top, ...bottom].join(',')})`;
  }

  // 바코드: 막대 두께를 고정된 순서로 반복
  const BAR_WIDTHS = [1.2, 0.6, 2.2, 0.6, 0.6, 1.6, 2.6, 0.6, 1.2, 0.6];
  (function drawBarcode() {
    const svg = receipt.querySelector('.enter svg');
    let x = 0, i = 0, bars = '';
    while (x < 100) {
      const w = BAR_WIDTHS[i % BAR_WIDTHS.length];
      if (i % 2 === 0) bars += `<rect x="${x}" width="${w}" height="20"/>`;
      x += w; i++;
    }
    svg.innerHTML = bars;
  })();

  function layout() {
    Floor.silhouettes(floor, options);
    floor.append(receipt); // 바닥을 다시 깔면 영수증도 다시 올림
    receipt.style.left = `${floor.clientWidth / 2}px`;
    receipt.style.top = `${floor.clientHeight / 2}px`;
    tearPaper();
  }

  // 옷 모양 판별: 이미지별 투명도 지도 (투명한 곳을 누르면 그 아래 조각이 잡히도록)
  const alphaMaps = new Map();
  function loadAlpha(src) {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = HIT_SIZE;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      const k = HIT_SIZE / Math.max(img.width, img.height); // 마스크의 contain과 같은 맞춤
      const w = img.width * k, h = img.height * k;
      ctx.drawImage(img, (HIT_SIZE - w) / 2, (HIT_SIZE - h) / 2, w, h);
      alphaMaps.set(src, ctx.getImageData(0, 0, HIT_SIZE, HIT_SIZE).data);
    };
    img.src = src;
  }
  PIECES.forEach(p => loadAlpha(p.src));

  function isOnShape(el, x, y) {
    const map = alphaMaps.get(el.dataset.src);
    if (!map) return true; // 아직 안 불러왔으면 칸 전체를 조각으로
    const box = floor.getBoundingClientRect();
    const size = parseFloat(el.style.width);
    const dx = x - box.left - parseFloat(el.style.left), dy = y - box.top - parseFloat(el.style.top);
    const rad = -parseFloat(el.style.getPropertyValue('--r')) * Math.PI / 180;
    const u = (dx * Math.cos(rad) - dy * Math.sin(rad)) / size + 0.5;
    const v = (dx * Math.sin(rad) + dy * Math.cos(rad)) / size + 0.5;
    if (u < 0 || v < 0 || u >= 1 || v >= 1) return false;
    return map[(Math.floor(v * HIT_SIZE) * HIT_SIZE + Math.floor(u * HIT_SIZE)) * 4 + 3] >= ALPHA_MIN;
  }

  // 끌기
  let drag = null, topZ = 1; // 영수증은 처음에 맨 위. 끌면 끈 것이 그 위로
  floor.addEventListener('pointerdown', e => {
    if (e.target.closest('a')) return; // 링크는 끌지 않고 그대로 눌림
    const el = document.elementsFromPoint(e.clientX, e.clientY).map(n => n.closest('.receipt') ?? n)
      .find(n => n === receipt || (n.classList.contains('silhouette') && isOnShape(n, e.clientX, e.clientY)));
    if (!el) return;
    e.preventDefault();
    floor.setPointerCapture(e.pointerId);
    el.style.zIndex = ++topZ;
    drag = { el, id: e.pointerId, x: e.clientX, y: e.clientY, left: parseFloat(el.style.left), top: parseFloat(el.style.top) };
    floor.classList.add('dragging');
  });
  floor.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    drag.el.style.left = `${drag.left + e.clientX - drag.x}px`;
    drag.el.style.top = `${drag.top + e.clientY - drag.y}px`;
  });
  const end = e => {
    if (!drag || e.pointerId !== drag.id) return;
    drag = null;
    floor.classList.remove('dragging');
  };
  floor.addEventListener('pointerup', end);
  floor.addEventListener('pointercancel', end);

  let lastW = innerWidth;
  addEventListener('resize', () => { if (innerWidth !== lastW) { lastW = innerWidth; layout(); } });
  receipt.style.zIndex = topZ;
  layout();
  document.fonts?.ready.then(tearPaper); // 글꼴이 늦게 오면 종이 높이가 바뀌어서 다시 자름

  // 음악: 부위마다 옷 하나를 뽑아 악기로 (브라우저 정책상 버튼을 눌러야 소리가 남)
  const PARTS = ['모자', '상의', '하의', '신발', '아이템'];
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const look = Object.fromEntries(PARTS.map(part => [part, pick(PIECES.filter(p => p.part === part)).id]));
  const NEUTRAL = Object.fromEntries(PARTS.map(part => [part, [0, 0, 1]]));
  const soundBtn = document.querySelector('.cover-sound');
  soundBtn.addEventListener('click', () => {
    const on = Sound.toggle();
    Sound.sync(look, NEUTRAL);
    soundBtn.setAttribute('aria-pressed', on);
    soundBtn.textContent = on ? 'SOUND ON' : 'SOUND OFF';
  });
})();
