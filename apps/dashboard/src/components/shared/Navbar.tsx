"use client"

import Link from "next/link"
import { RiMenuLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/providers/AuthProvider"
import { usePathname } from "next/navigation"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export default function Navbar() {
  const pathname = usePathname()
  const userData = useAuth()

  return (
    <nav className="bg-background shadow-md py-4 px-5 flex justify-between items-center">
      {/* Left side - Hamburger on mobile, menu items on large screens */}
      <div className="flex items-center">
        {/* Hamburger menu for mobile only */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" className="mr-2">
              <RiMenuLine className="h-5 w-5 text-primary" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="md:hidden">
            <DropdownMenuItem asChild>
              <Link href="/">Servers</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/webhooks">Webhooks</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/regex">RegEx</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Menu items visible on large screens */}
        <div className="hidden md:flex gap-4">
          <Link
            href="/"
            className={`text-md font-medium hover:text-primary uppercase ${pathname === "/" || pathname?.includes("/server") ? "text-primary font-semibold" : "text-primary/50"
              } transition-all duration-300`}
          >
            Servers
          </Link>
          <Link
            href="/webhooks"
            className={`text-md font-medium uppercase hover:text-primary ${pathname?.includes("/webhooks") ? "text-primary font-semibold" : "text-primary/50"
              } transition-all duration-300`}
          >
            Webhooks
          </Link>
          <Link
            href="/regex"
            className={`text-md font-medium uppercase hover:text-primary ${pathname?.includes("/regex") ? "text-primary font-semibold" : "text-primary/50"
              } transition-all duration-300`}
          >
            RegEx
          </Link>
        </div>
      </div>

      {/* Right side - User info or login button */}
      <div className="flex items-center">
        {userData?.user ? (
          <div className="flex items-center gap-4">
            <span className="text-primary hidden md:block">{userData.user.email}</span>
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
  )
}

