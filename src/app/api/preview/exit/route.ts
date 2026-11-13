import { draftMode } from "next/headers";
import { redirect } from "next/navigation";

export async function GET(req: Request) {
  (await draftMode()).disable();
  const back = new URL(req.url).searchParams.get("to");
  redirect(back && back.startsWith("/") && !back.startsWith("//") ? back : "/");
}
