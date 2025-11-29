import { Users, Crown } from 'lucide-react';
import { Player } from '@/hooks/useRoom';

interface PlayerListProps {
  players: Player[];
  showEliminated?: boolean;
}

export const PlayerList = ({ players, showEliminated = false }: PlayerListProps) => {
  const activePlayers = showEliminated ? players : players.filter(p => !p.is_eliminated);

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Users className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">
          Jugadores ({activePlayers.length})
        </h3>
      </div>
      <div className="space-y-2">
        {activePlayers.map((player) => (
          <div
            key={player.id}
            className={`flex items-center gap-3 p-3 rounded-lg border ${
              player.is_eliminated 
                ? 'bg-muted/50 border-muted opacity-50' 
                : 'bg-background border-border'
            }`}
          >
            <div className="flex-1 font-medium">{player.name}</div>
            {player.is_host && (
              <Crown className="h-4 w-4 text-secondary" />
            )}
            {player.is_eliminated && (
              <span className="text-xs text-muted-foreground">Eliminado</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};