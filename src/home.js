// Свой дом 🏠: домик на базе (с дверью) и комната внутри — отдельная локация.
// На базе (северо-западный угол, у завала перед Осенью) рядом с домиком — ларёк «Одежда» 👕 (встал на розовый коврик — открылся магазин).
// В комнате: шкаф (встал на коврик перед ним — переодеваешься), зеркало, в котором видно себя, мебель, питомцы и кубки (furniture.js).
// У входной двери — доска «Улучшения дома»: там покупается второй этаж. Купил — в комнате появляется лестница наверх,
// а домик на базе становится двухэтажным.
import { T, scene, group, box, mat, renderer } from './engine.js';
import { C, solid, door, onLevelReset } from './world.js';
import { makeLabel, puff } from './fx.js';
import { hatOn } from './clothes.js';
import { buildRoom, updateRoom, homeOf, panel } from './furniture.js';

export const HOUSE = { x: -37, z: 58.5, w: 9, d: 7, door: { x: -37, z: 54.4 } };   // домик на базе — в северо-западном углу у завала; дверь смотрит на юг
export const HOUSE2 = { x: 38, z: 58.5, w: 9, d: 7, door: { x: 38, z: 54.4 } };     // второй домик — в северо-восточном углу; стоит, только пока играют вдвоём
export const CLOTHES_SHOP = { x: -26.5, z: 60, pad: { x: -26.5, z: 57.2 } };          // ларёк одежды — рядом с домиком
const ROOM = { w: 24, d: 18, h: 5 };                                                  // комната: от −12 до 12 по x, от −9 до 9 по z
const WARD = { x: -6, z: -8.2, pad: { x: -6, z: -5.8 } }, MIRROR = { x: -1.6, z: -8.9, w: 2.4, h: 3.4 };
const nameOf = profile => profile === 'mama' ? 'Дом мамы' : 'Дом Моти';
const near = (p, o, rx, rz = rx) => Math.abs(p.x - o.x) < rx && Math.abs(p.z - o.z) < rz;

let st = null;
onLevelReset(() => { st = null; });

// окошко со светом: рама, перекрестье, тёплое стекло
function windowBox(p, x, y, z, w, h, rotY = 0) {
  const g = group(p, x, y, z); g.rotation.y = rotY;
  box(g, w + 0.3, h + 0.3, 0.12, 0xffffff, 0, 0, 0); box(g, w, h, 0.14, 0xfff0a0, 0, 0, 0.01).material = mat(0xfff0a0, { emissive: 0x7a5a00 });
  box(g, 0.1, h, 0.18, 0xffffff, 0, 0, 0.02); box(g, w, 0.1, 0.18, 0xffffff, 0, 0, 0.02);
  return g;
}

// ---------- на базе: домик и ларёк одежды ----------
export const FLOOR2_PRICE = 5000;
const STAIRS = { x: -3, z0: 3.6, n: 7 };                                               // лестница на второй этаж: у южной стены, левее двери
const UPGRADE = { x: 3.6, z: 7.4 };                                                    // доска «Улучшения дома» — правее двери

// owner — чей дом; H — где стоит (вдвоём у Моти — второй участок); shop — строить ли рядом ларёк одежды
export function buildHouse(w, owner, save, H = HOUSE, shop = true) {
  if (!st?.chimneys) st = { smokeT: 0, chimneys: [] };
  const x0 = H.x, z0 = H.z, front = z0 - H.d / 2;
  solid(w, H.w + 0.6, 0.4, H.d + 0.6, 0x9aa4ad, x0, 0, z0);                              // фундамент
  const two = !!save?.home?.floor2, up = two ? 3.6 : 0;                                 // второй этаж — дом выше на этаж
  solid(w, H.w, 4 + up, H.d, 0xfff0d0, x0, 0.4, z0);                                      // стены (дом внутри — отдельная комната)
  if (two) {
    box(w, H.w + 0.3, 0.3, H.d + 0.3, 0xe8c89a, x0, 4.4, z0);                              // пояс между этажами
    windowBox(w, x0 - 2.9, 6.2, front - 0.06, 1.5, 1.3, Math.PI); windowBox(w, x0, 6.2, front - 0.06, 1.5, 1.3, Math.PI); windowBox(w, x0 + 2.9, 6.2, front - 0.06, 1.5, 1.3, Math.PI);
    for (const sx of [-1, 1]) windowBox(w, x0 + sx * (H.w / 2 + 0.06), 6.2, z0, 1.6, 1.3, sx * Math.PI / 2);
    box(w, 3.4, 0.25, 1.2, 0xffffff, x0, 4.6, front - 0.6); for (let i = 0; i < 6; i++) box(w, 0.12, 0.8, 0.12, 0xffffff, x0 - 1.6 + i * 0.64, 5.1, front - 1.15);   // балкончик над дверью
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(w, 0.5, 4 + up, 0.5, 0xe8c89a, x0 + sx * H.w / 2, 2.4 + up / 2, z0 + sz * H.d / 2);   // углы
  // крыша: красные ступеньки к коньку, на ней труба
  for (let i = 0; i < 5; i++) box(w, H.w + 1.2, 0.62, H.d + 1.4 - i * 1.7, i % 2 ? 0xd8261a : 0xe8442a, x0, 4.7 + up + i * 0.6, z0, { studs: true });
  solid(w, 1, 2.6, 1, 0xb5523a, x0 + 2.6, 5.2 + up, z0 + 1.2); box(w, 1.2, 0.3, 1.2, 0x8a3a2a, x0 + 2.6, 7.9 + up, z0 + 1.2);
  st.chimneys.push(new T.Vector3(x0 + 2.6, 8.3 + up, z0 + 1.2));
  // дверь с рамкой и ручкой, ступенька, коврик
  box(w, 2.6, 3.4, 0.2, 0xffffff, x0, 2.1, front - 0.05); box(w, 2.1, 3.0, 0.24, 0x9a5a2a, x0, 1.95, front - 0.08);
  for (let i = 0; i < 3; i++) box(w, 1.7, 0.08, 0.26, 0x7a4220, x0, 0.9 + i * 0.9, front - 0.1, { shadow: false });
  box(w, 0.16, 0.16, 0.1, 0xffc21a, x0 + 0.7, 1.8, front - 0.22, { shadow: false });
  box(w, 3, 0.2, 1.2, 0x9aa4ad, x0, 0.1, front - 0.6); box(w, 2.2, 0.04, 1.2, 0xff7ac8, x0, 0.22, front - 1.8, { shadow: false });
  windowBox(w, x0 - 2.9, 2.6, front - 0.06, 1.5, 1.3, Math.PI); windowBox(w, x0 + 2.9, 2.6, front - 0.06, 1.5, 1.3, Math.PI);
  for (const sx of [-1, 1]) windowBox(w, x0 + sx * (H.w / 2 + 0.06), 2.6, z0, 1.6, 1.3, sx * Math.PI / 2);
  // клумбы у двери
  for (const sx of [-1, 1]) {
    box(w, 1.6, 0.4, 0.8, 0x8a5a2b, x0 + sx * 2.9, 0.2, front - 0.6);
    for (let i = 0; i < 3; i++) box(w, 0.3, 0.3, 0.3, [0xff5a8a, 0xffd23f, 0xff7ac8][i], x0 + sx * 2.9 - 0.5 + i * 0.5, 0.55, front - 0.6, { shadow: false });
  }
  const lab = makeLabel(6, 1.5); lab.position.set(x0, 9.4 + up, z0); scene.add(lab); lab.userData.set('🏠 ' + nameOf(owner), { color: '#ffe14d' });
  door({ x: x0, z: H.door.z, w: 2.4, to: 'home', label: '🏠 Дом', owner });
  if (!shop) return;

  // ларёк одежды: прилавок под полосатым навесом, на прилавке головы-манекены в шляпах, сзади — футболки на вешалке
  const S = CLOTHES_SHOP;
  solid(w, 5, 1.2, 1.4, 0xc98a45, S.x, 0, S.z);
  for (const sx of [-1, 1]) box(w, 0.25, 3.4, 0.25, 0xffffff, S.x + sx * 2.4, 1.7, S.z - 0.6);
  for (let i = 0; i < 6; i++) box(w, 0.9, 0.3, 2.6, i % 2 ? 0xffffff : 0xff7ac8, S.x - 2.25 + i * 0.9, 3.5, S.z, { studs: false });
  solid(w, 5, 3.2, 0.3, 0xffe0ef, S.x, 0, S.z + 1.4);
  [[0xe2442a, -1.5], [0x3f8fff, -0.5], [0xffd23f, 0.5], [0x4ad04a, 1.5]].forEach(([c, dx]) => { box(w, 0.7, 0.8, 0.1, c, S.x + dx, 2.3, S.z + 1.2); for (const sx of [-1, 1]) box(w, 0.22, 0.3, 0.1, c, S.x + dx + sx * 0.42, 2.55, S.z + 1.2); });
  box(w, 4, 0.08, 0.08, 0x8a8a8a, S.x, 2.85, S.z + 1.2);
  ['crown', 'cowboy', 'party'].forEach((id, i) => { const h = group(w, S.x - 1.5 + i * 1.5, 1.45, S.z); box(h, 0.7, 0.64, 0.66, 0xf2d2b8, 0, 0, 0); h.scale.setScalar(0.7); hatOn(h, id); });   // головы-манекены в шляпах
  box(w, 3, 0.12, 2.2, 0xff7ac8, S.pad.x, 0.06, S.pad.z, { shadow: false });
  const sl = makeLabel(5, 1.25); sl.position.set(S.x, 5, S.z); scene.add(sl); sl.userData.set('👕 Одежда', { color: '#ffffff' });
}
export const onClothesPad = p => near(p, CLOTHES_SHOP.pad, 1.5, 1.1) && p.y < 1;
// раз в кадр на базе: из трубы идёт дымок
export function updateHouse(dt) {
  if (!st?.chimneys) return;
  if ((st.smokeT -= dt) <= 0) { st.smokeT = 0.9; for (const c of st.chimneys) puff('☁️', c.clone(), { size: 1.2, rise: 1.4, life: 2.4, dx: 0.4 }); }
}

// ---------- комната ----------
export function buildHome(save, profile) {
  const w = group(scene), R = ROOM, hw = R.w / 2, hd = R.d / 2;
  st = { mirrorT: 0 };
  solid(w, R.w + 2, 1, R.d + 2, 0x5a8a3a, 0, -1.2, 0, { studs: false });                 // земля вокруг
  solid(w, R.w, 0.2, R.d, 0xc98a45, 0, -0.2, 0, { studs: false });                        // пол — доски
  for (let i = 0; i < 12; i++) box(w, 0.06, 0.02, R.d, 0xa86a35, -hw + 1 + i * 2, 0.005, 0, { shadow: false });
  // стены: обои, внизу плинтус; по стене — окна
  const WALL = 0xffe6c8, wall = (x, z, ww, dd) => { solid(w, ww, R.h, dd, WALL, x, 0, z, { studs: false, cam: true }); };
  wall(0, -hd - 0.2, R.w + 0.8, 0.4); wall(-hw - 0.2, 0, 0.4, R.d); wall(hw + 0.2, 0, 0.4, R.d);
  wall(-(hw + 1.4) / 2 - 0.35, hd + 0.2, hw - 1.4 + 0.8, 0.4); wall((hw + 1.4) / 2 + 0.35, hd + 0.2, hw - 1.4 + 0.8, 0.4);   // южная — с дверью посередине
  solid(w, 2.8, R.h - 3.4, 0.4, WALL, 0, 3.4, hd + 0.2, { studs: false });
  for (const [x, z, ww, dd] of [[0, -hd + 0.03, R.w, 0.06], [-hw + 0.03, 0, 0.06, R.d], [hw - 0.03, 0, 0.06, R.d]]) box(w, ww, 0.4, dd, 0xb5793e, x, 0.2, z, { shadow: false });
  windowBox(w, 6, 2.8, -hd + 0.02, 2.4, 1.8); windowBox(w, -hw + 0.02, 2.8, -2, 2.4, 1.8, Math.PI / 2); windowBox(w, hw - 0.02, 2.8, -2, 2.4, 1.8, -Math.PI / 2);
  // дверь на улицу
  box(w, 2.6, 3.4, 0.2, 0xffffff, 0, 1.7, hd + 0.02); box(w, 2.1, 3.1, 0.24, 0x9a5a2a, 0, 1.55, hd);
  const ex = makeLabel(4, 1); ex.position.set(0, 4.2, hd - 0.4); scene.add(ex); ex.userData.set('🚪 На улицу', { color: '#ffffff' });
  door({ x: 0, z: hd - 0.6, w: 2.4, to: 'base', label: '🏠 База' });
  // доска «Улучшения дома» правее двери, перед ней — зелёный коврик
  box(w, 2.2, 1.6, 0.15, 0x9a5a2a, UPGRADE.x, 2.6, hd - 0.1); box(w, 1.9, 1.3, 0.17, 0xfff3c8, UPGRADE.x, 2.6, hd - 0.1);
  box(w, 2.4, 0.05, 1.4, 0x5fd35f, UPGRADE.x, 0.03, UPGRADE.z - 0.6, { shadow: false });
  const ul = makeLabel(5, 1.25); ul.position.set(UPGRADE.x, 3.9, hd - 0.5); scene.add(ul); ul.userData.set('🔨 Улучшения дома', { color: '#ffffff' });
  if (homeOf(save).floor2) stairs(w);
  kitchenCorner(w, hd);
  // ковёр посередине, лампа, цветок, картина
  box(w, 7, 0.04, 5, 0x6fb8ff, 0, 0.02, 1.5, { shadow: false }); box(w, 6, 0.05, 4, 0xffd23f, 0, 0.03, 1.5, { shadow: false });
  box(w, 0.6, 0.1, 0.6, 0x555a6a, 9.5, 0.05, 6.5); box(w, 0.12, 3, 0.12, 0x555a6a, 9.5, 1.5, 6.5); box(w, 1, 0.7, 1, 0xfff0a0, 9.5, 3.2, 6.5).material = mat(0xfff0a0, { emissive: 0x806000 });
  box(w, 0.8, 0.7, 0.8, 0xc85a3a, -10, 0.35, 6.5); for (const [x, y, z] of [[0, 1.0, 0], [-0.3, 1.3, 0.1], [0.3, 1.25, -0.1], [0, 1.6, 0]]) box(w, 0.5, 0.5, 0.5, 0x4ad04a, -10 + x, y, 6.5 + z);
  box(w, 2.2, 1.6, 0.1, 0x8a5a2b, 3.2, 3.2, -hd + 0.06); box(w, 1.9, 1.3, 0.12, 0xbfe6ff, 3.2, 3.2, -hd + 0.07);
  for (const [x, y, c] of [[2.7, 2.9, 0x4ad04a], [3.5, 3.0, 0xffd23f], [3.0, 3.5, 0xff7ac8]]) box(w, 0.4, 0.5, 0.13, c, x, y, -hd + 0.08, { shadow: false });   // картинка: яйца на полянке
  // шкаф: дверцы, ручки, сверху — коробка; коврик перед ним
  const W = WARD;
  solid(w, 3.6, 4, 1.4, 0x9a5a2a, W.x, 0, W.z, { studs: false });
  for (const sx of [-1, 1]) { box(w, 1.65, 3.6, 0.08, 0xb5793e, W.x + sx * 0.88, 2.1, W.z + 0.72); box(w, 0.12, 0.5, 0.1, 0xffc21a, W.x + sx * 0.18, 2.1, W.z + 0.78, { shadow: false }); }
  box(w, 1.6, 0.6, 1, 0xffd23f, W.x + 0.6, 4.3, W.z);
  box(w, 3.2, 0.05, 2, 0x9b6bff, W.pad.x, 0.03, W.pad.z, { shadow: false });
  const wl = makeLabel(5, 1.25); wl.position.set(W.x, 5.6, W.z + 0.6); scene.add(wl); wl.userData.set('🚪 Шкаф — встань на коврик', { color: '#ffffff' });
  // зеркало: в нём видно тебя (отдельная камера рисует героя в текстуру)
  const M = MIRROR;
  box(w, M.w + 0.4, M.h + 0.4, 0.14, 0xffc21a, M.x, 2.2, M.z);
  const rt = new T.WebGLRenderTarget(256, 360); rt.texture.wrapS = T.RepeatWrapping; rt.texture.repeat.x = -1;   // отражение — зеркально
  const glass = new T.Mesh(new T.PlaneGeometry(M.w, M.h), new T.MeshBasicMaterial({ map: rt.texture })); glass.position.set(M.x, 2.2, M.z + 0.09); w.add(glass); glass.userData.dynamic = true;
  const cam = new T.PerspectiveCamera(48, M.w / M.h, 0.1, 60); cam.position.set(M.x, 2.2, M.z + 0.2);
  st.mirror = { rt, glass, cam };
  const ml = makeLabel(3, 0.75); ml.position.set(M.x, 4.3, M.z + 0.3); scene.add(ml); ml.userData.set('🪞 Зеркало', { color: '#ffffff' });
  // мамина пасхалка: подошла к зеркалу — над отражением «самая красивая ✨»
  const cl = makeLabel(3.2, 0.8); cl.position.set(M.x, 3.55, M.z + 0.35); scene.add(cl); cl.visible = false; cl.userData.set('самая красивая ✨', { color: '#ff8ab8' });
  st.compl = { cl, t: 0, sp: 0 };
  const hi = makeLabel(7, 1.75); hi.position.set(5, 4.7, -hd + 0.6); scene.add(hi); hi.userData.set('🏠 ' + nameOf(profile), { color: '#ffe14d' });
  buildRoom(w, save);
  return w;
}
export const onWardPad = p => near(p, WARD.pad, 1.6, 1);
export const onUpgradePad = p => near(p, { x: UPGRADE.x, z: UPGRADE.z - 0.6 }, 1.2, 0.8) && p.y < 0.6;

// лестница на второй этаж: ступеньки вдоль стены, наверху — проход
function stairs(p) {
  const S = STAIRS, hd = ROOM.d / 2;
  for (let i = 0; i < S.n; i++) solid(p, 2.4, 0.5 * (i + 1), 0.72, i % 2 ? 0xb5793e : 0xc98a45, S.x, 0, S.z0 + 0.36 + i * 0.72, { studs: false });
  for (let i = 0; i < S.n; i++) box(p, 0.1, 1, 0.1, 0xffffff, S.x + 1.25, 0.5 * (i + 1) + 0.5, S.z0 + 0.36 + i * 0.72);   // перила
  const rail = box(p, 0.1, 0.1, S.n * 0.75, 0xffffff, S.x + 1.25, 2.6, S.z0 + S.n * 0.36); rail.rotation.x = -Math.atan(0.5 / 0.72);
  box(p, 2.2, 2.6, 0.12, 0xffffff, S.x, 0.5 * S.n + 1.3, hd - 0.1); box(p, 1.8, 2.3, 0.14, 0x3a4a7a, S.x, 0.5 * S.n + 1.2, hd - 0.1);
  const l = makeLabel(3.6, 0.9); l.position.set(S.x, 0.5 * S.n + 3.2, hd - 0.6); scene.add(l); l.userData.set('⬆ 2 этаж', { color: '#ffe14d' });
  door({ x: S.x, z: hd - 0.9, w: 2.4, to: 'loft', label: '⬆ 2 этаж', spawn: LOFT_SPAWN });
}
const LOFT_SPAWN = { x: -6, z: 0, face: Math.PI / 2 }, HOME_FROM_LOFT = { x: STAIRS.x, z: STAIRS.z0 - 1.4, face: Math.PI };

// доска улучшений: второй этаж
export function openUpgrades({ save, sfx, persist, onBuy }) {
  const H = homeOf(save);
  const render = () => panel('🔨 Улучшения дома', [{
    icon: '🪜', name: 'Второй этаж', on: !!H.floor2,
    btn: H.floor2 ? { html: 'Уже есть ✅<small>лестница — у двери</small>', cls: 'no' } : { html: `${FLOOR2_PRICE} <i class="coin"></i><small>лестница и новая комната</small>`, cls: save.coins >= FLOOR2_PRICE ? '' : 'no' },
    click: b => {
      if (H.floor2) return;
      if (save.coins < FLOOR2_PRICE) { sfx.nope(); b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); return; }
      save.coins -= FLOOR2_PRICE; H.floor2 = true; sfx.fanfare(); stairs(scene); persist(); onBuy && onBuy(); render();
    } }]);
  render();
}

// ---------- второй этаж ----------
// такая же комната поменьше: голубые обои, круглые окна, телескоп; в полу — люк с лестницей вниз
export function buildLoft(save, profile) {
  const w = group(scene), RW = 20, RD = 14, hw = RW / 2, hd = RD / 2, Hh = 5;
  st = {};
  solid(w, RW + 2, 1, RD + 2, 0x5a8a3a, 0, -1.2, 0, { studs: false });
  solid(w, RW, 0.2, RD, 0xe0b070, 0, -0.2, 0, { studs: false });
  for (let i = 0; i < 10; i++) box(w, 0.06, 0.02, RD, 0xc08a50, -hw + 1 + i * 2, 0.005, 0, { shadow: false });
  const WALL = 0xd8ecff;
  solid(w, RW + 0.8, Hh, 0.4, WALL, 0, 0, -hd - 0.2, { studs: false, cam: true }); solid(w, RW + 0.8, Hh, 0.4, WALL, 0, 0, hd + 0.2, { studs: false, cam: true });
  solid(w, 0.4, Hh, RD, WALL, -hw - 0.2, 0, 0, { studs: false, cam: true }); solid(w, 0.4, Hh, RD, WALL, hw + 0.2, 0, 0, { studs: false, cam: true });
  for (const [x, z, ww, dd] of [[0, -hd + 0.03, RW, 0.06], [0, hd - 0.03, RW, 0.06], [-hw + 0.03, 0, 0.06, RD], [hw - 0.03, 0, 0.06, RD]]) box(w, ww, 0.4, dd, 0x7fa8d8, x, 0.2, z, { shadow: false });
  // круглые окошки (ступеньками)
  const round = (x, z, rot) => { const g = group(w, x, 3.4, z); g.rotation.y = rot; for (const [ww, hh] of [[1.6, 0.8], [1.2, 1.6], [0.8, 1.9]]) box(g, ww, hh, 0.14, 0xfff0a0, 0, 0, 0.02).material = mat(0xfff0a0, { emissive: 0x7a5a00 }); box(g, 1.9, 0.1, 0.18, 0xffffff, 0, 0, 0.03); box(g, 0.1, 1.9, 0.18, 0xffffff, 0, 0, 0.03); };
  round(-2.2, -hd + 0.02, 0); round(3.3, -hd + 0.02, 0); round(0.5, hd - 0.02, Math.PI);
  // люк в полу с лестницей вниз и перилами
  box(w, 2.4, 0.03, 2.6, 0x2b2b3a, -8.6, 0.02, 0, { shadow: false }); for (let i = 0; i < 3; i++) box(w, 2.2, 0.06, 0.4, 0xb5793e, -8.6, 0.04, -0.9 + i * 0.9, { shadow: false });
  for (const [x, z, ww, dd] of [[-7.35, 0, 0.1, 2.6], [-8.6, -1.35, 2.4, 0.1]]) { box(w, ww, 0.1, dd, 0xffffff, x, 1.0, z); }
  for (const [x, z] of [[-7.35, -1.3], [-7.35, 1.3], [-9.8, -1.35]]) box(w, 0.1, 1, 0.1, 0xffffff, x, 0.5, z);
  const dl = makeLabel(3.6, 0.9); dl.position.set(-8.6, 2.2, 0); scene.add(dl); dl.userData.set('⬇ Вниз', { color: '#ffe14d' });
  door({ x: -8.6, z: 0, w: 2.2, to: 'home', label: '⬇ Вниз', spawn: HOME_FROM_LOFT, side: true });
  // телескоп у окна
  const tg = group(w, 0.5, 0, 5.4); for (const [x, z] of [[-0.4, 0.3], [0.4, 0.3], [0, -0.4]]) { const l = box(tg, 0.08, 1.4, 0.08, 0x5a3a20, x, 0.7, z); l.rotation.x = z * 0.4; }
  const tube = box(tg, 0.3, 0.3, 1.6, 0x3f8fff, 0, 1.6, 0.2); tube.rotation.x = -0.5; box(tg, 0.36, 0.36, 0.2, 0xffd23f, 0, 1.95, 0.85);
  const hi = makeLabel(6, 1.5); hi.position.set(0.5, 4.8, -hd + 0.6); scene.add(hi); hi.userData.set(`🏠 ${nameOf(profile)} · 2 этаж`, { color: '#ffe14d' });
  buildRoom(w, save, 'loft');
  return w;
}
// раз в кадр в комнате: зеркало показывает героя (раз в два кадра и только когда он рядом)
// Вернёт события мебели (updateRoom): что открыть и какие звуки
// кухня 🍳 у северной стены, между зеркалом и лежанкой: столешница, плита с кастрюлей, полка с баночками; коврик — открыть кухню
const KITCHEN = { x: 2.2, z: -8.35, pad: { x: 2.2, z: -6.5 } };
function kitchenCorner(w, hd) {
  const K = KITCHEN;
  solid(w, 4.2, 1.1, 1.2, 0xfdfcf8, K.x, 0, K.z, { studs: false });                        // столешница с ящиками
  box(w, 4.3, 0.12, 1.3, 0x9a5a2a, K.x, 1.16, K.z);
  for (let i = 0; i < 3; i++) { box(w, 1.25, 0.8, 0.04, 0xe8e2d6, K.x - 1.4 + i * 1.4, 0.55, K.z + 0.62); box(w, 0.3, 0.06, 0.06, 0x9aa4ad, K.x - 1.4 + i * 1.4, 0.8, K.z + 0.66); }
  box(w, 1.6, 0.1, 1.1, 0x2b2b33, K.x + 1.1, 1.26, K.z);                                    // плита с конфорками
  for (const [dx, dz] of [[-0.4, -0.25], [0.4, -0.25], [-0.4, 0.25], [0.4, 0.25]]) box(w, 0.4, 0.03, 0.4, 0xd8261a, K.x + 1.1 + dx, 1.32, K.z + dz).material = mat(0xd8261a, { emissive: 0x551100 });
  box(w, 0.7, 0.5, 0.7, 0xb9c2cc, K.x + 0.7, 1.58, K.z - 0.2); box(w, 0.9, 0.08, 0.1, 0x6a6f7a, K.x + 0.25, 1.75, K.z - 0.2);   // кастрюля с ручкой
  box(w, 0.8, 0.25, 0.6, 0x9aa4ad, K.x - 1.2, 1.3, K.z);                                    // мойка
  box(w, 4, 0.12, 0.5, 0x9a5a2a, K.x, 3.2, -hd + 0.3);                                      // полка с баночками
  [0xff9f1a, 0xffd23f, 0xd8261a, 0x5fd35f, 0xffffff].forEach((c, i) => { box(w, 0.4, 0.5, 0.35, c, K.x - 1.6 + i * 0.8, 3.52, -hd + 0.3); box(w, 0.42, 0.1, 0.37, 0x9a5a2a, K.x - 1.6 + i * 0.8, 3.82, -hd + 0.3); });
  box(w, 2.6, 0.04, 1.4, 0xff9f1a, K.pad.x, 0.03, K.pad.z, { shadow: false });              // оранжевый коврик
  const l = makeLabel(4, 1); l.position.set(K.x, 4.4, K.z + 0.3); scene.add(l); l.userData.set('🍳 Кухня — встань на коврик', { color: '#ffffff' });
}
export const onKitchenPad = p => near(p, KITCHEN.pad, 1.3, 0.8) && p.y < 0.8;

export function updateHome(dt, hero, me, own) {
  const ev = updateRoom(dt, hero), Mr = st?.mirror; if (!Mr) return ev;
  const p = hero.pos;
  // тайная комната: постоял у своего зеркала 2.5 с — стекло мерцает всё сильнее и открывается. Вышел из комнаты — сначала отойди от зеркала
  const atMirror = own && Math.hypot(p.x - MIRROR.x, p.z - (MIRROR.z + 2)) < 1.9 && hero.speed < 1.5;
  if (Math.hypot(p.x - MIRROR.x, p.z - MIRROR.z) > 4) st.mirrorArmed = true;
  st.stand = atMirror && st.mirrorArmed ? (st.stand || 0) + dt : 0;
  const k = Math.min(1, st.stand / 2.5);
  Mr.glass.material.color.setRGB(1 - k * 0.25, 1 - k * 0.05, 1);
  if (k > 0.2 && Math.random() < dt * 10 * k) puff('✨', new T.Vector3(MIRROR.x + (Math.random() - 0.5) * 2.2, 0.8 + Math.random() * 3, MIRROR.z + 0.3), { size: 0.5 + k * 0.4, rise: 0.6, life: 0.9 });
  if (k >= 1) { st.stand = 0; st.mirrorArmed = false; ev.secret = true; }
  // у мамы: стоит перед зеркалом — комплимент и искорки
  const C = st.compl;
  if (C) {
    const look = me === 'mama' && Math.hypot(p.x - MIRROR.x, p.z - (MIRROR.z + 2)) < 2.6;
    if (look && !C.cl.visible) { C.cl.visible = true; C.t = 0; }
    if (!look) C.cl.visible = false;
    if (C.cl.visible) {
      C.t += dt; const k = Math.min(1, C.t * 3); C.cl.scale.set(3.2 * k * (1 + Math.sin(C.t * 3) * 0.04), 0.8 * k * (1 + Math.sin(C.t * 3) * 0.04), 1);
      if ((C.sp -= dt) <= 0) { C.sp = 0.5; puff(Math.random() < 0.5 ? '✨' : '💖', new T.Vector3(MIRROR.x + (Math.random() - 0.5) * 2.6, 1 + Math.random() * 3, MIRROR.z + 0.4), { size: 0.6, rise: 0.8, life: 1.2 }); }
    }
  }
  if (Math.hypot(p.x - MIRROR.x, p.z - MIRROR.z) > 11 || (st.mirrorT ^= 1)) return ev;
  Mr.cam.lookAt(p.x, p.y + 1.6, p.z);
  const auto = renderer.shadowMap.autoUpdate; renderer.shadowMap.autoUpdate = false;     // тени уже посчитаны для основного кадра
  const cv = C?.cl.visible; if (C) C.cl.visible = false;                                   // надпись висит перед стеклом — в отражение её не берём
  Mr.glass.visible = false; renderer.setRenderTarget(Mr.rt); renderer.render(scene, Mr.cam); renderer.setRenderTarget(null); Mr.glass.visible = true;
  if (C) C.cl.visible = cv;
  renderer.shadowMap.autoUpdate = auto;
  return ev;
}
