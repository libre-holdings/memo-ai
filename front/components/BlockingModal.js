// components/BlockingModal.js
import React, { useEffect, useRef, useState } from "react";
import { Modal, View, Pressable, StyleSheet, Platform } from "react-native";

/**
 * BlockingModal
 * - 背面タップで閉じる
 * - 背面タップが「下の画面」にすり抜けてPressableが発火するのを防止
 * - 閉じた直後の “1タップ” も吸収（OS差・アニメ差対策）
 *
 * 使い方:
 * <BlockingModal visible={visible} onClose={() => setVisible(false)}>
 *   <YourContent />
 * </BlockingModal>
 */
export default function BlockingModal({
  visible,
  onClose,
  children,
  backdropOpacity = 0.45,
  animationType = Platform.OS === "ios" ? "fade" : "fade",
}) {
  // ✅ 閉じた瞬間の「タップすり抜け」を吸うために、少しだけ表示を残す
  const [blocking, setBlocking] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    // visible=true になったらブロック開始
    if (visible) {
      setBlocking(true);
      return;
    }

    // visible=false になっても、短時間だけ透明のまま残してタップを吸う
    // ここを長くすると操作感が重くなるので 200〜300ms がおすすめ
    timerRef.current = setTimeout(() => {
      setBlocking(false);
    }, 250);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible]);

  // 実際にModalを表示する条件（ブロック中も表示）
  const show = visible || blocking;

  return (
    <Modal
      visible={show}
      transparent
      animationType={animationType}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* ✅ ここが最重要：全面でタッチを食う背面 */}
      <Pressable
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: `rgb(0,0,0)` },
        ]}
        onPress={onClose}
      />

      {/* ✅ モーダル本体：container は box-none（背景のタップは背面で拾う） */}
      <View style={styles.container} pointerEvents="box-none">
        {/* ✅ panel内はタップ可能。ここを押しても閉じない */}
        <Pressable style={styles.panel} onPress={() => {}}>
          {children}
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // 中央表示（下から出すならここの配置を変える）
    justifyContent: "center",
    padding: 16,
  },
  panel: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: "#1e262a",
    borderWidth: 1,
    borderColor: "rgba(232,238,246,0.14)",
  },
});
