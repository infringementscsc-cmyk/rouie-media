"use client";
import { useState, type FormEvent } from "react";
type Visibility = "public" | "private";
export default function UploadForm(){
 const [busy,setBusy]=useState(false); const [message,setMessage]=useState(""); const [progress,setProgress]=useState(0);
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault(); if(busy)return; const form=e.currentTarget; const data=new FormData(form); const file=data.get("file");
  if(!(file instanceof File)||!file.size){setMessage("Select a video.");return;}
  if(file.size>200*1024*1024){setMessage("This browser uploader supports files up to 200 MB. Use tus for larger files.");return;}
  setBusy(true);setMessage("Creating secure upload link...");setProgress(0);
  try{
   const response=await fetch("/api/admin/uploads",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:data.get("title"),description:data.get("description"),category:data.get("category"),visibility:data.get("visibility"),fileName:file.name,mimeType:file.type,fileSize:file.size})});
   const result=await response.json(); if(!response.ok)throw new Error(result.error||"Unable to create upload");
   setMessage("Uploading to Cloudflare Stream...");
   await new Promise<void>((resolve,reject)=>{
    const xhr=new XMLHttpRequest();xhr.open("POST",result.uploadURL);xhr.upload.onprogress=ev=>{if(ev.lengthComputable)setProgress(Math.round(ev.loaded/ev.total*100));};
    xhr.onload=()=>xhr.status>=200&&xhr.status<300?resolve():reject(new Error(`Upload failed (${xhr.status})`));xhr.onerror=()=>reject(new Error("Network upload failed"));
    const body=new FormData();body.append("file",file);xhr.send(body);
   });
   setMessage("Upload complete. Cloudflare is processing the video. Refresh the dashboard after processing.");form.reset();
  }catch(err){setMessage(err instanceof Error?err.message:"Unexpected error");}finally{setBusy(false);}
 }
 return <form className="upload-panel" onSubmit={submit}><h2>Upload a video</h2><label>Title<input name="title" required minLength={3} maxLength={120}/></label><label>Description<textarea name="description" maxLength={5000}/></label><label>Category<select name="category">{["Culture","Design","Technology","Travel","Education","Entertainment","News","Other"].map(c=><option key={c}>{c}</option>)}</select></label><label>Visibility<select name="visibility" defaultValue="public"><option value="public">Public after processing</option><option value="private">Private (restricted)</option></select></label><label>Video file (MP4, WebM, MOV; max 200 MB)<input type="file" name="file" accept="video/mp4,video/webm,video/quicktime" required/></label><button className="primary-button" disabled={busy} type="submit">{busy?`Uploading ${progress}%` : "Upload video"}</button><p role="status">{message}</p></form>;
}
