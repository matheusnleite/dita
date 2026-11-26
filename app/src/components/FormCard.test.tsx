// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import FormCard from "./FormCard.js";
import type { FormRequest } from "../lib/types.js";

afterEach(() => {
  cleanup();
});

const baseForm: FormRequest = {
  id: "frm_1",
  sessionID: "ses_1",
  title: "Pergunta",
  fields: [
    {
      key: "modo",
      type: "string",
      title: "Modo",
      required: true,
      options: [
        { value: "a", label: "Opção A" },
        { value: "b", label: "Opção B" },
      ],
      custom: true,
    },
  ],
};

describe("FormCard", () => {
  it("envia opção selecionada", async () => {
    const onReply = vi.fn().mockResolvedValue(undefined);
    render(<FormCard form={baseForm} onReply={onReply} onCancel={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Opção B" }));
    fireEvent.click(screen.getByRole("button", { name: "Responder" }));

    await waitFor(() => {
      expect(onReply).toHaveBeenCalledWith("ses_1", "frm_1", { modo: "b" });
    });
  });

  it("permite resposta livre quando custom=true", async () => {
    const onReply = vi.fn().mockResolvedValue(undefined);
    render(<FormCard form={baseForm} onReply={onReply} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText("Outra resposta…"), {
      target: { value: "minha resposta" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Responder" }));

    await waitFor(() => {
      expect(onReply).toHaveBeenCalledWith("ses_1", "frm_1", { modo: "minha resposta" });
    });
  });

  it("cancela formulário", async () => {
    const onCancel = vi.fn().mockResolvedValue(undefined);
    render(<FormCard form={baseForm} onReply={vi.fn()} onCancel={onCancel} />);

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    await waitFor(() => {
      expect(onCancel).toHaveBeenCalledWith("ses_1", "frm_1");
    });
  });
});