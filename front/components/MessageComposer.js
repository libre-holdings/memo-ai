// components/MessageComposer.js
import React, { useMemo, useRef, useState, useEffect } from "react";
import {
  View,
  TextInput,
  Pressable,
  Text,
  ActivityIndicator,
} from "react-native";
import Actions from "./Actions";
import { Ionicons } from "@expo/vector-icons";

export default function MessageComposer({
  value,
  onChangeText,
  onSend,
  sending = false,
  placeholder = "メッセージを入力…",
  containerStyle,
  inputStyle,
  buttonStyle,
  bottomPadding = 0,
  keepKeyboardOnSend = true,

  // ✅ 追加：親に通知したい場合（任意）
  onFocusChange,

  onPressFavorite,
  isFavorite
}) {
  const inputRef = useRef(null);
  const trimmed = useMemo(() => (value ?? "").trim(), [value]);
  const canSend = !!trimmed && !sending;

  // ✅ 追加：composer（TextInput）の開閉状態（フォーカス状態）
  const [composerOpen, setComposerOpen] = useState(false);


  const handleSend = async () => {
    if (!trimmed) {
      inputRef.current?.focus?.();
      return;
    }
    if (sending) return;

    inputRef.current?.focus?.();
    await onSend(trimmed);

    if (keepKeyboardOnSend) {
      requestAnimationFrame(() => {
        inputRef.current?.focus?.();
      });
    }
  };

  return (
    <View
      style={[
        {
          paddingTop: 10,
          paddingBottom: bottomPadding,
          backgroundColor: "#6E8D96",
          paddingHorizontal: 12,
        },
        containerStyle,
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        {/* ✅ 左：Actions（いまはまだ何もしない） */}
        {!composerOpen ? (
          <Actions
            disabled={sending}
            style={{ paddingRight: 10 }}
            onPressFavorite={onPressFavorite}
            favorite={isFavorite}
          />
        ) : null}

        {/* ✅ 入力 */}
        <View
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: "rgba(0,0,0,0.15)",
            borderRadius: 14,
            paddingHorizontal: 12,
            paddingVertical: 6,
            backgroundColor: "#fff",
          }}
        >
          <TextInput
            ref={inputRef}
            value={value}
            onChangeText={(t) => {
              if (sending) return;
              onChangeText(t);
            }}
            placeholder={placeholder}
            editable={true}
            multiline
            blurOnSubmit={false}
            // ✅ 追加：開いた/閉じたを取る
            onFocus={() => {
              setComposerOpen(true);
              onFocusChange?.(true);
            }}
            onBlur={() => {
              setComposerOpen(false);
              onFocusChange?.(false);
            }}
            style={[
              { fontSize: 16, minHeight: 24, maxHeight: 140 },
              inputStyle,
            ]}
          />
        </View>

        {/* ✅ 送信 */}
        <Pressable
          onPress={handleSend}
          style={[
            {
              marginLeft: 0,
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
              minWidth: 52,
              opacity: sending ? 0.8 : 1,
            },
            buttonStyle,
          ]}
        >
          {sending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Ionicons
              name="send"
              size={22}
              color="white"
              style={{ opacity: canSend ? 1 : 0.6 }}
            />
          )}
        </Pressable>
      </View>
    </View>
  );
}
