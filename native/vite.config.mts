import {execFileSync} from 'node:child_process';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
export default defineConfig({define:{'process.env.NEXT_PUBLIC_PICKR_RELEASE':JSON.stringify(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim())},root:fileURLToPath(new URL('./web',import.meta.url)),base:'./',plugins:[react(),tailwind()],resolve:{alias:{'@':fileURLToPath(new URL('../src',import.meta.url))}},build:{outDir:'../android/app/src/main/assets/public',emptyOutDir:true,target:'es2020',sourcemap:false}});
