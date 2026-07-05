import Studio from "../../studio";

export default async function CreateImagePage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string }>;
}) {
  const { preset } = await searchParams;
  return <Studio category="image" presetId={preset} />;
}
