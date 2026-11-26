import {invoke} from '@tauri-apps/api/core';
export async function saveText(filename:string,text:string){return invoke<string|null>('save_export',{filename,bytes:Array.from(new TextEncoder().encode(text))});}
export async function saveBytes(filename:string,bytes:Uint8Array){return invoke<string|null>('save_export',{filename,bytes:Array.from(bytes)});}
