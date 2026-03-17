<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-17 | Updated: 2026-03-17 -->

# routes

## Purpose
SvelteKit 파일 기반 라우팅. 랜딩 페이지와 룸 페이지를 제공한다.

## Key Files

| File | Description |
|------|-------------|
| `+page.svelte` | 랜딩 페이지 — 방 생성, 코드로 참여 |
| `+layout.svelte` | 루트 레이아웃 — CSS import, favicon 설정 |
| `layout.css` | Tailwind CSS import |
| `page.svelte.spec.ts` | 랜딩 페이지 컴포넌트 테스트 (Vitest browser) |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `room/[roomId]/` | 동적 룸 페이지 — 에디터 + Yjs/WebRTC 연결 (see `room/AGENTS.md`) |

## For AI Agents

### Working In This Directory
- `+page.svelte`는 `$app/navigation`의 `goto`로 라우팅
- 방 코드 검증은 `$lib/utils/roomCode`의 `isValidRoomCode` 사용
- 컴포넌트 테스트는 `vitest-browser-svelte`의 `render` + `page` 객체 사용

<!-- MANUAL: -->
