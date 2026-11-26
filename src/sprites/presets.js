// 추천 조합. 처음 6개는 프로토타입의 손으로 고른 팔레트를 그대로 담는다.
const PRESETS = [
  { id: "shiba", name: {"ko":"보리","en":"Bori"},
    spec: {"species":"dog","ears":"pointy","tail":"curl","pattern":["muzzle","belly","socks","brows"],"fluffy":false,"colors":{"main":"#e48b3c","second":"#f3dfc6"},"eye":"#8a4f33","palette":{"F0":"#ffe3a8","F1":"#f9b96d","F2":"#e48b3c","F3":"#bf5f3a","F4":"#853b35","C0":"#ffffff","C1":"#fff7ea","C2":"#f3dfc6","C3":"#d4b39d","C4":"#a3807a","I1":"#f8c9bb","I2":"#df9893","O":"#371a1d","OL":"#6d3530","OC":"#6a4c49","OCL":"#9c7b6e","IR":"#8a4f33","N":"#2a1a1c","NH":"#8a6a6e","MO":"#6b4038"}} },
  { id: "maltese", name: {"ko":"두부","en":"Tofu"},
    spec: {"species":"dog","ears":"floppy","tail":"plume","pattern":[],"fluffy":true,"colors":{"main":"#f5f1ec","second":null},"eye":"#6a4a42","palette":{"F0":"#ffffff","F1":"#ffffff","F2":"#f5f1ec","F3":"#ddd4d3","F4":"#b4a8b0","C0":"#ffffff","C1":"#ffffff","C2":"#f5f1ec","C3":"#ddd4d3","C4":"#b4a8b0","I1":"#f6d2cf","I2":"#e6b4b3","O":"#5e5260","OL":"#8f8290","OC":"#5e5260","OCL":"#8f8290","IR":"#6a4a42","N":"#241a1e","NH":"#7a6670","MO":"#8a7480"}} },
  { id: "blacktan", name: {"ko":"까미","en":"Kkami"},
    spec: {"species":"dog","ears":"pointy","tail":"curl","pattern":["muzzle","belly","socks","brows"],"fluffy":false,"colors":{"main":"#443b4a","second":"#d9a86b"},"eye":"#7a5238","palette":{"F0":"#9a8fa6","F1":"#6b6174","F2":"#443b4a","F3":"#2c2433","F4":"#1b1422","C0":"#ffeccd","C1":"#f3cf98","C2":"#d9a86b","C3":"#ad7a4f","C4":"#77503a","I1":"#d6a39b","I2":"#a87a78","O":"#0f0a14","OL":"#1f1726","OC":"#55392a","OCL":"#77503a","IR":"#7a5238","N":"#120c12","NH":"#5c5260","MO":"#5e3d2c"}} },
  { id: "cheese", name: {"ko":"치즈","en":"Cheese"},
    spec: {"species":"cat","ears":"cat","tail":"long","pattern":["muzzle","belly","stripes"],"fluffy":false,"colors":{"main":"#eea158","second":"#f4e3cc"},"eye":"#f4b63e","palette":{"F0":"#ffe5b0","F1":"#fcc684","F2":"#eea158","F3":"#cd7444","F4":"#934a3d","C0":"#ffffff","C1":"#fff8ec","C2":"#f4e3cc","C3":"#d9bda4","C4":"#a98b80","I1":"#f9c6c4","I2":"#e3999c","O":"#3c1d1f","OL":"#7b4237","OC":"#6c4f4b","OCL":"#a3857a","IR":"#f4b63e","IR2":"#c47d22","Q":"#e9858e","MO":"#6b4038","WH":"#fff8ec"}} },
  { id: "tuxedo", name: {"ko":"턱이","en":"Tux"},
    spec: {"species":"cat","ears":"cat","tail":"long","pattern":["muzzle","belly","socks","blaze"],"fluffy":false,"shape":{"bigMuzzle":true,"chest":true},"colors":{"main":"#332e40","second":"#e9e8f3"},"eye":"#dcd84f","palette":{"F0":"#77718a","F1":"#524c62","F2":"#332e40","F3":"#221e2c","F4":"#15121d","C0":"#ffffff","C1":"#fbfbff","C2":"#e9e8f3","C3":"#c8c6d8","C4":"#9895ad","I1":"#e6a9b6","I2":"#b77d8c","O":"#0b0910","OL":"#1b1824","OC":"#5f5c75","OCL":"#8a87a0","IR":"#dcd84f","IR2":"#a7a22c","Q":"#f1a1ad","MO":"#6b5868","WH":"#ffffff"}} },
  { id: "russian", name: {"ko":"하늘","en":"Haneul"},
    spec: {"species":"cat","ears":"cat","tail":"long","pattern":[],"fluffy":false,"colors":{"main":"#8593ad","second":null},"eye":"#86d96f","palette":{"F0":"#dbe3f1","F1":"#adb9cf","F2":"#8593ad","F3":"#64708e","F4":"#454d6c","C0":"#dbe3f1","C1":"#adb9cf","C2":"#8593ad","C3":"#64708e","C4":"#454d6c","I1":"#c9a7b8","I2":"#9f8299","O":"#232740","OL":"#3f4768","OC":"#232740","OCL":"#3f4768","IR":"#86d96f","IR2":"#4fa648","Q":"#7a6f8c","MO":"#343a58","WH":"#eef2fa"}} },
  // 아래 6개는 털색만 정하고 명암은 자동으로 만든다.
  { id: "corgi", name: {"ko":"콩이","en":"Kongi"},
    spec: {"species":"dog","ears":"pointy","tail":"plume","pattern":["muzzle","belly","socks","blaze"],"fluffy":false,"colors":{"main":"#e0974a","second":"#fbf3e6"},"eye":"#7a4a32"} },
  { id: "poodle", name: {"ko":"초코","en":"Choco"},
    spec: {"species":"dog","ears":"floppy","tail":"plume","pattern":[],"fluffy":true,"colors":{"main":"#b8703f","second":null},"eye":"#4a2e26"} },
  { id: "jindo", name: {"ko":"백구","en":"Baekgu"},
    spec: {"species":"dog","ears":"pointy","tail":"curl","pattern":["muzzle","belly"],"fluffy":false,"colors":{"main":"#efe4d2","second":"#fffdf8"},"eye":"#5a3a2e"} },
  { id: "black", name: {"ko":"밤이","en":"Bami"},
    spec: {"species":"cat","ears":"cat","tail":"long","pattern":[],"fluffy":false,"colors":{"main":"#2e2a33","second":null},"eye":"#e8c547"} },
  { id: "white", name: {"ko":"눈송이","en":"Snowy"},
    spec: {"species":"cat","ears":"cat","tail":"long","pattern":[],"fluffy":false,"colors":{"main":"#f6f3ef","second":null},"eye":"#7fb8e8"} },
  { id: "mackerel", name: {"ko":"모카","en":"Mocha"},
    spec: {"species":"cat","ears":"cat","tail":"long","pattern":["muzzle","belly","stripes"],"fluffy":false,"colors":{"main":"#8c8478","second":"#f1ece4"},"eye":"#9bc25a"} },
];

module.exports = { PRESETS };
