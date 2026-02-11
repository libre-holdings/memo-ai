import React, { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { BlurView } from "expo-blur";

const IOS_BORDER = "rgba(255,255,255,0.10)";
const IOS_FG = "rgba(255,255,255,0.92)";
const IOS_MUTED = "rgba(255,255,255,0.70)";

// ガラス風スタイル
const GLASS_BORDER = "rgba(255, 255, 255, 0.18)";
const GLASS_BORDER_INNER = "rgba(255, 255, 255, 0.06)";

export default function AlarmPopover({
  visible,
  title,
  options,
  selectedMinutes,
  onSelect,
  onClose,
  anchorLayout, // { x, y, width, height } 通知項目のレイアウト
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      anim.setValue(0);
      Animated.spring(anim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 120,
        friction: 14,
      }).start();
    } else {
      Animated.timing(anim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, anim]);

  const overlayOpacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.22],
  });

  const cardOpacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  // にゅっと大きくなりながら出てくる（スケール + 微妙なスライド）
  const cardScale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.88, 1],
  });

  const cardTranslateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });

  const selectedIndex = useMemo(() => {
    const i = options.findIndex((o) => o.minutes === selectedMinutes);
    return i >= 0 ? i : 0;
  }, [options, selectedMinutes]);

  const CARD_MAX_H = 520;
  const SCREEN_PADDING = 24;
  const { height: screenHeight } = Dimensions.get("window");

  const { paddingTop, cardMaxHeight } = useMemo(() => {
    const minCardH = 200;
    const safeBottom = screenHeight - SCREEN_PADDING;
    if (anchorLayout) {
      const desiredTop = anchorLayout.y + anchorLayout.height / 2 - 120;
      const minTop = 16;
      const top = Math.max(minTop, Math.min(desiredTop, safeBottom - minCardH - SCREEN_PADDING));
      const maxH = Math.min(CARD_MAX_H, safeBottom - top - SCREEN_PADDING);
      return { paddingTop: top, cardMaxHeight: Math.max(minCardH, maxH) };
    }
    return {
      paddingTop: undefined,
      cardMaxHeight: Math.min(CARD_MAX_H, safeBottom - SCREEN_PADDING * 2),
    };
  }, [anchorLayout, screenHeight]);

  return (
    <Modal visible={!!visible} transparent animationType="none" onRequestClose={onClose}>
      {/* 背景（タップで閉じる） */}
      <Pressable onPress={onClose} style={{ flex: 1 }}>
        <Animated.View
          style={{
            flex: 1,
            backgroundColor: "black",
            opacity: overlayOpacity,
          }}
        />
      </Pressable>

      {/* カード（画面内に収める） */}
      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          paddingHorizontal: 16,
          paddingRight: 24,
          paddingBottom: SCREEN_PADDING,
          ...(anchorLayout
            ? {
                alignItems: "flex-end",
                justifyContent: "flex-start",
                paddingTop,
              }
            : {
                alignItems: "flex-end",
                justifyContent: "center",
              }),
        }}
      >
        <Animated.View
          style={[
            styles.card,
            { maxHeight: cardMaxHeight },
            {
              opacity: cardOpacity,
              transform: [
                { translateX: cardTranslateX },
                { scale: cardScale },
              ],
              ...(Platform.OS === "ios"
                ? {
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.4,
                    shadowRadius: 20,
                  }
                : { elevation: 16 }),
            },
          ]}
        >
          {/* BlurView で背景をぼかしてガラス風 */}
          <BlurView
            intensity={60}
            tint="dark"
            style={StyleSheet.absoluteFill}
            experimentalBlurMethod={Platform.OS === "android" ? "dimezisBlurView" : undefined}
          />
          {/* 半透明オーバーレイで色味を調整 */}
          <View style={[StyleSheet.absoluteFill, styles.glassOverlay]} />
          {/* 上端の光の反射 */}
          <View style={styles.glassHighlight} />
          {/* ヘッダー */}
          {title ? (
            <View
              style={{
                paddingVertical: 14,
                paddingHorizontal: 18,
                borderBottomWidth: 1,
                borderBottomColor: GLASS_BORDER_INNER,
              }}
            >
              <Text style={{ color: IOS_MUTED, fontSize: 13 }}>{title}</Text>
            </View>
          ) : null}

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 6 }}
          >
            {options.map((opt, idx) => {
              const selected = opt.minutes === selectedMinutes;
              return (
                <Pressable
                  key={String(opt.minutes)}
                  onPress={() => {
                    onSelect?.(opt.minutes);
                    onClose?.();
                  }}
                  style={({ pressed }) => ({
                    paddingVertical: 16,
                    paddingHorizontal: 18,
                    flexDirection: "row",
                    alignItems: "center",
                    opacity: pressed ? 0.72 : 1,
                  })}
                >
                  {/* ✓ */}
                  <View style={{ width: 26 }}>
                    <Text style={{ color: IOS_FG, fontSize: 18 }}>
                      {selected ? "✓" : " "}
                    </Text>
                  </View>

                  <Text style={{ color: IOS_FG, fontSize: 20, letterSpacing: 0.2 }}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: {
    minWidth: 200,
    maxWidth: 200,
    maxHeight: 520,
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: GLASS_BORDER,
  },
  glassOverlay: {
    backgroundColor: "rgba(20, 24, 30, 0.4)",
  },
  glassHighlight: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    zIndex: 1,
  },
});
