-- People are identified by their TMDB person id wherever one is known, because
-- names are not unique: there are several working actors named Chris Evans,
-- and collapsing them into a single row would invent co-appearance edges in
-- the actor network — two strangers shown as having worked together.
alter table people add column tmdb_person_id integer;

-- Name uniqueness has to go: two different people sharing a name is precisely
-- the case this migration exists to allow.
alter table people drop constraint people_name_key;

create unique index people_tmdb_person_id_key on people (tmdb_person_id);

-- Rows with no TMDB id (the seed data, and any hand-entered credit) still
-- de-duplicate on name, because the name is the only identity they have.
-- NULLs are distinct in a unique index, so this partial index leaves
-- TMDB-sourced rows entirely unconstrained by name.
create unique index people_name_key on people (name) where tmdb_person_id is null;
