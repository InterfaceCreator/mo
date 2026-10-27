// Эффекты: всплывающие значки, «zzz», конфетти, надписи над объектами.
import { T, scene, BOX, mat } from './engine.js';

const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
const texCache = {};
function canvasTex(key, w, h, draw) {
  if (texCache[key]) return texCache[key];
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  return (texCache[key] = new T.CanvasTexture(cv));
}
export function emojiTex(e) {
  return canvasTex('e' + e, 128, 128, (c, w, h) => { c.font = `100px ${EMOJI_FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(e, w / 2, h / 2 + 8); });
}
function zTex() {
  return canvasTex('Z', 128, 128, (c, w, h) => {
    c.font = 'bold 100px "Arial Rounded MT Bold",Arial,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.lineWidth = 14; c.strokeStyle = '#4c63d2'; c.strokeText('Z', w / 2, h / 2); c.fillStyle = '#fff'; c.fillText('Z', w / 2, h / 2);
  });
}
function drawCoin(c, x, y, r, stroke) {
  c.beginPath(); c.arc(x, y, r + 4, 0, 7); c.fillStyle = stroke; c.fill();
  c.beginPath(); c.arc(x, y, r, 0, 7); c.fillStyle = '#ffc21a'; c.fill();
  c.beginPath(); c.arc(x, y, r * 0.62, 0, 7); c.strokeStyle = '#e09000'; c.lineWidth = 4; c.stroke();
  c.beginPath(); c.arc(x - r * 0.35, y - r * 0.35, r * 0.18, 0, 7); c.fillStyle = '#fff6c0'; c.fill();
}
export function coinTex() { return canvasTex('coin', 128, 128, c => drawCoin(c, 64, 64, 52, '#a86a00')); }
export function sprite(tex, sx, sy = sx) {
  const s = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  s.scale.set(sx, sy, 1); s.renderOrder = 10; return s;
}

// надпись, которую можно менять (таймер над яйцом, доход над питомцем)
export function makeLabel(w = 2.4, h = 0.6) {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64;
  const tex = new T.CanvasTexture(cv), s = sprite(tex, w, h);
  // coin — нарисовать справа монетку (эмодзи монеты на разных устройствах выглядит по-разному)
  s.userData.set = (text, { color = '#fff', stroke = '#2b2340', coin = false } = {}) => {
    const key = text + color + coin; if (s.userData.text === key) return; s.userData.text = key;
    const c = cv.getContext('2d'); c.clearRect(0, 0, 256, 64);
    const font = px => `bold ${px}px "Arial Rounded MT Bold","Trebuchet MS",sans-serif`;
    c.font = font(44); c.textBaseline = 'middle';
    const room = 256 - 14 - (coin ? 48 : 0), w0 = c.measureText(text).width;
    if (w0 > room) c.font = font(Math.floor(44 * room / w0));        // длинный текст — шрифт поменьше, чтобы влез целиком
    const tw = c.measureText(text).width, cw = coin ? 48 : 0, x = (256 - tw - cw) / 2;
    c.lineWidth = 9; c.strokeStyle = stroke; c.lineJoin = 'round'; c.strokeText(text, x, 34); c.fillStyle = color; c.fillText(text, x, 34);
    if (coin) drawCoin(c, x + tw + 26, 33, 19, stroke);
    tex.needsUpdate = true;
  };
  return s;
}

// эффекты — функции, которые вызываются каждый кадр, пока возвращают true
const fx = [];
export const addFx = f => fx.push(f);
export function updateFx(dt) { for (let i = fx.length - 1; i >= 0; i--) if (!fx[i](dt)) fx.splice(i, 1); }

export function puff(e, pos, { size = 0.9, rise = 1.4, life = 1.2, dx = 0 } = {}) {
  const s = sprite(e === 'coin' ? coinTex() : emojiTex(e), size); s.position.copy(pos); scene.add(s);
  let t = 0;
  addFx(dt => {
    t += dt; s.position.y += rise * dt; s.position.x += dx * dt;
    s.material.opacity = t < 0.15 ? t / 0.15 : Math.max(0, 1 - (t - 0.15) / (life - 0.15));
    if (t >= life) { scene.remove(s); s.material.dispose(); return false; }
    return true;
  });
  return s;
}
export function spawnZ(pos, big = 1) {
  const s = sprite(zTex(), 0.5 * big); s.position.copy(pos); scene.add(s);
  let t = 0; const dx = 0.2 + Math.random() * 0.3;
  addFx(dt => {
    t += dt; s.position.y += dt * 0.7 * big; s.position.x += dt * dx;
    const k = 0.5 * big * (0.6 + t * 0.45); s.scale.set(k, k, 1);
    s.material.opacity = t < 0.3 ? t / 0.3 : Math.max(0, 1 - (t - 0.3) / 1.9);
    if (t > 2.2) { scene.remove(s); s.material.dispose(); return false; }
    return true;
  });
}
const CONF = [0xff5a5a, 0xff9f40, 0xffd93b, 0x5fd35f, 0x3fa7ff, 0x9b6bff, 0xff7ac8];
export function confetti(pos, n = 50) {
  for (let i = 0; i < n; i++) {
    const m = new T.Mesh(BOX, mat(CONF[i % CONF.length])); m.scale.setScalar(0.12 + Math.random() * 0.1);
    m.position.set(pos.x, pos.y + 1.5, pos.z); scene.add(m);
    const v = new T.Vector3(Math.random() * 8 - 4, 5 + Math.random() * 5, Math.random() * 8 - 4);
    let t = 0;
    addFx(dt => {
      t += dt; v.y -= 14 * dt; m.position.addScaledVector(v, dt); m.rotation.x += 6 * dt; m.rotation.y += 5 * dt;
      if (m.position.y < pos.y + 0.06) { m.position.y = pos.y + 0.06; v.set(0, 0, 0); }
      if (t > 2.5) { scene.remove(m); return false; }
      return true;
    });
  }
}
// предмет летит дугой из точки a в точку b
export function arc(obj, a, b, dur, height, done) {
  let t = 0;
  addFx(dt => {
    t = Math.min(t + dt / dur, 1);
    obj.position.lerpVectors(a, b, t); obj.position.y += Math.sin(t * Math.PI) * height;
    if (t >= 1) { done && done(); return false; }
    return true;
  });
}

// щепки и осколки от удара: короткие, разлетаются и падают
export function chips(pos, color, n = 8) {
  for (let i = 0; i < n; i++) {
    const m = new T.Mesh(BOX, mat(color)); m.scale.setScalar(0.1 + Math.random() * 0.12);
    m.position.copy(pos); scene.add(m);
    const a = Math.random() * Math.PI * 2, v = new T.Vector3(Math.cos(a) * 3, 3 + Math.random() * 3, Math.sin(a) * 3);
    let t = 0;
    addFx(dt => {
      t += dt; v.y -= 18 * dt; m.position.addScaledVector(v, dt); m.rotation.x += 10 * dt; m.rotation.z += 8 * dt;
      if (m.position.y < 0.05) { m.position.y = 0.05; v.set(0, 0, 0); }
      if (t > 0.9) { scene.remove(m); return false; }
      return true;
    });
  }
}

// пыль при приземлении: светлые клубочки расползаются по земле
export function dust(pos, n = 8) {
  for (let i = 0; i < n; i++) {
    const m = new T.Mesh(BOX, mat(0xe8e0d0)); m.scale.setScalar(0.25);
    m.position.set(pos.x, pos.y + 0.15, pos.z); scene.add(m);
    const a = i / n * Math.PI * 2, v = new T.Vector3(Math.cos(a) * 3, 0.6, Math.sin(a) * 3);
    let t = 0;
    addFx(dt => {
      t += dt; m.position.addScaledVector(v, dt); v.multiplyScalar(1 - dt * 4);
      m.scale.setScalar(0.25 + t * 0.5); m.material = mat(0xe8e0d0);
      if (t > 0.45) { scene.remove(m); return false; }
      return true;
    });
  }
}

// фейерверк: ракеты взлетают и рассыпаются цветными огоньками. onBoom — на каждый хлопок (звук)
const FW = [0xff4a4a, 0xffd23f, 0x5fd35f, 0x3fa7ff, 0xff7ac8, 0xffffff, 0xff9f40].map(c => { const m = new T.MeshBasicMaterial({ color: c }); m.userData.cached = true; return m; });
export function fireworks(center, n = 8, onBoom) {
  for (let i = 0; i < n; i++) setTimeout(() => {
    const m = FW[i % FW.length], from = new T.Vector3(center.x + (Math.random() - 0.5) * 18, center.y, center.z + (Math.random() - 0.5) * 18);
    const top = from.clone().setY(center.y + 16 + Math.random() * 8), rocket = new T.Mesh(BOX, m); rocket.scale.set(0.2, 0.6, 0.2); rocket.position.copy(from); scene.add(rocket);
    let t = 0;
    addFx(dt => {
      t += dt / 0.9; rocket.position.lerpVectors(from, top, 1 - (1 - Math.min(t, 1)) ** 2);
      if (t < 1) return true;
      scene.remove(rocket); onBoom && onBoom();
      for (let k = 0; k < 36; k++) {
        const s = new T.Mesh(BOX, FW[(i + (k % 2) * 3) % FW.length]); s.position.copy(top); scene.add(s);
        const v = new T.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(6 + Math.random() * 3);
        let u = 0;
        addFx(dt2 => {
          u += dt2; v.y -= 3 * dt2; v.multiplyScalar(Math.exp(-1.2 * dt2)); s.position.addScaledVector(v, dt2);
          s.scale.setScalar(Math.max(0.01, 0.35 * (1 - u / 1.8)));
          if (u >= 1.8) { scene.remove(s); return false; }
          return true;
        });
      }
      return false;
    });
  }, i * 450);
}
