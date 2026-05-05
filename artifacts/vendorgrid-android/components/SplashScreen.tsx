import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Rect } from "react-native-svg";
import colors from "@/constants/colors";

const { primary: ORANGE, accent: AMBER, background: BACKGROUND, foreground: FOREGROUND, mutedForeground: MUTED } = colors.light;

function GridIcon({ size = 44 }: { size?: number }) {
  const cell = size / 3;
  const gap = cell * 0.18;
  const r = cell * 0.22;

  const cells = [
    { col: 0, row: 0, fill: ORANGE },
    { col: 1, row: 0, fill: ORANGE },
    { col: 2, row: 0, fill: "#FFFFFF" },
    { col: 0, row: 1, fill: ORANGE },
    { col: 1, row: 1, fill: AMBER },
    { col: 2, row: 1, fill: ORANGE },
    { col: 0, row: 2, fill: "#FFFFFF" },
    { col: 1, row: 2, fill: ORANGE },
    { col: 2, row: 2, fill: ORANGE },
  ];

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {cells.map(({ col, row, fill }, i) => (
        <Rect
          key={i}
          x={col * cell + gap / 2}
          y={row * cell + gap / 2}
          width={cell - gap}
          height={cell - gap}
          rx={r}
          fill={fill}
          opacity={fill === "#FFFFFF" ? 0.35 : 1}
        />
      ))}
    </Svg>
  );
}

export default function SplashScreen() {
  const logoScale = useSharedValue(0.55);
  const logoOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(18);
  const textOpacity = useSharedValue(0);
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    logoScale.value = withSpring(1, {
      damping: 14,
      stiffness: 120,
      mass: 0.8,
    });
    logoOpacity.value = withTiming(1, { duration: 350, easing: Easing.out(Easing.quad) });

    textTranslateY.value = withDelay(
      180,
      withTiming(0, { duration: 420, easing: Easing.out(Easing.cubic) })
    );
    textOpacity.value = withDelay(180, withTiming(1, { duration: 380 }));

    pulseScale.value = withDelay(
      500,
      withRepeat(
        withSequence(
          withTiming(1.06, { duration: 900, easing: Easing.inOut(Easing.sin) }),
          withTiming(1.0, { duration: 900, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      )
    );
  }, []);

  const logoAnimStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value * pulseScale.value }],
  }));

  const textAnimStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  return (
    <Animated.View
      style={styles.overlay}
      exiting={FadeOut.duration(400).easing(Easing.out(Easing.cubic))}
    >
      <Animated.View style={[styles.logoWrapper, logoAnimStyle]}>
        <View style={styles.logoBox}>
          <View style={styles.logoTopRow}>
            <Text style={styles.vgText}>VG</Text>
          </View>
          <View style={styles.gridRow}>
            <GridIcon size={42} />
          </View>
        </View>
      </Animated.View>

      <Animated.View style={[styles.textBlock, textAnimStyle]}>
        <Text style={styles.brandName}>VendorGrid</Text>
        <Text style={styles.tagline}>Loading…</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BACKGROUND,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  logoWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  logoBox: {
    width: 112,
    height: 112,
    borderRadius: 28,
    backgroundColor: ORANGE,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: ORANGE,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.38,
    shadowRadius: 20,
    elevation: 14,
    paddingTop: 6,
  },
  logoTopRow: {
    alignItems: "center",
  },
  vgText: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: -1.5,
    lineHeight: 36,
  },
  gridRow: {
    marginTop: 2,
  },
  textBlock: {
    marginTop: 32,
    alignItems: "center",
  },
  brandName: {
    color: FOREGROUND,
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  tagline: {
    color: MUTED,
    fontSize: 14,
    fontWeight: "500",
    marginTop: 6,
    letterSpacing: 0.2,
  },
});
