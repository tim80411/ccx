import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdir, writeFile, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import {
  areFilesIdentical,
  generateUnifiedDiff,
  generateSemanticDiff,
} from "./diff";

describe("diff utilities", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `ccx-diff-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe("areFilesIdentical", () => {
    test("returns true for identical content", async () => {
      const file1 = join(testDir, "a.json");
      const file2 = join(testDir, "b.json");
      const content = JSON.stringify({ key: "value" }, null, 2);
      await writeFile(file1, content);
      await writeFile(file2, content);

      expect(await areFilesIdentical(file1, file2)).toBe(true);
    });

    test("returns true for semantically identical JSON with different formatting", async () => {
      const file1 = join(testDir, "a.json");
      const file2 = join(testDir, "b.json");
      await writeFile(file1, JSON.stringify({ key: "value" }, null, 2));
      await writeFile(file2, JSON.stringify({ key: "value" })); // compact

      expect(await areFilesIdentical(file1, file2)).toBe(true);
    });

    test("returns false for different content", async () => {
      const file1 = join(testDir, "a.json");
      const file2 = join(testDir, "b.json");
      await writeFile(file1, JSON.stringify({ key: "value1" }));
      await writeFile(file2, JSON.stringify({ key: "value2" }));

      expect(await areFilesIdentical(file1, file2)).toBe(false);
    });

    test("returns false when keys differ", async () => {
      const file1 = join(testDir, "a.json");
      const file2 = join(testDir, "b.json");
      await writeFile(file1, JSON.stringify({ a: 1 }));
      await writeFile(file2, JSON.stringify({ b: 1 }));

      expect(await areFilesIdentical(file1, file2)).toBe(false);
    });
  });

  describe("generateUnifiedDiff", () => {
    test("returns empty string for identical files", async () => {
      const file1 = join(testDir, "a.json");
      const file2 = join(testDir, "b.json");
      const content = JSON.stringify({ key: "value" }, null, 2);
      await writeFile(file1, content);
      await writeFile(file2, content);

      const result = await generateUnifiedDiff(file1, "left", file2, "right");
      expect(result).toBe("");
    });

    test("returns diff with headers for different files", async () => {
      const file1 = join(testDir, "a.json");
      const file2 = join(testDir, "b.json");
      await writeFile(file1, JSON.stringify({ key: "old" }, null, 2));
      await writeFile(file2, JSON.stringify({ key: "new" }, null, 2));

      const result = await generateUnifiedDiff(file1, "left", file2, "right");
      expect(result).toContain("--- left");
      expect(result).toContain("+++ right");
      expect(result).toContain("-");
      expect(result).toContain("+");
    });

    test("shows added keys", async () => {
      const file1 = join(testDir, "a.json");
      const file2 = join(testDir, "b.json");
      await writeFile(file1, JSON.stringify({}, null, 2));
      await writeFile(file2, JSON.stringify({ newKey: "value" }, null, 2));

      const result = await generateUnifiedDiff(file1, "left", file2, "right");
      expect(result).toContain("newKey");
    });

    test("shows removed keys", async () => {
      const file1 = join(testDir, "a.json");
      const file2 = join(testDir, "b.json");
      await writeFile(file1, JSON.stringify({ oldKey: "value" }, null, 2));
      await writeFile(file2, JSON.stringify({}, null, 2));

      const result = await generateUnifiedDiff(file1, "left", file2, "right");
      expect(result).toContain("oldKey");
    });
  });

  describe("generateSemanticDiff", () => {
    test("returns empty string for identical files", async () => {
      const file1 = join(testDir, "a.json");
      const file2 = join(testDir, "b.json");
      const content = JSON.stringify({ key: "value" }, null, 2);
      await writeFile(file1, content);
      await writeFile(file2, content);

      const result = await generateSemanticDiff(file1, "left", file2, "right");
      expect(result).toBe("");
    });

    test("shows added keys with green color code", async () => {
      const file1 = join(testDir, "a.json");
      const file2 = join(testDir, "b.json");
      await writeFile(file1, JSON.stringify({}, null, 2));
      await writeFile(file2, JSON.stringify({ newKey: "value" }, null, 2));

      const result = await generateSemanticDiff(file1, "left", file2, "right");
      expect(result).toContain("Added");
      expect(result).toContain("newKey");
    });

    test("shows removed keys with red color code", async () => {
      const file1 = join(testDir, "a.json");
      const file2 = join(testDir, "b.json");
      await writeFile(file1, JSON.stringify({ oldKey: "value" }, null, 2));
      await writeFile(file2, JSON.stringify({}, null, 2));

      const result = await generateSemanticDiff(file1, "left", file2, "right");
      expect(result).toContain("Removed");
      expect(result).toContain("oldKey");
    });

    test("shows modified values", async () => {
      const file1 = join(testDir, "a.json");
      const file2 = join(testDir, "b.json");
      await writeFile(file1, JSON.stringify({ key: "old" }, null, 2));
      await writeFile(file2, JSON.stringify({ key: "new" }, null, 2));

      const result = await generateSemanticDiff(file1, "left", file2, "right");
      expect(result).toContain("Modified");
      expect(result).toContain("key");
      expect(result).toContain("old");
      expect(result).toContain("new");
    });

    test("shows nested key paths", async () => {
      const file1 = join(testDir, "a.json");
      const file2 = join(testDir, "b.json");
      await writeFile(
        file1,
        JSON.stringify({ parent: { child: "old" } }, null, 2)
      );
      await writeFile(
        file2,
        JSON.stringify({ parent: { child: "new" } }, null, 2)
      );

      const result = await generateSemanticDiff(file1, "left", file2, "right");
      expect(result).toContain("parent.child");
    });
  });
});
