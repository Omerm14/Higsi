import { listGenerations, toClientGeneration } from "@/lib/db";
import { requireUser } from "@/lib/users";
import GalleryGrid from "./gallery-grid";

export const dynamic = "force-dynamic";

export default async function GalleryPage() {
  const user = await requireUser();
  const generations = await listGenerations(user.id);
  return <GalleryGrid generations={generations.map(toClientGeneration)} />;
}
