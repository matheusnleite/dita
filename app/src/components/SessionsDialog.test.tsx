// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SessionsDialog from "./SessionsDialog.js";

vi.mock("../lib/api.js", () => ({
  api: {
    sessions: vi.fn().mockResolvedValue({
      sessions: [
        { id: "ses_1", title: "Conversa atual", directory: "/tmp/projeto" },
        { id: "ses_2", title: "Outra conversa", directory: "/tmp/projeto" },
      ],
    }),
    selectSession: vi.fn().mockResolvedValue({
      session: { id: "ses_2", directory: "/tmp/projeto", createdAt: 1, title: "Outra conversa" },
    }),
    renameSession: vi.fn().mockResolvedValue({ ok: true, title: "Renomeada" }),
    deleteSession: vi.fn().mockResolvedValue({ ok: true }),
  },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("SessionsDialog", () => {
  it("mostra ação primária para criar nova sessão", async () => {
    const onNewSession = vi.fn();
    render(
      <SessionsDialog
        currentId="ses_1"
        onClose={vi.fn()}
        onSelect={vi.fn()}
        onNewSession={onNewSession}
        onDeleted={vi.fn()}
      />,
    );

    const button = await screen.findByRole("button", { name: "Nova sessão" });
    fireEvent.click(button);

    expect(onNewSession).toHaveBeenCalledTimes(1);
  });

  it("abre sessão selecionada", async () => {
    const onSelect = vi.fn();
    render(
      <SessionsDialog
        currentId="ses_1"
        onClose={vi.fn()}
        onSelect={onSelect}
        onNewSession={vi.fn()}
        onDeleted={vi.fn()}
      />,
    );

    await screen.findByText("Outra conversa");
    const openButtons = screen.getAllByRole("button", { name: "Abrir" });
    const enabled = openButtons.find((button) => !button.hasAttribute("disabled"));
    expect(enabled).toBeDefined();
    fireEvent.click(enabled!);

    await waitFor(() => {
      expect(onSelect).toHaveBeenCalledWith({
        id: "ses_2",
        directory: "/tmp/projeto",
        createdAt: 1,
        title: "Outra conversa",
      });
    });
  });

  it("exclui sessão após confirmação", async () => {
    const onDeleted = vi.fn();
    render(
      <SessionsDialog
        currentId="ses_1"
        onClose={vi.fn()}
        onSelect={vi.fn()}
        onNewSession={vi.fn()}
        onDeleted={onDeleted}
      />,
    );

    await screen.findByText("Outra conversa");
    const deleteButtons = screen.getAllByRole("button", { name: "Excluir" });
    fireEvent.click(deleteButtons[1]!);
    fireEvent.click(screen.getByRole("button", { name: "Confirmar exclusão" }));

    await waitFor(() => {
      expect(onDeleted).toHaveBeenCalledWith("ses_2");
    });
    await waitFor(() => {
      expect(screen.queryByText("Outra conversa")).toBeNull();
    });
  });
});
