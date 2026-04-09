<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-17 | Updated: 2026-03-17 -->

# .github

## Purpose

GitHub Actions CI 워크플로우 설정.

## Subdirectories

| Directory    | Purpose            |
| ------------ | ------------------ |
| `workflows/` | CI 파이프라인 정의 |

## Key Files

| File               | Description                                                      |
| ------------------ | ---------------------------------------------------------------- |
| `workflows/ci.yml` | lint, check, test, build 병렬 실행 → build는 나머지 통과 후 실행 |

## For AI Agents

### Working In This Directory

- CD(배포)는 Vercel GitHub 연동이 담당 — Actions에서 별도 배포 불필요
- CI는 Node 20, npm ci 사용
- 테스트에 Playwright chromium 설치 필요

<!-- MANUAL: -->
