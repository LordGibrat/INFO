import type { Metadata } from "next";
import AdminDashboard from "./dashboard";

export const metadata: Metadata = {
  title: "Әкімші кабинеті · Muza Decors",
  robots: { index: false, follow: false }
};

export default function AdminPage() {
  return <AdminDashboard />;
}
