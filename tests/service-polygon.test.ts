import {describe,it,expect} from 'vitest';
import {validServicePolygon,inPolygon} from '@/lib/pilot/geo';
describe('Service boundary validation',()=>{
 it('accepts concave and explicitly closed valid polygons',()=>{expect(validServicePolygon([[0,0],[2,0],[1,1],[2,2],[0,2]])).toBe(true);expect(validServicePolygon([[0,0],[1,0],[1,1],[0,1],[0,0]])).toBe(true);});
 it('rejects crossed polygons even when shoelace area is nonzero',()=>{expect(validServicePolygon([[0,0],[3,3],[0,3],[2,0]])).toBe(false);});
 it('rejects repeated vertices and zero-area boundaries',()=>{expect(validServicePolygon([[0,0],[1,0],[1,1],[1,0],[0,1]])).toBe(false);expect(validServicePolygon([[0,0],[1,1],[2,2]])).toBe(false);});
 it('includes a vertex and excludes the concave notch',()=>{const p:[number,number][]=[[0,0],[2,0],[1,1],[2,2],[0,2]];expect(inPolygon({lat:0,lng:0},p)).toBe(true);expect(inPolygon({lat:1,lng:1.9},p)).toBe(false);});
});
