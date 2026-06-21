import React, { useCallback, useEffect, useState } from "react";
import { View, Text, TextInput, FlatList, Pressable, StyleSheet, Alert } from "react-native";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useTeam } from "../contexts/TeamContext";

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: "pending" | "in_progress" | "done";
  assigned_to: string | null;
};

const STATUS_LABEL: Record<Task["status"], string> = {
  pending: "Pendiente",
  in_progress: "En progreso",
  done: "Hecha",
};

const NEXT_STATUS: Record<Task["status"], Task["status"]> = {
  pending: "in_progress",
  in_progress: "done",
  done: "pending",
};

export default function TasksScreen() {
  const { session } = useAuth();
  const { activeTeam } = useTeam();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");

  const loadTasks = useCallback(async () => {
    if (!activeTeam) return;
    const { data, error } = await supabase
      .from("tasks")
      .select("id, title, description, status, assigned_to")
      .eq("team_id", activeTeam.id)
      .order("created_at", { ascending: false });
    if (!error && data) setTasks(data as Task[]);
  }, [activeTeam]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  async function createTask() {
    if (!title.trim() || !activeTeam || !session) return;
    const { error } = await supabase.from("tasks").insert({
      team_id: activeTeam.id,
      title: title.trim(),
      created_by: session.user.id,
      assigned_to: session.user.id,
    });
    if (error) Alert.alert("Error", error.message);
    setTitle("");
    loadTasks();
  }

  async function cycleStatus(task: Task) {
    const { error } = await supabase
      .from("tasks")
      .update({ status: NEXT_STATUS[task.status] })
      .eq("id", task.id);
    if (error) Alert.alert("Error", error.message);
    loadTasks();
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
      <Text style={styles.heading}>Tareas · {activeTeam.name}</Text>
      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable style={styles.taskRow} onPress={() => cycleStatus(item)}>
            <Text style={styles.taskTitle}>{item.title}</Text>
            <Text style={styles.taskStatus}>{STATUS_LABEL[item.status]}</Text>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No hay tareas todavía.</Text>}
      />
      <View style={styles.createRow}>
        <TextInput
          style={styles.input}
          placeholder="Nueva tarea"
          value={title}
          onChangeText={setTitle}
        />
        <Pressable style={styles.button} onPress={createTask}>
          <Text style={styles.buttonText}>Añadir</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, maxWidth: 720, alignSelf: "center", width: "100%" },
  heading: { fontSize: 22, fontWeight: "700", marginBottom: 16 },
  taskRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    marginBottom: 8,
  },
  taskTitle: { fontSize: 16, fontWeight: "500" },
  taskStatus: { color: "#2563eb", fontWeight: "600" },
  empty: { color: "#666", textAlign: "center", marginTop: 24 },
  createRow: { flexDirection: "row", marginTop: 16, gap: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12 },
  button: { backgroundColor: "#2563eb", borderRadius: 8, paddingHorizontal: 16, justifyContent: "center" },
  buttonText: { color: "#fff", fontWeight: "600" },
});
