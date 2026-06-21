import React, { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, Alert } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useTeam } from "../contexts/TeamContext";

type DocumentRow = {
  id: string;
  name: string;
  storage_path: string;
  created_at: string;
};

const BUCKET = "documents";

export default function DocumentsScreen() {
  const { session } = useAuth();
  const { activeTeam } = useTeam();
  const [documents, setDocuments] = useState<DocumentRow[]>([]);

  const loadDocuments = useCallback(async () => {
    if (!activeTeam) return;
    const { data, error } = await supabase
      .from("documents")
      .select("id, name, storage_path, created_at")
      .eq("team_id", activeTeam.id)
      .order("created_at", { ascending: false });
    if (!error && data) setDocuments(data as DocumentRow[]);
  }, [activeTeam]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  async function uploadDocument() {
    if (!activeTeam || !session) return;
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.[0]) return;

    const file = result.assets[0];
    const path = `${activeTeam.id}/${Date.now()}-${file.name}`;
    const response = await fetch(file.uri);
    const blob = await response.blob();

    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, blob, {
      contentType: file.mimeType ?? "application/octet-stream",
    });
    if (uploadError) {
      Alert.alert("Error", uploadError.message);
      return;
    }

    const { error } = await supabase.from("documents").insert({
      team_id: activeTeam.id,
      uploaded_by: session.user.id,
      name: file.name,
      storage_path: path,
    });
    if (error) Alert.alert("Error", error.message);
    loadDocuments();
  }

  async function openDocument(doc: DocumentRow) {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(doc.storage_path, 60);
    if (error || !data) {
      Alert.alert("Error", error?.message ?? "No se pudo abrir el documento");
      return;
    }
    Alert.alert("Enlace de descarga", data.signedUrl);
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
      <Text style={styles.heading}>Documentos · {activeTeam.name}</Text>
      <Pressable style={styles.button} onPress={uploadDocument}>
        <Text style={styles.buttonText}>Subir documento</Text>
      </Pressable>
      <FlatList
        style={{ marginTop: 16 }}
        data={documents}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable style={styles.docRow} onPress={() => openDocument(item)}>
            <Text style={styles.docName}>{item.name}</Text>
            <Text style={styles.docDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No hay documentos todavía.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, maxWidth: 720, alignSelf: "center", width: "100%" },
  heading: { fontSize: 22, fontWeight: "700", marginBottom: 16 },
  button: { backgroundColor: "#2563eb", borderRadius: 8, padding: 14, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "600" },
  docRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    marginBottom: 8,
  },
  docName: { fontSize: 16, fontWeight: "500" },
  docDate: { color: "#666" },
  empty: { color: "#666", textAlign: "center", marginTop: 24 },
});
