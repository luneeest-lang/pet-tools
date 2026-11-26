# pet-tools

우리 아이 사진으로 만든 도트 캐릭터가 Windows 바탕화면에서 사는 데스크톱 펫 프로젝트입니다.

## 지금 있는 것

- `prototype/sprites/pixel-pet.js`: 도트 펫 스프라이트 생성기. 강아지 3종(시바견, 몰티즈, 블랙탄)과 고양이 3종(치즈 태비, 턱시도, 러시안 블루)을 48×40칸으로 그립니다. 동작은 걷기 6장, 앉기, 눈 깜빡임, 기뻐하기, 하품, 자기 2장입니다.
- `prototype/sprites/pixel-dog-v1.js`: 첫 번째 버전. 미리보기의 "이전 그림과 비교"에만 씁니다.
- `prototype/preview/`: 가짜 바탕화면에서 펫이 움직이는 미리보기 페이지

## 미리보기 만들기

```bash
node prototype/build-preview.js
```

`prototype/preview/index.html`을 브라우저로 열면 됩니다.
