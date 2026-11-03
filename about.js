// ABOUT: 바닥 위에 뜨는 작은 소개 창 (홈·GAME 공용)
(() => {
  const dialog = document.createElement('dialog');
  dialog.className = 'about';
  dialog.setAttribute('aria-label', '소개');
  dialog.innerHTML = `
    <button class="close" type="button" aria-label="닫기">CLOSE</button>
    <p>30일 동안 승현, 서빈, 물결, 하린, 하연 다섯 명이<br>
    매일 <a href="https://y0useunghyun.github.io/daily-outfit/" target="_blank" rel="noopener">아웃핏 배정 사이트</a>에서 모자·상의·하의·신발·아이템 중 한 부위를 랜덤으로 배정받아 기록했습니다.<br>
    그렇게 모인 150개의 조각을 펼쳐 놓은 사이트입니다.</p>
    <p class="credit"><a href="credits.html">샘플 이미지 출처</a></p>`;
  document.body.append(dialog);

  document.querySelectorAll('a[data-about]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    dialog.showModal();
  }));
  dialog.addEventListener('click', e => {
    if (e.target === dialog || e.target.closest('.close')) dialog.close(); // 바깥·CLOSE 클릭 시 닫힘
  });
})();
