import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";

export type Team = { id: string; name: string };

type TeamContextValue = {
  teams: Team[];
  activeTeam: Team | null;
  setActiveTeam: (team: Team) => void;
  refreshTeams: () => Promise<void>;
};

const TeamContext = createContext<TeamContextValue>({
  teams: [],
  activeTeam: null,
  setActiveTeam: () => {},
  refreshTeams: async () => {},
});

export function TeamProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTeam, setActiveTeam] = useState<Team | null>(null);

  const refreshTeams = useCallback(async () => {
    if (!session) return;
    const { data, error } = await supabase
      .from("team_members")
      .select("teams(id, name)")
      .eq("user_id", session.user.id);

    if (!error && data) {
      const list = data.map((row: any) => row.teams).filter(Boolean) as Team[];
      setTeams(list);
      if (!activeTeam && list.length > 0) setActiveTeam(list[0]);
    }
  }, [session, activeTeam]);

  useEffect(() => {
    refreshTeams();
  }, [session]);

  return (
    <TeamContext.Provider value={{ teams, activeTeam, setActiveTeam, refreshTeams }}>
      {children}
    </TeamContext.Provider>
  );
}

export function useTeam() {
  return useContext(TeamContext);
}
