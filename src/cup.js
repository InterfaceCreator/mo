// Кубок участника 🏆: Мотя и мама вместе ходили на соревнования (21 ноября 2026) — без призовых мест, но участвовали!
// На базе, у домика (перед крыльцом, сбоку от дорожки), стоит подарочная коробка. Подошёл — она лопается, и:
//   • на её месте появляется пьедестал с большим золотым кубком (навсегда);
//   • в загоне — Золотой дракончик-участник (доход скромный, как у легендарного; гуляет всегда, места не занимает);
//   • в шкафу — медаль участника (сразу надевается).
// У Моти и у мамы — у каждого своя коробка, свой кубок и свой дракончик (своё сохранение).
import { T, scene, group, box } from './engine.js';
import { solid, onLevelReset } from './world.js';
import { makeLabel, puff, confetti } from './fx.js';

export const CUP = { x: -41, z: 48.5 };          // у своего домика: перед крыльцом, сбоку от дорожки к двери (со стороны стены)
export const CUP_DAY = '21 ноября 2026';
let st = null;
onLevelReset(() => { st = null; });

// H — домик хозяина (вдвоём Мотин домик в северо-восточном углу — кубок переезжает к нему)
export function buildCup(w, save, who, H) {
  if (H) { const k = H.x < 0 ? -1 : 1; CUP.x = H.x + k * 4; CUP.z = H.door.z - 5.9; }
  st = { who, t: 0, box: null, cup: null, sparkT: 0 };
  // пьедестал — всегда (на нём или коробка, или кубок)
  solid(w, 2.6, 0.5, 2.6, 0xe8ecf2, CUP.x, 0, CUP.z);
  solid(w, 2.0, 0.6, 2.0, 0xc9d1dc, CUP.x, 0.5, CUP.z);
  box(w, 1.4, 0.3, 0.04, 0xffc21a, CUP.x, 0.8, CUP.z + 1.01, { shadow: false });   // табличка
  if (save.cup) placeCup(save);
  else {
    const g = group(scene, CUP.x, 1.1, CUP.z); g.userData.dynamic = true;
    const b = group(g, 0, 0, 0);
    box(b, 1.6, 1.4, 1.6, 0xff4a7a, 0, 0.7, 0); box(b, 1.7, 1.45, 0.34, 0xffd23f, 0, 0.7, 0); box(b, 0.34, 1.45, 1.7, 0xffd23f, 0, 0.7, 0);
    for (const sx of [-1, 1]) { const bw = box(b, 0.7, 0.45, 0.22, 0xffd23f, sx * 0.36, 1.6, 0); bw.rotation.z = sx * 0.4; }
    const lb = makeLabel(5.6, 1.4); lb.position.set(CUP.x, 4.4, CUP.z); scene.add(lb);
    lb.userData.set(who === 'mama' ? '🎁 Юле — за соревнования!' : '🎁 Моте — за соревнования!', { color: '#ffe14d' });
    st.box = { g, b, lb };
  }
}

// кубок: чаша, ручки, ножка, подставка, звёздочка
function placeCup(save) {
  const g = group(scene, CUP.x, 1.1, CUP.z); g.userData.dynamic = true; g.scale.setScalar(1.5);
  const G = 0xffc21a, D = 0xe09a10;
  box(g, 1.0, 0.22, 1.0, 0x6a3f1e, 0, 0.11, 0);              // деревянная подставка
  box(g, 0.7, 0.14, 0.7, D, 0, 0.29, 0);
  box(g, 0.22, 0.6, 0.22, G, 0, 0.66, 0);                    // ножка
  box(g, 0.5, 0.14, 0.5, D, 0, 0.98, 0);
  box(g, 0.9, 0.5, 0.9, G, 0, 1.3, 0);                       // чаша
  box(g, 1.1, 0.55, 1.1, G, 0, 1.8, 0);
  box(g, 1.14, 0.1, 1.14, 0xffe680, 0, 2.1, 0);              // ободок
  for (const sx of [-1, 1]) { box(g, 0.14, 0.7, 0.14, G, sx * 0.78, 1.65, 0); box(g, 0.3, 0.14, 0.14, G, sx * 0.66, 1.95, 0); box(g, 0.3, 0.14, 0.14, G, sx * 0.66, 1.35, 0); }   // ручки
  const s = box(g, 0.34, 0.34, 0.06, 0xffffff, 0, 1.6, 0.57, { shadow: false }); s.rotation.z = 0.78;   // звёздочка спереди
  const s2 = box(g, 0.34, 0.34, 0.06, 0xffffff, 0, 1.6, -0.57, { shadow: false }); s2.rotation.z = 0.78;
  const lb = makeLabel(6, 1.5); lb.position.set(CUP.x, 6.3, CUP.z); scene.add(lb);
  lb.userData.set('🏆 Кубок участников', { color: '#ffe14d' });
  const ld = makeLabel(6, 0.9); ld.position.set(CUP.x, 5.3, CUP.z); scene.add(ld);
  ld.userData.set('Мотя и мама · ' + CUP_DAY, { color: '#ffffff' });
  st.cup = { g };
}

// раз в кадр (на базе). Вернёт true — коробку только что открыли
export function updateCup(dt, hero, save) {
  if (!st) return false;
  st.t += dt;
  if (st.box) {
    const B = st.box;
    B.b.position.y = Math.abs(Math.sin(st.t * 3)) * 0.3; B.b.rotation.y = Math.sin(st.t * 1.3) * 0.2;
    if (Math.random() < dt * 4) puff('✨', new T.Vector3(CUP.x + (Math.random() - 0.5) * 2.5, 1.5 + Math.random() * 2.5, CUP.z + (Math.random() - 0.5) * 2.5), { size: 0.7, rise: 0.8 });
    if (Math.hypot(hero.pos.x - CUP.x, hero.pos.z - CUP.z) < 2.6) {
      scene.remove(B.g); scene.remove(B.lb); st.box = null;
      confetti(new T.Vector3(CUP.x, 2.5, CUP.z), 220);
      save.cup = { got: Date.now() };
      placeCup(save);
      return true;
    }
  }
  if (st.cup) {
    st.cup.g.rotation.y = st.t * 0.5;
    if ((st.sparkT -= dt) <= 0) { st.sparkT = 0.5 + Math.random() * 0.6; puff(Math.random() < 0.5 ? '✨' : '⭐', new T.Vector3(CUP.x + (Math.random() - 0.5) * 1.6, 3.2 + Math.random() * 1.6, CUP.z + (Math.random() - 0.5) * 1.6), { size: 0.5, rise: 0.6 }); }
  }
  return false;
}

export const CUP_NOTE = {
  motya: 'Мотя, ты сегодня — настоящий чемпион! 🏆\n\nТы вышел на соревнования, не испугался и старался до самого конца. Даже когда было трудно — не сдавался. Именно так и поступают настоящие спортсмены и герои 💪\n\nМама тобой очень-очень гордится — и я тоже! ❤️\n\nА в загоне тебя уже ждёт новый друг — Золотой дракончик 🐉',
  mama: 'Юля, сегодня ты сделала то, чего боялась.\n\nТы вышла на старт рядом с Мотей — и не отступила. Я знаю, чего тебе это стоило, и от этого гордость за тебя просто безумная.\n\nКаждый побеждённый страх делает тебя ещё сильнее. А Мотя сегодня увидел, какая у него смелая мама — и это лучший урок, который можно ему дать.\n\nТы большая молодец ❤️\nЭтот кубок — твой по праву 🏆',
};
