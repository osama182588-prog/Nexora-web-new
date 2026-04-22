"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Icon } from "@/components/icons";
import { projectsApi } from "@/lib/client-api";
import { cn } from "@/lib/utils";

const COLORS = ["purple", "blue", "cyan", "emerald", "amber", "rose"] as const;
const colorChip: Record<(typeof COLORS)[number], string> = {
  purple: "bg-neon-purple",
  blue: "bg-neon-blue",
  cyan: "bg-neon-cyan",
  emerald: "bg-emerald-400",
  amber: "bg-amber-400",
  rose: "bg-rose-400"
};

export function NewProjectForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [color, setColor] = useState<(typeof COLORS)[number]>("purple");
  const [tagsInput, setTagsInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Project name is required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const { project } = await projectsApi.create({
        name: name.trim(),
        description: description.trim(),
        priority,
        color,
        tags
      });
      router.push(`/dashboard/projects/${project.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create project.");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {error && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      <Card variant="glass" className="space-y-5 p-6">
        <Field label="Project name" htmlFor="name" required>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Aurora launch campaign"
            maxLength={80}
            required
            autoFocus
          />
        </Field>

        <Field label="Description" htmlFor="description" hint="Up to 500 characters.">
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this project about?"
            maxLength={500}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Priority" htmlFor="priority">
            <Select
              id="priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </Select>
          </Field>

          <Field label="Tags" htmlFor="tags" hint="Comma-separated, up to 12.">
            <Input
              id="tags"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="design, launch, q3"
            />
          </Field>
        </div>

        <Field label="Accent color">
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={`Use ${c} accent`}
                aria-pressed={color === c}
                className={cn(
                  "group relative h-9 w-9 rounded-xl ring-1 ring-white/10 transition",
                  color === c
                    ? "ring-2 ring-white shadow-glow-sm scale-105"
                    : "hover:scale-105 hover:ring-white/30"
                )}
              >
                <span
                  className={cn("block h-full w-full rounded-xl", colorChip[c])}
                />
              </button>
            ))}
          </div>
        </Field>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <Link
          href="/dashboard/projects"
          className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
        >
          <Icon.Chevron size={14} className="rotate-180" />
          Back to projects
        </Link>
        <Button type="submit" loading={submitting}>
          <Icon.Plus size={16} />
          Create project
        </Button>
      </div>
    </form>
  );
}
