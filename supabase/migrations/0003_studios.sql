-- Studios group films the way franchises do — Marvel Studios, A24, Studio
-- Ghibli — and the two are deliberately the same shape: one row per name, one
-- nullable reference on the film. Keeping them as separate tables rather than
-- one "groups" table with a kind column keeps each film's single franchise and
-- single studio enforced by the schema instead of by convention.
create table studios (
  id   uuid primary key default gen_random_uuid(),
  name text not null unique
);

alter table films add column studio_id uuid references studios(id);
