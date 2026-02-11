import React from "react";
import { View, Text, Pressable, ActivityIndicator, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";

export function AccountCard({
  user,
  email,
  displayName,
  photoURL,
  onPressGoogleLink,
}) {
  const isAnonymous = !!user?.isAnonymous;

  // 画像が無いときの丸アイコン（頭文字）
  const initial = (displayName || email || "U").trim().slice(0, 1);

  return (
    <View style={{  overflow: "hidden" }}>
      {/* 外枠グラデ */}
      <LinearGradient
        colors={["rgba(255,255,255,0.55)", "rgba(255,255,255,0.18)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          padding: 1.2,
        }}
      >
        {/* ほんのり背景グラデ */}
        <LinearGradient
          colors={["rgba(46,70,76,0.18)", "rgba(17,17,17,0.10)", "rgba(255,255,255,0.12)"]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={{
          }}
        >
          {/* ガラスっぽいブラー */}
          <BlurView
            intensity={28}
            tint="light"
            style={{
              borderRadius: 21,
              padding: 16,
            }}
          >
            {/* 上部：タイトル + ステータス */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 15, fontWeight: "800", color: "#22363b" }}>
                アカウント
              </Text>

              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 999,
                  backgroundColor: isAnonymous ? "rgba(255, 170, 0, 0.16)" : "rgba(0, 170, 120, 0.14)",
                  borderWidth: 1,
                  borderColor: isAnonymous ? "rgba(255, 170, 0, 0.25)" : "rgba(0, 170, 120, 0.22)",
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#22363b" }}>
                  {isAnonymous ? "匿名" : "連携済み"}
                </Text>
              </View>
            </View>

            <View style={{ height: 14 }} />

            {/* 本体：左アバター / 右情報 */}
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {/* 左：アバター */}
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 18,
                  overflow: "hidden",
                  backgroundColor: "rgba(46,70,76,0.10)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.45)",
                }}
              >
                {photoURL ? (
                  <Image
                    source={{ uri: photoURL }}
                    style={{ width: "100%", height: "100%" }}
                  />
                ) : (
                  <LinearGradient
                    colors={["rgba(46,70,76,0.35)", "rgba(46,70,76,0.12)"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      flex: 1,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontSize: 22, fontWeight: "900", color: "#22363b" }}>
                      {initial.toUpperCase()}
                    </Text>
                  </LinearGradient>
                )}
              </View>

              <View style={{ width: 12 }} />

              {/* 右：テキスト */}
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "900",
                    color: "#1f3338",
                  }}
                  numberOfLines={1}
                >
                  {displayName || (isAnonymous ? "ゲストユーザー" : "ユーザー")}
                </Text>

                <View style={{ height: 4 }} />

                {!!email ? (
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: "rgba(34,54,59,0.72)",
                    }}
                    numberOfLines={1}
                  >
                    {email}
                  </Text>
                ) : (
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: "rgba(34,54,59,0.60)",
                    }}
                  >
                    {isAnonymous
                      ? "端末依存の一時アカウントです"
                      : "メール情報が取得できませんでした"}
                  </Text>
                )}

                {isAnonymous ? (
                  <>
                    <View style={{ height: 10 }} />
                    <Text style={{ fontSize: 12.5, lineHeight: 18, color: "rgba(34,54,59,0.70)" }}>
                      端末変更・アプリ削除でデータを失う可能性があります。
                      Google 連携で引き継げます。
                    </Text>
                  </>
                ) : null}
              </View>
            </View>

            {/* アクション */}
            <View style={{ height: 14 }} />

            {isAnonymous ? (
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Pressable
                  onPress={onPressGoogleLink}
                  style={({ pressed }) => ({
                    flex: 1,
                    height: 46,
                    borderRadius: 14,
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: pressed ? 0.88 : 1,
                    backgroundColor: "#2e464c",
                    shadowColor: "#000",
                    shadowOpacity: 0.12,
                    shadowRadius: 10,
                    shadowOffset: { width: 0, height: 6 },
                    elevation: 3,
                  })}
                >
                  <Text style={{ color: "#fff", fontWeight: "900" }}>
                    Google で連携
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => {}}
                  style={({ pressed }) => ({
                    width: 52,
                    height: 46,
                    borderRadius: 14,
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: pressed ? 0.88 : 1,
                    backgroundColor: "rgba(17,17,17,0.92)",
                    shadowColor: "#000",
                    shadowOpacity: 0.10,
                    shadowRadius: 10,
                    shadowOffset: { width: 0, height: 6 },
                    elevation: 2,
                  })}
                >
                  {/* Appleは後で：ひとまず “” で */}
                  <Text style={{ color: "#fff", fontSize: 18, fontWeight: "900" }}></Text>
                </Pressable>
              </View>
            ) : (
              <View
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 14,
                  backgroundColor: "rgba(0, 170, 120, 0.10)",
                  borderWidth: 1,
                  borderColor: "rgba(0, 170, 120, 0.14)",
                }}
              >
                <Text style={{ color: "rgba(34,54,59,0.85)", fontWeight: "700" }}>
                  ✅ Google 連携が完了しています
                </Text>
              </View>
            )}
          </BlurView>
        </LinearGradient>
      </LinearGradient>
    </View>
  );
}
