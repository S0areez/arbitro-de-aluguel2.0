import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, Search, Wallet, User, FileText, LayoutDashboard } from "lucide-react";

export const BottomNav = () => {
  const { profile } = useAuth();
  const role = profile?.role;
  const navigate = useNavigate();
  const location = useLocation();

  const contratanteItems = [
    { icon: LayoutDashboard, label: "Início", path: "/contratante" },
    { icon: Search, label: "Buscar", path: "/busca" },
    { icon: Wallet, label: "Carteira", path: "/carteira" },
    { icon: User, label: "Perfil", path: "/perfil" },
  ];

  const arbitroItems = [
    { icon: LayoutDashboard, label: "Início", path: "/arbitro-dashboard" },
    { icon: FileText, label: "Pedidos", path: "/solicitacoes" },
    { icon: Wallet, label: "Carteira", path: "/carteira" },
    { icon: User, label: "Perfil", path: "/perfil" },
  ];

  const items = role === "arbitro" ? arbitroItems : contratanteItems;

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md border-t border-slate-800 bg-slate-900/95 backdrop-blur-lg z-50">
      <div className="flex items-center justify-around py-2">
        {items.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 transition-colors ${
                isActive ? "text-cyan-500" : "text-slate-400 hover:text-white"
              }`}
            >
              <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
