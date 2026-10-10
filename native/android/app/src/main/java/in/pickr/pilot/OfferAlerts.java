package in.pickr.pilot;
import android.app.*;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.provider.Settings;
import android.view.Gravity;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import java.util.*;
public final class OfferAlerts {
 private static OfferAlerts instance;
 public static synchronized OfferAlerts get(Context context){if(instance==null)instance=new OfferAlerts(context.getApplicationContext());return instance;}
 private final Context context;private final NotificationManager notifications;private final Set<String> shown=new HashSet<>();private final Map<String,LinearLayout> overlays=new HashMap<>();
 OfferAlerts(Context c){context=c;notifications=(NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE);notifications.createNotificationChannel(new NotificationChannel("jobs","Truck requests",NotificationManager.IMPORTANCE_HIGH));}
 private PendingIntent action(String id,String action){Intent intent=new Intent(context,OfferActionReceiver.class).putExtra("bookingId",id).putExtra("action",action);return PendingIntent.getBroadcast(context,(id+action).hashCode(),intent,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);}
 public void show(String id,String title,String body){if(!shown.add(id))return;
 PendingIntent view=PendingIntent.getActivity(context,id.hashCode(),new Intent(context,MainActivity.class).putExtra("bookingId",id),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
 Notification.Builder builder=new Notification.Builder(context,"jobs").setSmallIcon(R.drawable.ic_pickr).setContentTitle(title).setContentText(body).setStyle(new Notification.BigTextStyle().bigText(body)).setContentIntent(view).setAutoCancel(true).setTimeoutAfter(60000);if(BuildConfig.APP_ROLE.equals("driver")&&title.equals("New truck request"))builder.addAction(new Notification.Action.Builder(null,"Accept",action(id,"accept")).build()).addAction(new Notification.Action.Builder(null,"Deny",action(id,"decline")).build());Notification notification=builder.build();
 notifications.notify(id.hashCode(),notification);
 if(BuildConfig.APP_ROLE.equals("driver")&&Settings.canDrawOverlays(context))overlay(id,title,body);
 }
 private void overlay(String id,String title,String body){if(!overlays.isEmpty())return;
 try{LinearLayout layout=new LinearLayout(context);layout.setOrientation(LinearLayout.VERTICAL);layout.setPadding(24,24,24,24);layout.setBackgroundColor(Color.WHITE);TextView text=new TextView(context);text.setText(title+"\n"+body);text.setTextColor(Color.BLACK);text.setTextSize(18);layout.addView(text);
 for(String value:new String[]{"View","Accept","Deny"}){Button button=new Button(context);button.setText(value);layout.addView(button);button.setOnClickListener(v->{if(value.equals("View")){Intent intent=new Intent(context,MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);context.startActivity(intent);hide(id);}else{context.sendBroadcast(new Intent(context,OfferActionReceiver.class).putExtra("bookingId",id).putExtra("action",value.equals("Accept")?"accept":"decline"));hide(id);}});}
 WindowManager.LayoutParams params=new WindowManager.LayoutParams(WindowManager.LayoutParams.MATCH_PARENT,WindowManager.LayoutParams.WRAP_CONTENT,WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,PixelFormat.TRANSLUCENT);params.gravity=Gravity.TOP;params.y=80;((WindowManager)context.getSystemService(Context.WINDOW_SERVICE)).addView(layout,params);overlays.put(id,layout);
 new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(()->hide(id),60000);
 }catch(Exception ignored){/* Heads-up notification remains available if overlays are denied. */}}
 public void retain(Set<String> active){for(String id:new HashSet<>(shown)){if(!active.contains(id)){hide(id);notifications.cancel(id.hashCode());shown.remove(id);}}}
 public void hide(String id){LinearLayout view=overlays.remove(id);if(view!=null)try{((WindowManager)context.getSystemService(Context.WINDOW_SERVICE)).removeView(view);}catch(Exception ignored){}}
 public void close(){retain(Collections.emptySet());}
}
