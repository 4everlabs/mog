export type PaneId = "chat" | "console";
export type ChatRole = "assistant" | "user";

export interface ChatMessageViewModel {
  id: string;
  role: ChatRole;
  content: string;
}

export const tokens = {
  bg: "#000000",
  bgSoft: "#0a0a0a",
  panel: "#000000",
  panelSoft: "#05070a",
  border: "#17314b",
  borderStrong: "#68b5fc",
  blue: "#68b5fc",
  yellow: "#e0af68",
  red: "#f7768e",
  text: "#d4d4d4",
  muted: "#666666",
  line: "#2a2116",
  assistantBubble: "#071019",
  userBubble: "#0b0b0d",
} as const;

export const truncateMiddle = (value: string, maxLength: number): string => {
  if (value.length <= maxLength) {
    return value;
  }

  const visible = Math.max(6, maxLength - 3);
  const left = Math.ceil(visible / 2);
  const right = Math.floor(visible / 2);
  return `${value.slice(0, left)}...${value.slice(-right)}`;
};

export const formatEventTime = (value: string): string => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
};

export const isCompactLayout = (width: number, height: number): boolean =>
  width < 110 || height < 28;

export const isStackedLayout = (width: number): boolean =>
  width < 70;
