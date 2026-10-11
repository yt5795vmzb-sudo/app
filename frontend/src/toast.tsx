import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { Text, View } from "react-native";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { makeStyles, spacing, radius, font } from "@/src/theme";

type Kind = "success" | "error" | "info";
const ToastContext = createContext<(msg: string, kind?: Kind) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{ msg: string; kind: Kind } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();
  const styles = useStyles();

  const show = useCallback((msg: string, kind: Kind = "success") => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ msg, kind });
    timer.current = setTimeout(() => setToast(null), 2800);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      <View style={{ flex: 1 }}>
        {children}
        {toast && (
          <Animated.View
            entering={FadeInUp}
            exiting={FadeOutUp}
            pointerEvents="none"
            style={[styles.wrap, { top: insets.top + spacing.sm }]}
          >
            <View testID="toast-message" style={[styles.toast, toast.kind === "error" ? styles.err : toast.kind === "success" ? styles.ok : null]}>
              <Text style={styles.text}>{toast.msg}</Text>
            </View>
          </Animated.View>
        )}
      </View>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

const useStyles = makeStyles((c) => ({
  wrap: { position: "absolute", left: spacing.lg, right: spacing.lg, alignItems: "center" },
  toast: { backgroundColor: c.surfaceInverse, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.md, maxWidth: 480 },
  ok: { backgroundColor: c.brand },
  err: { backgroundColor: c.error },
  text: { color: c.onSurfaceInverse, fontSize: font.base, fontWeight: "600", textAlign: "center" },
}));
