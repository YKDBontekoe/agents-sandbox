alter table public.game_state
  add column if not exists founding_charter jsonb;

comment on column public.game_state.founding_charter is 'Origin perks chosen at campaign start.';
