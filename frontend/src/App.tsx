import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/FastAPIAuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";

import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import CreateTask from "./pages/CreateTask";
import CycleCount from "./pages/CycleCount";
import TaskReview from "./pages/TaskReview";
import DataImport from "./pages/DataImport";
import { TestCsvUpload } from "./pages/TestCsvUpload";
import NotFound from "./pages/NotFound";
import AssetTransferCreate from "./pages/AssetTransferCreate";

const queryClient = new QueryClient();

// Get base path from environment variable
const getBasePath = () => {
  const basePath = import.meta.env.VITE_BASE_PATH;
  
  if (basePath) {
    // Remove trailing slash if present and ensure it starts with /
    return basePath.replace(/\/$/, '');
  }
  
  // Default to root when VITE_BASE_PATH is not defined
  return '/';
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter basename={getBasePath()}>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            } />
            <Route path="/create-task" element={
              <ProtectedRoute>
                <CreateTask />
              </ProtectedRoute>
            } />
            <Route path="/cycle-count/:taskId" element={
              <ProtectedRoute>
                <CycleCount />
              </ProtectedRoute>
            } />
            <Route path="/edit-task/:taskId" element={
              <ProtectedRoute>
                <CreateTask />
              </ProtectedRoute>
            } />
            <Route path="/task-review/:taskId" element={
              <ProtectedRoute>
                <TaskReview />
              </ProtectedRoute>
            } />
            <Route path="/data-import" element={
              <AdminRoute>
                <DataImport />
              </AdminRoute>
            } />
            <Route path="/test-csv-upload" element={
              <AdminRoute>
                <TestCsvUpload />
              </AdminRoute>
            } />
            <Route path="/asset-transfer/create" element={<AssetTransferCreate />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
