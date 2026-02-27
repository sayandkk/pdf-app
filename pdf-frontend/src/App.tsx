import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/layout/Layout";
import Index from "./pages/Index";
import Login from "./pages/Login";
import { Users } from "./pages/Users";
import { Analytics } from "./pages/Analytics";
import AuditLogs from "./pages/AuditLogs";
import { PdfToWord } from "./pages/tools/PdfToWord";
import { WordToPdf } from "./pages/tools/WordToPdf";
import { ImageToPdf } from "./pages/tools/ImageToPdf";
import { PdfCompression } from "./pages/tools/PdfCompression";
import { PdfMergeSplit } from "./pages/tools/PdfMergeSplit";
import { OcrScanner } from "./pages/tools/OcrScanner";
import { PdfEditor } from "./pages/tools/PdfEditor";
import { ESignature } from "./pages/tools/ESignature";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Index />} />
            <Route
              path="/users"
              element={
                <ProtectedRoute requiredRole="admin">
                  <Layout>
                    <Users />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <ProtectedRoute requiredRole="admin">
                  <Layout>
                    <Analytics />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/tools/pdf-to-word"
              element={
                <ProtectedRoute>
                  <Layout>
                    <PdfToWord />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/tools/word-to-pdf"
              element={
                <ProtectedRoute>
                  <Layout>
                    <WordToPdf />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/tools/image-to-pdf"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ImageToPdf />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/tools/compression"
              element={
                <ProtectedRoute>
                  <Layout>
                    <PdfCompression />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/tools/merge-split"
              element={
                <ProtectedRoute>
                  <Layout>
                    <PdfMergeSplit />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/tools/ocr"
              element={
                <ProtectedRoute>
                  <Layout>
                    <OcrScanner />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/tools/editor"
              element={
                <ProtectedRoute>
                  <Layout>
                    <PdfEditor />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/tools/signature"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ESignature />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/tools/*"
              element={
                <ProtectedRoute>
                  <Layout>
                    <div className="p-6">
                      <h1 className="text-3xl font-bold mb-4">Document Tools</h1>
                      <p className="text-muted-foreground">Select a tool from the sidebar to get started with document processing.</p>
                    </div>
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/roles"
              element={
                <ProtectedRoute requiredRole="admin">
                  <Layout>
                    <div className="p-6">
                      <h1 className="text-3xl font-bold mb-4">Role Management</h1>
                      <p className="text-muted-foreground">Manage user roles and permissions.</p>
                    </div>
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/audit"
              element={
                <ProtectedRoute requiredRole="admin">
                  <Layout>
                    <AuditLogs />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/integrations"
              element={
                <ProtectedRoute requiredRole="admin">
                  <Layout>
                    <div className="p-6">
                      <h1 className="text-3xl font-bold mb-4">Third-party Integrations</h1>
                      <p className="text-muted-foreground">Connect with Microsoft 365, Google Workspace, and other services.</p>
                    </div>
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Layout>
                    <div className="p-6">
                      <h1 className="text-3xl font-bold mb-4">Settings</h1>
                      <p className="text-muted-foreground">Configure platform settings and preferences.</p>
                    </div>
                  </Layout>
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
