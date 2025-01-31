
# 🚀 Modern SaaS Backend Template

**Brzi backend starter za SaaS aplikacije** sa autentikacijom (JWT + Redis), dokumentacijom (OpenAPI) i SQLite/Redis integracijom. Idealno za brzi početak projekata!

[![Built with Bun](https://img.shields.io/badge/Bun-%23000000.svg?style=flat&logo=bun&logoColor=white)](https://bun.sh)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## ✨ Glavne karakteristike
- 🔐 **JWT Autentikacija** sa refresh/access tokenima (Redis storage)
- 📝 **OpenAPI dokumentacija** sa Scalar UI temom
- 🛠 **Type-safe stack**: Hono + Zod + Drizzle ORM
- ✉️ Mailjet integracija za e-mailove
- 🧩 Modularna struktura za jednostavno proširenje

## 🛠 Tehnološki Stack
**Core:**
- [Bun](https://bun.sh) (runtime)
- [Hono](https://hono.dev) (web framework)
- [Drizzle ORM](https://orm.drizzle.team) (SQLite/PostgreSQL)
- [Zod](https://zod.dev) (schema validation)

**Infrastruktura:**
- 🗄️ SQLite (razvoj) / PostgreSQL (produkcija)
- 🔥 Redis (Upstash)
- 📡 OpenAPI 3.0 dokumentacija

## 🚀 Brzi Start

### Preduslovi
- Bun v1.1.x+
- drizzle-kit: v0.30.x+
- drizzle-orm: v0.39.x+
### Instalacija
```bash
# 1. Kloniraj repozitorijum
mkdir your-saas/backend
cd your-saas/backend
git clone https://github.com/b0g1dan23/hono-bun-drizzle-template.git .

# 2. Instaliraj zavisnosti
bun install

# 3. Postavi environment promenljive (kreiraj .env fajl)
touch .env
```
### Konfiguracija ( .env )
```typescript
PORT=3000
DB_URL="file:./dev.db"
REFRESH_TOKEN_SECRET="your-secret-123"
ACCESS_TOKEN_SECRET="another-secret-456"
REDIS_URL="redis://..."
MAILJET_API_KEY="..."
MAILJET_SECRET_KEY="..."
```
### Pokretanje
```bash
# Generiši migracije baze
bunx drizzle-kit generate

# Nakon promena u semi tabela
bunx drizzle-kit push

# Pokretanje lokalnog studija
bunx drizzle-kit studio
```

## 📚API Dokumentacija
Nakon pokretanja, OpenAPI dokumentacija je dostupna na:  
`http://localhost:3000/doc`

Scalar dokumentacija, dostupna je na:
`http://localhost:3000/reference`
## 🔮 Budući Planovi

-   Google OAuth 2.0 integracija
    
-   Unit testovi (Vitest)
    
-   Dockerizacija
    
-   Rate limiting middleware
    
-   Webhook handleri
## 🤝 Doprinosi

Trenutno ne prihvatam pull request-e, ali slobodno otvarajte  **issue-e**  za:

-   🐞 Prijavu grešaka
    
-   💡 Predloge poboljšanja

## 📜 Licenca

Distribuirano pod MIT licencom.

## 🌟 Zahvalnice

-   [Code with Alex](https://www.youtube.com/watch?v=sNh9PoM9sUE)  za inspiraciju i osnovne koncepte
## 📩 Kontakt

Imate pitanja? Javite se na:

-   📧  [hi@boge.dev](mailto:hi@boge.dev)