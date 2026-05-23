import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { api, type Event } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Users, ArrowRight, AlertCircle } from "lucide-react";

export function EventDetailPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: event, isLoading, isError } = useQuery<Event>({
    queryKey: ["event", slug],
    queryFn: () => api.get(`/events/${slug}`).then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (isError || !event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <p className="text-gray-600">Không tìm thấy sự kiện</p>
          <Button asChild variant="link" className="mt-2">
            <Link to="/">Quay lại trang chủ</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero image */}
      <div className="relative h-72 md:h-96 bg-gradient-to-br from-indigo-600 to-violet-700">
        {event.imageUrl && (
          <img src={event.imageUrl} alt={event.name} className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-50" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 max-w-4xl mx-auto">
          <Badge variant="default" className="mb-3 bg-white/20 text-white border-white/30">
            {event.status === "PUBLISHED" ? "Đang mở đăng ký" : event.status}
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight">{event.name}</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 grid gap-8 md:grid-cols-3">
        {/* Main content */}
        <div className="md:col-span-2 space-y-6">
          {/* Info chips */}
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            {event.eventDate && (
              <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-2.5 shadow-sm border">
                <Calendar className="h-4 w-4 text-indigo-500" />
                {formatDate(event.eventDate)}
              </div>
            )}
            {event.location && (
              <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-2.5 shadow-sm border">
                <MapPin className="h-4 w-4 text-indigo-500" />
                {event.location}
              </div>
            )}
            <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-2.5 shadow-sm border">
              <Users className="h-4 w-4 text-indigo-500" />
              {event.distances.length} cự ly
            </div>
          </div>

          {/* Description */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border">
            <h2 className="font-semibold text-gray-900 text-lg mb-3">Giới thiệu sự kiện</h2>
            <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{event.description}</p>
          </div>

          {/* Rules */}
          {event.rules && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border">
              <h2 className="font-semibold text-gray-900 text-lg mb-3">Quy định tham gia</h2>
              <div className="text-gray-600 leading-relaxed whitespace-pre-wrap text-sm">{event.rules}</div>
            </div>
          )}

          {/* Distances detail */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border">
            <h2 className="font-semibold text-gray-900 text-lg mb-4">Các cự ly</h2>
            <div className="space-y-3">
              {event.distances.map((d) => (
                <div key={d.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div>
                    <span className="font-medium text-gray-900">{d.name}</span>
                    <span className="text-xs text-gray-400 ml-2">BIB #{d.bibStart}–{d.bibEnd}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-indigo-600">{formatCurrency(d.price)}</div>
                    <div className="text-xs text-gray-400">{d.maxSlots} suất</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar: register CTA */}
        <div className="md:col-span-1">
          <div className="sticky top-24 bg-white rounded-2xl p-6 shadow-sm border">
            <h3 className="font-bold text-gray-900 text-lg mb-4">Đăng ký tham gia</h3>
            <div className="space-y-2 mb-6">
              {event.distances.map((d) => (
                <div key={d.id} className="flex justify-between text-sm">
                  <span className="text-gray-600">{d.name}</span>
                  <span className="font-medium text-gray-900">{formatCurrency(d.price)}</span>
                </div>
              ))}
            </div>
            {event.status === "PUBLISHED" ? (
              <Button asChild size="lg" className="w-full">
                <Link to={`/events/${event.slug}/register`}>
                  Đăng ký ngay <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button disabled size="lg" className="w-full">
                Chưa mở đăng ký
              </Button>
            )}
            <p className="text-xs text-gray-400 text-center mt-3">
              Thanh toán qua QR code. Hoàn tất trong vài phút.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
