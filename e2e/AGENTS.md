<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-17 | Updated: 2026-03-17 -->

# e2e

## Purpose
Playwright E2E 테스트. 랜딩 페이지, 룸 페이지, 실시간 동기화(BroadcastChannel + WebRTC)를 검증한다.

## Key Files

| File | Description |
|------|-------------|
| `collaboration.spec.ts` | 전체 E2E 시나리오 — 방 생성/참여, 에디터 입력, 탭 간 동기화, WebRTC 동기화, Presence |

## For AI Agents

### Working In This Directory
- `npm run test:e2e`로 실행 — signaling 서버(4444)와 dev 서버(5173) 자동 실행됨
- 같은 context 내 탭 = BroadcastChannel 동기화
- 별도 context = WebRTC signaling 동기화
- timeout은 WebRTC 연결 대기로 넉넉하게 설정 (10~15초)

### Testing Requirements
- Playwright chromium 설치 필요: `npx playwright install chromium --with-deps`

<!-- MANUAL: -->
