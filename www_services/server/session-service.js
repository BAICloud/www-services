import { deleteCookie, getSignedCookie, setSignedCookie } from "@hono/hono/cookie";

const secret = Deno.env.get("COOKIE_KEY") || "default-secret-key-change-in-production";
const WEEK_IN_MILLISECONDS = 604800000;

const createSession = async (c, user) => {
  const sessionID = crypto.randomUUID();
  await setSignedCookie(c, "session-id", sessionID, secret, {
    path: "/",      //Cookie is valid for all paths
  });

  const kv = await Deno.openKv();
  await kv.set(["sessions", sessionID], user, {
    expireIn: WEEK_IN_MILLISECONDS,
  });
}

const getUserFromSession = async (c) => {
  const sessionID = await getSignedCookie(c, secret, "session-id");
  if(!sessionID) {
    return null;
  }

  const kv = await Deno.openKv();
  const user = await kv.get(["sessions", sessionID]);
  const foundUser = user?.value ?? null;
  if (!foundUser) {
    return null;
  }

  await kv.set(["sessions", sessionID], foundUser, {
    expireIn: WEEK_IN_MILLISECONDS,
  });

  return foundUser;
}

const deleteSession = async (c) => {
  const sessionID = await getSignedCookie(c, secret, "session-id");
  if(!sessionID) {
    return;
  }

  deleteCookie(c, "session-id", {
    path: "/"
  });

  const kv = await Deno.openKv();
  await kv.delete(["sessions", sessionID]);
}

export { createSession, getUserFromSession, deleteSession }

