import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import MessageList from "./MessageList.js";
import type { ChatMessage } from "../lib/types.js";

const userMessage: ChatMessage = {
  id: "u1",
  role: "user",
  text: "primeira",
  tools: [],
  createdAt: 1,
};

const assistantMessage: ChatMessage = {
  id: "a1",
  role: "assistant",
  text: "resposta",
  tools: [],
  createdAt: 2,
};

function setupScroll(height = 1200, viewport = 400, start = 800) {
  const scroller = screen.getByTestId("message-scroller");
  let scrollTop = start;
  Object.defineProperty(scroller, "scrollHeight", { configurable: true, value: height });
  Object.defineProperty(scroller, "clientHeight", { configurable: true, value: viewport });
  Object.defineProperty(scroller, "scrollTop", {
    configurable: true,
    get: () => scrollTop,
    set: (value: number) => {
      scrollTop = value;
    },
  });
  return {
    scroller,
    get scrollTop() {
      return scrollTop;
    },
  };
}

describe("MessageList rolagem automática", () => {
  it("desce quando chega mensagem do modelo com a tela no fim", () => {
    const { rerender } = render(<MessageList busy={false} messages={[userMessage]} pending={[]} session={null} />);
    const scroll = setupScroll();

    rerender(<MessageList busy={false} messages={[userMessage, assistantMessage]} pending={[]} session={null} />);

    expect(scroll.scrollTop).toBe(1200);
  });

  it("desce quando chega mensagem do usuário com a tela no fim", () => {
    const { rerender } = render(<MessageList busy={false} messages={[assistantMessage]} pending={[]} session={null} />);
    const scroll = setupScroll(600, 400, 200);

    rerender(<MessageList busy={false} messages={[assistantMessage, userMessage]} pending={[]} session={null} />);

    expect(scroll.scrollTop).toBe(600);
  });

  it("não puxa a tela quando o usuário está lendo mais acima", () => {
    const { rerender } = render(<MessageList busy={false} messages={[userMessage]} pending={[]} session={null} />);
    const scroll = setupScroll(1200, 400, 0);

    fireEvent.scroll(scroll.scroller);
    rerender(<MessageList busy={false} messages={[userMessage, assistantMessage]} pending={[]} session={null} />);

    expect(scroll.scrollTop).toBe(0);
  });

  it("desce ao enviar um ditado mesmo com a tela acima", () => {
    const { rerender } = render(<MessageList busy={false} messages={[userMessage]} pending={[]} session={null} />);
    const scroll = setupScroll(1200, 400, 0);

    fireEvent.scroll(scroll.scroller);
    rerender(<MessageList busy={false} messages={[userMessage]} pending={["novo ditado"]} session={null} />);

    expect(scroll.scrollTop).toBe(1200);
  });

  it("renderiza markdown do assistente sem mostrar asteriscos crus", () => {
    render(
      <MessageList
        busy={false}
        messages={[{ id: "a", role: "assistant", text: "**negrito** e `codigo`", tools: [], createdAt: 1 }]}
        pending={[]}
        session={null}
      />,
    );
    expect(screen.getByText("negrito").tagName.toLowerCase()).toBe("strong");
    expect(screen.getByText("codigo").tagName.toLowerCase()).toBe("code");
    expect(screen.queryByText("**negrito** e `codigo`")).toBeNull();
  });

  it("mostra indicador de pensando quando busy", () => {
    render(<MessageList busy={true} messages={[userMessage]} pending={[]} session={null} />);
    expect(screen.getByText("Pensando…")).toBeTruthy();
  });
});
