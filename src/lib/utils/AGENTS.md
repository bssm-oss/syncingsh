<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-17 | Updated: 2026-03-17 -->

# utils

## Purpose
순수 유틸리티 함수. 방 코드 생성/검증과 닉네임/색상 관리를 제공한다.

## Key Files

| File | Description |
|------|-------------|
| `roomCode.ts` | `generateRoomCode()` — 7자리 랜덤 코드 생성, `isValidRoomCode()` — 4~12자 소문자+숫자 검증 |
| `roomCode.spec.ts` | roomCode 유닛 테스트 (Vitest node) |
| `nickname.ts` | `getNickname()`, `setNickname()`, `getUserColor()` — localStorage 기반 닉네임/색상 관리 |
| `nickname.svelte.spec.ts` | nickname 브라우저 테스트 (Vitest browser — localStorage 필요) |

## For AI Agents

### Working In This Directory
- roomCode는 `crypto.getRandomValues` 사용 — 모호한 문자(0, O, 1, l, I) 제외된 알파벳
- nickname은 localStorage 미지원 환경에서 폴백 처리됨
- `.spec.ts` → node 환경, `.svelte.spec.ts` → browser 환경 (vite.config.ts의 projects 설정)

### Testing Requirements
- 두 모듈 모두 테스트 완비. 수정 시 `npm test`로 회귀 확인

<!-- MANUAL: -->
