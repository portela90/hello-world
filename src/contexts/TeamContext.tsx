import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";

export type Team = { id: string; name: string };
export type TeamRole = "admin" | "manager" | "member";
export type TeamMember = { id: string; full_name: string | null; email: string | null; role: TeamRole };

type TeamContextValue = {
  teams: Team[];
  activeTeam: Team | null;
  setActiveTeam: (team: Team) => void;
  refreshTeams: () => Promise<void>;
  members: TeamMember[];
  myRole: TeamRole | null;
  canManageTasks: boolean;
  refreshMembers: () => Promise<void>;
};

const TeamContext = createContext<TeamContextValue>({
  teams: [],
  activeTeam: null,
  setActiveTeam: () => {},
  refreshTeams: async () => {},
  members: [],
  myRole: null,
  canManageTasks: false,
  refreshMembers: async () => {},
});

export function TeamProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTeam, setActiveTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [myRole, setMyRole] = useState<TeamRole | null>(null);

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

  const refreshMembers = useCallback(async () => {
    if (!activeTeam || !session) return;
    const { data, error } = await supabase
      .from("team_members")
      .select("role, profiles(id, full_name, email)")
      .eq("team_id", activeTeam.id);

    if (!error && data) {
      const list = data
        .map((row: any) => row.profiles && { ...row.profiles, role: row.role })
        .filter(Boolean) as TeamMember[];
      setMembers(list);
      setMyRole(list.find((m) => m.id === session.user.id)?.role ?? null);
    }
  }, [activeTeam, session]);

  useEffect(() => {
    refreshTeams();
  }, [session]);

  useEffect(() => {
    refreshMembers();
  }, [refreshMembers]);

  const canManageTasks = myRole === "admin" || myRole === "manager";

  return (
    <TeamContext.Provider
      value={{ teams, activeTeam, setActiveTeam, refreshTeams, members, myRole, canManageTasks, refreshMembers }}
    >
      {children}
    </TeamContext.Provider>
  );
}

export function useTeam() {
  return useContext(TeamContext);
}
