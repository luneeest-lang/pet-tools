# 데스크톱 펫 1단계 (바탕화면 위의 펫) 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 도트 펫이 Windows 작업 표시줄 위에서 스스로 지내고, 밥 주기·쓰다듬기·집어 옮기기가 되고, 상태가 저장되는 시험용 설치 파일을 만든다.

**Architecture:** 그림 생성(`src/sprites`)과 펫 시뮬레이션(`src/core`)은 Electron에 의존하지 않는 순수 JavaScript로 만들고 Node 테스트로 검증한다. Electron 메인 프로세스가 시뮬레이션을 돌리고 펫 창을 옮긴다. 렌더러는 받은 프레임을 그리고 투명 픽셀 위 클릭을 통과시키는 일만 한다.

**Tech Stack:** Node 22, Electron(최신 안정판), electron-builder(NSIS), `node:test` + `node:assert`(외부 테스트 라이브러리 없음), GitHub Actions(ubuntu에서 테스트, windows에서 설치 파일 빌드).

**Spec:** `docs/superpowers/specs/2026-11-26-desktop-pet-design.md`

이 계획은 설계 문서의 4단계 중 1단계다. 창 위 올라가기(6.4절의 창 부분)와 전체 화면 숨기기는 2단계, 만들기·입양 창(4.1~4.3절)은 3단계, 익명 통계·소개 페이지·자동 업데이트(9장)는 4단계 계획에서 다룬다. 1단계에서는 첫 실행 때 추천 조합 `shiba`(이름 "보리")를 자동으로 입양한 상태로 시작한다. 이 동작은 3단계에서 첫 실행 화면으로 바뀐다.

## Global Constraints

- 대상: Windows 10, 11 (64비트). 개발과 테스트는 Linux 클라우드에서, 실제 동작 확인은 사용자 PC에서 설치 파일로 한다.
- 런타임 의존성은 Electron만. 1단계에서는 네트워크 요청을 하나도 하지 않는다.
- 그림 격자는 48×40칸. 화면 크기 배수는 2, 3(기본), 4.
- 수치(설계 6.1, 6.3절): 배부름 10분에 4 감소, 기분 10분에 3 감소(자는 동안 감소 없음), 밥 +35 배부름·+5 기분, 쓰다듬기 +12 기분(3초 안 반복은 무효), 꺼져 있던 동안의 감소는 40 아래로 내려가지 않음, 30 미만이면 시무룩. 친밀도: 밥 +3, 쓰다듬기 +2(1분 최대 +6), 그날 첫 돌봄 +5, 30/80/150에서 `stretch`/`roll`/`chase` 해금, 친밀도는 줄지 않음.
- 반목표(설계 2장): 아프거나 다치는 모습 금지, 투명 부분 클릭은 뒤 창으로 통과, 펫 창은 포커스를 빼앗지 않음, 작업 표시줄·Alt+Tab에 나오지 않음, "준비 중" 같은 자리 표시 UI 금지, 사진·데이터를 밖으로 보내지 않음.
- 화면 문구는 한국어와 영어 둘 다. 첫 언어는 Windows 언어(`ko`로 시작하면 한국어, 아니면 영어).
- 저장 파일: `app.getPath('userData')/save.json`, 설계 8장의 모양(`version: 1`).

## Review Focus

1. **저장 파일이 깨졌거나 비어 있을 때** → 앱이 죽지 않고, 깨진 파일을 `save.broken-<시각>.json`으로 옮긴 뒤 새로 시작한다. (Task 8)
2. **PC 시계가 뒤로 바뀌었을 때**(경과 시간이 음수) → 수치 변화 없음, 친밀도 "그날 첫 돌봄"이 두 번 주어지지 않는다. (Task 5)
3. **몇 달 만에 켰을 때** → 배부름·기분이 정확히 40에서 멈추고(그보다 높던 값은 그대로가 아니라 감소 후 40 하한), NaN이나 음수가 나오지 않는다. (Task 5)
4. **모니터를 뽑거나 해상도를 바꿨을 때** 펫이 사라진 화면에 남아 있음 → 가장 가까운 화면의 바닥으로 옮겨진다. (Task 7)
5. **펫을 모든 화면 밖이나 화면 위쪽 끝 너머에 놓았을 때** → 가장 가까운 화면 안쪽으로 끌어와서 떨어져 착지한다. (Task 7)

---

## 파일 구조

```
package.json                     # 스크립트: test, start, dist
src/sprites/shapes.js            # 타원·삼각형·체인 판정, 법선
src/sprites/palette.js           # 색 → 명암 단계, 스펙 → 팔레트
src/sprites/poses.js             # 스펙 + 동작 → 부위 목록
src/sprites/render.js            # 부위 → 48×40 색 배열 (얼굴 포함)
src/sprites/presets.js           # 추천 조합 12개
src/sprites/frames.js            # 동작 목록, 스펙 하나의 모든 프레임 만들기
src/core/stats.js                # 배부름·기분
src/core/affinity.js             # 친밀도·해금
src/core/brain.js                # 다음 행동 고르기
src/core/physics.js              # 낙하·착지
src/core/floors.js               # 바닥 선 계산, 화면 밖 보정
src/core/save.js                 # 저장 파일
src/main/main.js                 # 앱 시작, 단일 인스턴스
src/main/petController.js        # 시뮬레이션 루프, 펫 창 이동
src/main/petWindow.js            # 투명 펫 창 만들기
src/main/tray.js                 # 트레이·오른쪽 클릭 메뉴
src/main/settingsWindow.js       # 설정 창
src/main/i18n.js                 # 문구 (ko, en)
src/main/diagnostics.js          # 진단 모드, 로그 내보내기
src/preload/pet.js               # 렌더러 ↔ 메인 통로
src/renderer/pet.html, pet.js    # 프레임 그리기, 클릭 통과 판정, 말풍선
src/renderer/settings.html, settings.js
tools/sheet.js                   # 그림 시트 HTML 만들기 (사람이 눈으로 확인)
test/**/*.test.js
.github/workflows/test.yml, build-windows.yml
docs/checklists/m1-windows.md    # 사용자 PC 확인 체크리스트
```

`prototype/`은 그대로 둔다. 테스트에서 비교 기준으로 쓴다.

---

### Task 1: 프로젝트 뼈대와 CI 테스트

**Files:**
- Create: `package.json`, `.gitignore`, `test/smoke.test.js`, `.github/workflows/test.yml`

**Interfaces:**
- Produces: `npm test` = `node --test test/` ; `npm start` = `electron .` ; `main` 필드는 `src/main/main.js`

- [ ] **Step 1:** `package.json` 작성. `name: "pet-tools"`, `private: true`, `devDependencies`: `electron`, `electron-builder`. `.gitignore`: `node_modules/`, `dist/`, `out/`.
- [ ] **Step 2:** `test/smoke.test.js`: `require('../prototype/sprites/pixel-pet.js')` 후 `globalThis.PixelPet.render('shiba','sit',0,{}).px.length === 1920`.
- [ ] **Step 3:** `npm install && npm test` → PASS 1개.
- [ ] **Step 4:** `.github/workflows/test.yml`: push 시 ubuntu-latest, Node 22, `npm ci`, `npm test`.
- [ ] **Step 5:** 커밋 `chore: scaffold electron project with node tests`

### Task 2: 그림 생성기를 스펙 기반으로 옮기기

프로토타입(`prototype/sprites/pixel-pet.js`)의 그리기 로직을 모듈로 나누고, 품종 키 대신 스펙(설계 5.2절)을 받게 한다.

**Files:**
- Create: `src/sprites/shapes.js`, `src/sprites/palette.js`(이 Task에서는 `buildPalette`의 `spec.palette` 경로만), `src/sprites/poses.js`, `src/sprites/render.js`, `src/sprites/presets.js`(6개만), `test/sprites/parity.test.js`

**Interfaces:**
- Produces:
  - `PetSpec` = `{ species:'dog'|'cat', ears:'pointy'|'floppy'|'cat', tail:'curl'|'plume'|'long', pattern:string[], fluffy:boolean, colors:{main:string, second:string|null}, eye:string, palette?:object, shape?:{bigMuzzle?:boolean, chest?:boolean} }`
  - 프로토타입 품종 플래그와의 대응: `muzzle`/`belly`/`socks`/`brows`/`stripes` = `pattern` 포함 여부, `tuxedo` = `shape.bigMuzzle && shape.chest && pattern.includes('socks')`, `blaze` = 이마 흰 줄(`bigMuzzle`이 그리던 이마 줄을 따로 켜는 플래그).
  - `renderFrame(spec: PetSpec, pose: string, frame: number, flags: {blink?,happy?,yawn?,sad?}) -> { w:48, h:40, px: (string|null)[1920] /* '#rrggbb' */, shadow: boolean[1920] }`
  - `PRESETS: Array<{ id:string, name:{ko:string,en:string}, spec:PetSpec }>` — id: `shiba`, `maltese`, `blacktan`, `cheese`, `tuxedo`, `russian`. 프로토타입 팔레트를 `spec.palette`로 그대로 담는다. 기본 이름: 보리/Bori, 두부/Tofu, 까미/Kkami, 치즈/Cheese, 턱이/Tux, 하늘/Haneul.

- [ ] **Step 1: 실패하는 테스트**

```js
// test/sprites/parity.test.js
test('presets render pixel-identical to the prototype', () => {
  const cases = [['walk',0..5,{}], ['sit',0,{}], ['sit',1,{happy:true}], ['sit',0,{blink:true}], ['sit',0,{yawn:true}], ['sleep',0,{}], ['sleep',1,{}]];
  for (const p of PRESETS) for (const [pose, f, flags] of expand(cases)) {
    const proto = PixelPet.render(p.id, pose, f, flags);          // 프로토타입: 키 → pal[키]
    const want = proto.px.map(k => k ? proto.pal[k] : null);
    assert.deepEqual(renderFrame(p.spec, pose, f, flags).px, want, `${p.id} ${pose} ${f}`);
  }
});
```

- [ ] **Step 2:** `npm test` → FAIL (모듈 없음)
- [ ] **Step 3:** 프로토타입 코드를 위 파일들로 옮긴다. 동작은 바꾸지 않는다. `CFG`(눈 모양)는 `render.js` 안 상수로.
- [ ] **Step 4:** `npm test` → PASS
- [ ] **Step 5:** 커밋 `feat(sprites): spec-driven sprite renderer with prototype parity`

### Task 3: 색에서 명암 만들기와 추천 조합 12개

**Files:**
- Modify: `src/sprites/palette.js`, `src/sprites/presets.js`
- Create: `tools/sheet.js`, `test/sprites/palette.test.js`

**Interfaces:**
- Produces:
  - `rampFromColor(hex: string) -> { 0:string,1:string,2:string,3:string,4:string, outline:string, outlineLit:string }`
  - `buildPalette(spec: PetSpec) -> object` — `spec.palette`가 있으면 그것, 없으면 `colors.main`으로 F0~F4·O·OL, `colors.second ?? colors.main`으로 C0~C4·OC·OCL, `eye`로 IR·IR2를 만든다. 코·입·볼·혀 색은 종과 털 밝기로 고른다.
  - `node tools/sheet.js [--presets] [--spec file.json] > out.html` — 모든 동작 × 대상의 그림 시트 HTML

색 변환 규칙(HSL, `h`는 도, `s`·`l`은 0~1, 결과는 0~1로 자름). 노랑 쪽 = 50°, 붉은 보라 쪽 = 330°, "쪽으로 n°" = 짧은 방향으로 n°:

| 단계 | 밝기 | 색조 | 채도 |
|---|---|---|---|
| 0 | +0.20 | 노랑 쪽 10° | −0.05 |
| 1 | +0.10 | 노랑 쪽 6° | +0.02 |
| 2 | 원래 색 | | |
| 3 | −0.13 | 붉은 보라 쪽 10° | +0.05 |
| 4 | −0.27 | 붉은 보라 쪽 18° | +0.02 |
| outline | 0.12 고정 | 4단계 색조 | 0.30 |
| outlineLit | 0.25 고정 | 4단계 색조 | 0.25 |

- [ ] **Step 1: 실패하는 테스트**
  - `ramp steps get darker`: `#e48b3c`, `#f5f1ec`, `#443b4a`, `#8593ad` 각각 상대 휘도가 0 > 1 > 2 > 3 > 4 순서.
  - `step 2 is the input color`: `rampFromColor('#e48b3c')[2] === '#e48b3c'`.
  - `explicit palette wins`: `buildPalette(PRESETS.find(p => p.id === 'shiba').spec).F3 === '#bf5f3a'`.
  - `single-color coat`: `colors.second === null`이면 `C2 === F2`.
  - `12 presets`: `PRESETS.length === 12`, 강아지 6·고양이 6, id 중복 없음, 모든 프리셋이 모든 동작을 예외 없이 그린다.
- [ ] **Step 2:** `npm test` → FAIL
- [ ] **Step 3:** `rampFromColor`, `buildPalette` 구현. 새 추천 조합 6개(강아지 3: 웰시코기 느낌, 푸들 느낌, 흰 비숑 느낌 / 고양이 3: 검은 고양이, 삼색이 느낌, 고등어 태비)를 `colors` 기반(팔레트 없이)으로 추가. 기본 이름은 한국어·영어 짝으로 정한다.
- [ ] **Step 4:** `npm test` → PASS
- [ ] **Step 5:** `node tools/sheet.js --presets > out/presets.html`을 Playwright로 스크린샷(`deviceScaleFactor: 1`)해서 직접 본다. 자동 명암으로 그린 새 6마리가 기존 6마리 옆에서 어색하지 않은지 확인하고, 어색하면 색 규칙이나 프리셋 색을 고친다.
- [ ] **Step 6:** 커밋 `feat(sprites): auto shading from fur color and twelve presets`
- [ ] **Step 7 (사용자 확인 관문):** 시트 스크린샷을 사용자에게 보여 주고 12마리 목록과 생김새를 확인받는다. 확인 전에는 Task 4로 넘어가지 않는다.

### Task 4: 새 동작 그림

**Files:**
- Modify: `src/sprites/poses.js`, `src/sprites/render.js`
- Create: `src/sprites/frames.js`, `test/sprites/frames.test.js`

**Interfaces:**
- Produces:
  - `POSES` — 아래 표의 동작 이름과 프레임 수. 기존: `walk`(6), `sit`(2), `sleep`(2).
  - `FRAME_LIST: Array<{pose:string, frame:number, flags:object, key:string}>` — 키 형식 `'<pose>:<frame>:<flag,flag>'` (예: `'sit:1:happy'`, `'walk:3:'`).
  - `renderAllFrames(spec: PetSpec) -> Map<string, {px, shadow}>`

| 동작 | 프레임 | 생김새 기준 |
|---|---|---|
| `sad` (sit 변형 플래그 `sad`) | 2 | 귀 끝이 처지고(선 귀는 바깥쪽으로 눕고), 눈은 위가 평평한 반쯤 감은 눈, 입은 일자 |
| `crouch` | 1 | 몸이 1.5칸 낮아지고 머리가 2칸 숙여짐, 뒷다리 굽힘 |
| `air` | 2 | 0: 오르는 중(다리를 몸 아래로 접음), 1: 내려오는 중(앞다리를 앞으로 뻗음) |
| `land` | 1 | 몸이 가로로 약 8% 넓고 세로로 약 15% 낮게 눌림, 다리 짧게 |
| `fall` | 1 | 네 다리를 벌림, 눈이 동그랗게 커진 놀란 눈(흰자 없이 큰 동그라미 + 반짝임), 다친 표정 없음 |
| `held` | 2 | 목덜미를 잡힌 것처럼 몸이 세로로 늘어지고 다리가 아래로 대롱거림, 0/1에서 다리가 1칸 흔들림 |
| `lookdown` | 1 | 앉은 자세에서 머리가 진행 방향 아래로 기울어짐 |
| `stretch` | 2 | 앞다리를 쭉 뻗고 엉덩이를 들어 올림(0), 원래대로(1) |
| `roll` | 2 | 등을 대고 누워 네 다리를 위로(0/1에서 다리 흔들림), 기분 좋은 웃는 눈 |
| `chase` | 4 | 제자리에서 꼬리를 쫓아 도는 동작: 옆모습 → 뒤돌아 꼬리 보기를 번갈아 |

- [ ] **Step 1: 실패하는 테스트** — 12개 프리셋 × `FRAME_LIST` 전부:
  - 예외 없이 그려지고, 칠해진 칸이 300칸 이상(빈 그림 방지).
  - 모든 칠해진 칸이 격자 안(`px.length === 1920`).
  - 같은 동작의 프레임끼리 서로 다르다(움직임이 있음), 1프레임 동작 제외.
  - `fall`, `land` 그림에 혀 색(`P`)과 하품 입(`PD`)이 없다(다친/괴로운 표정 방지 장치).
- [ ] **Step 2:** `npm test` → FAIL
- [ ] **Step 3:** 동작별 부위 배치를 `poses.js`에, 새 얼굴(반쯤 감은 눈, 놀란 눈, 일자 입)을 `render.js`에 추가.
- [ ] **Step 4:** `npm test` → PASS
- [ ] **Step 5:** `tools/sheet.js`로 전체 시트를 만들어 스크린샷으로 직접 본다. 표의 생김새 기준과 다르거나, 강아지·고양이 중 한쪽이 어색하면 고친다.
- [ ] **Step 6:** 커밋 `feat(sprites): jump, fall, held, sad and unlockable poses`
- [ ] **Step 7 (사용자 확인 관문):** 시트를 사용자에게 보여 주고 확인받는다.

### Task 5: 배부름·기분과 친밀도

**Files:**
- Create: `src/core/stats.js`, `src/core/affinity.js`, `test/core/stats.test.js`, `test/core/affinity.test.js`

**Interfaces:**
- Produces:
  - `Stats = { full:number, mood:number, updatedAt:number /*ms*/ }`
  - `decay(stats: Stats, now: number, opts: {running:boolean, sleeping:boolean}) -> Stats`
  - `feed(stats, now) -> Stats` ; `pat(stats, now, lastPatAt:number|null) -> {stats, counted:boolean}`
  - `isSad(stats) -> boolean`
  - `Affinity = { points:number, unlocked:string[], lastCareDay:string|null /*'YYYY-MM-DD' 로컬*/, patWindow:{start:number, gained:number} }`
  - `addCare(aff: Affinity, kind:'feed'|'pat', now:number, localDay:string) -> { aff: Affinity, newlyUnlocked: string[] }`
  - `UNLOCKS = [{at:30,id:'stretch'},{at:80,id:'roll'},{at:150,id:'chase'}]`

- [ ] **Step 1: 실패하는 테스트** (값은 Global Constraints 그대로)
  - `decay while running`: full 70, mood 70, 10분 경과, running → full 66, mood 67.
  - `no mood decay while sleeping`: sleeping → mood 70 그대로, full 66.
  - `offline floor 40`: full 50, 1000시간 경과, running:false → 40. full 35에서 오프라인 경과 → 35 그대로(이미 40 미만이면 더 내려가지 않음).
  - `months offline`: 180일 경과 → 40, `Number.isFinite`.
  - `clock went backwards`: now < updatedAt → 수치 그대로, `updatedAt = now`.
  - `feed`: full 80 → 100(상한), mood +5. `pat` 3초 안 반복 → `counted:false`.
  - `sad below 30`: full 29 → true, full 30·mood 30 → false.
  - `affinity`: 첫 밥 → +3 +5(그날 첫 돌봄) = 8. 같은 날 두 번째 밥 → +3. 1분 안 쓰다듬기 4번 → +6까지만. 29 → 밥 → 32이면 `newlyUnlocked: ['stretch']`. 한 번에 두 단계를 넘으면 둘 다 반환.
  - `clock backwards daily bonus`: 날짜가 이전 날로 돌아가도 그날 첫 돌봄 보너스 없음(`localDay <= lastCareDay`면 보너스 없음).
- [ ] **Step 2:** `npm test` → FAIL
- [ ] **Step 3:** 구현. 감소는 경과 분 단위 실수 계산 후 저장할 때만 반올림하지 않고 실수로 유지(화면에는 반올림해서 보여 줌).
- [ ] **Step 4:** `npm test` → PASS
- [ ] **Step 5:** 커밋 `feat(core): pet stats and affinity`

### Task 6: 다음 행동 고르기

**Files:**
- Create: `src/core/brain.js`, `test/core/brain.test.js`

**Interfaces:**
- Consumes: `isSad` (Task 5)
- Produces:
  - `createBrain(rng: () => number)` → `{ next(ctx: BrainCtx) -> {state:string, duration:number /*s*/, variant?:string} }`
  - `BrainCtx = { sad:boolean, hour:number /*0~23*/, unlocked:string[], onWindow:boolean }`
  - 상태 이름: `walk`, `sit`, `yawn`, `sleep`, `trick`(해금 동작, `variant`에 동작 id). (`eat`, `held`, `fall`, `land`는 사용자 입력이나 물리가 정하므로 brain이 고르지 않는다. `jump`, `lookdown`은 2단계.)
  - 시작 확률(낮, 시무룩 아님): walk 0.50, sit 0.25, yawn 0.08, sleep 0.10, trick 0.07(해금이 없으면 trick 몫을 sit에). 시무룩: walk 0.2, sit 0.45, sleep 0.3, yawn 0.05. 밤(23~6시): sleep 확률 ×3 후 정규화. 지속 시간: walk 3~7초, sit 2.5~5.5, yawn 1.8, sleep 6~12(밤 20~40), trick 동작 길이(2초).

- [ ] **Step 1: 실패하는 테스트** — 고정 시드 RNG(작은 LCG를 테스트 안에 둠)로 10,000번 뽑아:
  - 낮 비율이 위 확률 ±0.02.
  - 해금 없으면 `trick` 0번.
  - 밤에 sleep 비율이 낮보다 2배 이상.
  - 시무룩이면 walk 비율 < 0.25.
  - 모든 `duration`이 표의 범위 안.
- [ ] **Step 2:** FAIL 확인 → **Step 3:** 구현 → **Step 4:** PASS 확인
- [ ] **Step 5:** 커밋 `feat(core): behavior picker`

### Task 7: 바닥과 낙하

**Files:**
- Create: `src/core/floors.js`, `src/core/physics.js`, `test/core/floors.test.js`, `test/core/physics.test.js`

**Interfaces:**
- Produces:
  - `Display = { id:string|number, bounds:{x,y,width,height}, workArea:{x,y,width,height} }` (Electron `screen.getAllDisplays()`와 같은 모양)
  - `Floor = { id:string, kind:'ground'|'window', displayId, y:number, x1:number, x2:number }` (화면 좌표, 펫 발 기준 선)
  - `groundFloors(displays: Display[]) -> Floor[]` — 화면마다 `workArea` 아래 끝 한 줄
  - `floorBelow(x:number, y:number, floors:Floor[]) -> Floor|null` — `x1 <= x <= x2`이고 `floor.y >= y`인 것 중 가장 가까운 것
  - `clampToDisplays(pt:{x,y}, displays) -> {x,y, displayId}` — 어느 화면에도 없으면 가장 가까운 화면 `workArea` 안으로
  - `Body = { x, y, vx, vy, state:'ground'|'air', floorId:string|null }` (x = 발 가운데, y = 발 바닥)
  - `stepBody(body:Body, dt:number /*s*/, floors:Floor[]) -> { body:Body, landed:boolean }` — 중력 2400px/s², 최대 낙하 속도 1400px/s. 이번 스텝에서 바닥 선을 위에서 아래로 지나면 그 선에 착지(`landed:true`, `vy=0`, `vx=0`).
  - `relocate(body, floors, displays) -> Body` — 지금 발밑 바닥이 사라졌으면 `state:'air'`로 바꿔 떨어지게 하고, 화면 밖이면 `clampToDisplays` 후 떨어지게 한다.

- [ ] **Step 1: 실패하는 테스트**
  - 작업 표시줄이 아래에 있는 1920×1080 화면(workArea 높이 1040) → 바닥 `y=1040, x1=0, x2=1920`.
  - 작업 표시줄이 왼쪽/위에 있는 화면 → 바닥은 `workArea.y + workArea.height`.
  - 두 화면(나란히, 높이 다름) → 바닥 2개, 각자 x 범위.
  - y=200에서 놓으면 몇 스텝 뒤 y=1040에 착지, 중간에 vy가 1400을 넘지 않음, 착지 스텝에서만 `landed:true`.
  - dt를 0.5초처럼 크게 줘도 바닥을 뚫지 않는다.
  - Review Focus 4: 펫이 id 2 화면(x=2500)에 있는데 화면 목록에 id 1만 남음 → `relocate` 결과가 화면 1 안이고 `state:'air'`.
  - Review Focus 5: x=-500, y=-300에 놓음 → `clampToDisplays`가 화면 안 좌표를 주고, 떨어져서 바닥에 착지.
- [ ] **Step 2:** FAIL → **Step 3:** 구현 → **Step 4:** PASS
- [ ] **Step 5:** 커밋 `feat(core): floors and falling`

### Task 8: 저장 파일

**Files:**
- Create: `src/core/save.js`, `test/core/save.test.js`

**Interfaces:**
- Consumes: `PRESETS` (Task 3)
- Produces:
  - `defaultSave(now:number, lang:'ko'|'en') -> SaveData` — 펫 1마리: `origin:'adopted'`, `presetId:'shiba'`, 이름은 해당 언어의 프리셋 이름, stats 70/65, affinity 0, settings `{scale:3, perchOnWindows:true, hideOnFullscreen:true, launchAtStartup:true, language:lang}`
  - `migrate(raw:any) -> SaveData` — `version` 없거나 1이면 빠진 필드를 기본값으로 채움, 알 수 없는 필드는 보존
  - `loadSave(file:string, now, lang) -> { data:SaveData, recovered:boolean }`
  - `writeSave(file:string, data:SaveData) -> void` — 같은 폴더의 `save.json.tmp`에 쓰고 `fs.renameSync`

- [ ] **Step 1: 실패하는 테스트** (임시 폴더 사용)
  - 파일 없음 → `defaultSave`, `recovered:false`, 파일은 아직 만들지 않음.
  - 쓰고 다시 읽으면 같은 데이터.
  - Review Focus 1: 깨진 JSON(`'{"version":1,"pets":[{'`)과 빈 파일 → `recovered:true`, 원래 파일이 `save.broken-<숫자>.json`으로 옮겨져 있음, 데이터는 기본값.
  - `pets`가 빈 배열이면 기본 펫으로 채움. `activePetIds`가 없는 펫을 가리키면 첫 펫으로 고침.
  - 알 수 없는 필드(`pets[0].accessories`에 항목, 최상위 `future: 1`) → 그대로 보존.
- [ ] **Step 2:** FAIL → **Step 3:** 구현 → **Step 4:** PASS
- [ ] **Step 5:** 커밋 `feat(core): save file with recovery`

### Task 9: 펫 창과 시뮬레이션 루프

여기부터는 Electron 코드다. 순수 로직은 이미 테스트됐으므로, 이 Task의 자동 테스트는 컨트롤러의 상태 전환만 다루고 창 동작은 사용자 PC 체크리스트(Task 11)로 확인한다.

**Files:**
- Create: `src/main/main.js`, `src/main/petWindow.js`, `src/main/petController.js`, `src/preload/pet.js`, `src/renderer/pet.html`, `src/renderer/pet.js`, `test/main/petController.test.js`

**Interfaces:**
- Consumes: Task 2~8의 모든 Produces
- Produces:
  - `createPetController({ save, displays, now, rng, onFrame, onMoveWindow, onBubble }) ->` `{ tick(dt, now), feed(), pat(), sleepToggle(), grab(screenX, screenY), drag(screenX, screenY), release(), setDisplays(displays), getSave() }` — Electron 없이 테스트할 수 있게 창·화면은 콜백과 인자로만 받는다.
  - IPC 채널(렌더러 ← 메인): `pet:frames`(프레임 키 → px 배열, 스펙이 바뀔 때 한 번), `pet:show`(`{key, flip:boolean}`), `pet:bubble`(`{text, hearts:number, bowl:boolean}`), `pet:scale`
  - IPC 채널(렌더러 → 메인): `pet:hit`(`boolean`, 마우스가 칠해진 칸 위인지), `pet:pointer`(`'down'|'move'|'up'`, 화면 좌표), `pet:context`
  - 펫 창 크기: `w = 48*scale + 80`, `h = 40*scale + 110`. 펫 그림은 창 아래 가운데, 발 바닥 = 창 아래 끝.

창 설정(반목표): `transparent:true, frame:false, resizable:false, alwaysOnTop:true, skipTaskbar:true, focusable:false, hasShadow:false`, `setAlwaysOnTop(true,'floating')`, 시작 시 `setIgnoreMouseEvents(true,{forward:true})`. 렌더러는 forward된 `mousemove`마다 현재 프레임에서 커서 아래 칸이 칠해졌는지 보고, 바뀔 때만 `pet:hit`을 보낸다. 메인은 `hit`이면 `setIgnoreMouseEvents(false)`, 아니면 `(true,{forward:true})`.

컨트롤러 규칙:
- 30fps `tick`. 걷기 속도 40px/s × (scale/3). 앉기·자기·쉬는 동안은 프레임이 바뀔 때만 `onFrame` 호출, 창이 안 움직이면 `onMoveWindow` 호출 안 함(Global Constraints의 CPU 조건).
- 상태 → 그림: walk는 `walk` 9fps, sit은 `sit` 3fps + 3.6초마다 0.16초 깜빡임, 시무룩이면 `sit` 대신 `sad`, sleep 0.9fps, yawn `sit:0:yawn`, trick은 해당 동작, eat는 `sit` + happy 4fps 깜빡, held 4fps, air는 `fall`, 착지 후 0.15초 `land`.
- 짧은 클릭(누른 뒤 6px 미만 이동, 400ms 미만) = 쓰다듬기. 그 외 = 집기 → 놓으면 `fall`로 떨어짐.
- 밥 주기: 배부름 +35, `eat` 3.2초, 말풍선 + 밥그릇. 쓰다듬기: 하트 3개 + 말풍선. 자는 중 돌봄 → "쿨쿨... 자는 중이에요" 말풍선만, 수치 변화 없음.
- 해금 시: 말풍선 "새 동작: <이름>" + 그 동작을 바로 한 번.
- 저장: 수치·위치를 5초마다(바뀐 경우만), 종료 시 `writeSave`.
- 마우스를 펫에 0.6초 올리면 이름·배부름·기분·친밀도 말풍선(설계 6.1절).
- 여러 모니터(설계 6.6절): 걷다가 화면 경계에 닿으면, 옆 화면의 바닥이 같은 높이(±2px)로 이어질 때만 넘어가고 아니면 돌아선다.

- [ ] **Step 1: 실패하는 테스트** (`createPetController`에 가짜 콜백과 고정 RNG)
  - 시작 후 바닥 위에 서 있고, `tick` 몇 번 뒤 `onFrame`이 호출된다.
  - `grab` → `drag`로 y=100 이동 → `release` → 몇 초 `tick` 뒤 바닥 y에 착지, 그 사이 그림 키가 `held:*` → `fall:0:` → `land:0:` 순서로 나타남.
  - 짧은 클릭(`grab`→`release`, 이동 2px, 100ms) → 기분 +12, 하트 말풍선.
  - 자는 중 `feed()` → 배부름 그대로.
  - 앉아 있는 5초 동안 `onMoveWindow` 호출 0번.
  - `setDisplays`로 펫이 있던 화면 제거 → 다른 화면에 착지.
  - 두 화면의 바닥 높이가 같으면 경계를 걸어서 넘어가고, 다르면 경계에서 돌아선다.
- [ ] **Step 2:** FAIL → **Step 3:** 컨트롤러 구현 → **Step 4:** PASS
- [ ] **Step 5:** `main.js`(단일 인스턴스 잠금, 저장 불러오기, `screen` 이벤트 `display-added/removed/metrics-changed` → `setDisplays`), `petWindow.js`, preload, 렌더러를 작성해 컨트롤러와 연결.
- [ ] **Step 6:** Linux에서 `xvfb-run npm start`로 10초 실행해 예외 없이 뜨는지만 확인(투명·클릭 통과는 Windows에서 확인).
- [ ] **Step 7:** 커밋 `feat(app): transparent pet window driven by the simulation`

### Task 10: 트레이, 메뉴, 설정, 진단 모드

**Files:**
- Create: `src/main/tray.js`, `src/main/settingsWindow.js`, `src/main/i18n.js`, `src/main/diagnostics.js`, `src/renderer/settings.html`, `src/renderer/settings.js`, `assets/tray.png`(펫 도트로 만든 16·32px), `test/main/i18n.test.js`

**Interfaces:**
- Consumes: 컨트롤러(Task 9), `writeSave`(Task 8)
- Produces: `t(key:string, lang:'ko'|'en', vars?:object) -> string`, `buildMenuTemplate(state, lang, handlers) -> MenuItemConstructorOptions[]`

메뉴(트레이와 펫 오른쪽 클릭 공통, 설계 4.4절): 밥 주기 / 펫 불러오기 / 잠시 숨기기(숨긴 상태면 "다시 보이기") / 설정 / 진단 모드 켜기·끄기 / 종료. "다시 꾸미기"는 3단계에서 추가한다(1단계에서는 메뉴에 넣지 않는다. 자리 표시 금지).

설정 창(1단계 항목): 크기(2배·3배·4배), Windows 시작 시 자동 실행(`app.setLoginItemSettings`), 언어. 창 위 올라가기·전체 화면 숨기기는 2단계에서 추가한다.

진단 모드: 펫 창에 바닥 선과 펫 발 위치를 표시하고, 메인 프로세스 로그(상태 전환, 화면 목록 변경, 예외)를 메모리에 최근 2,000줄 보관. 메뉴 "로그 내보내기"로 바탕화면에 `pet-tools-log-<시각>.txt` 저장 후 파일 탐색기로 보여 줌.

- [ ] **Step 1: 실패하는 테스트** — `i18n`: 모든 키가 ko·en 둘 다 있음, 빈 문자열 없음, `{name}` 같은 변수가 양쪽에 똑같이 있음. `buildMenuTemplate`: 숨긴 상태에서 "다시 보이기"로 바뀜, 진단 모드 켜짐 상태에서만 "로그 내보내기"가 있음.
- [ ] **Step 2:** FAIL → **Step 3:** 구현 → **Step 4:** PASS
- [ ] **Step 5:** 크기 설정을 바꾸면 펫 창 크기가 바로 바뀌고 펫이 같은 바닥에 서 있게 연결.
- [ ] **Step 6:** 커밋 `feat(app): tray menu, settings and diagnostics`

### Task 11: 시험용 설치 파일과 사용자 확인 체크리스트

**Files:**
- Modify: `package.json`(electron-builder 설정: `appId: "io.github.luneeest-lang.pettools"`, `productName: "Pet Tools"`, `win.target: nsis`, x64, `nsis.oneClick: false`, `nsis.perMachine: false`, 아이콘)
- Create: `assets/icon.ico`(펫 도트 기반), `.github/workflows/build-windows.yml`, `docs/checklists/m1-windows.md`

**Interfaces:**
- Produces: GitHub Actions가 `windows-latest`에서 `npm ci && npm test && npx electron-builder --win --publish never`로 만든 `.exe`를 workflow 산출물로 올린다(태그 없이 브랜치 push 때마다).

- [ ] **Step 1:** 빌드 설정과 workflow 작성. push 후 Actions에서 빌드가 성공하고 산출물에 `.exe`가 있는지 확인.
- [ ] **Step 2:** `docs/checklists/m1-windows.md` 작성 — 한 묶음 5분 안에 끝나는 짧은 묶음으로, 각 항목은 "이렇게 하면 → 이렇게 보여야 함" 한 줄. 최소 항목:
  1. 설치 → "Windows의 PC 보호" 경고에서 "추가 정보 → 실행" → 설치 후 펫이 작업 표시줄 위에 나타남
  2. 펫 옆 빈 곳(투명 부분)을 클릭하면 뒤에 있는 창이 클릭됨
  3. 메모장에 글을 쓰는 중 펫을 클릭해도 메모장 커서가 그대로 있음(포커스 유지)
  4. 작업 표시줄과 Alt+Tab 목록에 펫이 안 나옴
  5. 펫을 끌어 화면 위쪽에서 놓으면 떨어져서 작업 표시줄 위에 착지
  6. 짧게 클릭하면 하트, 오른쪽 클릭하면 메뉴
  7. 트레이 → 밥 주기 → 밥그릇과 말풍선
  8. 설정 → 크기 4배 → 펫이 커지고 바닥에 서 있음
  9. 앱 종료 후 다시 실행 → 수치와 위치가 이어짐
  10. 작업 표시줄을 왼쪽/위로 옮겨도 펫이 화면 아래 끝에 섬
  11. (모니터가 2대면) 펫을 다른 모니터로 끌어 놓기
  12. 펫이 30분 동안 앉아 있거나 잘 때 작업 관리자에서 CPU 사용이 1% 안팎
  13. 진단 모드 켜기 → 로그 내보내기 → 바탕화면에 파일 생김
  문제가 있으면 화면 캡처와 로그 파일을 보내 달라는 안내를 맨 위에 둔다.
- [ ] **Step 3:** 커밋 `build: windows installer workflow and m1 checklist`
- [ ] **Step 4 (사용자 확인 관문):** 사용자에게 Actions 산출물 받는 법과 체크리스트를 안내하고 결과를 받는다. 실패 항목은 고친 뒤 이 단계를 반복한다.
