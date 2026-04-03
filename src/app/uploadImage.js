// lib/uploadImage.js
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase/config";

export async function uploadImage(file, path) {
  if (!file) throw new Error("No image selected");
  
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
}
