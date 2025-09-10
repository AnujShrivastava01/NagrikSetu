import React from "react";
import { useEffect } from "react";
import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  MapPin,
  Users,
  Shield,
  Star,
  Zap,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";
import { FaCamera, FaRegListAlt, FaHandsHelping } from "react-icons/fa";

const LandingPage = () => {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLoginSuccess = async (credentialResponse: any) => {
    if (credentialResponse.credential) {
      try {
        // Send the credential to backend for verification and user creation/login
        const response = await api.post("/auth/google", {
          credential: credentialResponse.credential,
        });

        const { user, accessToken, refreshToken } = response.data;

        // Store tokens
        localStorage.setItem("accessToken", accessToken);
        localStorage.setItem("refreshToken", refreshToken);
        localStorage.setItem("user", JSON.stringify(user));

        // Update auth context
        setUser(user);

        // Navigate based on role
        if (user.role === "admin") {
          navigate("/dashboard/admin");
        } else {
          navigate("/dashboard/user");
        }
      } catch (error) {
        console.error("Login failed:", error);
        // Handle login error
      }
    }
  };

  // On initial load, scroll hero into view if on landing page
  useEffect(() => {
    if (location.pathname === "/") {
      const el = document.getElementById("hero");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  }, [location.pathname]);

  const features = [
    {
      icon: MapPin,
      title: "Report Issues",
      description:
        "Easily report civic problems like potholes, streetlights, or waste with photos and GPS location",
      color: "text-blue-600",
    },
    {
      icon: Eye,
      title: "Track Progress",
      description:
        "Stay updated on your issue’s status from submission to resolution in real-time",
      color: "text-green-600",
    },
    {
      icon: Users,
      title: "Community Impact",
      description:
        "Collaborate with fellow citizens to build cleaner, safer, and smarter communities",
      color: "text-purple-600",
    },
    {
      icon: Shield,
      title: "Verified Reports",
      description:
        "Admin validation ensures issues are authentic, prioritized, and actionable by authorities",
      color: "text-orange-600",
    },
  ];

  const steps = [
    {
      number: "01",
      title: "Snap & Report",
      description: "Take a photo of the road issue and add location details",
    },
    {
      number: "02",
      title: "Track Status",
      description:
        "Monitor your report as it moves through verification to resolution",
    },
    {
      number: "03",
      title: "See Impact",
      description:
        "Watch as your community becomes safer through collective action",
    },
  ];
  const stepIcons = [FaCamera, FaRegListAlt, FaHandsHelping];

  const [hoveredCardIndex, setHoveredCardIndex] = useState<number | null>(null);

  return (
    <div className="min-h-screen scroll-smooth">
      {/* Hero Section */}
      <section
        id="hero"
        className="relative min-h-screen flex items-center bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900 py-20 overflow-hidden"
      >
        <div className="absolute inset-0 w-full h-full bg-[linear-gradient(to_right,rgba(17,24,39,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(17,24,39,0.04)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.07)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none z-0" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 bg-blue-100 rounded-full text-blue-700 text-sm font-medium mb-6 animate-fade-in">
              <Zap className="w-4 h-4 mr-2" />
              Making Cities Better, One Report at a Time
            </div>

            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6 animate-fade-in [animation-delay:200ms]">
              Report Civic Issues,
              <br />
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent">
                Build Better Communities
              </span>
            </h1>

            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto animate-fade-in [animation-delay:400ms]">
              Join thousands of citizens using NagrikSetu to report potholes,
              broken streetlights, and other civic issues. Together, we’re
              creating cleaner, safer, and smarter communities.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in [animation-delay:600ms]">
              <Link to="/report">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-lg px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                >
                  Report an Issue
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link to="/map">
                <Button
                  variant="outline"
                  size="lg"
                  className="text-lg px-8 py-4 rounded-xl border-2 hover:bg-gray-50 transition-all duration-300"
                >
                  View Live Map
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16 animate-fade-in [animation-delay:800ms]">
              {[
                { number: "12,847", label: "Issues Reported" },
                { number: "8,923", label: "Issues Resolved" },
                { number: "5,432", label: "Active Citizens" },
                { number: "89%", label: "Resolution Rate" },
              ].map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-1">
                    {stat.number}
                  </div>
                  <div className="text-gray-600 dark:text-gray-300 text-sm">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section
        id="how-it-works"
        className="min-h-screen flex items-center py-20 bg-gradient-to-br from-white via-blue-50 to-blue-100 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900 transition-colors duration-500"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <h2 className="text-4xl md:text-5xl font-extrabold text-center mb-2 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent drop-shadow-lg pb-2">
            How NagrikSetu Works
          </h2>
          <p className="text-lg md:text-2xl text-center text-gray-700 dark:text-gray-300 mb-12 font-medium">
            Three simple steps to make your community's civic issues safer
          </p>
          <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-center justify-center">
            {["/features/11.jpg", "/features/22.jpg", "/features/33.jpg"].map(
              (img, idx) => (
                <div
                  key={idx}
                  className="group relative cursor-pointer rounded-3xl overflow-hidden shadow-xl transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:ring-4 hover:ring-blue-300 dark:hover:ring-blue-800"
                  style={{
                    width: "320px",
                    height: "380px",
                    background: "rgba(255,255,255,0.7)",
                  }}
                >
                  <img
                    src={img}
                    alt={`Step Visual ${idx + 1}`}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 group-hover:brightness-110 group-hover:contrast-125"
                  />
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 via-purple-400/10 to-blue-800/10 opacity-0 group-hover:opacity-80 transition-opacity duration-500 pointer-events-none" />
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section
        id="features"
        className="relative min-h-screen flex flex-col items-center justify-start py-8 md:py-16 bg-gradient-to-br from-white via-gray-100 to-gray-200 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900 transition-colors duration-500 overflow-hidden"
      >
        {/* Grid background like hero */}
        <div className="absolute inset-0 w-full h-full bg-[linear-gradient(to_right,rgba(17,24,39,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(17,24,39,0.04)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.07)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none z-0" />
        <div className="w-full flex flex-col items-center justify-start relative z-10">
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-center mb-2 mt-6 sm:mt-10 md:mt-14 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent animate-fade-in-up">
            Features
          </h2>
          <div className="flex flex-col md:flex-row gap-5 justify-center items-center w-full max-w-4xl -mt-10">
            {[
              "/features/1.png",
              "/features/2.png",
              "/features/3.png",
              "/features/4.png",
            ].map((img, i) => (
              <div
                key={img}
                className="flex flex-col items-center group cursor-pointer animate-fade-in-up"
                style={{ animationDelay: `${i * 120}ms` }}
              >
                <div className="relative w-[200px] h-[400px] sm:w-[220px] sm:h-[440px] md:w-[260px] md:h-[520px] lg:w-[320px] lg:h-[660px] transition-all duration-500 group-hover:scale-110 flex items-center justify-center overflow-visible mx-auto">
                  <img
                    src={img}
                    alt={`Feature ${i + 1}`}
                    className="w-full h-full object-contain transition-transform duration-500"
                    style={{ background: "transparent" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Map Preview */}
      <section
        id="map"
        className="relative min-h-screen flex items-center py-20 bg-white dark:bg-gray-900 transition-colors duration-500 overflow-hidden"
      >
        {/* Blurred map background */}
        <div className="absolute inset-0 w-full h-full z-0 pointer-events-none">
          <img
            src="/features/map.png"
            alt="Map background"
            className="w-full h-full object-cover blur-sm opacity-40"
            style={{ objectPosition: "center" }}
          />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Real-Time Issue Tracking
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-12">
            See reported issues on an interactive map with live updates
          </p>
          <div className="flex justify-center">
            <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg rounded-3xl shadow-xl p-8 w-full max-w-3xl transition-colors duration-500">
              <div className="bg-gradient-to-br from-green-100 via-blue-100 to-purple-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 rounded-xl flex flex-col items-center justify-center h-64 mb-6 transition-colors duration-500">
                <div className="text-center">
                  <MapPin className="w-12 h-12 text-blue-600 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-300 font-medium">
                    Interactive Map Preview
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    View live road issues across your city
                  </p>
                </div>
              </div>
              <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl shadow transition-all duration-300">
                Explore Live Map
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section
        id="cta"
        className="relative min-h-screen flex items-center py-20  focus:outline-none"
      >
        {/* Video Background */}
        <video
          className="absolute inset-0 w-full h-full object-cover z-0 "
          src="/video1.mp4"
          autoPlay
          loop
          muted
          playsInline
        />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
          <Star className="w-12 h-12 text-yellow-400 mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Make a Difference?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join the NagrikSetu community today and help build cleaner, safer,
            and smarter neighborhoods
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {/* Buttons removed as requested */}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section
        id="faq"
        className="relative h-[100vh] flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900 py-2 px-2 overflow-hidden"
      >
        {/* Grid background like hero */}
        <div className="absolute inset-0 w-full h-full bg-[linear-gradient(to_right,rgba(17,24,39,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(17,24,39,0.04)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.07)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none z-0" />
        <div className="w-full max-w-4xl mx-auto flex flex-col items-center relative z-10">
          <h2 className="text-5xl md:text-6xl font-extrabold text-center mb-10 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent tracking-tight">
            FAQs
          </h2>
          <div className="w-full flex flex-col gap-2 rounded-2xl bg-transparent backdrop-blur-2xl border border-white/20 shadow-xl p-4 md:p-8">
            {(() => {
              const faqs = [
                {
                  q: "How do I report a civic issue?",
                  a: 'Click on the "Report an Issue" button on the homepage or use the "Get Started" link in the navbar. Fill in the details, upload a photo, and submit your report.',
                },
                {
                  q: "Can I track the status of my reported issue?",
                  a: "Yes! You can track your issue from submission to resolution in your dashboard. You will also receive notifications as your report progresses.",
                },
                {
                  q: "Who verifies the reported issues?",
                  a: "Our admin team reviews and verifies each report to ensure authenticity and route it to the right department.",
                },
                {
                  q: "Is NagrikSetu free to use?",
                  a: "Yes, NagrikSetu is completely free for all citizens.",
                },
                {
                  q: "How is my privacy protected?",
                  a: "We value your privacy. Your personal information is never shared publicly, and you can learn more in our Privacy Policy.",
                },
                {
                  q: "Can I edit or delete my report after submission?",
                  a: "Yes, you can edit or delete your report from your dashboard as long as it has not been verified by the admin team.",
                },
                {
                  q: "How can I contact support?",
                  a: "You can email us at contact@nagriksetu.com or use the contact form at the bottom of this page.",
                },
              ];

              const [openIdx, setOpenIdx] = useState<number | null>(null);
              return faqs.map((faq, idx) => {
                const isOpen = openIdx === idx;
                return (
                  <div
                    key={idx}
                    className={`border-b last:border-b-0 group transition-all duration-200`}
                  >
                    <button
                      className={`w-full flex justify-between items-center cursor-pointer px-2 py-2 text-sm md:text-base font-medium text-left text-gray-900 dark:text-white select-none focus:outline-none transition-transform duration-150 active:scale-[0.98] active:shadow-sm`}
                      aria-expanded={isOpen}
                      onClick={() => setOpenIdx(isOpen ? null : idx)}
                    >
                      <span>{faq.q}</span>
                      <svg
                        className={`ml-2 w-5 h-5 text-gray-400 transform transition-transform duration-300 ${
                          isOpen ? "rotate-180" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <div
                      className={`px-2 pb-2 text-gray-700 dark:text-gray-200 text-xs md:text-sm transition-all duration-300 overflow-hidden ${
                        isOpen ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
                      }`}
                      style={{ pointerEvents: isOpen ? "auto" : "none" }}
                    >
                      {faq.a}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 pt-8 pb-4 sm:pt-12 sm:pb-6">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8">
          {/* About/Description full width on mobile */}
          <div className="mb-6 md:mb-0 flex flex-col items-start text-left w-full">
            <div className="flex items-center mb-3">
              <img
                src="/logo.png"
                alt="NagrikSetu Logo"
                className="w-15 h-16 rounded-full mr-2"
              />
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                NagrikSetu
              </span>
            </div>
            <p className="text-gray-600 dark:text-gray-300 text-sm max-w-xl">
              Effortlessly report and track civic issues. Collaborate with your
              community and local authorities to make neighborhoods cleaner,
              safer, and smarter!
            </p>
          </div>
          {/* Grid for links/sections on mobile, flex on desktop */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-6 md:flex md:flex-row md:items-start md:justify-between md:gap-12">
            {/* Quick Links */}
            <div className="flex flex-col items-start">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2 text-base sm:text-lg">
                QUICK LINKS
              </h4>
              <ul className="space-y-1 text-gray-600 dark:text-gray-300 text-sm">
                <li>
                  <a href="/" className="hover:underline">
                    Home
                  </a>
                </li>
                <li>
                  <a href="/report" className="hover:underline">
                    Report Issue
                  </a>
                </li>
                <li>
                  <a href="/map" className="hover:underline">
                    Live Map
                  </a>
                </li>
                <li>
                  <a href="#features" className="hover:underline">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:underline">
                    Contact
                  </a>
                </li>
              </ul>
            </div>
            {/* Follow Us */}
            <div className="flex flex-col items-start">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2 text-base sm:text-lg">
                FOLLOW US
              </h4>
              <ul className="space-y-1 text-gray-600 dark:text-gray-300 text-sm">
                <li>
                  <a
                    href="https://github.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    GitHub
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:underline">
                    Twitter
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:underline">
                    Instagram
                  </a>
                </li>
              </ul>
            </div>
            {/* Contact */}
            <div className="flex flex-col items-start">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2 text-base sm:text-lg">
                CONTACT
              </h4>
              <ul className="space-y-1 text-gray-600 dark:text-gray-300 text-sm">
                <li>
                  <a
                    href="https://www.linkedin.com/in/anujshrivastava1/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    Anuj Shrivastava
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.linkedin.com/in/divyansh-agrawal-4556a0299/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    Divyansh Agrawal
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.linkedin.com/in/bhavya-gupta-88664128a/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    Bhavya Gupta
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.linkedin.com/in/khushi-sharma-6447292ba"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    Khushi Sharma
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.linkedin.com/in/anish-kumar-5474202a6"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    Anish Kumar
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.linkedin.com/in/harshvardhan-chadar-a7750929a"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    Harshvardhan Chadar
                  </a>
                </li>
              </ul>
            </div>
            {/* Legal */}
            <div className="flex flex-col items-start">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2 text-base sm:text-lg">
                LEGAL
              </h4>
              <ul className="space-y-1 text-gray-600 dark:text-gray-300 text-sm">
                <li>
                  <a href="#" className="hover:underline">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:underline">
                    License
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:underline">
                    Terms & Conditions
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:underline">
                    Code Of Conduct
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <hr className="my-6 sm:my-8 border-gray-200 dark:border-gray-800" />
          <div className="flex flex-col md:flex-row items-center justify-between text-gray-500 dark:text-gray-400 text-xs gap-2 sm:gap-0">
            <div className="text-center md:text-left w-full md:w-auto">
              © {new Date().getFullYear()} NagrikSetu. All Rights Reserved.
            </div>
            <div className="flex gap-3 sm:gap-4 mt-2 md:mt-0 items-center justify-center">
              <a
                href="#"
                className="hover:text-blue-500 flex items-center"
                aria-label="WhatsApp"
              >
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 32 32"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle
                    cx="16"
                    cy="16"
                    r="15"
                    stroke="#6B7280"
                    strokeWidth="2"
                    fill="none"
                  />
                  <path
                    d="M22.2 18.7c-.3-.2-1.7-.8-2-1-0.3-.1-.5-.2-.7.2-.2.3-.7 1-0.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.2-.4-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.4.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2.1-.4 0-.5-.1-.1-.6-1.5-.8-2-.2-.5-.5-.5-.7-.5-.2 0-.4 0-.6 0-.2 0-.5.1-.8.3-.3.3-1 1-1 2.4 0 1.4 1 2.8 1.2 3 .2.2 2.1 3.2 5 4.3.7.3 1.2.5 1.7.6.7.2 1.3.2 1.8.1.6-.1 1.7-.7 1.9-1.3.2-.6.2-1.2.1-1.3-.1-.1-.3-.2-.5-.3z"
                    fill="#6B7280"
                  />
                </svg>
              </a>
              <a
                href="https://github.com/"
                className="hover:text-blue-500 flex items-center"
                aria-label="GitHub"
              >
                <svg
                  width="28"
                  height="28"
                  fill="currentColor"
                  className="inline"
                  viewBox="0 0 20 20"
                >
                  <path d="M10 0C4.477 0 0 4.477 0 10c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.483 0-.237-.009-.868-.014-1.703-2.782.604-3.369-1.342-3.369-1.342-.454-1.154-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.004.07 1.532 1.032 1.532 1.032.892 1.529 2.341 1.088 2.91.832.091-.647.35-1.088.636-1.339-2.221-.253-4.555-1.111-4.555-4.944 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.272.098-2.65 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0 1 10 4.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.748-1.025 2.748-1.025.546 1.378.202 2.397.1 2.65.64.699 1.028 1.592 1.028 2.683 0 3.842-2.337 4.687-4.566 4.936.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.749 0 .268.18.579.688.481C17.138 18.163 20 14.418 20 10c0-5.523-4.477-10-10-10z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
        {/* Scroll to Top Button */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-16 right-3 sm:bottom-20 sm:right-6 z-50 flex items-center justify-center backdrop-blur-md bg-blue-600/70 hover:bg-blue-700/90 text-white rounded-full p-1.5 w-9 h-9 sm:p-2 sm:w-10 sm:h-10 shadow-2xl transition-all duration-500 ease-in-out opacity-95 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-400 animate-fade-in"
          style={{ boxShadow: "0 6px 32px rgba(30,64,175,0.25)" }}
          aria-label="Scroll to top"
        >
          <svg
            className="mx-auto"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="M5 15l7-7 7 7" />
          </svg>
        </button>
      </footer>
    </div>
  );
};

export default LandingPage;
