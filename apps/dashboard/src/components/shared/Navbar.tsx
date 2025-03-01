"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/AuthProvider";

export default function Navbar() {
  const userData = useAuth();

  return (
    <nav className="bg-white shadow-md p-4 flex justify-between items-center">
      <div className="flex gap-4">
        <Link href="/" className="text-lg font-medium hover:text-blue-500">
          Servers
        </Link>
        <Link href="/webhooks" className="text-lg font-medium hover:text-blue-500">
          Webhooks
        </Link>
      </div>
      <div>
        {userData?.user ? (
          <div className="flex items-center gap-4">
            <span className="text-gray-600">{userData?.user.email}</span>
            <Button onClick={userData?.logout} variant="outline">
              Logout
            </Button>
          </div>
        ) : (
          <Link href="/login">
            <Button>Login</Button>
          </Link>
        )}
      </div>
    </nav>
  );
}
