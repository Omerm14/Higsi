import Studio from "../../studio";

export default async function CreateAudioPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string }>;
}) {
  const { preset } = await searchParams;
  return <Studio category="audio" presetId={preset} />;
}
