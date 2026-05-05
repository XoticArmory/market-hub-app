import React, { useRef, useState, useCallback, useEffect } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import WebView, { WebViewNavigation } from "react-native-webview";

const LOAD_TIMEOUT_MS = 30000;

const VENDORGRID_URL = "https://vendorgrid.net";

export default function WebViewScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleNavigationStateChange = useCallback(
    (navState: WebViewNavigation) => {
      setCanGoBack(navState.canGoBack);
    },
    []
  );

  const handleBackPress = useCallback(() => {
    if (canGoBack && webViewRef.current) {
      webViewRef.current.goBack();
      return true;
    }
    return false;
  }, [canGoBack]);

  React.useEffect(() => {
    if (Platform.OS === "android") {
      BackHandler.addEventListener("hardwareBackPress", handleBackPress);
      return () => BackHandler.removeEventListener("hardwareBackPress", handleBackPress);
    }
  }, [handleBackPress]);

  // If the page never fires onLoadEnd (e.g. server timeout), show the error screen
  useEffect(() => {
    if (!isLoading) return;
    const timer = setTimeout(() => {
      setIsLoading(false);
      setHasError(true);
    }, LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [isLoading]);

  const handleReload = useCallback(() => {
    setHasError(false);
    setIsLoading(true);
    webViewRef.current?.reload();
  }, []);

  if (Platform.OS === "web") {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <Text style={[styles.webMessage, { color: colors.foreground }]}>
          Open this app on an Android or iOS device to use VendorGrid.
        </Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={() => {
            if (typeof window !== "undefined") {
              window.open(VENDORGRID_URL, "_blank");
            }
          }}
        >
          <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>
            Visit vendorgrid.net
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <WebView
        ref={webViewRef}
        source={{ uri: VENDORGRID_URL }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState={true}
        allowsBackForwardNavigationGestures
        onNavigationStateChange={handleNavigationStateChange}
        onLoadStart={() => {
          setIsLoading(true);
          setHasError(false);
        }}
        onLoadEnd={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
        onHttpError={() => {
          setIsLoading(false);
        }}
        userAgent="VendorGrid/1.0 Android"
        testID="vendorgrid-webview"
      />

      {isLoading && !hasError && (
        <View
          style={[
            styles.loadingOverlay,
            { backgroundColor: colors.background },
          ]}
        >
          <View style={[styles.logoBox, { backgroundColor: colors.primary }]}>
            <Text style={styles.logoText}>VG</Text>
          </View>
          <ActivityIndicator
            size="large"
            color={colors.primary}
            style={{ marginTop: 24 }}
          />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            Loading VendorGrid…
          </Text>
        </View>
      )}

      {hasError && (
        <View
          style={[
            styles.errorOverlay,
            { backgroundColor: colors.background },
          ]}
        >
          <View style={[styles.logoBox, { backgroundColor: colors.primary }]}>
            <Text style={styles.logoText}>VG</Text>
          </View>
          <Text style={[styles.errorTitle, { color: colors.foreground }]}>
            Unable to connect
          </Text>
          <Text style={[styles.errorMessage, { color: colors.mutedForeground }]}>
            Check your internet connection and try again.
          </Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={handleReload}
            testID="reload-button"
          >
            <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    zIndex: 10,
  },
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  logoText: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -1,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: "500",
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  errorMessage: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
  button: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "700",
  },
  webMessage: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
});
