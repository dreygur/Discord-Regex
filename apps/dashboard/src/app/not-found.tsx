"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="h-screen flex flex-col items-center justify-center text-center">
      <h1 className="text-5xl font-bold text-destructive mb-4">404</h1>
      <p className="text-lg text-secondary mb-6">Oops! The page you are looking for does not exist.</p>
      <Button onClick={() => router.push("/")} variant="default">
        Go Home
      </Button>
    </div>
  );
}
