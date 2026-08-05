/* ============================================================
   디자인 설정
   canvas로 그리는 하늘·구름·언덕의 색과 크기를 여기서 정한다.
   style.css 의 :root 변수와 짝이 맞도록 유지한다.
   ============================================================ */
const THEME = {
  // 활동명 해시가 이 색조 범위 안에서만 움직인다 (하늘색 유지)
  hueRange: [20, 260],

  sky: { topLight: 56, bottomLight: 87, sat: 72 },
  cloud: { color: 'rgba(255, 255, 255, 0.9)', count: [4, 8] },
  hill: { hueShift: -160, backLight: 62, frontLight: 45, sat: 38 },

  text: { color: '#ffffff', shadow: 'rgba(0, 0, 0, 0.25)' },
  font: 'system-ui, -apple-system, "Segoe UI", "Malgun Gothic", sans-serif',

  // 리캡 영상
  video: { width: 1280, height: 720, fps: 30, coverSec: 3, perActivitySec: 4, outroSec: 3 }
};
