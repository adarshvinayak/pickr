package in.pickr.pilot;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import org.json.JSONObject;
public class PushService extends FirebaseMessagingService {
 @Override public void onNewToken(String token){new Thread(()->{try{NativeHttp.call(this,"push/token",new JSONObject().put("token",token));}catch(Exception ignored){}}).start();}
 @Override public void onMessageReceived(RemoteMessage message){var data=message.getData();String id=data.getOrDefault("bookingId",message.getMessageId());if(id==null)return;String title=data.getOrDefault("title","Trip update");String body=data.getOrDefault("body","Open PICKR for details.");
 if(BuildConfig.APP_ROLE.equals("driver")&&title.equals("New truck request")){new Thread(()->{try{var snapshot=NativeHttp.call(this,"snapshot",null).getJSONObject("data");var offers=snapshot.getJSONArray("offers");boolean eligible=false;for(int i=0;i<offers.length();i++)if(offers.getJSONObject(i).getString("id").equals(id))eligible=true;if(eligible)new android.os.Handler(getMainLooper()).post(()->OfferAlerts.get(this).show(id,title,body));}catch(Exception ignored){}}).start();}
 else new android.os.Handler(getMainLooper()).post(()->OfferAlerts.get(this).show(id,title,body));
 }
}
