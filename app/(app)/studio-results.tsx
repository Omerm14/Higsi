export type OutputKind = "image" | "video" | "audio" | "3d";

export function MediaTile({
  src,
  outputKind,
  alt,
}: {
  src: string;
  outputKind: OutputKind;
  alt: string;
}) {
  if (outputKind === "image") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className="h-full w-full object-cover" />;
  }
  if (outputKind === "video") {
    return <video src={src} controls className="h-full w-full object-cover" />;
  }
  if (outputKind === "audio") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-4">
        <span className="text-2xl">🎵</span>
        <audio src={src} controls className="w-full" />
      </div>
    );
  }
  // 3d
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-xs text-muted">
      <span className="text-2xl">🧊</span>
      <a href={src} download className="underline hover:text-foreground">
        Download .glb
      </a>
    </div>
  );
}
