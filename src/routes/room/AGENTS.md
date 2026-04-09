<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-17 | Updated: 2026-03-17 -->

# room

## Purpose

동적 룸 라우트. `[roomId]` 파라미터로 방을 구분하며, Yjs + WebRTC 연결을 관리한다.

## Subdirectories

| Directory   | Purpose        |
| ----------- | -------------- |
| `[roomId]/` | 개별 룸 페이지 |

## Key Files

| File                    | Description                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------- |
| `[roomId]/+page.svelte` | 룸 메인 페이지 — Y.Doc 생성, WebrtcProvider 연결, Editor/Presence 렌더링, 닉네임 편집 |

## For AI Agents

### Working In This Directory

- DEV 환경: `ws://${window.location.hostname}:4444` signaling (LAN 테스트 지원)
- PROD 환경: `wss://signaling.yjs.dev` signaling
- `onMount`에서 Y.Doc + WebrtcProvider 초기화, cleanup에서 destroy
- awareness로 로컬 유저 정보(name, color)를 피어에 전파

### Dependencies

- `yjs`, `y-webrtc`, `$lib/components/Editor.svelte`, `$lib/components/Presence.svelte`
- `$lib/utils/nickname`, `$lib/types/yjs`

<!-- MANUAL: -->
