/**
 * Generic JSON-LD component for rendering structured data
 * Serializes schema objects and embeds them in script tags
 */

interface JsonLdProps {
  data: unknown;
}

export function JsonLd({ data }: Readonly<JsonLdProps>) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
