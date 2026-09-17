"use client";

import { ExternalLink, FileText, Link2, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createId, useRoutineData } from "@/features/data/routine-store";
import type { AcademicResource, ResourceType, Subject } from "@/types/academic";

const resourceTypeLabels: Record<ResourceType, string> = {
  classroom: "Classroom",
  document: "Documento",
  link: "Link",
  note: "Anotacao",
  other: "Outro",
  video: "Video"
};

const resourceTypeOptions: ResourceType[] = ["link", "document", "video", "classroom", "note", "other"];

export function ResourcePanel({ subject }: { subject: Subject }) {
  const { updateSubject } = useRoutineData();
  const resources = useMemo(() => subject.resources ?? [], [subject.resources]);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ResourceType>("link");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");

  function saveResources(nextResources: AcademicResource[]) {
    updateSubject(subject.id, { resources: nextResources });
  }

  function addResource(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanTitle = title.trim();
    const cleanUrl = url.trim();
    const cleanNotes = notes.trim();

    if (!cleanTitle && !cleanUrl && !cleanNotes) {
      return;
    }

    saveResources([
      {
        createdAt: new Date().toISOString(),
        id: createId("resource"),
        notes: cleanNotes || undefined,
        subjectId: subject.id,
        title: cleanTitle || getFallbackTitle(type, cleanUrl),
        type,
        url: cleanUrl || undefined
      },
      ...resources
    ]);
    setTitle("");
    setType("link");
    setUrl("");
    setNotes("");
  }

  function updateResource(resourceId: string, patch: Partial<AcademicResource>) {
    saveResources(resources.map((resource) => (resource.id === resourceId ? { ...resource, ...patch } : resource)));
  }

  function removeResource(resourceId: string) {
    saveResources(resources.filter((resource) => resource.id !== resourceId));
  }

  return (
    <section className="space-y-4" id="materiais">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink">Materiais e links</h2>
          <p className="mt-1 text-sm text-slate-500">
            Guarde Classroom, PDFs, videos, repositorios, slides e observacoes importantes desta area.
          </p>
        </div>
        <Badge tone="neutral">{resources.length} salvos</Badge>
      </div>

      <form className="rounded-lg border border-line bg-white p-4 shadow-sm" onSubmit={addResource}>
        <div className="mb-4 flex items-center gap-2">
          <Link2 aria-hidden className="h-5 w-5 text-mint" />
          <h3 className="text-sm font-semibold text-ink">Novo material</h3>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_170px]">
          <label>
            <span className="text-sm font-medium text-slate-700">Titulo</span>
            <input
              className="mt-1 h-11 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-ink"
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ex.: Drive da disciplina, apostila, aula gravada"
              value={title}
            />
          </label>
          <label>
            <span className="text-sm font-medium text-slate-700">Tipo</span>
            <select
              className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none focus:border-ink"
              onChange={(event) => setType(event.target.value as ResourceType)}
              value={type}
            >
              {resourceTypeOptions.map((option) => (
                <option key={option} value={option}>
                  {resourceTypeLabels[option]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
          <label>
            <span className="text-sm font-medium text-slate-700">Link</span>
            <input
              className="mt-1 h-11 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-ink"
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://..."
              type="url"
              value={url}
            />
          </label>
          <Button className="mt-6" type="submit">
            <Plus aria-hidden className="h-4 w-4" />
            Salvar
          </Button>
        </div>

        <label className="mt-3 block">
          <span className="text-sm font-medium text-slate-700">Notas</span>
          <textarea
            className="mt-1 min-h-20 w-full resize-none rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-ink"
            onChange={(event) => setNotes(event.target.value)}
            placeholder="O que tem nesse material, onde usar, observacoes do professor ou do projeto"
            value={notes}
          />
        </label>
      </form>

      <div className="rounded-lg border border-line bg-white shadow-sm">
        {resources.length === 0 ? (
          <div className="p-4 text-sm text-slate-500">Nenhum material salvo ainda.</div>
        ) : null}

        {resources.map((resource) => (
          <article className="border-b border-line p-4 last:border-b-0" key={resource.id}>
            <div className="grid gap-3 sm:grid-cols-[44px_1fr_auto] sm:items-start">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-mint">
                <FileText aria-hidden className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-ink">{resource.title}</h3>
                  <Badge tone={resource.type === "classroom" ? "mint" : "neutral"}>{resourceTypeLabels[resource.type]}</Badge>
                </div>
                {resource.url ? (
                  <a
                    className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-sm font-medium text-mint hover:underline"
                    href={resource.url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <ExternalLink aria-hidden className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{resource.url}</span>
                  </a>
                ) : null}
                {resource.notes ? <p className="mt-2 text-sm leading-6 text-slate-600">{resource.notes}</p> : null}
              </div>
              <Button aria-label="Excluir material" onClick={() => removeResource(resource.id)} size="icon" variant="ghost">
                <Trash2 aria-hidden className="h-4 w-4" />
              </Button>
            </div>

            <details className="mt-3 rounded-lg border border-dashed border-line p-3">
              <summary className="cursor-pointer text-sm font-medium text-slate-600">Editar material</summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_150px]">
                <label className="text-xs text-slate-500">
                  Titulo
                  <input
                    className="mt-1 h-10 w-full rounded-lg border border-line px-2 text-sm text-ink outline-none focus:border-ink"
                    onChange={(event) => updateResource(resource.id, { title: event.target.value })}
                    value={resource.title}
                  />
                </label>
                <label className="text-xs text-slate-500">
                  Tipo
                  <select
                    className="mt-1 h-10 w-full rounded-lg border border-line bg-white px-2 text-sm text-ink outline-none focus:border-ink"
                    onChange={(event) => updateResource(resource.id, { type: event.target.value as ResourceType })}
                    value={resource.type}
                  >
                    {resourceTypeOptions.map((option) => (
                      <option key={option} value={option}>
                        {resourceTypeLabels[option]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="mt-3 block text-xs text-slate-500">
                Link
                <input
                  className="mt-1 h-10 w-full rounded-lg border border-line px-2 text-sm text-ink outline-none focus:border-ink"
                  onChange={(event) => updateResource(resource.id, { url: event.target.value || undefined })}
                  value={resource.url ?? ""}
                />
              </label>
              <label className="mt-3 block text-xs text-slate-500">
                Notas
                <textarea
                  className="mt-1 min-h-20 w-full resize-none rounded-lg border border-line px-2 py-2 text-sm text-ink outline-none focus:border-ink"
                  onChange={(event) => updateResource(resource.id, { notes: event.target.value || undefined })}
                  value={resource.notes ?? ""}
                />
              </label>
            </details>
          </article>
        ))}
      </div>
    </section>
  );
}

function getFallbackTitle(type: ResourceType, url: string) {
  if (url) {
    return resourceTypeLabels[type];
  }

  return type === "note" ? "Anotacao" : "Material";
}
