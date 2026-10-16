package in.pickr.pilot;
import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.*;
import androidx.webkit.WebViewAssetLoader;
import androidx.core.content.FileProvider;
import java.io.File;
import java.util.ArrayList;
public class MainActivity extends Activity {
 static volatile boolean foreground;
 WebView web; NativeBridge bridge; ValueCallback<Uri[]> fileCallback; Uri cameraUri;
 GeolocationPermissions.Callback geoCallback;String geoOrigin;
 @Override public void onCreate(Bundle state){super.onCreate(state);
  getWindow().setStatusBarColor(Color.WHITE);getWindow().setNavigationBarColor(Color.WHITE);
  getWindow().getDecorView().setSystemUiVisibility(android.view.View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR|android.view.View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
  web=new WebView(this);android.widget.FrameLayout container=new android.widget.FrameLayout(this);container.addView(web,new android.widget.FrameLayout.LayoutParams(-1,-1));container.setOnApplyWindowInsetsListener((v,insets)->{if(android.os.Build.VERSION.SDK_INT>=30){var safe=insets.getInsets(android.view.WindowInsets.Type.systemBars()|android.view.WindowInsets.Type.ime());v.setPadding(safe.left,safe.top,safe.right,safe.bottom);}else v.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());return insets;});setContentView(container);WebSettings settings=web.getSettings();settings.setTextZoom(Math.round(getResources().getConfiguration().fontScale*100));settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);settings.setAllowFileAccess(false);settings.setAllowContentAccess(true);settings.setGeolocationEnabled(true);
  settings.setMixedContentMode(BuildConfig.DEBUG?WebSettings.MIXED_CONTENT_ALWAYS_ALLOW:WebSettings.MIXED_CONTENT_NEVER_ALLOW);
  bridge=new NativeBridge(this);web.addJavascriptInterface(bridge,"PickrNative");
  WebViewAssetLoader loader=new WebViewAssetLoader.Builder().addPathHandler("/assets/",new WebViewAssetLoader.AssetsPathHandler(this)).build();
  web.setWebViewClient(new WebViewClient(){
   @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){return loader.shouldInterceptRequest(request.getUrl());}
   @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){String url=request.getUrl().toString();if(url.startsWith("https://appassets.androidplatform.net/assets/public/"))return false;bridge.openExternal(url);return true;}
  });
  web.setWebChromeClient(new WebChromeClient(){
   @Override public void onGeolocationPermissionsShowPrompt(String origin,GeolocationPermissions.Callback callback){Uri originUri=Uri.parse(origin);if(!"https".equals(originUri.getScheme())||!"appassets.androidplatform.net".equals(originUri.getHost())||(originUri.getPort()!=-1&&originUri.getPort()!=443)){callback.invoke(origin,false,false);return;}if(checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)==PackageManager.PERMISSION_GRANTED||checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION)==PackageManager.PERMISSION_GRANTED){callback.invoke(origin,true,false);}else{geoOrigin=origin;geoCallback=callback;requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION,Manifest.permission.ACCESS_COARSE_LOCATION},11);}}
   @Override public boolean onShowFileChooser(WebView view,ValueCallback<Uri[]> callback,FileChooserParams params){if(fileCallback!=null)fileCallback.onReceiveValue(null);fileCallback=callback;
    Intent pick=new Intent(Intent.ACTION_GET_CONTENT);pick.setType("*/*");pick.putExtra(Intent.EXTRA_MIME_TYPES,new String[]{"image/jpeg","image/png","image/webp","application/pdf"});pick.addCategory(Intent.CATEGORY_OPENABLE);pick.putExtra(Intent.EXTRA_ALLOW_MULTIPLE,true);
    Intent chooser=Intent.createChooser(pick,"Photo or document");
    try{File dir=new File(getCacheDir(),"camera");dir.mkdirs();File file=File.createTempFile("load-",".jpg",dir);cameraUri=FileProvider.getUriForFile(MainActivity.this,getPackageName()+".files",file);Intent camera=new Intent("android.media.action.IMAGE_CAPTURE");camera.putExtra("output",cameraUri);camera.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION|Intent.FLAG_GRANT_READ_URI_PERMISSION);if(camera.resolveActivity(getPackageManager())!=null)chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS,new Intent[]{camera});}catch(Exception ignored){cameraUri=null;}
    startActivityForResult(chooser,20);return true;
   }
  });web.loadUrl("https://appassets.androidplatform.net/assets/public/index.html");
 }
 void event(String event,org.json.JSONObject detail){runOnUiThread(()->web.evaluateJavascript("window.dispatchEvent(new CustomEvent("+org.json.JSONObject.quote(event)+",{detail:"+detail+"}));",null));}
 @Override public void onRequestPermissionsResult(int request,String[] permissions,int[] grants){super.onRequestPermissionsResult(request,permissions,grants);if(request==11&&geoCallback!=null){boolean ok=false;for(int grant:grants)ok|=grant==PackageManager.PERMISSION_GRANTED;geoCallback.invoke(geoOrigin,ok,false);geoCallback=null;}if(request==12){if(grants.length>0&&grants[0]==PackageManager.PERMISSION_GRANTED)bridge.listen(bridge.language);else bridge.emitSpeech("Microphone permission denied. Use typed answers.");}}
 @Override protected void onActivityResult(int request,int result,Intent data){super.onActivityResult(request,result,data);if(request==20&&fileCallback!=null){ArrayList<Uri> uris=new ArrayList<>();if(result==RESULT_OK){if(data!=null&&data.getClipData()!=null){for(int i=0;i<data.getClipData().getItemCount();i++)uris.add(data.getClipData().getItemAt(i).getUri());}else if(data!=null&&data.getData()!=null)uris.add(data.getData());else if(cameraUri!=null)uris.add(cameraUri);}fileCallback.onReceiveValue(uris.isEmpty()?null:uris.toArray(new Uri[0]));fileCallback=null;}}
 @Override protected void onResume(){super.onResume();foreground=true;OfferAlerts.get(this).hideOverlays();if(web!=null)event("pickr-native",new org.json.JSONObject());}
 @Override protected void onPause(){foreground=false;super.onPause();}
 @Override public void onBackPressed(){web.evaluateJavascript("window.dispatchEvent(new Event('pickr-back',{cancelable:true}))",value->{if("true".equals(value))moveTaskToBack(true);});}
 @Override protected void onDestroy(){bridge.destroy();web.removeJavascriptInterface("PickrNative");web.destroy();super.onDestroy();}
}
