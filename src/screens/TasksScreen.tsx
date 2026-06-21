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
  started_at: string | null;
  accumulated_seconds: number;
};

const STATUS_LABEL: Record<Task["status"], string> = {
  pending: "Pendiente",
  in_progress: "En progreso",
  done: "Hecha",
};

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((n) => String(n).padStart(2, "0")).join(":");
}

export default function TasksScreen() {
  const { session } = useAuth();
  const { activeTeam, members, canManageTasks } = useTeam();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  const loadTasks = useCallback(async () => {
    if (!activeTeam || !session) return;
    let query = supabase
      .from("tasks")
      .select("id, title, description, status, assigned_to, started_at, accumulated_seconds")
      .eq("team_id", activeTeam.id)
      .order("created_at", { ascending: false });

    if (!canManageTasks) {
      query = query.eq("assigned_to", session.user.id);
    }

    const { data, error } = await query;
    if (!error && data) setTasks(data as Task[]);
  }, [activeTeam, session, canManageTasks]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    const hasRunningTask = tasks.some((t) => t.started_at);
    if (!hasRunningTask) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [tasks]);

  useEffect(() => {
    if (!assigneeId && members.length > 0) setAssigneeId(members[0].id);
  }, [members, assigneeId]);

  async function createTask() {
    if (!title.trim() || !activeTeam || !session || !assigneeId) return;
    const { error } = await supabase.from("tasks").insert({
      team_id: activeTeam.id,
      title: title.trim(),
      created_by: session.user.id,
      assigned_to: assigneeId,
    });
    if (error) {
      Alert.alert("Error", error.message);
      return;
    }
    setTitle("");
    loadTasks();
  }

  async function startTask(task: Task) {
    const { error } = await supabase
      .from("tasks")
      .update({ status: "in_progress", started_at: new Date().toISOString() })
      .eq("id", task.id);
    if (error) Alert.alert("Error", error.message);
    loadTasks();
  }

  async function finishTask(task: Task) {
    if (!task.started_at) return;
    const elapsed = Math.floor((Date.now() - new Date(task.started_at).getTime()) / 1000);
    const { error } = await supabase
      .from("tasks")
      .update({
        status: "done",
        started_at: null,
        accumulated_seconds: task.accumulated_seconds + elapsed,
      })
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
      <Text style={styles.heading}>
        {canManageTasks ? `Tareas · ${activeTeam.name}` : "Mis tareas"}
      </Text>
      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const liveSeconds = item.started_at
            ? item.accumulated_seconds + Math.floor((now - new Date(item.started_at).getTime()) / 1000)
            : item.accumulated_seconds;
          const isMine = item.assigned_to === session?.user.id;
          const assignee = members.find((m) => m.id === item.assigned_to);

          return (
            <View style={styles.taskRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.taskTitle}>{item.title}</Text>
                {canManageTasks && (
                  <Text style={styles.taskAssignee}>{assignee?.full_name ?? assignee?.email ?? "Sin asignar"}</Text>
                )}
                <Text style={styles.taskTime}>{formatDuration(liveSeconds)}</Text>
              </View>
              <Text style={styles.taskStatus}>{STATUS_LABEL[item.status]}</Text>
              {isMine && item.status === "pending" && (
                <Pressable style={styles.actionButton} onPress={() => startTask(item)}>
                  <Text style={styles.actionButtonText}>Iniciar</Text>
                </Pressable>
              )}
              {isMine && item.status === "in_progress" && (
                <Pressable style={[styles.actionButton, styles.actionButtonStop]} onPress={() => finishTask(item)}>
                  <Text style={styles.actionButtonText}>Finalizar</Text>
                </Pressable>
              )}
            </View>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>No hay tareas todavía.</Text>}
      />

      {canManageTasks && (
        <View style={styles.createBox}>
          <TextInput style={styles.input} placeholder="Nueva tarea" value={title} onChangeText={setTitle} />
          <Text style={styles.label}>Asignar a:</Text>
          <View style={styles.assigneeRow}>
            {members.map((member) => (
              <Pressable
                key={member.id}
                style={[styles.assigneeChip, assigneeId === member.id && styles.assigneeChipActive]}
                onPress={() => setAssigneeId(member.id)}
              >
                <Text
                  style={[styles.assigneeChipText, assigneeId === member.id && styles.assigneeChipTextActive]}
                >
                  {member.full_name ?? member.email ?? "Usuario"}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable style={styles.button} onPress={createTask}>
            <Text style={styles.buttonText}>Asignar tarea</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, maxWidth: 720, alignSelf: "center", width: "100%" },
  heading: { fontSize: 22, fontWeight: "700", marginBottom: 16 },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    marginBottom: 8,
    gap: 8,
  },
  taskTitle: { fontSize: 16, fontWeight: "500" },
  taskAssignee: { color: "#666", marginTop: 2 },
  taskTime: { color: "#2563eb", fontWeight: "600", marginTop: 2, fontVariant: ["tabular-nums"] },
  taskStatus: { color: "#2563eb", fontWeight: "600" },
  actionButton: { backgroundColor: "#16a34a", borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
  actionButtonStop: { backgroundColor: "#dc2626" },
  actionButtonText: { color: "#fff", fontWeight: "600" },
  empty: { color: "#666", textAlign: "center", marginTop: 24 },
  createBox: { marginTop: 16, gap: 8 },
  label: { color: "#666", fontWeight: "500" },
  assigneeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  assigneeChip: { borderWidth: 1, borderColor: "#ccc", borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12 },
  assigneeChipActive: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  assigneeChipText: { color: "#333" },
  assigneeChipTextActive: { color: "#fff" },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12 },
  button: { backgroundColor: "#2563eb", borderRadius: 8, padding: 14, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "600" },
});
