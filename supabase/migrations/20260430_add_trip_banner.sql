alter table if exists trips
add column if not exists trip_banner jsonb default null;
