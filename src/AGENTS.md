<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-17 | Updated: 2026-03-17 -->

# src

## Purpose

SvelteKit 앱 소스코드. 라우트, 컴포넌트, 유틸리티, 타입 정의를 포함한다.

## Key Files

| File           | Description                     |
| -------------- | ------------------------------- |
| `app.html`     | HTML 셸 템플릿                  |
| `app.d.ts`     | SvelteKit 전역 타입 선언        |
| `demo.spec.ts` | 플레이스홀더 테스트 (삭제 가능) |

## Subdirectories

| Directory  | Purpose                                                      |
| ---------- | ------------------------------------------------------------ |
| `lib/`     | 공유 라이브러리 — 컴포넌트, 유틸, 타입 (see `lib/AGENTS.md`) |
| `routes/`  | SvelteKit 라우트 (see `routes/AGENTS.md`)                    |
| `stories/` | Storybook 스토리 파일                                        |

## For AI Agents

### Working In This Directory

- Svelte 5 runes 문법 사용 (`$state`, `$derived`, `$props`)
- `$lib` alias로 `src/lib/` 참조
- 컴포넌트 테스트는 `.svelte.spec.ts`, 유닛 테스트는 `.spec.ts` 확장자

### Testing Requirements

- `.svelte.spec.ts` → Vitest browser (Playwright + chromium)
- `.spec.ts` → Vitest node 환경
- `requireAssertions: true` — 모든 테스트에 expect 필수

<!-- MANUAL: -->
