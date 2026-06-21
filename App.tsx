import React from "react";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "./src/contexts/AuthContext";
import { TeamProvider } from "./src/contexts/TeamContext";
import RootNavigator from "./src/navigation/RootNavigator";

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <TeamProvider>
          <SafeAreaView style={{ flex: 1 }}>
            <StatusBar style="auto" />
            <RootNavigator />
          </SafeAreaView>
        </TeamProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
