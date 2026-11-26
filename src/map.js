// Карта 🗺️: вид сверху на базу, лес или Дорожку — места, жители и стрелка «Ты».
// Север (куда смотрят порталы базы) — вверху. Дорожка длинная — её рисуем лёжа: от дома слева к логову дракона справа.
import { B } from './balance.js';
import { mapData } from './locations.js';
import { FRIENDS } from './friends.js';
import { stageZ } from './track.js';
import { vasyaPos } from './vasya.js';

const FACE = { pushinka: '🐿️', timosha: '🎃', ryaba: '🐔', galya: '👩‍🍳', gena: '🧔', misha: '🧢', vanya: '👦', sonya: '👧', kolya: '⚽', olya: '⚽', masha: '🎨', alisa: '🦆', timur: '🎳', petya: '🏃', vasya: '🐱', borya: '🦫', yosha: '🦔', uhu: '🦉', lisa: '🦊', tyoma: '🐻' };
const BEAST = { capy: '🐹', goose: '🪿', boar: '🐗', deer: '🦌', brownbear: '🐻', lizard: '🦎', dragon: '🐉', peng: '🐧', dino: '🦖', bear: '🐻‍❄️', icedragon: '🐉', golddragon: '🐲', gorilla: '🦍' };
const TABS = [['cove', '⚓ Бухта'], ['base', '🏠 База'], ['dino', '🦖 Долина'], ['forest', '🌲 Лес'], ['autumn', '🍂 Осень'], ['track', '🏁 Дорожка']];
const locOf = id => id === 'cove' || id === 'dino' ? 'base' : id;     // бухта и Долина — части базы
const $ = id => document.getElementById(id);

// st: { loc, hero: { x, z, face }, save }
export function openMap(st) {
  const tabs = $('mapTabs');
  tabs.innerHTML = TABS.map(([id, t]) => `<button data-loc="${id}">${t}</button>`).join('');
  const show = id => { tabs.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.loc === id)); draw(id, st); };
  tabs.querySelectorAll('button').forEach(b => b.onclick = () => show(b.dataset.loc));
  $('map').classList.add('on');
  const start = st.loc === 'base' && st.hero ? (st.hero.x < -66 ? 'cove' : st.hero.x > 66 ? 'dino' : 'base') : st.loc;   // открываем там, где ты
  show(TABS.some(([id]) => id === start) ? start : 'base');
}

function draw(id, st) {
  const M = mapData(id), L = locOf(id), cv = $('mapC'), box = cv.parentElement.getBoundingClientRect();
  // широкую карту (база) на вертикальном экране поворачиваем боком — так она крупнее
  const land = innerWidth > innerHeight, { x0, x1, z0, z1 } = M.bounds;
  const rot = M.rotate === 'landscape' ? land : (innerHeight > innerWidth && (x1 - x0) / (z1 - z0) > 1.3);
  const ww = rot ? z1 - z0 : x1 - x0, hh = rot ? x1 - x0 : z1 - z0;                // размер в метрах на экране
  const pad = M.rotate && rot ? 70 : 0;                                                     // у Дорожки — место для подписей над и под трассой
  const W = Math.max(200, box.width - 8), H = Math.min(window.innerHeight * 0.62, window.innerHeight - 170 - pad, W * hh / ww) + pad;   // помещается под заголовком и вкладками
  const k = Math.min(W / ww, (H - pad) / hh), ox = (W - ww * k) / 2, oy = (H - hh * k) / 2;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
  const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
  // мир → экран: север вверху; у Дорожки — дом слева, логово справа
  const P = (x, z) => rot ? [ox + (z1 - z) * k, oy + (x - x0) * k] : [ox + (x - x0) * k, oy + (z - z0) * k];
  // земля и подложки
  c.fillStyle = M.ground; c.beginPath(); c.roundRect ? c.roundRect(ox, oy, ww * k, hh * k, 14) : c.rect(ox, oy, ww * k, hh * k); c.fill();
  c.save(); c.clip();                                                          // вид на часть базы — рисуем только внутри рамки
  for (const a of M.areas) {
    c.fillStyle = a.fill; c.beginPath();
    if (a.rect) { const [ax0, ax1, az0, az1] = a.rect, p = P(ax0, az0), q = P(ax1, az1); c.rect(Math.min(p[0], q[0]), Math.min(p[1], q[1]), Math.abs(q[0] - p[0]), Math.abs(q[1] - p[1])); }
    else { const [cx, cz, r] = a.circle, p = P(cx, cz); c.arc(p[0], p[1], r * k, 0, 7); }
    c.fill();
  }
  if (M.river) {                                                              // река в лесу
    c.strokeStyle = '#4aa8f0'; c.lineWidth = Math.max(4, 9 * k); c.lineCap = 'round'; c.beginPath();
    for (let z = z0; z <= z1; z += 4) { const p = P(M.river(z), z); z === z0 ? c.moveTo(...p) : c.lineTo(...p); }
    c.stroke();
  }
  const fs = Math.round(Math.max(15, Math.min(24, W / 22)));
  const label = (txt, x, y, color = '#fff', size = 11, align = 'center') => { c.font = `bold ${size}px "Arial Rounded MT Bold","Trebuchet MS",sans-serif`; c.textAlign = align; c.lineWidth = 3; c.strokeStyle = 'rgba(30,25,50,.85)'; c.strokeText(txt, x, y); c.fillStyle = color; c.fillText(txt, x, y); };
  const icon = (e, x, y, size = fs) => { c.font = `${size}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(e, x, y); c.textBaseline = 'alphabetic'; };
  // места
  for (const [e, name, x, z] of M.marks) { if (x < x0 || x > x1 || z < z0 || z > z1) continue; const [px, py] = P(x, z); icon(e, px, py); label(name, px, py + fs * 0.95, '#fff', 10); }
  // Дорожка: звери по порядку, побеждённые — с галочкой
  if (id === 'track') {
    const T = st.save.track || {}, stage = T.stage || 0, round = T.round || 1;
    B.trackStages(round).forEach((S, i) => {
      const [px, py] = P(0, stageZ(i)), done = i < stage;
      c.globalAlpha = done ? 0.45 : 1; icon(BEAST[S.kind] || '🐾', px, py, S.boss ? fs * 1.5 : fs); c.globalAlpha = 1;
      if (done) icon('✅', px + fs * 0.5, py - fs * 0.5, fs * 0.6);
      if (rot) label(S.name, px, py - fs * 0.9, i === stage ? '#ffe14d' : '#fff', 10);
      else label(S.name, px + fs * 0.8, py + 4, i === stage ? '#ffe14d' : '#fff', 11, 'left');   // стоя — имя справа
    });
  }
  // жители
  for (const f of FRIENDS) {
    if (f.loc !== L) continue;
    let pos = f.x !== undefined ? { x: f.x, z: f.z } : null;
    if (f.id === 'vasya') pos = (st.loc === 'base' && vasyaPos()) || { x: 0, z: 22 };
    if (f.id === 'borya') pos = { x: 24, z: 62 };
    if (!pos) continue;
    const [px, py] = P(pos.x, pos.z), met = !!(st.save.friends || {})[f.id];
    c.fillStyle = '#fff'; c.strokeStyle = '#ff8ab3'; c.lineWidth = 2.5; c.beginPath(); c.arc(px, py, fs * 0.72, 0, 7); c.fill(); c.stroke();
    icon(FACE[f.id] || '🙂', px, py, fs * 0.95);
    label(met ? f.name : f.name + ' ❔', px, py - fs * 0.95, '#ffd0e4', 9);
  }
  // сундучок с нарядом 🎁 — если он сейчас лежит
  const rb = (st.save.rareBox || {})[L];
  if (rb && rb.x !== undefined && Date.now() >= rb.at) { const [px, py] = P(rb.x, rb.z); icon('🎁', px, py, fs * 1.1); label('Сундучок', px, py + fs * 0.95, '#ffe14d', 10); }
  // второй игрок (игра вдвоём)
  if (st.duo && st.duo.loc === L) {
    const [px, py] = P(st.duo.x, st.duo.z);
    c.fillStyle = '#fff'; c.strokeStyle = '#3fbf5f'; c.lineWidth = 3; c.beginPath(); c.arc(px, py, fs * 0.8, 0, 7); c.fill(); c.stroke();
    icon(st.duo.who === 'mama' ? '👩' : '👦', px, py, fs); label(st.duo.name, px, py - fs * 1.05, '#9dffb0', 11);
  }
  // ты: красная стрелка — куда смотришь
  if (st.loc === L && st.hero) {
    const [px, py] = P(st.hero.x, st.hero.z), dx = Math.sin(st.hero.face), dz = Math.cos(st.hero.face);
    const [vx, vy] = rot ? [-dz, dx] : [dx, dz], a = Math.atan2(vy, vx), r = fs * 0.8;
    c.save(); c.translate(px, py); c.rotate(a);
    c.fillStyle = '#ff3b3b'; c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.moveTo(r, 0); c.lineTo(-r * 0.7, -r * 0.65); c.lineTo(-r * 0.35, 0); c.lineTo(-r * 0.7, r * 0.65); c.closePath(); c.stroke(); c.fill();
    c.restore(); label('Ты', px, py - r - 4, '#ff6a6a', 12);
  }
  c.restore();
  $('mapHint').textContent = id === 'cove' ? (rot ? 'вверху — море и острова, внизу — база' : 'слева — море и острова, справа — база') : id === 'dino' ? (rot ? 'вверху — база, внизу — Долина динозавров' : 'слева — база, справа — Долина динозавров') : id === 'track' ? `Круг ${(st.save.track || {}).round || 1} · ` + (rot ? 'дом слева → логово дракона справа' : 'дом внизу → логово дракона вверху') + ' · жёлтым — кто следующий' : id === 'base' ? (rot ? 'справа — порталы в Лес, Пустыню и Лёд' : 'вверху — порталы в Лес, Пустыню и Лёд') : 'вход из базы — внизу (🌀)';
}
