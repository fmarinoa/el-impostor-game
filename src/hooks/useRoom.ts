import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Player {
  id: string;
  name: string;
  is_eliminated: boolean;
  is_host: boolean;
}

export enum RoomStatus {
  LOBBY = 'lobby',
  PLAYING = 'playing',
  VOTING = 'voting',
  FINISHED = 'finished',
}

export interface Room {
  id: string;
  code: string;
  host_name: string;
  status: RoomStatus;
  phrases: string[];
  current_phrase_index: number;
  impostor_player_id: string | null;
}

export const useRoom = (roomCode: string | null) => {
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRoom = useCallback(async () => {
    if (!roomCode) return;
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('code', roomCode)
      .single();

    if (error) {
      console.error('Error fetching room:', error);
      return;
    }

    setRoom(data as any as Room);
  }, [roomCode]);

  const fetchPlayers = useCallback(async () => {
    if (!roomCode) return;
    const { data: roomData } = await supabase
      .from('rooms')
      .select('id')
      .eq('code', roomCode)
      .single();

    if (!roomData) return;

    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', roomData.id)
      .order('joined_at', { ascending: true });

    if (error) {
      console.error('Error fetching players:', error);
      return;
    }

    setPlayers(data || []);
  }, [roomCode]);

  useEffect(() => {
    if (!roomCode) {
      setLoading(false);
      return;
    }

    fetchRoom();
    fetchPlayers();
    setLoading(false);

    // Suscribirse a cambios en tiempo real
    const roomChannel = supabase
      .channel(`room-${roomCode}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rooms',
          filter: `code=eq.${roomCode}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' && payload.new) {
            setRoom(payload.new as any as Room);
          }
        }
      )
      .subscribe();

    const playersChannel = supabase
      .channel(`players-${roomCode}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
        },
        () => {
          fetchPlayers();
        }
      )
      .subscribe();

    // Listener para cuando la pestaña se vuelve visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchRoom();
        fetchPlayers();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      supabase.removeChannel(roomChannel);
      supabase.removeChannel(playersChannel);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [roomCode, fetchRoom, fetchPlayers]);

  return { room, players, loading };
};