import { pgTable, text, integer } from "drizzle-orm/pg-core";

export const counters = pgTable("counters", {
  name: text().primaryKey(),
  count: integer().notNull().default(0),
});
