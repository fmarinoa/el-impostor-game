import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PlayerList } from "@/components/PlayerList";
import { useRoom, Player, RoomStatus } from "@/hooks/useRoom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Eye, Vote, AlertTriangle, Trophy } from "lucide-react";
import { deleteRoomAndNavigate, setPlayersAsImpostors } from "@/lib/roomUtils";

const Game = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { room, players, loading } = useRoom(code || null);
  const { toast } = useToast();
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [isImpostor, setIsImpostor] = useState(false);
  const [voting, setVoting] = useState(false);
  const [selectedVote, setSelectedVote] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [roundNumber, setRoundNumber] = useState(0);
  const [votesCounted, setVotesCounted] = useState(false);

  useEffect(() => {
    const playerName = localStorage.getItem("playerName");
    const player = players.find((p) => p.name === playerName);
    if (player) {
      setCurrentPlayer(player);
      setIsImpostor(player.is_impostor);
    }
    if (room) {
      setIsHost(room.host_name === playerName);
      setVoting(room.status === RoomStatus.VOTING);
      setRoundNumber((room.current_phrase_index || 0) + 1);

      // Resetear hasVoted cuando cambia el estado de la sala a PLAYING
      if (room.status === RoomStatus.PLAYING) {
        setHasVoted(false);
        setSelectedVote(null);
        setVotesCounted(false);
      }
    }
  }, [players, room]);

  const currentPhrase = room?.phrases[room.current_phrase_index || 0];
  const activePlayers = players.filter((p) => !p.is_eliminated);

  const handleEndGame = async () => {
    if (!room) return;
    await deleteRoomAndNavigate(room.id, navigate, toast);
  };

  const startVoting = async () => {
    if (!room) return;
    setVoting(true);
    setRoundNumber((room.current_phrase_index || 0) + 1);
    await supabase
      .from("rooms")
      .update({ status: RoomStatus.VOTING })
      .eq("id", room.id);
  };

  const submitVote = async () => {
    if (!selectedVote || !room || !currentPlayer || hasVoted) return;

    try {
      const { error } = await supabase.from("votes").insert({
        room_id: room.id,
        voter_id: currentPlayer.id,
        voted_for_id: selectedVote,
        round_number: roundNumber,
      });

      if (error) throw error;

      setHasVoted(true);
      toast({
        title: "Voto registrado",
        description: "Esperando a que todos voten...",
      });
    } catch (error) {
      console.error("Error voting:", error);
      toast({
        title: "Error",
        description: "No se pudo registrar el voto",
        variant: "destructive",
      });
    }
  };

  const countVotes = async () => {
    if (!room) return;

    try {
      const { data: votes, error } = await supabase
        .from("votes")
        .select("voted_for_id")
        .eq("room_id", room.id)
        .eq("round_number", roundNumber);

      if (error) throw error;

      const totalVotes = votes?.length || 0;
      if (totalVotes < activePlayers.length) {
        toast({
          title: "Esperando votos",
          description: "No todos los jugadores han votado aún",
        });
        return;
      }

      // Contar votos
      const voteCounts: Record<string, number> = {};
      for (const vote of votes) {
        voteCounts[vote.voted_for_id] =
          (voteCounts[vote.voted_for_id] || 0) + 1;
      }

      // Encontrar el más votado
      let maxVotes = 0;
      let mostVoted = "";
      for (const [playerId, count] of Object.entries(voteCounts)) {
        if (count > maxVotes) {
          maxVotes = count;
          mostVoted = playerId;
        }
      }

      // Verificar si el más votado es un impostor
      const votedPlayer = activePlayers.find((p) => p.id === mostVoted);
      if (votedPlayer?.is_impostor) {
        toast({
          title: "¡Impostor eliminado!",
          description: "Los jugadores han ganado esta ronda",
        });
        nextPhrase();
      } else {
        // Eliminar al jugador votado
        await supabase
          .from("players")
          .update({ is_eliminated: true })
          .eq("id", mostVoted);

        // Verificar si solo quedan 2 jugadores (impostor gana)
        const remainingPlayers = activePlayers.filter(
          (p) => p.id !== mostVoted,
        );
        if (remainingPlayers.length <= 2) {
          toast({
            title: "¡El impostor ha ganado!",
            description: "Solo quedaban 2 jugadores",
          });
          nextPhrase();
        } else {
          setVoting(false);
          setHasVoted(false);
          setSelectedVote(null);
          setRoundNumber((prev) => prev + 1);
          await supabase
            .from("rooms")
            .update({ status: RoomStatus.PLAYING })
            .eq("id", room.id);
        }
      }
      setVotesCounted(true);
    } catch (error) {
      console.error("Error counting votes:", error);
    }
  };

  const nextPhrase = async () => {
    if (!room) return;

    const nextIndex = (room.current_phrase_index || 0) + 1;

    if (nextIndex >= room.phrases.length) {
      await supabase
        .from("rooms")
        .update({ status: RoomStatus.FINISHED })
        .eq("id", room.id);
      return;
    }

    // Seleccionar nuevos impostores aleatorios
    const newImpostorIds = [...players]
      .sort(() => Math.random() - 0.5)
      .slice(0, players.filter((p) => p.is_impostor).length)
      .map((p) => p.id);

    await setPlayersAsImpostors(room.id, newImpostorIds);

    setVoting(false);
    setHasVoted(false);
    setSelectedVote(null);
    setVotesCounted(false);
  };

  if (loading) {
    return (
      <div className="min-h-full bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <p className="text-lg">Cargando juego...</p>
      </div>
    );
  }

  if (!room || !currentPlayer) {
    return (
      <div className="min-h-full bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <Card className="p-8 text-center">
          <p className="text-lg mb-4">Error al cargar el juego</p>
          <Button onClick={() => navigate("/")}>Volver al inicio</Button>
        </Card>
      </div>
    );
  }

  if (room.status === RoomStatus.FINISHED) {
    return (
      <div className="min-h-full bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <Card className="p-8 text-center">
          <Trophy className="h-16 w-16 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">Juego Terminado</h2>
          <p className="text-muted-foreground mb-6">Gracias por jugar</p>
          <Button onClick={() => navigate("/")}>Volver al inicio</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="max-w-4xl mx-auto space-y-6 py-8">
        <div className="text-center py-2 bg-muted rounded-lg">
          <p className="text-lg font-semibold">
            Jugando como: {currentPlayer.name}
          </p>
        </div>
        {isHost && (
          <div className="inline-block align-middle">
            <Button
              variant="ghost"
              size="sm"
              className="inline-flex items-center h-8 px-3 text-sm"
              onClick={handleEndGame}
            >
              <Trophy className="mr-2 h-4 w-4" />
              Terminar Juego
            </Button>
          </div>
        )}
        {voting ? (
          <Card className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <Vote className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">Votación</h2>
            </div>

            {hasVoted ? (
              <div className="text-center py-8">
                <Trophy className="h-16 w-16 text-primary mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">Voto registrado</p>
                <p className="text-muted-foreground">
                  Esperando a que todos voten...
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-muted-foreground mb-4">
                  Selecciona quién crees que es el impostor:
                </p>
                {activePlayers
                  .filter((p) => p.id !== currentPlayer.id)
                  .map((player) => (
                    <Button
                      key={player.id}
                      variant={
                        selectedVote === player.id ? "default" : "outline"
                      }
                      className="w-full h-14 text-lg justify-start"
                      onClick={() => setSelectedVote(player.id)}
                    >
                      {player.name}
                    </Button>
                  ))}
                <Button
                  onClick={submitVote}
                  disabled={!selectedVote}
                  className="w-full h-14 text-lg font-semibold gradient-primary"
                >
                  Confirmar Voto
                </Button>
              </div>
            )}
            {isHost && !votesCounted && (
              <Button onClick={countVotes} className="mt-6 gradient-primary">
                Contar Votos
              </Button>
            )}
          </Card>
        ) : (
          <>
            <Card
              className={`p-12 text-center ${isImpostor ? "gradient-impostor border-2 border-destructive" : "gradient-primary border-2 border-primary"}`}
            >
              <div className="flex items-center justify-center mb-6">
                {isImpostor ? (
                  <AlertTriangle className="h-16 w-16 text-destructive-foreground" />
                ) : (
                  <Eye className="h-16 w-16 text-primary-foreground" />
                )}
              </div>
              <h2 className="text-4xl font-bold mb-4 text-white">
                {isImpostor ? "¡Eres el IMPOSTOR!" : "Tu frase es:"}
              </h2>
              {!isImpostor && (
                <p className="text-3xl font-bold text-white">{currentPhrase}</p>
              )}
              {isImpostor && (
                <p className="text-xl text-white/90 mt-4">
                  Intenta descubrir la frase sin que te descubran
                </p>
              )}
              {isImpostor && (
                <audio src="/sound-impostor.weba" autoPlay>
                  <track kind="captions" />
                </audio>
              )}
            </Card>

            <PlayerList players={players} showEliminated />

            {isHost && (
              <Button
                onClick={startVoting}
                className="w-full h-14 text-lg font-semibold bg-secondary hover:bg-secondary/90"
              >
                <Vote className="mr-2 h-5 w-5" />
                Iniciar Votación
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Game;
