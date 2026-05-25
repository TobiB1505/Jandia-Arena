import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Checkbox } from "../components/ui/checkbox";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import LowerThirdLiveEditor from "../components/LowerThirdLiveEditor";
import ExpertsAdmin from "../components/ExpertsAdmin";
import SimulateDateAdmin from "../components/SimulateDateAdmin";
import {
  fetchLowerThirds,
  fetchLowerThirdsSettings,
  fetchLowerThirdsMeta,
  createLowerThird,
  updateLowerThird,
  deleteLowerThird,
  updateLowerThirdsSettings,
  patchLowerThirdActive,
} from "../lib/api";

const EMPTY = {
  label: "",
  title: "",
  subtitle: "",
  variant: "studio",
  active: true,
  order: 0,
  screens: [],
  slot: "header",
};

export default function Admin() {
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ variants: [], screens: [] });
  const [duration, setDuration] = useState(25);
  const [savingDuration, setSavingDuration] = useState(false);
  const [editing, setEditing] = useState(null); // null = closed, {} = new, {...} = edit
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [previewScreen, setPreviewScreen] = useState("germany");

  const refresh = async () => {
    const [list, settings, m] = await Promise.all([
      fetchLowerThirds(),
      fetchLowerThirdsSettings(),
      fetchLowerThirdsMeta(),
    ]);
    setItems(list);
    setDuration(Math.round((settings.cycle_duration_ms || 25000) / 1000));
    setMeta(m);
  };

  useEffect(() => {
    refresh().catch((e) => toast.error("Laden fehlgeschlagen: " + e.message));
  }, []);

  const saveDuration = async () => {
    setSavingDuration(true);
    try {
      const ms = Math.max(3, parseInt(duration || 0, 10)) * 1000;
      await updateLowerThirdsSettings({ cycle_duration_ms: ms });
      toast.success("Cycle-Dauer gespeichert");
    } catch (e) {
      toast.error("Speichern fehlgeschlagen: " + e.message);
    } finally {
      setSavingDuration(false);
    }
  };

  const onSubmitItem = async (form) => {
    setSaving(true);
    try {
      const payload = {
        label: form.label.trim(),
        title: form.title.trim(),
        subtitle: form.subtitle.trim(),
        variant: form.variant,
        active: !!form.active,
        order: parseInt(form.order || 0, 10),
        screens: form.screens,
        slot: form.slot || "header",
      };
      if (!payload.title) {
        toast.error("Titel ist Pflicht");
        setSaving(false);
        return;
      }
      if (payload.screens.length === 0) {
        toast.error("Mindestens einen Screen auswählen");
        setSaving(false);
        return;
      }
      if (form.id) {
        await updateLowerThird(form.id, payload);
        toast.success("Lower Third aktualisiert");
      } else {
        await createLowerThird(payload);
        toast.success("Lower Third erstellt");
      }
      setEditing(null);
      await refresh();
    } catch (e) {
      toast.error("Speichern fehlgeschlagen: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id) => {
    try {
      await deleteLowerThird(id);
      toast.success("Lower Third gelöscht");
      setConfirmDelete(null);
      await refresh();
    } catch (e) {
      toast.error("Löschen fehlgeschlagen: " + e.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#06091a] px-8 py-10 text-blue-50">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">
              Jandia Arena · Admin
            </h1>
            <p className="mt-1 text-blue-300">
              Steuere die Studio Lower Thirds und den Auto-Cycle der TV-Wand.
            </p>
          </div>
          <a
            href="/"
            className="rounded-md border border-blue-400/30 px-4 py-2 text-sm uppercase tracking-widest text-blue-200 hover:bg-white/5"
            data-testid="admin-back"
          >
            Zur TV-Ansicht
          </a>
        </header>

        {/* Daten-Modus / Simulated Date */}
        <SimulateDateAdmin />

        {/* Global settings */}
        <Card className="border-blue-400/20 bg-[#0c1430]">
          <CardHeader>
            <CardTitle className="text-blue-100">Auto-Cycle</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[220px]">
                <Label className="text-blue-200">
                  Cycle-Dauer pro Lower Third (Sekunden)
                </Label>
                <Input
                  type="number"
                  min={3}
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="mt-2 bg-[#0a112a] text-white"
                  data-testid="cycle-duration-input"
                />
                <p className="mt-1 text-xs text-blue-300/70">
                  Gilt pro Screen, der mehrere aktive Lower Thirds hat. Minimum 3 Sekunden.
                </p>
              </div>
              <Button
                onClick={saveDuration}
                disabled={savingDuration}
                data-testid="cycle-duration-save"
                className="bg-blue-500 hover:bg-blue-400"
              >
                {savingDuration ? "Speichere…" : "Speichern"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Items list */}
        <Card className="border-blue-400/20 bg-[#0c1430]">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-blue-100">Lower Thirds</CardTitle>
            <Button
              onClick={() => setEditing({ ...EMPTY })}
              data-testid="add-lower-third-btn"
              className="bg-blue-500 hover:bg-blue-400"
            >
              + Neuer Lower Third
            </Button>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <div className="rounded-md border border-dashed border-blue-400/30 px-6 py-10 text-center text-blue-300">
                Noch keine Lower Thirds angelegt. Klick „Neuer Lower Third" um zu starten.
              </div>
            ) : (
              <div className="space-y-3" data-testid="lower-thirds-list">
                {items.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    meta={meta}
                    onEdit={() => setEditing({ ...item })}
                    onDelete={() => setConfirmDelete(item)}
                    onToggleActive={async (active) => {
                      try {
                        await patchLowerThirdActive(item.id, active);
                        await refresh();
                      } catch (e) {
                        toast.error("Update fehlgeschlagen: " + e.message);
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Live preview / drag-and-drop editor */}
        <Card className="border-blue-400/20 bg-[#0c1430]">
          <CardHeader>
            <CardTitle className="text-blue-100">
              Live-Vorschau · Drag &amp; Drop
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LowerThirdLiveEditor
              items={items}
              meta={meta}
              selectedScreen={previewScreen}
              onScreenChange={setPreviewScreen}
              onPersisted={refresh}
            />
          </CardContent>
        </Card>

        {/* Experts management */}
        <ExpertsAdmin />
      </div>

      {/* Edit dialog */}
      <ItemDialog
        open={!!editing}
        meta={meta}
        initial={editing}
        saving={saving}
        onClose={() => setEditing(null)}
        onSubmit={onSubmitItem}
      />

      {/* Delete confirm */}
      <Dialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <DialogContent className="border-blue-400/20 bg-[#0c1430] text-blue-50">
          <DialogHeader>
            <DialogTitle>Wirklich löschen?</DialogTitle>
            <DialogDescription className="text-blue-300">
              Diese Aktion kann nicht rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <p className="text-blue-200">
            „{confirmDelete?.title}" wird dauerhaft entfernt.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDelete(null)}
              data-testid="delete-cancel-btn"
            >
              Abbrechen
            </Button>
            <Button
              className="bg-red-500 hover:bg-red-400"
              onClick={() => onDelete(confirmDelete.id)}
              data-testid="delete-confirm-btn"
            >
              Löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ItemRow({ item, meta, onEdit, onDelete, onToggleActive }) {
  const screenLabel = (id) =>
    meta.screens.find((s) => s.id === id)?.label || id;
  return (
    <div
      data-testid={`lower-third-row-${item.id}`}
      className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-blue-400/15 bg-[#0a112a] px-4 py-3"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="rounded-sm border border-blue-400/30 bg-blue-400/10 px-2 py-0.5 text-xs uppercase tracking-widest text-blue-200">
            {item.variant}
          </span>
          <span
            className={`rounded-sm px-2 py-0.5 text-xs uppercase tracking-widest ${
              (item.slot || "header") === "header"
                ? "border border-cyan-400/30 bg-cyan-400/10 text-cyan-100"
                : "border border-amber-400/30 bg-amber-400/10 text-amber-100"
            }`}
          >
            {(item.slot || "header") === "header" ? "Header" : "Stage"}
          </span>
          <span className="text-xs uppercase tracking-widest text-blue-300/70">
            {item.label || "—"}
          </span>
          <span className="text-xs text-blue-300/50">· Reihenfolge {item.order}</span>
        </div>
        <div className="mt-1 truncate text-lg font-semibold text-white">
          {item.title}
        </div>
        {item.subtitle ? (
          <div className="truncate text-sm text-blue-300">{item.subtitle}</div>
        ) : null}
        <div className="mt-1 flex flex-wrap gap-1">
          {item.screens.map((s) => (
            <span
              key={s}
              className="rounded-sm bg-white/5 px-2 py-0.5 text-xs text-blue-200"
            >
              {screenLabel(s)}
            </span>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Switch
            checked={item.active}
            onCheckedChange={onToggleActive}
            data-testid={`toggle-active-${item.id}`}
            className="h-7 w-12 data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-zinc-600"
          />
          <span
            className={`min-w-[3.5rem] text-center text-xs font-bold uppercase tracking-widest ${
              item.active ? "text-emerald-300" : "text-zinc-400"
            }`}
          >
            {item.active ? "AKTIV" : "AUS"}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onEdit}
          data-testid={`edit-${item.id}`}
        >
          Bearbeiten
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-red-300 hover:bg-red-500/10"
          onClick={onDelete}
          data-testid={`delete-${item.id}`}
        >
          Löschen
        </Button>
      </div>
    </div>
  );
}

function ItemDialog({ open, initial, meta, saving, onClose, onSubmit }) {
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (open) setForm(initial?.id ? { ...initial } : { ...EMPTY });
  }, [open, initial]);

  const toggleScreen = (id) => {
    setForm((f) =>
      f.screens.includes(id)
        ? { ...f, screens: f.screens.filter((s) => s !== id) }
        : { ...f, screens: [...f.screens, id] }
    );
  };

  const variants = useMemo(() => meta.variants || [], [meta]);
  const screens = useMemo(() => meta.screens || [], [meta]);
  const slots = useMemo(
    () =>
      meta.slots || [
        { id: "header", label: "Header-Banner (oben)" },
        { id: "stage", label: "Stage-Overlay (unten, frei platzierbar)" },
      ],
    [meta]
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl border-blue-400/20 bg-[#0c1430] text-blue-50">
        <DialogHeader>
          <DialogTitle>
            {form.id ? "Lower Third bearbeiten" : "Neuer Lower Third"}
          </DialogTitle>
          <DialogDescription className="text-blue-300">
            Konfiguriere Inhalt, Variante und auf welchen Screens dieser Lower Third erscheinen soll.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label>Position im Dashboard</Label>
            <Select
              value={form.slot || "header"}
              onValueChange={(v) => setForm((f) => ({ ...f, slot: v }))}
            >
              <SelectTrigger
                className="mt-2 bg-[#0a112a]"
                data-testid="slot-select"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-blue-400/30 bg-[#0c1430] text-blue-50">
                {slots.map((s) => (
                  <SelectItem
                    key={s.id}
                    value={s.id}
                    className="text-blue-100 focus:bg-blue-500/20 focus:text-white"
                  >
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-blue-300/70">
              Header = schmaler Promo-Banner zwischen Logo und Uhr. Stage =
              klassischer Lower Third unten im Bild, frei per Drag &amp; Drop
              positionierbar.
            </p>
          </div>
          <div>
            <Label>Variant</Label>
            <Select
              value={form.variant}
              onValueChange={(v) => setForm((f) => ({ ...f, variant: v }))}
            >
              <SelectTrigger
                className="mt-2 bg-[#0a112a]"
                data-testid="variant-select"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-blue-400/30 bg-[#0c1430] text-blue-50">
                {variants.map((v) => (
                  <SelectItem
                    key={v.id}
                    value={v.id}
                    className="text-blue-100 focus:bg-blue-500/20 focus:text-white"
                  >
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Label (z. B. „LIVE", optional)</Label>
            <Input
              value={form.label}
              onChange={(e) =>
                setForm((f) => ({ ...f, label: e.target.value }))
              }
              placeholder="Wird sonst aus Variant abgeleitet"
              className="mt-2 bg-[#0a112a]"
              data-testid="label-input"
            />
          </div>
          <div className="md:col-span-2">
            <Label>Titel</Label>
            <Input
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
              className="mt-2 bg-[#0a112a]"
              data-testid="title-input"
            />
          </div>
          <div className="md:col-span-2">
            <Label>Untertitel</Label>
            <Textarea
              value={form.subtitle}
              onChange={(e) =>
                setForm((f) => ({ ...f, subtitle: e.target.value }))
              }
              className="mt-2 bg-[#0a112a]"
              rows={2}
              data-testid="subtitle-input"
            />
          </div>
          <div>
            <Label>Reihenfolge</Label>
            <Input
              type="number"
              value={form.order}
              onChange={(e) =>
                setForm((f) => ({ ...f, order: e.target.value }))
              }
              className="mt-2 bg-[#0a112a]"
              data-testid="order-input"
            />
          </div>
          <div className="flex items-end gap-2">
            <Switch
              checked={form.active}
              onCheckedChange={(v) =>
                setForm((f) => ({ ...f, active: !!v }))
              }
              data-testid="active-switch"
            />
            <span className="pb-1 text-sm text-blue-200">
              {form.active ? "Aktiv" : "Inaktiv"}
            </span>
          </div>
          <div className="md:col-span-2">
            <Label>Auf welchen Screens anzeigen?</Label>
            <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-3">
              {screens.map((s) => (
                <label
                  key={s.id}
                  className="flex items-center gap-2 rounded-md border border-blue-400/20 bg-[#0a112a] px-3 py-2 text-sm"
                >
                  <Checkbox
                    checked={form.screens.includes(s.id)}
                    onCheckedChange={() => toggleScreen(s.id)}
                    data-testid={`screen-check-${s.id}`}
                  />
                  <span>{s.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            data-testid="dialog-cancel-btn"
          >
            Abbrechen
          </Button>
          <Button
            onClick={() => onSubmit(form)}
            disabled={saving}
            className="bg-blue-500 hover:bg-blue-400"
            data-testid="dialog-save-btn"
          >
            {saving ? "Speichere…" : "Speichern"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
