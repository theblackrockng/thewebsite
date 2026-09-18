import { Helmet } from "react-helmet-async";

const BASE_URL = "https://blackrockrestaurantng.com";
const DEFAULT_OG_IMAGE = `${BASE_URL}/hero-poster.jpg`;

export default function SEO({ title, description, canonical, ogImage, schema }) {
  const fullTitle = title
    ? `${title} | BLACKROCK Restaurant & Lounge`
    : "BLACKROCK Restaurant & Lounge – Fine Dining & Rooftop Lounge in Ikeja, Lagos";
  const metaDesc =
    description ||
    "Premium restaurant and rooftop lounge in Ikeja, Lagos. Exceptional Nigerian and continental cuisine, private dining, and events. Open daily 10 AM – 11:59 PM.";
  const canonicalUrl = canonical ? `${BASE_URL}${canonical}` : null;
  const ogImg = ogImage || DEFAULT_OG_IMAGE;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={metaDesc} />
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

      <meta property="og:type"         content="website" />
      <meta property="og:site_name"    content="BLACKROCK Restaurant & Lounge" />
      <meta property="og:title"        content={fullTitle} />
      <meta property="og:description"  content={metaDesc} />
      <meta property="og:image"        content={ogImg} />
      <meta property="og:image:width"  content="1200" />
      <meta property="og:image:height" content="630" />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}

      <meta name="twitter:card"        content="summary_large_image" />
      <meta name="twitter:title"       content={fullTitle} />
      <meta name="twitter:description" content={metaDesc} />
      <meta name="twitter:image"       content={ogImg} />

      {schema && (
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      )}
    </Helmet>
  );
}
