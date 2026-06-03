import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { userApi } from "@/lib/api";
import { useUser } from "@/contexts/UserContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

const schema = z.object({
  fullName: z.string().min(2, "Họ tên ít nhất 2 ký tự").optional().or(z.literal("")),
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu ít nhất 6 ký tự"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Mật khẩu không khớp",
  path: ["confirmPassword"],
});
type FormData = z.infer<typeof schema>;

export function UserRegisterPage() {
  const navigate = useNavigate();
  const { login } = useUser();
  const [error, setError] = useState("");

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setError("");
    try {
      const res = await userApi.post("/users/register", {
        email: data.email,
        password: data.password,
        fullName: data.fullName || undefined,
      });
      login(res.data.token, res.data.user);
      navigate("/", { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Đăng ký thất bại, vui lòng thử lại");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-10">
      <div className="bg-white rounded-2xl shadow-sm border p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Tạo tài khoản</h1>
        <p className="text-sm text-gray-500 mb-6">Đăng ký để tham gia các sự kiện chạy bộ</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Họ và tên</Label>
            <Input placeholder="Nguyễn Văn A" {...register("fullName")} />
            {errors.fullName && <p className="text-xs text-red-500">{errors.fullName.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Email <span className="text-red-500">*</span></Label>
            <Input type="email" placeholder="email@example.com" {...register("email")} />
            {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Mật khẩu <span className="text-red-500">*</span></Label>
            <Input type="password" placeholder="Tối thiểu 6 ký tự" {...register("password")} />
            {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Xác nhận mật khẩu <span className="text-red-500">*</span></Label>
            <Input type="password" placeholder="Nhập lại mật khẩu" {...register("confirmPassword")} />
            {errors.confirmPassword && <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>}
          </div>

          {error && <p className="text-sm text-red-500 text-center">{error}</p>}

          <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Đang tạo tài khoản...</> : "Tạo tài khoản"}
          </Button>
        </form>

        <p className="text-sm text-center text-gray-500 mt-5">
          Đã có tài khoản?{" "}
          <Link to="/login" className="text-indigo-600 font-medium hover:underline">Đăng nhập</Link>
        </p>
      </div>
    </div>
  );
}
