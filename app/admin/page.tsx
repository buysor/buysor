import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { isAdminEmail } from "@/lib/admin";
import { SiteShell } from "@/components/site-shell";
import { AdminDashboardClient } from "@/components/admin-dashboard-client";

export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Operations dashboard"};

export default async function AdminPage(){
  const user=await requireChatGPTUser("/admin");
  if(!isAdminEmail(user.email)) notFound();
  return <SiteShell compact><AdminDashboardClient/></SiteShell>;
}

