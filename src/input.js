// Ввод: джойстик (левая часть экрана), поворот камеры (правая часть / мышь), прыжок, клавиатура.
import { canvas } from './engine.js';

const JOY_R = 62;                         // радиус хода ручки, px
const LOOK_SENS = 0.0075, LOOK_SENS_MOUSE = 0.005;

export const input = {
  move: { x: 0, y: 0 },                   // y < 0 — вперёд
  look: { dx: 0, dy: 0 },                 // накопленный поворот камеры за кадр
  zoom: 0,
  jump: false,                            // нажатие (сбрасывается после чтения)
  jumpHeld: false,
  lastLook: -1e9,                         // когда игрок последний раз крутил камеру (performance.now)
  onFirstTouch: null,
};

const joyEl = document.getElementById('joy'), knob = document.getElementById('knob'), jumpEl = document.getElementById('jump');
const joy = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
const looks = new Map();                  // pointerId → последняя позиция
const keys = {};
let first = true;

function firstTouch() { if (first) { first = false; input.onFirstTouch && input.onFirstTouch(); } }

function joyStart(e) {
  joy.id = e.pointerId; joy.ox = e.clientX; joy.oy = e.clientY; joy.x = joy.y = 0;
  joyEl.style.display = 'block'; joyEl.style.left = joy.ox + 'px'; joyEl.style.top = joy.oy + 'px'; knob.style.transform = '';
}
function joyEnd() { joy.id = null; joy.x = joy.y = 0; joyEl.style.display = 'none'; }

canvas.addEventListener('pointerdown', e => {
  firstTouch();
  try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
  const leftSide = e.clientX < innerWidth * 0.45;
  if (e.pointerType !== 'mouse' && leftSide && joy.id === null) joyStart(e);
  else looks.set(e.pointerId, { x: e.clientX, y: e.clientY, mouse: e.pointerType === 'mouse' });
});
window.addEventListener('pointermove', e => {
  if (e.pointerId === joy.id) {
    let dx = e.clientX - joy.ox, dy = e.clientY - joy.oy; const d = Math.hypot(dx, dy);
    if (d > JOY_R) { dx *= JOY_R / d; dy *= JOY_R / d; joy.ox = e.clientX - dx; joy.oy = e.clientY - dy; }   // круг едет за пальцем
    joy.x = dx / JOY_R; joy.y = dy / JOY_R;
    joyEl.style.left = joy.ox + 'px'; joyEl.style.top = joy.oy + 'px';
    knob.style.transform = `translate(${dx}px,${dy}px)`;
    return;
  }
  const l = looks.get(e.pointerId); if (!l) return;
  const s = l.mouse ? LOOK_SENS_MOUSE : LOOK_SENS;
  input.look.dx += (e.clientX - l.x) * s; input.look.dy += (e.clientY - l.y) * s;
  l.x = e.clientX; l.y = e.clientY; input.lastLook = performance.now();
});
function up(e) { if (e.pointerId === joy.id) joyEnd(); looks.delete(e.pointerId); }
window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
canvas.addEventListener('wheel', e => { input.zoom += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });

// прыжок
function jumpDown(e) { e.preventDefault(); firstTouch(); input.jump = true; input.jumpHeld = true; jumpEl.classList.add('on'); }
function jumpUp() { input.jumpHeld = false; jumpEl.classList.remove('on'); }
jumpEl.addEventListener('pointerdown', jumpDown);
jumpEl.addEventListener('pointerup', jumpUp); jumpEl.addEventListener('pointercancel', jumpUp); jumpEl.addEventListener('pointerleave', jumpUp);

// клавиатура
window.addEventListener('keydown', e => {
  firstTouch();
  if (e.code === 'Space' && !keys.Space) { input.jump = true; input.jumpHeld = true; }
  keys[e.code] = true;
});
window.addEventListener('keyup', e => { keys[e.code] = false; if (e.code === 'Space') input.jumpHeld = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; joyEnd(); looks.clear(); });

document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('dblclick', e => e.preventDefault());

// вызывается раз в кадр: собирает движение из джойстика или клавиш
export function pollInput() {
  if (joy.id !== null) { input.move.x = joy.x; input.move.y = joy.y; return; }
  let x = 0, y = 0;
  if (keys.KeyA || keys.ArrowLeft) x--; if (keys.KeyD || keys.ArrowRight) x++;
  if (keys.KeyW || keys.ArrowUp) y--; if (keys.KeyS || keys.ArrowDown) y++;
  const m = Math.hypot(x, y) || 1; input.move.x = x / m; input.move.y = y / m;
}
// забрать накопленное (поворот камеры, зум, прыжок)
export function takeLook() { const l = { ...input.look }; input.look.dx = input.look.dy = 0; return l; }
export function takeZoom() { const z = input.zoom; input.zoom = 0; return z; }
export function takeJump() { const j = input.jump; input.jump = false; return j; }
