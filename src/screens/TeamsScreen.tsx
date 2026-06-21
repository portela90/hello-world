import React, { useState } from "react";
import { View, Text, TextInput, FlatList, Pressable, StyleSheet, Alert } from "react-native";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useTeam } from "../contexts/TeamContext";

export default function TeamsScreen() {
  const { session } = useAuth();
  const { teams, activeTeam, setActiveTeam, refreshTeams } = useTeam();
  const [name, setName] = useState("");

  async function createTeam() {
    if (!name.trim() || !session) return;
    const { data: team, error } = await supabase
      .from("teams")
      .insert({ name: name.trim(), created_by: session.user.id })
      .select()
      .single();

    if (error || !team) {
      Alert.alert("Error", error?.message ?? "No se pudo crear el equipo");
      return;
    }

    const { error: memberError } = await supabase
      .from("team_members")
      .insert({ team_id: team.id, user_id: session.user.id, role: "admin" });

    if (memberError) Alert.alert("Error", memberError.message);

    setName("");
    await refreshTeams();
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Mis equipos</Text>
      <FlatList
        data={teams}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.teamRow, activeTeam?.id === item.id && styles.teamRowActive]}
            onPress={() => setActiveTeam(item)}
          >
            <Text style={styles.teamName}>{item.name}</Text>
            {activeTeam?.id === item.id && <Text style={styles.activeLabel}>Activo</Text>}
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Todavía no perteneces a ningún equipo.</Text>}
      />
      <View style={styles.createRow}>
        <TextInput
          style={styles.input}
          placeholder="Nombre del nuevo equipo"
          value={name}
          onChangeText={setName}
        />
        <Pressable style={styles.button} onPress={createTeam}>
          <Text style={styles.buttonText}>Crear</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, maxWidth: 720, alignSelf: "center", width: "100%" },
  heading: { fontSize: 22, fontWeight: "700", marginBottom: 16 },
  teamRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    marginBottom: 8,
  },
  teamRowActive: { backgroundColor: "#dbeafe" },
  teamName: { fontSize: 16, fontWeight: "500" },
  activeLabel: { color: "#2563eb", fontWeight: "600" },
  empty: { color: "#666", textAlign: "center", marginTop: 24 },
  createRow: { flexDirection: "row", marginTop: 16, gap: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12 },
  button: { backgroundColor: "#2563eb", borderRadius: 8, paddingHorizontal: 16, justifyContent: "center" },
  buttonText: { color: "#fff", fontWeight: "600" },
});
