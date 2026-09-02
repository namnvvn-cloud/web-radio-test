# Web Radio Test - Backend/Admin Dashboard

Web platform for RadioTest Android app - Backend/Admin Dashboard built with Next.js, Supabase, and Voyage AI.

## Project Structure

```
web-radio-test/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── public/                # Static assets
├── .env.local            # Environment variables (not committed)
├── .env.example          # Environment template
├── package.json          # Dependencies
├── tsconfig.json         # TypeScript config
└── next.config.ts        # Next.js config
```

## Tech Stack

- **Frontend**: Next.js 15 with TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL + pgvector)
- **Authentication**: Supabase Auth
- **Embeddings**: Voyage AI
- **AI**: Claude API (Anthropic)
- **Deployment**: Vercel

## Prerequisites

- Node.js 18+ and npm
- GitHub account
- Supabase project (already set up)
- Voyage AI account (already set up)
- Anthropic API key (optional for Phase 0.5)
- Vercel account (for deployment)

## Setup Instructions

### 1. Local Development Setup

```bash
# Install dependencies
npm install

# Copy environment template and add your credentials
cp .env.example .env.local

# Start development server
npm run dev
```

Visit `http://localhost:3000` to see your application.

### 2. Environment Variables

The `.env.local` file should contain:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
VOYAGE_API_KEY=your_voyage_ai_key
ANTHROPIC_API_KEY=your_anthropic_key (optional)
NEXT_PUBLIC_APP_NAME=Web Radio Test
NODE_ENV=development
```

### 3. Push to GitHub

```bash
# Initialize git if not already done
git init

# Add GitHub remote
git remote add origin https://github.com/namnvvn-cloud/web-radio-test.git

# Configure user
git config user.email "namnv.vn@gmail.com"
git config user.name "Nguyen Van Nam"

# Add all files
git add .

# Create first commit
git commit -m "Initial commit: Next.js setup with Supabase and Voyage AI"

# Rename branch to main if needed
git branch -M main

# Push to GitHub
git push -u origin main
```

### 4. Deploy to Vercel

1. Visit https://vercel.com/new?teamSlug=namnv
2. Select "Other" and enter the GitHub repository URL
3. Click "Import"
4. Add environment variables:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY
   - VOYAGE_API_KEY
   - ANTHROPIC_API_KEY
5. Click "Deploy"

## Development Workflow

### Running Tests

```bash
npm run test
```

### Building for Production

```bash
npm run build
npm run start
```

### Linting

```bash
npm run lint
```

## Project Phases

### Phase 0: Infrastructure Setup ✓
- Supabase project created
- API keys configured
- GitHub repository initialized
- Environment setup complete

### Phase 0.5: App Pings Table (In Progress)
- Create `app_pings` table with insert-only RLS
- Implement `/api/pings` endpoint
- Add basic ping logging from mobile app

### Phase 1: MVP (Next)
- Next.js web UI with Auth
- User Portal for test participants
- Admin Dashboard for managing tests
- Basic test creation and management

### Phase 1b: Hold
- To be determined

### Phase 2 & 3: Future Phases
- See SOP_WebRadioTest_v1.2.md for details

## Database Schema

### app_pings Table
```sql
CREATE TABLE app_pings (
  id BIGSERIAL PRIMARY KEY,
  session_id UUID NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  device_info JSONB,
  signal_data JSONB,
  location GEOGRAPHY(POINT, 4326)
);

-- Row Level Security (RLS)
-- Insert-only: Anyone can insert but cannot read/update/delete
```

## API Routes

### Ping Endpoint
- `POST /api/pings` - Record a ping from the mobile app
  - Body: `{ sessionId, deviceInfo, signalData, location }`
  - Response: `{ id, timestamp }`

## Documentation

- SOP: See `docs/SOP_WebRadioTest_v1.2.md`
- Architecture decisions in `decisions.md`

## Contributing

This is a private project for MobiFone Radio Testing platform.

## License

Private - All rights reserved
