import {Text,View} from 'react-native';
import {ProfilePage} from '@/components/profile/settings';
export function ComingSoon({title}:{title:string}){return <ProfilePage title={title}><View><Text accessibilityRole="header" style={{fontSize:24,fontWeight:'700'}}>Coming soon</Text><Text style={{marginTop:12}}>Planned for PICKR v2. This feature is not available in the pilot.</Text></View></ProfilePage>;}
