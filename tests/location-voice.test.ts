import {afterEach,describe,expect,it,vi} from 'vitest';
import {currentLocation} from '@/lib/pilot/client';
import {parseWithLocalRules} from '@/lib/voice-parser';
import {voiceQuantityChoices} from '@/lib/voice-quantities';
import {MATERIALS} from '@/config/materials';
describe('location recovery and spoken quantities',()=>{
 afterEach(()=>vi.unstubAllGlobals());
 it('rejects disabled native GPS before a browser request can hang',async()=>{const request=vi.fn();vi.stubGlobal('window',{isSecureContext:true,PickrNative:{getDevicePermissions:()=>JSON.stringify({gps:false})}});vi.stubGlobal('navigator',{geolocation:{getCurrentPosition:request}});await expect(currentLocation()).rejects.toThrow('Device location is turned off');expect(request).not.toHaveBeenCalled();});
 it('offers valid trade quantities which round-trip through spoken parsing',()=>{for(const material of MATERIALS){const slots=parseWithLocalRules(material.id.replaceAll('_',' '));expect(slots.nextQuestion?.slot).toBe('quantity');const answer=slots.nextQuestion!.chips[0];const result=parseWithLocalRules(answer,slots);expect(result.material).toBe(material.id);expect(result.quantity).toBe(material.minQuantity);expect(answer).not.toMatch(/\bnos\b/);}});
 it('uses readable singular quantities when correcting an answer',()=>{expect(voiceQuantityChoices('m_sand')[0]).toBe('1 unit');expect(voiceQuantityChoices(null)).toEqual(['Choose quantity']);});
 it('understands full words for numbers and kilograms',()=>{expect(parseWithLocalRules('500 numbers',parseWithLocalRules('bricks')).quantity).toBe(500);expect(parseWithLocalRules('500 kilograms',parseWithLocalRules('steel')).quantity).toBe(500);});
});
