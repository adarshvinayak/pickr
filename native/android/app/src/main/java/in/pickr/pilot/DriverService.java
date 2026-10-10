package in.pickr.pilot;
import android.Manifest;
import android.app.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.location.*;
import android.os.*;
import org.json.*;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;
public class DriverService extends Service implements LocationListener {
 LocationManager locations;volatile Location latest;ScheduledExecutorService worker;OfferAlerts alerts;PowerManager.WakeLock wake;
 @Override public void onCreate(){super.onCreate();NotificationManager nm=(NotificationManager)getSystemService(NOTIFICATION_SERVICE);nm.createNotificationChannel(new NotificationChannel("tracking","Online driver location",NotificationManager.IMPORTANCE_LOW));
  PendingIntent view=PendingIntent.getActivity(this,1,new Intent(this,MainActivity.class),PendingIntent.FLAG_IMMUTABLE|PendingIntent.FLAG_UPDATE_CURRENT);
  startForeground(1,new Notification.Builder(this,"tracking").setSmallIcon(R.drawable.ic_pickr).setContentTitle("PICKR driver is online").setContentText("Sharing live GPS and checking requests. Open app to go offline.").setContentIntent(view).setOngoing(true).build());
  locations=(LocationManager)getSystemService(LOCATION_SERVICE);alerts=OfferAlerts.get(this);
  wake=((PowerManager)getSystemService(POWER_SERVICE)).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK,"PICKR:OnlineDriver");wake.setReferenceCounted(false);wake.acquire(3600000);
 }
 @Override public int onStartCommand(Intent intent,int flags,int startId){if(!BuildConfig.APP_ROLE.equals("driver")||!getSharedPreferences("pickr",MODE_PRIVATE).getBoolean("online",false)){stopSelf();return START_NOT_STICKY;}
  if(worker!=null)return START_STICKY;
  try{boolean fine=checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)==PackageManager.PERMISSION_GRANTED;boolean coarse=checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION)==PackageManager.PERMISSION_GRANTED;
   if(!fine&&!coarse){stopSelf();return START_NOT_STICKY;}
   for(String provider:locations.getProviders(true)){if(provider.equals(LocationManager.GPS_PROVIDER)&&!fine)continue;if(provider.equals(LocationManager.PASSIVE_PROVIDER))continue;locations.requestLocationUpdates(provider,5000,0,this);}
  }catch(Exception e){stopSelf();return START_NOT_STICKY;}
  worker=Executors.newSingleThreadScheduledExecutor();worker.scheduleWithFixedDelay(this::tick,0,10,TimeUnit.SECONDS);return START_STICKY;
 }
 private void tick(){try{
  if(!wake.isHeld())wake.acquire(3600000);
  Location point=latest;if(point!=null&&System.currentTimeMillis()-point.getTime()<90000)NativeHttp.call(this,"driver/position",new JSONObject().put("lat",point.getLatitude()).put("lng",point.getLongitude()).put("accuracy",point.getAccuracy()).put("sampledAt",Instant.ofEpochMilli(point.getTime()).toString()));
  JSONObject data=NativeHttp.call(this,"snapshot",null).getJSONObject("data");JSONObject driver=data.optJSONObject("driver");
  if(driver==null||!driver.optBoolean("online")&&driver.isNull("active_booking_id")){new Handler(getMainLooper()).post(this::stopSelf);return;}
  JSONArray offers=data.optJSONArray("offers");Set<String> active=new HashSet<>();List<String[]> messages=new ArrayList<>();if(offers!=null)for(int i=0;i<offers.length();i++){JSONObject b=offers.getJSONObject(i);String id=b.getString("id");active.add(id);JSONObject p=b.getJSONObject("payload");messages.add(new String[]{id,"New truck request",p.getJSONObject("pickup").getString("label")+" → "+p.getJSONObject("drop").getString("label")+" · ₹"+p.getJSONObject("quote").getInt("totalFare")});}
  new Handler(getMainLooper()).post(()->{alerts.retain(active);for(String[] message:messages)alerts.show(message[0],message[1],message[2]);});
 }catch(Exception error){if(error instanceof NativeHttp.ApiException&&(((NativeHttp.ApiException)error).status==401||((NativeHttp.ApiException)error).status==403)){getSharedPreferences("pickr",MODE_PRIVATE).edit().putBoolean("online",false).apply();new Handler(getMainLooper()).post(this::stopSelf);}/* Other connection failures retry without fabricated positions. */}}
 @Override public void onLocationChanged(Location location){Location old=latest;if(old==null||location.getTime()>old.getTime()&&(location.getAccuracy()<old.getAccuracy()*2||location.getTime()-old.getTime()>15000))latest=location;}
 @Override public IBinder onBind(Intent intent){return null;}
 @Override public void onDestroy(){if(worker!=null)worker.shutdownNow();if(locations!=null)locations.removeUpdates(this);if(alerts!=null)alerts.close();if(wake!=null&&wake.isHeld())wake.release();super.onDestroy();}
}
