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

| 변수   | 기본값 | 설명      |
| ------ | ------ | --------- |
| `PORT` | `4444` | 서버 포트 |

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

서버는 30초마다 비활성 연결을 정리합니다.

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
