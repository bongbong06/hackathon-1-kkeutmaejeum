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
const timeline = document.getElementById('timeline');

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
   하늘색 정하기
   활동명을 해시해 색조(H)를 정한다. 같은 활동은 언제 봐도 같은 하늘이다.
   ============================================================ */

// 문자열을 정수 해시로 바꾼다
function hashCode(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

// 활동명을 하늘 색조(H)로 바꾼다
function hueOf(title) {
  const [min, max] = THEME.hueRange;
  return min + (hashCode(title) % (max - min));
}

/* ============================================================
   조회
   ============================================================ */

// 화면에 보여줄 활동을 최신순으로 돌려준다
function getFilteredActivities() {
  return activities.slice().sort((a, b) => b.date.localeCompare(a.date));
}

/* ============================================================
   화면 그리기
   ============================================================ */

// 날짜를 "2026. 03. 02 월요일" 형태로 바꾼다
function formatDate(date) {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const [year, month, day] = date.split('-');
  const weekday = days[new Date(`${date}T00:00:00`).getDay()];
  return `${year}. ${month}. ${day} ${weekday}요일`;
}

// 활동 1건을 타임라인 카드로 만든다
function createCard(activity) {
  const hue = hueOf(activity.title);

  const card = document.createElement('article');
  card.className = 'card';
  card.style.setProperty('--card-hue', hue);

  const meta = [activity.place, `${activity.memberCount}명이 함께함`]
    .filter(Boolean)
    .join(' · ');

  card.innerHTML = `
    <p class="card__date"></p>
    <h3 class="card__title"></h3>
    <p class="card__meta"></p>
    <p class="card__memo"></p>
  `;
  card.querySelector('.card__date').textContent = formatDate(activity.date);
  card.querySelector('.card__title').textContent = activity.title;
  card.querySelector('.card__meta').textContent = meta;
  card.querySelector('.card__memo').textContent = activity.memo;

  return card;
}

// 타임라인을 그린다
function renderList() {
  const list = getFilteredActivities();
  timeline.textContent = '';

  if (list.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = '아직 기록된 날이 없어요.\n첫 번째 이야기를 남겨보세요.';
    timeline.appendChild(empty);
    return;
  }

  list.forEach((activity) => timeline.appendChild(createCard(activity)));
}

// 화면 전체를 다시 그린다. 데이터가 바뀌면 항상 이 함수만 부른다
function render() {
  const list = getFilteredActivities();
  countLabel.textContent = list.length > 0 ? `${list.length}일` : '';
  renderList();
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
