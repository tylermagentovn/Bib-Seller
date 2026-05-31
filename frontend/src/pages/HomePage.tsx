import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { api, type Event } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, ChevronRight, Waves, Users } from "lucide-react";

export function HomePage() {
  const { data: events = [], isLoading } = useQuery<Event[]>({
    queryKey: ["events"],
    queryFn: () => api.get("/events").then((r) => r.data),
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        <title>Bib1s - Nền tảng đăng ký BIB giải đấu miễn phí.</title>
        <meta name="description" content="Nền tảng đăng ký BIB giải đấu miễn phí" />
        <meta property="og:url" content="https://songngu.info/" />
        <meta property="og:title" content="Nền tảng đăng ký BIB giải đấu miễn phí" />
        <meta property="og:description" content="Nền tảng đăng ký BIB giải đấu miễn phí" />
        <meta property="og:image" content="https://songngu.info/banner.jpg" />
      </Helmet>
      {/* Hero */}
      <section
        className="relative text-white py-28 px-4"
        style={{
          backgroundImage: "url(/banner.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-black/55" />
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm mb-6 border border-white/20">
            Aquathlon Cửa Lò
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight drop-shadow-lg">
            Đăng ký BIB<br />đơn giản & nhanh chóng
          </h1>
          <p className="text-white/80 text-lg max-w-xl mx-auto drop-shadow">
            Chọn sự kiện, điền thông tin, thanh toán và nhận số BIB ngay lập tức.
          </p>
        </div>
      </section>

      {/* Events */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Sự kiện đang diễn ra</h2>
            <p className="text-gray-500 mt-1">Chọn sự kiện phù hợp và đăng ký ngay</p>
          </div>
          <Badge variant="secondary" className="text-sm px-3 py-1.5">
            {events.length} sự kiện
          </Badge>
        </div>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl h-80 animate-pulse" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Waves className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg">Chưa có sự kiện nào đang diễn ra</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function EventCard({ event }: { event: Event }) {
  const minPrice = event.distances.length > 0
    ? Math.min(...event.distances.map((d) => d.price))
    : null;

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all duration-200 flex flex-col">
      {event.imageUrl ? (
        <img src={event.imageUrl} alt={event.name} className="w-full h-48 object-cover" />
      ) : (
        <div className="w-full h-48 bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
          <Waves className="h-16 w-16 text-white/40" />
        </div>
      )}
      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-bold text-gray-900 text-lg leading-tight mb-2">{event.name}</h3>

        <div className="space-y-1.5 text-sm text-gray-500 mb-4">
          {event.eventDate && (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-indigo-400" />
              {formatDate(event.eventDate)}
            </div>
          )}
          {event.location && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-indigo-400" />
              {event.location}
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4 text-indigo-400" />
            {event.distances.length} cự ly
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {event.distances.map((d) => (
            <Badge key={d.id} variant="default" className="text-xs">
              {d.name}
            </Badge>
          ))}
        </div>

        <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-100">
          {minPrice !== null && (
            <span className="text-sm font-semibold text-indigo-600">
              Từ {formatCurrency(minPrice)}
            </span>
          )}
          <Button asChild size="sm" className="ml-auto">
            <Link to={`/events/${event.slug}`}>
              Xem chi tiết <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
