// 바닥의 옷을 누르면 위에 뜨는 상세 창: 왼쪽 큰 이미지 + 오른쪽 그날의 룩북(만질 수 있음)
(() => {
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const title = p => p.person ? `${p.person}의 ${p.part}` : p.part;
  // 폴더명 10-31, 11-1 → 10.31 LOOK, 11.01 LOOK
  const lookLabel = day => `${day.split('-').map(n => n.padStart(2, '0')).join('.')} LOOK`;
  const arrangements = new Map(); // 날짜 → { offsets, order }: 창을 닫았다 열어도 배치 유지

  const dialog = document.createElement('dialog');
  dialog.className = 'detail';
  dialog.setAttribute('aria-label', '상품 상세');
  document.body.append(dialog);

  function showPiece(piece) {
    dialog.querySelector('.photo').innerHTML =
      `<img src="${esc(piece.src)}" alt="${esc(piece.part)}" style="transform: rotate(${piece.rot}deg)">`;
    const head = dialog.querySelector('.head');
    head.dataset.part = piece.part;
    head.innerHTML = `<h1>${esc(title(piece))}</h1>`;
  }

  function renderLook(day) {
    const sameDay = day ? PIECES.filter(p => p.day === day) : [];
    if (sameDay.length < 2) return;
    dialog.querySelector('.info').insertAdjacentHTML('beforeend', `
      <section class="outfit">
        <h2>${esc(lookLabel(day))}</h2>
        <div class="stage"></div>
      </section>`);
    const look = Object.fromEntries(sameDay.map(p => [p.part, p]));
    const board = Stage.create(dialog.querySelector('.stage'), {
      ...arrangements.get(day),
      onChange: () => arrangements.set(day, { offsets: board.offsets, order: board.order }),
      onTap: part => showPiece(look[part]),
    });
    board.render(look);
  }

  function open(id) {
    const piece = PIECES.find(p => p.id === id);
    if (!piece) return;
    dialog.innerHTML = `
      <button class="close" type="button" aria-label="닫기">CLOSE</button>
      <div class="body">
        <div class="photo"></div>
        <div class="info"><div class="head"></div></div>
      </div>`;
    showPiece(piece);
    renderLook(piece.day);
    dialog.showModal();
    dialog.scrollTop = 0;
  }

  document.addEventListener('click', e => {
    const el = e.target.closest('.piece');
    if (el) {
      e.preventDefault();
      open(el.dataset.id);
      return;
    }
    if (e.target.closest('.detail .close') || e.target === dialog) dialog.close(); // 바깥(배경) 클릭 시 닫힘
  });
})();
