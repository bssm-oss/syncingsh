# syncingsh

실시간 공유 메모장. 방 코드를 공유하면 누구나 같은 마크다운 문서를 동시에 편집할 수 있다.
모든 데이터는 메모리에만 존재하며, 모든 참여자가 나가면 소멸한다.

## 핵심 컨셉

- **Ephemeral** — 서버에 대화/문서 기록을 저장하지 않음
- **실시간 동기화** — Yjs CRDT + WebRTC P2P로 실시간 동시 편집
- **로그인 없음** — 누구나 바로 참여

## 기술 스택

| 영역          | 기술                           |
| ------------- | ------------------------------ |
| 프레임워크    | SvelteKit (Svelte 5)           |
| 실시간 동기화 | Yjs + WebRTC (P2P)             |
| 에디터        | WYSIWYG 마크다운 (블록 에디터) |
| 스타일링      | Tailwind CSS v4                |
| 배포          | Vercel                         |
| 테스트        | Vitest + Playwright            |

## 기능

### 방 (Room)

- 구글 클래스룸 스타일 짧은 영문+숫자 코드로 방 생성
- 방 코드를 입력해서 참여
- 모든 참여자 퇴장 시 데이터 소멸

### 에디터

- 노션 스타일 WYSIWYG 마크다운 편집기
- Yjs CRDT로 실시간 동시 편집 (충돌 없음)

### 사용자

- 로그인 없이 바로 참여
- 닉네임은 `Guest(난수)` 자동 부여 또는 사용자 지정. localStorage에 저장

### Presence

- 현재 방에 접속한 사용자 닉네임 표시

## 개발

```bash
# 의존성 설치
bun install

# 개발 서버
bun run dev

# 시그널링 서버 (로컬 P2P 연결용)
bun run signaling

# 테스트
bun run test        # 유닛 테스트
bun run test:e2e    # E2E 테스트

# 빌드
bun run build
```
