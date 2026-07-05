import Studio from "../../studio";

export default async function CreateVideoPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string }>;
}) {
  const { preset } = await searchParams;
  return <Studio category="video" presetId={preset} />;
}
