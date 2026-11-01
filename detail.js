// 바닥의 옷을 누르면 위에 뜨는 상세 창 (홈·SHOP 공용)
(() => {
  const PART_EN = { 모자: 'HAT', 상의: 'TOP', 하의: 'BOTTOM', 신발: 'SHOES', 아이템: 'ITEM' };
  const PART_KEY = { 모자: 'hat', 상의: 'top', 하의: 'bottom', 신발: 'shoes', 아이템: 'item' };
  const PART_ORDER = ['모자', '상의', '하의', '신발', '아이템'];
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const title = p => p.person ? `${p.person}의 ${p.part}` : p.part;

  const dialog = document.createElement('dialog');
  dialog.className = 'detail';
  dialog.setAttribute('aria-label', '상품 상세');
  document.body.append(dialog);

  function render(piece) {
    // 같은 날 올라온 나머지 → 그날의 한 벌
    const sameDay = piece.day
      ? PIECES.filter(p => p.day === piece.day)
          .sort((a, b) => PART_ORDER.indexOf(a.part) - PART_ORDER.indexOf(b.part))
      : [];
    const outfit = sameDay.length > 1 ? `
      <section class="outfit">
        <h2>${esc(piece.day)}의 한 벌</h2>
        <ul>${sameDay.map(p => `
          <li><button type="button" data-id="${esc(p.id)}" ${p === piece ? 'aria-current="true"' : ''}>
            <img src="${esc(p.src)}" alt="" style="transform: rotate(${p.rot}deg)">
            <span>${PART_EN[p.part]} · ${esc(p.person)}</span>
          </button></li>`).join('')}
        </ul>
      </section>` : '';
    dialog.innerHTML = `
      <button class="close" type="button" aria-label="닫기">CLOSE</button>
      <div class="body">
        <div class="photo"><img src="${esc(piece.src)}" alt="${esc(piece.part)}" style="transform: rotate(${piece.rot}deg)"></div>
        <div class="info">
          <h1>${esc(title(piece))}</h1>
          <dl><dt>부위</dt><dd>${PART_EN[piece.part]}</dd></dl>
          <a class="add" href="game.html?${PART_KEY[piece.part]}=${encodeURIComponent(piece.id)}">이 옷으로 룩북 짜기</a>
        </div>
      </div>${outfit}`;
  }

  function open(id) {
    const piece = PIECES.find(p => p.id === id);
    if (!piece) return;
    render(piece);
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
  }

  document.addEventListener('click', e => {
    const el = e.target.closest('.piece, .outfit button');
    if (el && (el.dataset.id)) {
      e.preventDefault();
      open(el.dataset.id);
      return;
    }
    if (e.target.closest('.close') || e.target === dialog) dialog.close(); // 바깥(배경) 클릭 시 닫힘
  });
})();
