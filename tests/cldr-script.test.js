import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// Extract the AWK program from the shell script.
const scriptPath = join(import.meta.dirname, "..", "scripts", "generate_emoji_cldr.sh");
const scriptSource = readFileSync(scriptPath, "utf-8");
const awkMatch = scriptSource.match(/if ! awk '([\s\S]+?)' "\$LOCAL_EMOJI_TEST_PATH"/);
if (!awkMatch) throw new Error("Could not extract AWK program from generate_emoji_cldr.sh");
const AWK_PROGRAM = awkMatch[1];

/**
 * Run the AWK program against the given input string and return stdout.
 */
function runAwk(input) {
  const tmp = mkdtempSync(join(tmpdir(), "cldr-test-"));
  const inputFile = join(tmp, "emoji-test.txt");
  try {
    writeFileSync(inputFile, input, "utf-8");
    const stdout = execFileSync("awk", [AWK_PROGRAM, inputFile], {
      encoding: "utf-8",
      timeout: 10_000,
    });
    return stdout;
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

describe("CLDR generation AWK parser", () => {
  it("parses valid emoji-test.txt lines into correct JSON", () => {
    const input = [
      "# This is a comment",
      "",
      "1F600 ; fully-qualified # 😀 E1.0 grinning face",
      "1F602 ; fully-qualified # 😂 E0.6 face with tears of joy",
    ].join("\n");

    const output = runAwk(input);
    const entries = JSON.parse(output);

    expect(entries).toHaveLength(2);

    expect(entries[0].emoji).toBe("😀");
    expect(entries[0].name).toBe("grinning face");
    expect(entries[0].keywords).toEqual(["grinning", "face"]);

    expect(entries[1].emoji).toBe("😂");
    expect(entries[1].name).toBe("face with tears of joy");
    expect(entries[1].keywords).toEqual(["face", "with", "tears", "of", "joy"]);
  });

  it("exits non-zero when input has no parseable emoji lines", () => {
    const input = [
      "# group: Smileys & Emotion",
      "# subgroup: face-smiling",
      "",
    ].join("\n");

    expect(() => runAwk(input)).toThrow();
  });

  it("deduplicates keywords and lowercases them", () => {
    // "face face" would produce duplicate "face" keywords — AWK should deduplicate.
    const input =
      "1F600 ; fully-qualified # 😀 E1.0 face face smiling";

    const output = runAwk(input);
    const entries = JSON.parse(output);

    expect(entries).toHaveLength(1);
    expect(entries[0].keywords).toEqual(["face", "smiling"]);
  });

  it("produces valid JSON with >1000 entries from the real emoji-test.txt", () => {
    const localFile = join(
      import.meta.dirname,
      "..",
      "frontend",
      "public",
      "emoji-test.txt"
    );
    let fileContent;
    try {
      fileContent = readFileSync(localFile, "utf-8");
    } catch {
      // Skip if the cached file does not exist.
      console.warn("Skipping: frontend/public/emoji-test.txt not found");
      return;
    }

    const tmp = mkdtempSync(join(tmpdir(), "cldr-full-"));
    const inputFile = join(tmp, "emoji-test.txt");
    try {
      writeFileSync(inputFile, fileContent, "utf-8");
      const stdout = execFileSync("awk", [AWK_PROGRAM, inputFile], {
        encoding: "utf-8",
        timeout: 30_000,
      });
      const entries = JSON.parse(stdout);

      expect(entries.length).toBeGreaterThan(1000);

      for (const entry of entries) {
        expect(entry).toHaveProperty("emoji");
        expect(entry).toHaveProperty("name");
        expect(entry).toHaveProperty("keywords");
        expect(entry.emoji).toBeTruthy();
        expect(entry.name).toBeTruthy();
        expect(Array.isArray(entry.keywords)).toBe(true);
        expect(entry.keywords.length).toBeGreaterThan(0);
      }
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
