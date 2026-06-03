import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { userApi, type Registration, type TeamMember } from "@/lib/api";
import { GENDERS, SHIRT_SIZES, BLOOD_TYPES } from "@/lib/memberFields";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ChevronDown, ChevronUp, Pencil, X, CheckCircle, Clock, XCircle } from "lucide-react";

const STATUS_MAP = {
  PAID: { label: "Đã thanh toán", icon: CheckCircle, color: "bg-green-100 text-green-700" },
  PENDING: { label: "Chờ thanh toán", icon: Clock, color: "bg-yellow-100 text-yellow-700" },
  CANCELLED: { label: "Đã hủy", icon: XCircle, color: "bg-red-100 text-red-600" },
} as const;

type EditForm = {
  fullName: string; phone: string; email: string;
  gender: string; dob: string; idNumber: string;
  shirtSize: string; bloodType: string; medicalConditions: string;
  emergencyName: string; emergencyPhone: string;
};

type MemberState = {
  id: string; fullName: string; phone: string; email: string;
  gender: string; dob: string; idNumber: string;
  shirtSize: string; bloodType: string; medicalConditions: string;
  emergencyName: string; emergencyPhone: string;
};

function toMemberState(m: TeamMember): MemberState {
  return {
    id: m.id,
    fullName: m.fullName,
    phone: m.phone,
    email: m.email ?? "",
    gender: m.gender ?? "_none_",
    dob: m.dob ? m.dob.slice(0, 10) : "",
    idNumber: m.idNumber ?? "",
    shirtSize: m.shirtSize ?? "_none_",
    bloodType: m.bloodType ?? "_none_",
    medicalConditions: m.medicalConditions ?? "",
    emergencyName: m.emergencyName ?? "",
    emergencyPhone: m.emergencyPhone ?? "",
  };
}

function FieldSection({ title }: { title: string }) {
  return <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-2">{title}</p>;
}

function SelectField({ label, value, options, onChange }: {
  label: string; value: string; options: readonly string[]; onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="_none_">Chưa chọn</SelectItem>
          {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function MemberFields({ m, onChange }: {
  m: MemberState;
  onChange: (key: keyof MemberState, val: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Họ và tên</Label>
          <Input value={m.fullName} onChange={(e) => onChange("fullName", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Số điện thoại</Label>
          <Input type="tel" value={m.phone} onChange={(e) => onChange("phone", e.target.value)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Email</Label>
        <Input type="email" value={m.email} onChange={(e) => onChange("email", e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <SelectField label="Giới tính" value={m.gender} options={GENDERS} onChange={(v) => onChange("gender", v)} />
        <div className="space-y-1.5">
          <Label>Ngày sinh</Label>
          <Input type="date" value={m.dob} onChange={(e) => onChange("dob", e.target.value)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Số CCCD</Label>
        <Input value={m.idNumber} onChange={(e) => onChange("idNumber", e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <SelectField label="Size áo" value={m.shirtSize} options={SHIRT_SIZES} onChange={(v) => onChange("shirtSize", v)} />
        <SelectField label="Nhóm máu" value={m.bloodType} options={BLOOD_TYPES} onChange={(v) => onChange("bloodType", v)} />
      </div>
      <div className="space-y-1.5">
        <Label>Bệnh lý</Label>
        <textarea
          className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 min-h-[60px] resize-none"
          placeholder="Bệnh lý (nếu có)"
          value={m.medicalConditions}
          onChange={(e) => onChange("medicalConditions", e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Liên hệ KT - Họ tên</Label>
          <Input value={m.emergencyName} onChange={(e) => onChange("emergencyName", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Liên hệ KT - SĐT</Label>
          <Input type="tel" value={m.emergencyPhone} onChange={(e) => onChange("emergencyPhone", e.target.value)} />
        </div>
      </div>
    </div>
  );
}

function EditModal({ reg, onClose }: { reg: Registration; onClose: () => void }) {
  const qc = useQueryClient();
  const [members, setMembers] = useState<MemberState[]>(reg.teamMembers.map(toMemberState));

  const { register, handleSubmit, setValue, watch } = useForm<EditForm>({
    defaultValues: {
      fullName: reg.fullName ?? "",
      phone: reg.phone ?? "",
      email: reg.email ?? "",
      gender: reg.gender ?? "_none_",
      dob: reg.dob ? reg.dob.slice(0, 10) : "",
      idNumber: reg.idNumber ?? "",
      shirtSize: reg.shirtSize ?? "_none_",
      bloodType: reg.bloodType ?? "_none_",
      medicalConditions: reg.medicalConditions ?? "",
      emergencyName: reg.emergencyName ?? "",
      emergencyPhone: reg.emergencyPhone ?? "",
    },
  });

  const mutation = useMutation({
    mutationFn: (data: EditForm) =>
      userApi.put(`/users/me/registrations/${reg.id}`, {
        fullName: data.fullName || null,
        phone: data.phone || null,
        email: data.email || null,
        gender: data.gender === "_none_" ? null : data.gender || null,
        dob: data.dob || null,
        idNumber: data.idNumber || null,
        shirtSize: data.shirtSize === "_none_" ? null : data.shirtSize || null,
        bloodType: data.bloodType === "_none_" ? null : data.bloodType || null,
        medicalConditions: data.medicalConditions || null,
        emergencyName: data.emergencyName || null,
        emergencyPhone: data.emergencyPhone || null,
        members: members.map((m) => ({
          id: m.id,
          fullName: m.fullName || null,
          phone: m.phone || null,
          email: m.email || null,
          gender: m.gender === "_none_" ? null : m.gender || null,
          dob: m.dob || null,
          idNumber: m.idNumber || null,
          shirtSize: m.shirtSize === "_none_" ? null : m.shirtSize || null,
          bloodType: m.bloodType === "_none_" ? null : m.bloodType || null,
          medicalConditions: m.medicalConditions || null,
          emergencyName: m.emergencyName || null,
          emergencyPhone: m.emergencyPhone || null,
        })),
      }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-registrations"] });
      onClose();
    },
  });

  const updateMember = (i: number, key: keyof MemberState, val: string) =>
    setMembers((prev) => prev.map((m, idx) => idx === i ? { ...m, [key]: val } : m));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between p-5 border-b shrink-0">
          <h2 className="font-bold text-gray-900">Sửa thông tin đăng ký</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="flex flex-col flex-1 overflow-hidden">
          <div className="overflow-y-auto flex-1 p-5 space-y-3">
            {/* Basic info */}
            <FieldSection title="Thông tin cơ bản" />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Họ và tên</Label>
                <Input {...register("fullName")} />
              </div>
              <div className="space-y-1.5">
                <Label>Số điện thoại</Label>
                <Input type="tel" {...register("phone")} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" {...register("email")} />
            </div>

            {/* Personal info */}
            <FieldSection title="Thông tin cá nhân" />
            <div className="grid grid-cols-2 gap-3">
              <SelectField
                label="Giới tính"
                value={watch("gender") ?? "_none_"}
                options={GENDERS}
                onChange={(v) => setValue("gender", v)}
              />
              <div className="space-y-1.5">
                <Label>Ngày sinh</Label>
                <Input type="date" {...register("dob")} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Số CCCD</Label>
              <Input {...register("idNumber")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <SelectField
                label="Size áo"
                value={watch("shirtSize") ?? "_none_"}
                options={SHIRT_SIZES}
                onChange={(v) => setValue("shirtSize", v)}
              />
              <SelectField
                label="Nhóm máu"
                value={watch("bloodType") ?? "_none_"}
                options={BLOOD_TYPES}
                onChange={(v) => setValue("bloodType", v)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Bệnh lý</Label>
              <textarea
                className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 min-h-[60px] resize-none"
                placeholder="Bệnh lý (nếu có)"
                {...register("medicalConditions")}
              />
            </div>

            {/* Emergency */}
            <FieldSection title="Người liên hệ khẩn cấp" />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Họ tên</Label>
                <Input {...register("emergencyName")} />
              </div>
              <div className="space-y-1.5">
                <Label>Số điện thoại</Label>
                <Input type="tel" {...register("emergencyPhone")} />
              </div>
            </div>

            {/* Team members */}
            {members.map((m, i) => (
              <div key={m.id} className="border-t pt-4 space-y-3">
                <FieldSection title={`Thành viên ${i + 1}`} />
                <MemberFields
                  m={m}
                  onChange={(key, val) => updateMember(i, key, val)}
                />
              </div>
            ))}
          </div>

          {mutation.isError && (
            <p className="px-5 text-xs text-red-500">{(mutation.error as any)?.response?.data?.error ?? "Lỗi, vui lòng thử lại"}</p>
          )}

          <div className="shrink-0 border-t p-5 flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Hủy</Button>
            <Button type="submit" className="flex-1" disabled={mutation.isPending}>
              {mutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Đang lưu...</> : "Lưu thông tin"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function InfoGrid({ items }: { items: { label: string; value: string | null | undefined }[] }) {
  const visible = items.filter((i) => i.value);
  if (visible.length === 0) return null;
  return (
    <div className="grid grid-cols-2 gap-2">
      {visible.map((item) => (
        <div key={item.label}>
          <p className="text-xs text-gray-400">{item.label}</p>
          <p className="text-sm font-medium text-gray-800">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

function MemberView({ m, index }: { m: TeamMember; index: number }) {
  return (
    <div className="border rounded-lg p-3 space-y-2 bg-white">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Thành viên {index + 1}</p>
      <InfoGrid items={[
        { label: "Họ tên", value: m.fullName },
        { label: "Điện thoại", value: m.phone },
        { label: "Email", value: m.email },
        { label: "Giới tính", value: m.gender },
        { label: "Ngày sinh", value: m.dob ? formatDate(m.dob) : null },
        { label: "Số CCCD", value: m.idNumber },
        { label: "Size áo", value: m.shirtSize },
        { label: "Nhóm máu", value: m.bloodType },
        { label: "Bệnh lý", value: m.medicalConditions },
        { label: "Liên hệ KT", value: m.emergencyName },
        { label: "SĐT KT", value: m.emergencyPhone },
      ]} />
    </div>
  );
}

function BibCard({ reg }: { reg: Registration }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const status = STATUS_MAP[reg.status];
  const StatusIcon = status.icon;

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      <button
        className="w-full text-left p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{reg.event.name}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-sm text-gray-500">{reg.distance.name}</span>
            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>
              <StatusIcon className="h-3 w-3" />
              {status.label}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 ml-3 shrink-0">
          {reg.bibNumber && (
            <div className="text-right">
              <p className="text-xs text-gray-400">BIB</p>
              <p className="text-lg font-black text-indigo-600">{reg.bibNumber}</p>
            </div>
          )}
          {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </div>
      </button>

      {open && (
        <div className="border-t bg-gray-50 p-4 space-y-3 text-sm">
          {/* Registration info */}
          <InfoGrid items={[
            { label: "Họ tên", value: reg.fullName },
            { label: "Điện thoại", value: reg.phone },
            { label: "Email", value: reg.email },
            { label: "Giới tính", value: reg.gender },
            { label: "Ngày sinh", value: reg.dob ? formatDate(reg.dob) : null },
            { label: "Số CCCD", value: reg.idNumber },
            { label: "Size áo", value: reg.shirtSize },
            { label: "Nhóm máu", value: reg.bloodType },
            { label: "Bệnh lý", value: reg.medicalConditions },
            { label: "Liên hệ KT", value: reg.emergencyName },
            { label: "SĐT KT", value: reg.emergencyPhone },
            { label: "Ngày đăng ký", value: formatDate(reg.createdAt) },
          ]} />

          {/* Team members */}
          {reg.teamMembers.length > 0 && (
            <div className="space-y-2 pt-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Thành viên</p>
              {reg.teamMembers.map((m, i) => <MemberView key={m.id} m={m} index={i} />)}
            </div>
          )}

          {/* Payment & actions */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div>
              <span className="text-gray-500">Đã thanh toán: </span>
              <span className="font-bold text-indigo-600">{formatCurrency(reg.payment?.amount ?? 0)}</span>
            </div>
            {reg.status === "PENDING" && (
              <Button asChild size="sm" variant="outline">
                <Link to={`/payment/${reg.id}`}>Thanh toán</Link>
              </Button>
            )}
          </div>

          {reg.status !== "CANCELLED" && (
            <Button size="sm" variant="outline" className="w-full" onClick={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5 mr-1.5" /> Sửa thông tin
            </Button>
          )}
        </div>
      )}

      {editing && <EditModal reg={reg} onClose={() => setEditing(false)} />}
    </div>
  );
}

export function BibsPage() {
  const { data: registrations = [], isLoading } = useQuery<Registration[]>({
    queryKey: ["my-registrations"],
    queryFn: () => userApi.get("/users/me/registrations").then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Quản lý BIB</h1>
      <p className="text-sm text-gray-500 mb-6">Danh sách các sự kiện bạn đã đăng ký</p>

      {registrations.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium mb-2">Chưa có đăng ký nào</p>
          <Button asChild variant="outline">
            <Link to="/">Xem sự kiện</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {registrations.map((reg) => <BibCard key={reg.id} reg={reg} />)}
        </div>
      )}
    </div>
  );
}
