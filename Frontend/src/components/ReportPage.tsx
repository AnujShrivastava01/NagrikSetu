import React, { useState, useRef, useEffect } from "react";
import { Camera, MapPin, Upload, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import api from "@/services/api";

interface AIAnalysis {
  issueType: string;
  severity: string;
  confidence: number;
  description: string;
  details: {
    size: string;
    location: string;
    trafficImpact: string;
    safetyRisk: string;
  };
}

const ReportPage = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [issueType, setIssueType] = useState("");
  const [severity, setSeverity] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();

  // In-app camera capture state/refs
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Clean up media stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const openCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast({
          title: "Camera not supported",
          description:
            "Your browser does not support camera access. Please use the upload option.",
          variant: "destructive",
        });
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCameraOpen(true);
    } catch (err) {
      console.error("Failed to open camera:", err);
      toast({
        title: "Camera permission denied",
        description:
          "We couldn't access your camera. Please allow camera access or upload a photo.",
        variant: "destructive",
      });
    }
  };

  const closeCamera = () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    } finally {
      setIsCameraOpen(false);
    }
  };

  const capturePhoto = async () => {
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;
      const width = video.videoWidth || 720;
      const height = video.videoHeight || 480;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, width, height);

      // Convert to blob and File
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `capture_${Date.now()}.jpg`, {
        type: "image/jpeg",
      });

      // Update UI state and run AI analysis
      setSelectedImage(dataUrl);
      setImageFile(file);
      closeCamera();
      await analyzeImageWithAI(file);
    } catch (err) {
      console.error("Failed to capture photo:", err);
      toast({
        title: "Capture failed",
        description: "Could not capture photo from camera.",
        variant: "destructive",
      });
    }
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Store the file for AI analysis
      setImageFile(file);

      // Analyze image with AI
      await analyzeImageWithAI(file);
    }
  };

  const analyzeImageWithAI = async (file: File) => {
    try {
      setIsAnalyzing(true);

      const formData = new FormData();
      formData.append("image", file);

      const response = await api.post("/reports/analyze-image", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const analysis = response.data.data;
      setAiAnalysis(analysis);

      // Auto-fill the form with AI suggestions
      setIssueType(analysis.issueType);
      setSeverity(analysis.severity);
      setDescription(analysis.description);

      // Suggest category based on approved issue types
      const typeToCategory: Record<string, string> = {
        pothole: "roads",
        streetlight: "lighting",
        garbage: "sanitation",
        cleanliness: "sanitation",
        waterlogged: "other",
        other: "other",
      };
      const suggestedCategory = typeToCategory[analysis.issueType] || "";
      if (suggestedCategory) setCategory(suggestedCategory);

      // Create detailed analysis message
      const details = analysis.details || {};
      const detailMessage = [
        `Size: ${details.size || "unknown"}`,
        `Location: ${details.location || "unknown"}`,
        `Traffic Impact: ${details.trafficImpact || "unknown"}`,
        `Safety Risk: ${details.safetyRisk || "unknown"}`,
      ].join(" • ");

      toast({
        title: "AI Analysis Complete",
        description: `${analysis.issueType} (${
          analysis.severity
        }) - ${Math.round(
          analysis.confidence * 100
        )}% confidence\n${detailMessage}`,
      });
    } catch (error) {
      console.error("AI Analysis failed:", error);
      toast({
        title: "AI Analysis Failed",
        description:
          "Could not analyze image automatically. Please categorize manually.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            // Call backend for reverse geocoding
            const response = await api.post("/geocode/reverse", {
              latitude,
              longitude,
            });
            if (
              response.data.success &&
              response.data.data &&
              response.data.data.address
            ) {
              setLocation(response.data.data.address);
              toast({
                title: "Location captured",
                description: "Address has been added to your report",
              });
            } else {
              setLocation(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
              toast({
                title: "Location captured",
                description: "Coordinates have been added to your report",
              });
            }
          } catch (error) {
            setLocation(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
            toast({
              title: "Location error",
              description:
                "Could not fetch address, using coordinates instead.",
              variant: "destructive",
            });
          } finally {
            setIsLocating(false);
          }
        },
        (error) => {
          setIsLocating(false);
          toast({
            title: "Location error",
            description:
              "Unable to get your location. Please enter it manually.",
            variant: "destructive",
          });
        }
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated) {
      toast({
        title: "Authentication required",
        description: "Please sign in to submit a report.",
        variant: "destructive",
      });
      return;
    }

    if (!issueType || !severity || !location || !description) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      let lat = 40.7128; // Default to NYC coordinates
      let lng = -74.006;
      let finalAddress = location;

      // Check if location is coordinates or address
      if (location.includes(",")) {
        const coords = location
          .split(",")
          .map((coord) => parseFloat(coord.trim()));
        if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
          // It's coordinates, use them directly
          lat = coords[0];
          lng = coords[1];
        } else {
          // It's an address, try to geocode it
          try {
            const geocodeResponse = await api.post("/geocode/forward", {
              address: location,
            });
            if (geocodeResponse.data.success && geocodeResponse.data.data) {
              lat = geocodeResponse.data.data.coordinates.latitude;
              lng = geocodeResponse.data.data.coordinates.longitude;
              finalAddress = geocodeResponse.data.data.address;
            }
          } catch (geocodeError) {
            console.error("Geocoding failed:", geocodeError);
            // Keep the original address if geocoding fails
          }
        }
      } else {
        // It's an address, try to geocode it
        try {
          const geocodeResponse = await api.post("/geocode/forward", {
            address: location,
          });
          if (geocodeResponse.data.success && geocodeResponse.data.data) {
            lat = geocodeResponse.data.data.coordinates.latitude;
            lng = geocodeResponse.data.data.coordinates.longitude;
            finalAddress = geocodeResponse.data.data.address;
          }
        } catch (geocodeError) {
          console.error("Geocoding failed:", geocodeError);
          // Keep the original address if geocoding fails
        }
      }

      const reportData = {
        type: issueType,
        severity: severity,
        category: category || undefined,
        location: {
          address: finalAddress,
          coordinates: {
            latitude: lat,
            longitude: lng,
          },
        },
        description: description,
        // Persist AI analysis so admin AI stats can be accurate
        aiAnalysis: aiAnalysis
          ? {
              issueType: aiAnalysis.issueType,
              severity: aiAnalysis.severity,
              confidence: aiAnalysis.confidence,
              description: aiAnalysis.description,
              details: aiAnalysis.details,
              // processingTime is provided by backend analyze endpoint; keep optional here
            }
          : undefined,
        images: selectedImage
          ? [
              {
                url: selectedImage,
                publicId: `report_${Date.now()}`,
              },
            ]
          : [],
      };

      const response = await api.post("/reports", reportData);

      toast({
        title: "Report submitted successfully!",
        description:
          "Your civic issue has been reported and will be reviewed by our team.",
      });

      // Reset form
      setSelectedImage(null);
      setImageFile(null);
      setIssueType("");
      setSeverity("");
      setCategory("");
      setLocation("");
      setDescription("");
      setAiAnalysis(null);
    } catch (error: unknown) {
      console.error("Error submitting report:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to submit report. Please try again.";
      toast({
        title: "Submission failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative bg-gray-50 dark:bg-gray-900 transition-colors duration-500 py-8 overflow-hidden flex items-center justify-center">
      {/* Grid background */}
      <div className="absolute inset-0 w-full h-full bg-[linear-gradient(to_right,rgba(17,24,39,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(17,24,39,0.04)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.07)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none z-0" />
      <div className="relative z-10 w-full max-w-6xl mx-auto px-2 sm:px-6 lg:px-8 flex flex-col justify-center">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center text-gray-900 dark:text-white mb-2">
          Report Civic Issues
        </h1>
        <p className="text-center text-gray-600 dark:text-gray-300 mb-6 sm:mb-10">
          Make your community better by reporting potholes, streetlight faults,
          waste, and other civic issues.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-10 items-start w-full">
          {/* Issue Details Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 sm:p-8 transition-colors duration-500 w-full md:col-span-2 md:min-h-[500px] flex flex-col justify-between">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white">
                Issue Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Photo Upload */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Photo Evidence{" "}
                    {isAnalyzing && (
                      <span className="text-blue-600">(AI analyzing...)</span>
                    )}
                  </Label>
                  <div className="mt-1">
                    {selectedImage ? (
                      <div className="relative">
                        <img
                          src={selectedImage}
                          alt="Selected"
                          className="w-full h-48 object-cover rounded-lg border-2 border-gray-200 dark:border-gray-700"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="absolute top-2 right-2 bg-white/90 hover:bg-white dark:bg-gray-800 dark:hover:bg-gray-700"
                          onClick={() => setSelectedImage(null)}
                        >
                          Change
                        </Button>
                        {imageFile && (
                          <div className="absolute bottom-2 right-2 flex gap-2">
                            <Button
                              type="button"
                              variant="default"
                              size="sm"
                              disabled={isAnalyzing}
                              onClick={() => analyzeImageWithAI(imageFile)}
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              {isAnalyzing ? "Analyzing..." : "Analyze Image"}
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <label className="flex flex-col items-center justify-center w-full h-40 sm:h-48 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Camera className="w-10 h-10 mb-3 text-gray-400 dark:text-gray-500" />
                            <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                              <span className="font-semibold">Click to upload</span>{" "}
                              or drag and drop
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG up to 10MB</p>
                          </div>
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={handleImageUpload}
                            capture="environment"
                          />
                        </label>
                        <div className="flex items-center gap-3">
                          <Button type="button" variant="default" onClick={openCamera}>
                            Open Camera
                          </Button>
                          <span className="text-xs text-gray-500">Use your device camera to click a live photo</span>
                        </div>

                        {isCameraOpen && (
                          <div className="relative rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-black/80">
                            <video
                              ref={videoRef}
                              className="w-full max-h-64 rounded-md bg-black"
                              playsInline
                              muted
                              autoPlay
                            />
                            <canvas ref={canvasRef} className="hidden" />
                            <div className="mt-3 flex gap-3">
                              <Button type="button" onClick={capturePhoto} className="bg-blue-600 text-white">
                                Capture Photo
                              </Button>
                              <Button type="button" variant="outline" onClick={closeCamera}>
                                Close Camera
                              </Button>
                            </div>
                            <p className="mt-2 text-xs text-gray-300">
                              Tip: Ensure good lighting and hold steady for better AI analysis.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Category */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Category{" "}
                    {aiAnalysis && (
                      <span className="text-blue-600">(AI Suggested)</span>
                    )}
                  </Label>
                  <Select
                    onValueChange={setCategory}
                    value={category}
                    disabled={isAnalyzing}
                  >
                    <SelectTrigger
                      className={`w-full bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white ${
                        aiAnalysis ? "border-blue-300 bg-blue-50" : ""
                      }`}
                    >
                      <SelectValue
                        placeholder={
                          isAnalyzing ? "Analyzing image..." : "Select category"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-800">
                      <SelectItem value="roads">Potholes</SelectItem>
                      <SelectItem value="lighting">Street Light issues</SelectItem>
                      <SelectItem value="sanitation">Trash Bin</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* AI Analysis Results */}
                {aiAnalysis && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                        🤖 AI Analysis Results (
                        {Math.round(aiAnalysis.confidence * 100)}% confidence)
                      </span>
                    </div>

                    {/* Main Analysis */}
                    <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">
                          Issue Type:
                        </span>
                        <span className="ml-2 font-medium capitalize text-blue-700 dark:text-blue-300">
                          {aiAnalysis.issueType.replace("-", " ")}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">
                          Severity:
                        </span>
                        <span
                          className={`ml-2 font-medium capitalize px-2 py-1 rounded text-xs ${
                            aiAnalysis.severity === "critical"
                              ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                              : aiAnalysis.severity === "high"
                              ? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300"
                              : aiAnalysis.severity === "medium"
                              ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                              : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                          }`}
                        >
                          {aiAnalysis.severity}
                        </span>
                      </div>
                    </div>

                    {/* Detailed Analysis */}
                    {aiAnalysis.details && (
                      <div className="grid grid-cols-2 gap-3 text-xs mb-3 p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">
                            Size:
                          </span>
                          <span className="ml-1 font-medium capitalize">
                            {aiAnalysis.details.size}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">
                            Location:
                          </span>
                          <span className="ml-1 font-medium capitalize">
                            {aiAnalysis.details.location}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">
                            Traffic Impact:
                          </span>
                          <span className="ml-1 font-medium capitalize">
                            {aiAnalysis.details.trafficImpact}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">
                            Safety Risk:
                          </span>
                          <span className="ml-1 font-medium capitalize">
                            {aiAnalysis.details.safetyRisk}
                          </span>
                        </div>
                      </div>
                    )}

                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      {aiAnalysis.description}
                    </p>

                    <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
                      <p className="text-xs text-blue-600 dark:text-blue-400">
                        💡 AI suggestions have been applied to the form above.
                        You can modify them if needed.
                      </p>
                    </div>
                  </div>
                )}

                {/* Issue Type */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Issue Type{" "}
                    {aiAnalysis && (
                      <span className="text-blue-600">(AI Suggested)</span>
                    )}
                  </Label>
                  <Select
                    onValueChange={setIssueType}
                    value={issueType}
                    disabled={isAnalyzing}
                  >
                    <SelectTrigger
                      className={`w-full bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white ${
                        aiAnalysis ? "border-blue-300 bg-blue-50" : ""
                      }`}
                    >
                      <SelectValue
                        placeholder={
                          isAnalyzing
                            ? "Analyzing image..."
                            : "Select issue type"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-800">
                      <SelectItem value="pothole">Potholes</SelectItem>
                      <SelectItem value="streetlight">Malfunctioning streetlights</SelectItem>
                      <SelectItem value="garbage">Overflowing trash bins</SelectItem>
                      <SelectItem value="waterlogged">Water-logging</SelectItem>
                      <SelectItem value="cleanliness">Cleanliness</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Severity */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Severity Level{" "}
                    {aiAnalysis && (
                      <span className="text-blue-600">(AI Suggested)</span>
                    )}
                  </Label>
                  <Select
                    onValueChange={setSeverity}
                    value={severity}
                    disabled={isAnalyzing}
                  >
                    <SelectTrigger
                      className={`w-full bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white ${
                        aiAnalysis ? "border-blue-300 bg-blue-50" : ""
                      }`}
                    >
                      <SelectValue
                        placeholder={
                          isAnalyzing ? "Analyzing image..." : "Select severity"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-800">
                      <SelectItem value="low">
                        Low - Minor inconvenience
                      </SelectItem>
                      <SelectItem value="medium">
                        Medium - Affects traffic flow
                      </SelectItem>
                      <SelectItem value="high">High - Safety hazard</SelectItem>
                      <SelectItem value="critical">
                        Critical - Immediate danger
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Location */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Location
                  </Label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Enter address or coordinates"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={getCurrentLocation}
                      className="px-4 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                      disabled={isLocating}
                    >
                      {isLocating ? (
                        <>
                          <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2 inline-block" />
                          Locating...
                        </>
                      ) : (
                        <MapPin className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Additional Notes (Optional){" "}
                    {aiAnalysis && (
                      <span className="text-blue-600">(AI Suggested)</span>
                    )}
                  </Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={
                      isAnalyzing
                        ? "Analyzing image..."
                        : "Provide any additional details about the issue..."
                    }
                    className={`min-h-[100px] resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${
                      aiAnalysis ? "border-blue-300 bg-blue-50" : ""
                    }`}
                    disabled={isAnalyzing}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={
                    !selectedImage ||
                    !issueType ||
                    !severity ||
                    !location ||
                    isSubmitting ||
                    isAnalyzing
                  }
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 py-3 text-white dark:text-gray-900"
                >
                  {isAnalyzing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Analyzing Image...
                    </>
                  ) : isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Submitting Report...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Submit Report
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </div>
          {/* Report Preview + Tips (right column) */}
          <div className="flex flex-col gap-4 w-full md:col-span-1 md:min-h-[500px]">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 sm:p-8 transition-colors duration-500 w-full mx-auto">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Report Preview
              </h2>
              <CardContent>
                <div className="space-y-4">
                  {selectedImage && (
                    <div>
                      <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Photo
                      </h4>
                      <img
                        src={selectedImage}
                        alt="Preview"
                        className="w-full h-24 sm:h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                      />
                    </div>
                  )}
                  {issueType && (
                    <div>
                      <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Issue Type
                      </h4>
                      <p className="text-gray-600 dark:text-gray-400 capitalize">
                        {issueType.replace("-", " ")}
                      </p>
                    </div>
                  )}
                  {severity && (
                    <div>
                      <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Severity
                      </h4>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                          severity === "critical"
                            ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                            : severity === "high"
                            ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                            : severity === "medium"
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                            : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        }`}
                      >
                        {severity}
                      </span>
                    </div>
                  )}
                  {location && (
                    <div>
                      <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Location
                      </h4>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">
                        {location}
                      </p>
                    </div>
                  )}
                  {description && (
                    <div>
                      <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Notes
                      </h4>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">
                        {description}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </div>
            {/* Tips Card (right column on md+, below on mobile) */}
            <div className="bg-blue-50 dark:bg-gray-900 rounded-xl p-4 sm:p-6 text-left shadow border border-blue-100 dark:border-gray-700 hidden md:block">
              <h3 className="text-blue-700 dark:text-blue-300 font-semibold mb-2 flex items-center gap-2">
                <span>📝</span> Reporting Tips
              </h3>
              <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300 text-sm space-y-1">
                <li>Take clear photos showing the full extent of the issue</li>
                <li>Enable location services for accurate GPS coordinates</li>
                <li>Be specific in your description for faster resolution</li>
                <li>Check if the issue has already been reported nearby</li>
              </ul>
            </div>
          </div>
        </div>
        {/* Tips Card for mobile (below grid) */}
        <div className="bg-blue-50 dark:bg-gray-900 rounded-xl p-4 sm:p-6 mt-4 text-left shadow border border-blue-100 dark:border-gray-700 md:hidden w-full mx-auto">
          <h3 className="text-blue-700 dark:text-blue-300 font-semibold mb-2 flex items-center gap-2">
            <span>📝</span> Reporting Tips
          </h3>
          <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300 text-sm space-y-1">
            <li>Take clear photos showing the full extent of the issue</li>
            <li>Enable location services for accurate GPS coordinates</li>
            <li>Be specific in your description for faster resolution</li>
            <li>Check if the issue has already been reported nearby</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ReportPage;
