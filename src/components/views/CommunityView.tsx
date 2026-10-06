import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowUp,
  Check,
  Heart,
  Loader2,
  MessageCircleQuestion,
  Sparkles,
  Target,
  Trash2,
  Trophy,
  Users,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { isRealSupabaseConfigured, supabase } from "../../lib/supabase";
import type {
  CommunityCategory,
  CommunityPost,
  CommunityReaction,
} from "../../types/database";

const topics: Array<{
  id: "all" | CommunityCategory;
  label: string;
  prompt: string;
  icon: typeof Sparkles;
}> = [
  { id: "all", label: "All", prompt: "Share something with the community", icon: Users },
  { id: "progress", label: "Progress", prompt: "What did you move forward today?", icon: ArrowUp },
  { id: "win", label: "Small wins", prompt: "What are you proud of today?", icon: Trophy },
  { id: "question", label: "Ask", prompt: "What could the community help you solve?", icon: MessageCircleQuestion },
  { id: "accountability", label: "Accountability", prompt: "What will you finish next?", icon: Target },
];

const timeAgo = (value: string) => {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return days < 7
    ? `${days}d`
    : new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(value));
};

export function CommunityView() {
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [reactions, setReactions] = useState<CommunityReaction[]>([]);
  const [topic, setTopic] = useState<"all" | CommunityCategory>("all");
  const [draftType, setDraftType] = useState<CommunityCategory>("progress");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFeed = useCallback(async () => {
    if (!isRealSupabaseConfigured()) {
      setLoading(false);
      return;
    }
    const [postResult, reactionResult] = await Promise.all([
      supabase.from("community_posts").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("community_reactions").select("*").eq("reaction", "support"),
    ]);
    if (postResult.error || reactionResult.error) {
      setError("Community could not refresh. Try again in a moment.");
    } else {
      setPosts((postResult.data || []) as CommunityPost[]);
      setReactions((reactionResult.data || []) as CommunityReaction[]);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadFeed();
    if (!isRealSupabaseConfigured()) return;
    const channel = supabase
      .channel("planny-community")
      .on("postgres_changes", { event: "*", schema: "public", table: "community_posts" }, () => void loadFeed())
      .on("postgres_changes", { event: "*", schema: "public", table: "community_reactions" }, () => void loadFeed())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [loadFeed]);

  const filteredPosts = useMemo(
    () => topic === "all" ? posts : posts.filter((post) => post.category === topic),
    [posts, topic],
  );
  const supportCount = (postId: string) => reactions.filter((item) => item.post_id === postId).length;
  const supportedByMe = (postId: string) => reactions.some((item) => item.post_id === postId && item.user_id === user?.id);

  const publish = async (event: React.FormEvent) => {
    event.preventDefault();
    const content = draft.trim();
    if (!user || !content || posting) return;
    setPosting(true);
    setError(null);
    const authorName = profile?.full_name?.trim() || user.email?.split("@")[0] || "Planny member";
    const { error: publishError } = await supabase.from("community_posts").insert({
      user_id: user.id,
      author_name: authorName.slice(0, 60),
      author_avatar_url: profile?.avatar_url || null,
      category: draftType,
      content: content.slice(0, 600),
    });
    if (publishError) setError("Your post was not published. Check your connection and try again.");
    else {
      setDraft("");
      setTopic("all");
      await loadFeed();
    }
    setPosting(false);
  };

  const toggleSupport = async (postId: string) => {
    if (!user) return;
    const active = supportedByMe(postId);
    setReactions((current) => active
      ? current.filter((item) => !(item.post_id === postId && item.user_id === user.id))
      : [...current, { post_id: postId, user_id: user.id, reaction: "support", created_at: new Date().toISOString() }]);
    const result = active
      ? await supabase.from("community_reactions").delete().eq("post_id", postId).eq("user_id", user.id).eq("reaction", "support")
      : await supabase.from("community_reactions").insert({ post_id: postId, user_id: user.id, reaction: "support" });
    if (result.error) {
      setError("That reaction did not save. Try once more.");
      await loadFeed();
    }
  };

  const deletePost = async (postId: string) => {
    setPosts((current) => current.filter((post) => post.id !== postId));
    const { error: deleteError } = await supabase.from("community_posts").delete().eq("id", postId);
    if (deleteError) {
      setError("That post could not be deleted.");
      await loadFeed();
    }
  };

  const activeTopic = topics.find((item) => item.id === draftType)!;

  return (
    <div className="community-page">
      <header className="community-hero">
        <div>
          <span className="page-eyebrow">BUILD IN GOOD COMPANY</span>
          <h1>Community<span className="accent-period">.</span></h1>
          <p>Share the work behind the win, ask for a fresh perspective, and keep each other moving.</p>
        </div>
        <div className="community-signal" aria-label={`${posts.length} recent community posts`}>
          <span><i /> Live circle</span>
          <strong>{posts.length}</strong>
          <small>recent updates</small>
        </div>
      </header>

      <div className="community-layout">
        <main>
          <form className="community-composer" onSubmit={publish}>
            <div className="community-composer-top">
              <span className="community-avatar">{profile?.full_name?.charAt(0).toUpperCase() || "P"}</span>
              <div>
                <strong>Put it out there.</strong>
                <small>Progress counts before it looks impressive.</small>
              </div>
            </div>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value.slice(0, 600))}
              rows={3}
              placeholder={activeTopic.prompt}
              aria-label="Community post"
            />
            <div className="community-composer-bottom">
              <label>
                <span>Post as</span>
                <select value={draftType} onChange={(event) => setDraftType(event.target.value as CommunityCategory)}>
                  {topics.filter((item) => item.id !== "all").map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                </select>
              </label>
              <span className={draft.length > 540 ? "near-limit" : ""}>{draft.length}/600</span>
              <button type="submit" disabled={!draft.trim() || posting}>
                {posting ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                Share
              </button>
            </div>
          </form>

          {error && <div className="community-error" role="alert">{error}<button onClick={() => void loadFeed()}>Retry</button></div>}

          <div className="community-topic-tabs" role="tablist" aria-label="Community topics">
            {topics.map((item) => (
              <button key={item.id} role="tab" aria-selected={topic === item.id} onClick={() => setTopic(item.id)}>
                <item.icon size={14} />{item.label}
              </button>
            ))}
          </div>

          <section className="community-feed" aria-live="polite">
            {loading ? (
              <div className="community-empty"><Loader2 className="animate-spin" /><strong>Opening the circle…</strong></div>
            ) : filteredPosts.length === 0 ? (
              <div className="community-empty">
                <span><Sparkles /></span>
                <strong>{topic === "all" ? "Be the first to share." : `No ${topics.find((item) => item.id === topic)?.label.toLowerCase()} posts yet.`}</strong>
                <p>A useful update can be one sentence. Start small.</p>
              </div>
            ) : filteredPosts.map((post) => {
              const meta = topics.find((item) => item.id === post.category)!;
              const mine = post.user_id === user?.id;
              const supported = supportedByMe(post.id);
              return (
                <article className="community-post" key={post.id}>
                  <div className="community-post-head">
                    <span className="community-avatar">{post.author_name.charAt(0).toUpperCase()}</span>
                    <div><strong>{post.author_name}</strong><small>{timeAgo(post.created_at)} · {meta.label}</small></div>
                    <span className={`community-category ${post.category}`}><meta.icon size={13} />{meta.label}</span>
                    {mine && <button className="community-delete" onClick={() => void deletePost(post.id)} aria-label="Delete post"><Trash2 size={15} /></button>}
                  </div>
                  <p>{post.content}</p>
                  <div className="community-post-actions">
                    <button className={supported ? "supported" : ""} onClick={() => void toggleSupport(post.id)} aria-pressed={supported}>
                      {supported ? <Check size={15} /> : <Heart size={15} />}
                      {supported ? "Supported" : "Support"}
                      {supportCount(post.id) > 0 && <b>{supportCount(post.id)}</b>}
                    </button>
                  </div>
                </article>
              );
            })}
          </section>
        </main>

        <aside className="community-side">
          <section>
            <span className="community-side-icon"><Users size={18} /></span>
            <h2>Good community rules.</h2>
            <ul>
              <li><Check size={14} /> Share the process, not just the outcome.</li>
              <li><Check size={14} /> Be specific when asking for help.</li>
              <li><Check size={14} /> Support without comparing.</li>
            </ul>
          </section>
          <section className="community-prompt-card">
            <span>NEED A PROMPT?</span>
            <strong>What is one thing you finished that your past self kept avoiding?</strong>
            <button onClick={() => { setDraftType("win"); setDraft("Today I finally "); document.querySelector<HTMLTextAreaElement>(".community-composer textarea")?.focus(); }}>
              Answer this <ArrowUp size={14} />
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}
