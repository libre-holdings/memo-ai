// app/chat/[id].js
import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, FlatList, Keyboard, Animated, Text, Pressable } from "react-native";
import { BlurView } from "expo-blur";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useKeyboardAnimation } from "react-native-keyboard-controller";
import { Ionicons } from "@expo/vector-icons";

import { auth } from "../../../firebase/config";
import MessageComposer from "../../../components/MessageComposer";
import Bubble from "../../../components/Bubble";
import TopBar from "../../../components/TopBar";
import InviteFriendModal from "../../../components/InviteFriendModal";

const API_BASE = "https://memo-ai-c3hh.onrender.com"|| "http://192.168.0.103:8000";
// ========== Auth Helpers ==========
async function getAuthHeader() {
  const u = auth.currentUser;
  if (!u) throw new Error("Not signed in");
  const token = await u.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

// ========== Utils ==========
function normalizeMessagesPayload(data) {
  if (data && Array.isArray(data.messages)) return data.messages;
  if (Array.isArray(data)) return data;
  return [];
}

function waitKeyboardHideOnce(timeoutMs = 450) {
  return new Promise((resolve) => {
    let done = false;

    const t = setTimeout(() => {
      if (done) return;
      done = true;
      sub?.remove?.();
      resolve();
    }, timeoutMs);

    const sub = Keyboard.addListener("keyboardDidHide", () => {
      if (done) return;
      done = true;
      clearTimeout(t);
      sub.remove();
      resolve();
    });
  });
}

export default function ChatScreen() {
  const { id, seed, openInvite } = useLocalSearchParams();
  const chatId = String(id);
  const insets = useSafeAreaInsets();

  // ========== Refs ==========
  const openedOnceRef = useRef(false);
  const fetchingRef = useRef(false);

  // ========== UI State ==========
  const [ui, setUi] = useState({
    loading: true,
    sending: false,
    text: "",
    composerOpen: false,

    inviteOpen: false,
    closingInvite: false,

    composerH: 0,
  });

  const { loading, sending, text, composerOpen, inviteOpen, closingInvite, composerH } = ui;

  const setUiPatch = (patch) =>
    setUi((prev) => ({
      ...prev,
      ...(typeof patch === "function" ? patch(prev) : patch),
    }));

  // ========== Chat Meta ==========
  const [isFavorite, setIsFavorite] = useState(false);
  const [chatTitle, setChatTitle] = useState("");

  // ✅ 「titleが入ってるなら再フェッチしたくない」判定のため、常に最新titleを参照できるref
  const chatTitleRef = useRef("");
  useEffect(() => {
    chatTitleRef.current = chatTitle;
  }, [chatTitle]);

  // ========== Messages State ==========
  const [messages, setMessages] = useState(() => {
    if (typeof seed === "string" && seed.trim()) {
      return [
        {
          id: `seed-${Date.now()}`,
          role: "user",
          content: seed,
          _optimistic: true,
        },
      ];
    }
    return [];
  });

  // ========== Keyboard Animation (composer position) ==========
  const { height, progress } = useKeyboardAnimation();

  const composerOffset = useMemo(() => {
    return progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 24],
    });
  }, [progress]);

  // inviteOpen中 or 閉じ処理中は「背面composerを固定」
  const zeroYRef = useRef(new Animated.Value(0));
  const composerTranslateY =
    inviteOpen || closingInvite ? zeroYRef.current : Animated.add(height, composerOffset);

  // リスト用に反転したY
  const listTranslateY = useMemo(
    () => Animated.multiply(composerTranslateY, 1),
    [composerTranslateY]
  );

  // ========== Debug ==========
  useEffect(() => {
    console.log("composerOpen:", composerOpen);
  }, [composerOpen]);

  // ========== Invite Modal Open via URL Param ==========
  useEffect(() => {
    if (openedOnceRef.current) return;
    if (openInvite === "1" || openInvite === 1 || openInvite === true) {
      openedOnceRef.current = true;
      setUiPatch({ inviteOpen: true });
    }
  }, [openInvite]);

  // モーダル開いたら背面キーボードを閉じる
  useEffect(() => {
    if (inviteOpen) Keyboard.dismiss();
  }, [inviteOpen]);

  // ========== API: Fetch Messages ==========
  const fetchMessages = async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    setUiPatch({ loading: true });
    try {
      const authHeader = await getAuthHeader();
      const res = await fetch(`${API_BASE}/chats/${chatId}/messages`, {
        headers: { ...authHeader },
      });

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`GET messages HTTP ${res.status} ${t}`);
      }

      const data = await res.json();
      const serverMsgs = normalizeMessagesPayload(data);

      // 既存実装に合わせて reverse
      setMessages([...serverMsgs].reverse());
    } catch (e) {
      console.log(e);
    } finally {
      setUiPatch({ loading: false });
      fetchingRef.current = false;
    }
  };

  // ========== API: Chat Meta ==========
  const fetchChatMeta = async (targetChatId) => {
    const authHeader = await getAuthHeader();
    const res = await fetch(`${API_BASE}/chats/${targetChatId}`, { headers: authHeader });
    if (!res.ok) throw new Error(`GET chat HTTP ${res.status}`);
    return await res.json();
  };

  // 初回ロード（chatId変更時）
  useEffect(() => {
    (async () => {
      await fetchMessages();
      try {
        const meta = await fetchChatMeta(chatId);
        setIsFavorite(!!meta.favorite);
        setChatTitle(meta.title || "");
      } catch (e) {
        console.log(e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  // ========== API: Send Message ==========
  const sendMessage = async (content) => {
    const authHeader = await getAuthHeader();
    const res = await fetch(`${API_BASE}/chats/${chatId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader },
      body: JSON.stringify({ content }),
    });

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`POST message HTTP ${res.status} ${t}`);
    }
    return await res.json();
  };

  // ========== API: Favorite ==========
  const updateFavorite = async (targetChatId, favorite) => {
    const authHeader = await getAuthHeader();
    const res = await fetch(`${API_BASE}/chats/${targetChatId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeader },
      body: JSON.stringify({ favorite }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`PATCH chat HTTP ${res.status} ${t}`);
    }
    return await res.json();
  };

  // ========== Composer: Send Handler (optimistic) ==========
  const onSend = async (content) => {
    if (!content || sending) return;

    setUiPatch({ sending: true, text: "" });

    const optimistic = {
      id: `tmp-${Date.now()}`,
      role: "user",
      content,
      _optimistic: true,
    };

    setMessages((prev) => [optimistic, ...prev]);

    try {
      await sendMessage(content);
      // await fetchMessages();


      // ✅ title が「未確定（新規メモ）」の時だけ meta を再取得して更新
      const currentTitle = chatTitleRef.current;
      const shouldRefetchMeta = !currentTitle || currentTitle === "新規メモ";

      if (shouldRefetchMeta) {
        try {
          const meta = await fetchChatMeta(chatId);
          console.log(meta)
          setIsFavorite(!!meta.favorite);
          setChatTitle(meta.title || "");
        } catch (e) {
          console.log(e);
        }
      }
    } catch (e) {
      console.log(e);
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setUiPatch({ text: content });
    } finally {
      setUiPatch({ sending: false });
    }
  };

  // ========== Invite Modal: Close Handler ==========
  const closeInvite = async () => {
    if (closingInvite) return;
    setUiPatch({ closingInvite: true });

    Keyboard.dismiss();
    await waitKeyboardHideOnce();

    setUiPatch({ inviteOpen: false });

    requestAnimationFrame(() => {
      setUiPatch({ closingInvite: false });
    });
  };

  // ========== Favorite Toggle ==========
  const toggleFavorite = async () => {
    const next = !isFavorite;
    setIsFavorite(next);

    try {
      await updateFavorite(chatId, next);
    } catch (e) {
      console.log(e);
      setIsFavorite(!next);
    }
  };

  // ========== Render ==========
  return (
    <>
      <TopBar title="" onPressRight={() => setUiPatch({ inviteOpen: true })} />

      {chatTitle ? (
        <BlurView
          intensity={35}
          tint="light"
          style={{
            marginHorizontal: 12,
            marginTop: 10,
            borderRadius: 16,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.35)",
            backgroundColor: "rgba(255,255,255,0.18)", // blurが効かない環境の保険
          }}
        >
          <View
            style={{
              paddingHorizontal: 14,
              paddingVertical: 10,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={{
                flex: 1,
                fontSize: 16,
                fontWeight: "700",
                color: "#111",
              }}
            >
              ルーム名：{chatTitle}
            </Text>

            {/* ここは編集モーダル実装がまだなら一旦ダミー */}
            <Pressable
              onPress={() => {
                // setTitleDraft(chatTitle);
                // setTitleModalOpen(true);
                console.log("edit title (TODO)");
              }}
              hitSlop={10}
              style={({ pressed }) => ({
                opacity: pressed ? 0.6 : 1,
                padding: 6,
                borderRadius: 10,
              })}
              accessibilityRole="button"
              accessibilityLabel="タイトルを編集"
            >
              <Ionicons name="pencil" size={20} color="#111" />
            </Pressable>
          </View>
        </BlurView>
      ) : null}

      <View style={{ flex: 1 }}>
        <Animated.View style={{ flex: 1, transform: [{ translateY: listTranslateY }] }}>
          <FlatList
            style={{ flex: 1 }}
            contentContainerStyle={{
              padding: 16,
              // inverted なので「見た目の下の余白」は paddingTop
              paddingTop: composerH + 16,
              paddingBottom: 24,
            }}
            data={messages}
            keyExtractor={(item) => String(item.id)}
            inverted
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            onScrollBeginDrag={Keyboard.dismiss}
            ListHeaderComponent={loading ? null : null}
            renderItem={({ item }) => {
              const isUser = item.role === "user";
              return (
                <View
                  style={{
                    marginBottom: 12,
                    alignSelf: isUser ? "flex-end" : "flex-start",
                  }}
                >
                  <Bubble isUser={isUser} style={{ opacity: item._optimistic ? 0.6 : 1 }}>
                    {item.content}
                  </Bubble>
                </View>
              );
            }}
          />
        </Animated.View>

        <Animated.View
          onLayout={(e) => setUiPatch({ composerH: e.nativeEvent.layout.height })}
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
            onChangeText={(t) => setUiPatch({ text: t })}
            onSend={onSend}
            sending={sending}
            bottomPadding={Math.max(16, insets.bottom)}
            onFocusChange={(open) => setUiPatch({ composerOpen: open })}
            onPressFavorite={toggleFavorite}
            isFavorite={isFavorite}
          />
        </Animated.View>
      </View>

      <InviteFriendModal visible={inviteOpen} onClose={closeInvite} />
    </>
  );
}
