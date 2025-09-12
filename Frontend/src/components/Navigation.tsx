import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Menu,
  X,
  MapPin,
  Shield,
  User,
  Map,
  FileText,
  Users,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import FancyThemeToggle from "./ThemeToggle";
import { useAuth } from "../hooks/useAuth";
import { FcGoogle } from "react-icons/fc";
import { motion, AnimatePresence } from "framer-motion";
import { useGoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import {
  getBestImageUrl,
  createFallbackImageUrl,
} from "@/utils/imageOptimizer";
import { useToast } from "../hooks/use-toast";
// PWA imports removed - using browser's native install option

const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [navbarImageUrl, setNavbarImageUrl] = useState<string>("");
  const [dropdownImageUrl, setDropdownImageUrl] = useState<string>("");
  const location = useLocation();
  const {
    isAuthenticated,
    logout,
    setUser,
    user,
    role: authRole,
    setRole: setAuthRole,
    loading,
  } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  // PWA install state variables removed - using browser's native install option

  // Google login handlers for each role
  const loginAsAdmin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        console.log("🔐 Admin login initiated");

        // Send to backend for authentication
        const response = await fetch(
          `${
            import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api"
          }/auth/google`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              credential: tokenResponse.access_token,
              role: "admin",
            }),
          }
        );

        if (response.ok) {
          const { user, accessToken, refreshToken } = await response.json();
          console.log(
            "✅ Admin login successful:",
            user.name,
            "Role:",
            user.role
          );

          // Store tokens
          localStorage.setItem("accessToken", accessToken);
          localStorage.setItem("refreshToken", refreshToken);
          localStorage.setItem("user", JSON.stringify(user));

          // Update auth context
          setUser(user);
          setAuthRole(user.role);
          setDropdownOpen(false);

          // Navigate to admin dashboard
          navigate("/dashboard/admin");
        } else {
          const errorData = await response.json();
          console.error("❌ Admin login failed:", errorData);
          // Extract the most accurate error message
          let errorMessage = "Login failed. Please try again.";
          if (errorData.error?.message) {
            errorMessage = errorData.error.message;
          } else if (errorData.error) {
            errorMessage = errorData.error;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
          if (errorMessage.toLowerCase().includes("role switching")) {
            toast({
              title: "Role Switching Not Allowed",
              description:
                "You cannot switch roles. You are already registered as a different role. Please log in with your original role or contact support.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Admin Login Failed",
              description: errorMessage,
              variant: "destructive",
            });
          }
        }
      } catch (error) {
        console.error("❌ Admin login error:", error);
        // Extract the most accurate error message for network/fetch errors
        let errorMessage = "Login failed. Please try again.";
        if (error instanceof Error && error.message) {
          errorMessage = error.message;
        }
        if (errorMessage.includes("Failed to fetch")) {
          toast({
            title: "Network Error",
            description:
              "Cannot connect to server. Please make sure the backend is running on port 3001.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Admin Login Error",
            description: errorMessage,
            variant: "destructive",
          });
        }
      }
    },
    onError: () => {
      console.error("❌ Google login error");
      toast({
        title: "Google Login Error",
        description: "Google login failed. Please try again.",
        variant: "destructive",
      });
    },
    flow: "implicit",
  });

  const loginAsUser = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        console.log("🔐 User login initiated");

        // Send to backend for authentication
        const response = await fetch(
          `${
            import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api"
          }/auth/google`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              credential: tokenResponse.access_token,
              role: "user",
            }),
          }
        );

        if (response.ok) {
          const { user, accessToken, refreshToken } = await response.json();
          console.log(
            "✅ User login successful:",
            user.name,
            "Role:",
            user.role
          );

          // Store tokens
          localStorage.setItem("accessToken", accessToken);
          localStorage.setItem("refreshToken", refreshToken);
          localStorage.setItem("user", JSON.stringify(user));

          // Update auth context
          setUser(user);
          setAuthRole(user.role);
          setDropdownOpen(false);

          // Navigate to user dashboard
          navigate("/dashboard/user");
        } else {
          const errorData = await response.json();
          console.error("❌ User login failed:", errorData);
          // Extract the most accurate error message
          let errorMessage = "Login failed. Please try again.";
          if (errorData.error?.message) {
            errorMessage = errorData.error.message;
          } else if (errorData.error) {
            errorMessage = errorData.error;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
          if (errorMessage.toLowerCase().includes("role switching")) {
            toast({
              title: "Role Switching Not Allowed",
              description:
                "You cannot switch roles. You are already registered as a different role. Please log in with your original role or contact support.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "User Login Failed",
              description: errorMessage,
              variant: "destructive",
            });
          }
        }
      } catch (error) {
        console.error("❌ User login error:", error);
        // Extract the most accurate error message for network/fetch errors
        let errorMessage = "Login failed. Please try again.";
        if (error instanceof Error && error.message) {
          errorMessage = error.message;
        }
        if (errorMessage.includes("Failed to fetch")) {
          toast({
            title: "Network Error",
            description:
              "Cannot connect to server. Please make sure the backend is running on port 3001.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "User Login Error",
            description: errorMessage,
            variant: "destructive",
          });
        }
      }
    },
    onError: () => {
      console.error("❌ Google login error");
      toast({
        title: "Google Login Error",
        description: "Google login failed. Please try again.",
        variant: "destructive",
      });
    },
    flow: "implicit",
  });

  // Role-based navigation items
  const getNavItems = () => {
    // Only show navigation items if authenticated
    if (!isAuthenticated) {
      return [];
    }

    // Base items for authenticated users (Report Issue and Live Map are now protected)
    const baseItems = [
      { name: "Report Issue", path: "/report", icon: MapPin },
      { name: "Live Map", path: "/map", icon: Map },
    ];

    if (authRole === "user") {
      return [
        ...baseItems,
        { name: "Dashboard", path: "/dashboard/user", icon: User },
      ];
    } else if (authRole === "admin") {
      return [
        { name: "Admin Dashboard", path: "/dashboard/admin", icon: Shield },
        { name: "Live Map", path: "/map", icon: Map },
      ];
    }

    return baseItems;
  };

  const navItems = getNavItems();

  // Add landing page section links (only for non-authenticated users or on landing page)
  const sectionLinks = [
    { name: "Home", id: "hero" },
    { name: "How It Works", id: "how-it-works" },
    { name: "Features", id: "features" },
    { name: "Map", id: "map" },
    { name: "Get Started", id: "cta" },
    { name: "FAQ", id: "faq" },
  ];

  // Only show section links on landing page for non-authenticated users
  const isLanding = location.pathname === "/";
  const shouldShowSectionLinks = isLanding && !isAuthenticated;

  // Smooth scroll handler for Home (always available)
  const handleHomeScroll = () => {
    if (location.pathname !== "/") {
      navigate("/");
      setTimeout(() => {
        const el = document.getElementById("hero");
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } else {
      const el = document.getElementById("hero");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
    setIsMenuOpen(false);
  };

  // Smooth scroll handler
  const handleSectionScroll = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
      setIsMenuOpen(false);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  // Load optimized images when user changes
  useEffect(() => {
    const loadImages = async () => {
      if (user?.picture && user?.name) {
        try {
          const navbarUrl = await getBestImageUrl(user.picture, user.name, 36);
          const dropdownUrl = await getBestImageUrl(
            user.picture,
            user.name,
            32
          );
          setNavbarImageUrl(navbarUrl);
          setDropdownImageUrl(dropdownUrl);
        } catch (err) {
          console.error("Error loading navigation images:", err);
          setNavbarImageUrl("");
          setDropdownImageUrl("");
        }
      }
    };

    loadImages();
  }, [user]);

  // PWA install prompt removed - users can use browser's native install option

  // Install click handler removed - using browser's native install option

  // Don't render navigation while loading
  if (loading) {
    return (
      <nav className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-md shadow-lg sticky top-0 z-50 border-b border-border transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-8 w-32 rounded"></div>
            <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-8 w-8 rounded"></div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <>
      <nav className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-md shadow-lg sticky top-0 z-50 border-b border-border transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2 group">
              <img
                src="/logo.png"
                alt="Nagriksetu Logo"
                className="w-15 h-16 object-contain"
              />
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                NagrikSetu
              </span>
            </Link>

            {/* Desktop Navigation - Center Section */}
            <div className="hidden md:flex flex-1 justify-center items-center space-x-1">
              <button
                onClick={handleHomeScroll}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-accent text-muted-foreground hover:text-foreground focus:outline-none"
              >
                Home
              </button>
              {shouldShowSectionLinks &&
                sectionLinks.slice(1).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSectionScroll(item.id)}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-accent text-muted-foreground hover:text-foreground focus:outline-none"
                  >
                    {item.name}
                  </button>
                ))}
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-accent ${
                      isActive(item.path)
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>

            {/* Right-aligned controls: theme toggle and sign in/user */}
            <div className="hidden md:flex items-center gap-2 ml-auto">
              <div className="flex items-center">
                <FancyThemeToggle />
              </div>
              {isAuthenticated ? (
                <div className="flex items-center gap-2 relative">
                  {/* User Avatar Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setDropdownOpen((open) => !open)}
                      className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-blue-200 dark:border-blue-800 bg-white dark:bg-gray-900 shadow hover:ring-2 hover:ring-blue-400 transition-all focus:outline-none"
                      aria-label="User menu"
                    >
                      {user?.picture ? (
                        <img
                          src={user.picture}
                          alt="Profile"
                          className="w-9 h-9 rounded-full object-cover"
                          onError={(e) =>
                            (e.currentTarget.style.display = "none")
                          }
                        />
                      ) : (
                        <span className="w-9 h-9"></span>
                      )}
                    </button>
                    {dropdownOpen && (
                      <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 z-50 animate-fade-in flex flex-col py-2">
                        <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
                          {user?.picture ? (
                            <img
                              src={user.picture}
                              alt="Profile"
                              className="w-8 h-8 rounded-full object-cover"
                              onError={(e) =>
                                (e.currentTarget.style.display = "none")
                              }
                            />
                          ) : (
                            <span className="w-8 h-8"></span>
                          )}
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-white">
                              {user?.name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-300">
                              {user?.email}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setDropdownOpen(false);
                            navigate("/profile");
                          }}
                          className="px-4 py-2 text-left hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors text-gray-800 dark:text-gray-100"
                        >
                          {authRole === "admin"
                            ? "Admin Profile"
                            : "User Profile"}
                        </button>

                        {/* Role-based navigation */}
                        {authRole === "admin" ? (
                          <>
                            <button
                              onClick={() => {
                                setDropdownOpen(false);
                                navigate("/dashboard/admin");
                              }}
                              className="px-4 py-2 text-left hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors text-gray-800 dark:text-gray-100"
                            >
                              Dashboard
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setDropdownOpen(false);
                                navigate("/dashboard/user");
                              }}
                              className="px-4 py-2 text-left hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors text-gray-800 dark:text-gray-100"
                            >
                              Dashboard
                            </button>
                            <button
                              onClick={() => {
                                setDropdownOpen(false);
                                navigate("/my-reports");
                              }}
                              className="px-4 py-2 text-left hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors text-gray-800 dark:text-gray-100"
                            >
                              My Reports
                            </button>
                          </>
                        )}

                        <button
                          onClick={() => {
                            setDropdownOpen(false);
                            logout();
                          }}
                          className="px-4 py-2 text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                        >
                          Sign Out
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <Button
                    className="ml-4 flex items-center gap-2 bg-white text-gray-800 border border-gray-300 shadow hover:bg-gray-100 hover:shadow-lg transition-all duration-200 px-5 py-2 rounded-lg"
                    onClick={() => setDropdownOpen((open) => !open)}
                    onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}
                  >
                    <FcGoogle className="w-5 h-5" />
                    <span>Sign In</span>
                  </Button>
                  <AnimatePresence>
                    {dropdownOpen && !isAuthenticated && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 mt-2 w-[calc(100%+16px)] min-w-[180px] bg-white rounded-lg shadow-lg z-50 flex flex-col gap-2 p-2 border border-gray-200"
                        style={{ minWidth: "200px" }}
                      >
                        <button
                          className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition border border-gray-300 shadow"
                          style={{ height: "40px" }}
                          onClick={() => loginAsAdmin()}
                        >
                          <FcGoogle className="w-5 h-5" /> Admin
                        </button>
                        <button
                          className="flex items-center gap-2 px-5 py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 transition border border-gray-300 shadow"
                          style={{ height: "40px" }}
                          onClick={() => loginAsUser()}
                        >
                          <FcGoogle className="w-5 h-5" /> User
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Mobile menu button and theme toggle */}
            <div className="md:hidden flex items-center justify-end w-full space-x-2">
              <div className="ml-auto flex items-center">
                <FancyThemeToggle />
                {isAuthenticated && (
                  <div className="relative ml-2">
                    <button
                      onClick={() => setDropdownOpen((open) => !open)}
                      className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-blue-200 dark:border-blue-800 bg-white dark:bg-gray-900 shadow hover:ring-2 hover:ring-blue-400 transition-all focus:outline-none"
                      aria-label="User menu"
                    >
                      {user?.picture ? (
                        <img
                          src={user.picture}
                          alt="Profile"
                          className="w-9 h-9 rounded-full object-cover"
                          onError={(e) =>
                            (e.currentTarget.style.display = "none")
                          }
                        />
                      ) : (
                        <span className="w-9 h-9"></span>
                      )}
                    </button>
                    <AnimatePresence>
                      {dropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                          className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 z-50 animate-fade-in flex flex-col py-2"
                        >
                          <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
                            {user?.picture ? (
                              <img
                                src={user.picture}
                                alt="Profile"
                                className="w-8 h-8 rounded-full object-cover"
                                onError={(e) =>
                                  (e.currentTarget.style.display = "none")
                                }
                              />
                            ) : (
                              <span className="w-8 h-8"></span>
                            )}
                            <div>
                              <div className="font-semibold text-gray-900 dark:text-white">
                                {user?.name}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-300">
                                {user?.email}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setDropdownOpen(false);
                              navigate("/profile");
                            }}
                            className="px-4 py-2 text-left hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors text-gray-800 dark:text-gray-100"
                          >
                            {authRole === "admin"
                              ? "Admin Profile"
                              : "User Profile"}
                          </button>
                          {authRole === "admin" ? (
                            <button
                              onClick={() => {
                                setDropdownOpen(false);
                                navigate("/dashboard/admin");
                              }}
                              className="px-4 py-2 text-left hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors text-gray-800 dark:text-gray-100"
                            >
                              Dashboard
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  setDropdownOpen(false);
                                  navigate("/dashboard/user");
                                }}
                                className="px-4 py-2 text-left hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors text-gray-800 dark:text-gray-100"
                              >
                                Dashboard
                              </button>
                              <button
                                onClick={() => {
                                  setDropdownOpen(false);
                                  navigate("/my-reports");
                                }}
                                className="px-4 py-2 text-left hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors text-gray-800 dark:text-gray-100"
                              >
                                My Reports
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => {
                              setDropdownOpen(false);
                              logout();
                            }}
                            className="px-4 py-2 text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                          >
                            Sign Out
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="p-2 rounded-lg hover:bg-accent transition-colors ml-2"
                >
                  {isMenuOpen ? (
                    <X className="w-6 h-6" />
                  ) : (
                    <Menu className="w-6 h-6" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <div className="md:hidden py-4 border-t border-border animate-in slide-in-from-top-2 duration-200">
              {/* Home Link */}
              <button
                onClick={handleHomeScroll}
                className="flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-muted-foreground hover:bg-accent hover:text-foreground w-full text-left"
              >
                <User className="w-5 h-5" />
                <span>Home</span>
              </button>
              {/* Navigation Items */}
              {isAuthenticated
                ? navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.name}
                        to={item.path}
                        onClick={() => setIsMenuOpen(false)}
                        className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                          isActive(item.path)
                            ? "bg-accent text-accent-foreground"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })
                : sectionLinks
                    .filter((item) => item.name !== "Home")
                    .map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          handleSectionScroll(item.id);
                          setIsMenuOpen(false);
                        }}
                        className="flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-muted-foreground hover:bg-accent hover:text-foreground w-full text-left"
                      >
                        <span>{item.name}</span>
                      </button>
                    ))}

              {/* User-specific mobile menu items */}
              {/* Removed User Profile and My Reports */}
              {/* Admin-specific mobile menu items */}
              {isAuthenticated && authRole === "admin" && (
                <>{/* Removed Admin Profile link for admin */}</>
              )}

              {/* Authentication buttons */}
              <div className="px-4 pt-3 space-y-2">
                {isAuthenticated ? (
                  <Button
                    className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
                    onClick={() => {
                      logout();
                      setIsMenuOpen(false);
                    }}
                  >
                    Sign Out
                  </Button>
                ) : (
                  <div className="relative">
                    <Button
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 flex items-center justify-center"
                      onClick={() => setDropdownOpen((open) => !open)}
                    >
                      <FcGoogle className="w-5 h-5 mr-2" />
                      Sign In
                    </Button>
                    <AnimatePresence>
                      {dropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                          className="absolute left-0 right-0 mt-2 bg-white rounded-lg shadow-lg z-50 flex flex-col gap-2 p-2 border border-gray-200"
                        >
                          <button
                            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition border border-gray-300 shadow"
                            style={{ height: "40px" }}
                            onClick={() => {
                              loginAsAdmin();
                              setDropdownOpen(false);
                              setIsMenuOpen(false);
                            }}
                          >
                            <FcGoogle className="w-5 h-5" /> Admin
                          </button>
                          <button
                            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 transition border border-gray-300 shadow"
                            style={{ height: "40px" }}
                            onClick={() => {
                              loginAsUser();
                              setDropdownOpen(false);
                              setIsMenuOpen(false);
                            }}
                          >
                            <FcGoogle className="w-5 h-5" /> User
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>
      {/* PWA install banner removed - users can use browser's native install option */}
    </>
  );
};

export default Navigation;
