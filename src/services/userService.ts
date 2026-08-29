/**
 * NamasteMart User Profile Service
 * Manages users/{uid} documents in Firestore.
 */

import {
  db,
  COLLECTIONS,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  limit,
  onSnapshot,
  serverTimestamp,
} from '@/config/firebase';
import { FirestoreUser, KoreanAddress } from '@/types';

/**
 * Ensures a user document exists in Firestore.
 * If new: creates with name, email, empty addresses, and phone.
 * If existing: updates name/email if changed, but NEVER overwrites existing phone or addresses.
 */
export const ensureUserDoc = async (
  uid: string,
  data: {
    name: string;
    email: string;
    phoneNumber?: string;
    avatar?: string;
    role?: string;
    emailVerified?: boolean;
  }
): Promise<FirestoreUser> => {
  const fallbackUser: FirestoreUser = {
    uid,
    name: data.name || 'User',
    email: data.email || '',
    phoneNumber: data.phoneNumber || '',
    avatar: data.avatar || '',
    addresses: [],
    role: data.role || 'customer',
    emailVerified: data.emailVerified || false,
    profileSetupComplete: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  try {
    const userRef = doc(db, COLLECTIONS.USERS, uid);
    const snap = await getDoc(userRef).catch(() => null);

    if (!snap || !snap.exists()) {
      await setDoc(userRef, {
        ...fallbackUser,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }).catch((e) => console.log('Notice writing user doc:', e.message));
      return fallbackUser;
    }

    // Document exists: update name/email/avatar if provided, without overwriting phone or addresses
    const existingData = snap.data() as FirestoreUser;
    const updates: any = {
      updatedAt: serverTimestamp(),
    };
    if (data.name && data.name !== existingData.name) updates.name = data.name;
    if (data.email && data.email !== existingData.email) updates.email = data.email;
    if (data.avatar) updates.avatar = data.avatar;
    if (data.phoneNumber && !existingData.phoneNumber) updates.phoneNumber = data.phoneNumber;
    if (data.emailVerified !== undefined) updates.emailVerified = data.emailVerified;

    if (Object.keys(updates).length > 1) {
      await updateDoc(userRef, updates).catch((e) => console.log('Notice updating user doc:', e.message));
    }

    return { ...existingData, ...updates };
  } catch (err: any) {
    console.log('ensureUserDoc resilient fallback:', err.message);
    return fallbackUser;
  }
};

/**
 * Fetch a user profile document by UID.
 */
export const getUserDoc = async (uid: string): Promise<FirestoreUser | null> => {
  try {
    const snap = await getDoc(doc(db, COLLECTIONS.USERS, uid));
    if (snap.exists()) {
      return snap.data() as FirestoreUser;
    }
  } catch (err: any) {
    console.log('Error getting user doc:', err.message);
  }
  return null;
};

/**
 * Subscribe to real-time user document updates.
 */
export const subscribeToUserDoc = (
  uid: string,
  callback: (user: FirestoreUser | null) => void
): (() => void) => {
  return onSnapshot(
    doc(db, COLLECTIONS.USERS, uid),
    (snap) => {
      if (snap.exists()) {
        callback(snap.data() as FirestoreUser);
      } else {
        callback(null);
      }
    },
    (err) => {
      console.log('User doc subscription notice:', err.message);
    }
  );
};

/**
 * Update basic user profile fields.
 */
export const updateUserProfileDoc = async (
  uid: string,
  updates: Partial<Pick<FirestoreUser, 'name' | 'phoneNumber' | 'avatar'>>
): Promise<void> => {
  await updateDoc(doc(db, COLLECTIONS.USERS, uid), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
};

/**
 * Subscribe to all registered users for Admin Customer Management.
 */
export const subscribeAllUsersAdmin = (
  callback: (users: FirestoreUser[]) => void
): (() => void) => {
  const q = query(collection(db, COLLECTIONS.USERS), limit(500));
  return onSnapshot(
    q,
    (snapshot) => {
      const users = snapshot.docs.map((d) => ({
        uid: d.id,
        ...d.data(),
      })) as FirestoreUser[];
      callback(users);
    },
    (err) => {
      console.log('Admin users subscription notice:', err.message);
    }
  );
};

/**
 * Fetch all registered users for Admin.
 */
export const getAllUsersAdmin = async (): Promise<FirestoreUser[]> => {
  try {
    const q = query(collection(db, COLLECTIONS.USERS), limit(500));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({
      uid: d.id,
      ...d.data(),
    })) as FirestoreUser[];
  } catch (err: any) {
    console.log('Error getting all users:', err.message);
    return [];
  }
};

/**
 * Mark user email as verified in Firestore.
 */
export const markEmailVerifiedInFirestore = async (uid: string): Promise<void> => {
  const userRef = doc(db, COLLECTIONS.USERS, uid);
  await updateDoc(userRef, {
    emailVerified: true,
    updatedAt: serverTimestamp(),
  }).catch(async () => {
    await setDoc(userRef, { emailVerified: true, updatedAt: serverTimestamp() }, { merge: true });
  });
};

/**
 * Fetch saved addresses from subcollection users/{uid}/addresses.
 */
export const getUserAddressesSubcollection = async (uid: string): Promise<KoreanAddress[]> => {
  try {
    const q = collection(db, COLLECTIONS.USERS, uid, 'addresses');
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as KoreanAddress[];
    }
  } catch (err: any) {
    console.log('Error fetching user addresses subcollection:', err.message);
  }
  return [];
};

/**
 * Save delivery address to user document (array + subcollection) and set profile setup complete.
 */
export const saveUserDeliveryAddress = async (
  uid: string,
  newAddress: KoreanAddress
): Promise<KoreanAddress[]> => {
  let addresses: KoreanAddress[] = [newAddress];

  try {
    const userRef = doc(db, COLLECTIONS.USERS, uid);
    const snap = await getDoc(userRef).catch(() => null);

    if (snap && snap.exists()) {
      const existing = snap.data() as FirestoreUser;
      addresses = existing.addresses || [];
    }

    // If set as default, mark previous addresses as non-default
    if (newAddress.isDefault) {
      addresses = addresses.map((a) => ({ ...a, isDefault: false }));
    }

    const existingIdx = addresses.findIndex((a) => a.id === newAddress.id);
    if (existingIdx >= 0) {
      addresses[existingIdx] = newAddress;
    } else {
      addresses.push(newAddress);
    }

    // 1. Update parent user document (array + setup flags)
    await setDoc(
      userRef,
      {
        addresses,
        emailVerified: true,
        profileSetupComplete: true,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    ).catch((e) => console.log('Notice saving user address to userDoc:', e.message));

    // 2. Also write to subcollection users/{uid}/addresses/{addressId}
    try {
      const subcollRef = doc(db, COLLECTIONS.USERS, uid, 'addresses', newAddress.id);
      await setDoc(
        subcollRef,
        {
          addressId: newAddress.id,
          recipientName: newAddress.recipientName,
          phoneNumber: newAddress.phoneNumber,
          postalCode: newAddress.postalCode,
          province: newAddress.province || 'Seoul',
          city: newAddress.city || 'Seoul',
          district: newAddress.district || 'Gangnam-gu',
          streetAddress: newAddress.streetAddress || newAddress.address,
          buildingName: newAddress.buildingName || '',
          unitNumber: newAddress.unitNumber || '',
          detailAddress: newAddress.detailAddress || '',
          deliveryInstructions: newAddress.deliveryInstructions || '',
          isDefault: newAddress.isDefault,
          createdAt: newAddress.createdAt || Date.now(),
          updatedAt: Date.now(),
        },
        { merge: true }
      ).catch((e) => console.log('Notice saving address subcollection:', e.message));
    } catch (subErr: any) {
      console.log('Notice saving address subcollection:', subErr.message);
    }
  } catch (err: any) {
    console.log('saveUserDeliveryAddress resilient fallback:', err.message);
  }

  return addresses;
};

/**
 * Update user setup complete flag.
 */
export const updateUserSetupComplete = async (uid: string, complete: boolean): Promise<void> => {
  const userRef = doc(db, COLLECTIONS.USERS, uid);
  await updateDoc(userRef, {
    profileSetupComplete: complete,
    updatedAt: serverTimestamp(),
  }).catch(async () => {
    await setDoc(userRef, { profileSetupComplete: complete, updatedAt: serverTimestamp() }, { merge: true });
  });
};
