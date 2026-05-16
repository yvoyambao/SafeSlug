# SafeSlug

Real-time public safety map for UCSC students and Santa Cruz residents. When something happens in the community, SafeSlug tells you in real time with AI-powered summaries on an interactive map — before it lands on social media.

## Features

- **Live Incident Map** — real-time Mapbox map with color-coded pins by incident category (traffic, fire, medical, assault, theft, suspicious, disturbance)
- **AI Summaries** — NVIDIA Nemotron decodes raw Sheriff police codes into plain English with severity, category, and emoji
- **Safety Chatbot** — ask questions like *"Is it safe near Porter College right now?"* and get grounded answers from live incident data
- **Community Reports** — users can submit their own reports with location autocomplete; NemoClaw enhances them before saving
- **Auto-Sync** — backend scrapes Santa Cruz Sheriff public calls every 5 minutes and pushes updates to all users in real time
- **County-Wide Coverage** — scrapes incidents across all of Santa Cruz County including UCSC area, downtown, Aptos, Scotts Valley, Watsonville, and more

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite |
| Map | Mapbox GL JS |
| Database | Supabase (PostgreSQL + Realtime) |
| AI | NVIDIA Nemotron (`nemotron-3-nano-omni-30b-a3b-reasoning`) |
| Scraping | Cheerio + Node.js fetch |
| Geocoding | Mapbox Geocoding API |
| Backend | Node.js HTTP server |

## Team

- **Yvo Yambao** (yyambao@ucsc.edu) — Frontend, React, Map UI
- **Chris Fajardo** (chfajard@ucsc.edu) — Backend, NemoClaw AI, Data Pipeline

## Getting Started

### Prerequisites

- Node.js 20+
- Supabase project
- NVIDIA API key (build.nvidia.com)
- Mapbox API token

### Setup

1. Clone the repo:
   ```bash
   git clone https://github.com/yvoyambao/SafeSlug.git
   cd SafeSlug
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   VITE_MAPBOX_API_TOKEN=your_mapbox_token
   NEMOCLAW_URL=https://integrate.api.nvidia.com/v1/chat/completions
   NEMOCLAW_KEY=your_nvidia_api_key
   VITE_NEMOCLAW_KEY=your_nvidia_api_key
   VITE_NEMOCLAW_URL=https://integrate.api.nvidia.com/v1/chat/completions
   ```

4. Set up Supabase tables by running this in the SQL editor:
   ```sql
   CREATE TABLE IF NOT EXISTS santa_cruz_calls (
     incident_number text PRIMARY KEY,
     date_text text,
     address text,
     raw_text text,
     summary text,
     severity text,
     category text,
     emoji text,
     latitude double precision,
     longitude double precision,
     geocoded_address text,
     inserted_at timestamptz,
     area text
   );

   CREATE TABLE IF NOT EXISTS community_reports (
     id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
     title text NOT NULL,
     description text NOT NULL,
     enhanced_summary text,
     category text DEFAULT 'Other',
     severity text DEFAULT 'Medium',
     location text,
     latitude double precision,
     longitude double precision,
     created_at timestamptz DEFAULT now()
   );

   ALTER PUBLICATION supabase_realtime ADD TABLE santa_cruz_calls;
   ALTER PUBLICATION supabase_realtime ADD TABLE community_reports;
   ```

### Running Locally

Start the backend (auto-syncs every 5 minutes):
```bash
npm run backend:dev
```

Start the frontend in a second terminal:
```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### Manual Sync

To trigger a sync immediately without waiting:
```bash
npm run backend:sync
```

## How It Works

```
Santa Cruz Sheriff Website
        ↓
Cheerio scraper (15 street searches across the county)
        ↓
NVIDIA Nemotron AI — decodes police codes into plain English
        ↓
Mapbox Geocoding — converts addresses to coordinates
        ↓
Supabase — stores incidents, pushes real-time updates
        ↓
React frontend — live map, chatbot, community feed
```

## Data Source

Incident data is sourced from the [Santa Cruz County Sheriff's public calls for service](https://www2.santacruzcountyca.gov/SHF/CristaPublic/) — a public government website listing real 911/dispatch calls.

## Deployment

- **Frontend** → Vercel (connect GitHub repo, add `VITE_` env vars)
- **Backend** → Render.com (web service pointing to `server/index.mjs`, add all env vars)
