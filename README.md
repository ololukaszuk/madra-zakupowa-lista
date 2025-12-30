# Inteligentna Lista Zakupowa

Fullstack aplikacja do zarządzania listami zakupowymi z inteligentnymi podpowiedziami.

## Funkcjonalności

- Checklisty zakupowe w stylu Google Keep
- Autentykacja z trzema rolami (admin, manager, user)
- Grupy i profile zakupowe
- Fuzzy matching (Elasticsearch + PostgreSQL trigram)
- Podpowiedzi na bazie historii zakupów
- Integracja z Ollama (AI insights)
- PWA - mobile-friendly

## Architektura

```
┌─────────────┐     ┌──────────────┐
│   Frontend  │────▶│ API Gateway  │
│   (React)   │     │   :8080      │
└─────────────┘     └──────┬───────┘
                           │
    ┌──────────────────────┼──────────────────────┐
    │                      │                      │
    ▼                      ▼                      ▼
┌───────────┐    ┌──────────────┐    ┌───────────────┐
│   Auth    │    │   Shopping   │    │  Suggestion   │
│  :8081    │    │    :8082     │    │    :8084      │
└───────────┘    └──────────────┘    └───────────────┘
                       │                      │
                       ▼                      ▼
              ┌──────────────┐    ┌───────────────────┐
              │  Analytics   │    │   Elasticsearch   │
              │    :8083     │    │      :9200        │
              └──────────────┘    └───────────────────┘
                       │
                       ▼
              ┌──────────────┐
              │  PostgreSQL  │
              │    :5432     │
              └──────────────┘
```

## Uruchomienie

```bash
# 1. Skopiuj konfigurację
cp .env.example .env

# 2. Dostosuj zmienne (hasła, JWT secret, adresy Ollama)
nano .env

# 3. Uruchom
docker-compose up -d

# 4. Otwórz przeglądarkę
http://localhost:3000
```

## Domyślne konto admin

- Email: `admin@localhost`
- Hasło: `admin123`

**Zmień hasło po pierwszym logowaniu!**

## Struktura projektu

```
smart-shopping-list/
├── docker-compose.yml
├── .env.example
├── README.md
├── backend/
│   ├── api-gateway/       # Brama API, routing, rate limiting
│   ├── auth-service/      # Autentykacja, JWT, role, grupy
│   ├── shopping-service/  # Profile, listy, produkty
│   ├── analytics-service/ # Statystyki, AI insights (Ollama)
│   └── suggestion-service/# Podpowiedzi, fuzzy search
├── frontend/
│   └── web-app/          # React PWA
└── database/
    └── init/             # Schemat bazy danych
```

## API Endpoints

### Auth Service
- `POST /api/auth/login` - logowanie
- `POST /api/auth/register` - rejestracja
- `GET /api/auth/users` - lista użytkowników (admin/manager)
- `PUT /api/auth/users/:id/approve` - zatwierdzenie użytkownika

### Shopping Service
- `GET/POST /api/profiles` - profile zakupowe
- `GET/POST /api/lists` - listy zakupowe
- `PUT /api/items/:id/toggle` - zaznacz/odznacz produkt

### Suggestion Service
- `GET /api/suggestions/products?q=...` - podpowiedzi produktów
- `GET /api/suggestions/profile/:id/items` - sugerowane produkty dla profilu

### Analytics Service
- `GET /api/analytics/profile/:id/stats` - statystyki
- `GET /api/analytics/profile/:id/ai-insights` - AI analiza (Ollama)

## Konfiguracja .env

| Zmienna | Opis |
|---------|------|
| POSTGRES_PASSWORD | Hasło do bazy |
| JWT_SECRET | Klucz do tokenów JWT |
| OLLAMA_URL | URL do Ollama API |
| OLLAMA_WEBSEARCH_URL | URL do Ollama z websearch |
| OLLAMA_MODEL | Model AI (gemma3:12b) |

## Role użytkowników

- **admin** - pełny dostęp, zarządzanie użytkownikami
- **manager** - zatwierdzanie użytkowników, zarządzanie grupami
- **user** - podstawowy dostęp do własnych profili

## Technologie

- **Backend**: Node.js, Express
- **Frontend**: React (CDN, bez budowania)
- **Baza**: PostgreSQL 16 + pg_trgm
- **Search**: Elasticsearch 8.11
- **AI**: Ollama (gemma3:12b)
- **Konteneryzacja**: Docker Compose
