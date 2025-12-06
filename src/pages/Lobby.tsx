import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RoomCode } from '@/components/RoomCode';
import { PlayerList } from '@/components/PlayerList';
import { useRoom } from '@/hooks/useRoom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Play, ArrowLeft, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const Lobby = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { room, players, loading } = useRoom(code || null);
  const { toast } = useToast();
  const [phrasesText, setPhrasesText] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [starting, setStarting] = useState(false);
  const [minPlayers, setMinPlayers] = useState(3);
  const [maxPlayers, setMaxPlayers] = useState(10);

  useEffect(() => {
    const playerName = localStorage.getItem('playerName');
    if (room) {
      setIsHost(room.host_name === playerName);
    }
  }, [room]);

  useEffect(() => {
    if (room?.status === 'playing') {
      navigate(`/game/${code}`);
    }
  }, [room?.status, code, navigate]);

  const startGame = async () => {
    if (!room) return;

    const phrases = phrasesText
      .split('\n')
      .map(p => p.trim())
      .filter(p => p.length > 0);

    if (phrases.length === 0) {
      toast({
        title: 'Error',
        description: 'Por favor ingresa al menos una frase',
        variant: 'destructive',
      });
      return;
    }

    if (players.length > maxPlayers || players.length < minPlayers) {
      toast({
        title: 'Error',
        description: `Se necesitan entre ${minPlayers} y ${maxPlayers} jugadores para comenzar`,
        variant: 'destructive',
      });
      return;
    }

    setStarting(true);

    try {
      // Mezclar frases
      const shuffledPhrases = [...phrases].sort(() => Math.random() - 0.5);
      
      // Seleccionar impostor aleatorio
      const randomImpostor = players[Math.floor(Math.random() * players.length)];

      const { error } = await supabase
        .from('rooms')
        .update({
          phrases: shuffledPhrases,
          status: 'playing',
          impostor_player_id: randomImpostor.id,
          current_phrase_index: 0,
        })
        .eq('id', room.id);

      if (error) throw error;

      toast({
        title: '¡Juego iniciado!',
        description: 'Todos los jugadores verán su rol',
      });
    } catch (error) {
      console.error('Error starting game:', error);
      toast({
        title: 'Error',
        description: 'No se pudo iniciar el juego',
        variant: 'destructive',
      });
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <p className="text-lg">Cargando sala...</p>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <Card className="p-8 text-center">
          <p className="text-lg mb-4">Sala no encontrada</p>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al inicio
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="max-w-4xl mx-auto space-y-6 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Salir de la sala
        </Button>

        <RoomCode code={room.code} />

        <div className="grid md:grid-cols-2 gap-6">
          <PlayerList players={players} />

          {isHost && (
            <Card className="p-6 space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <Play className="h-5 w-5 text-primary" />
                  Configurar Frases
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Escribe una frase por línea. Ejemplo:
                  <br />
                  Ronaldo Nazario
                  <br />
                  Messi
                </p>
                <Textarea
                  placeholder="Ronaldo Nazario&#10;Messi&#10;Cristiano Ronaldo"
                  value={phrasesText}
                  onChange={(e) => setPhrasesText(e.target.value)}
                  className="min-h-[200px] font-mono"
                />
              </div>
                <div className="space-x-3 flex flex-row">
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                  Jugadores mínimos
                  </Label>
                  <Input
                  type="number" 
                  min="2"
                  max="20"
                  value={minPlayers}
                  onChange={(e) => setMinPlayers(Number(e.target.value))}
                  className="w-full"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                  Jugadores máximos
                  </Label>
                  <Input
                  type="number" 
                  min="2"
                  max="20"
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(Number(e.target.value))}
                  className="w-full"
                  />
                </div>
              </div>

              <Button
                onClick={startGame}
                disabled={starting || players.length < 3}
                className="w-full h-12 text-lg font-semibold gradient-primary hover:opacity-90"
              >
                <Play className="mr-2 h-5 w-5" />
                {starting ? 'Iniciando...' : 'Iniciar Juego'}
              </Button>

              {players.length < 3 && (
                <p className="text-sm text-muted-foreground text-center">
                  Se necesitan al menos 3 jugadores
                </p>
              )}
            </Card>
          )}

          {!isHost && (
            <Card className="p-6 flex flex-col items-center justify-center text-center space-y-4">
              <Users className="h-16 w-16 text-primary opacity-50" />
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  Esperando al host
                </h3>
                <p className="text-sm text-muted-foreground">
                  El host iniciará el juego cuando todos estén listos
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Lobby;