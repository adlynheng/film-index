create type film_category as enum ('Movies', 'TV shows', 'Animation', 'Documentaries');

create table franchises (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique
);

create table films (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  title        text not null,
  year         integer,
  director     text,
  poster_key   text,
  franchise_id uuid references franchises(id),
  tmdb_id      integer,
  created_at   timestamptz not null default now()
);

create table film_categories (
  film_id  uuid not null references films(id) on delete cascade,
  category film_category not null,
  primary key (film_id, category)
);
create index on film_categories (category);

create table people (
  id   uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table film_cast (
  film_id    uuid not null references films(id) on delete cascade,
  person_id  uuid not null references people(id) on delete cascade,
  role       text,
  sort_order integer not null default 0,
  primary key (film_id, person_id)
);
create index on film_cast (person_id);
