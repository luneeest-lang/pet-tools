// 렌더러와 메인 사이 통로. 허용한 채널만 연다.
const { contextBridge, ipcRenderer } = require("electron");
const FROM_MAIN = ["pet:frames", "pet:show", "pet:bubble", "pet:scale", "pet:debug"];
const TO_MAIN = ["pet:hit", "pet:pointer", "pet:context", "pet:hover", "pet:ready"];

contextBridge.exposeInMainWorld("pet", {
  on(channel, cb) { if (FROM_MAIN.includes(channel)) ipcRenderer.on(channel, (_e, data) => cb(data)); },
  send(channel, data) { if (TO_MAIN.includes(channel)) ipcRenderer.send(channel, data); }
});
