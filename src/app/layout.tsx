import type { Metadata } from "next";
import "./globals.css";

// Inlined at build time, so a deployment without R2 configured simply emits no
// hint rather than a link to "https://undefined".
const IMAGE_ORIGIN = process.env.NEXT_PUBLIC_IMAGE_DOMAIN
  ? `https://${process.env.NEXT_PUBLIC_IMAGE_DOMAIN}`
  : null;

export const metadata: Metadata = {
  title: "My Film Index",
  description:
    "Everything I've watched, kept in one place. Films, series, animation and documentaries — logged as I go, with the people who made them.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      {/*
        Opens the connection to the R2 image origin during HTML parse, so the
        first film frame does not pay DNS + TCP + TLS before its bytes start.

        Rendered as a plain element on purpose. Next's metadata docs point at
        ReactDOM.preconnect() for this, but neither that nor calling preconnect()
        from this Server Component put anything in the served HTML — measured on
        16.3.3, both leave <head> without the tag, which makes the hint useless
        because it would only arrive after hydration, once the images have
        already been requested. React 19 hoists a <link> written here into
        <head> during SSR, which is what the browser actually needs.

        Deliberately without crossOrigin: the frames load via plain <img> tags
        with no crossorigin attribute, and a preconnect whose CORS mode does not
        match the eventual request warms a connection the browser cannot reuse.
      */}
      {IMAGE_ORIGIN ? <link rel="preconnect" href={IMAGE_ORIGIN} /> : null}
      <body className="bg-paper text-ink font-sans antialiased">{children}</body>
    </html>
  );
}
