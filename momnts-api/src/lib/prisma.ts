import "dotenv/config";
import pg from "pg";
import { parse } from "pg-connection-string";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/index.js";

const rawConnectionString = `${process.env.DATABASE_URL}`;
const connectionString = rawConnectionString.includes('uselibpqcompat=true') 
  ? rawConnectionString 
  : `${rawConnectionString}${rawConnectionString.includes('?') ? '&' : '?'}uselibpqcompat=true`;

const config = parse(connectionString);

if (config.ssl) {
  if (typeof config.ssl === "object") {
    config.ssl.rejectUnauthorized = false;
  } else {
    config.ssl = { rejectUnauthorized: false };
  }
} else {
  config.ssl = { rejectUnauthorized: false };
}

const pool = new pg.Pool(config as any);
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export { prisma };