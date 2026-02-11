import * as fsp from "fs/promises";
import { resolve } from "path";
import { CommandModule } from "yargs";

import { compileIncludes, compilePlaceholders } from "../migration";
import { parseSettings, Settings } from "../settings";
import { CommonArgv, getSettings, readStdin } from "./_common";

interface CompileArgv extends CommonArgv {
  shadow?: boolean;
}

export async function compile(
  settings: Settings,
  content: string,
  filename: string,
  shadow = false,
): Promise<string> {
  const parsedSettings = await parseSettings(settings, shadow);
  const parsedContent = await compileIncludes(
    parsedSettings,
    content,
    new Set([filename]),
  );
  return compilePlaceholders(parsedSettings, parsedContent, shadow);
}

export const compileCommand: CommandModule<
  Record<string, never>,
  CompileArgv
> = {
  command: "compile [file]",
  aliases: [],
  describe: `\
Compiles a SQL file, resolving includes, inserting all the placeholders and returning the result to STDOUT`,
  builder: {
    shadow: {
      type: "boolean",
      default: false,
      description: "Apply shadow DB placeholders (for development).",
    },
  },
  handler: async (argv) => {
    const settings = await getSettings({ configFile: argv.config });
    const { content, filename } =
      typeof argv.file === "string"
        ? {
            filename: resolve(argv.file),
            content: await fsp.readFile(argv.file, "utf8"),
          }
        : { filename: "stdin", content: await readStdin() };

    const compiled = await compile(settings, content, filename, argv.shadow);

    // eslint-disable-next-line no-console
    console.log(compiled);
  },
};
