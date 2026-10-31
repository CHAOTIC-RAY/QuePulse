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
        try {
            TrackingForegroundService.saveConfig(getContext(), call);
            Intent intent = new Intent(getContext(), TrackingForegroundService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                getContext().startForegroundService(intent);
            } else {
                getContext().startService(intent);
            }
            call.resolve();
        } catch (Exception e) {
            call.reject("Could not start queue tracking", e);
        }
    }

    @PluginMethod
    public void updateNotification(PluginCall call) {
        TrackingForegroundService.saveConfig(getContext(), call);
        try {
            Intent intent = new Intent(getContext(), TrackingForegroundService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                getContext().startForegroundService(intent);
            } else {
                getContext().startService(intent);
            }
        } catch (Exception ignored) {
            // The service is already running, or this process cannot start a foreground service.
        }
        call.resolve();
    }

    @PluginMethod
    public void stopForeground(PluginCall call) {
        TrackingForegroundService.clearConfig(getContext());
        Intent intent = new Intent(getContext(), TrackingForegroundService.class);
        intent.setAction(TrackingForegroundService.ACTION_STOP);
        getContext().startService(intent);
        call.resolve();
    }
}
