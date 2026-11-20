// Баня 🧖 и джакузи 🫧.
//   Баня — у ручья на дороге к даче: бревенчатый сруб, внутри полок (лесенкой), печка-каменка, кадушка с ковшом.
//   Зашёл — крыша прячется (видно, что внутри), идёт пар; у печки кнопка ♨️ — «поддать пару».
//   Прогрелся — в джакузи на террасе у бани: отдохнуть в тёплых пузырьках (раз в день — монетки).
//   Джакузи — у бани (деревянное, на террасе) и в аквапарке у бассейна: тёплая вода, пузырьки; кнопка 🫧 — сильнее.
//   Постоял в воде или на полке — герой садится отдохнуть; пошёл — встаёт.
import { T, scene, group, box, mergeMeshes } from './engine.js';
import { solid } from './world.js';
import { water } from './terrain.js';
import { makeLabel, puff } from './fx.js';

export const BANYA = { x: -9, z: 155, hw: 3, hd: 2.5 };          // сруб x −12…−6, z 152.5…157.5; дверь на юг — к ручью
const STOVE = { x: -11, z: 153.6 };                               // печка в юго-западном углу, топка смотрит на восток
// джакузи 5×5: у бани (деревянное, на террасе) и у восточной стены аквапарка
export const JACS = [{ id: 'banya', x: -1.6, z: 154.8, s: 5, rim: 0xa8743f, kant: 0x6a3f1e, deck: true }, { id: 'park', x: 42.2, z: 80, s: 5, rim: 0xf2f6ff, kant: 0x3fb8ff }];
const JAC_FLOOR = 0.12, JAC_SURF = 0.7;

let st = null;
const V = (x, y, z) => new T.Vector3(x, y, z);
const inBox = (p, x0, x1, z0, z1) => p.x > x0 && p.x < x1 && p.z > z0 && p.z < z1;
const inBanya = p => inBox(p, BANYA.x - BANYA.hw + 0.4, BANYA.x + BANYA.hw - 0.4, BANYA.z - BANYA.hd + 0.4, BANYA.z + BANYA.hd - 0.4) && p.y < 2;
const jacAt = p => JACS.find(J => inBox(p, J.x - J.s / 2 + 0.4, J.x + J.s / 2 - 0.4, J.z - J.s / 2 + 0.4, J.z + J.s / 2 - 0.4) && p.y < JAC_SURF) || null;

export function buildSpa(w) {
  st = { heat: 0, hot: 0, still: 0, steamT: 0, bubT: 0, boost: 0, smokeT: 0, inB: false, inJ: null, said: {} };
  buildBanya(w); for (const J of JACS) buildJacuzzi(w, J);
}

function buildBanya(w) {
  const B = BANYA, X0 = B.x - B.hw, X1 = B.x + B.hw, Z0 = B.z - B.hd, Z1 = B.z + B.hd, WH = 3.4, DH = 3.0, DX0 = B.x - 1.1, DX1 = B.x + 1.1;   // дверь 2.2 × 3 — герой (2.75) проходит свободно
  // стены — невидимые упоры; видно брёвна
  for (const [x0, x1, z0, z1] of [[X0, X1, Z1 - 0.4, Z1], [X0, X0 + 0.4, Z0, Z1], [X1 - 0.4, X1, Z0, Z1], [X0, DX0, Z0, Z0 + 0.4], [DX1, X1, Z0, Z0 + 0.4]])
    solid(w, x1 - x0, WH, z1 - z0, 0x8a5a2b, (x0 + x1) / 2, 0, (z0 + z1) / 2).visible = false;
  for (let i = 0; i < 8; i++) {
    const y = 0.21 + i * 0.42, c = i % 2 ? 0xa8743f : 0x8f5f30;
    box(w, B.hw * 2 + 0.4, 0.42, 0.42, c, B.x, y, Z1 - 0.2);
    box(w, 0.42, 0.42, B.hd * 2 + 0.4, c, X0 + 0.2, y, B.z); box(w, 0.42, 0.42, B.hd * 2 + 0.4, c, X1 - 0.2, y, B.z);
    if (y > DH) box(w, B.hw * 2 + 0.4, 0.42, 0.42, c, B.x, y, Z0 + 0.2);
    else { box(w, DX0 - X0 + 0.2, 0.42, 0.42, c, (X0 - 0.2 + DX0) / 2, y, Z0 + 0.2); box(w, X1 - DX1 + 0.2, 0.42, 0.42, c, (DX1 + X1 + 0.2) / 2, y, Z0 + 0.2); }
  }
  for (const x of [DX0 - 0.08, DX1 + 0.08]) box(w, 0.16, DH, 0.5, 0x6a3f1e, x, DH / 2, Z0 + 0.2);    // косяки
  box(w, B.hw * 2 - 0.8, 0.08, B.hd * 2 - 0.8, 0xe2c08a, B.x, 0.04, B.z, { shadow: false });       // пол из досок
  // окошко на восток
  box(w, 0.12, 0.8, 1, 0xffffff, X1 + 0.02, 1.5, B.z + 0.6); box(w, 0.14, 0.6, 0.8, 0x9fdcff, X1 + 0.03, 1.5, B.z + 0.6);
  // полок — две ступеньки вдоль северной стены
  solid(w, B.hw * 2 - 0.8, 0.5, 0.9, 0xf0cf96, B.x, 0, Z1 - 1.75, { studs: false });
  solid(w, B.hw * 2 - 0.8, 1.0, 0.9, 0xf0cf96, B.x, 0, Z1 - 0.85, { studs: false });
  box(w, B.hw * 2 - 0.8, 0.6, 0.12, 0xe2be82, B.x, 1.3, Z1 - 0.46, { shadow: false });              // спинка
  // печка-каменка: железный короб, камни сверху, огонь в топке, труба
  solid(w, 1.2, 1.0, 1.3, 0x3a3a42, STOVE.x, 0, STOVE.z, { studs: false });
  for (let i = 0; i < 7; i++) box(w, 0.32, 0.24, 0.3, [0x9aa4ad, 0x7a808a, 0xb0b4bc][i % 3], STOVE.x - 0.35 + (i % 3) * 0.35, 1.1 + (i > 5 ? 0.2 : 0), STOVE.z - 0.4 + Math.floor(i / 3) * 0.4, { shadow: false });
  const fire = new T.Mesh(new T.BoxGeometry(0.06, 0.4, 0.6), new T.MeshBasicMaterial({ color: 0xff7a1a })); fire.position.set(STOVE.x + 0.61, 0.45, STOVE.z); w.add(fire);
  box(w, 0.28, WH - 1.2, 0.28, 0x2b2b30, STOVE.x - 0.3, 1.2 + (WH - 1.2) / 2, STOVE.z + 0.3, { shadow: false });
  // кадушка с водой и ковшиком, тазик на полке, веник на стене
  box(w, 0.7, 0.6, 0.7, 0x9c6a3c, X1 - 1, 0.3, Z0 + 1.1); box(w, 0.55, 0.04, 0.55, 0x3fa7ff, X1 - 1, 0.61, Z0 + 1.1, { shadow: false });
  box(w, 0.6, 0.06, 0.12, 0x8a5a2b, X1 - 1, 0.7, Z0 + 1.1, { shadow: false }); box(w, 0.22, 0.14, 0.22, 0x8a5a2b, X1 - 0.8, 0.72, Z0 + 1.1, { shadow: false });
  box(w, 0.6, 0.18, 0.6, 0xc8a87a, B.x + 1.6, 1.09, Z1 - 0.85, { shadow: false });
  box(w, 0.1, 0.5, 0.1, 0x6a3f1e, X0 + 0.45, 1.9, B.z + 0.4, { shadow: false }); box(w, 0.25, 0.6, 0.5, 0x4a8a3a, X0 + 0.48, 1.45, B.z + 0.4, { shadow: false });
  // мостки от двери к ручью и скамеечка у входа
  for (let i = 0; i < 9; i++) box(w, 2.2, 0.1, 0.45, i % 2 ? 0xb07a4a : 0x9c6a3c, B.x, 0.12, Z0 - 0.3 - i * 0.5, { shadow: false });
  for (const sx of [-1, 1]) box(w, 0.16, 0.5, 0.16, 0x6a3f1e, B.x + sx * 1, 0.05, Z0 - 4.3, { shadow: false });
  box(w, 1.6, 0.12, 0.5, 0x9c6a3c, B.x - 2.1, 0.5, Z0 - 0.6); for (const sx of [-1, 1]) box(w, 0.12, 0.45, 0.4, 0x6a3f1e, B.x - 2.1 + sx * 0.75, 0.22, Z0 - 0.6);
  // крыша — отдельно: прячется, когда герой внутри
  const roof = group(w, B.x, 0, B.z); roof.userData.dynamic = true;
  for (const sx of [-1, 1]) { const r = box(roof, B.hw * 2 + 1, 0.25, B.hd + 1.1, 0x6f4a2a, 0, WH + 0.95, sx * (B.hd + 1.1) / 2 * 0.82); r.rotation.x = sx * 0.62; }
  for (const x of [-B.hw + 0.2, B.hw - 0.2]) for (let i = 0; i < 4; i++) box(roof, 0.36, 0.4, B.hd * 2 - i * 1.2, i % 2 ? 0xa8743f : 0x8f5f30, x, WH + 0.2 + i * 0.4, 0);
  box(roof, 0.3, 1.8, 0.3, 0x2b2b30, STOVE.x - 0.3 - B.x, WH + 0.9, STOVE.z + 0.3 - B.z);
  mergeMeshes(roof, roof.children.slice());
  st.roof = roof; st.chimney = V(STOVE.x - 0.3, WH + 2, STOVE.z + 0.3);
  const l = makeLabel(3.6, 0.9); l.position.set(B.x, WH + 3.3, B.z); scene.add(l); l.userData.set('🧖 Баня', { color: '#ffe14d' });
}

function buildJacuzzi(w, J) {
  const s = J.s, t = 0.4, h = 0.8, x0 = J.x - s / 2, x1 = J.x + s / 2, z0 = J.z - s / 2, z1 = J.z + s / 2;
  for (const [a0, a1, b0, b1] of [[x0, x1, z0, z0 + t], [x0, x1, z1 - t, z1], [x0, x0 + t, z0 + t, z1 - t], [x1 - t, x1, z0 + t, z1 - t]])
    solid(w, a1 - a0, h, b1 - b0, J.rim, (a0 + a1) / 2, 0, (b0 + b1) / 2, { studs: false });
  for (const [a0, a1, b0, b1] of [[x0, x1, z0, z0 + t], [x0, x1, z1 - t, z1], [x0, x0 + t, z0, z1], [x1 - t, x1, z0, z1]])
    box(w, a1 - a0 + 0.06, 0.08, b1 - b0 + 0.06, J.kant, (a0 + a1) / 2, h + 0.04, (b0 + b1) / 2, { shadow: false });   // кант
  if (J.deck) {                                                     // деревянная терраса вокруг и ступенька
    box(w, s + 2.4, 0.1, s + 2.4, 0xc8a070, J.x, 0.05, J.z, { shadow: false });
    for (let i = 0; i < 8; i++) box(w, 0.06, 0.02, s + 2.4, 0x9c7a50, J.x - s / 2 - 1.2 + (i + 0.5) * (s + 2.4) / 8, 0.11, J.z, { shadow: false });
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { box(w, 0.18, 1.1, 0.18, 0x6a3f1e, J.x + dx * (s / 2 + 1), 0.55, J.z + dz * (s / 2 + 1)); }
    box(w, 1.4, 0.4, 0.5, 0xa8743f, J.x + 1.2, 0.2, J.z + s / 2 + 1.5); box(w, 0.6, 0.25, 0.6, 0xffffff, J.x + 1.2, 0.52, J.z + s / 2 + 1.5, { shadow: false });   // скамеечка с полотенцем
  }
  solid(w, s - 2 * t, JAC_FLOOR, s - 2 * t, 0x7fd4ff, J.x, 0, J.z, { studs: false });
  // скамеечка-приступок внутри по кругу и лампочки в воде
  for (const [dx, dz, ww, dd] of [[0, -(s / 2 - t - 0.25), s - 2 * t, 0.5], [0, s / 2 - t - 0.25, s - 2 * t, 0.5]]) box(w, ww, 0.2, dd, 0xdff3ff, J.x + dx, JAC_FLOOR + 0.1, J.z + dz, { shadow: false });
  for (const [dx, dz] of [[-1.3, -1.6], [1.3, -1.6], [-1.3, 1.6], [1.3, 1.6]]) {
    const m = new T.Mesh(new T.SphereGeometry(0.14, 8, 6), new T.MeshBasicMaterial({ color: 0xbff0ff })); m.position.set(J.x + dx, JAC_FLOOR + 0.12, J.z + dz); w.add(m);
  }
  const wt = water(w, s - 2 * t, JAC_SURF, 0x5fd0ff); wt.position.set(J.x, JAC_SURF, J.z);
  box(w, 0.25, 2.6, 0.25, 0x8a5a2b, x0 - 0.5, 1.3, z1 + 0.4);
  const l = makeLabel(4, 1); l.position.set(J.x, 3.1, z1 + 0.4); scene.add(l); l.userData.set('🫧 Джакузи', { color: '#bff0ff' });
}

// кнопки: у печки ♨️, в джакузи 🫧
export function spaNear(p) {
  if (!st) return null;
  if (inBanya(p) && Math.hypot(p.x - (STOVE.x + 1.2), p.z - STOVE.z) < 1.6) return 'steam';
  if (jacAt(p)) return 'bubbles';
  return null;
}
export function spaUse(kind, hero) {
  const p = hero.pos;
  if (kind === 'steam') {
    st.kovsh = { t: 0, done: false };                                    // ковшик: замах ~1 с, пар — когда плеснул (updateSpa)
    hero.face = -Math.PI / 2; hero.model.root.rotation.y = hero.face;      // лицом к печке
    return { say: st.said.steam ? null : '♨️ Пш-ш-ш! Пар пошёл!<small>посиди на полке — погрейся</small>', key: 'steam' };
  }
  if (kind === '__steam') {
    st.heat += 3;
    for (let i = 0; i < 10; i++) puff(i % 3 ? '💨' : '♨️', V(STOVE.x + (Math.random() - 0.5) * 1, 1.4 + Math.random() * 0.6, STOVE.z + (Math.random() - 0.5) * 1), { size: 1.2 + Math.random() * 0.6, rise: 1.2, life: 1.6, dx: 1.2 });
    return {};
  }
  if (kind === 'bubbles') {
    st.boost = 4;
    return { sfx: 'bubbles', say: st.said.boost ? null : '🫧 Буль-буль! Пузырьки щекочут!', key: 'boost' };
  }
  return {};
}

// раз в кадр. Вернёт { sfx: [], say, coins }
export function updateSpa(dt, hero, save) {
  if (!st) return {};
  const ev = { sfx: [] }, p = hero.pos;
  const inB = inBanya(p), inJ = jacAt(p);
  // крыша бани: внутри — не мешает смотреть
  st.roof.visible = !inB;
  // дымок из трубы бани
  if ((st.smokeT -= dt) <= 0 && Math.hypot(p.x - BANYA.x, p.z - BANYA.z) < 60) { st.smokeT = 0.6; puff('💨', st.chimney.clone().add(V((Math.random() - 0.5) * 0.3, 0, (Math.random() - 0.5) * 0.3)), { size: 1, rise: 1.3, life: 2, dx: 0.3 }); }
  // пар внутри бани
  if (inB) {
    st.heat += dt;
    if ((st.steamT -= dt) <= 0) { st.steamT = 0.35; puff('💨', V(BANYA.x + (Math.random() - 0.5) * 4.4, 1.2 + Math.random() * 1.2, BANYA.z + (Math.random() - 0.5) * 3.4), { size: 1.3, rise: 0.5, life: 1.8, dx: 0.4 }); }
    if (!st.inB && !st.said.enter) { st.said.enter = 1; ev.say = '🧖 Баня! Тепло и пахнет веником 🌿<small>у печки — кнопка ♨️, поддай пару</small>'; }
    if (st.heat >= 7 && !st.hot) { st.hot = 60; ev.sfx.push('pop'); puff('🥵', p.clone().setY(p.y + 3), { size: 1.2, rise: 0.8 }); ev.say = '🥵 Ух, жарко! Хорошо прогрелся!<small>а теперь — в джакузи на террасе, отдохнуть 🫧</small>'; }
  } else st.heat = Math.max(0, st.heat - dt * 0.5);
  if (st.hot > 0 && !inB) st.hot = Math.max(0, st.hot - dt);        // за минуту остыл
  // джакузи у бани после парилки — отдыхаем (раз в день — монетки)
  if (inJ && inJ !== st.inJ) {
    ev.sfx.push('splash');
    for (let i = 0; i < 6; i++) puff(i % 2 ? '💦' : '🫧', V(p.x + (Math.random() - 0.5) * 1.6, JAC_SURF + 0.3 + Math.random() * 0.6, p.z + (Math.random() - 0.5) * 1.6), { size: 0.8, rise: 1.2, life: 0.8 });
    if (inJ.id === 'banya' && st.hot) {
      st.hot = 0; st.heat = 0; const day = new Date().toDateString(), S = (save.spa ||= {});
      if (S.day !== day) { S.day = day; ev.coins = 30; ev.say = '😌 После бани — в тёплые пузырьки… Красота!<small>+30 монет · баня с джакузи — раз в день</small>'; ev.sfx.push('coins'); }
      else ev.say = '😌 После бани — в пузырьки… Красота!';
    } else if (!st.said.jac) { st.said.jac = 1; ev.say = '😌 Тёплая водичка… Ах, хорошо!<small>постой — сядешь отдохнуть · кнопка 🫧 — больше пузырьков</small>'; }
  }
  // джакузи: пузырьки (больше — если нажал 🫧)
  if (st.boost > 0) st.boost -= dt;
  const J = JACS.find(J => Math.hypot(p.x - J.x, p.z - J.z) < 30);
  if (J && (st.bubT -= dt) <= 0) {
    st.bubT = st.boost > 0 && inJ === J ? 0.05 : 0.3;
    puff('🫧', V(J.x + (Math.random() - 0.5) * 3.8, JAC_SURF + 0.1, J.z + (Math.random() - 0.5) * 3.8), { size: st.boost > 0 ? 0.7 : 0.45, rise: 0.8, life: 0.9 });
  }
  // постоял в воде или в бане — садимся; пошёл — встаём
  const seat = (inJ || (inB && p.y > 0.4)) && hero.grounded && !hero.climb;
  if (seat && hero.speed < 0.3) st.still += dt; else st.still = 0;
  hero.relax = seat && st.still > 0.5;
  // анимации: веник на полке, ковшик у печки, отдых и брызги в джакузи (hero.js)
  hero.spa = null; hero.spaK = 0;
  if (st.kovsh) {
    const K = st.kovsh; K.t += dt; hero.spa = 'kovsh'; hero.spaK = K.t / 1.1;
    if (!K.done && hero.spaK > 0.6) { K.done = true; spaUse('__steam', hero); ev.sfx.push('steam'); }
    if (hero.spaK >= 1 || !inB || hero.speed > 1) st.kovsh = null;
  } else if (hero.relax && inB) {
    hero.spa = 'venik';
    if (Math.random() < dt * 2.5) puff(Math.random() < 0.6 ? '🌿' : '💧', V(p.x + (Math.random() - 0.5) * 0.8, p.y + 2 + Math.random() * 0.6, p.z + (Math.random() - 0.5) * 0.8), { size: 0.5, rise: Math.random() < 0.5 ? -0.6 : 0.6, life: 0.8, dx: 0.6 });
    if ((st.swishT = (st.swishT ?? 0) - dt) <= 0) { st.swishT = 0.79; ev.sfx.push('swish'); }
  } else if (hero.relax && inJ) {
    hero.spa = st.boost > 0 ? 'splash' : 'jac';
    if (st.boost > 0 && Math.random() < dt * 8) puff('💦', V(p.x + (Math.random() - 0.5) * 1.4, JAC_SURF + 0.3, p.z + (Math.random() - 0.5) * 1.4), { size: 0.7, rise: 1.4, life: 0.6 });
    if (!st.boost && Math.random() < dt * 0.4) puff('😌', p.clone().setY(p.y + 3), { size: 0.8, rise: 0.6, life: 1.2 });
  }
  if (hero.relax && inB) { hero.face = Math.PI; hero.model.root.rotation.y = Math.PI; }     // на полке — лицом в баню, не к стене
  st.inB = inB; st.inJ = inJ;
  return ev;
}
export const spaSaid = k => { if (st && k) st.said[k] = 1; };
