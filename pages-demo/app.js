const views = [...document.querySelectorAll('.view')];
const navButtons = [...document.querySelectorAll('[data-tab]')];
function showTab(id) {
  views.forEach(view => view.classList.toggle('active', view.id === id));
  document.querySelectorAll('nav [data-tab]').forEach(button => button.classList.toggle('active', button.dataset.tab === id));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
navButtons.forEach(button => button.addEventListener('click', () => showTab(button.dataset.tab)));

const modal = document.querySelector('#modal');
const modalTitle = document.querySelector('#modal-title');
const modalBody = document.querySelector('#modal-body');
const modalIcon = document.querySelector('#modal-icon');
const content = {
  capture: ['📷', '撮影・AI判定', '公開デモではカメラ、Gemini AI判定、Google Drive保存を停止しています。ログイン済みのサーバー版では、撮影から図鑑登録まで利用できます。'],
  profile: ['み', 'みどりさん', '<div class="profile"><b>公開デモユーザー</b><br><small>データは保存されません</small></div>プロフィールとGoogleログイン・ログアウトはサーバー版で利用できます。'],
  uploads: ['☁', 'アップロード待ち', '待機中の画像はありません。サーバー版では通信失敗時の画像を端末内に一時保存し、ここからまとめて再送できます。'],
  privacy: ['♢', '位置情報・データ管理', '位置情報は撮影時に明示的に許可した場合だけ取得し、AI判定には送信しません。端末内の編集中画像や待機画像も個別に削除できます。'],
  display: ['◐', '表示設定', 'ライト・ダーク・端末設定に合わせる、の3種類をサーバー版で選択できます。公開デモは端末設定に合わせます。'],
};
document.querySelectorAll('[data-open]').forEach(button => button.addEventListener('click', () => {
  const [icon, title, body] = content[button.dataset.open];
  modalIcon.textContent = icon; modalTitle.textContent = title; modalBody.innerHTML = body; modal.hidden = false;
}));
document.querySelectorAll('.close,.close-action').forEach(button => button.addEventListener('click', () => { modal.hidden = true; }));
modal.addEventListener('click', event => { if (event.target === modal) modal.hidden = true; });
document.addEventListener('keydown', event => { if (event.key === 'Escape') modal.hidden = true; });
document.querySelectorAll('[data-record]').forEach(button => button.addEventListener('click', () => {
  modalIcon.textContent = '✦'; modalTitle.textContent = button.dataset.record; modalBody.innerHTML = 'AI判定の根拠、生息環境、撮影日時、場所、メモをまとめて確認できる図鑑詳細画面です。<br><small>この表示はサンプルデータです。</small>'; modal.hidden = false;
}));
document.querySelector('#search').addEventListener('input', event => {
  const query = event.target.value.trim().toLowerCase();
  document.querySelectorAll('#record-grid [data-name]').forEach(tile => { tile.hidden = !tile.dataset.name.toLowerCase().includes(query); });
});
