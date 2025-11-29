-- Crear tabla de salas
CREATE TABLE public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  host_name text NOT NULL,
  status text NOT NULL DEFAULT 'lobby', -- lobby, playing, finished
  phrases text[] DEFAULT ARRAY[]::text[],
  current_phrase_index integer DEFAULT 0,
  impostor_player_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Crear tabla de jugadores
CREATE TABLE public.players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  is_eliminated boolean DEFAULT false,
  is_host boolean DEFAULT false,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(room_id, name)
);

-- Crear tabla de votos
CREATE TABLE public.votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  voter_id uuid REFERENCES public.players(id) ON DELETE CASCADE NOT NULL,
  voted_for_id uuid REFERENCES public.players(id) ON DELETE CASCADE NOT NULL,
  round_number integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(room_id, voter_id, round_number)
);

-- Habilitar Row Level Security
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: permitir a todos leer y escribir (juego público)
CREATE POLICY "Permitir acceso público a salas"
  ON public.rooms FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Permitir acceso público a jugadores"
  ON public.players FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Permitir acceso público a votos"
  ON public.votes FOR ALL
  USING (true)
  WITH CHECK (true);

-- Habilitar realtime para todas las tablas
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.votes;

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at en rooms
CREATE TRIGGER update_rooms_updated_at
BEFORE UPDATE ON public.rooms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();