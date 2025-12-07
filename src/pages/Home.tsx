import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus } from "lucide-react";
import { Label } from "@/components/ui/label";

const Home = () => {
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const generateRoomCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const createRoom = async () => {
    if (!playerName.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingresa tu nombre",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const code = generateRoomCode();

    try {
      const { data: room, error: roomError } = await supabase
        .from("rooms")
        .insert({
          code,
          host_name: playerName,
          status: "lobby",
        })
        .select()
        .single();

      if (roomError) throw roomError;

      const { error: playerError } = await supabase.from("players").insert({
        room_id: room.id,
        name: playerName,
        is_host: true,
      });

      if (playerError) throw playerError;

      localStorage.setItem("playerName", playerName);
      localStorage.setItem("roomCode", code);
      navigate(`/lobby/${code}`);
    } catch (error) {
      console.error("Error creating room:", error);
      toast({
        title: "Error",
        description: "No se pudo crear la sala",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async () => {
    if (!playerName.trim()) {
      toast({
      title: "Error",
      description: "Por favor ingresa tu nombre",
      variant: "destructive",
      });
      return;
    }

    if (!roomCode.trim()) {
      toast({
      title: "Error",
      description: "Por favor ingresa el código de sala",
      variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: room, error: roomError } = await supabase
        .from("rooms")
        .select("*")
        .eq("code", roomCode.toUpperCase())
        .single();

      if (roomError || !room) {
        toast({
          title: "Error",
          description: "Sala no encontrada",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const { error: playerError } = await supabase.from("players").insert({
        room_id: room.id,
        name: playerName,
        is_host: false,
      });

      if (playerError) {
        toast({
          title: "Error",
          description: "No se pudo unir a la sala",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      localStorage.setItem("playerName", playerName);
      localStorage.setItem("roomCode", roomCode.toUpperCase());
      navigate(`/lobby/${roomCode.toUpperCase()}`);
    } catch (error) {
      console.error("Error joining room:", error);
      toast({
        title: "Error",
        description: "No se pudo unir a la sala",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 space-y-8 border-2 shadow-glow">
        <div className="text-center space-y-2">
          <h1 className="text-5xl font-bold gradient-primary bg-clip-text">
            El Impostor
          </h1>
          <p className="text-muted-foreground">
            Descubre quién es el impostor antes de que sea tarde
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">Tu nombre</Label>
            <Input
              placeholder="Ingresa tu nombre..."
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="text-lg"
              maxLength={20}
            />
          </div>

          <Button
            onClick={createRoom}
            disabled={loading}
            className="w-full h-12 text-lg font-semibold gradient-primary hover:opacity-90 transition-opacity"
          >
            <Plus className="mr-2 h-5 w-5" />
            Crear Sala
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                O únete a una sala
              </span>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">
              Código de sala
            </Label>
            <Input
              placeholder="Ej: ABC123"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              className="text-lg uppercase"
              maxLength={6}
            />
          </div>

          <Button
            onClick={joinRoom}
            disabled={loading}
            variant="outline"
            className="w-full h-12 text-lg font-semibold border-2 border-primary hover:bg-primary hover:text-primary-foreground"
          >
            <Users className="mr-2 h-5 w-5" />
            Unirse a Sala
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default Home;
