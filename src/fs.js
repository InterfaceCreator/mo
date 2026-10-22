// Полный экран: Android, Chrome, iPad умеют; iPhone — нет (там только ярлык на экране «Домой»).
const d = document.documentElement;
export const FS = {
  can: !!(document.fullscreenEnabled || document.webkitFullscreenEnabled),
  on: () => !!(document.fullscreenElement || document.webkitFullscreenElement),
  enter() { const r = d.requestFullscreen?.() || d.webkitRequestFullscreen?.(); r?.catch?.(() => {}); },
  exit() { const r = document.exitFullscreen?.() || document.webkitExitFullscreen?.(); r?.catch?.(() => {}); },
};
// на телефоне и планшете — сразу во весь экран (вызывать прямо из нажатия: иначе браузер не разрешит)
export function goFull() { if (FS.can && !FS.on() && matchMedia('(pointer: coarse)').matches) FS.enter(); }
