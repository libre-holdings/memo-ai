// components/TopBar.js
import React from "react";
import { View, Text, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRouter } from "expo-router";

export default function TopBar({
  title = "",
  onPressRight,
  leftType = "menu", // "menu" | "back" | "none"
  onPressLeft,       // 任意で上書き可能
}) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const router = useRouter();

  const openDrawer = () => {
    if (navigation?.openDrawer) navigation.openDrawer();
  };

  const goBack = () => {
    // expo-router / react-navigation どっちでも安定させる
    if (navigation?.canGoBack?.() && navigation.goBack) {
      navigation.goBack();
      return;
    }
    router.back();
  };

  const handleLeftPress = () => {
    if (onPressLeft) return onPressLeft();
    if (leftType === "back") return goBack();
    if (leftType === "menu") return openDrawer();
  };

  const renderLeft = () => {
    if (leftType === "none") {
      return <View style={{ width: 34, height: 34 }} />;
    }

    const iconName = leftType === "back" ? "chevron-back" : "menu";

    return (
      <Pressable
        onPress={handleLeftPress}
        hitSlop={10}
        style={({ pressed }) => ({
          width: 34,
          height: 34,
          borderRadius: 17,
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Ionicons name={iconName} size={22} color="#3e4446" />
      </Pressable>
    );
  };

  return (
    <View
      style={{
        paddingTop: insets.top,
        paddingHorizontal: 24,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: "#c4bcb9",
        zIndex: 9999,
        backgroundColor: "#D5D1CF",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          minHeight: 44,
        }}
      >
        {/* 左 */}
        <View style={{ width: 90, alignItems: "flex-start" }}>
          {renderLeft()}
        </View>

        {/* 中央 */}
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text
            style={{
              fontWeight: "700",
              letterSpacing: 2,
              fontSize: 18,
              color: "#2e464c",
            }}
          >
            {title || "メモらAI"}
          </Text>
        </View>

        {/* 右 */}
        <View style={{ width: 90, alignItems: "flex-end" }}>
          {!!onPressRight ? (
            <Pressable
              onPress={onPressRight}
              hitSlop={10}
              style={({ pressed }) => ({
                width: 34,
                height: 34,
                borderRadius: 17,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#6E8D96",
                opacity: pressed ? 0.88 : 1,
                shadowColor: "#000",
                shadowOpacity: 0.08,
                shadowRadius: 6,
                shadowOffset: { width: 0, height: 2 },
                elevation: 2,
              })}
            >
              <Ionicons name="person-add" size={18} color="#fff" />
            </Pressable>
          ) : (
            <View style={{ width: 34, height: 34 }} />
          )}
        </View>
      </View>
    </View>
  );
}
