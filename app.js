/* ============================================================
   디자인 설정
   canvas로 그리는 하늘·구름·언덕의 색과 크기를 여기서 정한다.
   style.css 의 :root 변수와 짝이 맞도록 유지한다.
   ============================================================ */
const THEME = {
  // 활동명 해시가 이 대역 중 하나로 떨어진다.
  // 초록(잔디색)을 피해야 언덕과 구분되고 하늘로 읽힌다.
  // 맑은 하늘이 기본이므로 그 대역을 두 번 넣어 더 자주 나오게 한다.
  hueBands: [
    [188, 215], // 맑은 하늘
    [205, 235], // 맑은 하늘
    [235, 270], // 늦은 오후
    [278, 315], // 노을 진 보라
    [12, 38]    // 해질 무렵 주황
  ],

  sky: { topLight: 58, bottomLight: 88, sat: 62 },

  // 구름은 글자를 덮지 않도록 화면 위쪽 띠 안에서만 떠 있는다
  cloud: { color: 'rgba(255, 255, 255, 0.9)', count: [3, 5], bandTop: 0.06, bandBottom: 0.24 },

  // 언덕은 하늘색이 어떻게 바뀌든 늘 초록이다
  hill: { hue: 95, backLight: 62, frontLight: 45, sat: 38 },

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
let isRecording = false;

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
const searchInput = document.getElementById('searchInput');
const weekSelector = document.getElementById('weekSelector');
const recapStatus = document.getElementById('recapStatus');
const recapCanvas = document.getElementById('recapCanvas');

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

// 오늘 날짜를 "YYYY-MM-DD" 로 돌려준다
function todayString() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

// 입력값을 검사해 첫 번째 실패 사유를 돌려준다
function validateActivity(input) {
  if (input.title === '') {
    return { ok: false, message: '활동명을 입력해 주세요.', field: titleInput };
  }
  if (input.date === '') {
    return { ok: false, message: '날짜를 골라 주세요.', field: dateInput };
  }
  if (input.date > todayString()) {
    return { ok: false, message: '미래 날짜는 입력할 수 없습니다.', field: dateInput };
  }
  if (!Number.isInteger(input.memberCount) || input.memberCount < 1) {
    return { ok: false, message: '참여 인원은 1명 이상의 정수여야 합니다.', field: memberCountInput };
  }
  return { ok: true };
}

// 폼 제출을 받아 활동을 추가한다
function handleSubmit(event) {
  event.preventDefault();

  const input = readForm();
  const result = validateActivity(input);
  if (!result.ok) {
    formError.textContent = result.message;
    result.field.focus();
    return;
  }

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

// 활동명을 하늘 색조(H)로 바꾼다. 같은 활동은 언제 봐도 같은 하늘이다
function hueOf(title) {
  const hash = hashCode(title);
  const bands = THEME.hueBands;
  const [min, max] = bands[hash % bands.length];
  return min + (Math.floor(hash / bands.length) % (max - min));
}

/* ============================================================
   조회
   ============================================================ */

// 검색어를 적용하고 최신순으로 정렬해 돌려준다
function getFilteredActivities() {
  const keyword = searchKeyword.trim().toLowerCase();

  return activities
    .filter((activity) => {
      if (keyword === '') {
        return true;
      }
      const haystack = `${activity.title} ${activity.place}`.toLowerCase();
      return haystack.includes(keyword);
    })
    .sort((a, b) => b.date.localeCompare(a.date));
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
    <button type="button" class="card__remove" title="이 기록 지우기">×</button>
    <div class="card__confirm">
      <span>이 날의 기록을 지울까요?</span>
      <button type="button" class="button button--danger button--small js-confirm">지우기</button>
      <button type="button" class="button button--ghost button--small js-cancel">그대로 두기</button>
    </div>
  `;
  card.querySelector('.card__date').textContent = formatDate(activity.date);
  card.querySelector('.card__title').textContent = activity.title;
  card.querySelector('.card__meta').textContent = meta;
  card.querySelector('.card__memo').textContent = activity.memo;

  // 삭제는 카드 안에서 한 번 더 확인받는다 (브라우저 confirm 창을 쓰지 않는다)
  card.querySelector('.card__remove').addEventListener('click', () => {
    card.classList.add('card--confirming');
  });
  card.querySelector('.js-cancel').addEventListener('click', () => {
    card.classList.remove('card--confirming');
  });
  card.querySelector('.js-confirm').addEventListener('click', () => {
    handleDelete(activity.id);
  });

  return card;
}

// 활동을 삭제한다. 확인 절차는 카드 쪽에서 이미 거쳤다
function handleDelete(id) {
  activities = activities.filter((activity) => activity.id !== id);
  saveActivities();
  render();
}

// 타임라인을 그린다
function renderList() {
  const list = getFilteredActivities();
  timeline.textContent = '';

  if (list.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    // 아직 아무것도 없는 것과 검색해서 안 나온 것은 다른 상황이다
    empty.textContent = searchKeyword.trim() === ''
      ? '아직 기록된 날이 없어요.\n첫 번째 이야기를 남겨보세요.'
      : '그런 날은 아직 없네요.';
    timeline.appendChild(empty);
    return;
  }

  list.forEach((activity) => timeline.appendChild(createCard(activity)));
}

/* ============================================================
   주차 묶기
   ============================================================ */

// 그 날이 속한 주의 월요일을 돌려준다
function mondayOf(date) {
  const day = new Date(`${date}T00:00:00`);
  const offset = (day.getDay() + 6) % 7; // 월요일을 0으로 맞춘다
  day.setDate(day.getDate() - offset);
  return day;
}

// 그 날이 속한 주의 키를 "2026-W32" 형태로 돌려준다
function getWeekKey(date) {
  const monday = mondayOf(date);
  const thursday = new Date(monday);
  thursday.setDate(monday.getDate() + 3); // 그 주의 목요일이 연도를 정한다

  const firstThursday = new Date(thursday.getFullYear(), 0, 4);
  firstThursday.setDate(firstThursday.getDate() - ((firstThursday.getDay() + 6) % 7) + 3);

  const week = 1 + Math.round((thursday - firstThursday) / (7 * 24 * 60 * 60 * 1000));
  return `${thursday.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

// "8월 첫째 주" 처럼 사람이 읽는 이름을 만든다
function weekLabel(monday) {
  const names = ['첫째', '둘째', '셋째', '넷째', '다섯째', '여섯째'];
  const nth = Math.floor((monday.getDate() - 1) / 7);
  return `${monday.getMonth() + 1}월 ${names[nth]} 주`;
}

// 활동을 주차별로 묶어 최신 주가 먼저 오도록 돌려준다
function groupByWeek() {
  const weeks = new Map();

  activities.forEach((activity) => {
    const key = getWeekKey(activity.date);
    if (!weeks.has(key)) {
      weeks.set(key, { key, monday: mondayOf(activity.date), items: [] });
    }
    weeks.get(key).items.push(activity);
  });

  return [...weeks.values()]
    .map((week) => ({
      ...week,
      label: weekLabel(week.monday),
      items: week.items.slice().sort((a, b) => a.date.localeCompare(b.date))
    }))
    .sort((a, b) => b.key.localeCompare(a.key));
}

// 영상으로 만들 주차 목록을 그린다
function renderWeekSelector() {
  const weeks = groupByWeek();
  weekSelector.textContent = '';

  if (weeks.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = '기록이 쌓이면 이곳에서 그 주의 영상을 만들 수 있어요.';
    weekSelector.appendChild(empty);
    return;
  }

  weeks.forEach((week) => {
    const row = document.createElement('div');
    row.className = 'week';
    row.innerHTML = `
      <div class="week__info">
        <strong class="week__label"></strong>
        <span class="week__count"></span>
      </div>
      <button type="button" class="button button--primary button--small js-recap">영상으로 보기</button>
    `;
    row.querySelector('.week__label').textContent = week.label;
    row.querySelector('.week__count').textContent = `함께한 ${week.items.length}일`;
    row.querySelector('.js-recap').addEventListener('click', () => createWeeklyRecap(week));
    weekSelector.appendChild(row);
  });
}

/* ============================================================
   하늘 그리기 (canvas)
   ============================================================ */

// 같은 씨앗이면 항상 같은 순서의 난수를 돌려준다
function makeRandom(seed) {
  let value = seed % 2147483647;
  if (value <= 0) {
    value += 2147483646;
  }
  return () => {
    value = (value * 16807) % 2147483647;
    return value / 2147483647;
  };
}

// 하늘 그라데이션을 칠한다
function drawSky(ctx, hue) {
  const { width, height } = ctx.canvas;
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, `hsl(${hue}, ${THEME.sky.sat}%, ${THEME.sky.topLight}%)`);
  gradient.addColorStop(1, `hsl(${hue}, ${THEME.sky.sat}%, ${THEME.sky.bottomLight}%)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

// 뭉게구름을 그린다. 배치는 씨앗으로 정해지므로 같은 활동은 같은 구름을 갖는다
function drawClouds(ctx, seed) {
  const { width, height } = ctx.canvas;
  const random = makeRandom(seed);
  const [minCount, maxCount] = THEME.cloud.count;
  const count = minCount + Math.floor(random() * (maxCount - minCount + 1));

  ctx.fillStyle = THEME.cloud.color;

  const bandTop = height * THEME.cloud.bandTop;
  const bandHeight = height * (THEME.cloud.bandBottom - THEME.cloud.bandTop);

  for (let i = 0; i < count; i += 1) {
    const centerX = random() * width;
    const centerY = bandTop + random() * bandHeight;
    const scale = 0.5 + random() * 0.6;
    const puffs = 4 + Math.floor(random() * 3);

    ctx.globalAlpha = 0.45 + random() * 0.3;
    for (let p = 0; p < puffs; p += 1) {
      const offsetX = (p - puffs / 2) * 42 * scale;
      const offsetY = (random() - 0.5) * 22 * scale;
      const radius = (32 + random() * 26) * scale;
      ctx.beginPath();
      ctx.arc(centerX + offsetX, centerY + offsetY, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.globalAlpha = 1;
}

// 평원 언덕 두 겹을 그린다
function drawHills(ctx) {
  const { width, height } = ctx.canvas;
  const hillHue = THEME.hill.hue;

  const layers = [
    { light: THEME.hill.backLight, top: height * 0.72, dip: height * 0.66 },
    { light: THEME.hill.frontLight, top: height * 0.82, dip: height * 0.78 }
  ];

  layers.forEach((layer) => {
    ctx.fillStyle = `hsl(${hillHue}, ${THEME.hill.sat}%, ${layer.light}%)`;
    ctx.beginPath();
    ctx.moveTo(0, layer.top);
    ctx.quadraticCurveTo(width * 0.25, layer.dip - 40, width * 0.5, layer.top);
    ctx.quadraticCurveTo(width * 0.75, layer.top + 40, width, layer.dip);
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();
  });
}

// 배경(하늘 + 구름 + 언덕)을 한 번에 그린다
function drawScene(ctx, hue, seed) {
  drawSky(ctx, hue);
  drawClouds(ctx, seed);
  drawHills(ctx);
}

// 글자를 그린다
function drawText(ctx, text, x, y, size, weight = 400, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `${weight} ${size}px ${THEME.font}`;
  ctx.fillStyle = THEME.text.color;
  ctx.shadowColor = THEME.text.shadow;
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 2;
  ctx.fillText(text, x, y);
  ctx.restore();
}

// 장면 위에 흰 막을 덮어 페이드 인/아웃을 만든다
function applyFade(ctx, progress) {
  const edge = 0.15;
  const visible = Math.max(0, Math.min(1, progress / edge, (1 - progress) / edge));
  if (visible < 1) {
    ctx.fillStyle = `rgba(255, 255, 255, ${1 - visible})`;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }
}

/* ============================================================
   리캡 프레임
   ============================================================ */

// 표지 프레임
function drawCoverFrame(ctx, week, progress) {
  drawScene(ctx, hueOf(week.key), hashCode(week.key));
  drawText(ctx, week.label, 96, 300, 92, 800);
  drawText(ctx, `우리가 함께한 ${week.items.length}일`, 96, 380, 44, 500);
  applyFade(ctx, progress);
}

// 활동 1건의 하늘 프레임
function drawActivityFrame(ctx, activity, progress) {
  drawScene(ctx, hueOf(activity.title), hashCode(activity.title));

  const meta = [activity.place, `${activity.memberCount}명이 함께함`].filter(Boolean).join('  ·  ');

  drawText(ctx, formatDate(activity.date), 96, 250, 34, 600, 0.9);
  drawText(ctx, activity.title, 96, 348, 82, 800);
  drawText(ctx, meta, 96, 410, 34, 500, 0.95);

  if (activity.memo) {
    const memo = activity.memo.length > 34 ? `${activity.memo.slice(0, 34)}…` : activity.memo;
    drawText(ctx, `“${memo}”`, 96, 480, 30, 400, 0.85);
  }

  applyFade(ctx, progress);
}

// 마무리 프레임
function drawOutroFrame(ctx, week, progress) {
  const total = week.items.reduce((sum, activity) => sum + activity.memberCount, 0);

  drawScene(ctx, hueOf(`${week.key}-outro`), hashCode(`${week.key}-outro`));
  drawText(ctx, `이번 주, ${total}명이 함께했어요`, 96, 320, 66, 800);
  drawText(ctx, '다음 주에도 만나요', 96, 396, 40, 500, 0.92);
  applyFade(ctx, progress);
}

/* ============================================================
   리캡 영상 (9단계에서 녹화를 붙인다)
   ============================================================ */

// 그 주의 장면을 순서대로 늘어놓는다
function buildScenes(week) {
  const { coverSec, perActivitySec, outroSec } = THEME.video;

  return [
    { seconds: coverSec, draw: (ctx, p) => drawCoverFrame(ctx, week, p) },
    ...week.items.map((activity) => ({
      seconds: perActivitySec,
      draw: (ctx, p) => drawActivityFrame(ctx, activity, p)
    })),
    { seconds: outroSec, draw: (ctx, p) => drawOutroFrame(ctx, week, p) }
  ];
}

// 경과 시간에 해당하는 장면을 canvas에 그린다
function drawAtTime(ctx, scenes, elapsed) {
  let remaining = elapsed;

  for (const scene of scenes) {
    if (remaining < scene.seconds) {
      scene.draw(ctx, remaining / scene.seconds);
      return true;
    }
    remaining -= scene.seconds;
  }

  return false; // 영상이 끝났다
}

// 이 브라우저가 영상 녹화를 지원하는지 본다
function canRecord() {
  return typeof MediaRecorder !== 'undefined'
    && typeof HTMLCanvasElement.prototype.captureStream === 'function';
}

// 만들어진 영상을 파일로 내려받는다
function downloadRecap(blob, week) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `recap-${week.key}.webm`;

  // 링크가 문서 안에 있어야 하고, 다운로드가 시작될 틈을 준 뒤에 URL을 버려야 한다.
  // 곧바로 revoke 하면 파일이 저장되지 않고 사라진다.
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

// 주간 리캡 영상을 만든다. canvas를 실시간으로 그리면서 그 화면을 그대로 녹화한다
function createWeeklyRecap(week) {
  if (isRecording) {
    return;
  }

  const ctx = recapCanvas.getContext('2d');
  const scenes = buildScenes(week);
  const totalSeconds = scenes.reduce((sum, scene) => sum + scene.seconds, 0);

  recapCanvas.style.display = 'block';
  drawAtTime(ctx, scenes, 0.5);

  if (!canRecord()) {
    recapStatus.textContent = '이 브라우저는 영상 저장을 지원하지 않아 미리보기만 보여드려요.';
    return;
  }

  const stream = recapCanvas.captureStream(THEME.video.fps);
  const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
  const chunks = [];

  recorder.addEventListener('dataavailable', (event) => {
    if (event.data.size > 0) {
      chunks.push(event.data);
    }
  });

  recorder.addEventListener('stop', () => {
    isRecording = false;
    setRecapButtonsDisabled(false);
    downloadRecap(new Blob(chunks, { type: 'video/webm' }), week);
    recapStatus.textContent = `${week.label} 영상을 저장했어요. (${Math.round(totalSeconds)}초)`;
  });

  isRecording = true;
  setRecapButtonsDisabled(true);
  recorder.start();

  const startedAt = performance.now();

  // 경과 시간에 맞는 장면을 계속 그린다. 그리는 화면이 곧 녹화되는 화면이다.
  // requestAnimationFrame 은 탭이 뒤로 가면 아예 멈춰 영상이 중간에 끊긴다.
  // setInterval 은 느려질 뿐 계속 돌기 때문에 이쪽을 쓴다.
  const timer = setInterval(() => {
    const elapsed = (performance.now() - startedAt) / 1000;

    if (!drawAtTime(ctx, scenes, elapsed)) {
      clearInterval(timer);
      recorder.stop();
      return;
    }

    const left = Math.max(0, Math.ceil(totalSeconds - elapsed));
    recapStatus.textContent = `${week.label} 영상을 만드는 중… ${left}초 남았어요`;
  }, 1000 / THEME.video.fps);
}

// 녹화 중에는 다른 주차 버튼을 눌러도 겹치지 않게 막는다
function setRecapButtonsDisabled(disabled) {
  weekSelector.querySelectorAll('.js-recap').forEach((button) => {
    button.disabled = disabled;
  });
}

// 화면 전체를 다시 그린다. 데이터가 바뀌면 항상 이 함수만 부른다
function render() {
  const list = getFilteredActivities();
  countLabel.textContent = list.length > 0 ? `${list.length}일` : '';
  renderList();
  renderWeekSelector();
}

/* ============================================================
   시작
   ============================================================ */
function init() {
  activities = loadActivities();

  // 달력에서 미래 날짜를 아예 고를 수 없게 한다 (검증은 제출할 때 한 번 더 한다)
  dateInput.max = todayString();

  form.addEventListener('submit', handleSubmit);

  searchInput.addEventListener('input', () => {
    searchKeyword = searchInput.value;
    render();
  });

  render();
}

init();
