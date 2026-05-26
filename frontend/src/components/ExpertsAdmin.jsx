import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "./ui/card";
import {
  fetchExperts,
  updateExpert,
  uploadExpertImage,
  clearExpertImage,
  adaptExpert,
} from "../lib/api";

/**
 * Admin section: list of experts with inline edit (name, period, role, fit,
 * position) plus a file upload to replace the photo.
 */
export default function ExpertsAdmin() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const data = await fetchExperts();
      setItems(data);
    } catch (e) {
      toast.error("Experten laden fehlgeschlagen: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <Card className="border-blue-400/20 bg-[#0c1430]">
      <CardHeader>
        <CardTitle className="text-blue-100">Experten</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="rounded-md border border-blue-400/30 bg-black/30 px-6 py-10 text-center text-blue-300">
            Lade Experten …
          </div>
        ) : (
          <div className="space-y-4" data-testid="experts-admin-list">
            {items.map((expert) => (
              <ExpertRow key={expert.id} expert={expert} onChanged={refresh} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ExpertRow({ expert, onChanged }) {
  const fileRef = useRef(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: expert.name,
    period_from: expert.period_from,
    period_to: expert.period_to,
    role: expert.role,
    image_fit: expert.image_fit || "cover",
    image_position: expert.image_position || "",
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Keep form in sync when parent refreshes the list (e.g. after upload)
  useEffect(() => {
    if (!editing) {
      setForm({
        name: expert.name,
        period_from: expert.period_from,
        period_to: expert.period_to,
        role: expert.role,
        image_fit: expert.image_fit || "cover",
        image_position: expert.image_position || "",
      });
    }
  }, [expert, editing]);

  const adapted = adaptExpert(expert);

  const save = async () => {
    setSaving(true);
    try {
      await updateExpert(expert.id, {
        name: form.name.trim(),
        period_from: form.period_from.trim(),
        period_to: form.period_to.trim(),
        role: form.role.trim(),
        image_fit: form.image_fit,
        image_position: form.image_position.trim() || null,
      });
      toast.success("Gespeichert");
      setEditing(false);
      onChanged?.();
    } catch (e) {
      toast.error("Speichern fehlgeschlagen: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const onPickFile = () => fileRef.current?.click();

  const onFileChosen = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-pick of same file later
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Datei zu groß (max. 8 MB)");
      return;
    }
    setUploading(true);
    setProgress(0);
    try {
      await uploadExpertImage(expert.id, file, (ev) => {
        if (ev.total) setProgress(Math.round((ev.loaded / ev.total) * 100));
      });
      toast.success("Foto aktualisiert");
      onChanged?.();
    } catch (err) {
      toast.error("Upload fehlgeschlagen: " + err.message);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const onClearImage = async () => {
    try {
      await clearExpertImage(expert.id);
      toast.success("Foto entfernt");
      onChanged?.();
    } catch (e) {
      toast.error("Entfernen fehlgeschlagen: " + e.message);
    }
  };

  return (
    <div
      data-testid={`expert-admin-row-${expert.id}`}
      className="flex flex-col gap-4 rounded-xl border border-blue-400/15 bg-[#0a112a] p-4 sm:grid sm:grid-cols-[140px_1fr_auto]"
    >
      {/* Thumbnail */}
      <div
        className="relative h-[140px] w-[140px] overflow-hidden rounded-sm border border-blue-400/20 bg-black"
        data-testid={`expert-admin-thumb-${expert.id}`}
      >
        {adapted.imageUrl ? (
          <img
            src={adapted.imageUrl}
            alt={expert.name}
            className={`h-full w-full ${
              (expert.image_fit || "cover") === "contain"
                ? "object-contain"
                : "object-cover"
            }`}
            style={{ objectPosition: expert.image_position || "center top" }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-widest text-blue-300/60">
            Kein Foto
          </div>
        )}
        {uploading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 text-xs text-blue-100">
            <div>{progress}%</div>
            <div className="h-1 w-3/4 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full bg-blue-400 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : null}
      </div>

      {/* Fields */}
      <div className="min-w-0 space-y-2">
        {editing ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-blue-300">Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className="mt-1 bg-[#0c1430] text-white"
                  data-testid={`expert-name-input-${expert.id}`}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-blue-300">Von</Label>
                  <Input
                    value={form.period_from}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, period_from: e.target.value }))
                    }
                    placeholder="09.06."
                    className="mt-1 bg-[#0c1430] text-white"
                    data-testid={`expert-from-input-${expert.id}`}
                  />
                </div>
                <div>
                  <Label className="text-xs text-blue-300">Bis</Label>
                  <Input
                    value={form.period_to}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, period_to: e.target.value }))
                    }
                    placeholder="20.06.2026"
                    className="mt-1 bg-[#0c1430] text-white"
                    data-testid={`expert-to-input-${expert.id}`}
                  />
                </div>
              </div>
            </div>
            <div>
              <Label className="text-xs text-blue-300">Kurztext / Rolle</Label>
              <Textarea
                value={form.role}
                onChange={(e) =>
                  setForm((f) => ({ ...f, role: e.target.value }))
                }
                rows={2}
                className="mt-1 bg-[#0c1430] text-white"
                data-testid={`expert-role-input-${expert.id}`}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-blue-300">Foto-Anpassung</Label>
                <Select
                  value={form.image_fit}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, image_fit: v }))
                  }
                >
                  <SelectTrigger
                    className="mt-1 bg-[#0c1430]"
                    data-testid={`expert-fit-select-${expert.id}`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-blue-400/30 bg-[#0c1430] text-blue-50">
                    <SelectItem
                      value="cover"
                      className="text-blue-100 focus:bg-blue-500/20 focus:text-white"
                    >
                      Füllend (Cover)
                    </SelectItem>
                    <SelectItem
                      value="contain"
                      className="text-blue-100 focus:bg-blue-500/20 focus:text-white"
                    >
                      Vollständig (Contain, mit Blur-Hintergrund)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-blue-300">
                  Bildausschnitt (CSS object-position)
                </Label>
                <Input
                  value={form.image_position}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, image_position: e.target.value }))
                  }
                  placeholder="z. B. center 35% oder left center"
                  className="mt-1 bg-[#0c1430] text-white"
                  data-testid={`expert-pos-input-${expert.id}`}
                />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="text-xs uppercase tracking-[0.25em] text-blue-300">
              {expert.period_from} – {expert.period_to}
            </div>
            <div
              className="font-display text-xl uppercase tracking-wide text-white"
              data-testid={`expert-admin-name-${expert.id}`}
            >
              {expert.name}
            </div>
            <div className="text-sm leading-snug text-blue-200">
              {expert.role}
            </div>
            <div className="text-xs text-blue-300/60">
              Anpassung: <span className="text-blue-100">{expert.image_fit || "cover"}</span>
              {expert.image_position ? (
                <> · Ausschnitt: <span className="text-blue-100">{expert.image_position}</span></>
              ) : null}
            </div>
          </>
        )}
      </div>

      {/* Action column */}
      <div className="flex flex-col gap-2 sm:w-44">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={onFileChosen}
          className="hidden"
          data-testid={`expert-file-input-${expert.id}`}
        />
        <Button
          onClick={onPickFile}
          disabled={uploading}
          className="bg-blue-500 hover:bg-blue-400"
          data-testid={`expert-upload-btn-${expert.id}`}
        >
          {uploading ? "Lade hoch …" : "Foto hochladen"}
        </Button>
        {adapted.imageUrl ? (
          <Button
            variant="outline"
            onClick={onClearImage}
            disabled={uploading}
            className="border-blue-400/30 text-blue-200 hover:bg-white/5"
            data-testid={`expert-clear-image-btn-${expert.id}`}
          >
            Foto entfernen
          </Button>
        ) : null}
        {editing ? (
          <>
            <Button
              onClick={save}
              disabled={saving}
              className="bg-emerald-500 hover:bg-emerald-400"
              data-testid={`expert-save-btn-${expert.id}`}
            >
              {saving ? "Speichere …" : "Speichern"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setEditing(false)}
              className="border-blue-400/30 text-blue-200 hover:bg-white/5"
            >
              Abbrechen
            </Button>
          </>
        ) : (
          <Button
            variant="outline"
            onClick={() => setEditing(true)}
            className="border-blue-400/30 text-blue-200 hover:bg-white/5"
            data-testid={`expert-edit-btn-${expert.id}`}
          >
            Bearbeiten
          </Button>
        )}
      </div>
    </div>
  );
}
