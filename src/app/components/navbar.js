"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import Image from "next/image";
import { useAuth } from "../context/AuthContext";

const allMenuItems = [
    { name: "Demand Dashboard", href: "dashboard", roles: ["supply", "OTS", "LM"] },
    { name: "Status Summary", href: "associate-dash", roles: ["supply"] },
    { name: "Candidate Dashboard", href: "candidatedash", roles: ["supply", "Training", "OTS"] },
    { name: "Complementary Manhours", href: "complementarymanhours", roles: ["supply"] },
    { name: "Associate Candidates", href: "trainingsheet", roles: ["Training"] },
];

export default function Nav() {
    const pathname = usePathname();
    const router = useRouter();
    const [filteredMenuItems, setFilteredMenuItems] = useState([]);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const { user, userData, logout } = useAuth();

    useEffect(() => {
        if (!userData || !userData.otsRole) {
            setIsLoading(false);
            return;
        }

        if (userData.otsRole === "LM") {
            setFilteredMenuItems([]);
            setIsLoading(false);
            return;
        }

        const filtered = allMenuItems.filter((item) =>
            item.roles.includes(userData.otsRole)
        );

        setFilteredMenuItems(filtered);
        setIsLoading(false);
    }, [userData]);

    const handleLogout = async () => {
        await logout();
        router.push("/");
    };

    const isActive = (href) => pathname.includes(href);

    return (
        <div className="w-full">

            {/* NAVBAR BACKGROUND */}
            <div
                className="w-full shadow-sm"
                style={{
                    backgroundColor: "#FDF4EE",
                    fontFamily: "NeuzeitGro",
                }}
            >
                <div className="container mx-auto px-4 py-3 flex items-center justify-between">

                    {/* LEFT — LOGO + TITLE */}
                    <div className="flex items-center space-x-3">
                        <Image
                            src="/CC360 logo.png"
                            width={40}
                            height={40}
                            alt="Logo"
                            className="rounded-full"
                        />
                        <h1 className="text-lg sm:text-xl font-bold text-gray-800">
                            Care Crew
                        </h1>
                    </div>

                    {/* DESKTOP MENU ITEMS (LEFT-ALIGNED) */}
                    {userData?.otsRole !== "LM" && (
                        <nav className="hidden lg:flex items-center space-x-4 ml-10">

                            {!isLoading &&
                                filteredMenuItems.map((item) => (
                                    <Link href={`/${item.href}`} key={item.name}>
                                        <div
                                            className={`
                                                px-4 py-2 text-sm rounded-full 
                                                transition-all duration-150 whitespace-nowrap 
                                                ${isActive(item.href)
                                                    ? "bg-white text-[#EF5F24] shadow-sm"
                                                    : "text-gray-700 hover:bg-white/80"
                                                }
                                            `}
                                            style={{ fontFamily: "NeuzeitGro" }}
                                        >
                                            {item.name}
                                        </div>
                                    </Link>
                                ))}

                            {/* SKELETON */}
                            {isLoading && (
                                <div className="flex gap-4">
                                    {[1, 2, 3].map((i) => (
                                        <div
                                            key={i}
                                            className="h-8 w-24 bg-gray-200 rounded-full animate-pulse"
                                        ></div>
                                    ))}
                                </div>
                            )}
                        </nav>
                    )}

                    {/* RIGHT — PROFILE ICON */}
                    <div className="flex items-center space-x-4">

                        {user && (
                            <button
                                className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow text-gray-700 font-bold"
                                onClick={() => setShowProfileMenu(!showProfileMenu)}
                            >
                                {(userData?.patronName ||
                                    userData?.display_name ||
                                    user?.email)?.charAt(0).toUpperCase()}
                            </button>
                        )}

                        {/* MOBILE MENU BUTTON */}
                        {userData?.otsRole !== "LM" && (
                            <button
                                className="lg:hidden text-gray-700"
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            >
                                {mobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
                            </button>
                        )}
                    </div>
                </div>

                {/* MOBILE MENU DROPDOWN */}
                {mobileMenuOpen &&
                    userData?.otsRole !== "LM" && (
                        <div className="lg:hidden px-4 pb-3">
                            <div className="flex flex-col space-y-2">

                                {!isLoading &&
                                    filteredMenuItems.map((item) => (
                                        <Link
                                            href={`/${item.href}`}
                                            key={item.name}
                                            onClick={() => setMobileMenuOpen(false)}
                                        >
                                            <div
                                                className={`
                                                    px-4 py-2 rounded-full text-sm
                                                    ${isActive(item.href)
                                                        ? "bg-white text-[#EF5F24]"
                                                        : "text-gray-700 bg-white/60"
                                                    }
                                                `}
                                            >
                                                {item.name}
                                            </div>
                                        </Link>
                                    ))}

                                {isLoading && (
                                    <div className="space-y-2">
                                        {[1, 2, 3].map((i) => (
                                            <div
                                                key={i}
                                                className="h-8 bg-gray-300 rounded-full animate-pulse"
                                            ></div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
            </div>

            {/* PROFILE MENU */}
            {showProfileMenu && user && (
                <div
                    className="fixed right-4 top-20 w-64 p-4 rounded-xl bg-white shadow-lg border z-50"
                >
                    <div className="flex justify-between items-center mb-2">
                        <p className="font-medium text-gray-800 truncate">
                            {userData?.patronName ||
                                userData?.display_name ||
                                user?.email}
                        </p>
                        <button onClick={() => setShowProfileMenu(false)}>
                            <X size={18} className="text-gray-500" />
                        </button>
                    </div>

                    {userData?.otsRole && (
                        <p className="text-xs text-gray-500 mb-4">
                            Role: {userData.otsRole}
                        </p>
                    )}

                    <button
                        onClick={() => {
                            setShowProfileMenu(false);
                            setShowLogoutConfirm(true);
                        }}
                        className="w-full text-left px-3 py-3 text-red-600 hover:bg-red-50 rounded-lg font-medium"
                    >
                        Logout
                    </button>
                </div>
            )}

            {/* LOGOUT CONFIRMATION */}
            {showLogoutConfirm && (
                <div
                    className="fixed inset-0  bg-opacity-50 z-50 flex items-center justify-center"
                    onClick={() => setShowLogoutConfirm(false)}
                >
                    <div
                        className="bg-white p-6 rounded-lg shadow-lg w-80"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <p className="text-gray-800 mb-4">
                            Are you sure you want to logout?
                        </p>

                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setShowLogoutConfirm(false)}
                                className="px-4 py-2 rounded-lg bg-gray-200"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleLogout}
                                className="px-4 py-2 rounded-lg bg-red-600 text-white"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
