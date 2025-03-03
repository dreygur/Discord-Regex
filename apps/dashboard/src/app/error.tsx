"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function Error({ error }: { error: Error }) {
  const router = useRouter();

  useEffect(() => {
    console.error("Error occurred:", error);
  }, [error]);

  return (
    <div className="h-screen flex flex-col items-center justify-center text-center">
      <h1 className="text-4xl font-bold text-red-600 mb-4">Something went wrong!</h1>
      <p className="text-gray-700 mb-6">We encountered an unexpected error. Please try again later.</p>
      <div className="flex gap-4">
        <Button onClick={() => router.push("/")} variant="default">
          Go Home
        </Button>
      </div>
    </div>
  );
}
