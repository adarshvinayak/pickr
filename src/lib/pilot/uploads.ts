import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ApiError, check, database, identity } from './server';
export async function upload(req:NextRequest):Promise<NextResponse> {
 const account=await identity(req,['driver','admin']); const form=await req.formData(); const file=form.get('file'); const purpose=z.enum(['document','load']).parse(form.get('purpose'));
 if(!(file instanceof File)||file.size===0||file.size>10*1024*1024) throw new ApiError(400,'Choose a file under 10 MB.');
 const bytes=Buffer.from(await file.arrayBuffer());
 const jpeg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255; const png=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
 const webp=bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP'; const pdf=bytes.subarray(0,5).toString()==='%PDF-';
 const ext=jpeg?'jpg':png?'png':webp?'webp':pdf&&purpose==='document'?'pdf':null;
 if(!ext) throw new ApiError(400,'Use a JPEG, PNG, WebP image or a PDF document.');
 const mime=ext==='jpg'?'image/jpeg':ext==='pdf'?'application/pdf':`image/${ext}`;
 const path=`${account.id}/${purpose}/${crypto.randomUUID()}.${ext}`; const db=database(); check(await db.storage.from('pilot-private').upload(path,bytes,{contentType:mime,upsert:false}));
 const record=await db.from('pilot_uploads').insert({path,owner_id:account.id,purpose});
 if(record.error) {await db.storage.from('pilot-private').remove([path]); check(record);}
 return NextResponse.json({data:{path}});
}
export async function fileUrl(req:NextRequest):Promise<NextResponse> {
 const account=await identity(req); const path=z.string().min(1).max(500).parse(req.nextUrl.searchParams.get('path')); const db=database();
 const record=check(await db.from('pilot_uploads').select('*').eq('path',path).maybeSingle()); if(!record) throw new ApiError(404,'File not found.');
 if(account.role!=='admin'&&record.owner_id!==account.id) {
 if(record.purpose!=='load') throw new ApiError(403,'Private document.');
 const bookings=check(await db.from('pilot_bookings').select('payload').eq('customer_id',account.id).contains('payload',{loadPhotos:[path]}));
 if(!bookings.length) throw new ApiError(403,'File belongs to another trip.');
 }
 const signed=check(await db.storage.from('pilot-private').createSignedUrl(path,120)); return NextResponse.json({data:{url:signed.signedUrl}});
}
