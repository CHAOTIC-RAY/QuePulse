package mv.quepulse.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;
import androidx.core.app.NotificationCompat;
import com.getcapacitor.PluginCall;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Ongoing notification plus a small poller so the token keeps updating after the
 * WebView timers are frozen. The service does not run unless always-on tracking is on.
 */
public class TrackingForegroundService extends Service {
    public static final String CHANNEL_ID = "queue-tracking-live";
    public static final int NOTIF_ID = 10002;
    public static final String ACTION_STOP = "mv.quepulse.STOP_TRACKING";
    private static final String PREFS = "quepulse_tracking";

    private static final Pattern ROOM_IN_COUNTER = Pattern.compile("Room\\s+([A-Za-z0-9]+)", Pattern.CASE_INSENSITIVE);
    private static final Pattern ROOM_IN_NAME = Pattern.compile("ROOM\\s+([A-Za-z0-9]+)", Pattern.CASE_INSENSITIVE);

    private ScheduledExecutorService scheduler;
    private volatile boolean running;

    public static void saveConfig(Context ctx, PluginCall call) {
        ctx.getSharedPreferences(PREFS, MODE_PRIVATE)
            .edit()
            .putBoolean("active", true)
            .putString("title", call.getString("title", "QuePulse"))
            .putString("body", call.getString("body", "Tracking your token…"))
            .putString("pollUrl", call.getString("pollUrl", ""))
            .putString("token", call.getString("token", ""))
            .putString("queueId", call.getString("queueId", ""))
            .putBoolean("isGlobal", Boolean.TRUE.equals(call.getBoolean("isGlobal", false)))
            .commit();
    }

    public static void clearConfig(Context ctx) {
        ctx.getSharedPreferences(PREFS, MODE_PRIVATE).edit().clear().commit();
    }

    private static Notification build(Context ctx, String title, String body) {
        createChannel(ctx);
        Intent launch = new Intent(ctx, MainActivity.class);
        launch.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(
            ctx,
            0,
            launch,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        return new NotificationCompat.Builder(ctx, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setSmallIcon(R.drawable.ic_stat_icon)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setContentIntent(pi)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_STATUS)
            .build();
    }

    private static void createChannel(Context ctx) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "Live queue tracking",
            NotificationManager.IMPORTANCE_LOW
        );
        channel.setDescription("Keeps QuePulse tracking active when the app is closed");
        NotificationManager nm = ctx.getSystemService(NotificationManager.class);
        if (nm != null) nm.createNotificationChannel(channel);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            running = false;
            stopLoop();
            clearConfig(this);
            stopForegroundQuietly();
            stopSelf();
            return START_NOT_STICKY;
        }

        SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        if (!prefs.getBoolean("active", false)) {
            stopSelf();
            return START_NOT_STICKY;
        }

        synchronized (this) {
            if (running && scheduler != null && !scheduler.isShutdown()) {
                return START_STICKY;
            }

            String title = prefs.getString("title", "QuePulse");
            String body = prefs.getString("body", "Tracking your token…");
            try {
                Notification notification = build(this, title, body);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    startForeground(NOTIF_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC);
                } else {
                    startForeground(NOTIF_ID, notification);
                }
            } catch (Exception e) {
                stopSelf();
                return START_NOT_STICKY;
            }

            running = true;
            ensureLoop();
        }
        return START_STICKY;
    }

    private void ensureLoop() {
        if (scheduler != null && !scheduler.isShutdown()) return;
        scheduler = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread thread = new Thread(r, "quepulse-queue-poll");
            thread.setDaemon(true);
            return thread;
        });
        scheduler.scheduleWithFixedDelay(this::pollOnce, 1, 5, TimeUnit.SECONDS);
    }

    private void stopLoop() {
        if (scheduler != null) {
            scheduler.shutdownNow();
            scheduler = null;
        }
    }

    private void pollOnce() {
        if (!running) return;
        try {
            SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
            if (!prefs.getBoolean("active", false)) return;
            String pollUrl = prefs.getString("pollUrl", "");
            if (!allowedPollUrl(pollUrl)) return;
            String token = prefs.getString("token", "");
            if (token == null || token.isEmpty()) return;

            JSONArray queues = parseQueues(httpGet(withCacheBust(pollUrl)));
            JSONObject match = findQueue(
                queues,
                token,
                prefs.getString("queueId", ""),
                prefs.getBoolean("isGlobal", false)
            );
            if (match == null) return;

            String title = "QuePulse · Token " + token;
            String body = buildBody(token, match);
            NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
            if (nm != null && running) nm.notify(NOTIF_ID, build(this, title, body));
        } catch (Exception ignored) {
            // keep the last notification and try again
        }
    }

    private static boolean allowedPollUrl(String url) {
        if (url == null || url.isEmpty()) return false;
        try {
            URL parsed = new URL(url);
            String path = parsed.getPath() == null ? "" : parsed.getPath();
            return "https".equalsIgnoreCase(parsed.getProtocol()) && path.startsWith("/api/");
        } catch (Exception e) {
            return false;
        }
    }

    private static String withCacheBust(String url) {
        return url + (url.contains("?") ? "&" : "?") + "_=" + System.currentTimeMillis();
    }

    private static String httpGet(String url) throws Exception {
        HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
        conn.setConnectTimeout(8000);
        conn.setReadTimeout(8000);
        conn.setUseCaches(false);
        conn.setRequestProperty("Accept", "application/json");
        conn.setRequestProperty("Cache-Control", "no-cache");
        try {
            int code = conn.getResponseCode();
            if (code < 200 || code >= 300) throw new Exception("HTTP " + code);
            InputStream in = conn.getInputStream();
            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            byte[] buf = new byte[4096];
            int n;
            while ((n = in.read(buf)) >= 0) bos.write(buf, 0, n);
            return bos.toString("UTF-8");
        } finally {
            conn.disconnect();
        }
    }

    private static JSONArray parseQueues(String raw) throws Exception {
        String trimmed = raw == null ? "" : raw.trim();
        if (trimmed.startsWith("[")) return new JSONArray(trimmed);
        JSONObject obj = new JSONObject(trimmed);
        if (obj.has("queues") && obj.get("queues") instanceof JSONArray) {
            return obj.getJSONArray("queues");
        }
        throw new Exception("no queues");
    }

    private static JSONObject findQueue(JSONArray queues, String token, String queueId, boolean isGlobal) throws Exception {
        if (!isGlobal && queueId != null && !queueId.isEmpty()) {
            for (int i = 0; i < queues.length(); i++) {
                JSONObject q = queues.getJSONObject(i);
                if (queueId.equals(q.optString("id"))) return q;
            }
            return null;
        }

        int target = parseToken(token);
        JSONObject best = null;
        int bestDiff = Integer.MAX_VALUE;
        for (int i = 0; i < queues.length(); i++) {
            JSONObject q = queues.getJSONObject(i);
            int current = parseToken(q.optString("currentNumber"));
            if (target < 0 || current < 0) continue;
            int diff = target - current;
            if (diff >= 0 && diff < bestDiff) {
                bestDiff = diff;
                best = q;
            }
        }
        if (best != null) return best;
        return queues.length() > 0 ? queues.getJSONObject(0) : null;
    }

    private static String buildBody(String token, JSONObject queue) {
        int target = parseToken(token);
        int current = parseToken(queue.optString("currentNumber"));
        String room = roomLabel(queue);
        String now = queue.optString("currentNumber");
        if (target >= 0 && current > target) {
            return "Now serving " + now + " · " + room + ". Token " + token + " has been reached.";
        }
        if (target >= 0 && current == target) {
            return "Your turn! Now serving " + now + " · " + room;
        }
        if (target >= 0 && current >= 0) {
            int left = target - current;
            String ahead = left == 1 ? "1 ahead" : left + " ahead";
            return "Now " + now + " · " + room + " · " + ahead;
        }
        return "Now " + now + " · " + room;
    }

    private static String roomLabel(JSONObject queue) {
        String counter = queue.optString("counterInfo");
        Matcher counterMatch = ROOM_IN_COUNTER.matcher(counter);
        if (counterMatch.find()) return "Room " + counterMatch.group(1);
        String name = queue.optString("name");
        Matcher nameMatch = ROOM_IN_NAME.matcher(name);
        if (nameMatch.find()) return "Room " + nameMatch.group(1);
        return name.isEmpty() ? "Queue" : name;
    }

    private static int parseToken(String value) {
        if (value == null) return -1;
        String digits = value.replaceAll("\\D", "");
        if (digits.isEmpty()) return -1;
        try {
            return Integer.parseInt(digits);
        } catch (NumberFormatException e) {
            return -1;
        }
    }

    private void stopForegroundQuietly() {
        try {
            stopForeground(STOP_FOREGROUND_REMOVE);
        } catch (Exception ignored) {
        }
    }

    @Override
    public void onDestroy() {
        running = false;
        stopLoop();
        stopForegroundQuietly();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
