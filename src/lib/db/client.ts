import postgres from "postgres";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

export const sql = postgres(process.env.DATABASE_URL, {
  ssl: "require",
  /**
   * Required by Supabase's transaction pooler (port 6543), which is what
   * DATABASE_URL points at. The pooler hands each transaction whichever
   * backend connection is free, so a statement prepared on one is absent from
   * the next and Postgres answers 26000 "prepared statement ... does not
   * exist". porsager/postgres prepares by default, so this must be off.
   *
   * The failure is intermittent by nature — it only bites when a later query
   * lands on a different backend than the one that prepared it — which is why
   * adding a title succeeded some of the time and 500'd the rest.
   */
  prepare: false,
});
