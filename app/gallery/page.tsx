import { listGenerations } from "@/lib/db";
import GalleryGrid from "./gallery-grid";

export const dynamic = "force-dynamic";

export default async function GalleryPage() {
  const generations = await listGenerations();
  return <GalleryGrid generations={generations} />;
}
