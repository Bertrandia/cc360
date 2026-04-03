'use client';
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { triggerSnackbar } from "./snakbar";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const passwordRef = useRef(null);
    const router = useRouter();
    const { login } = useAuth();

    const handleLogin = async () => {
        if (!email && !password) {
            triggerSnackbar("Please enter both email and password", "warning");
            return;
        }
        if (!email) {
            triggerSnackbar("Please enter your email", "warning");
            return;
        }
        if (!password) {
            triggerSnackbar("Please enter your password", "warning");
            return;
        }

        try {
            setLoading(true);
            const role = await login(email, password);
            if (role === "supply") router.push("/dashboard");
            else if (role === "LM") router.push("/lmsheet");
            else if (role === "Training") router.push("/trainingsheet");
            else if (role === "OTS") router.push("/otsdash");
            else triggerSnackbar("No pages assigned to your role", "warning");
        } catch (err) {
            triggerSnackbar("Login failed, wrong credentials ", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex flex-col md:flex-row bg-white">

            {/* LEFT SECTION - Illustration + Text */}
            <div className="flex-1 bg-[#F9F6F4] p-6 flex flex-col items-center justify-center text-center">

                <div className="w-full max-w-lg">
                    {/* Top diagram image */}
                    <div className="w-full flex justify-center mb-6">
                        <Image
                            src="/Login.png"
                            alt="Process"
                            width={500}
                            height={500}
                            className="object-contain rounded-xl"
                        />
                    </div>

                    {/* Welcome Text */}
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>
                        Welcome Back to CC360
                    </h1>

                    <p className="text-gray-600 leading-relaxed text-sm md:text-base">
                    </p>
                </div>
            </div>

            {/* RIGHT SECTION - Login Form */}
            <div className="flex-1 flex items-center justify-center px-6 md:px-16 py-10 bg-white">
                <div className="w-full max-w-sm">

                    <h2 className="text-3xl font-bold text-gray-800 mb-2" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>
                        Log in to your account
                    </h2>
                    <p className="text-sm text-gray-500 mb-6" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>Welcome back to CareCrew 360</p>

                    {/* Email */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-1 text-gray-700" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>
                            Email Id
                        </label>
                        <input
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && passwordRef.current?.focus()}
                            className="w-full border border-gray-300 px-3 py-2 rounded-md focus:ring-2 focus:ring-orange-400 outline-none"
                            style={{ fontFamily: 'NeuzeitGro, sans-serif' }}
                        />
                    </div>

                    {/* Password */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-1 text-gray-700" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>
                            Password
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter your password"
                                value={password}
                                ref={passwordRef}
                                onChange={(e) => setPassword(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                                className="w-full border border-gray-300 px-3 py-2 rounded-md pr-10 focus:ring-2 focus:ring-orange-400 outline-none"
                                style={{ fontFamily: 'NeuzeitGro, sans-serif' }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((prev) => !prev)}
                                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-600"
                                style={{ fontFamily: 'NeuzeitGro, sans-serif' }}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {/* Login Button */}
                    <button
                        onClick={handleLogin}
                        disabled={loading}
                        className="w-full bg-orange-500 text-white py-2 rounded-md hover:bg-orange-600 transition shadow"
                        style={{ fontFamily: 'NeuzeitGro, sans-serif' }}
                    >
                        {loading ? "Logging in..." : "Log In"}
                    </button>

                </div>
            </div>
        </div>
    );
}
