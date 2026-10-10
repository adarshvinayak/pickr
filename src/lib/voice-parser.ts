import { GoogleGenAI } from '@google/genai';
import { MATERIALS, getMaterialById } from '@/config/materials';
import { VoiceParseResponse, VoiceParseResponseSchema } from '@/types';
export interface ParseVoiceInput { transcript: string; currentSlots?: Record<string, unknown> }
export function nextVoiceQuestion(slots: VoiceParseResponse): VoiceParseResponse {
 const material=getMaterialById(slots.material||'');
 const questions:VoiceParseResponse['nextQuestion'][]=[
 !material?{slot:'material',text:'What construction material should we move?',chips:['M-Sand','Cement','Bricks','Mixed / Other']}:null,
 !slots.quantity?{slot:'quantity',text:`How many ${material?.nativeUnit||'loads'}?`,chips:material?.nativeUnit==='bag'?['10 bags','30 bags','50 bags']:['1 load','2 loads','Choose quantity']}:null,
 !slots.pickupText?{slot:'pickupLocation',text:'Where should we pick it up?',chips:['Use current location','Choose on map','Search location']}:null,
 !slots.dropText?{slot:'dropLocation',text:'Where should we deliver it?',chips:['Choose on map','Search location','Saved sites']}:null,
 !slots.when?{slot:'when',text:'When do you need the truck?',chips:['Now','In 2 hours','Pick a time']}:null,
 material&&!material.selfTipping&&slots.labourNeeded===null?{slot:'labour',text:'Do you need loading and unloading helpers?',chips:['Yes, helpers needed','No helpers']}:null,
 !slots.siteAccess?{slot:'siteAccess',text:'Is the pickup or destination on a narrow lane?',chips:['Normal road access','Narrow lane']}:null
 ];
 const question=questions.find(Boolean)||null;
 return {...slots,unit:material?.nativeUnit||slots.unit,labourNeeded:material?.selfTipping?false:slots.labourNeeded,nextQuestion:question,readyToConfirm:!question};
}
export function parseWithLocalRules(transcript:string,current:Record<string,unknown>={}):VoiceParseResponse {
 const previous=VoiceParseResponseSchema.safeParse(current); const slots:VoiceParseResponse=previous.success?{...previous.data}:{material:null,quantity:null,unit:null,pickupText:null,dropText:null,when:null,labourNeeded:null,siteAccess:null,confidence:.8,nextQuestion:null,readyToConfirm:false};
 const lower=transcript.toLowerCase().trim(); const slot=slots.nextQuestion?.slot;
 const material=MATERIALS.find(m=>[m.displayName,...m.synonyms,m.id.replaceAll('_',' ')].some(n=>lower.includes(n.toLowerCase())));
 if(material){slots.material=material.id;slots.unit=material.nativeUnit;if(material.selfTipping)slots.labourNeeded=false;}
 const words:Record<string,number>={one:1,two:2,three:3,four:4,five:5,ten:10,twenty:20,thirty:30,fifty:50,hundred:100};
 const amount=lower.match(/\b(\d+(?:\.\d+)?|one|two|three|four|five|ten|twenty|thirty|fifty|hundred)\s*(?:units?|loads?|bags?|boxes|bundles?|bricks?|nos|kg|kilos?)\b/);
 if(amount)slots.quantity=Number(amount[1])||words[amount[1]];
 else if(slot==='quantity'&&/^\d+(?:\.\d+)?$/.test(lower))slots.quantity=Number(lower);
 else if(slot==='quantity'&&words[lower])slots.quantity=words[lower];
 else if(/\ba load\b/.test(lower))slots.quantity=1;
 const from=transcript.match(/\bfrom\s+(.+?)(?=\s+to\s+|$)/i); const to=transcript.match(/\bto\s+(.+?)(?=\s+(?:now|in \d+ hours?|with helpers)\b|$)/i);
 if(from)slots.pickupText=from[1].trim();if(to)slots.dropText=to[1].trim();
 if(slot==='pickupLocation'&&!material&&!amount&&!/make it|hours?|helpers?|access|narrow|now/i.test(lower)&&!from&&!['choose on map','search location','use current location'].includes(lower))slots.pickupText=transcript.trim();
 if(slot==='dropLocation'&&!material&&!amount&&!/make it|hours?|helpers?|access|narrow|now/i.test(lower)&&!to&&!['choose on map','search location','saved sites'].includes(lower))slots.dropText=transcript.trim();
 if(/\b(now|immediately|urgent)\b/.test(lower))slots.when='now';
 const hours=lower.match(/\bin\s+(\d+|two)\s+hours?\b/);if(hours)slots.when=new Date(Date.now()+(hours[1]==='two'?2:Number(hours[1]))*3600000).toISOString();
 if(/no helpers|no labour|without helpers/.test(lower))slots.labourNeeded=false;else if(/helpers needed|with helpers|need labour|yes.*helpers/.test(lower))slots.labourNeeded=true;
 if(lower.includes('narrow'))slots.siteAccess='narrow';else if(/normal road|normal access|wide road/.test(lower))slots.siteAccess='normal';
 return nextVoiceQuestion(slots);
}
export async function parseVoiceTranscript(input:ParseVoiceInput):Promise<VoiceParseResponse> {
 const local=parseWithLocalRules(input.transcript,input.currentSlots); const key=process.env.GEMINI_API_KEY;
 if(!key||key.includes('your-'))return local;
 try {
 const ai=new GoogleGenAI({apiKey:key});const response=await ai.models.generateContent({model:process.env.GEMINI_MODEL||'gemini-2.5-flash',contents:`Parse English or Malayalam freight instructions into JSON. Only extract slots; never give prices, routes or vehicle recommendations. Material IDs and units: ${JSON.stringify(MATERIALS.map(m=>({id:m.id,name:m.displayName,unit:m.nativeUnit,synonyms:m.synonyms})))}. Current slots: ${JSON.stringify(input.currentSlots||{})}. Spoken instruction: ${JSON.stringify(input.transcript)}. Return all fields: material (valid ID or null), quantity (number or null), unit (unit,bag,nos,kg,box,bundle,load or null), pickupText, dropText, when (now or ISO time or null), labourNeeded (boolean or null), siteAccess (normal,narrow or null), confidence (0..1), nextQuestion null, readyToConfirm false. Preserve filled slots unless explicitly corrected. Do not infer or invent places or quantity.`,config:{responseMimeType:'application/json',httpOptions:{timeout:15000}}});
 const parsed=VoiceParseResponseSchema.parse(JSON.parse(response.text||'{}'));
 if(parsed.confidence<.5||parsed.material&&!getMaterialById(parsed.material)||parsed.quantity!==null&&parsed.quantity<=0)return local;
 return nextVoiceQuestion(parsed);
 } catch {return local;}
}
