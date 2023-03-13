import Ajv from "ajv";
import manifestSchema from "./manifest.schema.json";
import vendors from "./vendors.json";

/** Chrome or Mozilla */
export type Manifest =
  | chrome.runtime.Manifest
  | browser._manifest.WebExtensionManifest;

export type ManifestV3 = chrome.runtime.Manifest;

/** Manifest Keys */
interface ManifestObject {
  [key: string]: any;
}

/** Manifest Keys */
type ManifestType = ManifestObject | string[] | string;

/**
 * Validate the manifest.
 */
export function validateManifest(manifest: Manifest): Ajv.ErrorObject[] | null {
  if (!manifest.manifest_version) {
    return [
      {
        message: "manifest_version is required",
        dataPath: "manifest_version",
        schemaPath: "manifest_version",
        keyword: "required",
        params: {},
      },
    ];
  }

  if (typeof manifest.manifest_version !== "number") {
    return [
      {
        message: "manifest_version must be a number",
        dataPath: "manifest_version",
        schemaPath: "manifest_version",
        keyword: "type",
        params: {
          type: "number",
        },
      },
    ];
  }

  if (manifest.manifest_version !== 2 && manifest.manifest_version !== 3) {
    return [
      {
        message: "manifest_version must be 2 or 3",
        dataPath: "manifest_version",
        schemaPath: "manifest_version",
        keyword: "range",
        params: {
          min: 2,
          max: 3,
        },
      },
    ];
  }

  const ajv = new Ajv();
  const validate = ajv.compile(manifestSchema);
  const valid = validate(manifest);
  if (valid) {
    return null;
  }

  return validate.errors ?? null;
}

/**
 * Transform Manifest Values from ENV
 * @param manifest Manifest
 * @returns Manifest
 */
export function transformManifestValuesFromENV(manifest: Manifest): Manifest {
  const valueRegExp = /^__(?!MSG_)(.*)__$/;

  const replace = (value: string): string => {
    const match = value.match(valueRegExp);
    if (match) {
      return process.env[match[1]] ?? "";
    }
    return value;
  };

  const transform = (manifestSection: ManifestType): ManifestType => {
    if (Array.isArray(manifestSection)) {
      return manifestSection.map((m) => transform(m));
    }

    if (typeof manifestSection === "object") {
      return Object.entries(manifestSection).reduce(
        (
          previousValue: ManifestObject,
          [key, value]: [key: string, value: ManifestType]
        ) => {
          if (typeof value === "string") {
            previousValue[key] = replace(value);
          } else {
            previousValue[key] = transform(value);
          }
          return previousValue;
        },
        {}
      );
    }

    if (typeof manifestSection === "string") {
      return replace(manifestSection);
    }

    return manifestSection;
  };

  return <Manifest>transform(manifest);
}

/**
 * Transform manifest keys
 *
 * @param manifest Manifest
 * @param vendor string
 * @returns Manifest
 */
export function transformManifestVendorKeys(
  manifest: Manifest,
  vendor: string
): Manifest {
  const vendorRegExp = new RegExp(
    `^__((?:(?:${vendors.join("|")})\\|?)+)__(.*)`
  );

  const transform = (manifestSection: ManifestType): ManifestType => {
    if (Array.isArray(manifestSection)) {
      return manifestSection.map((m) => transform(m));
    }

    if (typeof manifestSection === "object") {
      return Object.entries(manifestSection).reduce(
        (
          previousValue: ManifestObject,
          [key, value]: [key: string, value: ManifestType]
        ) => {
          const match = key.match(vendorRegExp);
          if (match) {
            const v = match[1].split("|");
            // Swap key with non prefixed name
            if (v.indexOf(vendor) > -1) {
              previousValue[match[2]] = value;
            }
          } else {
            previousValue[key] = transform(value);
          }
          return previousValue;
        },
        {}
      );
    }

    return manifestSection;
  };

  return <Manifest>transform(manifest);
}
