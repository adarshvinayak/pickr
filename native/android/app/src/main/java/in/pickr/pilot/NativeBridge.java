package in.pickr.pilot;
import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.speech.tts.TextToSpeech;
import android.webkit.JavascriptInterface;
import com.google.firebase.FirebaseApp;
import com.google.firebase.messaging.FirebaseMessaging;
import org.json.JSONObject;
import java.util.Locale;
public final class NativeBridge {
 final MainActivity activity; SpeechRecognizer recognition;TextToSpeech speech;String language="en-IN";String pushSession="";
 NativeBridge(MainActivity host){activity=host;speech=new TextToSpeech(host,status->{if(status==TextToSpeech.SUCCESS)speech.setLanguage(new Locale("en","IN"));speech.setOnUtteranceProgressListener(new android.speech.tts.UtteranceProgressListener(){public void onStart(String id){}public void onError(String id){}public void onDone(String id){activity.event("pickr-tts-end",new JSONObject());}});});}
 @JavascriptInterface public String getRole(){return BuildConfig.APP_ROLE;}
 @JavascriptInterface public String getBackendUrl(){return activity.getSharedPreferences("pickr",Context.MODE_PRIVATE).getString("backend",BuildConfig.BACKEND_URL);}
 @JavascriptInterface public void setBackendUrl(String value){activity.runOnUiThread(()->{try{Uri uri=Uri.parse(value.trim());if(uri.getHost()==null||!("https".equals(uri.getScheme())||BuildConfig.DEBUG&&"http".equals(uri.getScheme())))throw new Exception("Use an HTTPS server URL (HTTP LAN allowed in pilot APKs).");String url=value.trim().replaceAll("/+$","");stopDriver();activity.getSharedPreferences("pickr",Context.MODE_PRIVATE).edit().putString("backend",url).remove("token").apply();activity.web.evaluateJavascript("localStorage.clear();location.reload();",null);}catch(Exception e){emitError(e.getMessage());}});}
 @JavascriptInterface public void startDriver(String token,String url){if(!BuildConfig.APP_ROLE.equals("driver"))return;activity.runOnUiThread(()->{
 if(activity.checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION)!=PackageManager.PERMISSION_GRANTED&&activity.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)!=PackageManager.PERMISSION_GRANTED){emitError("Grant location permission before going online.");return;}
 activity.getSharedPreferences("pickr",Context.MODE_PRIVATE).edit().putString("token",token).putString("backend",url).putBoolean("online",true).apply();
 if(Build.VERSION.SDK_INT>=33&&activity.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED&&!activity.getSharedPreferences("pickr",Context.MODE_PRIVATE).getBoolean("notifications_asked",false)){activity.getSharedPreferences("pickr",Context.MODE_PRIVATE).edit().putBoolean("notifications_asked",true).apply();activity.requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS},13);}
 try{activity.startForegroundService(new Intent(activity,DriverService.class));}catch(Exception e){emitError("Cannot start tracking: "+e.getMessage());}
 });}
 @JavascriptInterface public void stopDriver(){activity.getSharedPreferences("pickr",Context.MODE_PRIVATE).edit().putBoolean("online",false).apply();activity.stopService(new Intent(activity,DriverService.class));}
 @JavascriptInterface public void requestNotifications(){activity.runOnUiThread(()->{if(Build.VERSION.SDK_INT>=33&&activity.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED)activity.requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS},13);else activity.startActivity(new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE,activity.getPackageName()));});}
 @JavascriptInterface public void requestOverlay(){activity.runOnUiThread(()->{if(!Settings.canDrawOverlays(activity))activity.startActivity(new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,Uri.parse("package:"+activity.getPackageName())));else emitError("Request overlays are already enabled.");});}
 @JavascriptInterface public void openExternal(String value){activity.runOnUiThread(()->{try{Uri uri=Uri.parse(value);String scheme=uri.getScheme();if(!"https".equals(scheme)&&!"tel".equals(scheme)&&!"geo".equals(scheme))return;activity.startActivity(new Intent(Intent.ACTION_VIEW,uri));}catch(Exception e){emitError("No app can open this link.");}});}
 @JavascriptInterface public void printReceipt(){activity.runOnUiThread(()->{try{android.print.PrintManager manager=(android.print.PrintManager)activity.getSystemService(Context.PRINT_SERVICE);manager.print("PICKR trip receipt",activity.web.createPrintDocumentAdapter("PICKR trip receipt"),null);}catch(Exception e){emitError("Unable to open receipt printing. Try again or use the web app.");}});}
 @JavascriptInterface public void speak(String text){activity.runOnUiThread(()->speech.speak(text,TextToSpeech.QUEUE_FLUSH,null,"pickr-question"));}
 @JavascriptInterface public void stopListening(){activity.runOnUiThread(()->{if(recognition!=null)recognition.cancel();});}
 @JavascriptInterface public void listen(String requestedLanguage){language=requestedLanguage;activity.runOnUiThread(()->{
 if(activity.checkSelfPermission(Manifest.permission.RECORD_AUDIO)!=PackageManager.PERMISSION_GRANTED){activity.requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO},12);return;}
 if(!SpeechRecognizer.isRecognitionAvailable(activity)){emitSpeech("Speech recognition is not installed on this phone.");return;}
 if(recognition!=null)recognition.destroy();recognition=SpeechRecognizer.createSpeechRecognizer(activity);recognition.setRecognitionListener(new RecognitionListener(){
 public void onReadyForSpeech(Bundle p){}public void onBeginningOfSpeech(){}public void onRmsChanged(float rms){}public void onBufferReceived(byte[] b){}public void onEndOfSpeech(){}public void onPartialResults(Bundle b){}public void onEvent(int type,Bundle b){}
 public void onError(int code){emitSpeech("Speech recognition failed ("+code+"). Type your answer or try again.");}
 public void onResults(Bundle bundle){try{var matches=bundle.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);if(matches==null||matches.isEmpty()){emitSpeech("No speech captured.");return;}activity.event("pickr-speech",new JSONObject().put("transcript",matches.get(0)));}catch(Exception ignored){}}
 });
 Intent intent=new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL,RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE,language);recognition.startListening(intent);
 });}
 @JavascriptInterface public void configurePush(String token,String url){activity.getSharedPreferences("pickr",Context.MODE_PRIVATE).edit().putString("token",token).apply();if(url.isEmpty()||pushSession.equals(token))return;pushSession=token;activity.runOnUiThread(()->{try{if(FirebaseApp.getApps(activity).isEmpty()&&FirebaseApp.initializeApp(activity)==null)return;FirebaseMessaging.getInstance().getToken().addOnSuccessListener(value->new Thread(()->{try{NativeHttp.call(activity,"push/token",new JSONObject().put("token",value));}catch(Exception ignored){}}).start());}catch(Exception ignored){/* Firebase configuration is optional for the LAN pilot. */}});}
 void emitError(String message){try{activity.event("pickr-native",new JSONObject().put("error",message));}catch(Exception ignored){}}
 void emitSpeech(String message){try{activity.event("pickr-speech",new JSONObject().put("error",message));}catch(Exception ignored){}}
 void destroy(){if(recognition!=null)recognition.destroy();speech.shutdown();}
}
