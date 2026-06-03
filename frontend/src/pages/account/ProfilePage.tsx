import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { userApi, type User } from "@/lib/api";
import { useUser } from "@/contexts/UserContext";
import { GENDERS, SHIRT_SIZES, BLOOD_TYPES } from "@/lib/memberFields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle } from "lucide-react";

const schema = z.object({
  fullName: z.string().optional(),
  phone: z.string().optional(),
  gender: z.string().optional(),
  dob: z.string().optional(),
  idNumber: z.string().optional(),
  shirtSize: z.string().optional(),
  bloodType: z.string().optional(),
  medicalConditions: z.string().optional(),
  emergencyName: z.string().optional(),
  emergencyPhone: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const pwSchema = z.object({
  currentPassword: z.string().min(1, "Nhập mật khẩu hiện tại"),
  newPassword: z.string().min(6, "Mật khẩu mới ít nhất 6 ký tự"),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: "Mật khẩu xác nhận không khớp",
  path: ["confirmPassword"],
});
type PwForm = z.infer<typeof pwSchema>;

function ChangePasswordForm() {
  const { register, handleSubmit, formState: { errors }, reset } = useForm<PwForm>({
    resolver: zodResolver(pwSchema),
  });

  const mutation = useMutation({
    mutationFn: (data: PwForm) =>
      userApi.put("/users/me/password", {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      }).then((r) => r.data),
    onSuccess: () => reset(),
  });

  return (
    <div className="bg-white rounded-xl border p-5 space-y-4">
      <p className="text-sm font-semibold text-gray-700">Đổi mật khẩu</p>
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-3">
        <div className="space-y-1.5">
          <Label>Mật khẩu hiện tại</Label>
          <Input type="password" autoComplete="current-password" {...register("currentPassword")} />
          {errors.currentPassword && <p className="text-xs text-red-500">{errors.currentPassword.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Mật khẩu mới</Label>
          <Input type="password" autoComplete="new-password" {...register("newPassword")} />
          {errors.newPassword && <p className="text-xs text-red-500">{errors.newPassword.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Xác nhận mật khẩu mới</Label>
          <Input type="password" autoComplete="new-password" {...register("confirmPassword")} />
          {errors.confirmPassword && <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>}
        </div>
        {mutation.isError && (
          <p className="text-sm text-red-500">{(mutation.error as any)?.response?.data?.error ?? "Lỗi đổi mật khẩu"}</p>
        )}
        <Button type="submit" variant="outline" className="w-full" disabled={mutation.isPending}>
          {mutation.isPending ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" />Đang lưu...</>
          ) : mutation.isSuccess ? (
            <><CheckCircle className="h-4 w-4 mr-2 text-green-600" />Đã đổi mật khẩu</>
          ) : (
            "Đổi mật khẩu"
          )}
        </Button>
      </form>
    </div>
  );
}

function userToDefaults(user: User): FormData {
  return {
    fullName: user.fullName ?? "",
    phone: user.phone ?? "",
    gender: user.gender ?? "_none_",
    dob: user.dob ? user.dob.slice(0, 10) : "",
    idNumber: user.idNumber ?? "",
    shirtSize: user.shirtSize ?? "_none_",
    bloodType: user.bloodType ?? "_none_",
    medicalConditions: user.medicalConditions ?? "",
    emergencyName: user.emergencyName ?? "",
    emergencyPhone: user.emergencyPhone ?? "",
  };
}

function ProfileForm({ user, updateUser }: { user: User; updateUser: (u: User) => void }) {
  const { register, handleSubmit, setValue, watch, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: userToDefaults(user),
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      userApi.put("/users/me", {
        ...data,
        gender: data.gender === "_none_" ? null : data.gender || null,
        shirtSize: data.shirtSize === "_none_" ? null : data.shirtSize || null,
        bloodType: data.bloodType === "_none_" ? null : data.bloodType || null,
        dob: data.dob || null,
        phone: data.phone || null,
        idNumber: data.idNumber || null,
        medicalConditions: data.medicalConditions || null,
        emergencyName: data.emergencyName || null,
        emergencyPhone: data.emergencyPhone || null,
      }).then((r) => r.data),
    onSuccess: (updatedUser: User) => {
      updateUser(updatedUser);
      reset(userToDefaults(updatedUser));
    },
  });

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-5">
      {/* Personal info */}
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <p className="text-sm font-semibold text-gray-700">Thông tin cá nhân</p>
        <div className="space-y-1.5">
          <Label>Họ và tên</Label>
          <Input placeholder="Nguyễn Văn A" {...register("fullName")} />
        </div>
        <div className="space-y-1.5">
          <Label>Số điện thoại</Label>
          <Input type="tel" placeholder="0901234567" {...register("phone")} />
        </div>
        <div className="space-y-1.5">
          <Label>Giới tính</Label>
          <Select value={watch("gender") ?? "_none_"} onValueChange={(v) => setValue("gender", v)}>
            <SelectTrigger><SelectValue placeholder="Chọn giới tính" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_none_">Chưa chọn</SelectItem>
              {GENDERS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Ngày sinh</Label>
          <Input type="date" {...register("dob")} />
        </div>
        <div className="space-y-1.5">
          <Label>Số CCCD</Label>
          <Input placeholder="012345678901" {...register("idNumber")} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Size áo</Label>
            <Select value={watch("shirtSize") ?? "_none_"} onValueChange={(v) => setValue("shirtSize", v)}>
              <SelectTrigger><SelectValue placeholder="Chọn size" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none_">Chưa chọn</SelectItem>
                {SHIRT_SIZES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Nhóm máu</Label>
            <Select value={watch("bloodType") ?? "_none_"} onValueChange={(v) => setValue("bloodType", v)}>
              <SelectTrigger><SelectValue placeholder="Chọn nhóm máu" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none_">Chưa chọn</SelectItem>
                {BLOOD_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Bệnh lý</Label>
          <textarea
            className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 min-h-[70px] resize-none"
            placeholder="Bệnh lý hoặc tình trạng sức khỏe cần lưu ý (nếu có)"
            {...register("medicalConditions")}
          />
        </div>
      </div>

      {/* Emergency contact */}
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <p className="text-sm font-semibold text-gray-700">Người liên hệ khẩn cấp</p>
        <div className="space-y-1.5">
          <Label>Họ tên</Label>
          <Input placeholder="Nguyễn Thị B" {...register("emergencyName")} />
        </div>
        <div className="space-y-1.5">
          <Label>Số điện thoại</Label>
          <Input type="tel" placeholder="0901234567" {...register("emergencyPhone")} />
        </div>
      </div>

      {mutation.isError && (
        <p className="text-sm text-red-500">{(mutation.error as any)?.response?.data?.error ?? "Lỗi lưu thông tin"}</p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={mutation.isPending}>
        {mutation.isPending ? (
          <><Loader2 className="h-4 w-4 animate-spin mr-2" />Đang lưu...</>
        ) : mutation.isSuccess ? (
          <><CheckCircle className="h-4 w-4 mr-2" />Đã lưu</>
        ) : (
          "Lưu thông tin"
        )}
      </Button>
    </form>
  );
}

export function ProfilePage() {
  const { user, updateUser } = useUser();

  if (!user) return null;

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Quản lý thông tin</h1>
      <p className="text-sm text-gray-500 mb-6">Thông tin sẽ tự động điền vào form đăng ký sự kiện</p>

      {/* Account info */}
      <div className="bg-gray-50 rounded-xl p-4 border mb-5">
        <p className="text-xs font-medium text-gray-500 mb-1">Tài khoản</p>
        <p className="text-sm font-medium text-gray-700">{user.email}</p>
      </div>

      <ProfileForm key={user.id} user={user} updateUser={updateUser} />

      <div className="mt-5">
        <ChangePasswordForm />
      </div>
    </div>
  );
}
