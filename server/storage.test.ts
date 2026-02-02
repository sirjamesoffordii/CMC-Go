import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Test-only globals interface for mock ENV values
interface TestGlobals {
  __testForgeApiUrl?: string;
  __testForgeApiKey?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test mock pattern for globalThis
const testGlobals = globalThis as unknown as TestGlobals;

// Mock the ENV module with factory function
vi.mock("./_core/env", () => {
  return {
    ENV: {
      get forgeApiUrl() {
        return testGlobals.__testForgeApiUrl ?? "https://api.example.com/forge";
      },
      get forgeApiKey() {
        return testGlobals.__testForgeApiKey ?? "test-api-key-12345";
      },
    },
  };
});

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Import after mocking
import { storagePut, storageGet } from "./storage";

// Helper to set mock ENV values
function setMockEnv(url: string, key: string) {
  testGlobals.__testForgeApiUrl = url;
  testGlobals.__testForgeApiKey = key;
}

function resetMockEnv() {
  testGlobals.__testForgeApiUrl = "https://api.example.com/forge";
  testGlobals.__testForgeApiKey = "test-api-key-12345";
}

describe("storage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset ENV to valid values
    resetMockEnv();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetMockEnv();
  });

  describe("getStorageConfig", () => {
    it("throws error when forgeApiUrl is missing", async () => {
      setMockEnv("", "test-key");

      await expect(storagePut("test/file.txt", "content")).rejects.toThrow(
        "Storage proxy credentials missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY"
      );
    });

    it("throws error when forgeApiKey is missing", async () => {
      setMockEnv("https://api.example.com", "");

      await expect(storagePut("test/file.txt", "content")).rejects.toThrow(
        "Storage proxy credentials missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY"
      );
    });

    it("throws error when both credentials are missing", async () => {
      setMockEnv("", "");

      await expect(storageGet("test/file.txt")).rejects.toThrow(
        "Storage proxy credentials missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY"
      );
    });
  });

  describe("storagePut", () => {
    it("uploads string data successfully", async () => {
      const mockUrl = "https://storage.example.com/uploaded/file.txt";
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ url: mockUrl }),
      });

      const result = await storagePut(
        "uploads/file.txt",
        "file content",
        "text/plain"
      );

      expect(result).toEqual({
        key: "uploads/file.txt",
        url: mockUrl,
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url.toString()).toContain("v1/storage/upload");
      expect(url.toString()).toContain("path=uploads%2Ffile.txt");
      expect(options.method).toBe("POST");
      expect(options.headers.Authorization).toBe("Bearer test-api-key-12345");
      expect(options.body).toBeInstanceOf(FormData);
    });

    it("uploads Buffer data successfully", async () => {
      const mockUrl = "https://storage.example.com/uploaded/binary.bin";
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ url: mockUrl }),
      });

      const buffer = Buffer.from([0x01, 0x02, 0x03, 0x04]);
      const result = await storagePut("binary.bin", buffer);

      expect(result).toEqual({
        key: "binary.bin",
        url: mockUrl,
      });
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("uploads Uint8Array data successfully", async () => {
      const mockUrl = "https://storage.example.com/uploaded/array.bin";
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ url: mockUrl }),
      });

      const uint8Array = new Uint8Array([0x05, 0x06, 0x07, 0x08]);
      const result = await storagePut(
        "array.bin",
        uint8Array,
        "application/octet-stream"
      );

      expect(result).toEqual({
        key: "array.bin",
        url: mockUrl,
      });
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("normalizes key by removing leading slashes", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ url: "https://example.com/file.txt" }),
      });

      const result = await storagePut("///path/to/file.txt", "content");

      expect(result.key).toBe("path/to/file.txt");
      const [url] = mockFetch.mock.calls[0];
      expect(url.toString()).toContain("path=path%2Fto%2Ffile.txt");
    });

    it("uses default content type when not specified", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ url: "https://example.com/file" }),
      });

      await storagePut("file", "content");

      const [, options] = mockFetch.mock.calls[0];
      expect(options.body).toBeInstanceOf(FormData);
    });

    it("throws error on upload failure with text error message", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: "Forbidden",
        text: async () => "Access denied: invalid API key",
      });

      await expect(storagePut("file.txt", "content")).rejects.toThrow(
        "Storage upload failed (403 Forbidden): Access denied: invalid API key"
      );
    });

    it("throws error on upload failure with status text when text() fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        text: async () => {
          throw new Error("Cannot read body");
        },
      });

      await expect(storagePut("file.txt", "content")).rejects.toThrow(
        "Storage upload failed (500 Internal Server Error): Internal Server Error"
      );
    });

    it("handles URL with trailing slash in baseUrl", async () => {
      setMockEnv("https://api.example.com/forge/", "test-api-key-12345");
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ url: "https://example.com/file.txt" }),
      });

      await storagePut("file.txt", "content");

      const [url] = mockFetch.mock.calls[0];
      expect(url.toString()).toBe(
        "https://api.example.com/forge/v1/storage/upload?path=file.txt"
      );
    });

    it("handles URL without trailing slash in baseUrl", async () => {
      setMockEnv("https://api.example.com/forge", "test-api-key-12345");
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ url: "https://example.com/file.txt" }),
      });

      await storagePut("file.txt", "content");

      const [url] = mockFetch.mock.calls[0];
      expect(url.toString()).toBe(
        "https://api.example.com/forge/v1/storage/upload?path=file.txt"
      );
    });

    it("extracts filename from path for form data", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ url: "https://example.com/deep/file.txt" }),
      });

      await storagePut("deep/nested/path/myfile.txt", "content");

      const [, options] = mockFetch.mock.calls[0];
      const formData = options.body as FormData;
      const file = formData.get("file") as File;
      expect(file.name).toBe("myfile.txt");
    });

    it("uses key as filename when no path separator exists", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ url: "https://example.com/simple.txt" }),
      });

      await storagePut("simple.txt", "content");

      const [, options] = mockFetch.mock.calls[0];
      const formData = options.body as FormData;
      const file = formData.get("file") as File;
      expect(file.name).toBe("simple.txt");
    });
  });

  describe("storageGet", () => {
    it("retrieves download URL successfully", async () => {
      const mockDownloadUrl =
        "https://cdn.example.com/signed/file.txt?token=abc";
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ url: mockDownloadUrl }),
      });

      const result = await storageGet("documents/file.txt");

      expect(result).toEqual({
        key: "documents/file.txt",
        url: mockDownloadUrl,
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url.toString()).toContain("v1/storage/downloadUrl");
      expect(url.toString()).toContain("path=documents%2Ffile.txt");
      expect(options.method).toBe("GET");
      expect(options.headers.Authorization).toBe("Bearer test-api-key-12345");
    });

    it("normalizes key by removing leading slashes", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ url: "https://cdn.example.com/file" }),
      });

      const result = await storageGet("//leading/slashes/file.txt");

      expect(result.key).toBe("leading/slashes/file.txt");
    });

    it("handles baseUrl with trailing slash", async () => {
      setMockEnv("https://api.example.com/forge/", "test-api-key-12345");
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ url: "https://cdn.example.com/file" }),
      });

      await storageGet("file.txt");

      const [url] = mockFetch.mock.calls[0];
      expect(url.toString()).toBe(
        "https://api.example.com/forge/v1/storage/downloadUrl?path=file.txt"
      );
    });

    it("handles baseUrl without trailing slash", async () => {
      setMockEnv("https://api.example.com/forge", "test-api-key-12345");
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ url: "https://cdn.example.com/file" }),
      });

      await storageGet("file.txt");

      const [url] = mockFetch.mock.calls[0];
      expect(url.toString()).toBe(
        "https://api.example.com/forge/v1/storage/downloadUrl?path=file.txt"
      );
    });

    it("retrieves URL for nested paths", async () => {
      const mockUrl = "https://cdn.example.com/deep/nested/file.pdf";
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ url: mockUrl }),
      });

      const result = await storageGet("deep/nested/path/file.pdf");

      expect(result.url).toBe(mockUrl);
      expect(result.key).toBe("deep/nested/path/file.pdf");
    });
  });

  describe("helper functions (tested through exports)", () => {
    it("normalizeKey handles multiple leading slashes", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ url: "https://example.com/file" }),
      });

      const result = await storagePut("/////multiple/slashes.txt", "content");
      expect(result.key).toBe("multiple/slashes.txt");
    });

    it("normalizeKey handles no leading slashes", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ url: "https://example.com/file" }),
      });

      const result = await storagePut("no/leading/slash.txt", "content");
      expect(result.key).toBe("no/leading/slash.txt");
    });

    it("ensureTrailingSlash adds slash when missing", async () => {
      setMockEnv("https://api.example.com", "test-api-key-12345");
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ url: "https://example.com/file" }),
      });

      await storagePut("file.txt", "content");

      const [url] = mockFetch.mock.calls[0];
      // URL constructor with base that has no trailing slash should still work
      expect(url.toString()).toContain("v1/storage/upload");
    });

    it("ensureTrailingSlash preserves slash when present", async () => {
      setMockEnv("https://api.example.com/", "test-api-key-12345");
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ url: "https://example.com/file" }),
      });

      await storagePut("file.txt", "content");

      const [url] = mockFetch.mock.calls[0];
      expect(url.toString()).toContain("v1/storage/upload");
    });

    it("toFormData creates correct form with string data", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ url: "https://example.com/file" }),
      });

      await storagePut("test.txt", "string content", "text/plain");

      const [, options] = mockFetch.mock.calls[0];
      const formData = options.body as FormData;
      expect(formData.has("file")).toBe(true);
    });

    it("buildAuthHeaders creates correct authorization header", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ url: "https://example.com/file" }),
      });

      await storagePut("file.txt", "content");

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers.Authorization).toBe("Bearer test-api-key-12345");
    });
  });

  describe("edge cases", () => {
    it("handles empty string data", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ url: "https://example.com/empty.txt" }),
      });

      const result = await storagePut("empty.txt", "");

      expect(result.key).toBe("empty.txt");
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("handles special characters in path", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ url: "https://example.com/special" }),
      });

      const result = await storagePut(
        "path with spaces/file (1).txt",
        "content"
      );

      expect(result.key).toBe("path with spaces/file (1).txt");
      const [url] = mockFetch.mock.calls[0];
      expect(url.toString()).toContain(
        "path=path+with+spaces%2Ffile+%281%29.txt"
      );
    });

    it("handles unicode characters in filename", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ url: "https://example.com/unicode" }),
      });

      const result = await storagePut("文件/日本語.txt", "content");

      expect(result.key).toBe("文件/日本語.txt");
    });

    it("strips trailing slashes from baseUrl configuration", async () => {
      setMockEnv("https://api.example.com/forge///", "test-api-key-12345");
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ url: "https://example.com/file" }),
      });

      await storagePut("file.txt", "content");

      // The function strips trailing slashes then adds one for URL construction
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });
});
