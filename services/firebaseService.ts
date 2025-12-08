
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  getDocs, 
  deleteDoc, 
  onSnapshot,
  query
} from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebaseConfig";
import { User, Vendor } from "../types";
import { MASTER_USER, INITIAL_DB } from "../database";

// --- HELPERS ---

// Upload Base64 Image to Firebase Storage
export const uploadImageToFirebase = async (base64Data: string, path: string): Promise<string> => {
  if (!base64Data) return '';
  try {
    const storageRef = ref(storage, path);
    // Remove header data usually present in base64 (data:image/jpeg;base64,...)
    await uploadString(storageRef, base64Data, 'data_url');
    const url = await getDownloadURL(storageRef);
    return url;
  } catch (error) {
    console.error("Erro upload imagem:", error);
    return base64Data; // Fallback se falhar
  }
};

// --- SYNC FUNCTIONS (REALTIME) ---

export const subscribeToUsers = (callback: (users: User[]) => void) => {
  const q = query(collection(db, "users"));
  return onSnapshot(q, (snapshot) => {
    const users: User[] = [];
    snapshot.forEach((doc) => {
      users.push(doc.data() as User);
    });
    callback(users);
  });
};

export const subscribeToVendors = (callback: (vendors: Vendor[]) => void) => {
  const q = query(collection(db, "vendors"));
  return onSnapshot(q, (snapshot) => {
    const vendors: Vendor[] = [];
    snapshot.forEach((doc) => {
      vendors.push(doc.data() as Vendor);
    });
    callback(vendors);
  });
};

export const subscribeToBanned = (callback: (list: string[]) => void) => {
    const q = query(collection(db, "banned"));
    return onSnapshot(q, (snapshot) => {
        const list: string[] = [];
        snapshot.forEach((doc) => list.push(doc.id)); // Using ID as the banned value (cpf/email)
        callback(list);
    });
};

// --- ACTIONS ---

export const saveUserToFirebase = async (user: User) => {
  try {
    // Se tiver foto em base64, sobe pro storage primeiro
    if (user.photoUrl && user.photoUrl.startsWith('data:')) {
        const url = await uploadImageToFirebase(user.photoUrl, `users/${user.id}/profile.jpg`);
        user.photoUrl = url;
    }
    await setDoc(doc(db, "users", user.id), user);
  } catch (e) {
    console.error("Erro salvando user:", e);
    throw e;
  }
};

export const saveVendorToFirebase = async (vendor: Vendor) => {
  try {
    if (vendor.photoUrl && vendor.photoUrl.startsWith('data:')) {
        const url = await uploadImageToFirebase(vendor.photoUrl, `vendors/${vendor.id}/cover.jpg`);
        vendor.photoUrl = url;
    }
    await setDoc(doc(db, "vendors", vendor.id), vendor);
  } catch (e) {
    console.error("Erro salvando vendor:", e);
    throw e;
  }
};

export const deleteUserFromFirebase = async (id: string) => {
  await deleteDoc(doc(db, "users", id));
};

export const deleteVendorFromFirebase = async (id: string) => {
  await deleteDoc(doc(db, "vendors", id));
};

export const banItemInFirebase = async (value: string) => {
    // Usamos o valor (cpf/email) como ID do documento para facilitar busca
    await setDoc(doc(db, "banned", value), { bannedAt: Date.now() });
};

export const unbanItemInFirebase = async (value: string) => {
    await deleteDoc(doc(db, "banned", value));
};

// Setup Initial Data (Populate Firebase if empty)
export const seedInitialData = async () => {
    try {
        // 1. Check if Master User exists
        const masterRef = doc(db, "users", MASTER_USER.id);
        const masterSnap = await getDoc(masterRef);

        if (!masterSnap.exists()) {
            console.log("Seeding Master User to Firebase...");
            await setDoc(masterRef, MASTER_USER);
        }

        // 2. Check if vendors exist, if not seed demo vendors
        const vendorsSnapshot = await getDocs(collection(db, "vendors"));
        if (vendorsSnapshot.empty && INITIAL_DB.vendors) {
            console.log("Seeding Demo Vendors to Firebase...");
            for (const vendor of INITIAL_DB.vendors) {
                await setDoc(doc(db, "vendors", vendor.id), vendor);
                // Also create user accounts for these vendors so they can login
                const vendorUser: User = {
                    id: vendor.id,
                    name: vendor.name,
                    email: `demo.${vendor.id}@email.com`, // Fake email for demo
                    cpf: vendor.document,
                    address: vendor.address,
                    type: "VENDOR" as any,
                    password: "123",
                    photoUrl: vendor.photoUrl
                };
                await setDoc(doc(db, "users", vendorUser.id), vendorUser);
            }
        }
    } catch (error) {
        console.error("Error seeding initial data:", error);
    }
};
