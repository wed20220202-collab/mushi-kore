import "server-only";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { createRemoteJWKSet, jwtVerify } from "jose";

const firebasePublicKeys = createRemoteJWKSet(new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"));

function getAdminApp() {
  if (getApps()[0]) return getApps()[0];
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId) throw new Error("Firebase Admin project ID is not configured.");
  if (clientEmail && privateKey) return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  // ID token verification uses Google's public keys and only needs the project ID.
  // Firestore Admin writes still require service-account credentials in phase 4.
  return initializeApp({ projectId });
}

export function adminDb() { return getFirestore(getAdminApp()); }

export async function verifyBearerToken(request: Request) {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) throw new Error("UNAUTHENTICATED");
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  if (!projectId) throw new Error("Firebase Admin project ID is not configured.");
  try {
    const { payload } = await jwtVerify(header.slice(7), firebasePublicKeys, {
      algorithms: ["RS256"],
      audience: projectId,
      issuer: `https://securetoken.google.com/${projectId}`,
    });
    const now = Math.floor(Date.now() / 1000);
    if (!payload.sub || payload.sub.length > 128 || typeof payload.auth_time !== "number" || payload.auth_time > now) throw new Error("Invalid Firebase token claims.");
    return {
      ...payload,
      uid: payload.sub,
      name: typeof payload.name === "string" ? payload.name : undefined,
      picture: typeof payload.picture === "string" ? payload.picture : undefined,
      admin: payload.admin === true,
    };
  } catch {
    throw new Error("UNAUTHENTICATED");
  }
}
