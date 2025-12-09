
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  getDocs, 
  deleteDoc, 
  onSnapshot,
  query,
  where,
  updateDoc
} from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { db, storage, auth } from "../firebaseConfig";
import { User, Vendor, UserType, AppConfig } from "../types";
import { MASTER_USER, INITIAL_DB } from "../database";

// --- HELPERS ---

// Função para limpar dados undefined (O Firebase não aceita undefined)
const sanitizePayload = (data: any) => {
    const cleanData = { ...data };
    Object.keys(cleanData).forEach(key => {
        if (cleanData[key] === undefined) {
            cleanData[key] = null;
        }
    });
    return cleanData;
};

// Upload Base64 Image to Firebase Storage with Timeout
export const uploadImageToFirebase = async (base64Data: string, path: string): Promise<string> => {
  if (!base64Data) return '';
  
  try {
    const storageRef = ref(storage, path);
    
    // Create a timeout promise (25 seconds)
    const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Tempo limite excedido (25s). Verifique sua internet.")), 25000)
    );

    // Upload task
    const uploadTask = uploadString(storageRef, base64Data, 'data_url');

    // Race between upload and timeout
    await Promise.race([uploadTask, timeoutPromise]);

    const url = await getDownloadURL(storageRef);
    return url;
  } catch (error: any) {
    console.error("Erro upload imagem:", error);
    // Throw error so UI knows it failed
    throw new Error(error.message || "Falha no upload da imagem."); 
  }
};

// --- AUTHENTICATION & USERS ---

// Otimização: Buscar usuário específico pelo e-mail em vez de baixar todos
export const getUserByEmail = async (email: string): Promise<User | null> => {
    try {
        // Verificar primeiro se é o Master Hardcoded
        if (email === MASTER_USER.email) {
             // Verificar se existe no banco para pegar dados atualizados
             const masterRef = doc(db, "users", MASTER_USER.id);
             const masterSnap = await getDoc(masterRef);
             if (masterSnap.exists()) {
                 return masterSnap.data() as User;
             }
             return MASTER_USER;
        }

        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", email));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            return querySnapshot.docs[0].data() as User;
        }
        return null;
    } catch (error) {
        console.error("Erro ao buscar usuário:", error);
        return null;
    }
};

export const signInWithGoogle = async (): Promise<{ user: User | null, isNewUser: boolean, googleData?: any }> => {
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        const googleUser = result.user;
        const email = googleUser.email;

        if (!email) throw new Error("Google não forneceu o e-mail.");

        const existingUser = await getUserByEmail(email);

        if (existingUser) {
            return { user: existingUser, isNewUser: false };
        } else {
            // Usuário não existe no nosso banco, retornar dados para cadastro
            return { 
                user: null, 
                isNewUser: true, 
                googleData: {
                    name: googleUser.displayName || '',
                    email: googleUser.email || '',
                    photoUrl: googleUser.photoURL || ''
                }
            };
        }
    } catch (error: any) {
        console.error("Erro no login Google:", error);
        alert(`Erro ao conectar com Google: ${error.message}`);
        throw error;
    }
};

// --- SECURITY & LOCKING ---

export const recordFailedLogin = async (user: User) => {
    try {
        const userRef = doc(db, "users", user.id);
        const currentAttempts = (user.failedLoginAttempts || 0) + 1;
        
        let updates: any = { failedLoginAttempts: currentAttempts };
        
        // If attempts >= 3, lock for 5 minutes
        if (currentAttempts >= 3) {
            updates.lockedUntil = Date.now() + 5 * 60 * 1000;
        }

        await updateDoc(userRef, updates);
        return currentAttempts;
    } catch (e) {
        console.error("Erro ao registrar falha de login:", e);
    }
};

export const successfulLogin = async (user: User) => {
    try {
        const userRef = doc(db, "users", user.id);
        // Reset counters on success
        await updateDoc(userRef, { 
            failedLoginAttempts: 0,
            lockedUntil: 0 
        });
    } catch (e) {
        console.error("Erro ao limpar dados de login:", e);
    }
};

export const unlockUserAccount = async (userId: string) => {
    try {
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, { 
            failedLoginAttempts: 0,
            lockedUntil: 0 
        });
    } catch (e) {
        console.error("Erro ao desbloquear usuário:", e);
        throw e;
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
  }, (error) => {
      console.error("Erro ao ler usuários:", error);
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
  }, (error) => {
      console.error("Erro ao ler comércios:", error);
  });
};

export const subscribeToBanned = (callback: (list: string[]) => void) => {
    const q = query(collection(db, "banned"));
    return onSnapshot(q, (snapshot) => {
        const list: string[] = [];
        snapshot.forEach((doc) => list.push(doc.id)); // Using ID as the banned value (cpf/email)
        callback(list);
    }, (error) => {
        console.error("Erro ao ler banidos:", error);
    });
};

// --- APP CONFIGURATION (BRANDING) ---
export const subscribeToAppConfig = (callback: (config: AppConfig | null) => void) => {
    return onSnapshot(doc(db, "settings", "global"), (doc) => {
        if (doc.exists()) {
            callback(doc.data() as AppConfig);
        } else {
            callback(null);
        }
    }, (error) => {
        console.error("Erro ao ler configuração do app:", error);
    });
};

export const updateAppConfig = async (config: AppConfig) => {
    try {
        const settingsRef = doc(db, "settings", "global");
        // Check if image is Base64 and needs upload
        let finalLogoUrl = config.logoUrl;
        
        if (config.logoUrl && config.logoUrl.startsWith('data:')) {
             finalLogoUrl = await uploadImageToFirebase(config.logoUrl, `settings/logo_${Date.now()}.png`);
        }

        const finalConfig = { ...config, logoUrl: finalLogoUrl };
        await setDoc(settingsRef, sanitizePayload(finalConfig), { merge: true });
        return finalConfig;
    } catch (error) {
        console.error("Erro ao salvar configuração:", error);
        throw error;
    }
};

// --- ACTIONS ---

export const updateUserPassword = async (userId: string, newPassword: string) => {
  try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, { password: newPassword });
  } catch (error) {
      console.error("Erro ao atualizar senha direta:", error);
      throw error;
  }
};

export const updateVendorPartial = async (vendorId: string, data: Partial<Vendor>) => {
    try {
        const vendorRef = doc(db, "vendors", vendorId);
        const cleanData = sanitizePayload(data);
        // Use setDoc with merge: true to ensure it creates/updates regardless of previous state
        await setDoc(vendorRef, cleanData, { merge: true });
    } catch (error) {
        console.error("Erro ao atualizar vendor parcial:", error);
        throw error;
    }
};

export const saveUserToFirebase = async (user: User) => {
  try {
    // Check if image is still Base64 (Should be handled by UI, but double check)
    if (user.photoUrl && user.photoUrl.startsWith('data:')) {
        const url = await uploadImageToFirebase(user.photoUrl, `users/${user.id}/profile.jpg`);
        user.photoUrl = url;
    }
    const cleanUser = sanitizePayload(user);
    // Use merge: true to avoid overwriting existing data if object is partial
    await setDoc(doc(db, "users", user.id), cleanUser, { merge: true });
  } catch (e: any) {
    console.error("Erro salvando user:", e);
    console.warn(`Erro ao salvar usuário: ${e.message || e}.`);
  }
};

export const saveVendorToFirebase = async (vendor: Vendor) => {
  try {
    if (vendor.photoUrl && vendor.photoUrl.startsWith('data:')) {
        const url = await uploadImageToFirebase(vendor.photoUrl, `vendors/${vendor.id}/cover.jpg`);
        vendor.photoUrl = url;
    }
    const cleanVendor = sanitizePayload(vendor);
    await setDoc(doc(db, "vendors", vendor.id), cleanVendor, { merge: true });
  } catch (e: any) {
    console.error("Erro salvando vendor:", e);
    alert(`Erro ao salvar comércio: ${e.message || e}`);
    throw e;
  }
};

export const deleteUserFromFirebase = async (id: string) => {
  try {
    await deleteDoc(doc(db, "users", id));
  } catch (e: any) {
     console.error("Erro deletando user:", e);
     alert(`Erro ao excluir usuário: ${e.message}`);
  }
};

export const deleteVendorFromFirebase = async (id: string) => {
  try {
    await deleteDoc(doc(db, "vendors", id));
  } catch (e: any) {
    console.error("Erro deletando vendor:", e);
    alert(`Erro ao excluir comércio: ${e.message}`);
  }
};

export const banItemInFirebase = async (value: string) => {
    try {
        await setDoc(doc(db, "banned", value), { bannedAt: Date.now() });
    } catch (e: any) {
        console.error("Erro ao banir:", e);
        alert(`Erro ao banir: ${e.message}`);
    }
};

export const unbanItemInFirebase = async (value: string) => {
    try {
        await deleteDoc(doc(db, "banned", value));
    } catch (e: any) {
        console.error("Erro ao desbanir:", e);
        alert(`Erro ao desbanir: ${e.message}`);
    }
};

// Setup Initial Data (Populate Firebase if empty)
export const seedInitialData = async () => {
    if (localStorage.getItem('app_seeded_v8') === 'true') {
        return;
    }

    try {
        const masterRef = doc(db, "users", MASTER_USER.id);
        const masterSnap = await getDoc(masterRef);

        if (!masterSnap.exists()) {
            console.log("Seeding Master User to Firebase...");
            const cleanMaster = sanitizePayload(MASTER_USER);
            await setDoc(masterRef, cleanMaster);
        }
        localStorage.setItem('app_seeded_v8', 'true');
    } catch (error) {
        console.error("Error seeding initial data:", error);
    }
};
