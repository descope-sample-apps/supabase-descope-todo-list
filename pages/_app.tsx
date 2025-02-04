import "@/styles/app.css";
import { AuthProvider } from "@descope/react-sdk";
import type { AppProps } from "next/app";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider projectId={String(process.env.NEXT_PUBLIC_DESCOPE_PROJECT_ID)}>
      <Component {...pageProps} />
    </AuthProvider>
  );
}
