/** Original Figma exports retain their intrinsic SVG dimensions. */
export function FigmaAsset({
  file,
  className = "",
}: {
  file: string;
  className?: string;
}) {
  return (
    <img
      src={`/figma/${file}`}
      alt=""
      aria-hidden="true"
      className={`figma-icon ${className}`}
    />
  );
}
