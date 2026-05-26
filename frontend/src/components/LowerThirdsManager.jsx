import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Checkbox } from "./ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import LowerThirdLiveEditor from "./LowerThirdLiveEditor";
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

/**
 * Self-contained Lower-Thirds CRUD + live-preview block. Owns its own data
 * lifecycle (list, settings, meta) and the edit / delete dialogs. Used in
 * both the mobile tabs and the desktop layout.
 */
export default function LowerThirdsManager() {
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ variants: [], screens: [], slots: [] });
  const [duration, setDuration] = useState(25);
  const [savingDuration, setSavingDuration] = useState(false);
  const [editing, setEditing] = useState(null);
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

  const onToggleActive = async (item, active) => {
    try {
      await patchLowerThirdActive(item.id, active);
      await refresh();
    } catch (e) {
      toast.error("Update fehlgeschlagen: " + e.message);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-blue-400/20 bg-[#0c1430]">
        <CardHeader>
          <CardTitle className="text-blue-100 text-lg">Auto-Cycle</CardTitle>
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
                className="mt-2 h-12 bg-[#0a112a] text-white text-base"
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
              className="h-12 bg-blue-500 hover:bg-blue-400 text-base"
            >
              {savingDuration ? "Speichere…" : "Speichern"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-blue-400/20 bg-[#0c1430]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-blue-100 text-lg">Lower Thirds</CardTitle>
          <Button
            onClick={() => setEditing({ ...EMPTY })}
            data-testid="add-lower-third-btn"
            className="h-10 bg-blue-500 hover:bg-blue-400"
          >
            + Neu
          </Button>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="rounded-md border border-dashed border-blue-400/30 px-4 py-8 text-center text-blue-300 text-sm">
              Noch keine Lower Thirds angelegt.
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
                  onToggleActive={(active) => onToggleActive(item, active)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-blue-400/20 bg-[#0c1430]">
        <CardHeader>
          <CardTitle className="text-blue-100 text-lg">
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

      <ItemDialog
        open={!!editing}
        meta={meta}
        initial={editing}
        saving={saving}
        onClose={() => setEditing(null)}
        onSubmit={onSubmitItem}
      />

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
      className="rounded-xl border border-blue-400/15 bg-[#0a112a] p-4 space-y-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md border border-blue-400/30 bg-blue-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-blue-200">
          {item.variant}
        </span>
        <span
          className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
            (item.slot || "header") === "header"
              ? "border border-cyan-400/30 bg-cyan-400/10 text-cyan-100"
              : "border border-amber-400/30 bg-amber-400/10 text-amber-100"
          }`}
        >
          {(item.slot || "header") === "header" ? "Header" : "Stage"}
        </span>
        <span className="text-[10px] uppercase tracking-widest text-blue-300/70">
          {item.label || "—"}
        </span>
        <span className="ml-auto text-[10px] text-blue-300/50">#{item.order}</span>
      </div>

      <div>
        <div className="text-base font-semibold leading-snug text-white">
          {item.title}
        </div>
        {item.subtitle ? (
          <div className="text-sm text-blue-300/80">{item.subtitle}</div>
        ) : null}
      </div>

      {item.screens.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {item.screens.map((s) => (
            <span
              key={s}
              className="rounded-md bg-white/5 px-2 py-0.5 text-[11px] text-blue-200"
            >
              {screenLabel(s)}
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-blue-400/10 pt-3">
        <label
          className="flex select-none items-center gap-2 cursor-pointer"
          data-testid={`toggle-active-label-${item.id}`}
        >
          <Switch
            checked={item.active}
            onCheckedChange={onToggleActive}
            data-testid={`toggle-active-${item.id}`}
            className="h-7 w-12 data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-zinc-600"
          />
          <span
            className={`text-xs font-bold uppercase tracking-widest ${
              item.active ? "text-emerald-300" : "text-zinc-400"
            }`}
          >
            {item.active ? "Aktiv" : "Aus"}
          </span>
        </label>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="h-9 border-blue-400/30 bg-transparent text-blue-100 hover:bg-white/5"
            data-testid={`edit-${item.id}`}
          >
            Bearbeiten
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 border-rose-400/30 bg-transparent text-rose-300 hover:bg-rose-500/10"
            onClick={onDelete}
            data-testid={`delete-${item.id}`}
          >
            Löschen
          </Button>
        </div>
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
      meta.slots && meta.slots.length > 0
        ? meta.slots
        : [
            { id: "header", label: "Header-Banner (oben)" },
            { id: "stage", label: "Stage-Overlay (unten, frei platzierbar)" },
          ],
    [meta]
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto border-blue-400/20 bg-[#0c1430] text-blue-50">
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
              <SelectTrigger className="mt-2 bg-[#0a112a]" data-testid="slot-select">
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
              <SelectTrigger className="mt-2 bg-[#0a112a]" data-testid="variant-select">
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
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              placeholder="Wird sonst aus Variant abgeleitet"
              className="mt-2 bg-[#0a112a]"
              data-testid="label-input"
            />
          </div>
          <div className="md:col-span-2">
            <Label>Titel</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="mt-2 bg-[#0a112a]"
              data-testid="title-input"
            />
          </div>
          <div className="md:col-span-2">
            <Label>Untertitel</Label>
            <Textarea
              value={form.subtitle}
              onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
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
              onChange={(e) => setForm((f) => ({ ...f, order: e.target.value }))}
              className="mt-2 bg-[#0a112a]"
              data-testid="order-input"
            />
          </div>
          <div className="flex items-end gap-2">
            <Switch
              checked={form.active}
              onCheckedChange={(v) => setForm((f) => ({ ...f, active: !!v }))}
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
