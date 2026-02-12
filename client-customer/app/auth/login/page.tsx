"use client"

import { useState, FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// Redux imports
import { useDispatch, useSelector } from 'react-redux';
import { loginStart, loginSuccess, loginFailure } from '@/lib/store/slices/userSlice';
import { AppDispatch, RootState } from '@/lib/store/store'; 

import authService, { LoginPayload, AuthResponse } from "@/lib/services/api/authService"
import { BACKEND_API_URL } from "@/lib/configs/server.config"

export default function LoginPage() {
  const router = useRouter()
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading: reduxIsLoading, error: reduxError } = useSelector((state: RootState) => state.user);

  const [showPassword, setShowPassword] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [signInPhoneNumber, setSignInPhoneNumber] = useState("")
  const [signInPassword, setSignInPassword] = useState("")

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    dispatch(loginStart());
    setSuccessMessage(null);
    dispatch(loginFailure('')); // Clear previous errors

    const payload: LoginPayload = {
      phoneNumber: signInPhoneNumber,
      password: signInPassword,
    }

    try {
      const response: AuthResponse = await authService.login(payload) 
      console.log("Login successful:", response)
      
      const { user, token, shop } = response.metadata;

      dispatch(loginSuccess({ user, token, shop }));

      if (typeof window !== 'undefined') {
        localStorage.setItem('accessToken', token.accessToken);
        localStorage.setItem('refreshToken', token.refreshToken);
        localStorage.setItem('user', JSON.stringify(user));
        if (shop) {
            localStorage.setItem('shop', JSON.stringify(shop));
        } else {
            localStorage.removeItem('shop');
        }
      }

      setSuccessMessage("Đăng nhập thành công! Đang chuyển hướng...")
      setSignInPhoneNumber("");
      setSignInPassword("");
      setTimeout(() => {
        router.push("/")
      }, 1500);

    } catch (err: any) {
      console.error("Login error:", err)
      const errorMessage = err.response?.data?.message || err.message || "Đã xảy ra lỗi không mong muốn trong quá trình đăng nhập."
      dispatch(loginFailure(errorMessage));
    }
  }

  const handleGoogleLogin = () => {
    window.location.href = `${BACKEND_API_URL}/v1/api/auth/google`;
  }

  return (
    <>
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">Chào mừng trở lại</h1>
        <p className="text-muted-foreground">Nhập thông tin đăng nhập của bạn để đăng nhập vào tài khoản</p>
      </div>

      {reduxError && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Lỗi</AlertTitle>
          <AlertDescription>{reduxError}</AlertDescription>
        </Alert>
      )}
      {successMessage && (
        <Alert variant="default" className="mt-4 bg-green-50 border-green-200 text-green-700">
          <AlertCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Thành công</AlertTitle>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleLogin} className="space-y-6 pt-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone-signin">Số điện thoại</Label>
            <Input
              id="phone-signin"
              name="phoneNumber"
              type="tel"
              placeholder="Số điện thoại của bạn"
              required
              value={signInPhoneNumber}
              onChange={(e) => setSignInPhoneNumber(e.target.value)}
              disabled={reduxIsLoading}
            />
          </div>

          <div className="space-y-2">
            <div className="relative">
              <Input
                id="password-signin"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                required
                value={signInPassword}
                onChange={(e) => setSignInPassword(e.target.value)}
                disabled={reduxIsLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={togglePasswordVisibility}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-500" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-500" />
                )}
                <span className="sr-only">{showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}</span>
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="password-signin">Mật khẩu</Label>
            <Link href="/auth/forgot-password" className="text-xs text-blue-600 hover:underline">
              Quên mật khẩu?
            </Link>
          </div>

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 flex items-center justify-center"
            disabled={reduxIsLoading}
          >
            {reduxIsLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Đăng Nhập
          </Button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-muted-foreground">Hoặc tiếp tục với</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2">
          <Button variant="outline" className="w-full" type="button" onClick={handleGoogleLogin}>
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Tiếp tục với Google
          </Button>
        </div>
      </form>
    </>
  )
} 

// Add import at top
// import { BACKEND_API_URL } from "@/lib/configs/server.config" - Wait, can't add import with this tool if I target bottom.
// I'll do two edits or use multi_replace. 