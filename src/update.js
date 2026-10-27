// Новая версия игры: скачивается в фоне (sw.js), а здесь — плашка на стартовом экране с прогрессом
// и кнопкой «Обновить». Играть можно сразу в текущей версии; новая включится сама при следующем запуске.
import { VERSION } from './version.js';
import { notify, toast } from './ui.js';

const box = document.getElementById('upd');
const num = v => (String(v).match(/\d+/) || [''])[0];                // «сборка 19 · …» → «19»
let said = false;

function show(html, cls) { box.className = cls || ''; box.innerHTML = html; box.style.display = html ? 'flex' : 'none'; }
const onMenu = () => document.getElementById('profiles').classList.contains('on');

function onMessage(e) {
  const d = e.data || {};
  if (d.version === VERSION && d.type !== 'applied') return show('');   // та же версия, что запущена (просто докачивается полный комплект) — нечего показывать
  if (d.type === 'progress') {
    const p = Math.round(d.done / d.total * 100);
    show(`<b>✨ Загружается новая версия (сборка ${num(d.version)}) · ${d.done} из ${d.total}</b>
      <div class="bar"><i style="width:${p}%"></i></div>
      <small>можно играть прямо сейчас в этой — новая включится сама при следующем запуске</small>`);
  } else if (d.type === 'ready') {
    show(`<b>✨ Новая версия готова (сборка ${num(d.version)})</b>
      <button id="updGo">Обновить сейчас</button>
      <small>или играй в этой — обновится при следующем запуске</small>`, 'ready');
    document.getElementById('updGo').onclick = () => { box.innerHTML = '<b>Обновляем…</b>'; navigator.serviceWorker.controller?.postMessage({ type: 'apply' }); };
    if (!onMenu() && !said) { said = true; toast('✨ Новая версия игры готова<small>включится при следующем запуске</small>'); notify({ icon: '✨', title: 'Новая версия готова', text: 'закрой и открой игру — она обновится' }); }
  } else if (d.type === 'applied') {
    if (d.ok) location.reload();
  } else if (d.type === 'failed') {
    show(`<b>Новая версия не докачалась — плохая связь</b><small>играем в этой, попробуем в следующий раз</small>`, 'muted');
  } else if (d.type === 'offline') {
    show(`<small>нет связи — играем в сохранённой версии</small>`, 'muted');
  } else if (d.type === 'latest') show('');
}

if ('serviceWorker' in navigator && box) {
  navigator.serviceWorker.addEventListener('message', onMessage);
  // спрашиваем скрипт хранения, нет ли новой версии (через пару секунд — пусть сначала загрузится игра)
  setTimeout(() => navigator.serviceWorker.ready.then(r => r.active && r.active.postMessage({ type: 'check', version: VERSION })), 2500);
}
