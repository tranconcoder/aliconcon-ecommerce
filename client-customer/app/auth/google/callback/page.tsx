"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useDispatch } from "react-redux"
import { loginSuccess, loginFailure } from "@/lib/store/slices/userSlice"
import userService from "@/lib/services/api/userService"
import { Loader2 } from "lucide-react"

export default function GoogleCallbackPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const dispatch = useDispatch()

    useEffect(() => {
        const accessToken = searchParams.get("accessToken")
        const refreshToken = searchParams.get("refreshToken")
        // const userId = searchParams.get("userId") // We use access token to fetch profile

        if (accessToken && refreshToken) {
            // Save tokens immediately so axios service can use them
            if (typeof window !== 'undefined') {
                localStorage.setItem("accessToken", accessToken)
                localStorage.setItem("refreshToken", refreshToken)
            }

            // Fetch user profile
            userService.getProfile()
                .then((response) => {
                     // response.metadata is the user object for getProfile
                     const user = response.metadata as any; 
                     
                     // Dispatch login success
                     // userSlice typically expects { user, token, shop }
                     dispatch(loginSuccess({ 
                         user, 
                         token: { accessToken, refreshToken }, 
                         shop: undefined 
                     }))
                     
                     if (typeof window !== 'undefined') {
                         localStorage.setItem('user', JSON.stringify(user));
                         // Remove shop if any, as google login usually is for user
                         localStorage.removeItem('shop');
                     }
                     
                     router.push("/")
                })
                .catch((error) => {
                    console.error("Failed to fetch profile", error)
                    dispatch(loginFailure(error.message || "Failed to fetch profile"))
                    router.push("/auth/login?error=google_login_failed")
                })
        } else {
            router.push("/auth/login?error=missing_tokens")
        }
    }, [searchParams, dispatch, router])

    return (
        <div className="flex h-screen w-full items-center justify-center">
             <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p>Đang xử lý đăng nhập Google...</p>
             </div>
        </div>
    )
}
