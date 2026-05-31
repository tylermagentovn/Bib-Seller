export function Bib1sLogo({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      {/* Race bib tag icon */}
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Card body */}
        <rect x="3" y="7" width="26" height="22" rx="3" fill="#0891b2" />
        {/* Top stripe accent */}
        <rect x="3" y="7" width="26" height="7" rx="3" fill="#0e7490" />
        <rect x="3" y="11" width="26" height="3" fill="#0e7490" />
        {/* Pin holes */}
        <circle cx="10" cy="7" r="2.5" fill="white" fillOpacity="0.9" />
        <circle cx="22" cy="7" r="2.5" fill="white" fillOpacity="0.9" />
        {/* Number lines */}
        <rect x="7" y="18" width="18" height="3" rx="1.5" fill="white" fillOpacity="0.95" />
        <rect x="7" y="24" width="12" height="2.5" rx="1.25" fill="white" fillOpacity="0.55" />
      </svg>

      {/* Brand text */}
      <span className="font-extrabold text-xl tracking-tight leading-none select-none">
        <span className="text-cyan-600">bib</span>
        <span className="text-indigo-600">1s</span>
      </span>
    </div>
  );
}
