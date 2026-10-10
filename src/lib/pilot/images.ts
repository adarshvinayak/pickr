// Device-side compression before upload; documents/PDFs remain untouched.
export async function compressPhoto(file:File):Promise<File> {
 if(!file.type.startsWith('image/')||typeof createImageBitmap==='undefined')return file;
 const bitmap=await createImageBitmap(file);const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);const ctx=canvas.getContext('2d');if(!ctx){bitmap.close();return file;}ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
 const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/jpeg',.78));return blob?new File([blob],file.name.replace(/\.[^.]+$/,'.jpg'),{type:'image/jpeg'}):file;
}
