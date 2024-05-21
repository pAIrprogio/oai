import readline from "readline";

function deleteLastLinesFromTerminal(count: number) {
  if (count === 0) return;

  for (let i = 0; i < count; i++) {
    readline.clearLine(process.stdout, 0);
    readline.moveCursor(process.stdout, 0, -1);
  }
  readline.cursorTo(process.stdout, 0);
}

export function deleteLastTextFromTerminal(text: string) {
  const lines = text.split("\n");
  deleteLastLinesFromTerminal(lines.length - 1);
}
