import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Calendar, Users, CheckCircle, Clock } from "lucide-react";

const TIME_RANGES = [
  { label: "Hôm nay", value: "1d" },
  { label: "3 ngày", value: "3d" },
  { label: "1 tuần", value: "7d" },
  { label: "1 tháng", value: "30d" },
  { label: "Tất cả", value: "all" },
];

function getFromDate(range: string): string | undefined {
  if (range === "all") return undefined;
  const days = { "1d": 1, "3d": 3, "7d": 7, "30d": 30 }[range];
  const d = new Date();
  d.setDate(d.getDate() - days!);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function AdminDashboardPage() {
  const [timeRange, setTimeRange] = useState("all");

  const { data: eventsData } = useQuery({
    queryKey: ["admin-events"],
    queryFn: () => api.get("/events/admin/all").then((r) => r.data),
  });

  const fromDate = useMemo(() => getFromDate(timeRange), [timeRange]);

  const { data: regData } = useQuery({
    queryKey: ["admin-registrations-dashboard", timeRange],
    queryFn: () => {
      const params = new URLSearchParams({ limit: "5" });
      if (fromDate) params.set("from", fromDate);
      return api.get(`/registrations/admin/all?${params}`).then((r) => r.data);
    },
  });

  const events = eventsData ?? [];
  const totalEvents = events.length;
  const publishedEvents = events.filter((e: any) => e.status === "PUBLISHED").length;
  const totalRegistrations = regData?.total ?? 0;
  const paidRegistrations = regData?.paidCount ?? 0;
  const pendingRegistrations = regData?.pendingCount ?? 0;

  const rangeLabel = TIME_RANGES.find((r) => r.value === timeRange)?.label ?? "";
  const sub = timeRange === "all" ? "tất cả thời gian" : rangeLabel.toLowerCase();

  const stats = [
    { icon: Calendar, label: "Tổng sự kiện", value: totalEvents, sub: `${publishedEvents} đang mở`, color: "text-indigo-600 bg-indigo-50" },
    { icon: Users, label: "Tổng đăng ký", value: totalRegistrations, sub, color: "text-violet-600 bg-violet-50" },
    { icon: CheckCircle, label: "Đã thanh toán", value: paidRegistrations, sub, color: "text-green-600 bg-green-50" },
    { icon: Clock, label: "Chờ thanh toán", value: pendingRegistrations, sub, color: "text-amber-600 bg-amber-50" },
  ];

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Tổng quan hệ thống BIB Register</p>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {TIME_RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setTimeRange(r.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                timeRange === r.value
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ icon: Icon, label, value, sub, color }) => (
          <div key={label} className="bg-white rounded-2xl border p-5">
            <div className={`inline-flex p-2.5 rounded-xl mb-3 ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{value}</div>
            <div className="text-sm font-medium text-gray-700 mt-0.5">{label}</div>
            <div className="text-xs text-gray-400 mt-0.5">{sub}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border">
        <div className="p-5 border-b">
          <h2 className="font-semibold text-gray-900">Đăng ký gần đây</h2>
        </div>
        <div className="divide-y">
          {(regData?.registrations ?? []).slice(0, 5).map((reg: any) => (
            <div key={reg.id} className="p-4 flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900 text-sm">{reg.fullName}</div>
                <div className="text-xs text-gray-400">{reg.event?.name} — {reg.distance?.name}</div>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                reg.status === "PAID" ? "bg-green-100 text-green-700" :
                reg.status === "CANCELLED" ? "bg-red-100 text-red-600" :
                "bg-amber-100 text-amber-700"
              }`}>
                {reg.status === "PAID" ? "Đã TT" : reg.status === "CANCELLED" ? "Đã hủy" : "Chờ TT"}
              </span>
            </div>
          ))}
          {!regData?.registrations?.length && (
            <div className="p-8 text-center text-gray-400 text-sm">Chưa có đăng ký nào</div>
          )}
        </div>
      </div>
    </div>
  );
}
