# FreStell — Trustless Freelance Marketplace on Stellar + Soroban

## Project Overview

FreStell is a Phase 1 MVP for a decentralized freelance marketplace with:
- **Trustless escrow** via Stellar Soroban smart contracts (Rust/Wasm)
- **WebAuthn passkeys** for phishing-resistant authentication
- **AI proposal coach** to help freelancers write better bids
- **3-tier verification system** (email → government ID → earned badges)
- **Acceptance criteria enforcement** — every job must have explicit "done" checklists

## Monorepo Structure

```
frestell/
├── apps/
│   ├── web/          → Next.js frontend (React + TypeScript)
│   └── api/          → NestJS backend (Node.js + Express)
├── packages/
│   └── shared/       → Zod schemas, DTOs, shared types
├── services/         → Extractable microservices
│   ├── ai/
│   ├── payments/
│   ├── blockchain/
│   └── chat/
├── contracts/        → Soroban smart contracts (Rust/Wasm)
├── infrastructure/   → Docker, Nginx, Terraform, monitoring
└── .github/
    └── workflows/    → CI/CD pipelines
```

## Getting Started

### Prerequisites
- Node.js 18+ and npm 9+
- Rust 1.70+ (for contracts)
- PostgreSQL 15+ and Redis 7+ (for local dev with Docker Compose)

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Initialize database (when ready)
cd apps/api
npx prisma migrate dev
```

### Development

```bash
# Start all apps (web + api)
npm run dev

# Or individually:
cd apps/web && npm run dev     # Frontend: http://localhost:3000
cd apps/api && npm run dev     # Backend: http://localhost:3001
```

### Build & Test

```bash
npm run build    # Build all apps
npm run test     # Run all tests
npm run lint     # Lint all code
npm run format   # Format code with Prettier
```

## Key Technologies

- **Frontend**: Next.js 14, React 18, TailwindCSS
- **Backend**: NestJS 10, Prisma ORM, PostgreSQL, Redis
- **Blockchain**: Stellar SDK, Soroban (Rust)
- **Auth**: WebAuthn (@simplewebauthn), JWT, OAuth2
- **Chat**: Socket.io for real-time messaging
- **DevOps**: Docker, Docker Compose, GitHub Actions, Terraform

## Architecture Philosophy

- **Modular monolith**: Every business domain is a separate NestJS module with clear boundaries
- **Service-ready**: Code structured so services can be extracted to separate deployments later without refactoring
- **Shared packages**: DTOs, types, and validators live in `packages/shared` to prevent duplication
- **Trustless escrow**: Soroban smart contracts enforce payment rules on-chain (no platform can cheat)

## Development Workflow

1. Create a feature branch: `git checkout -b feat/your-feature`
2. Make changes and test locally
3. Commit with conventional commits: `git commit -m "feat: add X feature"`
4. Push and open a PR (CI runs automatically)
5. After review, merge to main (auto-deploys to staging)

## Phase 1 Milestones

- [x] Monorepo scaffold
- [ ] Nx workspace + build pipeline
- [ ] Auth (passkeys + JWT + 2FA)
- [ ] User profiles + verification
- [ ] Job posting with acceptance criteria
- [ ] AI proposal coach
- [ ] Smart contracts (escrow + dispute resolution)
- [ ] Real-time workspace + messaging
- [ ] Admin panel
- [ ] Deployment pipeline

See [frestell_plans/goals.html](frestell_plans/goals.html) for the full 320+ goal roadmap.

## Security & Compliance

- All secret keys are encrypted (AES-256-GCM) — never stored in plaintext
- Passkeys are phishing-resistant (WebAuthn/FIDO2)
- Rate limiting, CSRF protection, and input validation on all endpoints
- SQL injection prevention via Prisma parameterized queries
- Escrow is trustless via Soroban contracts (no platform can unilaterally move funds)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

## License

[Your license here]

## Support & Contact

- Issues: GitHub Issues
- Docs: [frestell_plans/](frestell_plans/) folder
- Email: [your contact]
