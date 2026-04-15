import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const SeedData = () => {
  const [status, setStatus] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addLog = (msg: string) => setStatus(prev => [...prev, msg]);

  const seedDatabase = async () => {
    setLoading(true);
    setStatus([]);
    addLog("Iniciando seed...");

    const referees = [
      { name: "Carlos Silva", city: "São Paulo", rate: 150, modalities: ["futebol", "society"], email: `carlos.${Date.now()}@teste.com` },
      { name: "Marcos Whistle", city: "São Paulo", rate: 200, modalities: ["futebol"], email: `marcos.${Date.now()}@teste.com` },
      { name: "Julia Campo", city: "Belo Horizonte", rate: 130, modalities: ["futebol", "futsal"], email: `julia.${Date.now()}@teste.com` },
    ];

    const contractors = [
      { name: "Time Tabajara", city: "São Paulo", type: "Time", email: `tabajara.${Date.now()}@teste.com` },
      { name: "Escolinha do Zé", city: "Rio de Janeiro", type: "Escola", email: `ze.${Date.now()}@teste.com` },
      { name: "Liga Amadora SP", city: "São Paulo", type: "Liga", email: `liga.${Date.now()}@teste.com` },
    ];

    const createdReferees: string[] = [];
    const createdContractors: string[] = [];

    try {
      // Sign out first
      await supabase.auth.signOut();

      // Seed Referees
      for (const ref of referees) {
        addLog(`Criando árbitro: ${ref.name} (${ref.email})...`);
        const { data, error } = await supabase.auth.signUp({
          email: ref.email,
          password: "password123",
          options: {
            data: { full_name: ref.name, role: 'arbitro' }
          }
        });

        if (error) {
          addLog(`Erro ao criar ${ref.name}: ${error.message}`);
          continue;
        }

        if (data.user) {
          createdReferees.push(data.user.id);
          const { error: updateError } = await (supabase.from('profiles') as any).update({
            city: ref.city,
            hourly_rate: ref.rate,
            modalities: ref.modalities,
            role: 'arbitro',
            bio: `Árbitro experiente em ${ref.city} com foco em ${ref.modalities.join(', ')}.`,
            level: 'prata',
            games_count: Math.floor(Math.random() * 50),
            rating_avg: 4.0 + Math.random(),
            is_verified: true,
            equipment: ["Apito", "Cartões"],
          }).eq('id', data.user.id);

          if (updateError) addLog(`Erro ao atualizar perfil ${ref.name}: ${updateError.message}`);
          else addLog(`Sucesso: ${ref.name}`);
        }
        
        // Sign out to clear session
        await supabase.auth.signOut();
        // Wait a bit to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Seed Contractors
      for (const cont of contractors) {
        addLog(`Criando contratante: ${cont.name} (${cont.email})...`);
        const { data, error } = await supabase.auth.signUp({
          email: cont.email,
          password: "password123",
          options: {
            data: { full_name: cont.name, role: 'contratante' }
          }
        });

        if (error) {
          addLog(`Erro ao criar ${cont.name}: ${error.message}`);
          continue;
        }

        if (data.user) {
          createdContractors.push(data.user.id);
          const { error: updateError } = await (supabase.from('profiles') as any).update({
            city: cont.city,
            role: 'contratante',
            contractor_type: cont.type,
            main_sport: "Futebol",
            is_verified: true,
          }).eq('id', data.user.id);

          if (updateError) addLog(`Erro ao atualizar perfil ${cont.name}: ${updateError.message}`);
          else addLog(`Sucesso: ${cont.name}`);
        }

        await supabase.auth.signOut();
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Create some matches if we have users
      if (createdReferees.length > 0 && createdContractors.length > 0) {
        addLog("Criando partidas de exemplo...");
        
        // Match 1: Pending (no referee)
        const contractorId = createdContractors[0];
        const refereeId = createdReferees[0];

        // Need to be logged in as contractor to create match usually?
        // Let's use anon key + RPC or just insert if policy allows
        // Assuming policies allow insert for authenticated users.
        // I need to login as contractor first.
        
        // Login as first contractor
        const { error: loginError } = await supabase.auth.signInWithPassword({
            email: contractors[0].email,
            password: "password123"
        });

        if (!loginError) {
             const { error: matchError } = await (supabase.from('matches') as any).insert([
                {
                    contractor_id: contractorId,
                    date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
                    time: "14:00",
                    location: "Arena Teste 1",
                    modality: "futebol",
                    price: 150,
                    status: "pendente",
                    platform_fee: 15,
                    is_surge: false
                },
                {
                    contractor_id: contractorId,
                    referee_id: refereeId,
                    date: new Date(Date.now() + 172800000).toISOString().split('T')[0], // Day after tomorrow
                    time: "16:00",
                    location: "Estádio Municipal",
                    modality: "society",
                    price: 120,
                    status: "pendente", // Invite sent to referee
                    platform_fee: 12,
                    is_surge: false
                }
             ]);
             if (matchError) addLog("Erro ao criar partidas: " + matchError.message);
             else addLog("Partidas criadas com sucesso!");
        }
      }

      addLog("Seed concluído!");
      toast.success("Dados inseridos com sucesso!");

    } catch (error: any) {
      addLog(`Erro geral: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-10 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Gerador de Dados (Seed)</h1>
      <p className="text-muted-foreground">
        Este utilitário irá criar usuários de teste (Árbitros e Contratantes) no banco de dados.
        <br/>
        <strong>Atenção:</strong> Isso fará logout da sua conta atual.
      </p>
      
      <Button onClick={seedDatabase} disabled={loading} size="lg">
        {loading ? "Gerando..." : "Gerar Dados de Teste"}
      </Button>

      <div className="bg-card border border-border rounded-lg p-4 h-64 overflow-y-auto font-mono text-xs">
        {status.map((msg, i) => (
          <div key={i} className="mb-1">{msg}</div>
        ))}
        {status.length === 0 && <span className="text-muted-foreground">Aguardando início...</span>}
      </div>
    </div>
  );
};

export default SeedData;