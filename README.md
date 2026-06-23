# Re-Feel Festa Stamp Tour

> 앱 설치 없이 QR 스캔만으로 부스 스탬프를 적립·경품 교환까지 처리하는 **모바일 웹 스탬프 투어**

**배포 URL** · [https://refeel-festa-stampweb.web.app/](https://refeel-festa-stampweb.web.app/)  
**행사** · 리필페스타 팝업스토어 (상명대)  
**Last updated** · 2026-06-24

---

## 프로젝트 소개

오프라인 축제·팝업 현장에서 방문객이 스마트폰 카메라로 부스 QR을 스캔하면, 별도 앱 없이 웹에서 스탬프가 자동 적립됩니다. 4개 부스 중 **3개 이상** 수집 시 현장 스태프 인증을 거쳐 경품을 교환하고, 완료 후 기기는 체험완료 화면으로 잠깁니다.

iOS 사파리의 **QR → 새 탭** 환경에서 발생하는 세션 분리·데이터 덮어쓰기 문제를 해결해, **동일 사용자 문서에 스탬프가 누적**되도록 구현·배포했습니다.

---

## 핵심 성과

| 항목 | 내용 |
|------|------|
| 접근성 | 앱 설치·회원가입 없이 QR 즉시 참여 |
| 실시간 동기화 | Firestore `onSnapshot`으로 수동 새로고침 없이 UI 반영 |
| 데이터 무결성 | 다중 탭·연속 QR 스캔 시에도 기존 도장 유지 (`{1:true, 2:true}` 누적 검증) |
| 현장 운영 | 스태프 인증, 체험완료 잠금, 개발자 리셋(히든) 지원 |
| 배포 | Firebase Hosting SPA 배포 완료 |

---

## 기술 스택

| 구분 | 기술 |
|------|------|
| Frontend | React 19, Vite 8, Tailwind CSS 3 |
| Backend | Firebase Anonymous Auth, Cloud Firestore |
| Hosting | Firebase Hosting |
| 기타 | PostCSS, ESLint |

---

## 주요 기능

1. **익명 인증** — 진입 즉시 UID 발급, 브라우저 재방문 시 세션 복원
2. **QR 스탬프 적립** — `?section=1~4` 파라미터로 부스별 도장 자동 적립
3. **실시간 스탬프 카드** — 4칸 원형 UI, 진행률 `n / 4` 표시
4. **경품 교환** — 3개 이상 수집 시 스태프 암호 인증 → `isClaimed` 잠금
5. **체험완료 화면** — 실시간 시계로 스크린샷 재사용 어뷰징 완화
6. **중복 스캔 안내** — 이미 완료된 부스 재스캔 시 토스트 알림
7. **개발자 리셋** — 타이틀 연속 탭 + 관리자 인증으로 현장 테스트 초기화

---

## 시스템 아키텍처

```
[부스 QR 스캔] → ?section=N
       │
       ▼
[ensureAnonymousUser]  authStateReady() → 기존 UID 재사용 또는 1회 익명 로그인
       │
       ▼
[applyStamp]           runTransaction → stamps.N만 갱신 (맵 전체 교체 금지)
       │
       ▼
[Cloud Firestore]  ──onSnapshot──►  [React UI]
```

### 디렉터리 구조

```
src/
├── App.jsx              # 메인 UI·스탬프 파이프라인
├── services/
│   ├── firebase.js      # Firebase 초기화
│   └── auth.js          # 익명 세션 보장 (authStateReady + 로그인 락)
├── styles/index.css     # Tailwind + 커스텀 폰트
├── assets/              # 스탬프 완료 이미지, SinchonRhapsody.ttf
├── components/          # (확장 예정)
└── features/            # (확장 예정)
docs/
└── PRD.md               # 기획·규칙·예외 처리 명세
```

### Firestore 스키마

```
users/{uid}
  ├── stamps: { 1: bool, 2: bool, 3: bool, 4: bool }
  ├── isClaimed: bool
  ├── createdAt: Timestamp
  └── updatedAt: Timestamp
```

---

## 트러블슈팅

### 1. 연속 QR 스캔 시 이전 스탬프가 사라지는 문제

**증상**  
섹션1 스캔 후 `{1: true}` → 섹션2 스캔 후 `{1: false, 2: true}`로 변경. UI에서도 도장 1이 사라짐.

**원인**

1. **UID 파편화** — iOS 사파리는 QR마다 새 탭을 엽니다. `onAuthStateChanged`가 `null`을 먼저 받으면 세션 복원 전에 `signInAnonymously()`가 호출되어 **매 스캔마다 새 UID**가 생성됨.
2. **stamps 맵 전체 덮어쓰기** — 문서가 없다고 판단되면 `{1: false, 2: true, ...}` 형태로 `stamps` 객체 전체를 교체해 기존 `true` 값이 소실됨.
3. **레이스 컨디션** — `replaceState`를 Firestore 쓰기 전에 실행하면, React Strict Mode 이중 실행 시 두 번째 실행이 “일반 진입”으로 오판해 빈 장부 `setDoc`을 날릴 수 있음.

**해결** (`src/services/auth.js`, `App.jsx`)

- `auth.authStateReady()`로 IndexedDB 세션 복원 대기 후, 없을 때만 1회 로그인
- 동시 다중 탭 `signInAnonymously` 중복 호출 방지 락
- `runTransaction` + 기존 문서는 `stamps.${id}: true` **점 표기법**으로 해당 칸만 갱신
- `useRef`로 스탬프 파이프라인 1회 실행 보장
- `replaceState`를 Firestore 쓰기 **성공 후**로 이동

**결과**  
동일 UID 문서(`users/{uid}`)에서 `{1: true, 2: true}` 누적 — Firebase 콘솔로 검증 완료.

### 2. 모바일 웹뷰 UX — `alert()` 제거

브라우저 기본 `alert()`는 웹뷰에서 메인 스레드를 블로킹해 네트워크·렌더링이 끊길 수 있습니다. 스탬프 적립 성공·참여 가이드·스태프 인증은 **React 상태 기반 커스텀 모달/토스트**로 대체했습니다.

### 3. Scroll-Free 단일 뷰포트

스탬프 카드를 `aspect-square` 그리드로 고정하고 여백을 압축해, 인앱 브라우저에서도 세로 스크롤 없이 한 화면에 모든 정보가 보이도록 조정했습니다.

---

## 로컬 실행

### 사전 요구

- Node.js 18+
- Firebase 프로젝트 (Anonymous Auth, Firestore 활성화)

### 환경 변수

루트에 `.env.local` 생성:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

### 명령어

```bash
npm install
npm run dev      # 개발 서버
npm run build    # 프로덕션 빌드
npm run preview  # 빌드 결과 미리보기
```

### QR 스탬프 테스트

브라우저에서 아래 URL로 접속합니다.

```
http://localhost:5173/?section=1
http://localhost:5173/?section=2
```

---

## 배포

```bash
npm run build
firebase deploy --only hosting
```

Firebase Hosting 설정은 `firebase.json` — `dist` 폴더, SPA rewrite (`**` → `index.html`).

---

## 관련 문서

- [docs/PRD.md](./docs/PRD.md) — 기획 명세, 부스 구성, 예외 처리 가이드

---

## 라이선스

본 프로젝트는 포트폴리오·행사 운영 목적으로 제작되었습니다.
