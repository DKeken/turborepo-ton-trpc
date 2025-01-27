# 🚀 Next.js + tRPC + TON Monorepo

<div align="center">

[![GitHub stars](https://img.shields.io/github/stars/DKeken/turborepo-ton-trpc?style=for-the-badge)](https://github.com/DKeken/turborepo-ton-trpc/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/DKeken/turborepo-ton-trpc?style=for-the-badge)](https://github.com/DKeken/turborepo-ton-trpc/network/members)
[![GitHub watchers](https://img.shields.io/github/watchers/DKeken/turborepo-ton-trpc?style=for-the-badge)](https://github.com/DKeken/turborepo-ton-trpc/watchers)

</div>


## 🛠️ Tech Stack

### Frontend
- **Next.js v15.1.4** - React framework with App Router
- **React v19** - UI library
- **TailwindCSS v3.4.1** - Utility-first CSS
- **shadcn/ui** - Beautifully designed components
- **next-themes** - Dark mode support
- **next-intl** - i18n support

### Backend
- **Bun v1.2.0** - Ultra-fast JavaScript runtime
- **tRPC v11.0.0-rc.688** - End-to-end typesafe APIs
- **Drizzle ORM v0.38.3** - TypeScript ORM
- **PostgreSQL v8.13.1** - Database
- **KeyDB** - High-performance Redis alternative

### Web3
- **TON Connect v2.0.11** - TON blockchain integration
- **@ton/ton v15.1.0** - TON SDK

### DevOps & Tools
- **Turborepo v2.3.3** - Monorepo build system
- **pnpm 9** - Fast package manager
- **Docker** - Containerization

## ✨ Features

### 🔒 Type Safety & Performance
- Full-stack TypeScript with strict type checking
- End-to-end type safety with tRPC
- Optimized builds with Turborepo
- Real-time capabilities with KeyDB pub/sub

### 🎨 Modern UI/UX
- Responsive design with Tailwind CSS
- Dark/Light theme switching
- Internationalization (i18n) support
- Beautiful UI components from shadcn/ui
- Loading states & error boundaries

### 🌐 Web3 Integration
- TON wallet connection
- Web3 authentication
- Transaction handling
- Smart contract interaction

### 🚀 Developer Experience
- Hot module replacement
- Type checking
- ESLint + Prettier configuration
- Git hooks with Husky
- Automated testing setup

### 📊 Monitoring & Analytics
- Performance monitoring
- Error tracking
- Analytics integration ready
- Logging system with Pino

## 📦 Project Structure

```bash
.
├── apps/
│   ├── web/                 # Next.js frontend (Port: 3000)
│   └── server/             # Bun-based backend (Port: 3333)
├── packages/
│   ├── database/           # Drizzle ORM + PostgreSQL
│   ├── logger/             # Shared logging utilities
│   ├── auth-config/        # Authentication configuration
│   └── tonconnect/         # TON blockchain integration
└── tools/
    └── eslint-config/      # Shared ESLint configuration
```

## 🚀 Getting Started

### Prerequisites
- Node.js >=18
- pnpm v9.12.2
- PostgreSQL
- KeyDB

1. **Clone the Repository**
   ```bash
   git clone https://github.com/DKeken/trpc-monorepo-stack.git
   cd trpc-monorepo-stack
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

4. **Start Development Servers**
   ```bash
   pnpm dev
   ```
   - Frontend: http://localhost:3000
   - Backend: http://localhost:4000
   - Database Studio: http://localhost:4000/studio

## 📝 Environment Variables

### Frontend (`apps/web/.env`)
```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:4000     # tRPC API endpoint
NEXT_PUBLIC_WS_URL=ws://localhost:4000        # WebSocket endpoint for real-time features

# TON Configuration
NEXT_PUBLIC_TON_NETWORK=testnet               # TON network: 'mainnet' or 'testnet'
NEXT_PUBLIC_TON_ENDPOINTS=["https://toncenter.com/api/v2/jsonRPC"] # TON HTTP API endpoints
NEXT_PUBLIC_TON_MANIFEST_URL=http://localhost:3000/tonconnect-manifest.json # TON Connect manifest URL

# Authentication
NEXTAUTH_URL=http://localhost:3000            # NextAuth.js URL
NEXTAUTH_SECRET=your-secret-key              # JWT encryption key (32+ chars)

# i18n Configuration
NEXT_PUBLIC_DEFAULT_LOCALE=en                # Default language
NEXT_PUBLIC_AVAILABLE_LOCALES=["en","ru"]    # Available languages
```

### Backend (`apps/server/.env`)
```env
# Server Configuration
PORT=4000                                    # API server port
HOST=0.0.0.0                                # API server host
NODE_ENV=development                        # Environment: 'development' or 'production'

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/db    # PostgreSQL connection string
DATABASE_SSL=false                          # Enable SSL for database connection

# Cache Configuration
KEYDB_URL=redis://localhost:6379            # KeyDB/Redis connection string
CACHE_TTL=3600                             # Cache time-to-live in seconds

# TON Configuration
TON_ENDPOINTS=["https://toncenter.com/api/v2/jsonRPC"]      # TON HTTP API endpoints
TON_API_KEY=your-api-key                   # TON Center API key

# Security
CORS_ORIGIN=http://localhost:3000           # Allowed CORS origin
API_SECRET=your-api-secret                 # API secret for internal services
JWT_SECRET=your-jwt-secret                 # JWT signing key (32+ chars)

# Logging
LOG_LEVEL=debug                            # Log level: 'debug', 'info', 'warn', 'error'
ENABLE_REQUEST_LOGGING=true                # Enable HTTP request logging
```

### Database (`packages/database/.env`)
```env
# PostgreSQL Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/db    # PostgreSQL connection string
DATABASE_SSL=false                          # Enable SSL for database connection
DATABASE_POOL_MIN=1                         # Minimum pool connections
DATABASE_POOL_MAX=10                        # Maximum pool connections
DATABASE_DEBUG=false                        # Enable query debugging
```

### Development Tools
```env
# Drizzle Studio (Database Management)
DRIZZLE_STUDIO_PORT=4466                   # Drizzle Studio port

# Turbo (Build System)
TURBO_TEAM=your-team                       # Turbo remote cache team
TURBO_TOKEN=your-token                     # Turbo remote cache token
```

### Production Environment
For production deployment, additional variables are required:
- SSL certificates configuration
- CDN endpoints
- Production API keys
- Monitoring service tokens
- Error tracking tokens

> 🔒 **Security Note**: Never commit `.env` files to version control. Always use `.env.example` files as templates.

## 🔧 Scripts

- `pnpm dev`