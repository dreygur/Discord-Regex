"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/AuthProvider";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();
  const userData = useAuth();

  return (
    <nav className="bg-background shadow-md p-4 flex justify-between items-center">
      <div className="flex gap-4">
        <Link
          href="/"
          className={`text-lg font-medium hover:text-primary ${pathname === "/" || pathname?.includes("/server") ? "text-primary font-semibold" : "text-primary/50"} transition-all duration-300`}
        >
          Servers
        </Link>
        <Link href="/webhooks" className={`text-lg font-medium hover:text-primary ${pathname?.includes("/webhooks") ? "text-primary font-semibold" : "text-primary/50"} transition-all duration-300`}>
          Webhooks
        </Link>
      </div>
      <div>
        {userData?.user ? (
          <div className="flex items-center gap-4">
            <span className="text-primary">{userData?.user.email}</span>
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
