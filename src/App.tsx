import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppSidebar from "@/components/app-sidebar";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import PIQ from "./pages/PIQ";
import PIQForm from "./pages/PIQForm";
import PPDT from "./pages/PPDT";
import SRT from "./pages/SRT";
import WAT from "./pages/WAT";
import Auth from "./pages/Auth";
import Landing from "./pages/Landing";
import Results from "./pages/Results";
import Settings from "./pages/Settings";
import Feedback from "./pages/Feedback";
import Interview from "./pages/Interview";
import NotFound from "./pages/NotFound";
import RoomRegister from "./pages/RoomRegister";
import RoomJoin from "./pages/RoomJoin";
import RoomSession from "./pages/RoomSession";
import Subscription from "./pages/Subscription";
import MobileUpload from "./pages/MobileUpload";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";

const queryClient = new QueryClient();

const AppContent = () => {
  const { user, signOut, loading } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background relative">
        {/* Show sidebar and toggle only for authenticated users */}
        {user && (
          <>
            <SidebarTrigger className="fixed top-4 left-4 z-50 bg-card border shadow-lg" />
            <AppSidebar />
          </>
        )}
        
        <main className={user ? "flex-1" : "w-full"}>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={
              user ? (
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              ) : (
                <Landing />
              )
            } />
              <Route path="/piq" element={
                <ProtectedRoute>
                  <PIQ />
                </ProtectedRoute>
              } />
              <Route path="/piq" element={
                <ProtectedRoute>
                  <PIQForm />
                </ProtectedRoute>
              } />
              <Route path="/ppdt" element={
                <ProtectedRoute>
                  <PPDT />
                </ProtectedRoute>
              } />
              <Route path="/srt" element={
                <ProtectedRoute>
                  <SRT />
                </ProtectedRoute>
              } />
              <Route path="/wat" element={
                <ProtectedRoute>
                  <WAT />
                </ProtectedRoute>
              } />
              <Route path="/interview" element={
                <ProtectedRoute>
                  <Interview />
                </ProtectedRoute>
              } />
              <Route path="/results" element={
                <ProtectedRoute>
                  <Results />
                </ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              } />
              <Route path="/feedback" element={
                <ProtectedRoute>
                  <Feedback />
                </ProtectedRoute>
              } />
              <Route path="/rooms/register" element={
                <ProtectedRoute>
                  <RoomRegister />
                </ProtectedRoute>
              } />
              <Route path="/rooms/join" element={
                <ProtectedRoute>
                  <RoomJoin />
                </ProtectedRoute>
              } />
              <Route path="/rooms/session/:roomId" element={
                <ProtectedRoute>
                  <RoomSession />
                </ProtectedRoute>
              } />
              <Route path="/subscription" element={
                <ProtectedRoute>
                  <Subscription />
                </ProtectedRoute>
              } />
              
              {/* Mobile upload route - accessible without sidebar */}
              <Route path="/mobile-upload" element={<MobileUpload />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
        </main>
      </div>
    </SidebarProvider>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
