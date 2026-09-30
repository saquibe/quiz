import { cookies } from "next/headers";
import AdminDashboard from "./admin-dashboard";
import { ADMIN_COOKIE, isAdminTokenValid } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const initiallyAuthenticated = isAdminTokenValid(cookieStore.get(ADMIN_COOKIE)?.value);
  return <AdminDashboard initiallyAuthenticated={initiallyAuthenticated} />;
}
