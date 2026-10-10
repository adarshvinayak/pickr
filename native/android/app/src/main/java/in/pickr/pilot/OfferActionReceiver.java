package in.pickr.pilot;
import android.app.*;
import android.content.*;
import org.json.JSONObject;
public class OfferActionReceiver extends BroadcastReceiver {
 @Override public void onReceive(Context context,Intent intent){String id=intent.getStringExtra("bookingId");String action=intent.getStringExtra("action");if(id==null||!("accept".equals(action)||"decline".equals(action)))return;PendingResult pending=goAsync();new Thread(()->{try{NativeHttp.call(context,"offers/"+id,new JSONObject().put("action",action));((NotificationManager)context.getSystemService(Context.NOTIFICATION_SERVICE)).cancel(id.hashCode());new android.os.Handler(context.getMainLooper()).post(()->OfferAlerts.get(context).hide(id));}catch(Exception e){NotificationManager nm=(NotificationManager)context.getSystemService(Context.NOTIFICATION_SERVICE);nm.createNotificationChannel(new NotificationChannel("jobs","Truck requests",NotificationManager.IMPORTANCE_HIGH));nm.notify(77,new Notification.Builder(context,"jobs").setSmallIcon(R.drawable.ic_pickr).setContentTitle("Request could not be updated").setContentText(e.getMessage()).setContentIntent(PendingIntent.getActivity(context,77,new Intent(context,MainActivity.class),PendingIntent.FLAG_IMMUTABLE|PendingIntent.FLAG_UPDATE_CURRENT)).build());}finally{pending.finish();}}).start();}
}
