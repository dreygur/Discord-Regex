import ServerPage from "@/pages/Server";

export default async function page() {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/server`, {
    cache: "no-store"
  });
  const data = await response.json();
  return <ServerPage data={data} />;
}
