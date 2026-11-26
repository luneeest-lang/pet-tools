# 데스크톱 펫 2단계 (창 위 올라가기·뛰어내리기·매달리기) 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 펫이 열린 창의 윗부분을 바닥으로 쓰고, 스스로 뛰어오르고, 내려다본 뒤 뛰어내리거나 창 끝에 매달리고, 창을 따라 움직이고, 전체 화면 앱이 앞에 있으면 숨는 시험용 설치 파일을 만든다.

**Architecture:** Windows 창 목록 읽기는 얇은 어댑터(`src/main/win32/`)에 가두고, "창 목록 → 바닥 선", "점프 궤적", "전체 화면 판정"은 Electron·Windows 없이 테스트하는 순수 함수로 만든다. 컨트롤러는 화면 목록과 창 목록을 받아 바닥을 다시 계산하고, 창 위 행동(내려다보기, 뛰어내리기, 매달리기, 뛰어오르기)을 시간표로 관리한다.

**Tech Stack:** 1단계와 같음 + `koffi`(런타임 의존성, Windows 기능 호출).

**Spec:** `docs/superpowers/specs/2026-11-26-desktop-pet-design.md` (6.4절 창 위·매달리기, 7장 전체 화면 숨기기)

## Global Constraints

- 1단계의 Global Constraints를 모두 따른다.
- 창 바닥 조건(설계 6.4절): 보이는 상태, 최소화 아님, 너비 200px 이상, 다른 창에 가려지지 않은 구간만, 최대화되었거나 윗변이 화면 맨 위 끝에 붙은 창 제외, 시스템 창·앱 자신의 창 제외, 그림자를 뺀 실제 테두리 기준.
- 창 목록은 약 0.2초마다 읽는다. 펫이 창 위나 창 끝에 있을 때는 그 창만 약 0.05초마다 확인한다.
- 뛰어오르기: 걷는 동안 2~4분에 한 번, 가로로 화면 너비 40% 안, 세로로 화면 높이 60% 안의 창만 고른다.
- 창 위에 올라간 뒤 30초~3분 사이에 내려간다: 끝으로 걸어가 내려다보기 → 60% 뛰어내리기, 40% 매달리기. 매달리기 3~6초 → 60% 기어오르기, 40% 뛰어내리기.
- 아래 바닥까지 높이가 화면 높이의 절반을 넘으면 놀란 그림으로 떨어지되 항상 착지 그림으로 내려앉는다.
- 설정 "창 위에 올라가기"를 끄면 뛰어오르기·매달리기를 하지 않고, 사용자가 창 위에 놓아도 바닥으로 떨어진다(창 바닥을 쓰지 않음). "전체 화면일 때 숨기기"는 기본 켜짐.
- Windows가 아닌 환경(클라우드 테스트)에서는 창 목록이 항상 빈 배열이다.

## Review Focus

1. **펫이 올라가 있는 창을 빠르게 끌어 옮기거나 화면 밖으로 반쯤 밀 때** → 펫이 창과 같이 움직이고, 창 윗변이 화면 밖으로 나간 구간에서는 떨어져서 착지한다. (Task 4)
2. **펫이 서 있던 구간을 다른 창이 덮을 때** → 펫이 그 구간에 파묻히지 않고 떨어지거나 남은 구간으로 옮겨진다. (Task 4)
3. **배율이 다른 두 모니터(100%·150%)에 걸친 창** → 바닥 좌표가 Electron 화면 좌표와 맞는다. (Task 1에서 변환 함수 테스트, 실제는 체크리스트)
4. **창 위에 놓은 순간 그 창을 닫거나 최소화** → 펫이 놀라서 떨어지고 착지한다. NaN 좌표나 화면 밖으로 사라지는 일이 없다. (Task 4)
5. **전체 화면 판정에서 바탕화면 자체나 작업 표시줄이 앞에 있을 때** → 숨지 않는다. (Task 6)

---

## 파일 구조

```
src/core/windowFloors.js      # 창 목록 → 가려진 구간을 뺀 바닥 선 (순수)
src/core/jump.js              # 점프 궤적 계산 (순수)
src/core/fullscreen.js        # 전체 화면 앱 판정 (순수)
src/main/win32/windows.js     # koffi로 창 목록·전경 창 읽기 (Windows 전용, 그 외 [])
src/main/win32/convert.js     # 실제 픽셀 → DIP 변환 (순수, screen 함수를 주입받음)
src/main/petController.js     # 창 바닥, 창 따라가기, 창 위 행동 시간표, 점프·매달리기
src/main/main.js              # 창 목록 폴링, 전체 화면 숨기기, 설정 두 개
src/main/i18n.js, src/renderer/settings.*  # 설정 문구와 체크박스
docs/checklists/m2-windows.md
```

---

### Task 1: 창 목록 읽기 어댑터

**Files:**
- Create: `src/main/win32/windows.js`, `src/main/win32/convert.js`, `test/main/convert.test.js`
- Modify: `package.json` (`dependencies.koffi`, electron-builder `asarUnpack: ["node_modules/koffi/**"]`)

**Interfaces:**
- Produces:
  - `RawWindow = { hwnd: string, pid: number, rect: {left, top, right, bottom} /*실제 픽셀, 그림자 제외*/, visible: boolean, minimized: boolean, cloaked: boolean, toolWindow: boolean, className: string, titleLength: number }`
  - `listWindows() -> RawWindow[]` — 맨 앞 창부터 z-순서. Windows가 아니면 `[]`. 호출 중 예외는 잡아서 `[]`와 함께 진단 로그.
  - `foregroundHwnd() -> string|null`
  - `toDipWindows(raw: RawWindow[], ownPid: number, toDip: (rect)=>{x,y,width,height}) -> Win[]`
  - `Win = { id: string /*hwnd*/, x, y, width, height }` — 보이고, 최소화·숨김(cloaked)·도구 창이 아니고, 제목 길이 > 0, 클래스가 `Progman`/`WorkerW`/`Shell_TrayWnd`/`Shell_SecondaryTrayWnd`가 아니며, `pid !== ownPid`인 창만. 순서 유지.

구현 메모: `GetTopWindow(NULL)`부터 `GetWindow(h, GW_HWNDNEXT=2)`로 z-순서를 따라간다(콜백 불필요). 테두리는 `DwmGetWindowAttribute(h, DWMWA_EXTENDED_FRAME_BOUNDS=9)`, 숨김은 `DWMWA_CLOAKED=14`, 도구 창은 `GetWindowLongPtrW(h, GWL_EXSTYLE=-20) & WS_EX_TOOLWINDOW(0x80)`. 실제 픽셀 → DIP 변환은 main에서 `screen.screenToDipRect(null, rect)`를 `toDip`으로 넘긴다.

- [ ] **Step 1: 실패하는 테스트** — `toDipWindows`:
  - 보이는 일반 창 2개(z-순서 A, B) → `[A, B]` 순서 유지, `toDip` 결과 사용.
  - 최소화·cloaked·toolWindow·제목 없음·`Shell_TrayWnd`·`Progman`·자기 pid 창은 모두 빠짐.
  - `toDip`이 배율 1.5 변환(`x/1.5` 등)을 하면 결과 좌표도 그 값(배율 모니터 대비, Review Focus 3).
- [ ] **Step 2:** FAIL → **Step 3:** 구현(`listWindows`는 `process.platform !== "win32"`면 즉시 `[]`) → **Step 4:** PASS
- [ ] **Step 5:** `npm install koffi`, Linux에서 `require("./src/main/win32/windows.js").listWindows()`가 `[]`를 돌려주는지 확인.
- [ ] **Step 6:** 커밋 `feat(win32): read top-level windows with koffi`

### Task 2: 창 목록 → 바닥 선

**Files:**
- Create: `src/core/windowFloors.js`, `test/core/windowFloors.test.js`

**Interfaces:**
- Consumes: `Display`, `Floor` (1단계 `floors.js`)
- Produces: `windowFloors(wins: Win[], displays: Display[], opts = {minWidth: 200}) -> Floor[]`
  - 창 하나가 가려진 구간 때문에 여러 조각으로 나뉠 수 있다. 조각 id: `win:<hwnd>:<i>`, `kind: "window"`, `windowId: hwnd`, `y = win.y`, `x1`, `x2`, `displayId`(윗변 가운데가 속한 화면).
  - 가림: 앞쪽(배열에서 앞선) 창의 사각형이 윗변 줄(`y`)을 덮는 x 구간을 뺀다(`front.y <= y < front.y + front.height`).
  - 빼는 창: 너비 < 200, 윗변이 그 화면 작업 영역 윗변 이하(`y <= workArea.y + 2`, 최대화·맨 위 붙은 창), 윗변이 어느 화면 작업 영역에도 없는 창. 조각은 화면 작업 영역의 좌우 끝으로 자르고, 너비 40px 미만 조각은 버린다.

- [ ] **Step 1: 실패하는 테스트**
  - 창 하나(x 100, y 300, 800×500) → 바닥 1개 `{y:300, x1:100, x2:900}`.
  - 앞 창이 가운데(x 400~600, y 200~700)를 덮음 → 조각 2개 `[100,400]`, `[600,900]`.
  - 최대화 창(y = workArea.y), 너비 150 창 → 바닥 없음.
  - 화면 오른쪽 밖으로 반쯤 나간 창(x 1700, 너비 600, 화면 1920) → 조각 `[1700,1920]`.
  - 화면 밖으로 윗변이 나간 창(y -50) → 바닥 없음.
- [ ] **Step 2:** FAIL → **Step 3:** 구현 → **Step 4:** PASS → **Step 5:** 커밋 `feat(core): floors on top of open windows`

### Task 3: 점프 궤적

**Files:**
- Create: `src/core/jump.js`, `test/core/jump.test.js`

**Interfaces:**
- Consumes: `GRAVITY` (physics.js)
- Produces: `jumpVelocity(from:{x,y}, to:{x,y}, apex: number /*px, 두 점 중 높은 쪽보다 더 올라가는 높이*/) -> {vx, vy, time}` — 중력 2400px/s²에서 `from`을 떠나 꼭짓점을 지나 `to`에 도착하는 초기 속도. 뛰어오르기 `apex = 40`, 뛰어내리기 `apex = 24`.

- [ ] **Step 1: 실패하는 테스트**
  - (500,1040) → (700,600), apex 40: 1/60초 단위로 `stepBody`(바닥은 목표 창 바닥 하나 `{y:600, x1:650, x2:900}`)를 돌리면 1.5초 안에 `y=600`에 착지하고 착지 x가 `700±8`.
  - 아래로 뛰기 (800,600) → (950,1040), apex 24: 바닥 `ground` 위에 `950±8`로 착지.
  - `time > 0`, `vy < 0`(위로 출발).
- [ ] **Step 2:** FAIL → **Step 3:** 구현 → **Step 4:** PASS → **Step 5:** 커밋 `feat(core): jump trajectories`

### Task 4: 컨트롤러 — 창 바닥과 창 따라가기

**Files:**
- Modify: `src/main/petController.js`, `test/main/petController.test.js`

**Interfaces:**
- Consumes: `windowFloors`(Task 2), `relocate`, `stepBody`
- Produces:
  - `setWindows(wins: Win[])` — 바닥 = `groundFloors(displays)` + (설정이 켜져 있으면) `windowFloors(wins, displays)`. 펫이 `win:` 바닥에 서 있거나 매달려 있고 같은 `windowId`의 창이 이동했으면 펫도 같은 dx, dy만큼 옮긴다(조각 번호가 바뀌어도 같은 창이면 따라간다). 그 창의 바닥이 사라졌거나 펫 발 x가 남은 조각 어디에도 없으면 놀라서 떨어진다(`state: "air"`).
  - `setPerch(on: boolean)` — 설정 반영. 끄면 창 바닥을 버리고, 창 위에 있던 펫은 떨어진다.
  - `getFloors() -> Floor[]` (진단 모드 표시용)
  - 1단계 `walk()`는 창 바닥에서도 동작한다: 조각 끝에 오면 창 위 시간표(Task 5)가 정한 행동, 아니면 돌아서기.
  - 놓기(`release`)와 낙하는 창 바닥에도 착지한다(이미 `stepBody`가 모든 바닥을 봄).

- [ ] **Step 1: 실패하는 테스트**
  - 창 위(y 300)에서 놓으면 그 창 위에 착지(`floorId`가 `win:`로 시작).
  - 그 창이 (dx 200, dy -50) 이동한 목록으로 `setWindows` → 펫 x +200, y 250, 여전히 `ground` 상태.
  - Review Focus 1: 창을 화면 오른쪽 밖으로 밀어 펫 발 x가 조각 밖 → 떨어져서 작업 표시줄에 착지.
  - Review Focus 2: 다른 창이 펫이 선 구간을 덮음 → 떨어져서 아래 바닥에 착지.
  - Review Focus 4: 창 목록에서 그 창이 사라짐 → `fall:0:` 그림 후 `land:0:`, 좌표가 모두 유한한 숫자.
  - `setPerch(false)` 뒤 창 위에서 놓으면 작업 표시줄로 떨어짐.
- [ ] **Step 2:** FAIL → **Step 3:** 구현 → **Step 4:** PASS → **Step 5:** 커밋 `feat(app): stand on and ride along with open windows`

### Task 5: 컨트롤러 — 뛰어오르기, 내려다보기, 뛰어내리기, 매달리기

**Files:**
- Modify: `src/main/petController.js`, `test/main/petController.test.js`

**Interfaces:**
- Consumes: `jumpVelocity`(Task 3)
- Produces: 새 모드 `crouch`, `jump`, `lookdown`, `hang`, `climb`. 그림 키:
  - `crouch` → `crouch:0:`(0.25초), `jump` → 위로 가는 중 `air:0:`, 내려오는 중 `air:1:`, 착지 → `land:0:`
  - `lookdown` → `lookdown:0:`(0.8초)
  - `hang` → `held:<0|1>:`(4fps), 펫 발 선 `body.y = floor.y + 17 * scale`(앞발이 창 윗선에 닿게), 펫 x는 창 조각 끝에서 안쪽으로 `8*scale`
  - `climb` → `crouch:0:` 0.3초 후 그 조각 위 끝에서 안쪽으로 `22*scale`에 선다
  - 높이가 화면 높이 절반을 넘는 낙하는 `fall:0:`(놀람) 후 착지
- 시간표(Global Constraints 값):
  - 땅 위에서 다음 뛰어오르기 시각 = 지금 + 120~240초. 그 시각 이후 걷기를 시작할 때, 조건에 맞는 창 조각(가로 40%, 세로 60% 안, 위쪽)이 있으면 가장 가까운 것으로 `crouch → jump`.
  - 창 위에 착지하면 머물 시간 30~180초. 다 되면 가까운 조각 끝으로 걸어가 `lookdown` → 60% `jump`(아래 바닥 위 착지점, 조각 끝에서 바깥쪽 `30*scale`) / 40% `hang`(3~6초) → 60% `climb` / 40% 아래로 `jump`.
  - 매달린 창이 움직이면 같이 움직이고(Task 4 규칙), 사라지면 떨어진다. 매달린 펫을 잡으면 `held`.

- [ ] **Step 1: 실패하는 테스트** (고정 RNG, 가짜 창 목록)
  - 땅 위에서 240초 동안 `tick` → 근처 창이 있으면 최소 한 번 `crouch:0:` → `air:0:` → `air:1:` → `land:0:` 순서가 나오고 창 바닥에 착지.
  - 창 위에서 180초 동안 `tick` → `lookdown:0:`이 나온 뒤 `held:` 또는 `air:`가 나온다.
  - RNG를 매달리기 쪽으로 고정 → `held:` 프레임 동안 펫 발 선이 `floor.y + 17*scale`, 이후 `climb` 쪽이면 다시 그 창 바닥 위, 뛰어내리기 쪽이면 땅 바닥 위.
  - `setPerch(false)`면 240초 동안 `crouch:0:`·`held:`가 한 번도 없다.
  - 화면 높이 절반 넘게 떨어질 때 `fall:0:`가 나온다. 모든 그림 키가 `FRAME_LIST`에 있다.
- [ ] **Step 2:** FAIL → **Step 3:** 구현 → **Step 4:** PASS → **Step 5:** 커밋 `feat(app): jump onto windows, look down, hop off and hang from edges`

### Task 6: 전체 화면일 때 숨기기, 설정, 창 목록 폴링

**Files:**
- Create: `src/core/fullscreen.js`, `test/core/fullscreen.test.js`
- Modify: `src/main/main.js`, `src/main/i18n.js`, `src/renderer/settings.html`, `src/renderer/settings.js`, `test/main/i18n.test.js`

**Interfaces:**
- Consumes: `listWindows`, `foregroundHwnd`, `toDipWindows`, controller `setWindows`, `setPerch`, `getFloors`
- Produces: `isFullscreen(fg: Win|null, displays) -> boolean` — 전경 창이 어떤 화면의 `bounds`를 ±2px 안에서 통째로 덮으면 true. `fg`가 null이면 false(바탕화면·작업 표시줄이 앞일 때 `toDipWindows`가 이미 걸러 null이 됨).
- main: 0.2초마다 `listWindows` → `toDipWindows` → `controller.setWindows`. 전경 창이 전체 화면이면(설정 켜짐) 펫 창을 숨기고(`hide`), 아니면 다시 보인다(사용자가 "잠시 숨기기"한 상태는 존중). 진단 모드에서는 바닥 목록이 바뀔 때마다 로그.
- 설정 창 체크박스 두 개: "창 위에 올라가기", "전체 화면일 때 숨기기" (ko/en 문구, 저장).

- [ ] **Step 1: 실패하는 테스트** — `isFullscreen`: 화면 전체를 덮는 창 → true, 작업 영역만 덮는 최대화 창 → false, null → false(Review Focus 5), 두 번째 모니터 전체를 덮는 창 → true. i18n: 새 설정 문구 ko/en 짝.
- [ ] **Step 2:** FAIL → **Step 3:** 구현 → **Step 4:** PASS
- [ ] **Step 5:** `xvfb-run`으로 10초 실행해 예외 없이 뜨는지 확인(Linux에서는 창 목록이 비어 있음).
- [ ] **Step 6:** 커밋 `feat(app): hide during fullscreen apps and perch settings`

### Task 7: 설치 파일과 2단계 체크리스트

**Files:**
- Modify: `.github/workflows/build-windows.yml`, `.github/workflows/test.yml` (actions v4 → Node 24 대응 버전으로 올려 경고 제거)
- Create: `docs/checklists/m2-windows.md`

- [ ] **Step 1:** 워크플로 액션 버전 갱신, push 후 Actions에서 Windows 빌드 성공과 설치 파일 산출물 확인.
- [ ] **Step 2:** 체크리스트(5분 묶음): 메모장·탐색기 창 위에 놓기 / 창 옮기면 따라옴 / 창 닫기·최소화 → 놀라서 떨어져 착지 / 다른 창으로 펫이 선 곳 덮기 / 몇 분 두면 스스로 창 위로 뛰어오름 / 창 위에서 내려다보고 뛰어내림 / 창 끝에 매달려 버둥거린 뒤 기어오르거나 뛰어내림 / 매달린 펫 잡기 / 설정에서 창 위 올라가기 끄기 / 유튜브 전체 화면 → 펫 숨음, 나가면 다시 나타남 / 배율이 다른 모니터 2대(있으면)에 걸친 창 위 / 진단 모드 로그에 창 바닥 목록이 찍힘.
- [ ] **Step 3:** 커밋 `build: m2 checklist and action updates`
- [ ] **Step 4 (사용자 확인 관문):** 사용자가 설치해 확인한다.
