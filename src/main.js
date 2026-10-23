// Запуск и главный цикл.
import { renderer, scene, camera, resize, followSun, followSky } from './engine.js';
import { updateWater } from './terrain.js';
import { updateWorld } from './world.js';
import { LOCS } from './locations.js';
import { buildHero, animateHero, LOOK_OF } from './hero.js';
import { makePlayer, updatePlayer, WALK } from './player.js';
import { makeCam, updateCam } from './camera.js';
import { input, pollInput, takeLook, takeZoom, takeJump } from './input.js';
import { initAudio, SFX } from './sfx.js';
import { initGame, updateGame } from './game.js';
import { updateFx, puff, dust } from './fx.js';
import { loadProfile, save, persist, PROFILES } from './save.js';
import { modelThumb } from './pets.js';
import { chooseProfile, showLock, noteOpen, toast } from './ui.js';
import { FS } from './fs.js';
import { startRest, checkRest, unlockRest } from './rest.js';

const Q = new URLSearchParams(location.search);

addEventListener('resize', resize); resize();

// выбор игрока: Мотя или Мама (по паролю)
const heroThumb = id => modelThumb('hero:' + id, s => buildHero(s, LOOK_OF[id]), { yaw: 0.35, size: 360, dist: 1.4 });
const who = await chooseProfile({ motya: heroThumb('motya'), mama: heroThumb('mama') }, SFX);
initAudio();
loadProfile(who);
const kid = PROFILES[who].kid;
if (kid) startRest(save);

const SPAWN = LOCS.base.spawn;
const hero = makePlayer(buildHero(scene, LOOK_OF[who]), SPAWN);
hero.model.root.userData.keep = true;            // герой (и яйцо в руках) переживает смену локации
const cam = makeCam(SPAWN.face);
initGame(hero, cam);

// таймер отдыха (только у Моти): пока замок — игра стоит
let locked = false;
function restCheck() {
  if (!kid || locked) return;
  const r = checkRest(save);
  if (r === 'yawn') { SFX.yawn(); puff('🥱', hero.pos.clone().setY(3.6), { size: 1.6, rise: 0.3, life: 2.2 }); persist(); }
  if (r === 'lock') { locked = true; persist(); SFX.yawn(); showLock(() => { unlockRest(save); persist(); locked = false; SFX.fanfare(); }); }
}
restCheck();

// подсказка на первые секунды
const hint = document.getElementById('hint');
const touch = matchMedia('(pointer: coarse)').matches;
hint.textContent = touch ? 'Слева — бежать · справа — крутить камеру' : 'WASD — бежать · мышь — камера · пробел — прыжок';
setTimeout(() => hint.style.opacity = 0, 6000);

// ---------- во весь экран: кнопка рядом с таймером ----------
// Android, Chrome, iPad — разворачиваем и сворачиваем; iPhone так не умеет — подсказываем про экран «Домой»;
// запущено с домашнего экрана — и так во весь экран, кнопка не нужна
{
  const btn = document.getElementById('fsBtn');
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const ICON = {
    // четыре стрелки из центра в углы — «больше»; из углов к центру — «меньше»
    open: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 10L3.5 3.5M3.5 9V3.5H9M14 10l6.5-6.5M15 3.5h5.5V9M10 14l-6.5 6.5M3.5 15v5.5H9M14 14l6.5 6.5M20.5 15v5.5H15"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 3.5L10 10M10 4.5V10H4.5M20.5 3.5L14 10M14 4.5V10h5.5M3.5 20.5L10 14M4.5 14H10v5.5M20.5 20.5L14 14M19.5 14H14v5.5"/></svg>',
  };
  const paint = () => { const o = FS.on(); btn.innerHTML = o ? ICON.close : ICON.open; btn.setAttribute('aria-label', o ? 'Свернуть' : 'Во весь экран'); };
  if (!standalone) { btn.style.display = 'flex'; paint(); }
  document.addEventListener('fullscreenchange', paint); document.addEventListener('webkitfullscreenchange', paint);
  btn.addEventListener('click', e => {
    e.stopPropagation(); SFX.tap();
    if (!FS.can) { toast('📱 На iPhone: нажми «Поделиться» ⬆️ → «На экран „Домой“»<small>и открывай игру с иконки — будет во весь экран</small>'); return; }
    if (FS.on()) FS.exit(); else FS.enter();
  });
}
input.onFirstTouch = () => {
  initAudio();
  if (touch && FS.can && !FS.on()) FS.enter();     // на Android — сразу во весь экран; свернуть — кнопкой
};

// счётчик кадров: ?fps
const fpsEl = document.getElementById('fps'); let fpsN = 0, fpsT = 0;
if (Q.has('fps')) fpsEl.style.display = 'block';

let last = performance.now(), stepT = 0, wasGrounded = true, lastVy = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - last) / 1000, 0.05); last = now;
  if (!window.game?.frozen) update(dt);   // game.frozen — остановить время (для проверок)
}
function update(dt) {
  if (locked || noteOpen()) { renderer.render(scene, camera); return; }    // отдых или записка — игра стоит
  restCheck();
  pollInput();
  hero.holdJump = input.jumpHeld;
  updatePlayer(hero, dt, input.move, cam.yaw, takeJump());
  updateCam(cam, dt, hero, { look: takeLook(), zoom: takeZoom(), lastLook: input.lastLook });
  updateGame(dt);
  animateHero(hero.model, dt, { speed: hero.animSpeed ?? hero.speed, maxSpeed: WALK, air: !hero.grounded, vy: hero.vel.y, carry: !!hero.carrying || !!hero.climb, stun: hero.stun > 0,
    tool: hero.toolOut, swing: hero.swing ? hero.swing.t : -1, glide: hero.gliding });
  updateWorld(dt);
  updateFx(dt);
  followSun(hero.pos); followSky(); updateWater(dt);

  // звуки шагов, прыжка и приземления
  if (hero.jumped) SFX.jump();
  if (hero.grounded && !wasGrounded) { SFX.land(); if (lastVy < -9) dust(hero.pos); }
  lastVy = Math.min(hero.vel.y, 0);      // скорость падения в прошлом кадре — для пыли при приземлении
  wasGrounded = hero.grounded;
  if (hero.grounded && hero.speed > 2) { stepT -= dt * hero.speed / WALK; if (stepT <= 0) { stepT = 0.28; SFX.step(); } }

  renderer.render(scene, camera);

  if (Q.has('fps')) { fpsN++; fpsT += dt; if (fpsT >= 1) { fpsEl.textContent = fpsN + ' fps'; fpsN = 0; fpsT = 0; } }
}
requestAnimationFrame(frame);

// для отладки в консоли
// game.tick(сек) — прогнать игру вперёд без экрана (для проверок)
window.game = { hero, cam, input, get save() { return save; }, tick(sec) { for (let t = 0; t < sec; t += 1 / 60) update(1 / 60); } };
