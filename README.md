# 🚀 Next.js + tRPC + TON Monorepo

<div align="center">

[![GitHub stars](https://img.shields.io/github/stars/DKeken/turborepo-ton-trpc?style=for-the-badge)](https://github.com/DKeken/turborepo-ton-trpc/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/DKeken/turborepo-ton-trpc?style=for-the-badge)](https://github.com/DKeken/turborepo-ton-trpc/network/members)
[![GitHub watchers](https://img.shields.io/github/watchers/DKeken/turborepo-ton-trpc?style=for-the-badge)](https://github.com/DKeken/turborepo-ton-trpc/watchers)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![TON](https://img.shields.io/badge/TON-0088CC?style=for-the-badge&logo=telegram&logoColor=white)](https://ton.org/)

</div>

<p align="center">
  <strong>A modern, type-safe, and scalable monorepo template for building TON blockchain applications</strong>
</p>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-project-structure">Project Structure</a> •
  <a href="#-getting-started">Getting Started</a> •
  <a href="#-environment-variables">Environment Variables</a> •
  <a href="#-development">Development</a> •
  <a href="#-deployment">Deployment</a> •
  <a href="#-contributing">Contributing</a> •
  <a href="#-license">License</a>
</p>

<p align="center">
  <a href="README.ru.md">🇷🇺 Русская версия</a>
</p>

---

## ✨ Features

- **🔒 Type Safety & Performance**

  - Full-stack TypeScript with strict type checking
  - End-to-end type safety with tRPC
  - Optimized builds with Turborepo
  - Real-time capabilities with KeyDB pub/sub

- **🎨 Modern UI/UX**

  - Responsive design with Tailwind CSS
  - Dark/Light theme switching
  - Internationalization (i18n) support
  - Beautiful UI components from shadcn/ui
  - Loading states & error boundaries

- **🌐 Web3 Integration**

  - TON wallet connection
  - Web3 authentication
  - Transaction handling
  - Smart contract interaction
  - Blueprint - TON Smart Contracts development framework

- **🚀 Developer Experience**

  - ESLint + Prettier configuration
  - Git hooks with Husky

- **📊 Monitoring & Analytics**

  - Logging system with Pino

## 🛠️ Tech Stack

### Frontend

- **Next.js 15** - React framework with App Router
- **React 19** - UI library
- **TailwindCSS** - Utility-first CSS
- **shadcn/ui** - Beautifully designed components
- **next-themes** - Dark mode support
- **next-intl** - i18n support

### Backend

- **Bun** - Ultra-fast JavaScript runtime
- **tRPC** - End-to-end typesafe APIs
- **Drizzle ORM** - TypeScript ORM
- **PostgreSQL** - Database
- **KeyDB** - High-performance Redis alternative

### Web3

- **TON Connect** - TON blockchain integration
- **@ton/ton** - TON SDK
- **Blueprint** - TON Smart Contracts development framework

### DevOps & Tools

- **Turborepo** - Monorepo build system
- **Bun** - JavaScript runtime
- **Docker** - Containerization

## 📦 Project Structure

```
turborepo-ton-trpc/
├── apps/                      # Application packages
│   ├── web/                   # Next.js frontend application
│   ├── server/                # tRPC API server
│   └── blueprint/             # TON smart contracts
├── packages/                  # Shared packages
│   ├── configs/               # Shared configuration
│   ├── database/              # Database schema and utilities
│   ├── logger/                # Logging utilities
│   └── tonconnect-ui-react/   # TON Connect React fix
├── turbo.json                 # Turborepo configuration
└── package.json               # Root package.json
```

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or newer)
- [Bun](https://bun.sh/) (v1.2.5 or newer)

## 💻 Development

```bash
bun dev
```

### Running Tests

```bash
bun test        # Run all tests
```

### Linting and Formatting

```bash
bun lint     # Run ESLint
bun format   # Run Prettier
```

## 🔧 Environment Variables

This project uses a single `.env` file in the root directory to manage all environment variables for both frontend and backend services.

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Update the variables in `.env` as needed:

### Database Configuration
- `DATABASE_URL`: PostgreSQL connection string

### Redis Configuration
- `REDIS_URL`: Redis/KeyDB connection URL
- `REDIS_PASSWORD`: Redis/KeyDB password

### TON Configuration
- `NEXT_PUBLIC_TONCONNECT_MANIFEST_URL`: TON Connect manifest URL

### Next.js Configuration
- `NEXT_PUBLIC_API_URL`: API base URL

For development, the default values in `.env.example` should work out of the box with the provided Docker setup.

## 👥 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
