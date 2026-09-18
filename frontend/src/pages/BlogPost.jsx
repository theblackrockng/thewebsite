import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Calendar, User, Tag } from "lucide-react";
import { supabase } from "../lib/supabase";
import SEO from "../components/SEO";

function fmtDate(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export default function BlogPost() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();

      if (!data) { setNotFound(true); setLoading(false); return; }
      setPost(data);

      // Load related (same tags, excluding this post)
      if (data.tags?.length) {
        const { data: rel } = await supabase
          .from("blog_posts")
          .select("id,title,slug,excerpt,cover_image_url,author,published_at,tags")
          .eq("status", "published")
          .neq("id", data.id)
          .overlaps("tags", data.tags)
          .limit(3);
        setRelated(rel ?? []);
      }

      setLoading(false);
    }
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="page-enter pt-20 md:pt-28 lg:pt-36">
        <div className="min-h-[60vh] flex items-center justify-center text-[var(--muted)] text-sm tracking-widest uppercase">
          Loading…
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="page-enter pt-20 md:pt-28 lg:pt-36">
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6">
          <p className="font-serif-display text-4xl text-[var(--warm-white)] mb-4">Post not found.</p>
          <Link to="/blog" className="btn-burgundy mt-8 inline-flex">Back to Journal <ArrowRight size={13} /></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter pt-20 md:pt-28 lg:pt-36">
      <SEO
        title={post.title}
        description={post.excerpt || `Read "${post.title}" on the BLACKROCK Journal.`}
        canonical={`/blog/${post.slug}`}
        ogImage={post.cover_image_url || undefined}
        schema={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          "headline": post.title,
          "description": post.excerpt || "",
          "image": post.cover_image_url || "https://blackrockrestaurantng.com/hero-poster.jpg",
          "datePublished": post.published_at,
          "author": { "@type": "Organization", "name": "BLACKROCK Restaurant & Lounge" },
          "publisher": {
            "@type": "Organization",
            "name": "BLACKROCK Restaurant & Lounge",
            "logo": { "@type": "ImageObject", "url": "https://blackrockrestaurantng.com/logo.png" }
          },
          "mainEntityOfPage": `https://blackrockrestaurantng.com/blog/${post.slug}`
        }}
      />
      {/* Cover image */}
      {post.cover_image_url && (
        <div className="w-full aspect-[21/9] md:aspect-[3/1] overflow-hidden">
          <motion.img
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1 }}
            src={post.cover_image_url}
            alt={post.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Article header */}
      <div className="bg-[var(--charcoal)] pt-12 md:pt-16 pb-8">
        <div className="max-w-[800px] mx-auto px-6 md:px-12">
          {/* Back link */}
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-[var(--muted)] text-xs uppercase tracking-[0.22em] mb-8 hover:text-[var(--gold)] transition-colors"
          >
            <ArrowLeft size={12} /> Journal
          </Link>

          {/* Tags */}
          {post.tags?.length > 0 && (
            <div className="flex gap-2 flex-wrap mb-6">
              {post.tags.map(tag => (
                <span key={tag} className="text-[10px] uppercase tracking-[0.22em] text-[var(--gold)] border border-[var(--gold)]/30 px-3 py-1">
                  {tag}
                </span>
              ))}
            </div>
          )}

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="font-serif-display text-3xl md:text-5xl lg:text-7xl leading-[1.0] text-[var(--warm-white)] mb-6"
          >
            {post.title}
          </motion.h1>

          {post.excerpt && (
            <p className="text-[var(--muted)] text-base md:text-lg font-light leading-relaxed mb-8 max-w-[600px]">
              {post.excerpt}
            </p>
          )}

          <div className="flex items-center gap-5 text-[var(--muted)] text-xs border-t border-[var(--border-soft)] pt-6">
            {post.author && (
              <span className="flex items-center gap-1.5">
                <User size={11} className="text-[var(--gold)]" /> {post.author}
              </span>
            )}
            {post.published_at && (
              <span className="flex items-center gap-1.5">
                <Calendar size={11} className="text-[var(--gold)]" /> {fmtDate(post.published_at)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Article body */}
      <div className="bg-[var(--charcoal)] pb-24">
        <div className="max-w-[800px] mx-auto px-6 md:px-12">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="blog-body"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </div>
      </div>

      {/* Related posts */}
      {related.length > 0 && (
        <section className="bg-[var(--charcoal-soft)] py-20">
          <div className="max-w-[1440px] mx-auto px-6 md:px-12">
            <div className="mb-10">
              <span className="gold-line left">Continue Reading</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {related.map(r => (
                <Link key={r.id} to={`/blog/${r.slug}`} className="group block border border-[var(--border-soft)] overflow-hidden hover:border-[var(--gold)]/30 transition-colors duration-300">
                  {r.cover_image_url ? (
                    <div className="aspect-[16/9] overflow-hidden">
                      <img src={r.cover_image_url} alt={r.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    </div>
                  ) : (
                    <div className="aspect-[16/9] bg-[var(--charcoal)] flex items-center justify-center">
                      <div className="font-serif-display text-4xl text-[var(--gold)]/10">B</div>
                    </div>
                  )}
                  <div className="p-5 bg-[var(--charcoal)]">
                    <h4 className="font-serif-display text-lg text-[var(--warm-white)] leading-snug group-hover:text-[var(--gold)] transition-colors duration-300">
                      {r.title}
                    </h4>
                    {r.excerpt && <p className="text-[var(--muted)] text-xs mt-2 line-clamp-2 font-light">{r.excerpt}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Back to journal */}
      <section className="bg-[var(--charcoal)] py-16 text-center">
        <Link to="/blog" className="btn-burgundy inline-flex">
          <ArrowLeft size={13} /> Back to Journal
        </Link>
      </section>

      {/* Blog body styles */}
      <style>{`
        .blog-body {
          color: var(--warm-white);
          font-family: 'DM Sans', sans-serif;
          font-weight: 300;
          font-size: 1.0625rem;
          line-height: 1.85;
        }
        .blog-body h1, .blog-body h2, .blog-body h3 {
          font-family: 'Cormorant Garamond', serif;
          font-weight: 600;
          color: var(--warm-white);
          line-height: 1.15;
          margin: 2em 0 0.5em;
        }
        .blog-body h1 { font-size: 2.4rem; }
        .blog-body h2 { font-size: 1.85rem; }
        .blog-body h3 { font-size: 1.4rem; }
        .blog-body p { margin: 1em 0; }
        .blog-body ul, .blog-body ol { padding-left: 1.5em; margin: 1em 0; }
        .blog-body li { margin: 0.4em 0; }
        .blog-body blockquote {
          border-left: 3px solid var(--gold);
          padding-left: 1.25em;
          margin: 1.5em 0;
          font-style: italic;
          color: var(--muted);
          font-size: 1.1em;
        }
        .blog-body img {
          max-width: 100%;
          height: auto;
          margin: 1.5em 0;
          border-radius: 4px;
          display: block;
        }
        .blog-body a { color: var(--gold); text-decoration: underline; }
        .blog-body a:hover { opacity: 0.8; }
        .blog-body code {
          background: rgba(255,255,255,0.06);
          border-radius: 3px;
          padding: 2px 6px;
          font-size: 0.875em;
          font-family: monospace;
        }
        .blog-body pre {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 6px;
          padding: 1em 1.25em;
          overflow-x: auto;
          margin: 1.5em 0;
        }
        .blog-body pre code { background: none; padding: 0; }
        .blog-body hr { border: none; border-top: 1px solid var(--border-soft); margin: 2.5em 0; }
        .blog-body strong { font-weight: 600; color: var(--warm-white); }
      `}</style>
    </div>
  );
}
