import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiStepRegister } from "@/components/auth/MultiStepRegister";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const Index = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<"contratante" | "arbitro" | null>(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isSignUpOpen, setIsSignUpOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    if (!loading && user && profile) {
      if (profile.role === "contratante") {
        navigate("/contratante");
      } else if (profile.role === "arbitro") {
        navigate("/arbitro-dashboard");
      }
    }
  }, [user, profile, loading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      toast.success("Login realizado com sucesso!");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const openAuth = async (role: "contratante" | "arbitro") => {
    // Ensure any existing session is cleared before starting new auth flow
    await supabase.auth.signOut();
    setSelectedRole(role);
    setIsLoginOpen(true);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-black overflow-hidden">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 z-0 opacity-60"
        style={{
          backgroundImage: "url('/assets/hero-bg.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="absolute inset-0 z-0 bg-gradient-to-t from-black via-black/80 to-black/40" />

      <div className="relative z-10 w-full max-w-md px-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-primary/20 border border-primary/40 mb-8 backdrop-blur-sm animate-pulse-glow shadow-[0_0_30px_-5px_rgba(34,197,94,0.3)]">
            <span className="text-5xl drop-shadow-lg">🏟️</span>
          </div>
          <h1 className="font-display text-5xl font-bold text-white tracking-tight mb-4 drop-shadow-xl">
            Apito
          </h1>
          <p className="text-gray-300 text-lg font-light leading-relaxed max-w-xs mx-auto mb-6">
            Eleve o nível do seu jogo. <br/>
            <span className="font-medium text-white">Contrate árbitros profissionais</span> ou <span className="font-medium text-white">gerencie sua carreira</span>.
          </p>
          
          <div className="flex items-center justify-center gap-3 bg-white/5 backdrop-blur-md py-2 px-4 rounded-full border border-white/10 w-fit mx-auto">
             <div className="flex -space-x-2">
               {[1,2,3].map(i => (
                 <div key={i} className="w-6 h-6 rounded-full bg-gray-600 border border-black flex items-center justify-center text-[8px] text-white overflow-hidden">
                    <img src={`https://i.pravatar.cc/150?u=${i + 10}`} alt="User" className="w-full h-full object-cover" />
                 </div>
               ))}
             </div>
             <p className="text-xs text-gray-300">
               Junte-se a <span className="text-primary font-bold">+500 árbitros</span> e <span className="text-primary font-bold">120 arenas</span>
             </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="space-y-4"
        >
          <p className="text-center text-sm font-medium text-gray-400 uppercase tracking-widest mb-6">Escolha seu perfil</p>

          <button
            onClick={() => openAuth("contratante")}
            className="w-full rounded-2xl border border-white/10 bg-white/5 p-6 text-left transition-all hover:bg-white/10 hover:border-primary/50 hover:shadow-[0_0_30px_-10px_rgba(34,197,94,0.2)] group backdrop-blur-md"
          >
            <div className="flex items-center gap-5">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 text-3xl group-hover:scale-110 transition-transform duration-300">
                📋
              </div>
              <div>
                <h2 className="font-display font-bold text-white text-xl mb-1 group-hover:text-primary transition-colors">Sou Contratante</h2>
                <p className="text-sm text-gray-400 leading-snug">Organizo jogos e preciso de um árbitro qualificado.</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => openAuth("arbitro")}
            className="w-full rounded-2xl border border-white/10 bg-white/5 p-6 text-left transition-all hover:bg-white/10 hover:border-primary/50 hover:shadow-[0_0_30px_-10px_rgba(34,197,94,0.2)] group backdrop-blur-md"
          >
            <div className="flex items-center gap-5">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 border border-blue-500/20 text-3xl group-hover:scale-110 transition-transform duration-300">
                ⚽
              </div>
              <div>
                <h2 className="font-display font-bold text-white text-xl mb-1 group-hover:text-blue-400 transition-colors">Sou Árbitro</h2>
                <p className="text-sm text-gray-400 leading-snug">Quero apitar partidas e receber por jogo.</p>
              </div>
            </div>
          </button>
        </motion.div>
      </div>

      {/* Login Dialog */}
      <Dialog open={isLoginOpen} onOpenChange={setIsLoginOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Login como {selectedRole === "contratante" ? "Contratante" : "Árbitro"}</DialogTitle>
            <DialogDescription>
              Entre com suas credenciais para continuar.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleLogin} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={authLoading}>
              {authLoading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
          <div className="text-center mt-4 text-sm">
            Não tem uma conta?{" "}
            <button
              onClick={() => {
                setIsLoginOpen(false);
                setIsSignUpOpen(true);
              }}
              className="text-primary hover:underline"
            >
              Cadastre-se
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* SignUp Dialog */}
      <Dialog open={isSignUpOpen} onOpenChange={setIsSignUpOpen}>
        <DialogContent className="max-w-xl">
           <MultiStepRegister 
             role={selectedRole || "contratante"} 
             onComplete={() => {
               // After completion, we can close the dialog. 
               // If the user is logged in, the useEffect will redirect them.
               // If email confirm is needed, they stay here but see success toast.
               setIsSignUpOpen(false);
             }}
             onCancel={() => {
               setIsSignUpOpen(false);
               setIsLoginOpen(true);
             }}
           />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
