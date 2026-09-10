import { redirect } from "next/navigation";

// Alias legado -- la demo nueva de una sola vista vive en /demo
// (Knowledge/29_Specs/009-demo-today-en-vivo, FR-019).
export default function ClientDemoPage() {
  redirect("/demo");
}
