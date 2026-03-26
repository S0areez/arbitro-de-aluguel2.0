import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/MobileLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useUpdateProfile, useMatches, useReferees, useReviews, useTransactions } from "@/hooks/use-supabase";
import { useNavigate } from "react-router-dom";
import { StatusBadge } from "@/components/StatusBadge";
import { User, Mail, MapPin, Phone, LogOut, CalendarDays, Wallet, Trash2, AlertTriangle, Award, Briefcase, Flag, Plus, X, CalendarOff, FileText, Heart, History, Building, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Database } from "@/types/database.types";
import { SmartAvailabilityCalendar } from "@/components/SmartAvailabilityCalendar";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";

type Role = Database["public"]["Tables"]["profiles"]["Row"]["role"];

const MultiValueInput = ({
  label,
  icon: Icon,
  values,
  onChange,
  placeholder
}: {
  label: string;
  icon: any;
  values: string[];
  onChange: (vals: string[]) => void;
  placeholder: string;
}) => {
  const [currentValue, setCurrentValue] = useState("");

  const handleAdd = () => {
    if (currentValue.trim() && !values.includes(currentValue.trim())) {
      onChange([...values, currentValue.trim()]);
      setCurrentValue("");
    }
  };

  const handleRemove = (val: string) => {
    onChange(values.filter(v => v !== val));
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
        <Icon size={12} />
        {label}
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder={placeholder}
          value={currentValue}
          onChange={(e) => setCurrentValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAdd();
            }
          }}
          className="flex-1 rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary"
        />
        <Button
          onClick={handleAdd}
          type="button"
          size="icon"
          variant="secondary"
          className="shrink-0 rounded-xl"
        >
          <Plus size={18} />
        </Button>
      </div>

      {values.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {values.map((val) => (
            <Badge key={val} variant="secondary" className="pl-2 pr-1 py-1 gap-1 font-normal">
              {val}
              <button
                onClick={() => handleRemove(val)}
                className="hover:bg-destructive/20 rounded-full p-0.5 transition-colors"
              >
                <X size={12} />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

const PerfilUsuario = () => {
  const { user, profile, signOut, loading } = useAuth();
  const updateProfile = useUpdateProfile();
  const navigate = useNavigate();

  // Local state for form fields
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cidade, setCidade] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [contractorType, setContractorType] = useState("");
  const [mainSport, setMainSport] = useState("");
  const [bio, setBio] = useState("");
  const [hourlyRate, setHourlyRate] = useState<string>("");
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [federations, setFederations] = useState<string[]>([]);
  const [certifications, setCertifications] = useState<string[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [unavailableDates, setUnavailableDates] = useState<Date[]>([]);
  const [showCalendar, setShowCalendar] = useState(false);

  const equipmentOptions = ["Placar", "Cronômetro", "Cartões", "Apito", "Súmula"];

  // Sync state with profile data
  useEffect(() => {
    if (profile) {
      setNome(profile.full_name || "");
      setEmail(profile.email || user?.email || "");
      setTelefone(profile.phone || "");
      setCidade(profile.city || "");
      setCpfCnpj(profile.cpf_cnpj || "");
      setContractorType(profile.contractor_type || "");
      setMainSport(profile.main_sport || "");
      setBio(profile.bio || "");
      setHourlyRate(profile.hourly_rate?.toString() || "");
      setSelectedEquipment(profile.equipment || []);
      setFederations(profile.federations || []);
      setCertifications(profile.certifications || []);
      setSpecialties(profile.specialties || []);
      
      if (profile.unavailable_dates) {
        setUnavailableDates(profile.unavailable_dates.map(d => new Date(d + 'T12:00:00')));
      }
    } else {
      // Reset form if profile is not loaded yet (e.g. user switch)
      setNome("");
      setEmail(user?.email || "");
      setTelefone("");
      setCidade("");
      setCpfCnpj("");
      setContractorType("");
      setMainSport("");
      setBio("");
      setHourlyRate("");
      setSelectedEquipment([]);
      setFederations([]);
      setCertifications([]);
      setSpecialties([]);
      setUnavailableDates([]);
    }
  }, [profile, user]);

  const { data: historico } = useMatches(user?.id, profile?.role as Role);
  const { data: referees } = useReferees();
  const { data: reviews } = useReviews(user?.id);

  // Filter finished matches
  const finishedMatches = historico?.filter((c) => c.status === "finalizada") || [];

  // Level Calculation System
  useEffect(() => {
    if (!profile || profile.role !== "arbitro" || !finishedMatches || !reviews) return;

    // Calculate level based on matches and rating
    const totalMatches = finishedMatches.length;
    const avgRating = reviews && reviews.length > 0
      ? reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / reviews.length
      : 0;

    let newLevel = "bronze";
    
    if (totalMatches >= 100 && avgRating >= 4.8) newLevel = "black";
    else if (totalMatches >= 30 && avgRating >= 4.7) newLevel = "ouro";
    else if (totalMatches >= 10 && avgRating >= 4.5) newLevel = "prata";

    if (profile.level !== newLevel) {
      const updates: any = { level: newLevel };
      
      // Automatic 20% increase for Black level
      if (newLevel === "black" && profile.level !== "black") {
         const currentRate = profile.hourly_rate || 0;
         updates.hourly_rate = Math.round(currentRate * 1.2);
         toast.success("Parabéns! Você atingiu o nível Black! Seu valor hora foi reajustado em +20%.");
      }

      updateProfile.mutate({
        id: profile.id,
        updates
      });
    }
  }, [finishedMatches, reviews, profile]);

  const { data: transactions } = useTransactions(user?.id);

  const handleSave = () => {
    if (!user) return;

    let updates: any = {
      full_name: nome,
      phone: telefone,
      city: cidade,
      cpf_cnpj: cpfCnpj,
      // Common fields
    };

    if (profile?.role === "arbitro") {
      const rate = parseFloat(hourlyRate);
      if (isNaN(rate) || rate < 20 || rate > 1000) {
        toast.error("O valor da hora deve estar entre R$ 20 e R$ 1000.");
        return;
      }
      updates = {
        ...updates,
        hourly_rate: rate,
        equipment: selectedEquipment,
        federations,
        certifications,
        specialties,
        bio,
        unavailable_dates: unavailableDates.map(d => format(d, 'yyyy-MM-dd')),
      };
    } else {
      // Contractor specific
      updates = {
        ...updates,
        contractor_type: contractorType,
        main_sport: mainSport,
      };
    }

    updateProfile.mutate({
      id: user.id,
      updates,
    });
  };

  const handleEquipmentToggle = (item: string) => {
    if (selectedEquipment.includes(item)) {
      setSelectedEquipment(selectedEquipment.filter((i) => i !== item));
    } else {
      setSelectedEquipment([...selectedEquipment, item]);
    }
  };

  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (!user) return;
    setIsDeleting(true);

    try {
      // 1. Check for active matches
      const { data: activeMatches, error: matchError } = await supabase
        .from("matches")
        .select("id")
        .or(`contractor_id.eq.${user.id},referee_id.eq.${user.id}`)
        .in("status", ["pendente", "aceita", "a_caminho", "em_andamento"]);

      if (matchError) throw matchError;

      if (activeMatches && activeMatches.length > 0) {
        toast.error("Não é possível excluir a conta com partidas ativas. Finalize ou cancele suas partidas primeiro.");
        setIsDeleting(false);
        return;
      }

      // 2. Delete user account (both auth and profile)
      // We use a custom RPC function that runs with SECURITY DEFINER privileges
      // to delete the user from auth.users, which cascades to public.profiles
      const { error: deleteError } = await (supabase.rpc as any)('delete_user');

      if (deleteError) throw deleteError;

      toast.success("Conta excluída permanentemente.");
      await signOut();
      navigate("/");
    } catch (error: any) {
      console.error("Error deleting account:", error);
      toast.error("Erro ao excluir conta: " + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <MobileLayout>
        <div className="flex items-center justify-center h-screen">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </MobileLayout>
    );
  }

  const getLevelColor = (level: string | null) => {
    switch (level) {
      case 'black': return 'bg-black text-white border-white/20';
      case 'ouro': return 'bg-yellow-400 text-yellow-950 border-yellow-600/20';
      case 'prata': return 'bg-slate-300 text-slate-800 border-slate-400/20';
      case 'bronze': return 'bg-orange-700/80 text-orange-100 border-orange-800/20';
      default: return 'bg-orange-700/80 text-orange-100 border-orange-800/20';
    }
  };

  return (
    <MobileLayout>
      <div className="px-4 pt-6 space-y-6">
        <div className="rounded-2xl p-4 bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-500 text-white shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs opacity-90">Você está logado como</p>
              <h1 className="font-display text-2xl font-black">{profile?.full_name || user?.email}</h1>
              <span className="mt-1 inline-flex items-center text-[10px] uppercase font-bold tracking-wider bg-white/10 text-white px-2 py-1 rounded-full">
                {profile?.role}
              </span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 text-xs bg-white/10 text-white hover:bg-white/15 border-white/20"
              onClick={async () => {
                if (!profile) return;
                const newRole = profile.role === 'arbitro' ? 'contratante' : 'arbitro';
                const { error } = await (supabase
                  .from('profiles') as any)
                  .update({ role: newRole })
                  .eq('id', profile.id);
                
                if (error) {
                  toast.error("Erro ao alterar: " + error.message);
                } else {
                  toast.success(`Alterado para ${newRole}.`);
                  window.location.reload();
                }
              }}
            >
              Trocar para {profile?.role === 'arbitro' ? 'Contratante' : 'Árbitro'}
            </Button>
          </div>
          <div className="mt-4 flex flex-col items-center">
            <div className="w-24 h-24 rounded-full bg-black/10 border-4 border-white/20 overflow-hidden flex items-center justify-center">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.full_name || "Avatar"} className="w-full h-full object-cover" />
              ) : (
                <User size={36} />
              )}
            </div>
            <div className="flex gap-2 mt-3 items-center">
              <span className="text-xs capitalize bg-white/10 px-3 py-1 rounded-full">
                {profile?.role || "Usuário"}
              </span>
              {profile?.role === 'arbitro' && (
                <span className={`text-xs capitalize px-3 py-1 rounded-full border ${getLevelColor(profile?.level)}`}>
                  Nível {profile?.level || 'bronze'}
                </span>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 text-[10px] px-2 text-white/90 hover:text-white"
                onClick={async () => {
                  if (!profile) return;
                  const newRole = profile.role === 'arbitro' ? 'contratante' : 'arbitro';
                  const { error } = await (supabase
                    .from('profiles') as any)
                    .update({ role: newRole })
                    .eq('id', profile.id);
                  
                  if (error) {
                    toast.error("Erro ao alterar tipo de conta: " + error.message);
                  } else {
                    toast.success(`Conta alterada para ${newRole}. Recarregando...`);
                    setTimeout(() => window.location.reload(), 1000);
                  }
                }}
              >
                (Trocar Tipo)
              </Button>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground/80 mb-2">
            {profile?.role === "arbitro" ? "Dados Profissionais" : "Dados do Contratante"}
          </h2>
          
          {[
            { icon: User, label: "Nome", value: nome, onChange: setNome },
            { icon: Mail, label: "Email", value: email, onChange: setEmail, disabled: true },
            { icon: Phone, label: "Telefone", value: telefone, onChange: setTelefone },
            { icon: MapPin, label: "Cidade", value: cidade, onChange: setCidade },
            { icon: FileText, label: "CPF/CNPJ", value: cpfCnpj, onChange: setCpfCnpj },
          ].map((field: any) => (
            <div key={field.label}>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block flex items-center gap-1">
                <field.icon size={12} />
                {field.label}
              </label>
              <input
                type={field.type || "text"}
                placeholder={field.placeholder}
                value={field.value}
                disabled={field.disabled}
                onChange={(e) => field.onChange && field.onChange(e.target.value)}
                className="w-full rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-foreground focus:outline-none focus:border-blue-500 disabled:opacity-50"
              />
            </div>
          ))}

          {/* Contractor Specific Fields */}
          {profile?.role === "contratante" && (
            <>
               <div className="grid grid-cols-2 gap-3">
                 <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block flex items-center gap-1">
                      <Building size={12} />
                      Tipo de Contratante
                    </label>
                    <select
                      value={contractorType}
                      onChange={(e) => setContractorType(e.target.value)}
                      className="w-full rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-foreground focus:outline-none focus:border-blue-500 appearance-none"
                    >
                      <option value="">Selecione...</option>
                      <option value="Liga">Liga</option>
                      <option value="Time">Time</option>
                      <option value="Escola">Escola</option>
                      <option value="Empresa">Empresa</option>
                      <option value="Outro">Outro</option>
                    </select>
                 </div>
                 <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block flex items-center gap-1">
                      <Trophy size={12} />
                      Esporte Principal
                    </label>
                    <input
                      value={mainSport}
                      onChange={(e) => setMainSport(e.target.value)}
                      placeholder="Ex: Futebol"
                      className="w-full rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-foreground focus:outline-none focus:border-blue-500"
                    />
                 </div>
               </div>

               {/* Favorites Section (Mock) */}
               <div className="pt-4">
                  <h3 className="text-sm font-semibold text-foreground/80 mb-2 flex items-center gap-2">
                    <Heart size={14} className="text-primary" />
                    Árbitros Favoritos
                  </h3>
                  <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-center">
                    <p className="text-xs text-muted-foreground">Você ainda não favoritou nenhum árbitro.</p>
                  </div>
               </div>

               {/* Payment History Section */}
               <div className="pt-4">
                  <h3 className="text-sm font-semibold text-foreground/80 mb-2 flex items-center gap-2">
                    <History size={14} className="text-primary" />
                    Histórico de Pagamentos
                  </h3>
                  {transactions && transactions.length > 0 ? (
                    <div className="space-y-2">
                      {transactions.slice(0, 3).map((t) => (
                        <div key={t.id} className="flex justify-between items-center bg-slate-900/60 border border-slate-800 p-3 rounded-2xl">
                           <span className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</span>
                           <span className="text-sm font-medium">R$ {t.amount}</span>
                           <Badge variant={t.type === 'entrada' ? 'default' : t.type === 'saida' ? 'destructive' : 'secondary'}>
                             {t.type === 'entrada' ? 'Entrada' : t.type === 'saida' ? 'Saída' : 'Saque'}
                           </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-center">
                      <p className="text-xs text-muted-foreground">Nenhum pagamento registrado.</p>
                    </div>
                  )}
               </div>
            </>
          )}

          {/* Referee Specific Fields */}
          {profile?.role === "arbitro" && (
            <>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block flex items-center gap-1">
                  <Wallet size={12} />
                  Valor Hora (R$)
                </label>
                <input
                  type="number"
                  placeholder="Min: 20, Max: 1000"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  className="w-full rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-foreground focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block flex items-center gap-1">
                  <FileText size={12} />
                  Bio
                </label>
                <textarea
                  placeholder="Conte um pouco sobre sua experiência..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  className="w-full rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-foreground focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <MultiValueInput
                label="Federações"
                icon={Flag}
                values={federations}
                onChange={setFederations}
                placeholder="Ex: FPF, CBF"
              />
              <MultiValueInput
                label="Certificações"
                icon={Award}
                values={certifications}
                onChange={setCertifications}
                placeholder="Ex: Curso de Arbitragem 2023"
              />
              <MultiValueInput
                label="Especialidades"
                icon={Briefcase}
                values={specialties}
                onChange={setSpecialties}
                placeholder="Ex: Futsal, Campo, Society"
              />

              <div className="space-y-2 pt-2">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <CalendarOff size={12} />
                  Indisponibilidade
                </label>
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-sm text-muted-foreground">Gerencie seus dias de folga e compromissos.</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setShowCalendar(!showCalendar)}
                    >
                      {showCalendar ? "Ocultar Calendário" : "Gerenciar Datas"}
                    </Button>
                  </div>
                  
                  {showCalendar && (
                    <div className="mb-4 animate-in fade-in zoom-in-95 duration-200">
                      <SmartAvailabilityCalendar 
                        selectedDates={unavailableDates}
                        onSelect={(dates) => setUnavailableDates(dates || [])}
                      />
                    </div>
                  )}

                  {unavailableDates.length > 0 && !showCalendar && (
                    <div className="flex flex-wrap gap-2">
                      {unavailableDates
                        .sort((a, b) => a.getTime() - b.getTime())
                        .slice(0, 5)
                        .map((date, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {format(date, "dd/MM")}
                        </Badge>
                      ))}
                      {unavailableDates.length > 5 && (
                        <Badge variant="outline" className="text-xs">+{unavailableDates.length - 5}</Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-2 pt-2">
                <label className="text-xs font-medium text-muted-foreground block">Equipamento Próprio</label>
                <div className="flex flex-wrap gap-2">
                {equipmentOptions.map((item) => (
                  <button
                    key={item}
                    onClick={() => {
                      if (selectedEquipment.includes(item)) {
                        setSelectedEquipment(selectedEquipment.filter((e) => e !== item));
                      } else {
                        setSelectedEquipment([...selectedEquipment, item]);
                      }
                    }}
                    className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors border ${
                      selectedEquipment.includes(item)
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-card border-border text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
            </>
          )}

          <Button onClick={handleSave} disabled={updateProfile.isPending} className="w-full rounded-xl">
            {updateProfile.isPending ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>

        {/* Histórico */}
        <section>
          <h2 className="font-display text-lg font-semibold text-foreground mb-3">Histórico de Partidas</h2>
          <div className="space-y-2">
            {finishedMatches.map((c) => {
              const arb = referees?.find((a) => a.id === c.referee_id);
              return (
                <div key={c.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-foreground">{c.modality}</span>
                    <StatusBadge status={c.status} />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CalendarDays size={11} />
                    <span>{new Date(c.date).toLocaleDateString()}</span>
                    {arb && <span>• {arb.full_name}</span>}
                    <span className="ml-auto font-medium text-foreground">R$ {c.price}</span>
                  </div>
                </div>
              );
            })}
            {finishedMatches.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma partida no histórico.</p>}
          </div>
        </section>

        {/* Logout */}
        <Button onClick={handleLogout} variant="outline" className="w-full rounded-full text-muted-foreground border-slate-800 hover:bg-slate-800">
          <LogOut size={16} className="mr-2" /> Sair
        </Button>

        {/* Zona de Perigo */}
        <section className="pt-6 border-t border-border mt-8">
          <h3 className="font-display text-sm font-semibold text-destructive mb-2 flex items-center gap-2">
            <AlertTriangle size={16} />
            Zona de Perigo
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            Ações irreversíveis. Ao excluir sua conta, seus dados serão removidos permanentemente.
          </p>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="w-full rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50">
                <Trash2 size={16} className="mr-2" />
                Excluir Minha Conta
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-xl border-destructive/20">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-destructive">Você tem certeza absoluta?</AlertDialogTitle>
                <AlertDialogDescription>
                  Essa ação não pode ser desfeita. Isso excluirá permanentemente seu perfil e dados associados do sistema.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-lg">Cancelar</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={(e) => {
                    e.preventDefault();
                    handleDeleteAccount();
                  }} 
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-lg"
                >
                  {isDeleting ? "Excluindo..." : "Sim, excluir conta"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </section>
      </div>
    </MobileLayout>
  );
};

export default PerfilUsuario;
