# El Impostor Game - Copilot Instructions

## Project Overview
Real-time multiplayer guessing game built with React + Vite + TypeScript + Supabase. Players join rooms, receive phrases, and vote to identify the impostor who doesn't know the phrase.

## Architecture

### Data Flow (Supabase Realtime)
- **Core Tables**: `rooms`, `players`, `votes` (see `supabase/migrations/create_game_tables_rls_realtime.sql`)
- **Realtime Subscriptions**: `useRoom` hook (`src/hooks/useRoom.ts`) subscribes to room/player changes via Supabase channels
- **State Management**: Local state + localStorage for player identity (`playerName`, `roomCode`)
- **RLS**: Public access policies enabled (no auth required - open game)

### Game States (RoomStatus enum)
- `LOBBY` → Host configures phrases, player limits, impostor count
- `PLAYING` → Players view phrases (impostor sees "???" placeholder)
- `VOTING` → Players vote for suspected impostor
- `FINISHED` → Winner announced, host can end game

### Key Components
- `src/pages/Home.tsx` - Create/join rooms with 6-char alphanumeric codes
- `src/pages/Lobby.tsx` - Pre-game configuration (phrases as newline-separated textarea, min/max players, impostors)
- `src/pages/Game.tsx` - Active gameplay and voting mechanics
- `src/hooks/useRoom.ts` - Central data sync hook (returns `room`, `players`, `loading`)

## Development Workflow

### Commands
```bash
pnpm run dev          # Start dev server on localhost:8080
pnpm run build        # Production build
pnpm run lint:fix     # Auto-fix ESLint errors
pnpm run prettier     # Format all files
pnpm run cleanup-old-data  # Manual DB cleanup (24h old data)
```

### Database Cleanup
- Automated via GitHub Actions (`.github/workflows/cleanup-old-data.yaml`) - runs daily at 00:00 UTC
- Script: `scripts/cleanup-old-data.ts` deletes rooms/players/votes older than 24h using Luxon DateTime

## Code Conventions

### Supabase Integration
- Import client: `import { supabase } from "@/integrations/supabase/client"`
- **Always** use cascading deletes - deleting a room auto-removes players/votes via `ON DELETE CASCADE`
- Example room deletion pattern (see `src/lib/roomUtils.ts`):
  ```typescript
  await supabase.from("rooms").delete().eq("id", roomId);
  // Players and votes automatically deleted
  ```

### UI Components
- **shadcn/ui** components in `src/components/ui/` - do NOT edit manually, regenerate via CLI
- Custom components in `src/components/` (e.g., `PlayerList`, `RoomCode`)
- Styling: Tailwind CSS with custom theme in `tailwind.config.ts` (HSL color variables)

### State Patterns
- **Player Identity**: Stored in localStorage (`playerName`) - matches against `players.name` to find current player
- **Host Detection**: Compare `room.host_name` with localStorage `playerName`
- **Navigation**: Use `useNavigate()` from `react-router-dom` (routes in `src/App.tsx`)

### Realtime Sync
When updating game state that affects all players:
```typescript
// Example: Starting voting phase
await supabase
  .from("rooms")
  .update({ status: RoomStatus.VOTING })
  .eq("id", room.id);
// All clients auto-update via useRoom subscription
```

## Common Patterns

### Room Code Generation
6-character alphanumeric codes (`A-Z0-9`) - see `Home.tsx` `generateRoomCode()`

### Vote Counting
- Votes unique per `(room_id, voter_id, round_number)`
- Count by `voted_for_id`, eliminate player with most votes (see `Game.tsx` `countVotes()`)

### Error Handling
- Use `useToast` hook for user-facing errors
- Always console.error unexpected errors for debugging

## Project-Specific Quirks
- **No authentication** - player names are self-declared (localStorage only)
- **Host powers**: Only host can start game, end room, count votes
- **Phrase input**: Newline-separated in textarea (split by `\n` and filter empty)
- **Impostor assignment**: Random selection from all players at game start
- **Round tracking**: `current_phrase_index` + `round_number` for multi-round voting

## Deployment
- Hosted on Vercel (analytics via `@vercel/analytics`)
- Domain: `https://el-impostor.francomarino.dev`
- Sitemap auto-generated via `vite-plugin-sitemap`
