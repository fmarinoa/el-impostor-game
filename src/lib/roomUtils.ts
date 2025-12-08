import { supabase } from "@/integrations/supabase/client";
import { NavigateFunction } from "react-router-dom";

export const deleteRoomAndNavigate = async (
  roomId: string,
  navigate: NavigateFunction,
  toast: (options: {
    title: string;
    description: string;
    variant?: "default" | "destructive";
  }) => void,
) => {
  try {
    await supabase.from("rooms").delete().eq("id", roomId);
    localStorage.removeItem("playerName");
    localStorage.removeItem("roomCode");
    toast({
      title: "Sala eliminada",
      description: "La sala ha sido terminada",
    });
    navigate("/");
  } catch (error) {
    console.error("Error deleting room:", error);
    toast({
      title: "Error",
      description: "No se pudo eliminar la sala",
      variant: "destructive",
    });
  }
};

export const setPlayersAsImpostors = async (
  roomId: string,
  impostorIds: string[],
): Promise<void> => {
  // Resetear todos los jugadores a no impostores primero
  await supabase
    .from("players")
    .update({ is_impostor: false })
    .eq("room_id", roomId);
  // Marcar los impostores seleccionados
   await supabase
    .from("players")
    .update({ is_impostor: true })
    .in("id", impostorIds);
};
