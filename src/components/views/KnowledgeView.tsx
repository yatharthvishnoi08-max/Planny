import React, { useState, useEffect } from "react";
import { Note, Resource, NoteType, ResourceType } from "../../types/database";
import {
  Plus,
  Edit2,
  Search,
  Video,
  FileText,
  Lightbulb,
  Bookmark,
  ExternalLink,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import { syncEngine } from "../../lib/sync";

interface KnowledgeViewProps {
  notes: Note[];
  initialItemId?: string;
  resources: Resource[];
}

export const KnowledgeView: React.FC<KnowledgeViewProps> = ({
  notes,
  initialItemId,
  resources,
}) => {
  const [filter, setFilter] = useState<
    "all" | "notes" | "study" | "ideas" | "videos" | "resources"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalType, setModalType] = useState<"note" | "video">("note");

  // Form states
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [noteType, setNoteType] = useState<NoteType>("note");
  const [durationMins, setDurationMins] = useState(25);

  useEffect(() => {
    if (!initialItemId) return;
    const note = notes.find((n) => n.id === initialItemId);
    if (note) {
      setEditingNote(note);
      setTitle(note.title);
      setContent(note.content);
      setNoteType(note.note_type);
      setModalType("note");
      setShowAddModal(true);
    } else {
      const resource = resources.find((r) => r.id === initialItemId);
      if (resource) {
        setFilter("all");
        setSearchQuery(resource.title);
      }
    }
  }, [initialItemId]);

  const q = searchQuery.toLowerCase().trim();

  const filteredNotes = notes.filter((n) => {
    if (filter === "study" && n.note_type !== "study") return false;
    if (filter === "ideas" && n.note_type !== "idea") return false;
    if (filter === "notes" && n.note_type !== "note" && n.note_type !== "fact")
      return false;
    if (filter === "videos" || filter === "resources") return false;
    if (
      q &&
      !n.title.toLowerCase().includes(q) &&
      !n.content.toLowerCase().includes(q)
    )
      return false;
    return true;
  });

  const filteredResources = resources.filter((r) => {
    if (filter === "videos" && r.resource_type !== "youtube") return false;
    if (filter === "resources" && r.resource_type === "youtube") return false;
    if (filter === "notes" || filter === "study" || filter === "ideas")
      return false;
    if (
      q &&
      !r.title.toLowerCase().includes(q) &&
      !r.url?.toLowerCase().includes(q)
    )
      return false;
    return true;
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (modalType === "note") {
      syncEngine.saveNote({
        id: editingNote?.id || crypto.randomUUID(),
        user_id: syncEngine.getUserId(),
        project_id: null,
        title: title.trim(),
        content,
        note_type: noteType,
        is_pinned: editingNote?.is_pinned || false,
        created_at: editingNote?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } else {
      let parsed: URL;
      try {
        parsed = new URL(url);
        if (!["https:", "http:"].includes(parsed.protocol)) throw new Error();
      } catch {
        setError("Enter a valid http or https link.");
        return;
      }
      const isYT = [
        "youtube.com",
        "www.youtube.com",
        "youtu.be",
        "m.youtube.com",
      ].includes(parsed.hostname);
      syncEngine.saveResource({
        id: crypto.randomUUID(),
        user_id: syncEngine.getUserId(),
        project_id: null,
        task_id: null,
        title: title.trim(),
        url: url.trim() || null,
        resource_type: isYT ? "youtube" : "link",
        duration_minutes: durationMins || null,
        notes: content,
        is_completed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    setTitle("");
    setContent("");
    setUrl("");
    setShowAddModal(false);
  };

  const extractYouTubeId = (videoUrl: string | null): string | null => {
    if (!videoUrl) return null;
    const match = videoUrl.match(
      /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/,
    );
    return match ? match[1] : null;
  };

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowAddModal(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

  return (
    <div className="content-page max-w-5xl mx-auto px-4 sm:px-8 py-6 sm:py-10 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-6 border-b border-surface-border gap-4">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-foreground">
            Notes & links
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Save the things worth coming back to. Open a note to read or edit
            it.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => {
              setEditingNote(null);
              setTitle("");
              setContent("");
              setUrl("");
              setError("");
              setModalType("video");
              setShowAddModal(true);
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-surface-200 hover:bg-surface-hover border border-surface-border text-foreground rounded-lg text-xs font-medium transition-colors"
          >
            <Video className="w-3.5 h-3.5 text-red-400" />
            <span>Add link / video</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingNote(null);
              setTitle("");
              setContent("");
              setError("");
              setModalType("note");
              setShowAddModal(true);
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Note</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center space-x-1 overflow-x-auto pb-1 sm:pb-0">
          {(
            ["all", "notes", "study", "ideas", "videos", "resources"] as const
          ).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-xs font-medium rounded-lg capitalize whitespace-nowrap transition-colors ${
                filter === f
                  ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/40"
                  : "bg-surface-100 hover:bg-surface-200 text-muted-foreground border border-surface-border"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search knowledge..."
            className="w-full pl-8 pr-3 py-1.5 bg-surface-100 border border-surface-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Grid of Knowledge Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Notes */}
        {filteredNotes.map((note) => (
          <div
            key={note.id}
            className="p-4 rounded-xl bg-surface-100 border border-surface-border hover:border-zinc-700 transition-colors flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-medium text-foreground">
                    {note.title}
                  </h3>
                </div>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-surface-200 text-muted-foreground border border-surface-border">
                  {note.note_type}
                </span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                {note.content}
              </p>
            </div>

            <div className="pt-3 border-t border-surface-border flex items-center justify-between mt-3 text-[10px] text-muted-foreground font-mono">
              <button
                className="flex items-center gap-1.5 text-indigo-400"
                onClick={() => {
                  setEditingNote(note);
                  setTitle(note.title);
                  setContent(note.content);
                  setNoteType(note.note_type);
                  setModalType("note");
                  setShowAddModal(true);
                  setError("");
                }}
              >
                <Edit2 size={13} /> Open & edit
              </button>
              <button
                onClick={() => syncEngine.deleteNote(note.id)}
                className="hover:text-red-400 p-1"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}

        {/* Resources & Video Tasks */}
        {filteredResources.map((res) => {
          const ytId = extractYouTubeId(res.url);

          return (
            <div
              key={res.id}
              className="p-4 rounded-xl bg-surface-100 border border-surface-border hover:border-zinc-700 transition-colors flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {res.resource_type === "youtube" ? (
                      <Video className="w-4 h-4 text-red-400" />
                    ) : (
                      <Bookmark className="w-4 h-4 text-sky-400" />
                    )}
                    <h3 className="text-sm font-medium text-foreground">
                      {res.title}
                    </h3>
                  </div>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-surface-200 text-muted-foreground border border-surface-border">
                    {res.resource_type}
                  </span>
                </div>

                {/* Embedded YouTube preview if available */}
                {ytId && (
                  <div className="my-2.5 rounded-lg overflow-hidden border border-surface-border aspect-video bg-black">
                    <iframe
                      src={`https://www.youtube.com/embed/${ytId}`}
                      title={res.title}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}

                {res.notes && (
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                    {res.notes}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-surface-border flex items-center justify-between mt-2 text-xs">
                {res.url ? (
                  <a
                    href={res.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-400 hover:underline flex items-center space-x-1 text-[11px]"
                  >
                    <span>Open link</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span />
                )}

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      syncEngine.saveResource({
                        ...res,
                        is_completed: !res.is_completed,
                      });
                    }}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                      res.is_completed
                        ? "bg-emerald-600/20 text-emerald-400 border-emerald-500/30"
                        : "bg-surface-200 text-muted-foreground border-surface-border"
                    }`}
                  >
                    {res.is_completed ? "Watched" : "To Watch"}
                  </button>
                  <button
                    onClick={() => syncEngine.deleteResource(res.id)}
                    className="text-muted-foreground hover:text-red-400 p-1"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-surface-100 border border-surface-border p-6 shadow-2xl">
            <h3 className="text-base font-medium text-foreground mb-3">
              {modalType === "video"
                ? "Add Video Task / Resource"
                : editingNote
                  ? "Edit note"
                  : "New note"}
            </h3>

            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={
                    modalType === "video"
                      ? "e.g. Watch Physics de Broglie Lecture"
                      : "Title"
                  }
                  className="w-full bg-surface-200 border border-surface-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-indigo-500"
                />
              </div>

              {modalType === "video" && (
                <>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">
                      YouTube URL / Link
                    </label>
                    <input
                      type="url"
                      required
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="w-full bg-surface-200 border border-surface-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">
                      Estimated Duration (minutes)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={durationMins}
                      onChange={(e) =>
                        setDurationMins(parseInt(e.target.value, 10) || 25)
                      }
                      className="w-full bg-surface-200 border border-surface-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </>
              )}

              {modalType === "note" && (
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">
                    Category
                  </label>
                  <select
                    value={noteType}
                    onChange={(e) => setNoteType(e.target.value as NoteType)}
                    className="w-full bg-surface-200 border border-surface-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-indigo-500"
                  >
                    <option value="note">General Note</option>
                    <option value="study">Study Formula / Concept</option>
                    <option value="idea">Idea</option>
                    <option value="fact">Fact</option>
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs text-muted-foreground block mb-1">
                  Notes / Content
                </label>
                <textarea
                  rows={3}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Key takeaways, formulas, code snippets..."
                  className="w-full bg-surface-200 border border-surface-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
