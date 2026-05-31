export function Bib1sLogo({ className }: { className?: string }) {
  return (
    <img
      src="/logo.png"
      alt="Bib1s"
      className={`h-9 w-auto object-contain ${className ?? ""}`}
    />
  );
}
