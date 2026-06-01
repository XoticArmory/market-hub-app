import React, { useRef, useState, useCallback } from "react";
import {
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
import SplashScreen from "@/components/SplashScreen";

const VENDORGRID_URL = "https://www.vendorgrid.net";

export default function WebViewScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const initialLoadDone = useRef(false);

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
      const subscription = BackHandler.addEventListener("hardwareBackPress", handleBackPress);
      return () => subscription.remove();
    }
  }, [handleBackPress]);

  const handleReload = useCallback(() => {
    setHasError(false);
    setErrorDetail(null);
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
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        mixedContentMode="always"
        thirdPartyCookiesEnabled
        onNavigationStateChange={handleNavigationStateChange}
        onShouldStartLoadWithRequest={() => true}
        onLoadStart={() => {
          if (!initialLoadDone.current) {
            setIsLoading(true);
            setHasError(false);
          }
        }}
        onLoadEnd={() => {
          if (!initialLoadDone.current) {
            initialLoadDone.current = true;
            setIsLoading(false);
          }
        }}
        onError={(e) => {
          setIsLoading(false);
          setHasError(true);
          setErrorDetail(`${e.nativeEvent.description} (code ${e.nativeEvent.code})`);
        }}
        onHttpError={(e) => {
          setIsLoading(false);
          if (e.nativeEvent.statusCode >= 500) {
            setHasError(true);
            setErrorDetail(`Server error ${e.nativeEvent.statusCode}`);
          }
        }}
        userAgent="Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 VendorGrid/1.0"
        testID="vendorgrid-webview"
      />

      {isLoading && !hasError && <SplashScreen />}

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
          {errorDetail && (
            <Text style={[styles.errorDetail, { color: colors.mutedForeground }]}>
              {errorDetail}
            </Text>
          )}
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
    marginBottom: 12,
  },
  errorDetail: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 16,
    opacity: 0.7,
    fontFamily: Platform.OS === "android" ? "monospace" : "Courier",
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
