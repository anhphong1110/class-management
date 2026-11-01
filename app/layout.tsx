import type { Metadata } from "next";
import { Baloo_2, Nunito } from "next/font/google";
import { connection } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { brandSentence } from "@/lib/classes/brand";
import "./globals.css";

const baloo = Baloo_2({
  variable: "--font-baloo",
  subsets: ["latin", "vietnamese"],
  weight: ["600", "700", "800"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "600", "700", "800"],
});

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  let title = "Trạm không gian";
  try {
    // Dùng service role vì tiêu đề tab phải có trước khi đăng nhập (như trang đăng nhập);
    // chỉ chọn class_name của lớp chưa lưu trữ đầu tiên, không đọc gì khác.
    const { data } = await createAdminSupabase()
      .from("classes")
      .select("class_name")
      .is("archived_at", null)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (data) title = brandSentence(data);
  } catch {
    // Không đọc được lớp thì dùng tên chung.
  }
  return { title };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${baloo.variable} ${nunito.variable}`}>
      <body>{children}</body>
    </html>
  );
}
