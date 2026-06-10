import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useGoogleLogin } from "@react-oauth/google";
import { userApi } from "@/lib/api";
import { useUser } from "@/contexts/UserContext";
import { useFacebookLogin } from "@/hooks/useFacebookLogin";
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
  const [fbLoading, setFbLoading] = useState(false);
  const loginWithFacebook = useFacebookLogin();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const loginWithGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setError("");
      try {
        const res = await userApi.post("/users/auth/google", { accessToken: tokenResponse.access_token });
        login(res.data.token, res.data.user);
        navigate("/", { replace: true });
      } catch (err: any) {
        setError(err.response?.data?.error ?? "Đăng nhập Google thất bại, vui lòng thử lại");
      }
    },
    onError: () => setError("Đăng nhập Google thất bại, vui lòng thử lại"),
  });

  const handleFacebookLogin = async () => {
    setError("");
    setFbLoading(true);
    try {
      const accessToken = await loginWithFacebook();
      const res = await userApi.post("/users/auth/facebook", { accessToken });
      login(res.data.token, res.data.user);
      navigate("/", { replace: true });
    } catch (err: any) {
      if ((err as Error).message !== "cancelled") {
        setError(err.response?.data?.error ?? "Đăng ký Facebook thất bại, vui lòng thử lại");
      }
    } finally {
      setFbLoading(false);
    }
  };

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

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-gray-400">hoặc</span>
          </div>
        </div>

        <div className="space-y-2">
          <Button type="button" variant="outline" size="lg" className="w-full" onClick={() => loginWithGoogle()}>
            <svg className="h-4 w-4 mr-2 flex-shrink-0" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Đăng ký với Google
          </Button>

          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full border-[#1877F2] text-[#1877F2] hover:bg-[#1877F2]/5"
            onClick={handleFacebookLogin}
            disabled={fbLoading}
          >
            {fbLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <svg className="h-4 w-4 mr-2 flex-shrink-0" viewBox="0 0 24 24" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            )}
            Đăng ký với Facebook
          </Button>
        </div>

        <p className="text-sm text-center text-gray-500 mt-5">
          Đã có tài khoản?{" "}
          <Link to="/login" className="text-indigo-600 font-medium hover:underline">Đăng nhập</Link>
        </p>
      </div>
    </div>
  );
}
