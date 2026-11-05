// QR-коды для игры вдвоём: показать код на экране и отсканировать чужой камерой телефона.
// Библиотеки грузим, только когда понадобились: vendor/qrcode.js (рисует код), vendor/jsQR.js (читает с камеры).
const libs = {};
function lib(file, name) {
  if (window[name]) return Promise.resolve();
  return libs[file] || (libs[file] = new Promise((ok, no) => {
    const s = document.createElement('script'); s.src = 'vendor/' + file;
    s.onload = ok; s.onerror = () => { libs[file] = null; no(new Error(file)); }; document.head.appendChild(s);
  }));
}

// картинка с QR-кодом (data URL)
export async function makeQR(text) {
  await lib('qrcode.js', 'qrcode');
  const q = window.qrcode(0, 'L'); q.addData(text); q.make();
  return q.createDataURL(8, 2);
}

// сканер: камера на весь экран, рамка посередине; вернёт текст кода или null (отменили / нет камеры)
export async function scanQR(hint = 'Наведи камеру на QR-код на другом телефоне') {
  await lib('jsQR.js', 'jsQR');
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 } }, audio: false }); }
  catch (e) { return { error: e.name === 'NotAllowedError' ? 'camera' : 'nocamera' }; }
  const ov = document.createElement('div');
  ov.id = 'qrScan';
  ov.innerHTML = `<video playsinline muted autoplay></video><div class="frame"></div><p>${hint}</p><button>Отмена</button>`;
  document.body.appendChild(ov);
  const video = ov.querySelector('video'), cv = document.createElement('canvas'), cx = cv.getContext('2d', { willReadFrequently: true });
  video.srcObject = stream;
  try { await video.play(); } catch (e) {}
  return new Promise(done => {
    let stop = false;
    const finish = r => { if (stop) return; stop = true; stream.getTracks().forEach(t => t.stop()); ov.remove(); done(r); };
    ov.querySelector('button').onclick = () => finish(null);
    (function tick() {
      if (stop) return;
      if (video.readyState >= 2 && video.videoWidth) {
        const k = Math.min(1, 720 / Math.max(video.videoWidth, video.videoHeight));      // уменьшаем — быстрее читать
        cv.width = Math.round(video.videoWidth * k); cv.height = Math.round(video.videoHeight * k);
        cx.drawImage(video, 0, 0, cv.width, cv.height);
        const img = cx.getImageData(0, 0, cv.width, cv.height), code = window.jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
        if (code?.data) { if (navigator.vibrate) navigator.vibrate(60); finish({ text: code.data }); return; }
      }
      setTimeout(tick, 180);
    })();
  });
}
