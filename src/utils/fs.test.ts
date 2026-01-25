import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, writeFile, mkdir } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { ensureDir, copyFile, fileExists, listJsonFiles } from "./fs";

describe("fs", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "ccx-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("ensureDir", () => {
    test("應確保目錄存在（建立新目錄）", async () => {
      const newDir = join(tempDir, "new", "nested", "dir");
      await ensureDir(newDir);
      expect(await fileExists(newDir)).toBe(true);
    });

    test("對已存在的目錄不應拋出錯誤", async () => {
      await ensureDir(tempDir);
      expect(await fileExists(tempDir)).toBe(true);
    });
  });

  describe("copyFile", () => {
    test("應正確複製檔案", async () => {
      const src = join(tempDir, "source.json");
      const dest = join(tempDir, "dest.json");
      const content = JSON.stringify({ test: "data" });

      await writeFile(src, content);
      await copyFile(src, dest);

      const destContent = await Bun.file(dest).text();
      expect(destContent).toBe(content);
    });

    test("應覆蓋已存在的目標檔案", async () => {
      const src = join(tempDir, "source.json");
      const dest = join(tempDir, "dest.json");

      await writeFile(src, "new content");
      await writeFile(dest, "old content");
      await copyFile(src, dest);

      const destContent = await Bun.file(dest).text();
      expect(destContent).toBe("new content");
    });
  });

  describe("fileExists", () => {
    test("檔案存在時應回傳 true", async () => {
      const filePath = join(tempDir, "exists.json");
      await writeFile(filePath, "{}");
      expect(await fileExists(filePath)).toBe(true);
    });

    test("檔案不存在時應回傳 false", async () => {
      const filePath = join(tempDir, "not-exists.json");
      expect(await fileExists(filePath)).toBe(false);
    });

    test("目錄存在時應回傳 true", async () => {
      expect(await fileExists(tempDir)).toBe(true);
    });
  });

  describe("listJsonFiles", () => {
    test("應列出 .json 檔案（排除 previous.json）", async () => {
      await writeFile(join(tempDir, "work.json"), "{}");
      await writeFile(join(tempDir, "personal.json"), "{}");
      await writeFile(join(tempDir, "previous.json"), "{}");
      await writeFile(join(tempDir, "readme.txt"), "text");

      const files = await listJsonFiles(tempDir);

      expect(files).toContain("work");
      expect(files).toContain("personal");
      expect(files).not.toContain("previous");
      expect(files).not.toContain("readme");
      expect(files.length).toBe(2);
    });

    test("空目錄應回傳空陣列", async () => {
      const emptyDir = join(tempDir, "empty");
      await mkdir(emptyDir);
      const files = await listJsonFiles(emptyDir);
      expect(files).toEqual([]);
    });

    test("目錄不存在時應回傳空陣列", async () => {
      const nonExistDir = join(tempDir, "non-exist");
      const files = await listJsonFiles(nonExistDir);
      expect(files).toEqual([]);
    });
  });
});
