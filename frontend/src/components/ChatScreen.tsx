import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { colors, radius, spacing } from "@/src/theme";
import { Message } from "@/src/api";

type Props = {
  headerTitle: string;
  headerSubtitle?: string;
  headerAvatar?: string;
  accentColor?: string;
  testIdPrefix: string;
  onSend: (text: string) => Promise<void>;
  onGenerateImage?: (prompt: string) => Promise<void>;
  messages: Message[];
  loading: boolean;
  sending: boolean;
  onBack?: () => void;
  emptyHint?: string;
};

export default function ChatScreen({
  headerTitle,
  headerSubtitle,
  headerAvatar,
  accentColor = colors.primary,
  testIdPrefix,
  onSend,
  onGenerateImage,
  messages,
  loading,
  sending,
  onBack,
  emptyHint,
}: Props) {
  const [input, setInput] = useState("");
  const [imageMode, setImageMode] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
  }, []);

  useEffect(() => {
    scrollToEnd();
  }, [messages.length, scrollToEnd]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    if (imageMode && onGenerateImage) {
      await onGenerateImage(text);
      setImageMode(false);
    } else {
      await onSend(text);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === "user";
    return (
      <View
        style={[
          styles.bubbleRow,
          { justifyContent: isUser ? "flex-end" : "flex-start" },
        ]}
      >
        <View
          style={[
            styles.bubble,
            isUser
              ? styles.userBubble
              : { ...styles.aiBubble, borderColor: `${accentColor}55` },
          ]}
          testID={`${testIdPrefix}-msg-${isUser ? "user" : "ai"}`}
        >
          {item.image_b64 ? (
            <Image
              source={{ uri: `data:image/png;base64,${item.image_b64}` }}
              style={styles.messageImage}
              resizeMode="cover"
            />
          ) : null}
          <Text
            style={[styles.bubbleText, isUser && { color: colors.textMain }]}
          >
            {item.content}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        {onBack ? (
          <TouchableOpacity
            onPress={onBack}
            style={styles.headerIconBtn}
            testID={`${testIdPrefix}-back-btn`}
          >
            <Ionicons name="chevron-back" size={22} color={colors.textMain} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerIconBtn} />
        )}
        <View style={styles.headerCenter}>
          {headerAvatar ? (
            <Image source={{ uri: headerAvatar }} style={styles.headerAvatar} />
          ) : null}
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {headerTitle}
            </Text>
            {headerSubtitle ? (
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {headerSubtitle}
              </Text>
            ) : null}
          </View>
        </View>
        <View style={[styles.headerIconBtn, { backgroundColor: `${accentColor}22` }]}>
          <View style={[styles.statusDot, { backgroundColor: accentColor }]} />
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <View style={{ flex: 1 }}>
            {loading ? (
              <View style={styles.center}>
                <ActivityIndicator color={accentColor} />
              </View>
            ) : messages.length === 0 ? (
              <View style={styles.center}>
                <Text style={styles.emptyTitle}>Begin the conversation</Text>
                {emptyHint ? (
                  <Text style={styles.emptyHint}>{emptyHint}</Text>
                ) : null}
              </View>
            ) : (
              <FlatList
                ref={listRef}
                data={messages}
                keyExtractor={(m) => m.id}
                renderItem={renderMessage}
                contentContainerStyle={styles.listContent}
                onContentSizeChange={scrollToEnd}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
              />
            )}

            {sending ? (
              <View style={styles.typingRow}>
                <ActivityIndicator color={accentColor} size="small" />
                <Text style={styles.typingText}>thinking…</Text>
              </View>
            ) : null}

            {/* Input bar */}
            <View style={styles.inputBar}>
              {onGenerateImage ? (
                <TouchableOpacity
                  onPress={() => setImageMode((v) => !v)}
                  style={[
                    styles.modeBtn,
                    imageMode && { backgroundColor: `${accentColor}33`, borderColor: accentColor },
                  ]}
                  testID={`${testIdPrefix}-image-mode-btn`}
                >
                  <Ionicons
                    name={imageMode ? "image" : "image-outline"}
                    size={18}
                    color={imageMode ? accentColor : colors.textSubtle}
                  />
                </TouchableOpacity>
              ) : null}
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder={imageMode ? "Describe the image…" : "Speak your mind…"}
                placeholderTextColor={colors.textFaint}
                style={styles.textInput}
                multiline
                editable={!sending}
                testID={`${testIdPrefix}-input`}
              />
              <TouchableOpacity
                onPress={handleSend}
                disabled={!input.trim() || sending}
                style={[
                  styles.sendBtn,
                  { backgroundColor: accentColor, opacity: !input.trim() || sending ? 0.4 : 1 },
                ]}
                testID={`${testIdPrefix}-send-btn`}
              >
                <LinearGradient
                  colors={[accentColor, `${accentColor}99`]}
                  style={StyleSheet.absoluteFill}
                />
                <Ionicons name="arrow-up" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    paddingTop: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.muted,
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.muted,
  },
  headerTitle: {
    color: colors.textMain,
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    color: colors.textSubtle,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginTop: 2,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg },
  emptyTitle: {
    color: colors.textMain,
    fontSize: 22,
    fontWeight: "300",
    letterSpacing: 1,
    fontStyle: "italic",
  },
  emptyHint: {
    color: colors.textSubtle,
    fontSize: 13,
    textAlign: "center",
    marginTop: spacing.sm,
    lineHeight: 20,
    maxWidth: 280,
  },
  bubbleRow: { flexDirection: "row", marginBottom: spacing.sm },
  bubble: {
    maxWidth: "82%",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.lg,
  },
  userBubble: {
    backgroundColor: colors.muted,
    borderTopRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: "rgba(155,17,30,0.12)",
    borderTopLeftRadius: 4,
    borderWidth: 1,
  },
  bubbleText: {
    color: colors.textMain,
    fontSize: 15,
    lineHeight: 22,
  },
  messageImage: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.muted,
  },
  typingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  typingText: {
    color: colors.textSubtle,
    fontSize: 12,
    fontStyle: "italic",
    letterSpacing: 1,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    paddingBottom: Platform.OS === "ios" ? spacing.sm : spacing.md,
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  modeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.muted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.muted,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    color: colors.textMain,
    fontSize: 15,
    maxHeight: 120,
    minHeight: 44,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});
