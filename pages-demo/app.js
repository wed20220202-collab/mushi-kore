"use strict";

const DB_NAME = "mushi-kore-static";
const DB_VERSION = 1;
const RECORD_STORE = "records";
const SETTINGS_KEY = "mushi-kore-static-settings";
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ESTIMATED_STORAGE_LIMIT = 50 * 1024 * 1024;

const defaultSettings = { displayName: "みどり", theme: "system", locationEnabled: true };
const state = {
  records: [],
  filter: "all",
  query: "",
  selectedId: null,
  previewUrl: "",
  settings: loadSettings(),
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(RECORD_STORE)) {
        request.result.createObjectStore(RECORD_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore(mode, action) {
  const database = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(RECORD_STORE, mode);
      const request = action(transaction.objectStore(RECORD_STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    database.close();
  }
}

const getAllRecords = () => withStore("readonly", (store) => store.getAll());
const putRecord = (record) => withStore("readwrite", (store) => store.put(record));
const removeRecord = (id) => withStore("readwrite", (store) => store.delete(id));
const clearRecords = () => withStore("readwrite", (store) => store.clear());

function loadSettings() {
  try {
    return { ...defaultSettings, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") };
  } catch {
    return { ...defaultSettings };
  }
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
  applySettings();
}

function applySettings() {
  document.documentElement.dataset.theme = state.settings.theme;
  $("#display-name").value = state.settings.displayName;
  $("#greeting-name").textContent = state.settings.displayName || "みどり";
  $("#header-avatar").textContent = (state.settings.displayName || "み").trim().charAt(0);
  const locationSwitch = $("#location-switch");
  locationSwitch.classList.toggle("on", state.settings.locationEnabled);
  locationSwitch.setAttribute("aria-checked", String(state.settings.locationEnabled));
  $$("[data-theme-choice]").forEach((button) => button.classList.toggle("active", button.dataset.themeChoice === state.settings.theme));
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  })[character]);
}

function imageSource(record) {
  if (record.image instanceof Blob) return URL.createObjectURL(record.image);
  return record.imageUrl || "";
}

function revokeRenderedUrls() {
  $$("#recent-records [data-object-url], #record-grid [data-object-url]").forEach((image) => {
    URL.revokeObjectURL(image.dataset.objectUrl);
    image.removeAttribute("data-object-url");
  });
}

function recordCard(record) {
  const source = imageSource(record);
  const objectAttribute = record.image instanceof Blob ? `data-object-url="${escapeHtml(source)}"` : "";
  const location = record.locationName || "場所なし";
  const date = new Date(record.capturedAt).toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
  return `<button class="record-card" data-record-id="${escapeHtml(record.id)}">
    <div class="record-photo">${source ? `<img src="${escapeHtml(source)}" ${objectAttribute} alt="${escapeHtml(record.commonName)}">` : ""}<b>${record.favorite ? "♥ " : ""}端末内</b></div>
    <h3>${escapeHtml(record.commonName)}</h3><i>${escapeHtml(record.scientificName || record.englishName || "")}</i>
    <p>⌖ ${escapeHtml(location)}　·　${escapeHtml(date)}</p>
  </button>`;
}

function filteredRecords() {
  const query = state.query.trim().toLowerCase();
  return state.records.filter((record) => {
    if (state.filter === "favorite" && !record.favorite) return false;
    if (state.filter === "with-location" && !record.locationName) return false;
    if (!query) return true;
    return [record.commonName, record.englishName, record.scientificName, record.locationName, record.memo, ...(record.tags || [])]
      .join(" ").toLowerCase().includes(query);
  });
}

function render() {
  revokeRenderedUrls();
  const ordered = [...state.records].sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
  const species = new Set(ordered.map((record) => record.commonName.trim()).filter(Boolean));
  $("#species-count").textContent = String(species.size);
  $("#record-count").textContent = String(ordered.length);

  const recent = ordered.slice(0, 4);
  $("#recent-records").innerHTML = recent.map(recordCard).join("");
  $("#recent-records").hidden = recent.length === 0;
  $("#home-empty").hidden = recent.length !== 0;

  const visible = filteredRecords();
  $("#record-grid").innerHTML = visible.map(recordCard).join("");
  $("#result-count").textContent = `${visible.length}件の記録`;
  $("#collection-empty").hidden = visible.length !== 0;
  updateStorage(ordered);
}

function updateStorage(records) {
  const bytes = records.reduce((total, record) => total + (record.image?.size || 0), 0);
  $("#storage-summary").textContent = `${formatBytes(bytes)} · ${records.length}件`;
  $("#storage-progress").style.width = `${Math.min(100, (bytes / ESTIMATED_STORAGE_LIMIT) * 100)}%`;
}

function showTab(id) {
  $$(".view").forEach((view) => view.classList.toggle("active", view.id === id));
  $$(".bottom-nav [data-tab]").forEach((button) => button.classList.toggle("active", button.dataset.tab === id));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openCapture() {
  $("#capture-sheet").hidden = false;
  document.body.style.overflow = "hidden";
  $("#common-name").focus();
}

function closeCapture() {
  $("#capture-sheet").hidden = true;
  document.body.style.overflow = "";
}

function clearPreview() {
  if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
  state.previewUrl = "";
  $("#photo-preview").src = "";
  $("#photo-preview").hidden = true;
  $("#photo-placeholder").hidden = false;
  $("#image-info").hidden = true;
}

function resetCaptureForm() {
  $("#capture-form").reset();
  $("#latitude").value = "";
  $("#longitude").value = "";
  $("#capture-error").textContent = "";
  clearPreview();
}

async function handlePhoto(file) {
  $("#capture-error").textContent = "";
  if (!file) return clearPreview();
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    $("#capture-error").textContent = "JPEG・PNG・WebP画像を選んでください。";
    $("#photo-input").value = "";
    return clearPreview();
  }
  if (file.size > MAX_IMAGE_BYTES) {
    $("#capture-error").textContent = "画像は10MB以下にしてください。";
    $("#photo-input").value = "";
    return clearPreview();
  }
  clearPreview();
  state.previewUrl = URL.createObjectURL(file);
  $("#photo-preview").src = state.previewUrl;
  $("#photo-preview").hidden = false;
  $("#photo-placeholder").hidden = true;
  $("#image-info").hidden = false;
  $("#image-info").textContent = `${file.name} · ${formatBytes(file.size)} · この端末だけに保存`;
}

function applySpeciesPreset(value) {
  if (!value) return;
  const [commonName, englishName, scientificName] = value.split("|");
  $("#common-name").value = commonName;
  $("#english-name").value = englishName;
  $("#scientific-name").value = scientificName;
}

function requestLocation() {
  if (!state.settings.locationEnabled) {
    toast("設定で位置情報がオフになっています");
    return;
  }
  if (!navigator.geolocation) {
    toast("このブラウザは位置情報に対応していません");
    return;
  }
  const button = $("#location-button");
  button.disabled = true;
  button.textContent = "取得中";
  navigator.geolocation.getCurrentPosition((position) => {
    $("#latitude").value = String(position.coords.latitude);
    $("#longitude").value = String(position.coords.longitude);
    if (!$("#location-name").value) $("#location-name").value = "現在地";
    button.textContent = "取得済み";
    button.disabled = false;
    toast("現在地を記録しました");
  }, () => {
    button.textContent = "現在地";
    button.disabled = false;
    toast("位置情報を取得できませんでした");
  }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
}

async function submitRecord(event) {
  event.preventDefault();
  const file = $("#photo-input").files[0];
  const commonName = $("#common-name").value.trim();
  if (!file || !commonName) {
    $("#capture-error").textContent = "写真と和名を入力してください。";
    return;
  }
  const record = {
    id: crypto.randomUUID(),
    commonName,
    englishName: $("#english-name").value.trim(),
    scientificName: $("#scientific-name").value.trim(),
    locationName: $("#location-name").value.trim(),
    latitude: Number($("#latitude").value) || null,
    longitude: Number($("#longitude").value) || null,
    memo: $("#memo").value.trim(),
    tags: $("#tags").value.split(/[、,\s]+/).map((tag) => tag.trim()).filter(Boolean).slice(0, 12),
    capturedAt: new Date().toISOString(),
    favorite: false,
    image: file,
  };
  try {
    await putRecord(record);
    state.records.push(record);
    resetCaptureForm();
    closeCapture();
    render();
    showTab("home");
    toast("図鑑へ登録しました");
  } catch {
    $("#capture-error").textContent = "端末への保存に失敗しました。空き容量を確認してください。";
  }
}

function openDetail(id) {
  const record = state.records.find((item) => item.id === id);
  if (!record) return;
  state.selectedId = id;
  const source = imageSource(record);
  $("#detail-image").src = source;
  $("#detail-image").dataset.objectUrl = record.image instanceof Blob ? source : "";
  $("#detail-image").alt = record.commonName;
  $("#detail-name").textContent = record.commonName;
  $("#detail-scientific").textContent = record.scientificName || record.englishName || "学名未登録";
  $("#detail-tags").innerHTML = (record.tags || []).map((tag) => `<span>#${escapeHtml(tag)}</span>`).join("");
  $("#detail-date").textContent = new Date(record.capturedAt).toLocaleString("ja-JP");
  $("#detail-location").textContent = record.locationName || "位置情報なし";
  $("#detail-memo").textContent = record.memo || "メモはありません。";
  $("#favorite-button").textContent = record.favorite ? "♥ お気に入り済み" : "♡ お気に入り";
  $("#detail-sheet").hidden = false;
  document.body.style.overflow = "hidden";
}

function closeDetail() {
  const image = $("#detail-image");
  if (image.dataset.objectUrl) URL.revokeObjectURL(image.dataset.objectUrl);
  image.removeAttribute("data-object-url");
  image.src = "";
  $("#detail-sheet").hidden = true;
  state.selectedId = null;
  document.body.style.overflow = "";
}

async function toggleFavorite() {
  const record = state.records.find((item) => item.id === state.selectedId);
  if (!record) return;
  record.favorite = !record.favorite;
  await putRecord(record);
  $("#favorite-button").textContent = record.favorite ? "♥ お気に入り済み" : "♡ お気に入り";
  render();
  toast(record.favorite ? "お気に入りに追加しました" : "お気に入りから外しました");
}

async function deleteSelected() {
  const record = state.records.find((item) => item.id === state.selectedId);
  if (!record || !confirm(`「${record.commonName}」の写真と記録を端末から削除しますか？`)) return;
  await removeRecord(record.id);
  state.records = state.records.filter((item) => item.id !== record.id);
  closeDetail();
  render();
  toast("記録を削除しました");
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function dataUrlToBlob(dataUrl) {
  const [header, encoded] = dataUrl.split(",");
  const mimeType = header.match(/data:(.*?);base64/)?.[1] || "image/jpeg";
  const bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
  return new Blob([bytes], { type: mimeType });
}

async function exportBackup() {
  const records = await Promise.all(state.records.map(async (record) => ({
    ...record,
    image: record.image instanceof Blob ? await blobToDataUrl(record.image) : null,
  })));
  const payload = { version: 1, exportedAt: new Date().toISOString(), settings: state.settings, records };
  const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `mushi-kore-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  toast(`${records.length}件を書き出しました`);
}

async function importBackup(file) {
  if (!file) return;
  try {
    const payload = JSON.parse(await file.text());
    if (payload?.version !== 1 || !Array.isArray(payload.records)) throw new Error("invalid");
    if (payload.records.length > 1000) throw new Error("too_many");
    for (const raw of payload.records) {
      if (!raw.id || !raw.commonName || !raw.capturedAt) continue;
      const record = {
        ...raw,
        favorite: raw.favorite === true,
        tags: Array.isArray(raw.tags) ? raw.tags.slice(0, 12) : [],
        image: typeof raw.image === "string" && raw.image.startsWith("data:image/") ? dataUrlToBlob(raw.image) : null,
      };
      await putRecord(record);
    }
    if (payload.settings && typeof payload.settings === "object") {
      state.settings = { ...defaultSettings, ...payload.settings };
      saveSettings();
    }
    state.records = await getAllRecords();
    render();
    toast("バックアップを読み込みました");
  } catch {
    toast("対応していないバックアップファイルです");
  } finally {
    $("#import-input").value = "";
  }
}

async function clearAllData() {
  if (!confirm("この端末に保存した写真・図鑑・設定をすべて削除します。バックアップがない場合は復元できません。")) return;
  if (!confirm("本当にすべて削除しますか？")) return;
  await clearRecords();
  state.records = [];
  state.settings = { ...defaultSettings };
  localStorage.removeItem(SETTINGS_KEY);
  applySettings();
  render();
  toast("端末内データを削除しました");
}

let toastTimer;
function toast(message) {
  const element = $("#toast");
  element.textContent = message;
  element.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.remove("show"), 2500);
}

function bindEvents() {
  $$("[data-tab]").forEach((button) => button.addEventListener("click", () => showTab(button.dataset.tab)));
  $$("[data-open-capture]").forEach((button) => button.addEventListener("click", openCapture));
  $$("[data-close-sheet]").forEach((button) => button.addEventListener("click", closeCapture));
  $$("[data-close-detail]").forEach((button) => button.addEventListener("click", closeDetail));
  $("#capture-sheet").addEventListener("click", (event) => { if (event.target === $("#capture-sheet")) closeCapture(); });
  $("#detail-sheet").addEventListener("click", (event) => { if (event.target === $("#detail-sheet")) closeDetail(); });
  $("#photo-input").addEventListener("change", (event) => handlePhoto(event.target.files[0]));
  $("#species-preset").addEventListener("change", (event) => applySpeciesPreset(event.target.value));
  $("#location-button").addEventListener("click", requestLocation);
  $("#capture-form").addEventListener("submit", submitRecord);
  $("#search-input").addEventListener("input", (event) => { state.query = event.target.value; render(); });
  $$(".filter").forEach((button) => button.addEventListener("click", () => {
    state.filter = button.dataset.filter;
    $$(".filter").forEach((item) => item.classList.toggle("active", item === button));
    render();
  }));
  document.addEventListener("click", (event) => {
    const card = event.target.closest("[data-record-id]");
    if (card) openDetail(card.dataset.recordId);
  });
  $("#favorite-button").addEventListener("click", toggleFavorite);
  $("#delete-button").addEventListener("click", deleteSelected);
  $("#display-name").addEventListener("change", (event) => {
    state.settings.displayName = event.target.value.trim() || defaultSettings.displayName;
    saveSettings();
    toast("表示名を保存しました");
  });
  $("#location-switch").addEventListener("click", () => {
    state.settings.locationEnabled = !state.settings.locationEnabled;
    saveSettings();
  });
  $$("[data-theme-choice]").forEach((button) => button.addEventListener("click", () => {
    state.settings.theme = button.dataset.themeChoice;
    saveSettings();
  }));
  $("#export-button").addEventListener("click", exportBackup);
  $("#import-input").addEventListener("change", (event) => importBackup(event.target.files[0]));
  $("#clear-button").addEventListener("click", clearAllData);
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (!$("#detail-sheet").hidden) closeDetail();
    else if (!$("#capture-sheet").hidden) closeCapture();
  });
}

async function start() {
  applySettings();
  bindEvents();
  try {
    state.records = await getAllRecords();
    render();
  } catch {
    toast("端末内データベースを利用できません");
  }
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("./sw.js").catch(() => undefined);
  }
}

start();
