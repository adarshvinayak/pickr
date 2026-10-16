import type {Account,DriverProfile} from '@/lib/pilot/model';
export interface AdminData {accounts:Account[];drivers:DriverProfile[];pendingPush:number}
export type Mutation=(body:unknown)=>Promise<boolean>;
export const isQA=(name:string)=>/^\s*(QA |MOCK )/i.test(name);
