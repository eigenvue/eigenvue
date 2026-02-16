/**
 * @fileoverview JSON-LD Script Tag Component
 *
 * Renders one or more JSON-LD structured data objects as <script> tags
 * in the page head. Accepts a single object or an array of objects.
 *
 * IMPORTANT — SECURITY:
 * JSON-LD is embedded as a <script type="application/ld+json"> tag.
 * The data MUST be serialized with JSON.stringify() to prevent XSS.
 * Never use dangerouslySetInnerHTML with raw user input. The data
 * objects in this component are always built server-side from trusted
 * meta.json files — never from user input.
 *
 * RENDERING:
 * This is a Server Component. It renders at build time during SSG,
 * ensuring the structured data is present in the initial HTML response.
 */

import type { JsonLdObject } from "@/lib/json-ld";

interface JsonLdProps {
  /**
   * One or more JSON-LD objects to render. If an array is passed,
   * each object gets its own <script> tag (Google recommends this
   * over putting multiple types in a single tag with @graph).
   */
  readonly data: JsonLdObject | JsonLdObject[];
}

export function JsonLd({ data }: JsonLdProps) {
  const items = Array.isArray(data) ? data : [data];

  return (
    <>
      {items.map((item, index) => (
        <script
          key={`json-ld-${index}`}
          type="application/ld+json"
          /**
           * JSON.stringify is safe here because:
           * 1. The data is constructed server-side from meta.json (trusted input).
           * 2. JSON.stringify escapes any characters that could break the script tag.
           * 3. This component never processes user-supplied data.
           */
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(item, null, 0),
          }}
        />
      ))}
    </>
  );
}
