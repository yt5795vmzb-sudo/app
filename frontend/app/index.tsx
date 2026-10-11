import { Redirect } from "expo-router";
import { useAuth } from "@/src/auth";
import { Loading } from "@/src/components/ui";

export default function Index() {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  return <Redirect href={(user ? (user.role === "admin" ? "/admin" : "/(tabs)") : "/welcome") as any} />;
}
