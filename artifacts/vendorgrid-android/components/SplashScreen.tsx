import React, { useEffect } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
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
import colors from "@/constants/colors";

const { foreground: FOREGROUND, mutedForeground: MUTED, background: BACKGROUND } = colors.light;

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
        <Image
          source={require("../assets/images/icon.png")}
          style={styles.icon}
          resizeMode="contain"
        />
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
  icon: {
    width: 120,
    height: 120,
    borderRadius: 26,
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
