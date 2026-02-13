import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, writeFile, mkdir, symlink, lstat } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { ensureDir, copyFile, fileExists, listJsonFiles, readFile, createSymlink, isSymlink, readSymlink, removeFile } from "./fs";

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

  describe("readFile", () => {
    test("應讀取檔案內容", async () => {
      const filePath = join(tempDir, "test.json");
      const content = '{"key": "value"}';
      await writeFile(filePath, content);

      const result = await readFile(filePath);
      expect(result).toBe(content);
    });

    test("檔案不存在時應拋出錯誤", async () => {
      const filePath = join(tempDir, "not-exists.json");
      await expect(readFile(filePath)).rejects.toThrow();
    });
  });

  describe("createSymlink", () => {
    test("應建立指向目標的符號連結", async () => {
      const target = join(tempDir, "target.json");
      const linkPath = join(tempDir, "link.json");
      await writeFile(target, '{"key":"value"}');

      await createSymlink(target, linkPath);

      const stats = await lstat(linkPath);
      expect(stats.isSymbolicLink()).toBe(true);
      // 透過連結讀取應得到目標內容
      const content = await readFile(linkPath);
      expect(content).toBe('{"key":"value"}');
    });
  });

  describe("isSymlink", () => {
    test("符號連結應回傳 true", async () => {
      const target = join(tempDir, "target.json");
      const linkPath = join(tempDir, "link.json");
      await writeFile(target, "{}");
      await symlink(target, linkPath);

      expect(await isSymlink(linkPath)).toBe(true);
    });

    test("一般檔案應回傳 false", async () => {
      const filePath = join(tempDir, "regular.json");
      await writeFile(filePath, "{}");

      expect(await isSymlink(filePath)).toBe(false);
    });

    test("路徑不存在應回傳 false", async () => {
      const filePath = join(tempDir, "not-exists.json");
      expect(await isSymlink(filePath)).toBe(false);
    });

    test("損壞的符號連結應回傳 true", async () => {
      const target = join(tempDir, "deleted.json");
      const linkPath = join(tempDir, "broken-link.json");
      await writeFile(target, "{}");
      await symlink(target, linkPath);
      await rm(target); // 刪除目標，造成損壞連結

      expect(await isSymlink(linkPath)).toBe(true);
    });
  });

  describe("readSymlink", () => {
    test("應回傳符號連結指向的目標路徑", async () => {
      const target = join(tempDir, "target.json");
      const linkPath = join(tempDir, "link.json");
      await writeFile(target, "{}");
      await symlink(target, linkPath);

      const result = await readSymlink(linkPath);
      expect(result).toBe(target);
    });
  });

  describe("removeFile", () => {
    test("應刪除一般檔案", async () => {
      const filePath = join(tempDir, "file.json");
      await writeFile(filePath, "{}");

      await removeFile(filePath);

      expect(await fileExists(filePath)).toBe(false);
    });

    test("應刪除符號連結但不影響目標檔案", async () => {
      const target = join(tempDir, "target.json");
      const linkPath = join(tempDir, "link.json");
      await writeFile(target, '{"data":true}');
      await symlink(target, linkPath);

      await removeFile(linkPath);

      expect(await fileExists(linkPath)).toBe(false);
      // 目標檔案應仍存在
      expect(await fileExists(target)).toBe(true);
      const content = await readFile(target);
      expect(content).toBe('{"data":true}');
    });

    test("應能刪除損壞的符號連結", async () => {
      const target = join(tempDir, "deleted.json");
      const linkPath = join(tempDir, "broken-link.json");
      await writeFile(target, "{}");
      await symlink(target, linkPath);
      await rm(target); // 損壞連結

      await removeFile(linkPath);

      expect(await isSymlink(linkPath)).toBe(false);
    });
  });
});
