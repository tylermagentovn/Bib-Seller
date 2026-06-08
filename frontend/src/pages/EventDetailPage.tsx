import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { api, userApi, type Event, type Registration } from "@/lib/api";
import { useUser } from "@/contexts/UserContext";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, MapPin, Users, ArrowRight, ChevronRight, AlertCircle, CheckCircle2, Lock, Loader2 } from "lucide-react";

export function EventDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useUser();

  const [unlockedPassword, setUnlockedPassword] = useState<string | null>(() => {
    if (!slug) return null;
    return sessionStorage.getItem(`event-pw-${slug}`) || null;
  });
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [verifying, setVerifying] = useState(false);

  const { data: event, isLoading, error } = useQuery<Event>({
    queryKey: ["event", slug, unlockedPassword],
    queryFn: async () => {
      const config = unlockedPassword
        ? { headers: { "x-event-password": unlockedPassword } }
        : {};
      return api.get(`/events/${slug}`, config).then((r) => r.data);
    },
    retry: false,
  });

  const errCode = (error as any)?.response?.data?.error as string | undefined;

  // If stored password is no longer valid, clear it and show dialog
  useEffect(() => {
    if (errCode === "WRONG_PASSWORD" && unlockedPassword) {
      sessionStorage.removeItem(`event-pw-${slug}`);
      setUnlockedPassword(null);
      setPasswordError("Mật khẩu đã thay đổi. Vui lòng nhập lại.");
    }
  }, [errCode, unlockedPassword, slug]);

  const { data: userRegistrations } = useQuery<Registration[]>({
    queryKey: ["user-registrations"],
    queryFn: () => userApi.get("/users/me/registrations").then((r) => r.data),
    enabled: !!user,
  });

  const alreadyRegistered = !!event
    && !event.allowMultipleRegistrations
    && userRegistrations?.some((r) => r.eventId === event.id && r.status !== "CANCELLED");

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim()) return;
    setVerifying(true);
    setPasswordError("");
    try {
      await api.get(`/events/${slug}`, { headers: { "x-event-password": passwordInput.trim() } });
      sessionStorage.setItem(`event-pw-${slug!}`, passwordInput.trim());
      setUnlockedPassword(passwordInput.trim());
    } catch (err: any) {
      const code = err.response?.data?.error;
      if (code === "WRONG_PASSWORD") {
        setPasswordError("Mật khẩu không đúng. Vui lòng thử lại.");
      } else {
        setPasswordError("Có lỗi xảy ra. Vui lòng thử lại.");
      }
    } finally {
      setVerifying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  // Show password gate for private events
  if (errCode === "PRIVATE_EVENT" || errCode === "WRONG_PASSWORD") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border p-8 w-full max-w-sm text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-indigo-100 rounded-full p-4">
              <Lock className="h-8 w-8 text-indigo-600" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-1">Sự kiện riêng tư</h1>
          <p className="text-sm text-gray-500 mb-6">Sự kiện này yêu cầu mật khẩu để xem thông tin và đăng ký.</p>
          <form onSubmit={handlePasswordSubmit} className="space-y-3">
            <Input
              type="text"
              placeholder="Nhập mật khẩu..."
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              autoFocus
              className="text-center"
            />
            {passwordError && (
              <p className="text-xs text-red-500">{passwordError}</p>
            )}
            <Button type="submit" className="w-full" disabled={verifying || !passwordInput.trim()}>
              {verifying ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Đang kiểm tra...</> : "Xác nhận"}
            </Button>
          </form>
          <Button asChild variant="link" size="sm" className="mt-3 text-gray-400">
            <Link to="/">Quay lại trang chủ</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!event) {
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

  const pageTitle = `${event.name} — Bib1s - Nền tảng đăng ký BIB giải đấu miễn phí`;
  const pageDescription = event.description.slice(0, 160);
  const pageImage = event.imageUrl || "https://songngu.info/banner.jpg";
  const pageUrl = `https://songngu.info/events/${event.slug}`;

  // Convert plain text URLs into anchor elements while preserving whitespace
  const linkify = (text: string) => {
    if (!text) return null;
    const urlRegex = /https?:\/\/[\S]+/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let i = 0;
    while ((match = urlRegex.exec(text)) !== null) {
      const index = match.index;
      if (index > lastIndex) parts.push(text.slice(lastIndex, index));
      const url = match[0];
      parts.push(
        <a
          key={`link-${i}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-600 underline break-words"
        >
          bấm vào đây để đọc
        </a>
      );
      lastIndex = index + url.length;
      i += 1;
    }
    if (lastIndex < text.length) parts.push(text.slice(lastIndex));
    return parts;
  };

  const canRegister = event.status === "PUBLISHED" || event.status === "PRIVATE";
  const statusText = event.status === "PUBLISHED" || event.status === "PRIVATE"
    ? "Đang mở đăng ký"
    : event.status === "CLOSED"
    ? "Đã đóng đăng ký"
    : "Nháp";

  return (
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:image" content={pageImage} />
        <meta property="og:locale" content="vi_VN" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content={pageImage} />
      </Helmet>
      <div className="max-w-4xl mx-auto px-4 py-8 grid gap-8 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-4 shadow-sm border">
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
              <Link to="/" className="text-indigo-600 hover:underline">
                Trang chủ
              </Link>
              <ChevronRight className="h-4 w-4" />
              <Link to="/" className="text-indigo-600 hover:underline">
                Sự kiện
              </Link>
              <ChevronRight className="h-4 w-4" />
              <span className="font-medium text-gray-700 truncate">{event.name}</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border">
            <Badge variant="default" className="mb-3 bg-indigo-100 text-indigo-700 border-indigo-200">
              {statusText}
            </Badge>
            <h1 className="text-3xl font-bold text-gray-900 leading-tight">{event.name}</h1>
          </div>

          <div className="bg-white overflow-hidden rounded-3xl shadow-sm border">
            <img src={pageImage} alt={event.name} className="w-full h-72 md:h-96 object-cover" />
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border block md:hidden">
            <h2 className="font-semibold text-gray-900 text-lg mb-4">Đăng ký tham gia</h2>
            <div className="space-y-2 mb-6">
              {event.distances.map((d) => (
                <div key={d.id} className="flex justify-between text-sm">
                  <span className="text-gray-600">{d.name}</span>
                  <span className="font-medium text-gray-900">{formatCurrency(d.price)}</span>
                </div>
              ))}
            </div>
            {alreadyRegistered ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                <div className="flex items-center justify-center gap-1.5 text-green-700 font-medium text-sm mb-1">
                  <CheckCircle2 className="h-4 w-4" /> Bạn đã đăng ký sự kiện này
                </div>
                <Button asChild variant="link" size="sm" className="text-indigo-600 h-auto p-0 text-sm">
                  <Link to="/account/bibs">Xem thông tin đăng ký →</Link>
                </Button>
              </div>
            ) : canRegister ? (
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
            {!alreadyRegistered && (
              <p className="text-xs text-gray-400 text-center mt-3">
                Thanh toán qua QR code. Hoàn tất trong vài phút.
              </p>
            )}
          </div>

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

          <div className="bg-white rounded-2xl p-6 shadow-sm border">
            <h2 className="font-semibold text-gray-900 text-lg mb-3">Giới thiệu sự kiện</h2>
            <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{event.description}</p>
          </div>

          {event.shirtSizeImageUrl && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border">
              <h2 className="font-semibold text-gray-900 text-lg mb-3">Bảng size áo</h2>
              <div className="flex flex-wrap gap-4 items-start justify-center">
                {event.shirtSizeImageUrl.split(",").map((url, i) => (
                  <img key={i} src={url.trim()} alt="Bảng size áo" className="max-h-80 w-auto object-contain" />
                ))}
              </div>
            </div>
          )}

          {event.raceKitImageUrl && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border">
              <h2 className="font-semibold text-gray-900 text-lg mb-3">Race Kit</h2>
              <div className="flex flex-wrap gap-4 items-start justify-center">
                {event.raceKitImageUrl.split(",").map((url, i) => (
                  <img key={i} src={url.trim()} alt="Race Kit" className="max-h-80 w-auto object-contain" />
                ))}
              </div>
              {event.raceKitDescription && <p className="text-gray-600 leading-relaxed whitespace-pre-wrap text-sm mt-4">{event.raceKitDescription}</p>}
            </div>
          )}

          {event.rules && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border">
              <h2 className="font-semibold text-gray-900 text-lg mb-3">Quy định tham gia</h2>
              <div className="text-gray-600 leading-relaxed whitespace-pre-wrap break-words text-sm">
                {linkify(event.rules)}
              </div>
            </div>
          )}

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

        <div className="md:col-span-1">
          <div className="md:sticky md:top-24 space-y-4">
            <div className="hidden md:block bg-white rounded-2xl p-6 shadow-sm border">
              <h2 className="font-semibold text-gray-900 text-lg mb-3">Đăng ký tham gia</h2>
              <div className="space-y-2 mb-6">
                {event.distances.map((d) => (
                  <div key={d.id} className="flex justify-between text-sm">
                    <span className="text-gray-600">{d.name}</span>
                    <span className="font-medium text-gray-900">{formatCurrency(d.price)}</span>
                  </div>
                ))}
              </div>
              {alreadyRegistered ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-green-700 font-medium text-sm mb-1">
                    <CheckCircle2 className="h-4 w-4" /> Bạn đã đăng ký sự kiện này
                  </div>
                  <Button asChild variant="link" size="sm" className="text-indigo-600 h-auto p-0 text-sm">
                    <Link to="/account/bibs">Xem thông tin đăng ký →</Link>
                  </Button>
                </div>
              ) : canRegister ? (
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
              {!alreadyRegistered && (
                <p className="text-xs text-gray-400 text-center mt-3">
                  Thanh toán qua QR code. Hoàn tất trong vài phút.
                </p>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
