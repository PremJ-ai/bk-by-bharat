"use client";

import type { FabricSpecifications } from "@/lib/api/catalog";

export interface FabricSpecificationForm {
  fabricName: string;
  composition: string;
  fibrePercentages: { fibre: string; percentage: string }[];
  weightGsm: string;
  weave: string;
  texture: string;
  stretch: string;
  origin: string;
  finish: string;
  fit: string;
  pattern: string;
  colour: string;
}

export function emptyFabricSpecificationForm(): FabricSpecificationForm {
  return {
    fabricName: "",
    composition: "",
    fibrePercentages: [],
    weightGsm: "",
    weave: "",
    texture: "",
    stretch: "",
    origin: "",
    finish: "",
    fit: "",
    pattern: "",
    colour: "",
  };
}

export function toFabricSpecifications(
  form: FabricSpecificationForm
): FabricSpecifications | undefined {
  const fibrePercentages = form.fibrePercentages
    .filter((item) => item.fibre.trim() || item.percentage.trim())
    .map((item) => {
      if (!item.fibre.trim() || item.percentage.trim() === "") {
        throw new Error("Complete both the fibre name and percentage for each fibre.");
      }
      const percentage = Number(item.percentage);
      if (!Number.isInteger(percentage) || percentage < 0 || percentage > 100) {
        throw new Error("Fibre percentages must be whole numbers from 0 to 100.");
      }
      return { fibre: item.fibre.trim(), percentage };
    });

  if (
    fibrePercentages.length > 0 &&
    fibrePercentages.reduce((total, item) => total + item.percentage, 0) !== 100
  ) {
    throw new Error("Fibre percentages must total 100%.");
  }

  let weightGsm: number | undefined;
  if (form.weightGsm.trim()) {
    weightGsm = Number(form.weightGsm);
    if (!Number.isInteger(weightGsm) || weightGsm < 1 || weightGsm > 2000) {
      throw new Error("Weight must be a whole number between 1 and 2000 GSM.");
    }
  }

  const specifications: FabricSpecifications = {
    fabricName: form.fabricName.trim() || undefined,
    composition: form.composition.trim() || undefined,
    fibrePercentages: fibrePercentages.length ? fibrePercentages : undefined,
    weightGsm,
    weave: form.weave.trim() || undefined,
    texture: form.texture.trim() || undefined,
    stretch: form.stretch.trim() || undefined,
    finish: form.finish.trim() || undefined,
    fit: form.fit.trim() || undefined,
    pattern: form.pattern.trim() || undefined,
    colour: form.colour.trim() || undefined,
  };
  return Object.values(specifications).some((value) =>
    Array.isArray(value) ? value.length > 0 : value !== undefined
  )
    ? specifications
    : undefined;
}

interface FabricSpecificationFieldsProps {
  value: FabricSpecificationForm;
  onChange: (value: FabricSpecificationForm) => void;
}

const textFields: { key: Exclude<keyof FabricSpecificationForm, "fibrePercentages" | "weightGsm">; label: string; placeholder: string; maxLength: number }[] = [
  { key: "fabricName", label: "Fabric name", placeholder: "e.g. Irish linen", maxLength: 200 },
  { key: "composition", label: "Composition", placeholder: "e.g. 100% linen", maxLength: 200 },
  { key: "weave", label: "Weave", placeholder: "e.g. plain weave", maxLength: 100 },
  { key: "texture", label: "Texture", placeholder: "e.g. softly slubbed", maxLength: 120 },
  { key: "stretch", label: "Stretch", placeholder: "e.g. no stretch", maxLength: 120 },
  { key: "origin", label: "Origin", placeholder: "e.g. India", maxLength: 120 },
  { key: "finish", label: "Finish", placeholder: "e.g. garment washed", maxLength: 120 },
  { key: "fit", label: "Fit", placeholder: "e.g. relaxed", maxLength: 120 },
  { key: "pattern", label: "Pattern", placeholder: "e.g. solid", maxLength: 120 },
  { key: "colour", label: "Colour", placeholder: "e.g. deep indigo", maxLength: 120 },
];

export function FabricSpecificationFields({ value, onChange }: FabricSpecificationFieldsProps) {
  const updateText = (
    key: Exclude<keyof FabricSpecificationForm, "fibrePercentages" | "weightGsm">,
    nextValue: string
  ) => onChange({ ...value, [key]: nextValue });

  return (
    <div className="space-y-4 border-t border-border pt-4">
      <h3 className="text-xs font-semibold uppercase tracking-caps text-muted">
        Fabric specifications
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {textFields.map((field) => (
          <label key={field.key} className="block space-y-1 text-[10px] uppercase tracking-caps text-muted">
            {field.label}
            <input
              value={value[field.key]}
              onChange={(event) => updateText(field.key, event.target.value)}
              maxLength={field.maxLength}
              placeholder={field.placeholder}
              className="w-full border border-border bg-canvas p-2.5 text-xs normal-case tracking-normal text-ink focus:border-gold focus:outline-none"
            />
          </label>
        ))}
        <label className="block space-y-1 text-[10px] uppercase tracking-caps text-muted">
          Weight (GSM)
          <input
            type="number"
            min="1"
            max="2000"
            step="1"
            value={value.weightGsm}
            onChange={(event) => onChange({ ...value, weightGsm: event.target.value })}
            placeholder="e.g. 220"
            className="w-full border border-border bg-canvas p-2.5 text-xs normal-case tracking-normal text-ink focus:border-gold focus:outline-none"
          />
        </label>
      </div>
      <fieldset className="space-y-2">
        <legend className="text-[10px] uppercase tracking-caps text-muted">
          Fibre percentages (must total 100%)
        </legend>
        {value.fibrePercentages.map((fibre, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              value={fibre.fibre}
              onChange={(event) => {
                const next = [...value.fibrePercentages];
                next[index] = { ...fibre, fibre: event.target.value };
                onChange({ ...value, fibrePercentages: next });
              }}
              maxLength={60}
              aria-label={`Fibre ${index + 1} name`}
              placeholder="Fibre name"
              className="min-w-0 flex-1 border border-border bg-canvas p-2.5 text-xs text-ink focus:border-gold focus:outline-none"
            />
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              value={fibre.percentage}
              onChange={(event) => {
                const next = [...value.fibrePercentages];
                next[index] = { ...fibre, percentage: event.target.value };
                onChange({ ...value, fibrePercentages: next });
              }}
              aria-label={`Fibre ${index + 1} percentage`}
              className="w-24 border border-border bg-canvas p-2.5 text-xs text-ink focus:border-gold focus:outline-none"
            />
            <span className="text-xs text-muted">%</span>
            <button
              type="button"
              onClick={() => onChange({
                ...value,
                fibrePercentages: value.fibrePercentages.filter((_, itemIndex) => itemIndex !== index),
              })}
              aria-label={`Remove fibre ${index + 1}`}
              className="px-2 py-1 text-xs text-rust"
            >
              Remove
            </button>
          </div>
        ))}
        {value.fibrePercentages.length < 8 && (
          <button
            type="button"
            onClick={() => onChange({
              ...value,
              fibrePercentages: [...value.fibrePercentages, { fibre: "", percentage: "" }],
            })}
            className="text-xs font-medium text-gold hover:underline"
          >
            + Add fibre
          </button>
        )}
      </fieldset>
    </div>
  );
}
