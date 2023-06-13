import {
  validateManifest,
  transformManifestValuesFromENV,
  transformManifestVendorKeys,
} from "../manifest";

const OLD_ENV = process.env;

beforeEach(() => {
  jest.resetModules(); // Most important - it clears the cache
  process.env = { ...OLD_ENV }; // Make a copy
});

afterAll(() => {
  process.env = OLD_ENV; // Restore old environment
});

it("should validate a simple v3 manifest", () => {
  const manifest: any = {
    name: "name",
    version: "0.0.1",
    manifest_version: 3,
  };

  expect(validateManifest(manifest)).toBeNull();
});

it("should validate a simple v2 manifest", () => {
  const manifest: any = {
    name: "name",
    version: "0.0.1",
    manifest_version: 2,
  };

  expect(validateManifest(manifest)).toBeNull();
});

it("should fail if author is a boolean not a string", () => {
  const manifest: any = {
    name: "name",
    version: "0.0.1",
    manifest_version: 2,
    author: true,
  };

  const error = validateManifest(manifest);

  expect(error !== null).toBeTruthy();
  if (error !== null) {
    expect(error[0].message).toBe("should be string");
  }
});

it("should allow split in incognito", () => {
  const manifest: any = {
    name: "name",
    version: "0.0.1",
    manifest_version: 3,
    incognito: "split",
  };

  expect(validateManifest(manifest)).toBeNull();
});

it("should replace envs", () => {
  const manifest: any = {
    name: "__NAME__",
    short_name: "__SHORT_NAME__",
    description: "__DOES_NOT_EXIST__",
    version: "0.0.1",
    manifest_version: 3,
  };

  process.env.NAME = "foo";
  process.env.SHORT_NAME = "bar";

  const transformed = transformManifestValuesFromENV(manifest);

  expect(transformed.name).toBe("foo");
  expect(transformed.short_name).toBe("bar");
  expect(transformed.description).toBe("");
});

it("replaces vendor keys", () => {
  const manifest: any = {
    _name: "Name",
    short_name: "Short Name",
    "__chrome|opera__description": "Description for chrome or opera",
    __edge__description: "Description for edge",
    version: "0.0.1",
    manifest_version: 3,
  };

  const transformedChrome = transformManifestVendorKeys(manifest, "chrome");
  expect(transformedChrome.description).toBe("Description for chrome or opera");

  const transformedOpera = transformManifestVendorKeys(manifest, "opera");
  expect(transformedOpera.description).toBe("Description for chrome or opera");

  const transformedEdge = transformManifestVendorKeys(manifest, "edge");
  expect(transformedEdge.description).toBe("Description for edge");

  const transformedFirefox = transformManifestVendorKeys(manifest, "firefox");
  expect(transformedFirefox.description).toBeUndefined();
});
