# REFILL FESTA STAMP TOUR

> 앱 설치 없이 QR 스캔만으로 부스 스탬프를 적립·경품 교환까지 처리하는 **모바일 웹 스탬프 투어**

[![Live Demo](https://img.shields.io/badge/demo-live-DE6273?style=for-the-badge)](https://refeel-festa-stampweb.web.app/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-Hosting%20%2B%20Firestore-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)

**배포** · [https://refeel-festa-stampweb.web.app/](https://refeel-festa-stampweb.web.app/)  
**행사** · 리필페스타 팝업스토어 (상명대)  
**역할** · 기획 연동 · 프론트엔드 · Firebase 연동 · 배포 · 현장 이슈 트러블슈팅  
**Last updated** · 2026-06-24

---

## 한 줄 요약

오프라인 팝업 현장에서 방문객이 **스마트폰 카메라로 QR을 스캔**하면 웹에서 스탬프가 자동 적립되고, **4부스 중 3개 이상** 수집 시 현장 스태프 인증 후 경품을 교환합니다. iOS 사파리의 **QR → 새 탭** 환경에서 발생한 세션 분리·데이터 덮어쓰기 버그를 해결하고, **Firestore 보안 규칙**까지 적용해 실서비스로 배포했습니다.

---

## 왜 이 프로젝트인가

| 현장 요구 | 구현 |
|-----------|------|
| 앱 설치·회원가입 없이 즉시 참여 | Firebase Anonymous Auth |
| QR 스캔 즉시 도장 반영 | `?section=1~4` + Firestore Transaction |
| 여러 부스를 돌아도 도장 유지 | UID 세션 보장 + 점 표기법 업데이트 |
| 경품 중복 수령 방지 | `isClaimed` 잠금 + 체험완료 전용 화면 |
| 스태프 현장 대응 | 수동 URL 백업, 개발자 리셋(히든) |

---

## 성과

- **프로덕션 배포** — Firebase Hosting SPA, 실제 행사 운영 가능 수준
- **데이터 무결성** — 연속 QR 스캔 시 `{1:true, 2:true}` 누적 검증 (Firebase 콘솔 확인)
- **실시간 UI** — `onSnapshot`으로 새로고침 없이 스탬프 카드 동기화
- **보안 강화** — `allow read, write: if true` → 본인 문서 전용 규칙으로 교체·배포
- **모바일 UX** — Scroll-Free 단일 뷰포트, 커스텀 모달/토스트 (`alert` 제거)

---

## 기술 스택

| 구분 | 기술 |
|------|------|
| Frontend | React 19, Vite 8, Tailwind CSS 3 |
| Auth / DB | Firebase Anonymous Auth, Cloud Firestore |
| Hosting | Firebase Hosting (SPA rewrite) |
| Security | Firestore Security Rules (`firestore.rules`) |
| Tooling | ESLint, PostCSS |

---

## 주요 기능

1. **익명 인증** — `authStateReady()` 후 세션 복원, 없을 때만 1회 로그인
2. **QR 스탬프 적립** — `?section=1~4` 파라미터 → 트랜잭션 기반 도장 적립
3. **실시간 스탬프 카드** — 4칸 원형 UI, 섹션별 브랜드 컬러·아이콘
4. **경품 교환** — 3개 이상 수집 시 스태프 암호 인증 → `isClaimed` 잠금
5. **체험완료 화면** — 실시간 시계, 스크린샷 재사용 어뷰징 완화
6. **중복 스캔 안내** — 이미 완료된 부스 재스캔 시 토스트
7. **스태프 백업** — QR 오류 시 `?section=N` URL 수동 안내 가능
8. **개발자 리셋** — 체험완료 화면 타이틀 5회 탭 + 관리자 인증

---

## 시스템 아키텍처

```
[부스 QR 스캔]  →  ?section=N
        │
        ▼
[ensureAnonymousUser]   authStateReady() → UID 재사용 또는 1회 익명 로그인
        │
        ▼
[applyStamp]            runTransaction → stamps.N만 갱신 (맵 전체 교체 금지)
        │
        ▼
[Cloud Firestore]  ──onSnapshot──►  [React UI]
        ▲
[Security Rules]        본인 users/{uid}만 접근 · 3스탬프 이상만 claimed 허용
```

### 디렉터리 구조

```
src/
├── App.jsx                         # 메인 UI · 스탬프 파이프라인 · 모달
├── services/
│   ├── firebase.js                 # Firebase 초기화 (.env)
│   └── auth.js                     # 익명 세션 보장 (authStateReady + 로그인 락)
├── components/
│   ├── Common/
│   │   ├── RibbonBanner.jsx        # 리본 배너
│   │   ├── SectionIcon.jsx         # 섹션 아이콘 (CSS mask)
│   │   └── Toast.jsx               # 토스트 알림
│   └── Layout/
│       ├── FestaHeader.jsx         # 헤더 · 로고 · 리본
│       ├── Garland.jsx             # 가랜드 장식
│       ├── LiveTimer.jsx           # 실시간 시계
│       ├── LoadingScreen.jsx       # 로딩 화면
│       └── PageShell.jsx           # 페이지 레이아웃 셸
├── features/
│   └── reward/
│       └── ClaimedScreen.jsx       # 경품 수령 완료 화면
├── styles/
│   └── index.css                   # Tailwind · SinchonRhapsody 폰트
└── assets/                         # 로고, 아이콘, 스탬프 완료 이미지

firestore.rules                     # Firestore 보안 규칙
firebase.json                       # Hosting + Firestore rules 설정
docs/PRD.md                         # 기획 명세
```

### Firestore 스키마

```
users/{uid}
  ├── stamps: { 1: bool, 2: bool, 3: bool, 4: bool }
  ├── isClaimed: bool
  ├── createdAt: Timestamp
  ├── updatedAt: Timestamp
  └── claimedAt: Timestamp (경품 수령 시)
```

### 보안 규칙 요약

| 규칙 | 내용 |
|------|------|
| 읽기/쓰기 | 익명 로그인 사용자 **본인 `users/{uid}`만** |
| 경품 수령 | 스탬프 **3개 이상**일 때만 `isClaimed: true` 허용 |
| 수령 후 | 스탬프 추가 차단 (개발자 전체 리셋만 예외) |
| 삭제 | `users` 문서 삭제 불가 |

> 팝업 이벤트 특성상 스태프 암호·URL 파라미터는 빌드 시 클라이언트에 포함되며, 암호 값은 `.env.local`로 관리합니다. DB 전체 공개 수준의 위험은 규칙 배포로 제거했습니다.

---

## Firebase 무료 요금 (Spark 플랜)

행사 규모(팝업스토어·교내 축제)에서는 **기본 무료 요금으로 충분**한 경우가 대부분입니다.

| 항목 | Spark(무료) 일일 한도 | 참가자 1명당 대략 |
|------|----------------------|-------------------|
| Firestore 읽기 | 50,000회 | 15~25회 (스냅샷·트랜잭션 포함) |
| Firestore 쓰기 | 20,000회 | 5~8회 (스탬프·경품 완료) |
| Anonymous Auth | 무제한 | 1회 |
| Hosting 전송 | 360MB/일 | 정적 파일 수 MB 수준 |

**대략적인 여유 인원** (하루 기준, 4부스 순회·경품 1회 가정)

- 읽기 한도 → **약 2,000~3,000명** / 일
- 쓰기 한도 → **약 2,500~4,000명** / 일

상명대 팝업스토어 수준의 단기 행사라면 한도 초과 가능성은 **매우 낮습니다.**  
다만 행사 전 Firebase 콘솔 → **Usage**에서 전일 사용량을 한 번 확인하고, 당일 방문객이 2,000명을 넘을 것 같으면 Blaze(종량제)로 전환해 두면 안심할 수 있습니다. Blaze도 무료 한도까지는 과금되지 않습니다.

---

## 트러블슈팅

### 연속 QR 스캔 시 이전 스탬프가 사라지는 문제

**증상**  
섹션1 스캔 후 `{1: true}` → 섹션2 스캔 후 `{1: false, 2: true}`. UI에서도 도장 1이 사라짐.

**원인**

1. **UID 파편화** — iOS 사파리는 QR마다 새 탭을 엽니다. 세션 복원 전 `signInAnonymously()`가 호출되면 **매 스캔마다 새 UID** 생성.
2. **stamps 맵 전체 덮어쓰기** — 문서 없음으로 오판 시 `{1: false, 2: true, ...}` 형태로 전체 교체.
3. **레이스 컨디션** — `replaceState`를 Firestore 쓰기 전에 실행하면 Strict Mode 이중 실행 시 빈 장부 `setDoc` 발생.

**해결**

```js
// auth.js — 세션 복원 대기 후 1회 로그인
await auth.authStateReady();
if (!auth.currentUser) await signInAnonymously(auth);

// App.jsx — 해당 칸만 갱신
transaction.update(userDocRef, {
  [`stamps.${sectionId}`]: true,
  updatedAt: serverTimestamp(),
});
```

- `runTransaction` + `stamps.${id}` 점 표기법
- `useRef`로 스탬프 파이프라인 1회 실행 보장
- `replaceState`를 Firestore 쓰기 **성공 후**로 이동

**결과** — 동일 UID에서 `{1: true, 2: true}` 누적, Firebase 콘솔 검증 완료.

### Firestore 보안 규칙 전면 개방

**증상** — 초기 규칙 `allow read, write: if true`로 누구나 전체 DB 접근 가능.

**해결** — `firestore.rules` 작성 후 `firebase deploy --only firestore:rules` 배포. 앱 동작·현장 테스트 모두 정상 확인.

### 모바일 웹뷰 UX

브라우저 `alert()`는 웹뷰에서 메인 스레드를 블로킹할 수 있어, 성공 모달·토스트·스태프 인증 UI를 React 상태 기반으로 전환했습니다.

---

## UI / 브랜딩

- **타이포** — SinchonRhapsody 커스텀 폰트 (`font-sinchon`)
- **컬러** — 부스별 4색 팔레트 + `festa.*` 브랜드 컬러 (Tailwind extend)
- **레이아웃** — `PageShell` + `FestaHeader` + `Garland`로 행사 톤 통일
- **스탬프 카드** — `aspect-square` 그리드, Scroll-Free 단일 뷰포트

| 섹션 | 부스명 | 배경 |
|------|--------|------|
| 1 | 감정 하나 볼펜 하나 | `#f6f1f4` |
| 2 | 나의 감정 트럭: Crush ! | `#ecc4cd` |
| 3 | 수뭉이의 행복 충전소 | `#d7eef9` |
| 4 | 기록, 감정 보관소 | `#b7d6f1` |

---

## 로컬 실행

### 사전 요구

- Node.js 18+
- Firebase 프로젝트 (Anonymous Auth · Firestore 활성화)

### 환경 변수

`.env.example`을 복사해 `.env.local`을 생성합니다. **`.env.local`은 Git에 올리지 않습니다.**

```bash
cp .env.example .env.local   # Windows: copy .env.example .env.local
```

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

# 현장 운영용 (저장소·GitHub에 실제 값 기재 금지)
VITE_STAFF_PASSWORD=
VITE_DEV_RESET_PASSWORD=
```

> 배포 시 `npm run build`가 `.env.local` 값을 번들에 포함합니다. 암호 변경 후에는 **재빌드·재배포**가 필요합니다.

### 명령어

```bash
npm install
npm run dev       # http://localhost:5173
npm run build
npm run preview
npm run lint
```

### QR 스탬프 테스트

```
http://localhost:5173/?section=1
http://localhost:5173/?section=2
http://localhost:5173/?section=3
http://localhost:5173/?section=4
```

---

## 배포

```bash
npm run build
firebase deploy --only hosting
firebase deploy --only firestore:rules   # 보안 규칙 (최초 1회 또는 규칙 변경 시)
# 또는 한 번에
firebase deploy
```

`firebase.json` — `dist` SPA rewrite, `firestore.rules` 연동.

---

## 관련 문서

- [docs/PRD.md](./docs/PRD.md) — 기획 명세, 부스 구성, 예외 처리 가이드
- [docs/STAFF_GUIDE.md](./docs/STAFF_GUIDE.md) — **현장 스태프·경품 교환 담당자 사용 설명서**

---

## 라이선스

본 프로젝트는 포트폴리오·행사 운영 목적으로 제작되었습니다.
