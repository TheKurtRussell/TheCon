import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

// Layout for text pages like the Code of Conduct and Privacy Policy.
export default function InfoPage({
  title,
  updated,
  draft,
  children,
}: {
  title: string;
  updated?: string;
  draft?: boolean;
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      <main className="dots" style={{ padding: "48px 0 80px" }}>
        <article className="wrap info-page">
          <h1 className="h2">{title}</h1>
          {updated && <p className="hint">Last updated {updated}</p>}
          {draft && (
            <p className="alert" role="note">
              Draft: this page is a starting point and hasn&rsquo;t been reviewed by a lawyer yet.
            </p>
          )}
          <div className="card info-body">{children}</div>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
