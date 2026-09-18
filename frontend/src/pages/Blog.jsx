import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Calendar, User, Tag } from "lucide-react";
import { supabase } from "../lib/supabase";
import SectionHeader from "../components/SectionHeader";
import SEO from "../components/SEO";

function fmtDate(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function PostCard({ post, index, featured = false }) {
  if (featured) {
    return (
      <motion.article
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-0 border border-[var(--border-soft)] overflow-hidden"
      >
        {post.cover_image_url ? (
          <div className="img-hover aspect-[4/3] lg:aspect-auto">
            <img src={post.cover_image_url} alt={post.title} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="aspect-[4/3] lg:aspect-auto bg-[var(--charcoal-soft)] flex items-center justify-center">
            <div className="font-serif-display text-8xl text-[var(--gold)]/10">B</div>
          </div>
        )}
        <div className="bg-[var(--charcoal-soft)] p-8 md:p-12 flex flex-col justify-between">
          <div>
            {post.tags?.length > 0 && (
              <div className="flex gap-2 flex-wrap mb-6">
                {post.tags.slice(0, 3).map(tag => (
                  <span key={tag} className="text-[10px] uppercase tracking-[0.22em] text-[var(--gold)] border border-[var(--gold)]/30 px-3 py-1">
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <h2 className="font-serif-display text-3xl md:text-4xl lg:text-5xl leading-[1.05] text-[var(--warm-white)] mb-5">
              {post.title}
            </h2>
            {post.excerpt && (
              <p className="text-[var(--muted)] font-light leading-relaxed text-base md:text-lg mb-8">
                {post.excerpt}
              </p>
            )}
          </div>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4 text-[var(--muted)] text-xs">
              {post.author && (
                <span className="flex items-center gap-1.5">
                  <User size={11} /> {post.author}
                </span>
              )}
              {post.published_at && (
                <span className="flex items-center gap-1.5">
                  <Calendar size={11} /> {fmtDate(post.published_at)}
                </span>
              )}
            </div>
            <Link to={`/blog/${post.slug}`} className="btn-burgundy text-sm inline-flex" style={{ padding: "10px 20px" }}>
              Read More <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </motion.article>
    );
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: index * 0.06 }}
      className="border border-[var(--border-soft)] overflow-hidden group"
    >
      <Link to={`/blog/${post.slug}`} className="block">
        {post.cover_image_url ? (
          <div className="img-hover aspect-[16/9] overflow-hidden">
            <img src={post.cover_image_url} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
          </div>
        ) : (
          <div className="aspect-[16/9] bg-[var(--charcoal-soft)] flex items-center justify-center">
            <div className="font-serif-display text-6xl text-[var(--gold)]/10">B</div>
          </div>
        )}
        <div className="p-6 bg-[var(--charcoal-soft)]">
          {post.tags?.length > 0 && (
            <div className="flex gap-2 flex-wrap mb-3">
              {post.tags.slice(0, 2).map(tag => (
                <span key={tag} className="text-[10px] uppercase tracking-[0.2em] text-[var(--gold)]">{tag}</span>
              ))}
            </div>
          )}
          <h3 className="font-serif-display text-xl md:text-2xl leading-snug text-[var(--warm-white)] mb-3 group-hover:text-[var(--gold)] transition-colors duration-300">
            {post.title}
          </h3>
          {post.excerpt && (
            <p className="text-[var(--muted)] font-light text-sm leading-relaxed line-clamp-2 mb-5">
              {post.excerpt}
            </p>
          )}
          <div className="flex items-center gap-3 text-[var(--muted)] text-xs">
            {post.author && <span className="flex items-center gap-1"><User size={10} /> {post.author}</span>}
            {post.published_at && <span className="flex items-center gap-1"><Calendar size={10} /> {fmtDate(post.published_at)}</span>}
          </div>
        </div>
      </Link>
    </motion.article>
  );
}

export default function Blog() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("blog_posts")
      .select("id,title,slug,excerpt,cover_image_url,tags,author,published_at")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .then(({ data }) => {
        setPosts(data ?? []);
        setLoading(false);
      });
  }, []);

  const [featured, ...rest] = posts;

  return (
    <div className="page-enter pt-20 md:pt-28 lg:pt-36">
      <SEO
        title="Journal"
        description="Recipes, behind-the-scenes moments, and stories from BLACKROCK Restaurant &amp; Lounge in Ikeja, Lagos."
        canonical="/blog"
      />
      {/* Header */}
      <section className="bg-[var(--charcoal)] pt-16 pb-12 md:pt-24 md:pb-20">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 text-center">
          <span className="gold-line">The BLACKROCK Journal</span>
          <h1 className="font-serif-display text-3xl md:text-5xl lg:text-8xl leading-[0.95] mt-6 md:mt-8 text-[var(--warm-white)]">
            Stories from <span className="font-serif-italic text-[var(--gold)]">the table.</span>
          </h1>
          <p className="text-[var(--muted)] mt-8 max-w-xl mx-auto font-light text-base md:text-lg leading-relaxed">
            Recipes, behind-the-scenes moments, and everything happening at BLACKROCK.
          </p>
        </div>
      </section>

      {/* Posts */}
      <section className="bg-[var(--charcoal)] pb-32">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12">
          {loading ? (
            <div className="py-32 text-center text-[var(--muted)] text-sm tracking-widest uppercase">Loading…</div>
          ) : posts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="flex flex-col items-center justify-center py-32 text-center border border-[var(--border-soft)]"
            >
              <div className="font-serif-display text-6xl md:text-8xl text-[var(--gold)]/20 mb-8">01</div>
              <p className="font-serif-display text-2xl md:text-3xl text-[var(--warm-white)]">
                First stories coming soon.
              </p>
              <p className="text-[var(--muted)] mt-4 font-light max-w-md">
                We're putting pen to paper. Check back shortly for recipes, chef notes, and what's happening at BLACKROCK.
              </p>
              <Link to="/reservations" className="btn-burgundy mt-12 inline-flex">
                Reserve a Table <ArrowRight size={14} />
              </Link>
            </motion.div>
          ) : (
            <>
              {/* Featured post */}
              {featured && (
                <div className="mb-12 md:mb-16">
                  <PostCard post={featured} featured />
                </div>
              )}

              {/* Rest of posts */}
              {rest.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {rest.map((post, i) => (
                    <PostCard key={post.id} post={post} index={i} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* CTA */}
      {posts.length > 0 && (
        <section className="bg-[var(--charcoal-soft)] py-24">
          <div className="max-w-3xl mx-auto px-6 md:px-12 text-center">
            <SectionHeader
              kicker="Come in"
              title="The table is set."
              subtitle="Read all you like, but the real story happens over dinner."
            />
            <Link to="/reservations" className="btn-burgundy mt-12 inline-flex">
              Reserve a Table <ArrowRight size={14} />
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
