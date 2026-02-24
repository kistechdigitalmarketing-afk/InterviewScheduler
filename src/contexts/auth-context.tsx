"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

interface UserData {
  uid: string;
  email: string | null;
  name: string | null;
  role: "INTERVIEWER" | "APPLICANT";
  image: string | null;
  timezone: string;
  meetingLink: string | null;
  organizationName: string | null;
  createdAt: Date | null;
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  organizationId: string;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string, role: "INTERVIEWER" | "APPLICANT") => Promise<void>;
  signOut: () => Promise<void>;
  updateUserData: (data: Partial<UserData>) => Promise<void>;
  initOrganization: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Fixed organization ID - single organization using this system
const ORGANIZATION_ID = "main_organization";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        // Fetch user data from Firestore
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data() as UserData);
        }
      } else {
        setUserData(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (
    email: string,
    password: string,
    name: string,
    role: "INTERVIEWER" | "APPLICANT"
  ) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update display name
    await updateProfile(user, { displayName: name });

    // Create user document in Firestore
    const userDocData: UserData = {
      uid: user.uid,
      email: user.email,
      name: name,
      role: role,
      image: null,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      meetingLink: null,
      organizationName: null,
      createdAt: new Date(),
    };

    await setDoc(doc(db, "users", user.uid), {
      ...userDocData,
      createdAt: serverTimestamp(),
    });

    // If interviewer, create default availability
    if (role === "INTERVIEWER") {
      const defaultDays = [1, 2, 3, 4, 5]; // Monday to Friday
      for (const day of defaultDays) {
        await setDoc(doc(db, "users", user.uid, "availability", day.toString()), {
          dayOfWeek: day,
          startTime: "09:00",
          endTime: "17:00",
          isActive: true,
        });
      }

      // Create default event type
      await setDoc(doc(db, "users", user.uid, "eventTypes", "interview"), {
        title: "Interview",
        slug: "interview",
        description: "Standard interview session",
        duration: 30,
        color: "#6366f1",
        isActive: true,
        createdAt: serverTimestamp(),
      });
    }

    setUserData(userDocData);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUserData(null);
  };

  const updateUserData = async (data: Partial<UserData>) => {
    await updateDoc(doc(db, "users", ORGANIZATION_ID), data);
    setUserData((prev) => prev ? { ...prev, ...data } : null);
  };

  const initOrganization = async () => {
    // Check if organization document already exists
    const userDoc = await getDoc(doc(db, "users", ORGANIZATION_ID));
    if (userDoc.exists()) {
      setUserData(userDoc.data() as UserData);
    } else {
      // Create organization document
      const userDocData: UserData = {
        uid: ORGANIZATION_ID,
        email: null,
        name: null,
        role: "INTERVIEWER",
        image: null,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        meetingLink: null,
        organizationName: null,
        createdAt: new Date(),
      };

      await setDoc(doc(db, "users", ORGANIZATION_ID), {
        ...userDocData,
        createdAt: serverTimestamp(),
      });

      // Create default event type
      await setDoc(doc(db, "users", ORGANIZATION_ID, "eventTypes", "interview"), {
        title: "Interview",
        slug: "interview",
        description: "Standard interview session",
        duration: 30,
        color: "#6366f1",
        isActive: true,
        createdAt: serverTimestamp(),
      });

      setUserData(userDocData);
    }
    
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, userData, loading, organizationId: ORGANIZATION_ID, signIn, signUp, signOut, updateUserData, initOrganization }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
