# 코덱스 작업 지시서 — 이미지·영상 제공자 자리 만들기

아래 내용을 그대로 붙여넣어 작업을 시작하면 된다.

---

## 작업 대상

```
D:\Work\claude code 특강\동아리 활동 기록 관리 웹앱
```

저장소: https://github.com/bongbong06/hackathon-1-kkeutmaejeum

현재 상태: 커밋 22회, 미푸시 0, 작업 트리 깨끗, 브라우저 검증 24항목 통과.
**지금 상태로 이미 제출 가능하다.** 이번 작업은 순수 추가이며, 실패하면 되돌리면 된다.

## 무엇을 만드나

리캡 영상의 **활동 이미지**와 **영상 생성**을, 나중에 로컬 AI 모델이나 외부 API로 갈아끼울 수 있도록 **교체 지점(provider)** 을 만든다.

**기본 동작은 지금과 완전히 같아야 한다.** 기본 제공자는 현재 구현(canvas 그리기 / MediaRecorder 녹화)이고, 설정 한 줄만 바꾸면 다른 구현으로 넘어가는 구조를 만드는 것이 목표다.

## 절대 건드리지 말 것

아래는 이미 검증이 끝났다. 동작이 바뀌면 실패다.

- 활동 등록 / 타임라인 조회 / 인라인 확인 삭제
- 입력값 검증 3종 (활동명 필수 / 미래 날짜 차단 / 인원 1 이상 정수)
- 활동명·장소 검색
- 반응형 레이아웃
- 기억의 산책길 (원근 길·나무·연·걷기·돌아보기·클릭 이동)
- `localStorage["activities"]` 데이터 구조
- 저장소 계층 (`loadActivities` / `saveActivities`) — **이번 작업 범위 아님**

## 파일

`index.html` / `style.css` / `app.js` 세 개뿐이다. **새 파일을 만들지 않는다.**

## 알아야 할 기존 코드 (app.js)

```js
// 파일 맨 위. 모든 설정값이 여기 모여 있다. 새 상수는 반드시 여기에 추가한다
const THEME = { hueBands, sky, cloud, hill, text, font, video, walk };

// 활동명 -> 하늘 색조. 카드 색 띠 / 연 색 / 영상 하늘색이 모두 이 값을 쓴다
function hueOf(title)
function hashCode(text)

// 배경 그리기
function drawSky(ctx, hue)
function drawClouds(ctx, seed, width, height)
function drawHills(ctx)
function drawScene(ctx, hue, seed)      // 위 셋을 묶어 호출
function drawText(ctx, text, x, y, size, weight, alpha)
function applyFade(ctx, progress)       // 장면 앞뒤 페이드

// 리캡 프레임 — 여기가 이미지 제공자를 꽂을 자리
function drawCoverFrame(ctx, week, progress)
function drawActivityFrame(ctx, activity, progress)   // <-- 핵심
function drawOutroFrame(ctx, week, progress)

// 리캡 장면 구성과 시간 계산
function buildScenes(week)              // [{ seconds, draw(ctx, progress) }]
function drawAtTime(ctx, scenes, elapsed)   // 끝났으면 false

// 녹화 파이프라인 — 여기가 영상 제공자를 꽂을 자리
function canRecord()
function downloadRecap(blob, week)
function createWeeklyRecap(week)        // <-- 핵심
```

주차 묶음 구조:

```js
groupByWeek() // -> [{ key: "2026-W32", monday: Date, label: "8월 첫째 주", items: [활동...] }]
```

활동 구조:

```js
{ id, title, date, place, memberCount, memo, createdAt }
```

---

## 작업 1 — 이미지 제공자

### 요구사항

`THEME` 아래에 제공자 묶음을 추가한다.

```js
/* ============================================================
   활동 이미지 제공자
   활동 하나를 받아 이미지를 돌려준다. null 이면 canvas 가 직접 하늘을 그린다.
   여기 한 줄만 바꾸면 로컬 모델이나 외부 API 로 갈아끼울 수 있다.
   ============================================================ */
const imageProviders = {
  // 기본값. 지금까지 하던 대로 canvas 가 하늘을 그린다
  canvas: {
    async imageFor() { return null; }
  },

  // 로컬 Stable Diffusion (A1111 / ComfyUI 계열)
  local: {
    async imageFor(activity) { ... }
  },

  // 외부 이미지 생성 API
  api: {
    async imageFor(activity) { ... }
  }
};

const imageProvider = imageProviders.canvas;   // <-- 교체 지점
```

`local` 과 `api` 는 **실제로 호출되지 않는 참고 구현**이어도 된다. 호출 규약(활동을 받아 `data:` URL 또는 `null` 을 돌려준다)만 명확하면 된다. 다만 코드가 문법적으로 올바르고, 어떤 엔드포인트에 무엇을 보내는지 주석으로 분명히 적어야 한다.

### 반드시 지킬 제약 — data: URL

**이미지는 반드시 `data:` URL 이어야 한다.**

일반 `https://` 이미지를 canvas 에 그리면 canvas 가 오염(tainted)되고, `captureStream()` 이 `SecurityError` 로 막혀 **리캡 영상 녹화가 통째로 죽는다.** `data:` URL 은 same-origin 으로 취급되어 오염되지 않는다.

이 제약을 다음 세 곳에 적는다.

1. `imageProviders` 블록 위 주석
2. `README.md`
3. 각 제공자 구현의 반환부 주석

외부 API 가 `https://` URL 만 돌려준다면, 제공자 안에서 `fetch` → `blob` → `FileReader.readAsDataURL` 로 변환해서 돌려주어야 한다. (이때도 그 서버가 CORS 를 허용해야 한다.)

### 프레임에 반영하기

`drawActivityFrame(ctx, activity, progress)` 를 이렇게 바꾼다.

- 그 활동의 이미지가 준비돼 있으면: 이미지를 프레임 전체에 `cover` 방식으로 그리고, 그 위에 그 활동의 하늘색을 반투명으로 덮어 톤을 통일한 뒤, 아래쪽에 어두운 그라데이션을 깔아 글자 가독성을 확보한다
- 이미지가 없으면: **지금과 완전히 똑같이** `drawScene` 으로 하늘을 그린다

글자(날짜·활동명·장소·인원·메모)는 두 경우 모두 동일하게 올린다.

`drawActivityFrame` 은 동기 함수이고 녹화 루프에서 매 프레임 호출되므로 **여기서 `await` 하면 안 된다.** 이미지는 미리 받아 캐시에 넣어 두고, 그리기는 캐시만 조회한다.

```js
const imageCache = new Map();   // activity.id -> HTMLImageElement

// 녹화를 시작하기 전에 그 주 활동 이미지를 미리 받아 둔다
async function preloadImages(week) { ... }
```

`createWeeklyRecap(week)` 맨 앞에서 `await preloadImages(week)` 를 호출한다. 이미지 로딩이 실패하면 조용히 건너뛰고 canvas 하늘로 대체한다. **어떤 경우에도 영상 생성 자체가 실패하면 안 된다.**

기본 제공자(`canvas`)는 항상 `null` 을 돌려주므로 캐시가 비고, 결과적으로 **현재 동작이 그대로 유지된다.**

---

## 작업 2 — 영상 제공자

```js
/* ============================================================
   영상 제공자
   그 주의 리캡 영상을 만든다.
   ============================================================ */
const videoProviders = {
  // 기본값. 브라우저에서 canvas 를 실시간 녹화한다 (지금 방식)
  browser: {
    async render(week, onProgress) { ... }   // -> Blob
  },

  // 외부 영상 생성 API. 활동 데이터를 보내고 완성된 영상을 받는다
  api: {
    async render(week, onProgress) { ... }   // -> Blob
  }
};

const videoProvider = videoProviders.browser;   // <-- 교체 지점
```

`createWeeklyRecap(week)` 을 다음 역할로 정리한다.

- 진행률 표시 (`recapStatus`), 버튼 잠금 (`setRecapButtonsDisabled`), 완료 후 다운로드 (`downloadRecap`) 는 그대로 유지
- 실제 영상 생성은 `videoProvider.render(week, onProgress)` 에 위임
- 현재의 `MediaRecorder` + `setInterval` 코드는 `videoProviders.browser.render` 안으로 옮긴다

**주의**: 그리기 루프는 반드시 `setInterval` 을 유지한다. `requestAnimationFrame` 은 탭이 백그라운드로 가면 완전히 멈춰서 영상이 잘린다. 실제로 그 버그를 겪고 고친 부분이며, 되돌리면 안 된다. (`app.js` 해당 위치에 주석이 있다.)

`canRecord()` 로 `MediaRecorder` 미지원 브라우저를 거르는 처리도 유지한다.

---

## 검증

작업 후 브라우저에서 아래를 전부 확인한다. 로컬 서버로 열면 된다.

```bash
python -m http.server 8899
# http://127.0.0.1:8899/index.html
```

| # | 확인 항목 | 기대 결과 |
|---|---|---|
| 1 | 기록 등록 / 삭제 / 검색 | 이전과 동일하게 동작 |
| 2 | 입력값 검증 3종 | 이전과 동일하게 차단 |
| 3 | 산책길 걷기·돌아보기·연 호버·클릭 | 이전과 동일 |
| 4 | 리캡 영상 생성 | 진행률 표시 후 `.webm` 다운로드 |
| 5 | **영상 길이** | 표지 3초 + 활동수 × 4초 + 마무리 3초 |
| 6 | 콘솔 | 오류 없음 |

영상 길이는 눈으로 보지 말고 반드시 실제로 잰다. 파일이 만들어지고 재생돼도 길이가 잘려 있을 수 있다. (실제로 14초짜리가 3초로 잘린 적이 있다.)

```bash
ffprobe -v error -show_entries format=duration,size \
  -show_entries stream=codec_name,width,height \
  -of default=noprint_wrappers=1 "<받은 파일>"
```

## 커밋 규칙

기능 하나가 동작하면 바로 커밋한다. 몰아서 하지 않는다.

```
이미지제공자: 활동 이미지 교체 지점 추가
영상제공자: 리캡 영상 생성 교체 지점 추가
문서: 제공자 교체 방법 README 반영
```

## 마감

**16:40 이후 커밋은 인정되지 않는다.** 그 전에 push 를 끝낸다.

작업이 꼬이면 되돌린다. 커밋된 상태는 항상 동작한다.

```bash
git checkout -- .
git log --oneline | head -1
```

## 참고

- 프로젝트 규칙: `CLAUDE.md`
- 설계 문서: `docs/superpowers/specs/2026-08-05-club-activity-log-design.md`
- 작업 기록: `docs/prompt-log.md`
- `alert` / `confirm` / `prompt` 등 브라우저 모달을 쓰지 않는다 (자동 테스트가 막힌다)
- 새 상수는 코드 안에 흩뿌리지 말고 `app.js` 의 `THEME` 또는 `style.css` 의 `:root` 에 모은다
