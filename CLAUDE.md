# moim — 개발 가이드

모임 구성원들의 가능 일정을 공유·조율해 최적의 약속 날짜와 장소를 정하는 일정 조율 서비스.

---

## 프로젝트 스택

| 분류 | 기술 |
|------|------|
| 번들러 | Vite |
| UI | React 18 |
| 언어 | JavaScript (JSX) |
| 스타일 | CSS Modules (파일당 `*.module.css`) |
| 상태관리 | Zustand |
| HTTP | Axios |
| 라우팅 | React Router v6 |
| 실시간 통신 | STOMP over SockJS (`@stomp/stompjs`, `sockjs-client`) |
| 지도 | Naver Maps JS API v3 (CDN 스크립트 로드) |
| 백엔드 (참고) | Spring Boot, MySQL |

---

## 디렉터리 구조

```
moim/
├── public/
│   └── favicon.ico
├── src/
│   ├── assets/              # 정적 이미지, SVG 아이콘
│   ├── components/
│   │   ├── common/          # Button, Modal, Input, Avatar 등 공통 UI
│   │   ├── calendar/        # 날짜 선택 캘린더 컴포넌트
│   │   ├── map/             # Naver 지도 래퍼, 마커, 장소 검색
│   │   ├── chat/            # 채팅창, 메시지 버블, 입력창
│   │   └── room/            # 방 헤더, 참여자 목록, 초대 링크 복사
│   ├── pages/
│   │   ├── Home/            # 랜딩 / 내 약속 목록
│   │   ├── Auth/            # Login, Signup, OAuth 콜백
│   │   ├── Room/            # 약속방 메인 (탭: 날짜·장소·채팅)
│   │   └── Result/          # 최종 확정 결과 화면
│   ├── stores/              # Zustand 스토어
│   │   ├── useAuthStore.js
│   │   ├── useRoomStore.js
│   │   ├── useScheduleStore.js
│   │   ├── useLocationStore.js
│   │   └── useChatStore.js
│   ├── services/            # Axios API 호출 함수
│   │   ├── api.js           # Axios 인스턴스 + 인터셉터
│   │   ├── authService.js
│   │   ├── roomService.js
│   │   ├── scheduleService.js
│   │   ├── locationService.js
│   │   └── chatService.js
│   ├── hooks/               # 커스텀 훅
│   │   ├── useNaverMap.js   # 지도 초기화 & 정리
│   │   ├── useWebSocket.js  # STOMP 연결 관리
│   │   └── useRoom.js       # 방 진입 시 데이터 로드
│   ├── utils/
│   │   ├── dateUtils.js     # 날짜 포맷·비교 헬퍼
│   │   └── mapUtils.js      # 좌표 변환, 마커 생성 헬퍼
│   ├── constants/
│   │   └── index.js         # MAX_PARTICIPANTS=10, API 경로 등
│   ├── router.jsx           # React Router 라우트 정의
│   ├── App.jsx
│   └── main.jsx
├── index.html
├── .env                     # VITE_ 접두사 환경변수 (gitignore)
├── .env.example
├── vite.config.js
└── package.json
```

---

## 환경 변수 (`.env`)

```
VITE_API_BASE_URL=http://localhost:8080/api
VITE_WS_URL=ws://localhost:8080/ws
VITE_NAVER_MAP_CLIENT_ID=your_naver_client_id
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_KAKAO_REST_API_KEY=your_kakao_key
```

`.env`는 절대 커밋하지 않는다. `.env.example`에 키 이름만 기재.

---

## 라우트 구조

```
/                          → Home (랜딩, 내 방 목록)
/login                     → Auth/Login
/signup                    → Auth/Signup
/auth/callback/google      → OAuth 콜백 처리
/auth/callback/kakao       → OAuth 콜백 처리
/room/new                  → 방 생성 폼
/room/:roomId              → Room (날짜·장소·채팅 탭)
/room/:roomId/result       → Result (최종 확정 화면)
```

`/room/:roomId`는 로그인 여부와 무관하게 링크 진입 허용 (비회원도 초대 링크 접근 가능).
비회원은 로그인 유도 모달 표시 후 저장된 `roomId`로 자동 리다이렉트.

---

## Zustand 스토어 역할

### `useAuthStore`
- `user`, `accessToken`, `isAuthenticated`
- `login()`, `logout()`, `refreshToken()`
- `persist` 미들웨어로 `localStorage`에 토큰 유지

### `useRoomStore`
- `room` (id, title, hostId, participants[])
- `maxParticipants = 10` 검증은 백엔드 책임; 프론트는 UI 비활성화로 추가 안내만

### `useScheduleStore`
- `myDates` (내가 선택한 날짜 배열)
- `aggregated` (참여자별 가능 날짜 집계 결과)
- `confirmedDate` (확정된 날짜)

### `useLocationStore`
- `myOrigin` (내 출발지 좌표)
- `candidates[]` (핑 찍힌 후보 장소)
- `travelTimes{}` (candidateId → 참여자별 이동시간)
- `confirmedPlace`

### `useChatStore`
- `messages[]`
- `isConnected`
- WebSocket 연결 상태는 `useWebSocket` 훅이 관리하고 스토어에 메시지만 push

---

## Axios 인스턴스 (`services/api.js`)

```js
// 요청 인터셉터: Authorization 헤더 자동 첨부
// 응답 인터셉터: 401 → refresh 시도 → 실패 시 logout() + /login 리다이렉트
```

모든 API 호출은 `services/` 레이어를 통한다. 컴포넌트에서 직접 `axios.get()` 금지.

---

## Naver Maps 연동 주의사항

1. **CDN 로드:** `index.html`의 `<script>` 태그로 로드. `window.naver.maps`가 준비된 뒤 컴포넌트 마운트 필요.
2. **CORS:** Naver Directions API (길찾기)는 클라이언트에서 직접 호출 시 CORS 차단. **반드시 Spring Boot 서버를 통해 프록시.**  클라이언트 ID를 브라우저에 노출하지 않는다.
3. **지도 정리:** `useNaverMap` 훅의 cleanup 함수에서 `map.destroy()` 호출. 미호출 시 메모리 누수.
4. **마커 제거:** 후보지 삭제 시 `marker.setMap(null)` 명시적 호출 필요.

---

## 실시간 채팅 (STOMP/WebSocket)

- 연결 엔드포인트: `VITE_WS_URL + /chat`
- 구독 경로: `/topic/room/{roomId}`
- 발행 경로: `/app/room/{roomId}/message`
- `useWebSocket` 훅이 방 진입 시 연결, 퇴장/언마운트 시 `client.deactivate()`.
- 재연결 로직: STOMP `reconnectDelay` 옵션 활용 (백오프).

---

## 소셜 로그인 플로우

```
클라이언트 → 백엔드 /auth/google or /auth/kakao (redirect_uri 포함)
→ 소셜 인가 서버 → 백엔드 콜백
→ 백엔드가 JWT 발급 후 /auth/callback/google?token=... 로 리다이렉트
→ 프론트 콜백 페이지: URL 파라미터에서 token 추출 → useAuthStore 저장
```

프론트에서 OAuth 클라이언트 시크릿을 직접 다루지 않는다.

---

## 기능별 제약 및 설계 결정

| 기능 | 결정 사항 |
|------|-----------|
| 최대 참여인원 | 10명. 백엔드 검증 주체, 프론트는 10명 초과 시 초대 버튼 비활성화 |
| 시간 정하기 | 날짜 확정 후 Result 페이지에서 선택적으로 활성화. 기본 숨김 |
| 약속방 자동 파기 | 백엔드 스케줄러 처리. 프론트는 만료 방 접근 시 404 화면 표시 |
| 출발지 정확도 | 대략적 위치(동네 수준) 또는 정확한 주소 선택 허용 |
| 채팅 UI 참고 | Discord 스타일: 우측 멤버 패널, 날짜별 구분선, 읽지않은 메시지 배지 |

---

## 코딩 컨벤션

- 컴포넌트 파일명: **PascalCase** (`RoomHeader.jsx`)
- 훅/유틸/서비스 파일명: **camelCase** (`useNaverMap.js`, `dateUtils.js`)
- CSS Modules: 컴포넌트와 동일 디렉터리에 `ComponentName.module.css`
- 상수: `UPPER_SNAKE_CASE`
- API 응답 타입 정의는 JSDoc으로 서비스 파일 상단에 기재
- `console.log` 커밋 금지; 디버깅은 개발 전용 `import.meta.env.DEV` 조건부 처리
