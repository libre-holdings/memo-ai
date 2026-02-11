// components/Bubble.js
import React from "react";
import { View, Text } from "react-native";

export default function Bubble({
  children,
  isUser = true,
  bg = "#eff2f3",
  textColor = "#2e464c",
  style,
  textStyle,
  maxWidth = "82%",
  radius = 16,
  tailW = 10,     // 尻尾の横幅
  tailH = 10,     // 尻尾の高さ
  tailOffset = 6, // 外に出す量
}) {
  const bubble = (
    <View
      style={[
        {
          position: "relative",
          backgroundColor: bg,
          borderRadius: radius,
          paddingHorizontal: 12,
          paddingVertical: 10,
          maxWidth,
          overflow: "visible",
        },
        style,
      ]}
    >
      {/* Tail（三角形） */}
      <View
        style={{
          position: "absolute",
          bottom: 8,

          // 右 or 左に出す
          ...(isUser ? { right: -tailOffset } : { left: -tailOffset }),

          width: 0,
          height: 0,
          borderTopWidth: tailH,
          borderBottomWidth: tailH,
          borderLeftWidth: isUser ? tailW : 0,
          borderRightWidth: isUser ? 0 : tailW,

          borderTopColor: "transparent",
          borderBottomColor: "transparent",

          // 右なら左ボーダーに色、左なら右ボーダーに色
          borderLeftColor: isUser ? bg : "transparent",
          borderRightColor: isUser ? "transparent" : bg,
        }}
      />

      <Text
        style={[
          {
            color: textColor,
            fontSize: 15,
            lineHeight: 20,
          },
          textStyle,
        ]}
      >
        {children}
      </Text>
    </View>
  );

  // alignSelf を外側で決める（崩れにくい）
  return (
    <View style={{ alignSelf: isUser ? "flex-end" : "flex-start" }}>
      {bubble}
    </View>
  );
}
