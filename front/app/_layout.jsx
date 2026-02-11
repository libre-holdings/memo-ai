// app/_layout.jsx
import "react-native-gesture-handler";
import React from "react";
import { Stack } from "expo-router";
import { AuthProvider } from "../context/AuthContext";
import { KeyboardProvider } from "react-native-keyboard-controller";

export default function RootLayout() {
  return (
    <AuthProvider>
      <KeyboardProvider>
        <Stack screenOptions={{ headerShown: false }}>
          {/* Drawer配下（ホームとチャット）はここにまとめる */}
          <Stack.Screen name="(drawer)" />
        </Stack>
      </KeyboardProvider>
    </AuthProvider>
  );
}
