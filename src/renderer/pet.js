// 펫 그리기, 투명 부분 클릭 통과 판정, 말풍선·하트·밥그릇·Zzz
(() => {
  const cv = document.getElementById("pet");
  const ctx = cv.getContext("2d");
  const layer = document.getElementById("layer");
  // px: 그림 한 칸의 화면 픽셀, footPad: 발 선 아래 여백(화면 픽셀)
  let frames = {}, px = 3, footPad = 6, current = null, debug = false;
  const cache = new Map();

  function resize() { cv.width = window.innerWidth; cv.height = window.innerHeight; draw(); }
  const frameSize = () => { const fr = current && frames[current.key]; return fr ? { w: fr.w, h: fr.h } : { w: 48, h: 40 }; };
  const origin = () => { const { w, h } = frameSize(); return { ox: Math.round((cv.width - w * px) / 2), oy: cv.height - h * px }; };

  function sprite(key) {
    const k = key + "@" + px;
    if (cache.has(k)) return cache.get(k);
    const fr = frames[key];
    if (!fr) return null;
    const c = document.createElement("canvas");
    c.width = fr.w * px; c.height = fr.h * px;
    const g = c.getContext("2d");
    fr.shadow.forEach((on, i) => { if (on) { g.fillStyle = "rgba(30,20,40,0.16)"; g.fillRect((i % fr.w) * px, Math.floor(i / fr.w) * px, px, px); } });
    fr.px.forEach((col, i) => { if (col) { g.fillStyle = col; g.fillRect((i % fr.w) * px, Math.floor(i / fr.w) * px, px, px); } });
    cache.set(k, c);
    return c;
  }

  function draw() {
    ctx.clearRect(0, 0, cv.width, cv.height);
    if (!current) return;
    const s = sprite(current.key);
    if (!s) return;
    const { ox, oy } = origin();
    ctx.save();
    if (current.flip) { ctx.translate(ox + s.width, oy); ctx.scale(-1, 1); ctx.drawImage(s, 0, 0); }
    else ctx.drawImage(s, ox, oy);
    ctx.restore();
    if (debug) { const { w, h } = frameSize(); ctx.strokeStyle = "#e8466a"; ctx.beginPath(); ctx.moveTo(0, cv.height - footPad + 0.5); ctx.lineTo(cv.width, cv.height - footPad + 0.5); ctx.stroke(); ctx.strokeRect(ox + 0.5, oy + 0.5, w * px - 1, h * px - 1); }
    const zzz = layer.querySelector(".zzz");
    if (current.key.startsWith("sleep:") && !zzz) {
      const z = document.createElement("div"); z.className = "zzz"; z.textContent = "z Z";
      const { w, h } = frameSize();
      z.style.left = (ox + (current.flip ? 0.12 : 0.7) * w * px) + "px"; z.style.top = (oy + 0.3 * h * px) + "px";
      layer.appendChild(z);
    } else if (!current.key.startsWith("sleep:") && zzz) zzz.remove();
  }

  // 커서 아래 칸이 칠해져 있는지
  function hitAt(mx, my) {
    if (!current || !frames[current.key]) return false;
    const { ox, oy } = origin(), fr = frames[current.key];
    let gx = Math.floor((mx - ox) / px); const gy = Math.floor((my - oy) / px);
    if (gx < 0 || gy < 0 || gx >= fr.w || gy >= fr.h) return false;
    if (current.flip) gx = fr.w - 1 - gx;
    return !!fr.px[gy * fr.w + gx];
  }

  let lastHit = false, pressed = false, mouse = null;
  // 펫이 움직이거나 그림이 바뀌면 커서가 가만히 있어도 클릭 통과 여부를 다시 계산한다.
  // 클릭 통과 여부는 메인 프로세스가 커서 위치로 직접 정한다(main.js updateHit). 여기서는 눌림 상태만 추적한다.
  function updateHit() {}
  window.addEventListener("mousemove", e => {
    mouse = { x: e.clientX, y: e.clientY };
    updateHit();
    if (pressed) window.pet.send("pet:pointer", { type: "move", x: e.screenX, y: e.screenY });
  });
  window.addEventListener("mouseleave", () => { mouse = null; });
  window.addEventListener("pointerdown", e => {
    if (e.button !== 0 || !hitAt(e.clientX, e.clientY)) return;
    pressed = true; cv.setPointerCapture(e.pointerId);
    window.pet.send("pet:pointer", { type: "down", x: e.screenX, y: e.screenY });
  });
  window.addEventListener("pointerup", e => {
    if (!pressed) return;
    pressed = false;
    window.pet.send("pet:pointer", { type: "up", x: e.screenX, y: e.screenY });
  });
  // 놓는 신호를 놓치면(포인터 캡처가 풀림) 펫 창이 계속 클릭을 가로채므로 놓은 것으로 처리한다.
  const cancel = e => { if (!pressed) return; pressed = false; window.pet.send("pet:pointer", { type: "up", x: e.screenX, y: e.screenY }); };
  cv.addEventListener("lostpointercapture", cancel);
  window.addEventListener("pointercancel", cancel);
  window.addEventListener("blur", () => { if (pressed) cancel({ screenX: 0, screenY: 0 }); });
  window.addEventListener("contextmenu", e => { e.preventDefault(); if (hitAt(e.clientX, e.clientY)) window.pet.send("pet:context", {}); });

  const HEART = [".oo.oo.", "o22o12o", "o22222o", ".o222o.", "..o2o..", "...o..."];
  const BOWL = ["......oooooo......", "....oo4544544oo...", "...o445445445544o.", "..oooooooooooooooo", "..o11111111111111o", "..o12222222222221o", "...o122222222221o.", "....o1222222221o..", ".....oooooooooo..."];
  function pixelCanvas(rows, pal, s) {
    const c = document.createElement("canvas");
    c.width = rows[0].length * s; c.height = rows.length * s;
    const g = c.getContext("2d");
    rows.forEach((r, y) => [...r].forEach((ch, x) => { if (pal[ch]) { g.fillStyle = pal[ch]; g.fillRect(x * s, y * s, s, s); } }));
    return c;
  }

  window.pet.on("pet:bubble", b => {
    const { ox, oy } = origin();
    const el = document.createElement("div");
    el.className = "bubble" + (b.kind === "info" ? " info" : "");
    el.textContent = b.text;
    el.style.top = Math.max(0, oy - 28) + "px";
    layer.appendChild(el);
    setTimeout(() => el.remove(), b.kind === "info" ? 3100 : 1900);
    for (let i = 0; i < (b.hearts || 0); i++) {
      const h = pixelCanvas(HEART, { o: "#7a1830", "1": "#ffd0dc", "2": "#ff5a7e" }, 3);
      h.className = "heart";
      h.style.left = (cv.width / 2 - 8 + (Math.random() * 40 - 20)) + "px";
      h.style.top = (oy + 0.15 * frameSize().h * px) + "px";
      h.style.setProperty("--dx", (Math.random() * 40 - 20) + "px");
      h.style.animationDelay = (i * 0.14) + "s";
      layer.appendChild(h);
      setTimeout(() => h.remove(), 1600 + i * 140);
    }
    if (b.bowl) {
      const bowl = pixelCanvas(BOWL, { o: "#5a1f1f", "1": "#ff7b7b", "2": "#e2474a", "4": "#a86a3a", "5": "#cf9358" }, 3);
      bowl.className = "heart";
      bowl.style.animation = "none";
      const fw = frameSize().w * px;
      bowl.style.left = (current && current.flip ? ox - bowl.width * 0.4 : ox + fw * 0.83) + "px";
      bowl.style.top = (cv.height - footPad - bowl.height) + "px";
      layer.appendChild(bowl);
      setTimeout(() => bowl.remove(), 3200);
    }
  });

  window.pet.on("pet:frames", d => { frames = d.frames; px = d.px; footPad = d.footPad; cache.clear(); resize(); });
  window.pet.on("pet:scale", d => { px = d.px; footPad = d.footPad; cache.clear(); resize(); });
  window.pet.on("pet:show", f => { current = f; draw(); updateHit(); });
  window.pet.on("pet:debug", on => { debug = on; draw(); });
  window.addEventListener("resize", resize);
  resize();
  window.pet.send("pet:ready", {});
})();
