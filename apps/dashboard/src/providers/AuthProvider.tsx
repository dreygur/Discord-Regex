"use client";

import { ReactNode, createContext, useState, useEffect, useContext } from "react";
import { useRouter } from "next/navigation";

interface AuthContextType {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setUser: React.Dispatch<React.SetStateAction<any>>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    // Check if the user is already logged in from localStorage/session
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      // TODO
      // router.push("/login");
    }
  }, []);

  const login = async (email: string, password: string) => {
    try {
      // Example authentication logic (replace with actual API call)
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      if (response.ok) {
        setUser(data.user);
        localStorage.setItem("user", JSON.stringify(data.user));
        router.push("/");
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
    router.push("/login");
  };

  return <AuthContext.Provider value={{ user, setUser, login, logout }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};
