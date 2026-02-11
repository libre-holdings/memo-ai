// components/CalendarEventModal.js
import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  Switch,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { createCalendarEvent } from "../libs/AddCalendar";

const BG = "#0B0F14";
const FG = "#E8EEF6";
const MUTED = "rgba(232,238,246,0.65)";
const BORDER = "rgba(232,238,246,0.12)";
const CARD = "rgba(232,238,246,0.06)";

function pad2(n) {
  return String(n).padStart(2, "0");
}
function fmtYMD(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function fmtHM(d) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
function withDatePart(base, picked) {
  return new Date(
    picked.getFullYear(),
    picked.getMonth(),
    picked.getDate(),
    base.getHours(),
    base.getMinutes(),
    0,
    0
  );
}
function withTimePart(base, picked) {
  return new Date(
    base.getFullYear(),
    base.getMonth(),
    base.getDate(),
    picked.getHours(),
    picked.getMinutes(),
    0,
    0
  );
}

function buildAlarms(primaryMinutes, backupMinutes) {
  // null/undefined は通知なし
  const arr = [];
  if (primaryMinutes != null)
    arr.push({ relativeOffset: -Math.abs(primaryMinutes) });
  if (backupMinutes != null)
    arr.push({ relativeOffset: -Math.abs(backupMinutes) });
  return arr;
}

// 通知の候補（必要なら増やしてOK）
const ALARM_OPTIONS = [
  { label: "なし", value: null },
  { label: "0分前（開始時）", value: 0 },
  { label: "5分前", value: 5 },
  { label: "10分前", value: 10 },
  { label: "15分前", value: 15 },
  { label: "30分前", value: 30 },
  { label: "45分前", value: 45 },
  { label: "1時間前", value: 60 },
  { label: "2時間前", value: 120 },
  { label: "1日前", value: 24 * 60 },
];

export default function CalendarEventModal({
  visible,
  onClose,
  initialTitle = "",
}) {
  const now = useMemo(() => new Date(), []);
  const later = useMemo(() => new Date(Date.now() + 60 * 60 * 1000), []);

  const [title, setTitle] = useState(initialTitle || "");
  const [startAt, setStartAt] = useState(now);
  const [endAt, setEndAt] = useState(later);

  const [allDay, setAllDay] = useState(false);
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");

  // 通知は Picker で選ぶ（number or null）
  const [alarmPrimary, setAlarmPrimary] = useState(null); // 例: 10 / null
  const [alarmBackup, setAlarmBackup] = useState(null);

  // Android用：押した時だけ DateTimePicker を出す
  const [androidPicker, setAndroidPicker] = useState({
    kind: null, // "start-date" | "start-time" | "end-date" | "end-time"
    visible: false,
  });

  const savingDisabled = !title.trim();

  // iOS表示設定：押してないのに出てくるのが嫌なら "inline" ではなく "compact" 推奨
  // ※ compact はタップで展開される
  const iosDateDisplay = "compact"; // "inline" にすると常時表示になる
  const iosTimeDisplay = "compact"; // "spinner" だと常時表示っぽく見えるので compact 推奨

  const openAndroidPicker = (kind) => setAndroidPicker({ kind, visible: true });
  const closeAndroidPicker = () =>
    setAndroidPicker({ kind: null, visible: false });

  // モーダルを開き直した時にピッカー状態が残らないようにリセット
  useEffect(() => {
    if (visible) {
      closeAndroidPicker();
    }
  }, [visible]);

  const onChangeAndroid = (event, pickedDate) => {
    if (event?.type === "dismissed") {
      closeAndroidPicker();
      return;
    }
    const picked = pickedDate;
    if (!picked) {
      closeAndroidPicker();
      return;
    }

    const kind = androidPicker.kind;

    if (kind === "start-date") {
      const next = withDatePart(startAt, picked);
      setStartAt(next);
      if (endAt <= next)
        setEndAt(new Date(next.getTime() + 60 * 60 * 1000));
    }
    if (kind === "start-time") {
      const next = withTimePart(startAt, picked);
      setStartAt(next);
      if (endAt <= next)
        setEndAt(new Date(next.getTime() + 60 * 60 * 1000));
    }
    if (kind === "end-date") {
      setEndAt(withDatePart(endAt, picked));
    }
    if (kind === "end-time") {
      setEndAt(withTimePart(endAt, picked));
    }

    closeAndroidPicker();
  };

  const onPressSave = async () => {
    if (!title.trim()) return Alert.alert("不足", "タイトルを入力してください");

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

    // 通知（2つ）
    const alarms = buildAlarms(alarmPrimary, alarmBackup);

    try {
      await createCalendarEvent({
        title: title.trim(),
        startDate,
        endDate,
        allDay,
        location: location || "",
        notes: notes || "",
        alarms: alarms.length ? alarms : undefined,
      });
      Alert.alert("完了", "カレンダーに追加しました");
      onClose?.();
    } catch (e) {
      console.log(e);
      Alert.alert("失敗", String(e?.message || e));
    }
  };

  const androidMode = androidPicker.kind?.includes("time") ? "time" : "date";
  const androidValue = androidPicker.kind?.startsWith("start") ? startAt : endAt;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      transparent
    >
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)" }}>
        <View
          style={{
            flex: 1,
            marginTop: 60,
            backgroundColor: BG,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            padding: 16,
          }}
        >
          <Text
            style={{
              color: FG,
              fontSize: 14,
              fontWeight: "700",
              marginBottom: 8,
            }}
          >
            カレンダーに追加
          </Text>

          <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
            <Label text="カレンダー title（必須）" />
            <Input
              value={title}
              onChangeText={setTitle}
              placeholder="例: 打ち合わせ"
            />

            <Label text="開始" />
            {Platform.OS === "ios" ? (
              <>
                <Row>
                  <DateChip
                    label="日付"
                    value={fmtYMD(startAt)}
                    onPress={() => {}}
                    disabled
                  />
                  <DateChip
                    label="時間"
                    value={allDay ? "終日" : fmtHM(startAt)}
                    onPress={() => {}}
                    disabled={allDay}
                  />
                </Row>

                <View style={{ marginTop: 8 }}>
                  <Text style={{ color: MUTED, fontSize: 11, marginBottom: 6 }}>
                    日付
                  </Text>
                  <DateTimePicker
                    value={startAt}
                    mode="date"
                    display={iosDateDisplay}
                    onChange={(e, d) => {
                      if (!d) return;
                      const next = withDatePart(startAt, d);
                      setStartAt(next);
                      if (endAt <= next)
                        setEndAt(new Date(next.getTime() + 60 * 60 * 1000));
                    }}
                    locale="ja-JP"
                    style={{ backgroundColor: CARD, borderRadius: 12 }}
                  />
                </View>

                {!allDay && (
                  <View style={{ marginTop: 10 }}>
                    <Text style={{ color: MUTED, fontSize: 11, marginBottom: 6 }}>
                      時間
                    </Text>
                    <DateTimePicker
                      value={startAt}
                      mode="time"
                      display={iosTimeDisplay}
                      onChange={(e, d) => {
                        if (!d) return;
                        const next = withTimePart(startAt, d);
                        setStartAt(next);
                        if (endAt <= next)
                          setEndAt(new Date(next.getTime() + 60 * 60 * 1000));
                      }}
                      locale="ja-JP"
                      is24Hour
                      style={{ backgroundColor: CARD, borderRadius: 12 }}
                    />
                  </View>
                )}
              </>
            ) : (
              <Row>
                <DateChip
                  label="日付"
                  value={fmtYMD(startAt)}
                  onPress={() => openAndroidPicker("start-date")}
                />
                <DateChip
                  label="時間"
                  value={allDay ? "終日" : fmtHM(startAt)}
                  disabled={allDay}
                  onPress={() => openAndroidPicker("start-time")}
                />
              </Row>
            )}

            <Label text="終了" />
            {Platform.OS === "ios" ? (
              <>
                <Row>
                  <DateChip
                    label="日付"
                    value={fmtYMD(endAt)}
                    onPress={() => {}}
                    disabled
                  />
                  <DateChip
                    label="時間"
                    value={allDay ? "終日" : fmtHM(endAt)}
                    onPress={() => {}}
                    disabled={allDay}
                  />
                </Row>

                <View style={{ marginTop: 8 }}>
                  <Text style={{ color: MUTED, fontSize: 11, marginBottom: 6 }}>
                    日付
                  </Text>
                  <DateTimePicker
                    value={endAt}
                    mode="date"
                    display={iosDateDisplay}
                    onChange={(e, d) => {
                      if (!d) return;
                      setEndAt(withDatePart(endAt, d));
                    }}
                    locale="ja-JP"
                    style={{ backgroundColor: CARD, borderRadius: 12 }}
                  />
                </View>

                {!allDay && (
                  <View style={{ marginTop: 10 }}>
                    <Text style={{ color: MUTED, fontSize: 11, marginBottom: 6 }}>
                      時間
                    </Text>
                    <DateTimePicker
                      value={endAt}
                      mode="time"
                      display={iosTimeDisplay}
                      onChange={(e, d) => {
                        if (!d) return;
                        setEndAt(withTimePart(endAt, d));
                      }}
                      locale="ja-JP"
                      is24Hour
                      style={{ backgroundColor: CARD, borderRadius: 12 }}
                    />
                  </View>
                )}
              </>
            ) : (
              <Row>
                <DateChip
                  label="日付"
                  value={fmtYMD(endAt)}
                  onPress={() => openAndroidPicker("end-date")}
                />
                <DateChip
                  label="時間"
                  value={allDay ? "終日" : fmtHM(endAt)}
                  disabled={allDay}
                  onPress={() => openAndroidPicker("end-time")}
                />
              </Row>
            )}

            <Row style={{ marginTop: 12, alignItems: "center" }}>
              <Text style={{ color: MUTED, fontSize: 13, flex: 1 }}>終日</Text>
              <Switch value={allDay} onValueChange={setAllDay} />
            </Row>

            {/* ✅ 通知を Picker で選択 */}
            <Label text="通知" />
            <PickerBox>
              <Picker
                selectedValue={
                  alarmPrimary === null ? "__none__" : String(alarmPrimary)
                }
                onValueChange={(v) => {
                  if (v === "__none__") return setAlarmPrimary(null);
                  const n = Number(v);
                  setAlarmPrimary(Number.isFinite(n) ? n : null);
                }}
                dropdownIconColor={FG}
                style={{ color: FG }}
              >
                {ALARM_OPTIONS.map((o) => (
                  <Picker.Item
                    key={String(o.value)}
                    label={o.label}
                    value={o.value == null ? "__none__" : String(o.value)}
                    color={FG}
                  />
                ))}
              </Picker>
            </PickerBox>

            <Label text="予備の通知" />
            <PickerBox>
              <Picker
                selectedValue={
                  alarmBackup === null ? "__none__" : String(alarmBackup)
                }
                onValueChange={(v) => {
                  if (v === "__none__") return setAlarmBackup(null);
                  const n = Number(v);
                  setAlarmBackup(Number.isFinite(n) ? n : null);
                }}
                dropdownIconColor={FG}
                style={{ color: FG }}
              >
                {ALARM_OPTIONS.map((o) => (
                  <Picker.Item
                    key={String(o.value)}
                    label={o.label}
                    value={o.value == null ? "__none__" : String(o.value)}
                    color={FG}
                  />
                ))}
              </Picker>
            </PickerBox>

            <Label text="場所" />
            <Input
              value={location}
              onChangeText={setLocation}
              placeholder="例: 渋谷駅 / Zoom"
            />

            <Label text="メモ（notes）" />
            <Input
              value={notes}
              onChangeText={setNotes}
              placeholder="補足メモ"
              multiline
              style={{ height: 90, textAlignVertical: "top" }}
            />
          </ScrollView>

          <Row style={{ gap: 10 }}>
            <Pressable
              onPress={onClose}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: BORDER,
                alignItems: "center",
              }}
            >
              <Text style={{ color: FG, fontWeight: "700" }}>保存しない</Text>
            </Pressable>

            <Pressable
              onPress={onPressSave}
              disabled={savingDisabled}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 12,
                alignItems: "center",
                backgroundColor: savingDisabled
                  ? "rgba(232,238,246,0.18)"
                  : FG,
              }}
            >
              <Text style={{ color: BG, fontWeight: "800" }}>保存</Text>
            </Pressable>
          </Row>

          {/* Android picker (押した時だけ描画) */}
          {Platform.OS === "android" && androidPicker.visible && (
            <DateTimePicker
              value={androidValue}
              mode={androidMode}
              is24Hour
              display="default"
              onChange={onChangeAndroid}
              locale="ja-JP"
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

/* ===== UI parts ===== */

function Label({ text }) {
  return (
    <Text
      style={{
        color: MUTED,
        fontSize: 12,
        marginTop: 12,
        marginBottom: 6,
      }}
    >
      {text}
    </Text>
  );
}
function Row({ children, style }) {
  return (
    <View style={[{ flexDirection: "row", gap: 10 }, style]}>{children}</View>
  );
}
function Input({ flex, style, ...props }) {
  return (
    <View
      style={[
        {
          backgroundColor: CARD,
          borderWidth: 1,
          borderColor: BORDER,
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 10,
          ...(flex ? { flex: 1 } : null),
        },
      ]}
    >
      <TextInput
        placeholderTextColor="rgba(232,238,246,0.35)"
        style={[{ color: FG, fontSize: 14 }, style]}
        {...props}
      />
    </View>
  );
}
function DateChip({ label, value, onPress, disabled }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        flex: 1,
        borderWidth: 1,
        borderColor: BORDER,
        backgroundColor: disabled ? "rgba(232,238,246,0.03)" : CARD,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Text style={{ color: MUTED, fontSize: 11, marginBottom: 4 }}>
        {label}
      </Text>
      <Text style={{ color: FG, fontSize: 14, fontWeight: "700" }}>
        {value}
      </Text>
    </Pressable>
  );
}
function PickerBox({ children }) {
  return (
    <View
      style={{
        backgroundColor: CARD,
        borderWidth: 1,
        borderColor: BORDER,
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      {children}
    </View>
  );
}
