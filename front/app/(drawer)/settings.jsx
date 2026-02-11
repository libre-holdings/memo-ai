// app/settings.jsx
import React, { useState } from "react";
import { View, Text, Pressable, ActivityIndicator, ScrollView } from "react-native";
import TopBar from "../../components/TopBar";
import { useAuth } from "../../context/AuthContext";
import { AccountCard } from "../../components/settings/AccountCard";
import PlansSection from "../../components/settings/PlansSection";

export default function SettingsScreen() {
  const { user, loading, linkGoogle, plan, refreshClaims } = useAuth();
  const [autoCalendar, setAutoCalendar] = useState(true);

  const currentPlan = plan; // custom claims 由来を想定

  const handleGoogleLogin = async () => {
    try {
      await linkGoogle();
    } catch (e) {
      console.log("[Settings] linkGoogle error:", e?.code, e?.message, e);
    }
  };

  const purchasePro = async () => {
    try {
      console.log("[IAP] purchasePro start");

      // ✅ 次のターンでここを実実装（RevenueCat / expo-iap / etc）
      // いったん「課金処理が成功した想定」で claims 再取得だけ呼べるようにしておく
      // 実際は purchase 成功 → サーバ検証 → setCustomClaims → refreshClaims の順。
      // await callYourServerVerifyReceipt(...)
      const p = await refreshClaims();
      console.log("[IAP] refreshClaims after purchase:", p);

      console.log("[IAP] purchasePro end");
    } catch (e) {
      console.log("[IAP] purchasePro error:", e?.message, e);
    }
  };

  const restorePurchases = async () => {
    try {
      console.log("[IAP] restore start");

      // ✅ 次のターンで実実装
      // restore → サーバ検証（もしくはRevenueCat entitlements）→ claims更新 → refreshClaims
      const p = await refreshClaims();
      console.log("[IAP] refreshClaims after restore:", p);

      console.log("[IAP] restore end");
    } catch (e) {
      console.log("[IAP] restore error:", e?.message, e);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#D5D1CF" }}>
        <TopBar leftType="back" title="設定" />
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator />
        </View>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: "#D5D1CF" }}>
        <TopBar leftType="back" title="設定" />
        <View style={{ padding: 24 }}>
          <Text style={{ color: "#2e464c" }}>ユーザー情報を取得できませんでした。</Text>
        </View>
      </View>
    );
  }

  const googleProvider = user.providerData?.find((p) => p.providerId === "google.com");
  const displayName = user.displayName || googleProvider?.displayName || "";
  const email = user.email || googleProvider?.email || "";
  const photoURL = user.photoURL || googleProvider?.photoURL || "";

  const ToggleSwitch = ({ value, onChange }) => (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      style={({ pressed }) => ({
        width: 56,
        height: 32,
        borderRadius: 999,
        padding: 3,
        justifyContent: "center",
        backgroundColor: value ? "#2e464c" : "rgba(46,70,76,0.18)",
        borderWidth: 1,
        borderColor: value ? "rgba(46,70,76,0.35)" : "rgba(46,70,76,0.20)",
        opacity: pressed ? 0.9 : 1,
      })}
    >
      <View
        style={{
          width: 26,
          height: 26,
          borderRadius: 999,
          backgroundColor: "#fff",
          transform: [{ translateX: value ? 22 : 0 }],
          shadowColor: "#000",
          shadowOpacity: 0.18,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
          elevation: 3,
        }}
      />
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#D5D1CF" }}>
      <TopBar leftType="back" title="設定" />

      {/* AccountCard は ScrollView 外（固定） */}
      <AccountCard
        user={user}
        email={email}
        displayName={displayName}
        photoURL={photoURL}
        onPressGoogleLink={handleGoogleLogin}
      />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: 28,
          gap: 14,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* 基本設定 */}
        <View
          style={{
            backgroundColor: "rgba(255,255,255,0.72)",
            borderRadius: 18,
            padding: 16,
            borderWidth: 1,
            borderColor: "rgba(46,70,76,0.18)",
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: "900", color: "#22363b" }}>
            基本設定
          </Text>

          <View style={{ height: 12 }} />

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              paddingVertical: 6,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13.5, fontWeight: "800", color: "#22363b" }}>
                カレンダー自動検知
              </Text>
              <Text
                style={{
                  marginTop: 4,
                  fontSize: 12.5,
                  lineHeight: 18,
                  color: "rgba(34,54,59,0.70)",
                }}
              >
                ※オン時：メモ内容に応じてカレンダー追加モーダルが表示されるようになります
              </Text>
            </View>

            <ToggleSwitch value={autoCalendar} onChange={setAutoCalendar} />
          </View>
        </View>

        {/* プラン（コンポーネント） */}
        <PlansSection
          currentPlan={currentPlan}
          onPressProUpgrade={purchasePro}
          onPressRestore={restorePurchases}
        />

        {/* デバッグ表示（要らなければ消してOK） */}
        <View style={{ padding: 10 }}>
          <Text style={{ color: "rgba(34,54,59,0.65)", fontWeight: "800" }}>
            currentPlan(claims): {currentPlan}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
