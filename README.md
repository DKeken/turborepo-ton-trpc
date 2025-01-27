# Next.js + tRPC + Web3 Monorepo

A **minimal**, **high-performance** monorepo built with modern technologies:

- **Next.js** for frontend
- **tRPC** for end-to-end type safety
- **Bun** for a speedy backend runtime
- **Drizzle** ORM + PostgreSQL
- **KeyDB** for caching & real-time capabilities
- **SIWE**, **RainbowKit**, and **Wagmi** for Web3 integrations

## Features

- **Type-Safe**: Full-stack TypeScript (client & server)
- **Scalable**: Turborepo for efficient builds and easy project organization
- **Modern UI**: Tailwind CSS + shadcn/ui
- **Web3-Ready**: Ethereum authentication, wallet connection, and hooks
- **Performance**: Bun runtime + KeyDB pub/sub
- **Docker**: Docker Compose for easy containerization

## Getting Started

1. **Clone the Repository**

   ```bash
   git clone https://github.com/DKeken/trpc-monorepo-stack.git
   ```

2. **Install Dependencies**
   ```bash
   pnpm install
   ```
3. **Configure Environment Variables**
   ```bash
   cp apps/web/.env.example apps/web/.env
   cp apps/server/.env.example apps/server/.env
   cp packages/database/.env.example packages/database/.env
   ```
4. **Start Development**
   ```bash
   pnpm dev
   ```
   This will spin up both **Next.js** and **Bun** servers concurrently.

## Project Structure

```bash
.
├── apps/
│   ├── web/                 # Next.js frontend (SIWE, RainbowKit, Wagmi, Tailwind)
│   └── server/              # Bun-based backend (tRPC, Drizzle, KeyDB)
└── packages/
    └── database/            # Shared DB logic and migrations (Drizzle + PostgreSQL)
```

## Contributing

Feel free to open issues, propose new features, or submit pull requests.

## License

[MIT](./LICENSE)
