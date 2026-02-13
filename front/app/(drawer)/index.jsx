// app/index.js
import React, { useMemo, useState, useEffect } from "react";
import { View, Pressable, Keyboard, Animated, Text } from "react-native";
import { router, Stack } from "expo-router";
import { auth } from "../../firebase/config";
import MessageComposer from "../../components/MessageComposer";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AddToCalendarModal2 from "../../components/AddToCalendarModal2";
import TopBar from "../../components/TopBar";
import { useKeyboardAnimation } from "react-native-keyboard-controller";

const API_BASE = "https://memo-ai-c3hh.onrender.com"|| "http://192.168.0.103:8000";
async function getAuthHeader() {
  const u = auth.currentUser;
  if (!u) throw new Error("Not signed in");
  const token = await u.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

export default function IndexScreen() {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const trimmed = useMemo(() => text.trim(), [text]);
  const canSend = !!trimmed && !sending;

  const insets = useSafeAreaInsets();

  const [composerOpen, setComposerOpen] = useState(false);

  // ✅ 確認用ログ（不要なら消してOK）
  useEffect(() => {
    console.log("composerOpen:", composerOpen);
  }, [composerOpen]);

  // ✅ keyboard-controller のアニメ値（Animated.Value）
  const { height, progress } = useKeyboardAnimation();
  const composerOffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 24], // ← ここが “pbを小さく見せる量”
  });

  const composerTranslateY = Animated.add(height, composerOffset);
  const createChat = async () => {
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
  };

  const sendFirstMessage = async (chatId, content) => {
    const authHeader = await getAuthHeader();
    const res = await fetch(`${API_BASE}/chats/${chatId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`sendMessage HTTP ${res.status} ${t}`);
    }
    return await res.json();
  };

  const onSend = async (content) => {
    const c = (content ?? "").trim();
    if (!c || sending) return;

    setSending(true);
    setText("");

    try {
      const chatId = await createChat();
      await sendFirstMessage(chatId, c);
      router.replace({ pathname: `/chat/${chatId}`, params: { seed: c } });
    } catch (e) {
      console.log(e);
      setText(c);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* カレンダー（必要なら戻してOK） */}
      {/* <Pressable
        onPress={() => setCalendarOpen(true)}
        style={{
          alignSelf: "center",
          marginBottom: 12,
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderRadius: 12,
          backgroundColor: "black",
          marginTop: 100,
        }}
      >
        <Text style={{ color: "white", fontWeight: "700" }}>
          予定をカレンダーに追加
        </Text>
      </Pressable>
      <AddToCalendarModal2
        visible={calendarOpen}
        onClose={() => setCalendarOpen(false)}
      /> */}

      <TopBar
        title=""
        rightLabel="友達とトークを始める"
        onPressRight={async () => {
          try {
            const chatId = await createChat();
            router.push({
              pathname: `/chat/${chatId}`,
              params: { openInvite: "1" }, // ✅ chat側でモーダル開く合図
            });
          } catch (e) {
            console.log(e);
          }
        }}
      />

      <View style={{ flex: 1 }}>
        {/* ✅ 空白タップで閉じる */}
        <Pressable style={{ flex: 1 }} onPress={Keyboard.dismiss} />

        {/* ✅ composer を画面下に固定 → translateY で持ち上げる */}
        <Animated.View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            transform: [{ translateY: composerTranslateY }],
          }}
        >
          <MessageComposer
            value={text}
            onChangeText={setText}
            onSend={onSend}
            sending={sending}
            containerStyle={{ padding: 0 }}
            bottomPadding={Math.max(16, insets.bottom)} // 下端の安全余白
            onFocusChange={setComposerOpen}

          />
        </Animated.View>
      </View>
    </>
  );
}
