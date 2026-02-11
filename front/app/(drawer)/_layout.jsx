import React from "react";
import { Drawer } from "expo-router/drawer";
import ChatSidebar from "../../components/ChatSidebar";

const BG = "#D5D1CF";

export default function DrawerLayout() {
  return (
    <Drawer
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: BG },
      }}
      drawerContent={(props) => <ChatSidebar {...props} />}
    >
      <Drawer.Screen name="index" options={{ title: "New" }} />
      <Drawer.Screen name="chat/[id]" options={{ title: "Chat" }} />

      {/* 設定: Drawer配下に置くが、メニューには出さない & スワイプで開かせない */}
      <Drawer.Screen
        name="settings"
        options={{
          title: "Settings",
          swipeEnabled: false, // ✅ ここが効く
          drawerItemStyle: { display: "none" }, // ✅ メニューから隠す
        }}
      />
    </Drawer>
  );
}
