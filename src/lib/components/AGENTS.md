<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-17 | Updated: 2026-03-17 -->

# components

## Purpose

재사용 Svelte 컴포넌트. 에디터와 Presence 표시를 담당한다.

## Key Files

| File              | Description                                                                                  |
| ----------------- | -------------------------------------------------------------------------------------------- |
| `Editor.svelte`   | Tiptap 에디터 — Yjs Collaboration extension으로 실시간 동기화. `ydoc: Y.Doc`을 prop으로 받음 |
| `Presence.svelte` | 접속 중인 피어 목록 표시 — `awareness: Awareness`를 prop으로 받아 아바타 + "N명" 렌더링      |

## For AI Agents

### Working In This Directory

- 두 컴포넌트 모두 `onMount`에서 초기화, cleanup 함수 반환
- Editor는 Tiptap `StarterKit` + `Collaboration` + `Placeholder` 사용
- Presence는 awareness `change` 이벤트를 구독하여 `$state` 업데이트
- 스타일은 `:global()` 선택자로 Tiptap 내부 DOM에 접근

### Dependencies

- `@tiptap/core`, `@tiptap/starter-kit`, `@tiptap/extension-collaboration`, `@tiptap/extension-placeholder`
- `y-protocols/awareness`

<!-- MANUAL: -->
