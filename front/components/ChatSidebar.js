// components/ChatSidebar.js
import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Alert,
  SectionList,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import ContextMenu from "react-native-context-menu-view";
import { usePathname, router } from "expo-router";
import { auth } from "../firebase/config";
import { BlurView } from "expo-blur";

const API_BASE = "https://memo-ai-c3hh.onrender.com"|| "http://192.168.0.103:8000";

const BG = "#1e262a";
const FG = "#E8EEF6";
const MUTED = "rgba(232,238,246,0.65)";
const BORDER = "rgba(232,238,246,0.12)";
const HOVER = "rgba(232,238,246,0.08)";
const SELECTED = "rgba(232,238,246,0.14)";

// 長押しとみなすまでの時間（iOSの体感に合わせて調整OK）
const LONG_PRESS_GUARD_MS = 320;

async function getAuthHeader() {
  const u = auth.currentUser;
  if (!u) throw new Error("Not signed in");
  const token = await u.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

function getInitials(nameOrEmail = "") {
  const s = String(nameOrEmail || "").trim();
  if (!s) return "U";
  const parts = s.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || s[0];
  const second = parts.length > 1 ? parts[1]?.[0] : "";
  return (first + second).toUpperCase();
}

export default function ChatSidebar({ navigation, state }) {
  const pathname = usePathname();
  const activeChatId = useMemo(() => {
    const m = pathname.match(/^\/chat\/([^/]+)/);
    return m ? m[1] : null;
  }, [pathname]);

  const [loading, setLoading] = useState(true); // 初回ローディング用
  const [refreshing, setRefreshing] = useState(false); // pull-to-refresh 用
  const [creating, setCreating] = useState(false);
  const [chats, setChats] = useState([]);

  // ✅ タイトル編集モーダル
  const [editOpen, setEditOpen] = useState(false);
  const [editChatId, setEditChatId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [savingTitle, setSavingTitle] = useState(false);

  // 開くたびに連打で fetch してガタつくのを防ぐ（任意）
  const lastFetchedRef = useRef(0);

  // ✅ 長押し中は openChat をブロックするための refs
  const menuBlockingRef = useRef(false);
  const pressTimerRef = useRef(null);

  const clearPressTimer = useCallback(() => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  }, []);

  const startLongPressGuard = useCallback(() => {
    clearPressTimer();
    menuBlockingRef.current = false;

    pressTimerRef.current = setTimeout(() => {
      // この時間を超えたら「長押し中」とみなして openChat をブロック
      menuBlockingRef.current = true;
    }, LONG_PRESS_GUARD_MS);
  }, [clearPressTimer]);

  const endLongPressGuard = useCallback(() => {
    clearPressTimer();
    // 指を離した直後は「短押し」かもしれないので、ここではブロック解除しない
    // （解除は menu の onCancel/onPress でやる）
  }, [clearPressTimer]);

  const releaseMenuBlock = useCallback(() => {
    clearPressTimer();
    menuBlockingRef.current = false;
  }, [clearPressTimer]);

  // mode: "init" | "pull" | "drawer"
  const fetchChats = useCallback(async (opts = { mode: "init" }) => {
    const mode = opts?.mode || "init";

    if (mode === "init") setLoading(true);
    if (mode === "pull") setRefreshing(true);
    // mode === "drawer" は UI 状態を動かさない（押し下げ防止）

    try {
      const authHeader = await getAuthHeader();
      const res = await fetch(`${API_BASE}/chats`, {
        headers: { ...authHeader },
      });

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`GET /chats HTTP ${res.status} ${t}`);
      }

      const data = await res.json();
      setChats(Array.isArray(data) ? data : []);
    } catch (e) {
      console.log("fetchChats error:", e);
      // 失敗時に setChats([]) しない（一覧が消えるのを防ぐ）
    } finally {
      if (mode === "init") setLoading(false);
      if (mode === "pull") setRefreshing(false);
    }
  }, []);

  // 初回ロード
  useEffect(() => {
    fetchChats({ mode: "init" });
  }, [fetchChats]);

  // drawer open 判定（あなたの state ログ形式に合わせる）
  const isDrawerOpen = !!state?.history?.some(
    (h) => h?.type === "drawer" && h?.status === "open"
  );

  // Drawer を開いたときに最新取得（refreshing を触らない）
  useEffect(() => {
    if (!isDrawerOpen) return;

    // 3秒以内の連続 open はスキップ（任意）
    const now = Date.now();
    if (now - lastFetchedRef.current < 3000) return;
    lastFetchedRef.current = now;

    fetchChats({ mode: "drawer" });
  }, [isDrawerOpen, fetchChats]);

  const openChat = (id, opts = { closeDrawer: true }) => {
    router.push(`/chat/${id}`);
    if (opts?.closeDrawer) navigation?.closeDrawer?.();
  };

  // ✅ 長押し中は openChat しない
  const safeOpenChat = useCallback(
    (id) => {
      if (menuBlockingRef.current) return;
      openChat(id);
    },
    [navigation]
  );

  const createChat = async () => {
    if (creating) return;
    setCreating(true);

    try {
      const authHeader = await getAuthHeader();
      const res = await fetch(`${API_BASE}/chats`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({}), // title 任意
      });

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`POST /chats HTTP ${res.status} ${t}`);
      }

      const data = await res.json();
      const chat = data?.chat ?? data; // {chat:{...}} or {...}
      const newId = chat?.id ?? chat?.chatId;

      if (!newId) throw new Error("POST /chats response has no id");

      // 一覧更新（タイトルなど反映）
      await fetchChats({ mode: "drawer" });

      // 新しいチャットへ
      openChat(newId);
    } catch (e) {
      console.log("createChat error:", e);
      Alert.alert("作成失敗", "新規チャットを作れませんでした");
    } finally {
      setCreating(false);
    }
  };

  function formatDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";

    return d.toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const { favoriteChats, normalChats } = useMemo(() => {
    const arr = Array.isArray(chats) ? chats : [];

    const fav = arr.filter((c) => !!c.favorite);
    const normal = arr.filter((c) => !c.favorite);

    const toTime = (iso) => {
      if (!iso) return 0;
      const t = new Date(iso).getTime();
      return Number.isFinite(t) ? t : 0;
    };

    fav.sort((a, b) => {
      const bt = toTime(b.favoriteAt) || toTime(b.updatedAt);
      const at = toTime(a.favoriteAt) || toTime(a.updatedAt);
      return bt - at;
    });

    normal.sort((a, b) => toTime(b.updatedAt) - toTime(a.updatedAt));

    return { favoriteChats: fav, normalChats: normal };
  }, [chats]);

  const sections = useMemo(() => {
    const out = [];
    if (favoriteChats.length > 0)
      out.push({ title: "お気に入り", data: favoriteChats, isFav: true });
    out.push({ title: "あなたのトーク", data: normalChats, isFav: false });
    return out;
  }, [favoriteChats, normalChats]);

  // ==========
  // API actions
  // ==========

  const toggleFavorite = useCallback(
    async (chatId, nextFavorite) => {
      try {
        const authHeader = await getAuthHeader();
        const res = await fetch(`${API_BASE}/chats/${chatId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...authHeader },
          body: JSON.stringify({ favorite: !!nextFavorite }),
        });

        if (!res.ok) {
          const t = await res.text().catch(() => "");
          throw new Error(`PATCH /chats/:chatId HTTP ${res.status} ${t}`);
        }

        await fetchChats({ mode: "drawer" });
      } catch (e) {
        console.log("toggleFavorite error:", e);
        Alert.alert("更新失敗", "お気に入りの更新に失敗しました");
      }
    },
    [fetchChats]
  );

  const requestDeleteChat = useCallback(
    (chatId, title) => {
      Alert.alert(
        "削除しますか？",
        title ? `「${title}」を削除します` : "このトークを削除します",
        [
          { text: "キャンセル", style: "cancel" },
          {
            text: "削除",
            style: "destructive",
            onPress: async () => {
              try {
                const authHeader = await getAuthHeader();
                const res = await fetch(`${API_BASE}/chats/${chatId}`, {
                  method: "DELETE",
                  headers: { ...authHeader },
                });

                if (!res.ok) {
                  const t = await res.text().catch(() => "");
                  throw new Error(
                    `DELETE /chats/:chatId HTTP ${res.status} ${t}`
                  );
                }

                // もし今見てるチャットを消したら、Drawerは開いたままメインだけ戻す
                if (String(activeChatId) === String(chatId)) {
                  router.replace(`/`);
                }

                await fetchChats({ mode: "drawer" });
              } catch (e) {
                console.log("deleteChat error:", e);
                Alert.alert("削除失敗", "削除に失敗しました");
              }
            },
          },
        ]
      );
    },
    [activeChatId, fetchChats]
  );

  const openTitleEdit = useCallback((chat) => {
    setEditChatId(chat?.id ?? null);
    setEditTitle(chat?.title ?? "");
    setEditOpen(true);
  }, []);

  const closeTitleEdit = useCallback(() => {
    setEditOpen(false);
    setEditChatId(null);
    setEditTitle("");
    setSavingTitle(false);
  }, []);

  const saveTitle = useCallback(async () => {
    if (!editChatId) return;
    const next = (editTitle || "").trim();
    if (!next) {
      Alert.alert("入力エラー", "タイトルを入力してください");
      return;
    }

    setSavingTitle(true);
    try {
      const authHeader = await getAuthHeader();
      const res = await fetch(`${API_BASE}/chats/${editChatId}/title`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ title: next }),
      });

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`PATCH /chats/:chatId/title HTTP ${res.status} ${t}`);
      }

      closeTitleEdit();
      await fetchChats({ mode: "drawer" });
    } catch (e) {
      console.log("saveTitle error:", e);
      Alert.alert("更新失敗", "タイトルの更新に失敗しました");
      setSavingTitle(false);
    }
  }, [closeTitleEdit, editChatId, editTitle, fetchChats]);

  // ==========
  // Footer actions
  // ==========

  const user = auth.currentUser;
  const displayName = user?.displayName || user?.email || "User";
  const initials = getInitials(displayName);

  const openProfile = useCallback(() => {
    // とりあえず：後で専用画面を作るならここを置き換え
    Alert.alert("ユーザー", displayName);
  }, [displayName]);

  const openSettings = useCallback(() => {
    // とりあえず：後で設定画面へ
    router.push("/settings");
  }, []);

  const signOut = useCallback(() => {
    Alert.alert("ログアウト", "ログアウトしますか？", [
      { text: "キャンセル", style: "cancel" },
      {
        text: "ログアウト",
        style: "destructive",
        onPress: async () => {
          try {
            await auth.signOut();
            router.replace("/login");
          } catch (e) {
            console.log("signOut error:", e);
            Alert.alert("失敗", "ログアウトできませんでした");
          }
        },
      },
    ]);
  }, []);

  // ==========
  // Render
  // ==========

  return (
    <View
      style={{
        flex: 1,
        paddingTop: 60,
        paddingHorizontal: 12,
        backgroundColor: BG,
      }}
    >
      {/* タイトル編集モーダル */}
      <Modal
        visible={editOpen}
        transparent
        animationType="fade"
        onRequestClose={closeTitleEdit}
      >
        <Pressable
          onPress={closeTitleEdit}
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            padding: 20,
            justifyContent: "center",
          }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <Pressable
              onPress={() => {}}
              style={{
                backgroundColor: "#2a3439",
                borderRadius: 14,
                borderWidth: 1,
                borderColor: "rgba(232,238,246,0.18)",
                padding: 14,
              }}
            >
              <Text style={{ color: FG, fontSize: 16, fontWeight: "700" }}>
                タイトル変更
              </Text>

              <TextInput
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder="新しいタイトル"
                placeholderTextColor="rgba(232,238,246,0.45)"
                autoFocus
                style={{
                  marginTop: 12,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "rgba(232,238,246,0.18)",
                  color: FG,
                  backgroundColor: "rgba(0,0,0,0.18)",
                  fontSize: 15,
                }}
              />

              <View
                style={{
                  flexDirection: "row",
                  gap: 10,
                  marginTop: 14,
                }}
              >
                <Pressable
                  onPress={closeTitleEdit}
                  disabled={savingTitle}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 12,
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: "rgba(232,238,246,0.18)",
                    backgroundColor: "transparent",
                  }}
                >
                  <Text style={{ color: FG, fontWeight: "700" }}>
                    キャンセル
                  </Text>
                </Pressable>

                <Pressable
                  onPress={saveTitle}
                  disabled={savingTitle}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 12,
                    alignItems: "center",
                    backgroundColor: savingTitle
                      ? "rgba(232,238,246,0.18)"
                      : FG,
                  }}
                >
                  <Text style={{ color: "#6E8D96", fontWeight: "800" }}>
                    {savingTitle ? "保存中..." : "保存"}
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          marginBottom: 10,
        }}
      >
        {/* 新規作成 */}
        <Pressable
          onPress={createChat}
          disabled={creating}
          style={{
            flex: 1,
            paddingVertical: 12,
            paddingHorizontal: 12,
            borderRadius: 12,
            backgroundColor: creating ? "rgba(232,238,246,0.18)" : FG,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: "#6E8D96", fontSize: 15, fontWeight: "700" }}>
            {creating ? "作成中..." : "＋ 新しいトーク"}
          </Text>
        </Pressable>

        {/* Refresh */}
        <Pressable
          onPress={() => fetchChats({ mode: "drawer" })}
          style={{
            width: 40,
            paddingVertical: 12,
            paddingHorizontal: 12,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: BORDER,
            backgroundColor: "#6E8D96",
            alignItems: "center",
            justifyContent: "center",
            marginLeft: 10,
          }}
        >
          <Text style={{ fontSize: 14, color: "#fff" }}>↻</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => String(item.id)}
          refreshing={refreshing}
          onRefresh={() => fetchChats({ mode: "pull" })}
          contentContainerStyle={{ paddingBottom: 88 }} // フッター分の余白
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => {
            const label = section.isFav ? "⭐️ お気に入り" : "あなたのトーク";

            return (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginTop: section.isFav ? 8 : 18,
                  marginBottom: 8,
                  paddingHorizontal: 10,
                }}
              >
                <View
                  style={{
                    flex: 1,
                    height: 1,
                    backgroundColor: BORDER,
                    opacity: 0.9,
                  }}
                />
                <Text
                  style={{
                    color: MUTED,
                    fontSize: 12,
                    fontWeight: "600",
                    paddingHorizontal: 10,
                    letterSpacing: 0.2,
                    textAlign: "center",
                  }}
                >
                  {label}
                </Text>
                <View
                  style={{
                    flex: 1,
                    height: 1,
                    backgroundColor: BORDER,
                    opacity: 0.9,
                  }}
                />
              </View>
            );
          }}
          renderItem={({ item }) => {
            const selected = String(item.id) === String(activeChatId);

            const actions = [
              { title: "タイトル変更", systemIcon: "pencil" },
              item.favorite
                ? { title: "お気に入り解除", systemIcon: "star.slash" }
                : { title: "お気に入り追加", systemIcon: "star" },
              { title: "削除", systemIcon: "trash", destructive: true },
              { title: "キャンセル", systemIcon: "xmark" },
            ];

            return (
              <ContextMenu
                title={item.title || `Chat ${item.id}`}
                actions={actions}
                previewBackgroundColor="#475156"
                onPress={(e) => {
                  const idx = e?.nativeEvent?.index;

                  releaseMenuBlock();

                  if (idx === 0) return openTitleEdit(item);
                  if (idx === 1) return toggleFavorite(item.id, !item.favorite);
                  if (idx === 2) return requestDeleteChat(item.id, item.title);
                }}
                onCancel={releaseMenuBlock}
              >
                <Pressable
                  onPress={() => safeOpenChat(item.id)}
                  onPressIn={startLongPressGuard}
                  onPressOut={endLongPressGuard}
                  style={({ pressed }) => ({
                    paddingVertical: 12,
                    paddingHorizontal: 10,
                    borderRadius: 10,
                    marginBottom: 6,
                    backgroundColor: selected
                      ? SELECTED
                      : pressed
                      ? HOVER
                      : "transparent",
                    borderWidth: 1,
                    borderColor: selected
                      ? "rgba(232,238,246,0.22)"
                      : "transparent",
                  })}
                >
                  <Text numberOfLines={1} style={{ fontSize: 15, color: FG }}>
                    {item.title || `Chat ${item.id}`}
                  </Text>

                  {!!item.updatedAt && (
                    <Text
                      numberOfLines={1}
                      style={{ fontSize: 12, marginTop: 4, color: MUTED }}
                    >
                      {formatDate(item.updatedAt)}
                    </Text>
                  )}
                </Pressable>
              </ContextMenu>
            );
          }}
        />
      )}

      {/* ✅ Footer（ユーザー / 設定） */}
      <View
        style={{
          marginLeft: -13,
          marginRight: -12,
          paddingVertical: 19,
          paddingHorizontal: 12,

          borderTopWidth: 1,
          borderColor: "rgba(255,255,255,0.12)",

          overflow: "hidden", // Blurを枠内に閉じ込める
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <BlurView
          intensity={40}
          tint="dark"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
          }}
        />
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            backgroundColor: "rgba(30,38,42,0.35)",
          }}
        />
        {/* User */}
        <Pressable
          onPress={openProfile}
          onLongPress={signOut}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            paddingVertical: 8,
            paddingHorizontal: 10,
            borderRadius: 12,
            backgroundColor: pressed ? "rgba(232,238,246,0.08)" : "transparent",
          })}
        >
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: "rgba(232,238,246,0.14)",
              borderWidth: 1,
              borderColor: "rgba(232,238,246,0.18)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: FG, fontWeight: "800", fontSize: 12 }}>
              {initials}
            </Text>
          </View>

          <View style={{ maxWidth: 170 }}>
            <Text
              numberOfLines={1}
              style={{ color: FG, fontWeight: "700", fontSize: 13 }}
            >
              {displayName}
            </Text>
          </View>
        </Pressable>

        {/* Settings */}
        <Pressable
          onPress={openSettings}
          style={{
            alignItems: "center",
            justifyContent: "center",
            marginRight:24
          }}
        >
          <Text style={{ color: "#fff", fontSize: 36 }}>⚙︎</Text>
        </Pressable>
      </View>
    </View>
  );
}
