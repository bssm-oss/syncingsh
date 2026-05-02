# syncingsh-signaling

[y-webrtc](https://github.com/yjs/y-webrtc) 호환 WebSocket 시그널링 서버. Hono + TypeScript로 작성.

## 빠른 시작

```bash
cd signaling
npm install
```

### 개발

```bash
npm run dev
# → http://localhost:4444 (tsx watch, 코드 변경 시 자동 재시작)
```

또는 프로젝트 루트에서:

```bash
npm run signaling
```

### 프로덕션

```bash
npm run build   # TypeScript → dist/
npm start       # node dist/index.js
```

## 환경변수

| 변수                           | 기본값  | 설명                                                    |
| ------------------------------ | ------- | ------------------------------------------------------- |
| `PORT`                         | `4444`  | 서버 포트                                               |
| `WS_ORIGIN_ALLOWLIST`          | 없음    | 쉼표로 구분한 허용 Origin. 비어 있으면 모든 Origin 허용 |
| `WS_MAX_MESSAGE_BYTES`         | `16384` | WebSocket 메시지 최대 크기                              |
| `WS_MAX_TOPICS_PER_MESSAGE`    | `32`    | subscribe/unsubscribe 1회 요청의 최대 토픽 수           |
| `WS_MAX_TOPICS_PER_CONNECTION` | `128`   | 연결 1개가 구독할 수 있는 최대 토픽 수                  |
| `WS_MAX_TOPIC_LENGTH`          | `128`   | 토픽 이름 최대 길이                                     |
| `WS_MAX_PUBLISH_RECEIVERS`     | `128`   | publish 1회가 전달되는 최대 수신자 수                   |
| `WS_RATE_LIMIT_WINDOW_MS`      | `10000` | 연결별 rate limit 시간 창                               |
| `WS_RATE_LIMIT_MAX_MESSAGES`   | `120`   | 시간 창 안에서 연결별 허용 메시지 수                    |

## 엔드포인트

| 경로      | 프로토콜  | 설명                                         |
| --------- | --------- | -------------------------------------------- |
| `/`       | WebSocket | y-webrtc 시그널링 (subscribe, publish, ping) |
| `/health` | HTTP GET  | 헬스체크 (`ok` 반환)                         |

## 프로토콜

JSON over WebSocket. y-webrtc 클라이언트가 보내는 메시지 타입:

```jsonc
// 토픽(방) 구독
{ "type": "subscribe", "topics": ["room-abc"] }

// 구독 해제
{ "type": "unsubscribe", "topics": ["room-abc"] }

// 같은 토픽의 모든 피어에게 브로드캐스트
{ "type": "publish", "topic": "room-abc", /* ...payload */ }

// 앱 레벨 ping (서버가 { "type": "pong" } 응답)
{ "type": "ping" }
```

서버는 메시지 크기, 토픽 형식/개수, 연결별 메시지 빈도를 제한하고 30초마다 비활성 연결을 정리합니다.

## Docker 배포

```bash
cd signaling

# 빌드 + 실행
docker compose up -d

# 로그 확인
docker compose logs -f

# 중지
docker compose down
```

포트나 환경변수를 바꾸려면 `docker-compose.yml` 수정:

```yaml
services:
  signaling:
    build: .
    restart: unless-stopped
    ports:
      - '4444:4444' # 호스트:컨테이너
    environment:
      - PORT=4444
```

리버스 프록시(nginx/caddy) 뒤에서 SSL 붙이면 `wss://` 사용 가능.

## 기술 스택

- [Hono](https://hono.dev) + [@hono/node-ws](https://github.com/honojs/middleware/tree/main/packages/node-ws)
- TypeScript strict
- Node.js 20+
- Docker (multi-stage build, ~50MB 이미지)
