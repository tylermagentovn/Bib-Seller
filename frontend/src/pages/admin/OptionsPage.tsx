import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { SHIRT_SIZES } from "@/lib/memberFields";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Shirt, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

const SIZE_GROUPS: { title: string; sizes: string[] }[] = [
  { title: "Nam", sizes: SHIRT_SIZES.filter((s) => s.startsWith("Nam - ")) },
  { title: "Nữ", sizes: SHIRT_SIZES.filter((s) => s.startsWith("Nữ - ")) },
  { title: "Unisex (không phân biệt nam/nữ)", sizes: SHIRT_SIZES.filter((s) => !s.includes(" - ")) },
  { title: "Trẻ em (theo chữ)", sizes: SHIRT_SIZES.filter((s) => s.startsWith("Kids - ") && isNaN(Number(s.slice(7)))) },
  { title: "Trẻ em (theo số)", sizes: SHIRT_SIZES.filter((s) => s.startsWith("Kids - ") && !isNaN(Number(s.slice(7)))) },
];

export function AdminOptionsPage() {
  const queryClient = useQueryClient();
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-options"],
    queryFn: () => api.get<{ hiddenShirtSizes: string[] }>("/auth/me/options").then((r) => r.data),
  });

  useEffect(() => {
    if (data) setHidden(new Set(data.hiddenShirtSizes));
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () => api.put("/auth/me/options", { hiddenShirtSizes: [...hidden] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-options"] });
      setSaved(true);
    },
  });

  const toggle = (size: string, visible: boolean) => {
    setSaved(false);
    setHidden((prev) => {
      const next = new Set(prev);
      if (visible) next.delete(size);
      else next.add(size);
      return next;
    });
  };

  const setGroup = (sizes: string[], visible: boolean) => {
    setSaved(false);
    setHidden((prev) => {
      const next = new Set(prev);
      sizes.forEach((s) => (visible ? next.delete(s) : next.add(s)));
      return next;
    });
  };

  const visibleCount = SHIRT_SIZES.length - SHIRT_SIZES.filter((s) => hidden.has(s)).length;
  const noneVisible = visibleCount === 0;

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Quản lý Option</h1>
        <p className="text-sm text-gray-500 mt-1">
          Chọn các size áo được hiển thị khi người tham gia đăng ký. Áp dụng cho tất cả sự kiện của bạn.
        </p>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
          <Shirt className="h-4 w-4 text-indigo-600" />
          Size áo
          <span className="ml-auto text-xs font-normal text-gray-500">
            Đang hiển thị {visibleCount}/{SHIRT_SIZES.length}
          </span>
        </div>

        {SIZE_GROUPS.map((group) => (
          <div key={group.title} className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">{group.title}</p>
              <div className="flex gap-3 text-xs">
                <button type="button" className="text-indigo-600 hover:underline" onClick={() => setGroup(group.sizes, true)}>
                  Hiện tất cả
                </button>
                <button type="button" className="text-gray-500 hover:underline" onClick={() => setGroup(group.sizes, false)}>
                  Ẩn tất cả
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {group.sizes.map((size) => {
                const visible = !hidden.has(size);
                return (
                  <label
                    key={size}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors ${
                      visible ? "bg-white text-gray-800" : "bg-gray-50 text-gray-400"
                    }`}
                  >
                    <Checkbox checked={visible} onCheckedChange={(c) => toggle(size, c === true)} />
                    {size}
                  </label>
                );
              })}
            </div>
          </div>
        ))}

        {noneVisible && (
          <p className="flex items-center gap-1.5 text-xs text-red-500">
            <AlertCircle className="h-3.5 w-3.5" />
            Cần hiển thị ít nhất 1 size áo.
          </p>
        )}

        <div className="flex items-center gap-3 pt-2 border-t">
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || noneVisible}>
            {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Lưu thay đổi
          </Button>
          {saved && (
            <span className="flex items-center gap-1 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" /> Đã lưu
            </span>
          )}
          {saveMutation.isError && <span className="text-sm text-red-500">Lưu thất bại, vui lòng thử lại.</span>}
        </div>
      </div>
    </div>
  );
}
