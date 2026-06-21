import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { useTeam } from "../contexts/TeamContext";
import { supabase } from "../lib/supabase";
import LoginScreen from "../screens/LoginScreen";
import TeamsScreen from "../screens/TeamsScreen";
import TasksScreen from "../screens/TasksScreen";
import AttendanceScreen from "../screens/AttendanceScreen";
import DocumentsScreen from "../screens/DocumentsScreen";

const TABS = [
  { key: "teams", label: "Equipos", component: TeamsScreen },
  { key: "tasks", label: "Tareas", component: TasksScreen },
  { key: "attendance", label: "Fichajes", component: AttendanceScreen },
  { key: "documents", label: "Documentos", component: DocumentsScreen },
] as const;

export default function RootNavigator() {
  const { session, loading } = useAuth();
  const { activeTeam } = useTeam();
  const [activeTab, setActiveTab] = React.useState<typeof TABS[number]["key"]>("teams");

  if (loading) return null;
  if (!session) return <LoginScreen />;

  const ActiveScreen = TABS.find((tab) => tab.key === activeTab)?.component ?? TeamsScreen;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Team Manager</Text>
        <Pressable onPress={() => supabase.auth.signOut()}>
          <Text style={styles.signOut}>Salir</Text>
        </Pressable>
      </View>

      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <Pressable
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.content}>
        <ActiveScreen key={activeTeam?.id ?? "none"} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  signOut: { color: "#dc2626", fontWeight: "600" },
  tabBar: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabActive: { borderBottomWidth: 2, borderBottomColor: "#2563eb" },
  tabLabel: { color: "#666", fontWeight: "500" },
  tabLabelActive: { color: "#2563eb" },
  content: { flex: 1 },
});
