// components/Actions.js
import React, { useCallback } from "react";
import { View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { auth } from "../firebase/config";
import { router } from "expo-router";

const API_BASE = "https://memo-ai-c3hh.onrender.com"|| "http://192.168.0.103:8000";
// ========== Auth Helpers ==========
async function getAuthHeader() {
  const u = auth.currentUser;
  if (!u) throw new Error("Not signed in");
  const token = await u.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

export default function Actions({
  visible = true,
  disabled = false,

  // ========== State ==========
  favorite = false, // ✅ 追加：お気に入り状態

  // ========== Callbacks ==========
  onPressFavorite, // よく使うメモ
  onPressSticky, // 付箋

  // ========== Style ==========
  style,
  iconColor = "rgba(255,255,255,0.92)",
  favoriteColor = "#FFD54A", // ✅ 追加：お気に入り時の色（好みで変更OK）
  iconSize = 26,
  gap = 12,
}) {
  // ========== API: Create Chat ==========
  const createChat = useCallback(async () => {
    const authHeader = await getAuthHeader();
    const res = await fetch(`${API_BASE}/chats`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader },
      body: JSON.stringify({}),
    });

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`createChat HTTP ${res.status} ${t}`);
    }

    const data = await res.json();
    const id = data?.id ?? data?.chatId;
    if (!id) throw new Error("createChat: missing id");
    return id;
  }, []);

  // ========== Handlers ==========
  const handlePressNew = useCallback(async () => {
    if (disabled) return;
    try {
      const chatId = await createChat();
      router.replace({ pathname: `/chat/${chatId}` });
    } catch (e) {
      console.log(e);
    }
  }, [createChat, disabled]);

  // ========== Render Guard ==========
  if (!visible) return null;

  const starIcon = favorite ? "star" : "star-outline";
  const starColor = favorite ? favoriteColor : iconColor;

  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap,
          marginLeft: 4,
        },
        style,
      ]}
    >
      <IconAction
        icon={starIcon}
        onPress={onPressFavorite}
        disabled={disabled}
        color={starColor}
        size={iconSize}
        accessibilityLabel="よく使うメモ"
      />
      <IconAction
        icon="document-text-outline"
        onPress={onPressSticky}
        disabled={disabled}
        color={iconColor}
        size={iconSize}
        accessibilityLabel="付箋"
      />
      <IconAction
        icon="add-circle-outline"
        onPress={handlePressNew}
        disabled={disabled}
        color={iconColor}
        size={iconSize}
        accessibilityLabel="新規メモ"
      />
    </View>
  );
}

// ========== Sub Component ==========
function IconAction({
  icon,
  onPress,
  disabled,
  color,
  size,
  accessibilityLabel,
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        {
          width: 24,
          height: 32,
          alignItems: "center",
          justifyContent: "center",
          opacity: disabled ? 0.3 : pressed ? 0.5 : 0.85,
        },
      ]}
    >
      <Ionicons name={icon} size={size} color={color} />
    </Pressable>
  );
}
