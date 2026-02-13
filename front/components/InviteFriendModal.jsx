import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from "react-native";
import { auth } from "../firebase/config";

const API_BASE = "https://memo-ai-c3hh.onrender.com"|| "http://192.168.0.103:8000";
async function getAuthHeader() {
  const u = auth.currentUser;
  if (!u) throw new Error("Not signed in");
  const token = await u.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

const InviteFriendModal = ({ visible, onClose }) => {
  const [friends, setFriends] = useState([]);
  const [q, setQ] = useState("");

  const friendsFetch = async () => {
    try {
      const authHeader = await getAuthHeader();
      const res = await fetch(`${API_BASE}/friends`, { headers: { ...authHeader } });
      const data = await res.json();
      setFriends(Array.isArray(data) ? data : []);
    } catch (e) {
      console.log(e);
      setFriends([]);
    }
  };

  useEffect(() => {
    if (!visible) return;
    friendsFetch();
  }, [visible]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return friends;
    return friends.filter((f) => {
      const name = String(f.name ?? "").toLowerCase();
      const id = String(f.id ?? f.uid ?? "").toLowerCase();
      return name.includes(s) || id.includes(s);
    });
  }, [friends, q]);

  const renderItem = ({ item }) => {
    // ここは API の友達データ構造に合わせて調整
    const name = item.name ?? "No Name";
    const uid = item.id ?? item.uid ?? "";

    return (
      <Pressable
        onPress={() => console.log("invite:", uid)}
        style={{
          paddingVertical: 12,
          paddingHorizontal: 12,
          borderRadius: 12,
          backgroundColor: "rgba(0,0,0,0.03)",
        }}
      >
        <Text style={{ fontSize: 15, fontWeight: "700" }}>{name}</Text>
        {!!uid && <Text style={{ marginTop: 2, color: "rgba(0,0,0,0.55)" }}>{uid}</Text>}
      </Pressable>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.35)",
        }}
        onPress={onClose}
      />

      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 16 }}

        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <View
          style={{
            width: "100%",
            maxWidth: 520,
            minWidth:"98%",
            maxHeight: "75%",
            minHeight: 420,
            backgroundColor: "#fff",
            borderRadius: 16,
            padding: 16,
            shadowColor: "#000",
            shadowOpacity: 0.15,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 },
            elevation: 6,
          }}
        >
          {/* ヘッダー */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <Pressable onPress={onClose} hitSlop={12} style={{ paddingVertical: 6, paddingHorizontal: 8 }}>
              <Text style={{ fontSize: 18 }}>×</Text>
            </Pressable>

            <Text style={{ fontSize: 16, fontWeight: "700" }}>友達をチャットに招待</Text>

            <Pressable onPress={() => console.log("add friend")} hitSlop={12} style={{ paddingVertical: 6, paddingHorizontal: 8 }}>
              <Text style={{ fontSize: 14, fontWeight: "700" }}>追加</Text>
            </Pressable>
          </View>

          {/* 検索 */}
          <TextInput
            placeholder="友達を検索"
            value={q}
            onChangeText={setQ}
            returnKeyType="search"
            style={{
              fontSize: 15,
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "rgba(0,0,0,0.12)",
              backgroundColor: "rgba(0,0,0,0.02)",
            }}
          />

          <View style={{ height: 12 }} />

          <Text style={{ fontSize: 13, fontWeight: "700", color: "rgba(0,0,0,0.55)" }}>
            友達一覧
          </Text>

          <View style={{ height: 8 }} />

          {/* 友達一覧（FlatList） */}
          <View
            style={{
              flex: 1,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "rgba(0,0,0,0.08)",
              overflow: "hidden",
            }}
          >
            <FlatList
              data={filtered}
              keyExtractor={(item, index) => String(item.id ?? item.uid ?? index)}
              renderItem={renderItem}
              contentContainerStyle={{
                padding: 12,
                gap: 10, // RN新しめならOK。古いなら separator を使う
                flexGrow: filtered.length === 0 ? 1 : 0,
              }}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 16 }}>
                  <Text style={{ color: "rgba(0,0,0,0.5)" }}>友達がいません</Text>
                </View>
              }
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default InviteFriendModal;
