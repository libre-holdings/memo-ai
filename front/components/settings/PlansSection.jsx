// components/settings/PlansSection.jsx
import React from "react";
import { View, Text, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export default function PlansSection({
  currentPlan, // "free" | "pro" | "extra"
  onPressProUpgrade,
  onPressRestore,
}) {
  const PlanChip = ({ active, label }) => (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: active
          ? "rgba(255,255,255,0.12)"
          : "rgba(255,255,255,0.07)",
        borderWidth: 1,
        borderColor: active
          ? "rgba(255,255,255,0.22)"
          : "rgba(255,255,255,0.12)",
      }}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: "900",
          color: "rgba(255,255,255,0.92)",
        }}
      >
        {label}
      </Text>
    </View>
  );

  const FeatureRow = ({ text }) => (
    <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
      <Text style={{ color: "rgba(255,255,255,0.78)", marginTop: 1 }}>•</Text>
      <Text
        style={{
          flex: 1,
          fontSize: 12.5,
          lineHeight: 18,
          color: "rgba(255,255,255,0.76)",
        }}
      >
        {text}
      </Text>
    </View>
  );

  const PlanCard = ({
    planId,
    title,
    subtitle,
    badge,
    gradientColors,
    comingSoon,
    onPressUpgrade,
  }) => {
    const isCurrent = currentPlan === planId;

    return (
      <View style={{ borderRadius: 12, overflow: "hidden" }}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 12,
            padding: 14,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.10)",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text
              style={{
                fontSize: 15,
                fontWeight: "900",
                color: "rgba(255,255,255,0.92)",
              }}
            >
              {title}
            </Text>

            <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
              {comingSoon ? <PlanChip active label="COMING SOON" /> : null}
              {isCurrent ? <PlanChip active label="現在" /> : <PlanChip label={badge} />}
            </View>
          </View>

          <Text
            style={{
              marginTop: 6,
              fontSize: 12.5,
              color: "rgba(255,255,255,0.72)",
            }}
          >
            {subtitle}
          </Text>

          <View style={{ height: 12 }} />

          <View style={{ gap: 6 }}>
            {planId === "free" ? (
              <>
                <FeatureRow text="広告表示あり" />
                <FeatureRow text="新規トークルーム作成数：30" />
              </>
            ) : null}

            {planId === "pro" ? (
              <>
                <FeatureRow text="広告削除" />
                <FeatureRow text="新規トークルーム作成数：無制限" />
              </>
            ) : null}

            {planId === "extra" ? (
              <>
                <FeatureRow text="広告削除" />
                <FeatureRow text="新規トークルーム作成数：無制限" />
                <FeatureRow text="ChatGPT をトークに招待可能（ほか拡張機能…etc）" />
              </>
            ) : null}
          </View>

          <View style={{ height: 14 }} />

          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable
              onPress={() => {}}
              style={({ pressed }) => ({
                flex: 1,
                height: 42,
                borderRadius: 14,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.9 : 1,
                backgroundColor: "rgba(255,255,255,0.10)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.14)",
              })}
            >
              <Text style={{ fontWeight: "900", color: "rgba(255,255,255,0.92)" }}>
                詳細
              </Text>
            </Pressable>

            <Pressable
              disabled={comingSoon || isCurrent || !onPressUpgrade}
              onPress={onPressUpgrade}
              style={({ pressed }) => ({
                width: 130,
                height: 42,
                borderRadius: 14,
                alignItems: "center",
                justifyContent: "center",
                opacity: comingSoon || isCurrent ? 0.55 : pressed ? 0.9 : 1,
                backgroundColor: "rgba(255,255,255,0.16)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.18)",
              })}
            >
              <Text style={{ fontWeight: "900", color: "rgba(255,255,255,0.92)" }}>
                {comingSoon ? "準備中" : isCurrent ? "選択中" : "アップグレード"}
              </Text>
            </Pressable>
          </View>
        </LinearGradient>
      </View>
    );
  };

  return (
    <View style={{ gap: 12 }}>

      <PlanCard
        planId="free"
        title="フリープラン"
        subtitle="まずは気軽に。基本機能を試せます。"
        badge="FREE"
        gradientColors={["#111217", "#1b1f2a", "#0f1116"]}
        comingSoon={false}
      />

      <PlanCard
        planId="pro"
        title="プロプラン"
        subtitle="広告なし & 新規トーク無制限で、集中して使える。"
        badge="PRO"
        gradientColors={["#0f172a", "#1f2a44", "#0b1220"]}
        comingSoon={false}
        onPressUpgrade={onPressProUpgrade}
      />

      <PlanCard
        planId="extra"
        title="エクストラプラン"
        subtitle="さらに拡張。ChatGPT招待などの追加機能を予定。"
        badge="EXTRA"
        gradientColors={["#1a1026", "#2a1a44", "#120a1e"]}
        comingSoon={true}
      />

      {/* 復元 */}
      <Pressable
        onPress={onPressRestore}
        style={({ pressed }) => ({
          height: 44,
          borderRadius: 14,
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed ? 0.9 : 1,
          backgroundColor: "rgba(46,70,76,0.10)",
          borderWidth: 1,
          borderColor: "rgba(46,70,76,0.18)",
        })}
      >
        <Text style={{ fontWeight: "900", color: "#22363b" }}>
          購入を復元（Restore）
        </Text>
      </Pressable>
    </View>
  );
}
