import Constants from "expo-constants";
import { useFocusEffect } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  WebView,
  type WebViewNavigation,
  type WebViewMessageEvent,
} from "react-native-webview";

const WEB_URL =
  (Constants.expoConfig?.extra as { webUrl?: string } | undefined)?.webUrl ??
  "https://ygb-web.peter-686.workers.dev";

const APP_HOST = safeHost(WEB_URL);
const BRAND = "#F97316";
const AMBER = "#FEF3C7";

function safeHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "";
  }
}

/** Wire the web app's console + errors through to the Metro logs (dev only). */
const DEBUG_BRIDGE = !__DEV__
  ? ""
  : `
  (function () {
    var send = function (level, args) {
      try {
        window.ReactNativeWebView.postMessage(
          JSON.stringify({ __log: true, level: level, msg: args.map(String).join(' ') })
        );
      } catch (e) {}
    };
    ['log', 'warn', 'error'].forEach(function (l) {
      var orig = console[l];
      console[l] = function () { send(l, [].slice.call(arguments)); orig.apply(console, arguments); };
    });
    window.addEventListener('error', function (e) { send('error', [e.message]); });
    true;
  })();
`;

export default function AppWebView() {
  const ref = useRef<WebView>(null);
  const canGoBack = useRef(false);
  const [firstLoad, setFirstLoad] = useState(true);
  const [failed, setFailed] = useState(false);

  // Android hardware back button walks the WebView history first.
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== "android") return;
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        if (canGoBack.current) {
          ref.current?.goBack();
          return true;
        }
        return false;
      });
      return () => sub.remove();
    }, []),
  );

  const onNavStateChange = (nav: WebViewNavigation) => {
    canGoBack.current = nav.canGoBack;
  };

  // Keep our own host in the WebView; open anything else in the system browser.
  const onShouldStartLoad = (req: { url: string }): boolean => {
    const { url } = req;
    if (!/^https?:/i.test(url)) return true; // about:, data:, blob:, mailto:, tel:
    if (safeHost(url) === APP_HOST) return true;
    WebBrowser.openBrowserAsync(url).catch(() => {});
    return false;
  };

  const onMessage = (e: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(e.nativeEvent.data);
      if (data?.__log) console.log(`[web:${data.level}] ${data.msg}`);
    } catch {
      /* not our message */
    }
  };

  const retry = () => {
    setFailed(false);
    setFirstLoad(true);
    ref.current?.reload();
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {failed ? (
        <View style={styles.center}>
          <Text style={styles.title}>Can&apos;t reach Your Golf Buddy</Text>
          <Text style={styles.body}>
            Check your connection and try again. Rounds you&apos;ve already
            opened still work offline once the app has loaded.
          </Text>
          <TouchableOpacity style={styles.button} onPress={retry}>
            <Text style={styles.buttonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <WebView
          ref={ref}
          source={{ uri: WEB_URL }}
          style={styles.webview}
          originWhitelist={["*"]}
          injectedJavaScriptBeforeContentLoaded={DEBUG_BRIDGE}
          onMessage={onMessage}
          onNavigationStateChange={onNavStateChange}
          onShouldStartLoadWithRequest={onShouldStartLoad}
          onLoadEnd={() => setFirstLoad(false)}
          onError={({ nativeEvent }) => {
            console.warn("WebView error:", nativeEvent.description);
            if (firstLoad) setFailed(true);
          }}
          pullToRefreshEnabled
          allowsBackForwardNavigationGestures
          setSupportMultipleWindows={false}
          geolocationEnabled
          domStorageEnabled
          javaScriptEnabled
          cacheEnabled
          decelerationRate="normal"
        />
      )}

      {firstLoad && !failed && (
        <View style={styles.loading} pointerEvents="none">
          <ActivityIndicator size="large" color={BRAND} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AMBER },
  webview: { flex: 1, backgroundColor: AMBER },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AMBER,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  title: { fontSize: 20, fontWeight: "700", color: "#1e293b", textAlign: "center" },
  body: { fontSize: 14, color: "#475569", textAlign: "center", lineHeight: 20 },
  button: {
    marginTop: 8,
    backgroundColor: BRAND,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
  },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
