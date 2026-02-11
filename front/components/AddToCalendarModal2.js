// AddToCalendarModal.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  Switch,
  Text,
  TextInput,
  View,
  ActivityIndicator,
  ScrollView,
  Animated,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Calendar from "expo-calendar";

import AlarmPopover from "./AlarmPopover";
import { createCalendarEvent } from "../libs/AddCalendar";

/**
 * 通知オプション（分単位）
 * -1 = なし
 */
const ALARM_OPTIONS = [
  { label: "なし", minutes: -1 },
  { label: "予定の時刻", minutes: 0 },
  { label: "5分前", minutes: 5 },
  { label: "10分前", minutes: 10 },
  { label: "15分前", minutes: 15 },
  { label: "30分前", minutes: 30 },
  { label: "1時間前", minutes: 60 },
  { label: "2時間前", minutes: 120 },
  { label: "1日前", minutes: 1440 },
  { label: "2日前", minutes: 2880 },
  { label: "1週間前", minutes: 10080 },
];

function labelByMinutes(m) {
  return ALARM_OPTIONS.find((x) => x.minutes === m)?.label ?? "なし";
}

function pad2(n) {
  return String(n).padStart(2, "0");
}
function formatDateJP(d) {
  return `${d.getFullYear()}/${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}`;
}
function formatTimeJP(d) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/**
 * ✅ expo-calendar の Alarm.relativeOffset は「分」(minutes)
 */
export function buildAlarms(primaryMinutes, backupMinutes) {
  const uniq = new Set([primaryMinutes, backupMinutes].filter((m) => m !== -1));
  return Array.from(uniq)
    .sort((a, b) => a - b)
    .map((m) => ({
      relativeOffset: -m, // ← 分
    }));
}

// iOSっぽい配色（ダーク）
const IOS_BG = "#0B0F14";
const IOS_CARD = "rgba(232,238,246,0.06)";
const IOS_BORDER = "rgba(232,238,246,0.12)";
const IOS_FG = "#E8EEF6";
const IOS_MUTED = "rgba(232,238,246,0.65)";
const IOS_BLUE = "#0A84FF";

// 行コンポーネント（iOSの設定/カレンダーっぽい行）
function Row({ children, style }) {
  return (
    <View
      style={[
        {
          minHeight: 44,
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 12,
          borderTopWidth: 1,
          borderTopColor: IOS_BORDER,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
function RowLabel({ children }) {
  return (
    <Text style={{ color: IOS_FG, fontSize: 16, flex: 1 }}>{children}</Text>
  );
}
const SELECTED_COLOR = "#2da7c8";

function RowValue({ children, muted, selected }) {
  const color = selected ? SELECTED_COLOR : muted ? IOS_FG : IOS_FG;
  return (
    <Text
      style={{ color, fontSize: 16 }}
      numberOfLines={1}
    >
      {children}
    </Text>
  );
}

// ----------------------
// カレンダー選択ポップオーバー（画像の「職場/自宅」みたいなやつ）
// ----------------------
function CalendarPopover({
  visible,
  calendars,
  selectedId,
  onSelect,
  onClose,
}) {
  const anim = useMemo(() => new Animated.Value(0), []);
  useEffect(() => {
    Animated.timing(anim, {
      toValue: visible ? 1 : 0,
      duration: visible ? 160 : 120,
      useNativeDriver: true,
    }).start();
  }, [visible, anim]);

  const overlayOpacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.18],
  });
  const cardOpacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const cardScale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1],
  });

  return (
    <Modal
      visible={!!visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Pressable onPress={onClose} style={{ flex: 1 }}>
        <Animated.View
          style={{ flex: 1, backgroundColor: "black", opacity: overlayOpacity }}
        />
      </Pressable>

      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 16,
        }}
      >
        <Animated.View
          style={{
            width: "100%",
            maxWidth: 360,
            maxHeight: 320,
            borderRadius: 22,
            overflow: "hidden",
            opacity: cardOpacity,
            transform: [{ scale: cardScale }],
            backgroundColor: "rgba(30,30,32,0.86)",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.10)",
          }}
        >
          <View style={{ paddingVertical: 12, paddingHorizontal: 16 }}>
            <Text style={{ color: IOS_MUTED, fontSize: 13 }}>
              {Platform.OS === "ios" ? "iCloud" : "カレンダー"}
            </Text>
          </View>
          <View
            style={{
              height: 1,
              backgroundColor: "rgba(255,255,255,0.10)",
            }}
          />

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 6 }}
          >
            {calendars.map((c) => {
              const selected = c.id === selectedId;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => {
                    onSelect?.(c);
                    onClose?.();
                  }}
                  style={({ pressed }) => ({
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    flexDirection: "row",
                    alignItems: "center",
                    opacity: pressed ? 0.72 : 1,
                  })}
                >
                  <View style={{ width: 24 }}>
                    <Text style={{ color: IOS_FG, fontSize: 18 }}>
                      {selected ? "✓" : " "}
                    </Text>
                  </View>

                  <View
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 6,
                      backgroundColor: c.color || "#888",
                      marginRight: 10,
                    }}
                  />

                  <Text style={{ color: IOS_FG, fontSize: 19 }}>{c.title}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

export default function AddToCalendarModal({
  visible,
  onClose,

  // 初期値（必要なら）
  initialTitle = "",
  initialStartAt,
  initialEndAt,
  initialAllDay = false,
  initialAlarmPrimary = 10,
  initialAlarmBackup = -1,

  // カレンダー初期選択（任意）
  initialCalendarId = null,
}) {
  const now = useMemo(() => new Date(), []);
  const defaultStart = useMemo(() => {
    const d = new Date(now);
    d.setMinutes(Math.ceil(d.getMinutes() / 5) * 5, 0, 0);
    return d;
  }, [now]);

  const defaultEnd = useMemo(() => {
    const d = new Date(defaultStart);
    d.setHours(d.getHours() + 1);
    return d;
  }, [defaultStart]);

  const [title, setTitle] = useState(initialTitle);
  const [allDay, setAllDay] = useState(initialAllDay);

  const [startAt, setStartAt] = useState(initialStartAt || defaultStart);
  const [endAt, setEndAt] = useState(initialEndAt || defaultEnd);

  const [alarmPrimary, setAlarmPrimary] = useState(initialAlarmPrimary);
  const [alarmBackup, setAlarmBackup] = useState(initialAlarmBackup);

  // 通知の Popover
  const [alarmPopoverOpen, setAlarmPopoverOpen] = useState(false);
  const [alarmPopoverTarget, setAlarmPopoverTarget] = useState("primary");
  const [alarmPopoverAnchor, setAlarmPopoverAnchor] = useState(null);
  const alarmPrimaryRowRef = useRef(null);
  const alarmBackupRowRef = useRef(null);

  // カレンダー選択
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [writableCalendars, setWritableCalendars] = useState([]);
  const [selectedCalendar, setSelectedCalendar] = useState(null);
  const [calendarPopoverOpen, setCalendarPopoverOpen] = useState(false);

  // 行の下に表示するインラインピッカー（後から押した方のみ表示）
  // "startDate" | "startTime" | "endDate" | "endTime"
  const [expandedPicker, setExpandedPicker] = useState(null);

  const openPicker = (picker) => {
    setExpandedPicker((p) => (p === picker ? null : picker));
  };

  // visible になったらカレンダー一覧を取得（書き込み可能なもの）
  useEffect(() => {
    let cancelled = false;

    async function loadCalendars() {
      if (!visible) return;
      setCalendarLoading(true);
      try {
        const perm = await Calendar.requestCalendarPermissionsAsync();
        if (perm.status !== "granted") {
          throw new Error("カレンダー権限が許可されていません");
        }

        const cals = await Calendar.getCalendarsAsync(
          Calendar.EntityTypes.EVENT
        );
        const writable = (cals || []).filter((c) => c.allowsModifications);

        writable.sort((a, b) =>
          (a.title || "").localeCompare(b.title || "")
        );

        if (cancelled) return;
        setWritableCalendars(writable);

        const byId =
          initialCalendarId && writable.find((c) => c.id === initialCalendarId);
        const primary = writable.find((c) => c.isPrimary);
        setSelectedCalendar(byId || primary || writable[0] || null);
      } catch (e) {
        if (!cancelled) {
          console.log(e);
          setWritableCalendars([]);
          setSelectedCalendar(null);
        }
      } finally {
        if (!cancelled) setCalendarLoading(false);
      }
    }

    loadCalendars();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const openAlarmPopover = (target) => {
    setAlarmPopoverTarget(target);
    const ref = target === "primary" ? alarmPrimaryRowRef : alarmBackupRowRef;
    if (ref.current) {
      ref.current.measureInWindow((x, y, width, height) => {
        setAlarmPopoverAnchor({ x, y, width, height });
        setAlarmPopoverOpen(true);
      });
    } else {
      setAlarmPopoverAnchor(null);
      setAlarmPopoverOpen(true);
    }
  };

  const onPressSave = async () => {
    if (!title.trim())
      return Alert.alert("不足", "タイトルを入力してください");

    const startDate = allDay
      ? new Date(
          startAt.getFullYear(),
          startAt.getMonth(),
          startAt.getDate(),
          0,
          0,
          0,
          0
        )
      : startAt;

    const endDate = allDay
      ? new Date(
          endAt.getFullYear(),
          endAt.getMonth(),
          endAt.getDate(),
          23,
          59,
          0,
          0
        )
      : endAt;

    if (endDate <= startDate) {
      return Alert.alert("確認", "終了が開始より後になるようにしてください");
    }

    const alarms = buildAlarms(alarmPrimary, alarmBackup);

    try {
      const res = await createCalendarEvent({
        title: title.trim(),
        startDate,
        endDate,
        allDay,
        alarms: alarms.length ? alarms : undefined,
        calendarId: selectedCalendar?.id || undefined,
      });

      console.log("res：", res);
      Alert.alert("完了", "カレンダーに追加しました");

      // ✅ 成功したら入力をリセット
      setTitle("");
      setAllDay(false);
      setStartAt(defaultStart);
      setEndAt(defaultEnd);
      setAlarmPrimary(-1);
      setAlarmBackup(-1);

      onClose?.();
    } catch (e) {
      console.log(e);
      Alert.alert("失敗", String(e?.message || e));
    }
  };

  const selectedForPopover =
    alarmPopoverTarget === "primary" ? alarmPrimary : alarmBackup;

  return (
    <Modal
      visible={!!visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)" }}>
        <View
          style={{
            flex: 1,
            marginTop: 60,
            backgroundColor: IOS_BG,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            overflow: "hidden",
          }}
        >
          {/* iOSっぽいナビバー */}
          <View
            style={{
              height: 52,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 14,
              borderBottomWidth: 1,
              borderBottomColor: IOS_BORDER,
            }}
          >
            <Pressable onPress={onClose} hitSlop={10}>
              <Text style={{ color: IOS_BLUE, fontSize: 17 }}>キャンセル</Text>
            </Pressable>

            <Text style={{ color: IOS_FG, fontSize: 17, fontWeight: "600" }}>
              新規
            </Text>

            <Pressable onPress={onPressSave} hitSlop={10}>
              <Text style={{ color: IOS_BLUE, fontSize: 17, fontWeight: "600" }}>
                保存
              </Text>
            </Pressable>
          </View>

          {/* コンテンツ */}
          <View style={{ padding: 16, flex: 1 }}>
            {/* タイトル */}
            <View
              style={{
                backgroundColor: IOS_CARD,
                borderWidth: 1,
                borderColor: IOS_BORDER,
                borderRadius: 14,
                overflow: "hidden",
                marginBottom: 14,
              }}
            >
              <Row style={{ borderTopWidth: 0 }}>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="タイトル"
                  placeholderTextColor={IOS_MUTED}
                  style={{
                    color: IOS_FG,
                    fontSize: 18,
                    flex: 1,
                    paddingVertical: 10,
                  }}
                  returnKeyType="done"
                />
              </Row>
            </View>

            {/* 日時 */}
            <View
              style={{
                backgroundColor: IOS_CARD,
                borderWidth: 1,
                borderColor: IOS_BORDER,
                borderRadius: 14,
                overflow: "hidden",
                marginBottom: 14,
              }}
            >
              {/* 終日 */}
              <Row
                style={{
                  borderTopWidth: 0,
                  minHeight: 56,
                  paddingVertical: 10,
                }}
              >
                <RowLabel>終日</RowLabel>
                <Switch
                  value={allDay}
                  onValueChange={setAllDay}
                  trackColor={{
                    true: IOS_BLUE,
                    false: "rgba(255,255,255,0.2)",
                  }}
                  thumbColor={"#ffffff"}
                  style={{ alignSelf: "center" }}
                />
              </Row>

              {/* 開始 */}
              <Row style={{ minHeight: 56, paddingVertical: 10 }}>
                <RowLabel>開始</RowLabel>

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Pressable
                    onPress={() => openPicker("startDate")}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: IOS_BORDER,
                      backgroundColor: IOS_CARD,
                    }}
                  >
                    <RowValue selected={expandedPicker === "startDate"}>
                      {formatDateJP(startAt)}
                    </RowValue>
                  </Pressable>

                  {!allDay && (
                    <Pressable
                      onPress={() => openPicker("startTime")}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: IOS_BORDER,
                        backgroundColor: IOS_CARD,
                      }}
                    >
                      <RowValue
                        muted
                        selected={expandedPicker === "startTime"}
                      >
                        {formatTimeJP(startAt)}
                      </RowValue>
                    </Pressable>
                  )}
                </View>
              </Row>

              {/* 開始行の下：日付または時間ピッカー（後から押した方のみ） */}
              {expandedPicker === "startDate" && (
                <View
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    borderTopWidth: 1,
                    borderTopColor: IOS_BORDER,
                    backgroundColor: "rgba(0,0,0,0.2)",
                  }}
                >
                  <DateTimePicker
                    value={startAt}
                    mode="date"
                    display={Platform.OS === "ios" ? "inline" : "calendar"}
                    locale="ja-JP"
                    themeVariant="dark"
                    onChange={(e, d) => {
                      if (d) {
                        const next = new Date(startAt);
                        next.setFullYear(
                          d.getFullYear(),
                          d.getMonth(),
                          d.getDate()
                        );
                        setStartAt(next);
                      }
                    }}
                    style={Platform.OS === "ios" ? { alignSelf: "center" } : {}}
                  />
                </View>
              )}

              {expandedPicker === "startTime" && !allDay && (
                <View
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    borderTopWidth: 1,
                    borderTopColor: IOS_BORDER,
                    backgroundColor: "rgba(0,0,0,0.2)",
                  }}
                >
                  <DateTimePicker
                    value={startAt}
                    mode="time"
                    display="spinner"
                    locale="ja-JP"
                    themeVariant="dark"
                    onChange={(e, d) => {
                      if (d) {
                        const next = new Date(startAt);
                        next.setHours(d.getHours(), d.getMinutes(), 0, 0);
                        setStartAt(next);
                      }
                    }}
                    style={Platform.OS === "ios" ? { alignSelf: "center" } : {}}
                  />
                </View>
              )}

              {/* 終了 */}
              <Row style={{ minHeight: 56, paddingVertical: 10 }}>
                <RowLabel>終了</RowLabel>

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Pressable
                    onPress={() => openPicker("endDate")}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: IOS_BORDER,
                      backgroundColor: IOS_CARD,
                    }}
                  >
                    <RowValue selected={expandedPicker === "endDate"}>
                      {formatDateJP(endAt)}
                    </RowValue>
                  </Pressable>

                  {!allDay && (
                    <Pressable
                      onPress={() => openPicker("endTime")}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: IOS_BORDER,
                        backgroundColor: IOS_CARD,
                      }}
                    >
                      <RowValue muted selected={expandedPicker === "endTime"}>
                        {formatTimeJP(endAt)}
                      </RowValue>
                    </Pressable>
                  )}
                </View>
              </Row>

              {/* 終了行の下：日付または時間ピッカー（後から押した方のみ） */}
              {expandedPicker === "endDate" && (
                <View
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    borderTopWidth: 1,
                    borderTopColor: IOS_BORDER,
                    backgroundColor: "rgba(0,0,0,0.2)",
                  }}
                >
                  <DateTimePicker
                    value={endAt}
                    mode="date"
                    display={Platform.OS === "ios" ? "inline" : "calendar"}
                    locale="ja-JP"
                    themeVariant="dark"
                    onChange={(e, d) => {
                      if (d) {
                        const next = new Date(endAt);
                        next.setFullYear(
                          d.getFullYear(),
                          d.getMonth(),
                          d.getDate()
                        );
                        setEndAt(next);
                      }
                    }}
                    style={Platform.OS === "ios" ? { alignSelf: "center" } : {}}
                  />
                </View>
              )}

              {expandedPicker === "endTime" && !allDay && (
                <View
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    borderTopWidth: 1,
                    borderTopColor: IOS_BORDER,
                    backgroundColor: "rgba(0,0,0,0.2)",
                  }}
                >
                  <DateTimePicker
                    value={endAt}
                    mode="time"
                    display="spinner"
                    locale="ja-JP"
                    themeVariant="dark"
                    onChange={(e, d) => {
                      if (d) {
                        const next = new Date(endAt);
                        next.setHours(d.getHours(), d.getMinutes(), 0, 0);
                        setEndAt(next);
                      }
                    }}
                    style={Platform.OS === "ios" ? { alignSelf: "center" } : {}}
                  />
                </View>
              )}
            </View>

            {/* カレンダー（職場/自宅 など） */}
            <View
              style={{
                backgroundColor: IOS_CARD,
                borderWidth: 1,
                borderColor: IOS_BORDER,
                borderRadius: 14,
                overflow: "hidden",
                marginBottom: 14,
              }}
            >
              <Pressable
                disabled={calendarLoading || writableCalendars.length === 0}
                onPress={() => setCalendarPopoverOpen(true)}
              >
                <Row style={{ borderTopWidth: 0 }}>
                  <RowLabel>カレンダー</RowLabel>

                  {calendarLoading ? (
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <ActivityIndicator />
                      <Text style={{ color: IOS_MUTED, marginLeft: 8 }}>
                        読み込み中
                      </Text>
                    </View>
                  ) : selectedCalendar ? (
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <View
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 5,
                          backgroundColor: selectedCalendar.color || "#888",
                          marginRight: 8,
                        }}
                      />
                      <RowValue muted>{selectedCalendar.title}</RowValue>
                    </View>
                  ) : (
                    <RowValue muted>未選択</RowValue>
                  )}
                </Row>
              </Pressable>
            </View>

            {/* 通知（Popover） */}
            <View
              style={{
                backgroundColor: IOS_CARD,
                borderWidth: 1,
                borderColor: IOS_BORDER,
                borderRadius: 14,
                overflow: "hidden",
              }}
            >
              <Pressable
                ref={alarmPrimaryRowRef}
                onPress={() => openAlarmPopover("primary")}
              >
                <Row style={{ borderTopWidth: 0 }}>
                  <RowLabel>通知</RowLabel>
                  <RowValue muted>{labelByMinutes(alarmPrimary)}</RowValue>
                </Row>
              </Pressable>

              <Pressable
                ref={alarmBackupRowRef}
                onPress={() => openAlarmPopover("backup")}
              >
                <Row>
                  <RowLabel>予備の通知</RowLabel>
                  <RowValue muted>{labelByMinutes(alarmBackup)}</RowValue>
                </Row>
              </Pressable>
            </View>

            <View style={{ flex: 1 }} />
            <View style={{ height: 12 }} />
          </View>

          {/* 通知 Popover */}
          <AlarmPopover
            visible={alarmPopoverOpen}
            title={alarmPopoverTarget === "primary" ? "通知" : "予備の通知"}
            options={ALARM_OPTIONS}
            selectedMinutes={selectedForPopover}
            onSelect={(minutes) => {
              if (alarmPopoverTarget === "primary") setAlarmPrimary(minutes);
              else setAlarmBackup(minutes);
            }}
            onClose={() => setAlarmPopoverOpen(false)}
            anchorLayout={alarmPopoverAnchor}
          />

          {/* カレンダー Popover（職場/自宅） */}
          <CalendarPopover
            visible={calendarPopoverOpen}
            calendars={writableCalendars}
            selectedId={selectedCalendar?.id}
            onSelect={(cal) => setSelectedCalendar(cal)}
            onClose={() => setCalendarPopoverOpen(false)}
          />
        </View>
      </View>
    </Modal>
  );
}
