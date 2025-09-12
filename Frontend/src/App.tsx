import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/hooks/useTheme";
import Index from "./pages/Index";
import { AuthProvider } from "./hooks/useAuth";
import ChatBox from "./components/ChatBox";
import { BrowserRouter as Router } from "react-router-dom";
import { useSmoothScroll } from "./hooks/useSmoothScroll";

const queryClient = new QueryClient();

function App() {
  // Initialize smooth scrolling for the entire app
  useSmoothScroll();

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <Router>
              <Index />
            </Router>
            <ChatBox />
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
