import { Link } from "react-router-dom";
import { Waves } from "lucide-react";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl text-cyan-600">
          <Waves className="h-6 w-6" />
          Song Ngư Club
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium text-gray-600">
          <Link to="/" className="hover:text-indigo-600 transition-colors">Sự kiện</Link>
        </nav>
      </div>
    </header>
  );
}
