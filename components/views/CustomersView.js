"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/ui/PageHeader";
import Button, { Field, inputClass, textareaClass } from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/ui/EmptyState";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";
import StatusBadge from "@/components/ui/StatusBadge";
import SearchInput from "@/components/ui/SearchInput";
import TagSelect from "@/components/ui/TagSelect";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import AnchoredMenu from "@/components/ui/AnchoredMenu";
import { useProfile } from "@/components/layout/AppShell";
import { CUSTOMER_STATUSES, canManage } from "@/lib/constants";
import { listCustomers, listProfiles, listProjects, listTags, logActivity, replaceLinks } from "@/lib/data";
import { createClient } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/format";
import { startRequest } from "@/lib/load";

const emptyCustomer = {
  company_name: "",
  contact_name: "",
  phone: "",
  email: "",
  address: "",
  website: "",
  owner_id: "",
  status: "active",
  note: "",
  tagIds: [],
  projectIds: [],
};

export default function CustomersView() {
  const profile = useProfile();
  const [customers, setCustomers] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const initialForm = useRef(null);

  async function load() {
    setLoading(true);
    try {
      const [customerRows, profileRows, projectRows, tagRows] = await Promise.all([
        listCustomers(),
        listProfiles(),
        listProjects(),
        listTags(),
      ]);
      setCustomers(customerRows);
      setProfiles(profileRows);
      setProjects(projectRows);
      setTags(tagRows);
    } catch (error) {
      toast.error(errorMessage(error, "Müşteriler yüklenemedi."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => startRequest(() => load()), []);

  function openForm(next) {
    initialForm.current = next;
    setConfirmClose(false);
    setForm(next);
  }

  function isDirty() {
    return Boolean(form) && JSON.stringify(form) !== JSON.stringify(initialForm.current);
  }

  function requestClose() {
    if (confirmClose) {
      setConfirmClose(false);
      return;
    }
    if (isDirty()) {
      setConfirmClose(true);
      return;
    }
    setForm(null);
  }

  const filtered = customers.filter((customer) => {
    const blob = `${customer.company_name} ${customer.contact_name || ""} ${customer.email || ""}`.toLocaleLowerCase("tr-TR");
    return blob.includes(search.toLocaleLowerCase("tr-TR"));
  });

  async function save(event) {
    event.preventDefault();
    if (!form.company_name.trim()) {
      toast.error("Firma adı gerekli.");
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const payload = {
        company_name: form.company_name.trim(),
        contact_name: form.contact_name.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        website: form.website.trim() || null,
        owner_id: form.owner_id || profile.id,
        status: form.status,
        note: form.note.trim() || null,
      };
      let id = form.id;
      if (!id) {
        const { data, error } = await supabase.from("customers").insert({ ...payload, created_by: profile.id }).select("id").single();
        if (error) throw error;
        id = data.id;
        await logActivity(profile.id, "customer_created", "customer", id, { title: payload.company_name });
      } else {
        const { error } = await supabase.from("customers").update(payload).eq("id", id);
        if (error) throw error;
      }
      await replaceLinks("customer_tags", "customer_id", id, "tag_id", form.tagIds);
      await replaceLinks("customer_projects", "customer_id", id, "project_id", form.projectIds);
      toast.success(form.id ? "Müşteri güncellendi." : "Müşteri eklendi.");
      setForm(null);
      await load();
    } catch (error) {
      toast.error(errorMessage(error, "Müşteri kaydedilemedi."));
    } finally {
      setBusy(false);
    }
  }

  async function removeCustomer() {
    const supabase = createClient();
    const { error } = await supabase.from("customers").delete().eq("id", pendingDelete.id);
    if (error) throw error;
    toast.success("Müşteri silindi.");
    setPendingDelete(null);
    await load();
  }

  return (
    <div>
      <PageHeader title="Müşteriler" description="Firmaları, etiketleri ve proje bağlarını takip edin." action={canManage(profile) ? <Button onClick={() => openForm({ ...emptyCustomer, owner_id: profile.id })}>Yeni müşteri</Button> : null} />
      <div className="mb-4"><SearchInput value={search} onChange={setSearch} placeholder="Firma veya yetkili ara" /></div>
      {loading ? <LoadingSkeleton /> : null}
      {!loading && filtered.length === 0 ? (
        <EmptyState title="Henüz müşteri bulunmuyor." description="İlk müşteri kaydını oluşturun." action={canManage(profile) ? <Button onClick={() => openForm({ ...emptyCustomer, owner_id: profile.id })}>İlk müşterini ekle</Button> : null} />
      ) : null}
      <div className="grid gap-3 md:grid-cols-2">
        {filtered.map((customer) => (
          <article key={customer.id} className="rounded-2xl border border-line bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link href={`/customers/${customer.id}`} className="font-semibold hover:text-accent">{customer.company_name}</Link>
                <p className="mt-1 text-sm text-muted">{customer.contact_name || "Yetkili yok"}</p>
              </div>
              <div className="flex shrink-0 items-start gap-2">
                <StatusBadge kind="customer" value={customer.status} />
                {canManage(profile) ? (
                  <CustomerCardMenu
                    onEdit={() => openForm({
                      ...customer,
                      contact_name: customer.contact_name || "",
                      phone: customer.phone || "",
                      email: customer.email || "",
                      address: customer.address || "",
                      website: customer.website || "",
                      note: customer.note || "",
                      owner_id: customer.owner_id || "",
                      tagIds: (customer.tags || []).map((item) => item.tag_id),
                      projectIds: (customer.projects || []).map((item) => item.project_id),
                    })}
                    onDelete={() => setPendingDelete(customer)}
                  />
                ) : null}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              {(customer.tags || []).map((item) => (
                <span key={item.tag_id} className="rounded-full bg-zinc-100 px-2 py-1 text-xs">{item.tag?.name}</span>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted">{(customer.projects || []).map((item) => item.project?.name).filter(Boolean).join(", ") || "Proje bağlı değil"}</p>
          </article>
        ))}
      </div>
      {form ? (
        <Modal title={form.id ? "Müşteriyi düzenle" : "Yeni müşteri"} onClose={requestClose} wide>
          <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
            <Field label="Firma adı"><input className={inputClass} value={form.company_name} onChange={(event) => setForm({ ...form, company_name: event.target.value })} required /></Field>
            <Field label="Yetkili kişi"><input className={inputClass} value={form.contact_name} onChange={(event) => setForm({ ...form, contact_name: event.target.value })} /></Field>
            <Field label="Telefon"><input className={inputClass} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></Field>
            <Field label="E-mail"><input type="email" className={inputClass} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field>
            <Field label="Web sitesi"><input className={inputClass} value={form.website} onChange={(event) => setForm({ ...form, website: event.target.value })} /></Field>
            <Field label="Durum">
              <select className={inputClass} value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                {CUSTOMER_STATUSES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </Field>
            <div className="sm:col-span-2"><Field label="Adres"><textarea className={textareaClass} value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></Field></div>
            <div className="sm:col-span-2"><Field label="Not"><textarea className={textareaClass} value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} /></Field></div>
            <Field label="Sorumlu">
              <select className={inputClass} value={form.owner_id || ""} onChange={(event) => setForm({ ...form, owner_id: event.target.value })}>
                {profiles.map((item) => <option key={item.id} value={item.id}>{item.full_name || item.username}</option>)}
              </select>
            </Field>
            <Field label="Projeler">
              <div className="max-h-40 space-y-1 overflow-auto rounded-xl border border-line p-2">
                {projects.map((project) => (
                  <label key={project.id} className="flex items-center gap-2 py-1 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={form.projectIds.includes(project.id)}
                      onChange={() => {
                        const projectIds = form.projectIds.includes(project.id)
                          ? form.projectIds.filter((id) => id !== project.id)
                          : [...form.projectIds, project.id];
                        setForm({ ...form, projectIds });
                      }}
                    />
                    {project.name}
                  </label>
                ))}
                {projects.length === 0 ? <p className="text-sm text-muted">Önce bir proje oluşturun.</p> : null}
              </div>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Etiketler">
                <TagSelect tags={tags} value={form.tagIds} onChange={(tagIds) => setForm({ ...form, tagIds })} onCreated={(tag) => setTags((current) => [...current, tag])} profileId={profile.id} />
              </Field>
            </div>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button variant="secondary" onClick={requestClose}>Vazgeç</Button>
              <Button type="submit" disabled={busy}>{busy ? "Kaydediliyor..." : "Kaydet"}</Button>
            </div>
          </form>
        </Modal>
      ) : null}
      {confirmClose ? (
        <ConfirmDialog
          title="Emin misin?"
          message="Bu penceredeki bilgiler henüz kaydedilmedi. Kapatırsan girdiklerin silinir."
          confirmLabel="Kapat"
          variant="primary"
          onClose={() => setConfirmClose(false)}
          onConfirm={() => {
            setConfirmClose(false);
            setForm(null);
          }}
        />
      ) : null}
      {pendingDelete ? <ConfirmDialog title="Müşteriyi sil" message={`${pendingDelete.company_name} silinsin mi?`} onClose={() => setPendingDelete(null)} onConfirm={removeCustomer} /> : null}
    </div>
  );
}

function CustomerCardMenu({ onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef(null);

  return (
    <div className="shrink-0">
      <button
        ref={anchorRef}
        type="button"
        aria-label="Diğer işlemler"
        aria-expanded={open}
        className="grid h-9 w-9 place-items-center rounded-xl text-zinc-500 hover:bg-zinc-100"
        onClick={() => setOpen((current) => !current)}
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>
      <AnchoredMenu open={open} anchorRef={anchorRef} onClose={() => setOpen(false)} align="end" width={168}>
        <button
          type="button"
          className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm hover:bg-zinc-50"
          onClick={() => {
            setOpen(false);
            onEdit();
          }}
        >
          Düzenle
        </button>
        <button
          type="button"
          className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
          onClick={() => {
            setOpen(false);
            onDelete();
          }}
        >
          Sil
        </button>
      </AnchoredMenu>
    </div>
  );
}
