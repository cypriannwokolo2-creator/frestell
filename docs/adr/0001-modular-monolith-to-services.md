# ADR 0001 — Modular Monolith → Service Split Strategy

- **Status:** Accepted
- **Date:** 2026-06-06
- **Deciders:** Core platform team
- **Supersedes:** —
- **Superseded by:** —

## Context

FreStell is being built as a trustless freelance marketplace on Stellar + Soroban. Phase 1 (MVP) has five business domains that each have very different scaling, latency, and trust profiles:

| Domain   | Latency budget | Trust boundary        | Scaling driver            | External deps         |
| -------- | -------------- | --------------------- | ------------------------- | --------------------- |
| auth     | < 100ms        | High (keys, sessions) | Steady, predictable       | None                  |
| jobs     | < 200ms        | Medium (writes)       | Reads dominate            | Postgres, search idx  |
| payments | < 500ms        | Critical (money)      | Burst on job events       | Soroban, Stellar      |
| chat     | < 100ms        | Low                   | Long-lived WS connections | Redis, Postgres       |
| ai       | < 5s           | Low                   | Heavy, spiky              | External LLM provider |

A pure microservice rewrite on day 1 would burn weeks on infra (service discovery, distributed tracing, sagas, dead-letter queues) before delivering any user value. A pure monolith would make the payments and AI domains hard to scale independently and would tightly couple the auth code to every other domain.

## Decision

We will build Phase 1 as a **modular monolith** with strict module boundaries, then extract domains into separate services as load or team-size forces us to. Concretely:

1. **One deployable (`apps/api`)**, but each domain lives in its own NestJS module under `libs/<domain>/` with:
   - Its own DI scope (`@Global()` only when genuinely required)
   - Its own DTOs (imported from `packages/shared`)
   - Its own Prisma model namespace (no cross-domain writes)
   - Inter-module calls go through **typed interfaces** (e.g. `JOBS_CLIENT` token), never through Prisma models of another domain.

2. **Domain isolation is enforced by lint rules.** An ESLint `no-restricted-imports` rule forbids `libs/jobs/**` from importing anything from `libs/payments/**` or `libs/chat/**` directly. Imports must go through `@frestell/shared` or a published barrel of the other domain.

3. **Storage is shared (one Postgres, one Redis).** Domain extraction will be slowed, not blocked, by this. We mitigate by giving every domain its own Prisma model prefix and never joining across domains in the data layer.

4. **Each domain is a "vertical slice"**: HTTP controller, service, Prisma model, Zod schema in `packages/shared`, and a Jest spec — all in the same `libs/<domain>/src/lib/` folder.

5. **Extraction triggers** (when to split a domain out into its own service):
   - Independent deploy cadence is needed (releases blocked on unrelated changes)
   - Resource profile diverges sharply (e.g. AI needs GPU, payments needs dedicated DB throughput)
   - The team owning the domain grows past ~3 engineers and needs isolated CI
   - Blast radius from a fault in this domain is too large for the monolith's SLO

6. **Extraction playbook** (what we do at that point):
   - The `libs/<domain>/` package is moved into `apps/<domain>-service/`
   - The DI token it consumed (`JOBS_CLIENT`, etc.) is replaced by an HTTP client
   - Prisma models for that domain are moved to the new service's DB (we use logical replication to backfill)
   - The Nx affected graph automatically picks up which apps need to be rebuilt
   - We do not attempt in-process extraction; we re-deploy the new service in parallel and switch traffic at the gateway

## Consequences

**Positive**

- Day-1 velocity. One repo, one CI, one deploy. We can ship MVP features in days, not weeks.
- Clear path to scale. We know _which_ domain to split and _how_, before we need to.
- Strong contract surface. `@frestell/shared` and DI tokens make module boundaries explicit, so the eventual split is mechanical, not architectural.
- The Nx build graph gives us a free "blast-radius" tool: `nx affected` tells us which domains to retest for any change.

**Negative**

- A bug in one domain can still bring down the whole process. We accept this; mitigations: health/readiness/liveness probes, structured logging, request IDs, graceful shutdown.
- Cross-domain transactions are _possible_ (e.g. "create job + create escrow") but should be avoided; if needed, use an outbox-pattern saga.
- Scaling is "all or nothing" until first split. Acceptable for MVP; revisit at ~10k DAU or when AI load > 30% of CPU.

**Reversible?**

- Yes. The first split (likely `payments` or `ai`) is the most expensive. After that, the pattern is repeatable and cheap.

## Alternatives considered

- **Pure microservices from day 1.** Rejected. Operational complexity would consume the entire Phase 1 timeline.
- **Pure monolith, no modular boundaries.** Rejected. Lock-in is real; every extracted line in 12 months is debt.
- **Nx-only approach (no monorepo DI tokens).** Rejected. The DI token boundary is what makes the eventual split mechanical.

## References

- Sam Newman, _Monolith to Microservices_, 2019
- Simon Brown, "Modular Monoliths" (talk), 2018
- Nx docs: https://nx.dev/more-concepts/why-monorepos
