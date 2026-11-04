import type { Metadata } from "next";
import { SwaggerViewer } from "./SwaggerViewer";

export const metadata: Metadata = {
  title: "OnYou API",
  description: "OpenAPI documentation for the OnYou API.",
};

export default function DocsPage() {
  return (
    <main className="min-h-full bg-background text-foreground">
      <h1 className="px-6 pt-6 text-2xl font-extrabold text-primary">
        OnYou API
      </h1>
      <SwaggerViewer />
    </main>
  );
}
