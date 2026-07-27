import type { User } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { firestore } from "@/lib/firebase/client";

function createStorageUserId() {
  return `user_${crypto.randomUUID().replaceAll("-", "")}`;
}

export async function initializeUserProfile(user: User) {
  if (!firestore) throw new Error("Firestore is not configured.");
  const userRef = doc(firestore, "users", user.uid);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      displayName: user.displayName ?? "",
      email: user.email ?? "",
      photoURL: user.photoURL ?? "",
      storageUserId: createStorageUserId(),
      driveFolderId: null,
      driveImageFolderId: null,
      totalImageCount: 0,
      totalStorageBytes: 0,
      storageLimitBytes: 524_288_000,
      imageCountLimit: 500,
      dailyUploadCount: 0,
      lastUploadDate: null,
      termsAccepted: false,
      privacyPolicyAccepted: false,
      age18Confirmed: false,
      tutorialCompletedAt: null,
      uploadSuspended: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { consentRequired: true, tutorialRequired: true };
  }

  const data = snapshot.data();
  return {
    consentRequired: data.termsAccepted !== true || data.privacyPolicyAccepted !== true || data.age18Confirmed !== true,
    tutorialRequired: data.tutorialCompletedAt == null,
  };
}

export async function acceptPolicies(uid: string) {
  if (!firestore) throw new Error("Firestore is not configured.");
  await updateDoc(doc(firestore, "users", uid), {
    termsAccepted: true,
    privacyPolicyAccepted: true,
    age18Confirmed: true,
    termsAcceptedAt: serverTimestamp(),
    privacyPolicyAcceptedAt: serverTimestamp(),
    age18ConfirmedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function completeTutorial(uid: string) {
  if (!firestore) throw new Error("Firestore is not configured.");
  await updateDoc(doc(firestore, "users", uid), {
    tutorialCompletedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
