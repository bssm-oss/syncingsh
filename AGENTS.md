<!-- Generated: 2026-03-17 | Updated: 2026-03-17 -->

# syncingsh

## Purpose
실시간 P2P 공유 메모장. Yjs + WebRTC로 서버 없이 브라우저 간 문서를 동기화하며, Tiptap 에디터를 사용한다.

## Key Files

| File | Description |
|------|-------------|
| `package.json` | 의존성 및 스크립트 (dev, signaling, test, build) |
| `vite.config.ts` | Vite + Vitest 설정 (server/client 테스트 프로젝트 분리) |
| `svelte.config.js` | SvelteKit 설정, Vercel adapter 사용 |
| `playwright.config.ts` | E2E 테스트 설정 (signaling + dev 서버 자동 실행) |
| `tsconfig.json` | TypeScript 설정 |
| `eslint.config.js` | ESLint 설정 |
| `CLAUDE.md` | AI 에이전트용 프로젝트 지침 |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `src/` | 앱 소스코드 (see `src/AGENTS.md`) |
| `e2e/` | Playwright E2E 테스트 (see `e2e/AGENTS.md`) |
| `.github/` | GitHub Actions CI (see `.github/AGENTS.md`) |
| `static/` | 정적 파일 (robots.txt) |

## For AI Agents

### Working In This Directory
- SvelteKit + Svelte 5 (runes 문법: `$state`, `$derived`, `$props`)
- P2P 아키텍처 — Supabase 사용 안 함, 백엔드 서버 없음
- Tailwind CSS v4 사용
- Vitest 테스트는 `requireAssertions: true` 설정

### Testing Requirements
```bash
npm test          # 유닛 + 브라우저 테스트
npm run test:e2e  # E2E (signaling + dev 서버 자동 실행)
npm run check     # 타입 체크
npm run lint      # 린트
```

### Architecture
```
브라우저 A ←──WebRTC──→ 브라우저 B
    ↕                       ↕
 Yjs Doc                 Yjs Doc
    ↕                       ↕
 Tiptap Editor          Tiptap Editor
    ↕                       ↕
 Signaling Server (연결 중개만)
```

## Dependencies

### External
- `yjs` — CRDT 기반 실시간 동기화
- `y-webrtc` — WebRTC provider (P2P 연결 + signaling)
- `@tiptap/core` + `@tiptap/starter-kit` — 리치 텍스트 에디터
- `@tiptap/extension-collaboration` — Yjs ↔ Tiptap 연동

<!-- MANUAL: -->
