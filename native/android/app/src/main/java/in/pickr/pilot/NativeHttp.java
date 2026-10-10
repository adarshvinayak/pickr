package in.pickr.pilot;
import android.content.Context;
import org.json.JSONObject;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.io.IOException;
public final class NativeHttp {
 public static class ApiException extends IOException {public final int status;ApiException(int value,String message){super(message);status=value;}}
 public static JSONObject call(Context context,String path,JSONObject payload) throws Exception {
  var prefs=context.getSharedPreferences("pickr",Context.MODE_PRIVATE);
  String base=prefs.getString("backend",BuildConfig.BACKEND_URL);String token=prefs.getString("token","");
  if(base.isEmpty()||token.isEmpty())throw new IOException("Open the app and sign in to configure the server.");
  HttpURLConnection conn=(HttpURLConnection)new URL(base+"/api/"+path).openConnection();
  conn.setConnectTimeout(12000);conn.setReadTimeout(15000);conn.setRequestProperty("Authorization","Bearer "+token);
  try {
   if(payload!=null){conn.setRequestMethod("POST");conn.setDoOutput(true);conn.setRequestProperty("Content-Type","application/json");try(var out=conn.getOutputStream()){out.write(payload.toString().getBytes(StandardCharsets.UTF_8));}}
   int status=conn.getResponseCode();var stream=status<400?conn.getInputStream():conn.getErrorStream();
   String raw;try(var input=stream){if(input==null)raw="{}";else{java.io.ByteArrayOutputStream output=new java.io.ByteArrayOutputStream();byte[] buffer=new byte[8192];int n;while((n=input.read(buffer))!=-1)output.write(buffer,0,n);raw=output.toString("UTF-8");}}
   JSONObject result=new JSONObject(raw);if(status>=400)throw new ApiException(status,result.optString("error","Server error "+status));return result;
  } finally {conn.disconnect();}
 }
}
