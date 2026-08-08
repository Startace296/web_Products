import { afterAll, beforeEach } from "vitest";
import { prisma } from "../config/prisma";
import { resetDb } from "./resetDb";

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await prisma.$disconnect();
});
