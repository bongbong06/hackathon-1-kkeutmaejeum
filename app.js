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

/* ============================================================
   상태
   localStorage 가 유일한 진실 소스다. 화면은 항상 여기서 다시 그린다.
   ============================================================ */
const STORAGE_KEY = 'activities';

let activities = [];
let searchKeyword = '';

/* ============================================================
   화면 요소
   ============================================================ */
const form = document.getElementById('activityForm');
const titleInput = document.getElementById('titleInput');
const dateInput = document.getElementById('dateInput');
const placeInput = document.getElementById('placeInput');
const memberCountInput = document.getElementById('memberCountInput');
const memoInput = document.getElementById('memoInput');
const formError = document.getElementById('formError');
const countLabel = document.getElementById('countLabel');

/* ============================================================
   저장소
   ============================================================ */

// localStorage에서 활동 배열을 읽는다. 값이 깨져 있으면 빈 배열로 넘어간다
function loadActivities() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('저장된 기록을 읽지 못했습니다. 빈 목록으로 시작합니다.', error);
    return [];
  }
}

// 활동 배열을 localStorage에 저장한다
function saveActivities() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(activities));
}

/* ============================================================
   활동 등록
   ============================================================ */

// 활동마다 겹치지 않는 id를 만든다
function createId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// 폼에 입력된 값을 읽어 온다
function readForm() {
  return {
    title: titleInput.value.trim(),
    date: dateInput.value,
    place: placeInput.value.trim(),
    memberCount: Number(memberCountInput.value),
    memo: memoInput.value.trim()
  };
}

// 폼 제출을 받아 활동을 추가한다
function handleSubmit(event) {
  event.preventDefault();

  const input = readForm();
  activities.push({
    id: createId(),
    ...input,
    createdAt: new Date().toISOString()
  });

  saveActivities();
  form.reset();
  formError.textContent = '';
  render();
}

/* ============================================================
   화면 그리기
   ============================================================ */

// 화면 전체를 다시 그린다. 데이터가 바뀌면 항상 이 함수만 부른다
function render() {
  countLabel.textContent = activities.length > 0 ? `${activities.length}일` : '';
}

/* ============================================================
   시작
   ============================================================ */
function init() {
  activities = loadActivities();
  form.addEventListener('submit', handleSubmit);
  render();
}

init();
