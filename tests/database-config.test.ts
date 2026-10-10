import {describe,it,expect} from 'vitest';
// Migration scripts are Node tools, outside the frontend bundle.
import {connectionOptions} from '../scripts/pilot-database.mjs';
describe('Migration connection configuration',()=>{
 it('requires verified TLS for remote databases',()=>{const options=connectionOptions('postgresql://user:secret@db.project.supabase.co/postgres?sslmode=no-verify','trusted-ca');expect(options.ssl).toEqual({rejectUnauthorized:true,ca:'trusted-ca'});expect(options.connectionString).not.toContain('sslmode');});
 it('allows local disposable PostgreSQL without SSL',()=>{expect(connectionOptions('postgresql://user@127.0.0.1/postgres').ssl).toBe(false);});
 it('rejects transaction pooling for session-based migrations',()=>{expect(()=>connectionOptions('postgresql://user@pooler.supabase.com:6543/postgres')).toThrow(/session-pooler/);});
});
