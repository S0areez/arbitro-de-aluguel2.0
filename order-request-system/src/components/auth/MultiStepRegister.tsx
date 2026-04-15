import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Upload, ShieldCheck, Trophy } from "lucide-react";

interface MultiStepRegisterProps {
  role: "contratante" | "arbitro";
  onComplete: () => void;
  onCancel: () => void;
}

export function MultiStepRegister({ role, onComplete, onCancel }: MultiStepRegisterProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    phone: "",
    cpfCnpj: "",
    city: "",
    modalities: [] as string[],
    hourlyRate: "",
    experienceLevel: "",
    bio: "",
    contractorType: "",
    mainSport: "",
    documentFile: null as File | null,
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleModalityToggle = (modality: string) => {
    setFormData((prev) => {
      const current = prev.modalities;
      if (current.includes(modality)) {
        return { ...prev, modalities: current.filter((m) => m !== modality) };
      } else {
        return { ...prev, modalities: [...current, modality] };
      }
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData((prev) => ({ ...prev, documentFile: e.target.files![0] }));
    }
  };

  const validateStep1 = () => {
    if (!formData.fullName || !formData.email || !formData.password || !formData.phone) {
      toast.error("Preencha todos os campos obrigatórios.");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (role === "arbitro") {
      if (!formData.cpfCnpj || !formData.city || formData.modalities.length === 0 || !formData.hourlyRate || !formData.experienceLevel) {
        toast.error("Preencha todos os campos obrigatórios.");
        return false;
      }
    } else {
      if (!formData.cpfCnpj || !formData.contractorType || !formData.city || !formData.mainSport) {
        toast.error("Preencha todos os campos obrigatórios.");
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) setStep(2);
    if (step === 2 && validateStep2()) setStep(3);
  };

  const handleSubmit = async () => {
    if (!formData.documentFile) {
      toast.error("Por favor, envie um documento de identificação.");
      return;
    }

    setLoading(true);
    try {
      // 1. Create User
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            role: role,
          },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        // 2. Upload Document
        let documentUrl = null;
        if (formData.documentFile) {
          const fileExt = formData.documentFile.name.split(".").pop();
          const fileName = `${authData.user.id}/${Date.now()}.${fileExt}`;
          const { error: uploadError, data: uploadData } = await supabase.storage
            .from("documents")
            .upload(fileName, formData.documentFile);

          if (!uploadError && uploadData) {
            documentUrl = uploadData.path;
          }
        }

        // 3. Update Profile
        const updateData: any = {
          full_name: formData.fullName,
          role: role, // Explicitly set role
          phone: formData.phone,
          city: formData.city,
          cpf_cnpj: formData.cpfCnpj,
          document_url: documentUrl,
          is_verified: false, // Verification pending
        };

        if (role === "arbitro") {
          updateData.modalities = formData.modalities;
          updateData.hourly_rate = parseFloat(formData.hourlyRate);
          updateData.experience_level = formData.experienceLevel;
          updateData.bio = formData.bio;
        } else {
          updateData.contractor_type = formData.contractorType;
          updateData.main_sport = formData.mainSport;
        }

        // We try to update immediately. If RLS blocks it (due to email confirm),
        // the user will have to update profile later.
        const { error: updateError } = await supabase
          .from("profiles")
          .update(updateData as never)
          .eq("id", authData.user.id);

        if (updateError) {
          console.error("Error updating profile:", updateError);
          // Don't throw here, as the user is created. Just warn.
          toast.warning("Conta criada, mas houve um erro ao salvar detalhes do perfil. Por favor, complete seu perfil depois.");
        } else {
          toast.success("Cadastro realizado com sucesso! Verifique seu email.");
        }
        
        onComplete();
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-1">
      {/* Progress Steps */}
      <div className="flex justify-between mb-8 relative">
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-200 -z-10" />
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
              step >= s ? "bg-primary text-primary-foreground" : "bg-gray-200 text-gray-500"
            }`}
          >
            {s}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4"
          >
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-foreground">Credenciais Básicas</h2>
              <p className="text-sm text-muted-foreground">Comece sua jornada no Apito.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">Nome Completo</Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => handleInputChange("fullName", e.target.value)}
                placeholder="Ex: João Silva"
                className="focus-visible:ring-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="seu@email.com"
                className="focus-visible:ring-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone (WhatsApp)</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                placeholder="(11) 99999-9999"
                className="focus-visible:ring-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                className="focus-visible:ring-primary"
              />
            </div>

            <Button onClick={handleNext} className="w-full mt-4">
              Próximo
            </Button>
            <Button variant="ghost" onClick={onCancel} className="w-full">
              Cancelar
            </Button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4"
          >
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-foreground">
                {role === "arbitro" ? "Perfil Profissional" : "Detalhes do Contratante"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {role === "arbitro"
                  ? "Destaque suas habilidades para conseguir mais jogos."
                  : "Personalize sua experiência para encontrar os melhores árbitros."}
              </p>
            </div>

            {role === "arbitro" ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="cpfCnpj">CPF</Label>
                  <Input
                    id="cpfCnpj"
                    value={formData.cpfCnpj}
                    onChange={(e) => handleInputChange("cpfCnpj", e.target.value)}
                    placeholder="000.000.000-00"
                    className="focus-visible:ring-primary"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">Cidade de Atuação</Label>
                    <Select onValueChange={(val) => handleInputChange("city", val)} value={formData.city}>
                      <SelectTrigger className="focus:ring-primary">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="São Paulo">São Paulo</SelectItem>
                        <SelectItem value="Rio de Janeiro">Rio de Janeiro</SelectItem>
                        <SelectItem value="Belo Horizonte">Belo Horizonte</SelectItem>
                        <SelectItem value="Curitiba">Curitiba</SelectItem>
                        <SelectItem value="Porto Alegre">Porto Alegre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hourlyRate">Valor Hora (R$)</Label>
                    <Input
                      id="hourlyRate"
                      type="number"
                      value={formData.hourlyRate}
                      onChange={(e) => handleInputChange("hourlyRate", e.target.value)}
                      placeholder="Ex: 50"
                      className="focus-visible:ring-primary"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Modalidades</Label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: "futsal", label: "Futsal" },
                      { id: "futebol", label: "Campo" },
                      { id: "society", label: "Society" },
                      { id: "basquete", label: "Basquete" },
                      { id: "volei", label: "Vôlei" }
                    ].map((mod) => (
                      <div key={mod.id} className="flex items-center space-x-2 border p-2 rounded-md hover:bg-accent/50 transition-colors">
                        <Checkbox
                          id={`mod-${mod.id}`}
                          checked={formData.modalities.includes(mod.id)}
                          onCheckedChange={() => handleModalityToggle(mod.id)}
                        />
                        <Label htmlFor={`mod-${mod.id}`} className="cursor-pointer font-normal">
                          {mod.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="experienceLevel">Experiência</Label>
                  <Select onValueChange={(val) => handleInputChange("experienceLevel", val)} value={formData.experienceLevel}>
                    <SelectTrigger className="focus:ring-primary">
                      <SelectValue placeholder="Selecione seu nível" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="junior">Júnior (0-2 anos)</SelectItem>
                      <SelectItem value="pleno">Pleno (2-5 anos)</SelectItem>
                      <SelectItem value="senior">Sênior (+5 anos)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio / Resumo</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => handleInputChange("bio", e.target.value)}
                    placeholder="Conte um pouco sobre sua experiência..."
                    className="focus-visible:ring-primary"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="cpfCnpj">CPF / CNPJ</Label>
                  <Input
                    id="cpfCnpj"
                    value={formData.cpfCnpj}
                    onChange={(e) => handleInputChange("cpfCnpj", e.target.value)}
                    placeholder="Documento para recibos"
                    className="focus-visible:ring-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contractorType">Tipo de Contratante</Label>
                  <Select onValueChange={(val) => handleInputChange("contractorType", val)} value={formData.contractorType}>
                    <SelectTrigger className="focus:ring-primary">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pessoa_fisica">Pessoa Física</SelectItem>
                      <SelectItem value="arena">Arena de Esportes</SelectItem>
                      <SelectItem value="liga">Liga / Federação</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">Cidade Sede</Label>
                    <Select onValueChange={(val) => handleInputChange("city", val)} value={formData.city}>
                      <SelectTrigger className="focus:ring-primary">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="São Paulo">São Paulo</SelectItem>
                        <SelectItem value="Rio de Janeiro">Rio de Janeiro</SelectItem>
                        <SelectItem value="Belo Horizonte">Belo Horizonte</SelectItem>
                        <SelectItem value="Curitiba">Curitiba</SelectItem>
                        <SelectItem value="Porto Alegre">Porto Alegre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mainSport">Esporte Principal</Label>
                    <Select onValueChange={(val) => handleInputChange("mainSport", val)} value={formData.mainSport}>
                      <SelectTrigger className="focus:ring-primary">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="futsal">Futsal</SelectItem>
                        <SelectItem value="futebol">Campo</SelectItem>
                        <SelectItem value="society">Society</SelectItem>
                        <SelectItem value="basquete">Basquete</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}

            <div className="flex gap-3 mt-6">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                Voltar
              </Button>
              <Button onClick={handleNext} className="flex-1">
                Próximo
              </Button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            <div className="text-center relative rounded-xl overflow-hidden mb-6 py-8 px-4 bg-gradient-to-br from-primary/90 to-primary/70 text-white shadow-lg">
              <div className="absolute inset-0 bg-[url('/assets/register-bg.jpg')] opacity-20 bg-cover bg-center mix-blend-overlay"></div>
              <ShieldCheck className="w-12 h-12 mx-auto mb-3 text-white" />
              <h2 className="text-2xl font-bold font-display">Verificação de Segurança</h2>
              <p className="text-white/90 text-sm mt-1">
                Junte-se a <span className="font-bold">+500 árbitros</span> e <span className="font-bold">120 arenas</span> já cadastrados.
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-secondary/50 p-4 rounded-lg border border-border/50">
                <div className="flex items-start gap-3">
                  <Trophy className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <h3 className="font-medium text-sm">Seja um Membro Verificado</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Envie uma foto do seu documento (RG ou CNH) para ganhar o selo de verificação e aumentar sua credibilidade.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="document">Foto do Documento (RG/CNH)</Label>
                <div className="flex items-center justify-center w-full">
                  <label
                    htmlFor="document-upload"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-secondary/50 transition-colors border-muted-foreground/25"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        {formData.documentFile ? (
                          <span className="text-primary font-medium">{formData.documentFile.name}</span>
                        ) : (
                          <>
                            <span className="font-semibold">Clique para enviar</span> ou arraste
                          </>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-1">PNG, JPG ou PDF (MAX. 5MB)</p>
                    </div>
                    <input id="document-upload" type="file" className="hidden" onChange={handleFileChange} accept="image/*,.pdf" />
                  </label>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="outline" onClick={() => setStep(2)} className="flex-1" disabled={loading}>
                Voltar
              </Button>
              <Button onClick={handleSubmit} className="flex-1 bg-primary hover:bg-primary/90 text-white" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Finalizando...
                  </>
                ) : (
                  "Finalizar Cadastro"
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
