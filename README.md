# syncingsh

실시간 공유 메모장. 방 코드를 공유하면 누구나 같은 마크다운 문서를 동시에 편집할 수 있다.
모든 데이터는 메모리에만 존재하며, 모든 참여자가 나가면 소멸한다.

## 핵심 컨셉

- **Ephemeral** — 서버에 대화/문서 기록을 저장하지 않음
- **실시간 동기화** — Yjs CRDT + Supabase Realtime으로 실시간 동시 편집
- **로그인 Optional** — 게스트도 방 생성/참여 가능

## 기술 스택

| 영역 | 기술 |
|---|---|
| 프레임워크 | SvelteKit (Svelte 5) |
| 실시간 동기화 | Yjs + Supabase Realtime |
| 에디터 | WYSIWYG 마크다운 (블록 에디터) |
| 인증 | Supabase Auth (OAuth + 이메일) |
| 스타일링 | Tailwind CSS v4 |
| 배포 | Vercel |
| 테스트 | Vitest (브라우저 + Node) |

## 기능

### 방 (Room)
- 구글 클래스룸 스타일 짧은 영문+숫자 코드로 방 생성
- 방 코드를 입력해서 참여
- 모든 참여자 퇴장 시 데이터 소멸

### 에디터
- 노션 스타일 WYSIWYG 마크다운 편집기
- Yjs CRDT로 실시간 동시 편집 (충돌 없음)

### 사용자
- **로그인 유저** — OAuth(Google, GitHub 등) 또는 이메일 로그인. 닉네임/아이디 설정 가능
- **게스트** — 로그인 없이 참여. 닉네임/아이디는 `Guest(난수)` 또는 사용자 지정. localStorage에 저장

### Presence
- 현재 방에 접속한 사용자 닉네임 표시

## 개발

```bash
# 의존성 설치
bun install

# 개발 서버
bun run dev

# 빌드
bun run build
```
