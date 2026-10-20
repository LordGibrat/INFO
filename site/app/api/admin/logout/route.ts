import { isSameOrigin,privateJson,SESSION_COOKIE,SESSION_SAME_SITE } from "@/lib/auth";
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return privateJson({error:"Сұрау көзі расталмады."},403);
  const response = privateJson({authenticated:false});
  response.headers.append("Set-Cookie",`${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=${SESSION_SAME_SITE}; Max-Age=0${process.env.NODE_ENV==="production" || new URL(request.url).protocol==="https:"?"; Secure":""}`);
  return response;
}
