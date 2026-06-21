import React, { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, Alert } from "react-native";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useTeam } from "../contexts/TeamContext";

type AttendanceRow = {
  id: string;
  clock_in: string;
  clock_out: string | null;
};

export default function AttendanceScreen() {
  const { session } = useAuth();
  const { activeTeam } = useTeam();
  const [records, setRecords] = useState<AttendanceRow[]>([]);
  const [openRecord, setOpenRecord] = useState<AttendanceRow | null>(null);

  const loadRecords = useCallback(async () => {
    if (!activeTeam || !session) return;
    const { data, error } = await supabase
      .from("attendance")
      .select("id, clock_in, clock_out")
      .eq("team_id", activeTeam.id)
      .eq("user_id", session.user.id)
      .order("clock_in", { ascending: false })
      .limit(50);
    if (!error && data) {
      setRecords(data as AttendanceRow[]);
      setOpenRecord((data as AttendanceRow[]).find((r) => !r.clock_out) ?? null);
    }
  }, [activeTeam, session]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  async function clockIn() {
    if (!activeTeam || !session) return;
    const { error } = await supabase
      .from("attendance")
      .insert({ team_id: activeTeam.id, user_id: session.user.id });
    if (error) Alert.alert("Error", error.message);
    loadRecords();
  }

  async function clockOut() {
    if (!openRecord) return;
    const { error } = await supabase
      .from("attendance")
      .update({ clock_out: new Date().toISOString() })
      .eq("id", openRecord.id);
    if (error) Alert.alert("Error", error.message);
    loadRecords();
  }

  if (!activeTeam) {
    return (
      <View style={styles.container}>
        <Text style={styles.empty}>Selecciona o crea un equipo en la pestaña Equipos.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Fichajes · {activeTeam.name}</Text>
      <Pressable
        style={[styles.button, openRecord && styles.buttonStop]}
        onPress={openRecord ? clockOut : clockIn}
      >
        <Text style={styles.buttonText}>{openRecord ? "Fichar salida" : "Fichar entrada"}</Text>
      </Pressable>
      <FlatList
        style={{ marginTop: 16 }}
        data={records}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.recordRow}>
            <Text>Entrada: {new Date(item.clock_in).toLocaleString()}</Text>
            <Text>
              Salida: {item.clock_out ? new Date(item.clock_out).toLocaleString() : "—"}
            </Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Sin fichajes todavía.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, maxWidth: 720, alignSelf: "center", width: "100%" },
  heading: { fontSize: 22, fontWeight: "700", marginBottom: 16 },
  button: { backgroundColor: "#16a34a", borderRadius: 8, padding: 14, alignItems: "center" },
  buttonStop: { backgroundColor: "#dc2626" },
  buttonText: { color: "#fff", fontWeight: "600" },
  recordRow: { padding: 12, borderRadius: 8, backgroundColor: "#f1f5f9", marginBottom: 8 },
  empty: { color: "#666", textAlign: "center", marginTop: 24 },
});
