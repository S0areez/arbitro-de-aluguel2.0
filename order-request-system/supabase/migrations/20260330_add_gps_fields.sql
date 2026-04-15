-- GPS tracking support for profiles and matches
alter table public.profiles
  add column if not exists current_lat double precision,
  add column if not exists current_lng double precision;

alter table public.matches
  add column if not exists referee_lat double precision,
  add column if not exists referee_lng double precision,
  add column if not exists contractor_lat double precision,
  add column if not exists contractor_lng double precision;

