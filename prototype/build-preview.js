// 미리보기 페이지 만들기: page.html의 /*SPRITE*/ 자리에 스프라이트 코드를 넣어 index.html 한 파일로 만든다.
// 실행: node prototype/build-preview.js
const fs = require("fs");
const path = require("path");
const dir = __dirname;
const page = fs.readFileSync(path.join(dir, "preview/page.html"), "utf8");
const sprites = ["pixel-dog-v1.js", "pixel-pet.js"]
  .map(f => fs.readFileSync(path.join(dir, "sprites", f), "utf8"))
  .join("\n");
fs.writeFileSync(path.join(dir, "preview/index.html"), page.replace("/*SPRITE*/", () => sprites));
console.log("prototype/preview/index.html 생성 완료");
