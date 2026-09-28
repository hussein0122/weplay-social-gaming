import "./globals.css";
import type { Metadata } from "next";
import PwaRegister from "@/components/PwaRegister";
export const metadata:Metadata={title:"WePlay Social Gaming",description:"منصة ألعاب اجتماعية متعددة اللاعبين",applicationName:"WePlay"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ar" dir="rtl"><body>{children}<PwaRegister/></body></html>}