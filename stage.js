// 룩북 바닥 (GAME·상세 창 공용)
// 끌기 = 옮기기, 휠·트랙패드 핀치·두 손가락 = 크기, 마지막에 만진 옷이 맨 위
const Stage = (() => {
  const PARTS = ['모자', '상의', '하의', '신발', '아이템'];
  const DEFAULT_ORDER = ['신발', '하의', '상의', '모자', '아이템']; // 뒤에 있을수록 위
  const DRAG_THRESHOLD = 4;            // px, 이보다 덜 움직이면 클릭으로 처리
  const SCALE_MIN = 0.4, SCALE_MAX = 3;
  const WHEEL_SPEED = 0.002;           // 휠·트랙패드 핀치 감도
  const WHEEL_SETTLE_MS = 200;         // 휠이 멈춘 뒤 onChange
  const NO_OFFSET = [0, 0, 1];         // [dx, dy, scale] dx·dy = 바닥 너비·높이 대비 %
  const clampScale = v => Math.min(SCALE_MAX, Math.max(SCALE_MIN, v));
  const defaultOffsets = () => Object.fromEntries(PARTS.map(part => [part, NO_OFFSET]));

  function applyOffset(slot, [dx, dy, sc]) {
    slot.style.setProperty('--dx', dx);
    slot.style.setProperty('--dy', dy);
    slot.style.setProperty('--s', sc);
  }

  // onChange(part?): 위치·크기·순서가 바뀜 / onTap(part): 끌지 않고 그냥 누름
  function create(stage, { offsets = defaultOffsets(), order = DEFAULT_ORDER, onChange = () => {}, onTap = () => {} } = {}) {
    const pointers = new Map(); // pointerId → {x, y}
    let gesture = null;         // { slot, part, start, x, y, dist, moved, next }
    let justDragged = false;    // 드래그 직후 따라오는 click 무시
    let wheelTimer;

    const applyZ = () => stage.querySelectorAll('.slot').forEach(slot => {
      slot.style.zIndex = order.indexOf(slot.dataset.part) + 1;
    });
    const distance = () => {
      const [a, b] = [...pointers.values()];
      return Math.hypot(a.x - b.x, a.y - b.y);
    };
    function front(part) {
      if (order.at(-1) === part) return;
      order = [...order.filter(p => p !== part), part];
      applyZ();
      onChange();
    }

    stage.addEventListener('pointerdown', e => {
      const slot = e.target.closest('.slot');
      if (!slot) return;
      e.preventDefault(); // 이미지 기본 끌기(드래그앤드롭) 막기
      slot.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const part = slot.dataset.part;
      front(part);
      if (!gesture) {
        gesture = { slot, part, start: offsets[part], x: e.clientX, y: e.clientY, moved: false, next: offsets[part] };
      } else if (pointers.size === 2 && gesture.slot === slot) {
        gesture.dist = distance();  // 두 번째 손가락 → 핀치 시작
        gesture.start = gesture.next;
      }
    });
    stage.addEventListener('pointermove', e => {
      if (!gesture || !pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const [dx, dy, sc] = gesture.start;
      if (pointers.size >= 2 && gesture.dist) {
        gesture.next = [gesture.next[0], gesture.next[1], clampScale(sc * distance() / gesture.dist)];
      } else {
        const mx = e.clientX - gesture.x, my = e.clientY - gesture.y;
        if (!gesture.moved && Math.hypot(mx, my) < DRAG_THRESHOLD) return;
        gesture.next = [dx + mx / stage.clientWidth * 100, dy + my / stage.clientHeight * 100, sc];
      }
      gesture.moved = true;
      gesture.slot.classList.add('dragging');
      applyOffset(gesture.slot, gesture.next);
    });
    function endPointer(e) {
      pointers.delete(e.pointerId);
      if (!gesture || pointers.size) return; // 손가락이 남아 있으면 계속
      const { slot, part, moved, next } = gesture;
      gesture = null;
      if (!moved) return; // 그냥 누른 건 click에서 처리
      slot.classList.remove('dragging');
      justDragged = true;
      setTimeout(() => { justDragged = false; }); // click이 안 따라오는 브라우저 대비
      offsets = { ...offsets, [part]: next };
      onChange(part);
    }
    stage.addEventListener('pointerup', endPointer);
    stage.addEventListener('pointercancel', endPointer);

    stage.addEventListener('wheel', e => {
      const slot = e.target.closest('.slot');
      if (!slot) return;
      e.preventDefault(); // 페이지 스크롤·브라우저 확대 대신 옷 크기 조절
      const part = slot.dataset.part;
      front(part);
      const [dx, dy, sc] = offsets[part];
      offsets = { ...offsets, [part]: [dx, dy, clampScale(sc * Math.exp(-e.deltaY * WHEEL_SPEED))] };
      applyOffset(slot, offsets[part]);
      clearTimeout(wheelTimer);
      wheelTimer = setTimeout(() => onChange(), WHEEL_SETTLE_MS);
    }, { passive: false });

    stage.addEventListener('click', e => {
      if (justDragged) { justDragged = false; return; }
      const slot = e.target.closest('.slot');
      if (slot) onTap(slot.dataset.part);
    });

    return {
      get offsets() { return offsets; },
      get order() { return order; },
      front,
      // look: part → piece|null. 빈 자리는 아무것도 안 그림
      render(look) {
        stage.replaceChildren(...PARTS.filter(part => look[part]).map(part => {
          const p = look[part];
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'slot';
          b.dataset.part = part;
          applyOffset(b, offsets[part]);
          b.setAttribute('aria-label', p.person ? `${p.person}의 ${p.part}` : p.part);
          const img = document.createElement('img');
          img.src = p.src;
          img.alt = '';
          img.draggable = false;
          img.style.transform = `rotate(${p.rot}deg)`;
          b.append(img);
          return b;
        }));
        applyZ();
      },
    };
  }

  return { create, PARTS, DEFAULT_ORDER, NO_OFFSET, clampScale };
})();
