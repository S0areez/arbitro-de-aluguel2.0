import React, { Suspense, useMemo } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
const Index = React.lazy(() => import("./pages/Index"));
const ContratanteDashboard = React.lazy(() => import("./pages/ContratanteDashboard"));
const BuscaArbitros = React.lazy(() => import("./pages/BuscaArbitros"));
const PerfilArbitro = React.lazy(() => import("./pages/PerfilArbitro"));
const Checkout = React.lazy(() => import("./pages/Checkout"));
const ModoPartidaContratante = React.lazy(() => import("./pages/ModoPartidaContratante"));
const ArbitroDashboard = React.lazy(() => import("./pages/ArbitroDashboard"));
const Solicitacoes = React.lazy(() => import("./pages/Solicitacoes"));
const Carteira = React.lazy(() => import("./pages/Carteira"));
const PerfilUsuario = React.lazy(() => import("./pages/PerfilUsuario"));
const LeagueManagement = React.lazy(() => import("./pages/LeagueManagement"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const SeedData = React.lazy(() => import("./pages/SeedData"));
const PaymentScreen = React.lazy(() => import("./pages/PaymentScreen")); // NOVO
import { useAuth } from "@/contexts/AuthContext";
import { RealtimeNotifications } from "@/components/RealtimeNotifications";

const queryClient = new QueryClient();

const Protected: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user } = useAuth();
  const isAuthed = useMemo(() => !!user, [user]);
  if (!isAuthed) return <Navigate to="/" replace />;
  return children;
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <RealtimeNotifications />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Suspense fallback={<div className="p-6 text-center text-muted-foreground">Carregando...</div>}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/contratante" element={<Protected><ContratanteDashboard /></Protected>} />
                <Route path="/busca" element={<Protected><BuscaArbitros /></Protected>} />
                <Route path="/arbitro/:id" element={<Protected><PerfilArbitro /></Protected>} />
                <Route path="/checkout/:arbitroId" element={<Protected><Checkout /></Protected>} />
                <Route path="/payment/:matchId" element={<Protected><PaymentScreen /></Protected>} /> {/* NOVA ROTA */}
                <Route path="/partida/:id" element={<Protected><ModoPartidaContratante /></Protected>} />
                <Route path="/arbitro-dashboard" element={<Protected><ArbitroDashboard /></Protected>} />
                <Route path="/solicitacoes" element={<Protected><Solicitacoes /></Protected>} />
                <Route path="/carteira" element={<Protected><Carteira /></Protected>} />
                <Route path="/perfil" element={<Protected><PerfilUsuario /></Protected>} />
                <Route path="/league-management" element={<Protected><LeagueManagement /></Protected>} />
                <Route path="/seed" element={<Protected><SeedData /></Protected>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
