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
| 백엔드 | Spring Boot 3.x, PostgreSQL |
| 백엔드 빌드 | Gradle |
| 백엔드 ORM | Spring Data JPA (Hibernate 6) |
| 백엔드 인증 | Spring Security + JWT |
| 백엔드 실시간 | Spring WebSocket + STOMP |

---

## 디렉터리 구조

```
moim/
├── public/
│   └── favicon.ico
├── src/
│   ├── assets/              # 정적 이미지, SVG 아이콘
│   ├── components/
│   │   ├── common/          # 공통 UI (Toast 등)
│   │   ├── calendar/        # 날짜 선택 캘린더 컴포넌트
│   │   ├── map/             # Naver 지도 래퍼, 마커, 장소 검색
│   │   ├── chat/            # 채팅창, 메시지 버블, 입력창
│   │   └── room/            # RoomLayout (WebSocket 연결 진입점), 네비게이션
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

## 실시간 통신 (STOMP/WebSocket)

- 연결 엔드포인트: `ws://host/ws/native` (native WebSocket, Vite 프록시 경유)
- `useWebSocket` 훅은 `RoomLayout`에서 **한 번만** 호출하고 `sendMessage`를 ChatPanel에 prop으로 전달
  - ChatPanel이 직접 훅을 호출하면 WebSocket 연결이 중복 생성되므로 금지
- 재연결 로직: STOMP `reconnectDelay: 5000` (5초 백오프)

### 채팅
- 구독: `/topic/room/{roomId}` → `useChatStore.addMessage()`
- 발행: `/app/room/{roomId}/message`

### 일정 변경 실시간 반영
- 구독: `/topic/room/{roomId}/schedule` → `useScheduleStore.setAggregated()`
- 서버에서 `POST /api/rooms/{roomId}/schedules` 처리 후 `SimpMessagingTemplate`으로 브로드캐스트
- 덕분에 한 참여자가 날짜를 저장하면 같은 방의 모든 참여자 달력에 즉시 반영됨
- `useWebSocket(roomId, { onScheduleUpdate })` 형태로 콜백 주입

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
| 일정 저장 | 덮어쓰기 방식 (DELETE + INSERT). 저장 완료 후 `/topic/room/{roomId}/schedule`로 집계 브로드캐스트 |
| 내 방 목록 | `GET /api/rooms` — 참여자 테이블 기준 조회 (내가 만든 방 + 초대받은 방 모두 포함), 최신순 |
| WebSocket 연결 위치 | `RoomLayout`에서 한 번만 `useWebSocket` 호출. ChatPanel은 `sendMessage` prop으로 수신 |
| 채팅 커서 페이지네이션 | `cursor = null` 이면 최신 N개, `cursor = sentAt(LocalDateTime)` 이면 그 이전 N개. 쿼리를 두 개로 분리해 PostgreSQL 타입 추론 오류 방지 |

---

---

## 서버 아키텍처

### 패키지 구조

```
src/main/java/com/moim/
├── MoimApplication.java
├── config/
│   ├── SecurityConfig.java          # Spring Security 필터체인, CORS, 공개/보호 경로
│   ├── WebSocketConfig.java         # STOMP 브로커, 엔드포인트 등록
│   ├── JwtChannelInterceptor.java   # WebSocket CONNECT 시 JWT 검증 (★ 별도 필요)
│   └── SchedulingConfig.java        # @EnableScheduling + ShedLock 설정
├── domain/
│   ├── user/
│   │   ├── entity/User.java
│   │   ├── repository/UserRepository.java
│   │   ├── service/UserService.java
│   │   └── controller/UserController.java
│   ├── room/
│   │   ├── entity/Room.java
│   │   ├── entity/RoomParticipant.java
│   │   ├── repository/RoomRepository.java
│   │   ├── repository/RoomParticipantRepository.java
│   │   ├── service/RoomService.java
│   │   └── controller/RoomController.java
│   ├── schedule/
│   │   ├── entity/Schedule.java
│   │   ├── repository/ScheduleRepository.java
│   │   ├── service/ScheduleService.java
│   │   └── controller/ScheduleController.java
│   ├── location/
│   │   ├── entity/Place.java
│   │   ├── entity/UserOrigin.java
│   │   ├── entity/TravelTime.java
│   │   ├── repository/PlaceRepository.java
│   │   ├── repository/TravelTimeRepository.java
│   │   ├── service/LocationService.java
│   │   └── controller/LocationController.java
│   └── chat/
│       ├── entity/ChatMessage.java
│       ├── repository/ChatMessageRepository.java
│       ├── service/ChatService.java
│       └── controller/ChatController.java   # @MessageMapping STOMP 핸들러
├── auth/
│   ├── jwt/
│   │   ├── JwtProvider.java
│   │   ├── JwtAuthenticationFilter.java
│   │   └── JwtProperties.java              # application.yml 바인딩
│   ├── oauth2/
│   │   ├── CustomOAuth2UserService.java    # Google/Kakao 유저 정보 처리
│   │   ├── OAuth2SuccessHandler.java       # JWT 발급 후 프론트로 리다이렉트
│   │   └── CookieOAuth2RequestRepository.java  # 인가 요청 쿠키 저장 (★ stateless 필수)
│   └── controller/AuthController.java      # 로컬 로그인·회원가입·토큰 갱신
├── global/
│   ├── exception/
│   │   ├── GlobalExceptionHandler.java     # @RestControllerAdvice
│   │   ├── ErrorCode.java                  # enum (코드, HTTP 상태, 메시지)
│   │   └── BusinessException.java
│   ├── response/ApiResponse.java           # { success, data, error } 공통 응답 래퍼
│   └── scheduler/RoomExpiryScheduler.java  # 약속방 자동 파기 크론잡
└── infra/
    └── naver/
        ├── NaverDirectionsClient.java      # Naver Directions API HTTP 호출 (서버사이드)
        └── NaverDirectionsResponse.java
```

---

### DB 엔티티 설계

```
users
  id            UUID PK default gen_random_uuid()
  email         VARCHAR(255) UNIQUE NOT NULL
  name          VARCHAR(100) NOT NULL
  profile_url   VARCHAR(500)
  provider      ENUM('LOCAL','GOOGLE','KAKAO') NOT NULL
  provider_id   VARCHAR(255)                   # 소셜 로그인 식별자
  created_at    TIMESTAMP NOT NULL

rooms
  id            UUID PK default gen_random_uuid()
  title         VARCHAR(200) NOT NULL
  host_id       UUID FK → users.id NOT NULL
  status        ENUM('ACTIVE','CONFIRMED','CANCELLED') DEFAULT 'ACTIVE'
  confirmed_date DATE
  confirmed_place_id UUID FK → places.id
  created_at    TIMESTAMP NOT NULL
  expires_at    TIMESTAMP                      # confirmed_date + 1개월; NULL이면 미확정

room_participants
  room_id       UUID FK → rooms.id
  user_id       UUID FK → users.id
  joined_at     TIMESTAMP NOT NULL
  PK (room_id, user_id)

schedules
  id            UUID PK
  room_id       UUID FK → rooms.id
  user_id       UUID FK → users.id
  available_date DATE NOT NULL
  UNIQUE (room_id, user_id, available_date)

user_origins
  id            UUID PK
  room_id       UUID FK → rooms.id
  user_id       UUID FK → users.id
  lat           DOUBLE PRECISION NOT NULL
  lng           DOUBLE PRECISION NOT NULL
  label         VARCHAR(200)                   # "강남구" 같은 대략적 주소
  UNIQUE (room_id, user_id)

places
  id            UUID PK
  room_id       UUID FK → rooms.id
  name          VARCHAR(200) NOT NULL
  address       VARCHAR(500)
  lat           DOUBLE PRECISION NOT NULL
  lng           DOUBLE PRECISION NOT NULL
  registered_by UUID FK → users.id
  created_at    TIMESTAMP NOT NULL

travel_times
  id            UUID PK
  place_id      UUID FK → places.id
  user_id       UUID FK → users.id
  transport     ENUM('TRANSIT','CAR','WALK') NOT NULL
  duration_min  INTEGER NOT NULL               # 분 단위
  calculated_at TIMESTAMP NOT NULL
  UNIQUE (place_id, user_id, transport)        # 캐시 역할

chat_messages
  id            UUID PK
  room_id       UUID FK → rooms.id
  user_id       UUID FK → users.id
  content       TEXT NOT NULL
  sent_at       TIMESTAMP NOT NULL
```

CASCADE 전략: `rooms` 삭제 시 하위 테이블 전체 CASCADE DELETE.

---

### REST API 엔드포인트

```
# 인증
POST   /api/auth/signup                    # 로컬 회원가입
POST   /api/auth/login                     # 로컬 로그인 → { accessToken, refreshToken }
POST   /api/auth/refresh                   # 토큰 갱신
GET    /api/auth/google                    # Google OAuth 시작 (Spring Security 처리)
GET    /api/auth/kakao                     # Kakao OAuth 시작
GET    /api/auth/callback/google           # OAuth 콜백 → 프론트로 ?token=... 리다이렉트
GET    /api/auth/callback/kakao

# 약속방
GET    /api/rooms                          # 내가 참여 중인 방 목록 (최신순, 인증 필요) ★ 추가
POST   /api/rooms                          # 방 생성
GET    /api/rooms/{roomId}                 # 방 상세 (참여자 목록 포함)
POST   /api/rooms/{roomId}/join            # 초대 링크로 방 참가 (10명 초과 시 409)
DELETE /api/rooms/{roomId}                 # 방 삭제·파토 (host only)
POST   /api/rooms/{roomId}/confirm         # 날짜+장소 확정 (host only)

# 일정
POST   /api/rooms/{roomId}/schedules       # 내 가능 날짜 저장 (배열, 덮어쓰기) → 저장 후 WebSocket 브로드캐스트
GET    /api/rooms/{roomId}/schedules       # 전체 참여자 날짜 집계 응답 { "2026-06-01": 3, ... }

# 장소
POST   /api/rooms/{roomId}/origins         # 내 출발지 저장
GET    /api/rooms/{roomId}/origins         # 전체 출발지 조회
POST   /api/rooms/{roomId}/places          # 후보지 등록
DELETE /api/rooms/{roomId}/places/{placeId}
GET    /api/rooms/{roomId}/places/{placeId}/travel-times?transport=TRANSIT
       # Naver Directions 프록시 → TravelTime 캐시 우선 조회

# 채팅 히스토리 (REST)
GET    /api/rooms/{roomId}/messages?cursor={sentAt}&size=50
       # cursor: LocalDateTime 문자열. 없으면 최신 50개, 있으면 해당 시각 이전 50개

# 결과
GET    /api/rooms/{roomId}/result          # 확정 날짜·장소·시간 요약

# 시간 투표 (선택 기능)
POST   /api/rooms/{roomId}/time-votes
GET    /api/rooms/{roomId}/time-votes
```

---

### WebSocket (STOMP)

```
연결: ws://host/ws/native        (native WebSocket, SockJS 미사용)
      ws://host/ws/chat          (SockJS fallback, 레거시 호환)

# 채팅
구독: /topic/room/{roomId}              → ChatMessage JSON 수신
발행: /app/room/{roomId}/message        → { content: string }

# 일정 변경 실시간 반영 ★ 추가
구독: /topic/room/{roomId}/schedule     → { "2026-06-01": 3, ... } (집계 결과 전체)
     POST /schedules 저장 완료 시 서버가 SimpMessagingTemplate으로 자동 브로드캐스트
```

STOMP CONNECT 시 `Authorization: Bearer {token}` 헤더 전달.
`JwtChannelInterceptor.preSend()`에서 CONNECT 프레임을 가로채 토큰 검증 후 `Principal` 주입.

---

### 인증 설계 주의사항

**1. OAuth2 인가 요청 상태 — 쿠키 기반 필수**

Spring Security 기본 구현(`HttpSessionOAuth2AuthorizationRequestRepository`)은 세션에 상태를 저장하는데, JWT 기반 stateless 서버에서 세션을 쓰면 수평 확장 시 문제 발생.
→ `CookieOAuth2RequestRepository` 커스텀 구현으로 인가 요청 상태를 서명된 쿠키에 저장.

**2. WebSocket JWT 검증 — Security 필터체인 우회 주의**

Spring Security의 HTTP 필터체인은 HTTP 핸드셰이크 시점까지만 작동. STOMP 레벨 메시지는 별도 `ChannelInterceptor`로 검증해야 함. 이를 빠뜨리면 토큰 없이 채팅 가능한 상태가 됨.

**3. Refresh Token 저장**

Refresh Token은 `HttpOnly + Secure` 쿠키로 내려보내 XSS 탈취 방지. Access Token은 응답 body로 전달, 프론트 메모리(Zustand)에만 보관.

---

### 10명 제한 — 레이스 컨디션 방어

동시에 두 명이 9인 방에 참가 요청 시 둘 다 통과되는 문제 발생 가능.

```java
// RoomService.joinRoom()
@Transactional
public void joinRoom(UUID roomId, UUID userId) {
    // 비관적 락: 같은 roomId 행에 대해 SELECT ... FOR UPDATE
    Room room = roomRepository.findByIdWithLock(roomId)
        .orElseThrow(() -> new BusinessException(ErrorCode.ROOM_NOT_FOUND));

    if (room.getParticipants().size() >= 10) {
        throw new BusinessException(ErrorCode.ROOM_FULL);
    }
    // 참가 처리
}
```

`findByIdWithLock`은 `@Lock(LockModeType.PESSIMISTIC_WRITE)` 적용.

---

### Naver Directions API — 캐싱 전략

후보지 N개 × 참여자 10명 = 최대 N×10회 API 호출. 매 조회마다 호출하면 쿼터 초과 위험.

```
요청 흐름:
1. 프론트 → GET /places/{placeId}/travel-times?transport=TRANSIT
2. LocationService: TravelTime 캐시 조회 (place_id + user_id + transport)
3. 캐시 HIT  → 저장된 duration_min 반환
4. 캐시 MISS → NaverDirectionsClient 호출 → 결과를 TravelTime 테이블에 저장 후 반환
```

출발지나 목적지가 변경되면 해당 `travel_times` 행을 삭제해 캐시 무효화.

---

### 약속방 자동 파기 스케줄러

```java
// RoomExpiryScheduler.java
@Scheduled(cron = "0 0 3 * * *")   // 매일 새벽 3시
@SchedulerLock(name = "roomExpiry", lockAtMostFor = "PT1H")
public void deleteExpiredRooms() {
    roomRepository.deleteByExpiresAtBefore(LocalDateTime.now());
    // CASCADE DELETE로 하위 데이터 일괄 삭제
}
```

다중 인스턴스 환경에서 중복 실행 방지를 위해 **ShedLock** 적용 (`shedlock-provider-jdbc-template`).
`expires_at` 컬럼에 인덱스 필수.

---

### 공통 예외 응답 형식

```json
{
  "success": false,
  "error": {
    "code": "ROOM_FULL",
    "message": "약속방 인원이 가득 찼습니다."
  }
}
```

`ErrorCode` enum에 HTTP 상태와 메시지 함께 정의. 프론트는 `error.code`로 케이스 분기.

---

### 서버 환경 변수 (`application.yml` / 시스템 환경)

```yaml
spring:
  datasource:
    url: ${DB_URL}                        # jdbc:postgresql://host:5432/moim
    username: ${DB_USER}
    password: ${DB_PASSWORD}
  security:
    oauth2.client:                        # Google/Kakao 클라이언트 정보

jwt:
  secret: ${JWT_SECRET}                  # 256비트 이상 랜덤 문자열
  access-expiry: 3600                    # 1시간 (초)
  refresh-expiry: 1209600                # 14일 (초)

naver:
  directions:
    client-id: ${NAVER_CLIENT_ID}
    client-secret: ${NAVER_CLIENT_SECRET}
    base-url: https://naveropenapi.apigw.ntruss.com

app:
  front-url: ${FRONT_URL}               # 프론트 Origin (CORS + OAuth 리다이렉트)
```

---

## 코딩 컨벤션

- 컴포넌트 파일명: **PascalCase** (`RoomHeader.jsx`)
- 훅/유틸/서비스 파일명: **camelCase** (`useNaverMap.js`, `dateUtils.js`)
- CSS Modules: 컴포넌트와 동일 디렉터리에 `ComponentName.module.css`
- 상수: `UPPER_SNAKE_CASE`
- API 응답 타입 정의는 JSDoc으로 서비스 파일 상단에 기재
- `console.log` 커밋 금지; 디버깅은 개발 전용 `import.meta.env.DEV` 조건부 처리
