package mv.quepulse.app;

import android.content.Intent;
import android.os.Build;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "QueueTracking")
public class QueueTrackingPlugin extends Plugin {

    @PluginMethod
    public void startForeground(PluginCall call) {
        String title = call.getString("title", "QuePulse");
        String body = call.getString("body", "Tracking your token…");
        Intent intent = new Intent(getContext(), TrackingForegroundService.class);
        intent.putExtra("title", title);
        intent.putExtra("body", body);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getContext().startForegroundService(intent);
        } else {
            getContext().startService(intent);
        }
        call.resolve();
    }

    @PluginMethod
    public void updateNotification(PluginCall call) {
        String title = call.getString("title", "QuePulse");
        String body = call.getString("body", "");
        TrackingForegroundService.update(getContext(), title, body);
        call.resolve();
    }

    @PluginMethod
    public void stopForeground(PluginCall call) {
        Intent intent = new Intent(getContext(), TrackingForegroundService.class);
        getContext().stopService(intent);
        call.resolve();
    }
}
