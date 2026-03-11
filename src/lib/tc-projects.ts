import { db } from "@/db";
import { tcProjects } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getProjectById(projectId: string) {
  const [project] = await db
    .select()
    .from(tcProjects)
    .where(eq(tcProjects.id, projectId))
    .limit(1);

  return project ?? null;
}

