/** Ignore a response from a session replaced while its request was in flight. */
export async function requestForSession<T>(currentToken:()=>string,request:()=>Promise<T>):Promise<{kind:'success';value:T}|{kind:'error';error:unknown}|{kind:'stale'}>{
 const session=currentToken();
 try{const value=await request();return currentToken()===session?{kind:'success',value}:{kind:'stale'};}
 catch(error){return currentToken()===session?{kind:'error',error}:{kind:'stale'};}
}
