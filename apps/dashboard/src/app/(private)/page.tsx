import { database } from "@/lib/database";
import ServerPage from "@/pages/Server";

export default async function page() {
  const data = await database.getAllServers();
  return <ServerPage data={data} />;
}
