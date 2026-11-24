"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Photo = { id: string; path: string; url: string | null };

const MAX_PHOTOS = 6;
const MAX_BYTES = 5 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

// Upload and remove profile photos. Files go straight from the browser to
// Supabase Storage, into a folder named after the user (enforced by the database).
export default function PhotoManager({ userId, photos }: { userId: string; photos: Photo[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setError(null);
    const ext = TYPES[file.type];
    if (!ext) return setError("Please choose a JPG, PNG or WebP image.");
    if (file.size > MAX_BYTES) return setError("That photo is over 5 MB. Try a smaller one.");
    if (photos.length >= MAX_PHOTOS) return setError(`You can have up to ${MAX_PHOTOS} photos.`);

    setBusy(true);
    const supabase = createClient();
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("photos").upload(path, file, { contentType: file.type });
    if (upErr) {
      setBusy(false);
      return setError(`Upload failed: ${upErr.message}`);
    }
    const { error: rowErr } = await supabase
      .from("photos")
      .insert({ profile_id: userId, path, position: photos.length });
    setBusy(false);
    if (rowErr) return setError(`Saving failed: ${rowErr.message}`);
    router.refresh();
  }

  async function remove(photo: Photo) {
    setError(null);
    setBusy(true);
    const supabase = createClient();
    await supabase.storage.from("photos").remove([photo.path]);
    const { error: rowErr } = await supabase.from("photos").delete().eq("id", photo.id);
    setBusy(false);
    if (rowErr) return setError(`Couldn't remove it: ${rowErr.message}`);
    router.refresh();
  }

  return (
    <div>
      <div className="photo-grid">
        {photos.map((p, i) => (
          <div key={p.id} className="photo-tile">
            {p.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.url} alt={`Your photo ${i + 1}`} />
            ) : (
              <span>Photo {i + 1}</span>
            )}
            {i === 0 && <span className="photo-main">BADGE PHOTO</span>}
            <button type="button" className="photo-remove" onClick={() => remove(p)} disabled={busy}>
              Remove
            </button>
          </div>
        ))}
        {photos.length < MAX_PHOTOS && (
          <label className="photo-tile photo-add">
            <span>{busy ? "Uploading…" : "+ Add photo"}</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) upload(file);
              }}
            />
          </label>
        )}
      </div>
      {error && (
        <p className="alert" role="alert" style={{ marginTop: 12 }}>
          {error}
        </p>
      )}
      <p className="hint">Your first photo goes on your badge. Up to {MAX_PHOTOS} photos, 5 MB each.</p>
    </div>
  );
}
