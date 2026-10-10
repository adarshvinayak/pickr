import React from 'react';
import { createRoot } from 'react-dom/client';
import { PilotApp } from '../../src/components/pilot/PilotApp';
import '../../src/app/globals.css';
const role=window.PickrNative?.getRole()==='driver'?'driver':'customer';
createRoot(document.getElementById('root')!).render(<PilotApp role={role}/>);
