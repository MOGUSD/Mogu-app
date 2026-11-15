"use strict";
const fs=require("node:fs");
const path=require("node:path");
const crypto=require("node:crypto");
const {S3Client,GetObjectCommand,PutObjectCommand}=require("@aws-sdk/client-s3");
const ROOT=path.resolve(__dirname,"..");
const INPUT=path.join(ROOT,"audio","phrases.json");
const API="https://api.fish.audio/v1/tts";
const VOICE_ID="33d2eff7a2f449b4b1a2e95d42ebbb33";
const MODEL=process.env.FISH_AUDIO_MODEL||"s2.1-pro-free";
const API_KEY=process.env.FISH_AUDIO_API_KEY;
const BUCKET=process.env.MADINA_AUDIO_BUCKET;
const s3=new S3Client({region:process.env.MADINA_AUDIO_REGION||"sin",endpoint:process.env.MADINA_AUDIO_ENDPOINT,forcePathStyle:true,credentials:{accessKeyId:process.env.MADINA_AUDIO_ACCESS_KEY_ID,secretAccessKey:process.env.MADINA_AUDIO_SECRET_ACCESS_KEY}});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const hash=value=>crypto.createHash("sha256").update(value).digest("hex").slice(0,24);
function normalize(text){return String(text||"").replace(/\p{Extended_Pictographic}/gu,"").replace(/[\uFE0E\uFE0F\u200D\u{1F1E6}-\u{1F1FF}]/gu,"").replace(/[\\\/"'«»“”‘’„‟]/g,"").replace(/\s+/g," ").replace(/\s+([,.!?])/g,"$1").trim();}
async function getJson(key,fallback){try{const r=await s3.send(new GetObjectCommand({Bucket:BUCKET,Key:key}));return JSON.parse(await r.Body.transformToString());}catch(e){if(e.name==="NoSuchKey"||e.$metadata?.httpStatusCode===404)return fallback;throw e;}}
async function putJson(key,value){await s3.send(new PutObjectCommand({Bucket:BUCKET,Key:key,Body:JSON.stringify(value,null,2)+"\n",ContentType:"application/json; charset=utf-8"}));}
async function main(){
 if(!API_KEY)throw new Error("FISH_AUDIO_API_KEY is missing");
 if(!BUCKET||!process.env.MADINA_AUDIO_ENDPOINT||!process.env.MADINA_AUDIO_ACCESS_KEY_ID||!process.env.MADINA_AUDIO_SECRET_ACCESS_KEY)throw new Error("MadinaAudio bucket credentials are missing");
 const catalog=JSON.parse(fs.readFileSync(INPUT,"utf8"));
 const manifest=await getJson("audio/madina/manifest.json",{version:1,voiceId:VOICE_ID,model:MODEL,entries:{}});
 const all=[];
 for(const item of catalog.phrases||[])for(const lang of ["ru","kk","en"]){const text=normalize(item[lang]);if(text){const key=hash(lang+"\0"+text);all.push({id:item.id,lang,text,key});}}
 const unique=[...new Map(all.map(x=>[x.key,x])).values()];
 const pending=unique.filter(x=>!manifest.entries[x.key]);
 let generated=0,skipped=unique.length-pending.length;
 const status={status:"running",voiceId:VOICE_ID,model:MODEL,total:unique.length,generated,skipped,remaining:pending.length,startedAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
 await putJson("audio/madina/status.json",status);
 try{
  for(let index=0;index<pending.length;index++){
   const item=pending[index];
   let response;
   for(let attempt=1;attempt<=4;attempt++){
    response=await fetch(API,{method:"POST",headers:{"Authorization":"Bearer "+API_KEY,"Content-Type":"application/json","model":MODEL},body:JSON.stringify({text:item.text,reference_id:VOICE_ID,format:"mp3"}),signal:AbortSignal.timeout(60000)});
    if(response.ok||(response.status!==429&&response.status<500))break;
    await sleep(attempt*4000);
   }
   if(!response.ok)throw new Error("Fish Audio "+item.id+"/"+item.lang+": HTTP "+response.status+" "+(await response.text()).slice(0,240));
   const bytes=Buffer.from(await response.arrayBuffer());
   if(bytes.length<128||(response.headers.get("content-type")||"").includes("json"))throw new Error("Invalid audio for "+item.id+"/"+item.lang);
   const objectKey="audio/madina/"+item.lang+"/"+item.key+".mp3";
   await s3.send(new PutObjectCommand({Bucket:BUCKET,Key:objectKey,Body:bytes,ContentType:"audio/mpeg",CacheControl:"public, max-age=31536000, immutable"}));
   manifest.entries[item.key]={id:item.id,lang:item.lang,text:item.text,src:"./"+item.lang+"/"+item.key+".mp3",bytes:bytes.length};
   generated++;
   status={...status,generated,skipped,remaining:pending.length-generated,updatedAt:new Date().toISOString(),lastPhrase:item.id,lastLanguage:item.lang};
   if(generated%5===0||generated===pending.length){manifest.generatedAt=status.updatedAt;await putJson("audio/madina/manifest.json",manifest);await putJson("audio/madina/status.json",status);}
   console.log("[madina-audio] "+generated+"/"+pending.length+" "+item.id+" "+item.lang);
   await sleep(350);
  }
  manifest.voiceId=VOICE_ID;manifest.model=MODEL;manifest.generatedAt=new Date().toISOString();
  await putJson("audio/madina/manifest.json",manifest);
  status={...status,status:"completed",generated,skipped,remaining:0,completedAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
  await putJson("audio/madina/status.json",status);
  console.log("[madina-audio] completed",JSON.stringify({generated,skipped,total:unique.length}));
 }catch(error){
  status={...status,status:"failed",generated,skipped,remaining:pending.length-generated,error:String(error.message||error).slice(0,300),updatedAt:new Date().toISOString()};
  await putJson("audio/madina/manifest.json",manifest);
  await putJson("audio/madina/status.json",status);
  throw error;
 }
}
main().catch(e=>{console.error("[madina-audio]",e.message);process.exitCode=1;});
