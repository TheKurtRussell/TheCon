"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type ChatMessage = {
  id: number;
  sender_id: string;
  recipient_id: string;
  body: string;
  kind: "text" | "system";
  created_at: string;
  read_at: string | null;
};

const POLL_MS = 8000;

function timeLabel(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

// A live conversation with one match. New messages arrive through Supabase
// Realtime, with a quiet check every few seconds as a backup.
export default function ChatThread({
  me,
  other,
  otherName,
  initial,
}: {
  me: string;
  other: string;
  otherName: string;
  initial: ChatMessage[];
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initial);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef<number>(initial.length ? initial[initial.length - 1].id : 0);

  // Add messages we haven't seen yet, keeping them in order.
  function merge(incoming: ChatMessage[]) {
    if (incoming.length === 0) return;
    setMessages((current) => {
      const seen = new Set(current.map((m) => m.id));
      const fresh = incoming.filter((m) => !seen.has(m.id));
      if (fresh.length === 0) return current;
      const all = [...current, ...fresh].sort((a, b) => a.id - b.id);
      lastIdRef.current = all[all.length - 1].id;
      return all;
    });
  }

  const isOurs = (m: ChatMessage) =>
    (m.sender_id === me && m.recipient_id === other) || (m.sender_id === other && m.recipient_id === me);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function markRead() {
      await supabase.rpc("mark_read", { other });
    }

    async function poll() {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .or(`and(sender_id.eq.${me},recipient_id.eq.${other}),and(sender_id.eq.${other},recipient_id.eq.${me})`)
        .gt("id", lastIdRef.current)
        .order("id")
        .limit(100);
      if (!cancelled && data && data.length > 0) {
        merge(data as ChatMessage[]);
        if ((data as ChatMessage[]).some((m) => m.sender_id === other)) markRead();
      }
    }

    markRead();

    const onInsert = (payload: { new: unknown }) => {
      const m = payload.new as ChatMessage;
      if (!isOurs(m)) return;
      merge([m]);
      if (m.sender_id === other) markRead();
    };

    const channel = supabase
      .channel(`chat-${me}-${other}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `recipient_id=eq.${me}` }, onInsert)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `sender_id=eq.${me}` }, onInsert)
      .subscribe();

    const timer = setInterval(poll, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, other]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function send() {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    const supabase = createClient();
    const { data, error: sendError } = await supabase.rpc("send_message", { to_id: other, body });
    setSending(false);
    if (sendError) {
      setError(sendError.message);
      return;
    }
    setDraft("");
    if (data) merge([data as ChatMessage]);
  }

  return (
    <div className="chat">
      <ol className="chat-log" aria-live="polite" aria-label={`Conversation with ${otherName}`}>
        {messages.length === 0 && (
          <li className="chat-empty">
            You matched! Say hi, or start a trivia duel and talk about the results.
          </li>
        )}
        {messages.map((m) =>
          m.kind === "system" ? (
            <li key={m.id} className="chat-system">
              {m.body}
            </li>
          ) : (
            <li key={m.id} className={`chat-msg ${m.sender_id === me ? "chat-mine" : "chat-theirs"}`}>
              <span className="sr-only">{m.sender_id === me ? "You" : otherName}: </span>
              <span className="chat-bubble">{m.body}</span>
              <span className="chat-time">
                {timeLabel(m.created_at)}
                {m.sender_id === me && m.read_at ? " · Seen" : ""}
              </span>
            </li>
          )
        )}
      </ol>
      <div ref={bottomRef} />

      {error && (
        <p className="alert" role="alert" style={{ margin: "0 0 10px" }}>
          {error}
        </p>
      )}

      <form
        className="chat-compose"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <label htmlFor="chat-input" className="sr-only">
          Message {otherName}
        </label>
        <textarea
          id="chat-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={2}
          maxLength={2000}
          placeholder={`Message ${otherName}…`}
        />
        <button type="submit" className="btn btn-hero" disabled={sending || !draft.trim()}>
          {sending ? "Sending…" : "Send"}
        </button>
      </form>
    </div>
  );
}
