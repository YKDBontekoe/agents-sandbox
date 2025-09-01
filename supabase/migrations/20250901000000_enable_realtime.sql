-- Enable realtime for core tables (idempotent)
-- This ensures that anon key subscriptions receive changes for these tables

-- Create publication if it somehow doesn't exist (Supabase creates this by default)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

-- Helper to add a table to publication if it's not already added
DO $$
DECLARE
  tbl REGCLASS;
BEGIN
  -- game_state
  SELECT 'public.game_state'::regclass INTO tbl;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'game_state'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.game_state';
  END IF;

  -- proposals
  SELECT 'public.proposals'::regclass INTO tbl;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'proposals'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.proposals';
  END IF;

  -- decisions (optional, future use)
  SELECT 'public.decisions'::regclass INTO tbl;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'decisions'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.decisions';
  END IF;
END $$;