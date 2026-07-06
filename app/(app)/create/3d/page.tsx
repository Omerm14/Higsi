import Studio from "../../studio";

export default async function CreateThreeDPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string }>;
}) {
  const { preset } = await searchParams;
  return <Studio category="3d" presetId={preset} />;
}
