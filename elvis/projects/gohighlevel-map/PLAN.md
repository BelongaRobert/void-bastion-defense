# GoHighLevel Map Visualization - Project Plan

## Overview
Build a map visualization tool that pulls contact data from GoHighLevel API and displays clients with addresses on an interactive map.

## Goals
- Pull contacts with addresses from GoHighLevel API
- Geocode addresses to coordinates
- Display on interactive map with pins
- Click pins to see client details
- Filter/search functionality
- Real-time sync with GoHighLevel

## Tech Stack
- **Frontend:** React + Vite + TypeScript
- **Backend:** Node.js + Express
- **Map:** Leaflet.js (open source, free)
- **Geocoding:** OpenCage or Nominatim (free tier)
- **GoHighLevel:** Public API v1

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    GoHighLevel API                      │
│              (Contacts, Locations, Tags)                  │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   Express Backend                       │
│  ┌─────────────┐  ┌─────────────┐  ┌────────────────┐ │
│  │ API Proxy   │  │ Geocoding   │  │ Cache (SQLite) │ │
│  │ /api/ghl/*  │  │ /api/geo/*  │  │ contacts.db    │ │
│  └─────────────┘  └─────────────┘  └────────────────┘ │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   React Frontend                        │
│  ┌─────────────┐  ┌─────────────┐  ┌────────────────┐    │
│  │ Map View    │  │ Client List │  │ Client Panel   │    │
│  │ Leaflet.js  │  │ Search      │  │ Detail View    │    │
│  └─────────────┘  └─────────────┘  └────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

## API Endpoints Needed

### GoHighLevel Public API
- `GET /v1/contacts` - List all contacts
- `GET /v1/contacts/{id}` - Single contact details
- `GET /v1/locations/{locationId}/customFields` - Address fields

### Backend Routes
- `GET /api/contacts` - Get all contacts with coordinates
- `POST /api/contacts/sync` - Sync from GoHighLevel
- `GET /api/contacts/search?q=` - Search/filter
- `POST /api/geocode` - Geocode address

## Data Flow
1. User authenticates with GoHighLevel OAuth
2. Backend fetches contacts from GHL API
3. Filter contacts that have address fields
4. Geocode addresses (if not cached)
5. Store in local SQLite cache
6. Frontend fetches and displays on map
7. Periodic sync (every 15 mins)

## Key Features
- [ ] OAuth2 authentication with GoHighLevel
- [ ] Contact sync with address extraction
- [ ] Address geocoding (lat/long)
- [ ] Interactive map with clustered pins
- [ ] Click pin → client detail popup
- [ ] Filter by tags/location/custom fields
- [ ] Search by name/address
- [ ] Real-time sync toggle
- [ ] Export to CSV

## Database Schema (SQLite)
```sql
contacts (
  id TEXT PRIMARY KEY,
  ghl_id TEXT UNIQUE,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  address1 TEXT,
  address2 TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  country TEXT,
  lat REAL,
  lng REAL,
  tags JSON,
  custom_fields JSON,
  last_sync TIMESTAMP
)
```

## GoHighLevel Custom Fields to Map
Common address field patterns:
- `address1` / `address_line_1`
- `address2` / `address_line_2`
- `city`
- `state` / `province`
- `postal_code` / `zip`
- `country`
- Custom: `property_address`, `installation_address`

## UI/UX Design

### Main Layout
```
┌────────────────────────────────────────────────────────────┐
│  🔍 Search...        [Sync] [Filters ▼] [Export]          │
├──────────────┬─────────────────────────────────────────────┤
│              │                                             │
│  📋 CLIENTS  │              🗺️ MAP                        │
│  ─────────── │                                             │
│  ⬜ John D.   │     [Pins showing client locations]        │
│  📍 123 Main │                                             │
│  ─────────── │     🟢 Pin = Active client                │
│  ⬜ Sarah M.  │     🟡 Pin = Prospect                     │
│  📍 456 Oak  │     🔴 Pin = Needs follow-up              │
│  ─────────── │                                             │
│              │     [Click pin for details]                 │
│              │                                             │
├──────────────┴─────────────────────────────────────────────┤
│  Status: 47 clients mapped | Last sync: 5 mins ago         │
└────────────────────────────────────────────────────────────┘
```

### Client Detail Popup
```
┌─────────────────────────────────────┐
│ 👤 John Doe                         │
│ 📧 john@example.com                 │
│ 📱 (555) 123-4567                   │
│ ────────────────────────────────    │
│ 📍 123 Main St                      │
│    Springfield, IL 62701              │
│ ────────────────────────────────    │
│ 🏷️ Tags: Customer, Premium          │
│ 📅 Last Contact: 3 days ago         │
│ ────────────────────────────────    │
│ [View in GHL] [Edit] [Directions]   │
└─────────────────────────────────────┘
```

## GoHighLevel API Setup Required

### 1. Get API Credentials
- Go to: Agency Settings → API
- Generate API Key or OAuth app
- Whitelist your domain/IPs

### 2. OAuth Scopes Needed
- `contacts.read`
- `contacts.write`
- `locations.read`
- `custom-fields.read`

### 3. Rate Limits
- 100 requests/minute (standard)
- 1000 requests/minute (agency)

## External APIs Needed

### Geocoding (Free Tiers)
1. **OpenCage** - 2,500 requests/day free
2. **Nominatim (OpenStreetMap)** - Free, but rate limited
3. **PositionStack** - 25,000 requests/month free

### Map Tiles
- **OpenStreetMap** - Free
- **CartoDB** - Free tier
- **Mapbox** - 50,000 loads/month free

## Security Considerations
- Store API keys in environment variables
- Never expose GHL tokens to frontend
- Encrypt sensitive contact data
- Respect GDPR/privacy laws
- Token refresh handling

## Next Steps
1. [ ] Set up project structure
2. [ ] Create Express server with auth
3. [ ] Implement GoHighLevel API client
4. [ ] Build React map component
5. [ ] Add geocoding service
6. [ ] Create contact sync logic
7. [ ] Polish UI/UX
8. [ ] Deploy (Vercel/Railway/Render)

## Estimated Timeline
- Days 1-2: Backend API + GHL integration
- Days 3-4: Frontend + Map
- Day 5: Sync logic + polish
- Day 6: Testing + deploy
