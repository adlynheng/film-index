import { randomUUID } from "crypto";
import { sql } from "../src/lib/db/client";
import { filmSlugExists, insertFilm } from "../src/lib/db/films";
import { generateUniqueFilmSlug } from "../src/lib/slug";
import type { FilmCategory } from "../src/lib/types";

interface SeedFilm {
  title: string;
  year: number;
  director: string;
  categories: FilmCategory[];
  cast: [string, string][];
}

interface SeedFranchise {
  name: string;
  films: SeedFilm[];
}

// Copied from My Film Index.dc.html's SEED constant.
const standaloneFilms: SeedFilm[] = [
  { title: "Inception", year: 2010, director: "Christopher Nolan", categories: ["Movies"], cast: [["Leonardo DiCaprio", "Dom Cobb"], ["Joseph Gordon-Levitt", "Arthur"], ["Elliot Page", "Ariadne"], ["Tom Hardy", "Eames"], ["Cillian Murphy", "Robert Fischer"]] },
  { title: "Lock, Stock and Two Smoking Barrels", year: 1998, director: "Guy Ritchie", categories: ["Movies"], cast: [["Jason Statham", "Bacon"], ["Jason Flemyng", "Tom"], ["Dexter Fletcher", "Soap"], ["Vinnie Jones", "Big Chris"]] },
  { title: "Gravity", year: 2013, director: "Alfonso Cuarón", categories: ["Movies"], cast: [["Sandra Bullock", "Dr. Ryan Stone"], ["George Clooney", "Matt Kowalski"]] },
  { title: "Jojo Rabbit", year: 2019, director: "Taika Waititi", categories: ["Movies"], cast: [["Roman Griffin Davis", "Jojo Betzler"], ["Thomasin McKenzie", "Elsa Korr"], ["Scarlett Johansson", "Rosie Betzler"], ["Sam Rockwell", "Captain Klenzendorf"]] },
  { title: "Parasite", year: 2019, director: "Bong Joon-ho", categories: ["Movies"], cast: [["Song Kang-ho", "Ki-taek"], ["Lee Sun-kyun", "Mr. Park"], ["Cho Yeo-jeong", "Yeon-kyo"], ["Choi Woo-shik", "Ki-woo"]] },
  { title: "The Dark Knight", year: 2008, director: "Christopher Nolan", categories: ["Movies"], cast: [["Christian Bale", "Bruce Wayne"], ["Heath Ledger", "The Joker"], ["Aaron Eckhart", "Harvey Dent"], ["Michael Caine", "Alfred Pennyworth"], ["Cillian Murphy", "Jonathan Crane"]] },
  { title: "Severance", year: 2022, director: "Ben Stiller", categories: ["TV shows"], cast: [["Adam Scott", "Mark Scout"], ["Britt Lower", "Helly R."], ["John Turturro", "Irving Bailiff"], ["Patricia Arquette", "Harmony Cobel"]] },
  { title: "The Bear", year: 2022, director: "Christopher Storer", categories: ["TV shows"], cast: [["Jeremy Allen White", "Carmy Berzatto"], ["Ayo Edebiri", "Sydney Adamu"], ["Ebon Moss-Bachrach", "Richie Jerimovich"]] },
  { title: "Chernobyl", year: 2019, director: "Johan Renck", categories: ["TV shows", "Documentaries"], cast: [["Jared Harris", "Valery Legasov"], ["Stellan Skarsgård", "Boris Shcherbina"], ["Emily Watson", "Ulana Khomyuk"]] },
  { title: "Spider-Man: Into the Spider-Verse", year: 2018, director: "Bob Persichetti", categories: ["Animation", "Movies"], cast: [["Shameik Moore", "Miles Morales"], ["Jake Johnson", "Peter B. Parker"], ["Hailee Steinfeld", "Gwen Stacy"]] },
  { title: "Spirited Away", year: 2001, director: "Hayao Miyazaki", categories: ["Animation", "Movies"], cast: [["Rumi Hiiragi", "Chihiro"], ["Miyu Irino", "Haku"], ["Mari Natsuki", "Yubaba"]] },
  { title: "Arcane", year: 2021, director: "Pascal Charrue", categories: ["Animation", "TV shows"], cast: [["Hailee Steinfeld", "Vi"], ["Ella Purnell", "Jinx"], ["Kevin Alejandro", "Jayce"]] },
  { title: "Free Solo", year: 2018, director: "Elizabeth Chai Vasarhelyi", categories: ["Documentaries"], cast: [["Alex Honnold", "Himself"], ["Tommy Caldwell", "Himself"]] },
  { title: "Won't You Be My Neighbor?", year: 2018, director: "Morgan Neville", categories: ["Documentaries"], cast: [["Fred Rogers", "Himself"], ["Joanne Rogers", "Herself"]] },
  { title: "Apollo 11", year: 2019, director: "Todd Douglas Miller", categories: ["Documentaries"], cast: [["Neil Armstrong", "Himself"], ["Buzz Aldrin", "Himself"], ["Michael Collins", "Himself"]] },
];

// Copied from My Film Index.dc.html's FRANCHISES constant.
const franchises: SeedFranchise[] = [
  {
    name: "The Lord of the Rings",
    films: [
      { title: "The Fellowship of the Ring", year: 2001, director: "Peter Jackson", categories: ["Movies"], cast: [["Elijah Wood", "Frodo Baggins"], ["Ian McKellen", "Gandalf"], ["Viggo Mortensen", "Aragorn"], ["Sean Bean", "Boromir"]] },
      { title: "The Two Towers", year: 2002, director: "Peter Jackson", categories: ["Movies"], cast: [["Elijah Wood", "Frodo Baggins"], ["Ian McKellen", "Gandalf"], ["Viggo Mortensen", "Aragorn"], ["Andy Serkis", "Gollum"]] },
      { title: "The Return of the King", year: 2003, director: "Peter Jackson", categories: ["Movies"], cast: [["Elijah Wood", "Frodo Baggins"], ["Ian McKellen", "Gandalf"], ["Viggo Mortensen", "Aragorn"], ["Andy Serkis", "Gollum"], ["Sean Astin", "Samwise Gamgee"]] },
    ],
  },
  {
    name: "Star Wars — Original Trilogy",
    films: [
      { title: "A New Hope", year: 1977, director: "George Lucas", categories: ["Movies"], cast: [["Mark Hamill", "Luke Skywalker"], ["Harrison Ford", "Han Solo"], ["Carrie Fisher", "Princess Leia"], ["Alec Guinness", "Obi-Wan Kenobi"]] },
      { title: "The Empire Strikes Back", year: 1980, director: "Irvin Kershner", categories: ["Movies"], cast: [["Mark Hamill", "Luke Skywalker"], ["Harrison Ford", "Han Solo"], ["Carrie Fisher", "Princess Leia"], ["Billy Dee Williams", "Lando Calrissian"]] },
      { title: "Return of the Jedi", year: 1983, director: "Richard Marquand", categories: ["Movies"], cast: [["Mark Hamill", "Luke Skywalker"], ["Harrison Ford", "Han Solo"], ["Carrie Fisher", "Princess Leia"], ["Ian McDiarmid", "The Emperor"]] },
    ],
  },
  {
    name: "Before Trilogy",
    films: [
      { title: "Before Sunrise", year: 1995, director: "Richard Linklater", categories: ["Movies"], cast: [["Ethan Hawke", "Jesse Wallace"], ["Julie Delpy", "Céline"]] },
      { title: "Before Sunset", year: 2004, director: "Richard Linklater", categories: ["Movies"], cast: [["Ethan Hawke", "Jesse Wallace"], ["Julie Delpy", "Céline"]] },
      { title: "Before Midnight", year: 2013, director: "Richard Linklater", categories: ["Movies"], cast: [["Ethan Hawke", "Jesse Wallace"], ["Julie Delpy", "Céline"]] },
    ],
  },
  {
    name: "Alien",
    films: [
      { title: "Alien", year: 1979, director: "Ridley Scott", categories: ["Movies"], cast: [["Sigourney Weaver", "Ellen Ripley"], ["Tom Skerritt", "Dallas"], ["John Hurt", "Kane"]] },
      { title: "Aliens", year: 1986, director: "James Cameron", categories: ["Movies"], cast: [["Sigourney Weaver", "Ellen Ripley"], ["Michael Biehn", "Corporal Hicks"], ["Bill Paxton", "Private Hudson"]] },
    ],
  },
];

async function seedFilm(film: SeedFilm, franchiseId: string | null): Promise<void> {
  const slug = await generateUniqueFilmSlug(film.title, film.year, filmSlugExists);
  await insertFilm({
    id: randomUUID(),
    slug,
    title: film.title,
    year: film.year,
    director: film.director,
    posterKey: null,
    franchiseId,
    categories: film.categories,
    cast: film.cast.map(([personName, role]) => ({ personName, role })),
  });
  console.log(`seeded film: ${film.title} (${slug})`);
}

async function seedFranchise(franchise: SeedFranchise): Promise<void> {
  const [{ id: franchiseId }] = await sql<{ id: string }[]>`
    insert into franchises (name) values (${franchise.name}) returning id
  `;
  console.log(`seeded franchise: ${franchise.name}`);
  for (const film of franchise.films) {
    await seedFilm(film, franchiseId);
  }
}

async function main(): Promise<void> {
  // Seeding is not idempotent: films are inserted before franchises, and the
  // franchise insert hits a unique constraint on `name`. A second run would
  // therefore add 26 duplicate films under "-2" slugs and only then fail,
  // leaving the database half-seeded. Refuse rather than make that mess.
  const [{ count: existingFilmCount }] = await sql<{ count: number }[]>`
    select count(*)::int as count from films
  `;
  if (existingFilmCount > 0) {
    console.error(
      `Refusing to seed: the films table already holds ${existingFilmCount} row(s). ` +
        `Empty it first with: delete from films; delete from franchises; delete from people;`
    );
    await sql.end();
    process.exit(1);
  }

  for (const film of standaloneFilms) {
    await seedFilm(film, null);
  }
  for (const franchise of franchises) {
    await seedFranchise(franchise);
  }
  await sql.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
