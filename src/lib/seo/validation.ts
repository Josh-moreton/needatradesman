/**
 * Validation utilities for JSON-LD schemas
 * Run this to validate that generated schemas are valid JSON and follow basic schema.org patterns
 */

/**
 * Validates that a schema object is valid JSON-LD
 * Checks for basic required fields and structure
 */
export function validateSchema(schema: unknown): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!schema || typeof schema !== "object") {
    errors.push("Schema must be an object");
    return { valid: false, errors };
  }

  const schemaObj = schema as Record<string, unknown>;

  // Check for @context
  if (!schemaObj["@context"]) {
    errors.push("Schema must include @context");
  } else if (
    schemaObj["@context"] !== "https://schema.org" &&
    !String(schemaObj["@context"]).includes("schema.org")
  ) {
    errors.push("@context should reference schema.org");
  }

  // Check for @type or @graph
  if (!schemaObj["@type"] && !schemaObj["@graph"]) {
    errors.push("Schema must include @type or @graph");
  }

  // Validate @graph structure if present
  if (schemaObj["@graph"]) {
    if (!Array.isArray(schemaObj["@graph"])) {
      errors.push("@graph must be an array");
    } else {
      const graphArray = schemaObj["@graph"] as unknown[];
      graphArray.forEach((item, index) => {
        if (!item || typeof item !== "object") {
          errors.push(`@graph[${index}] must be an object`);
        } else {
          const graphItem = item as Record<string, unknown>;
          if (!graphItem["@type"]) {
            errors.push(`@graph[${index}] must include @type`);
          }
        }
      });
    }
  }

  // Try to serialize as JSON
  try {
    JSON.stringify(schema);
  } catch (e) {
    errors.push(`Schema is not valid JSON: ${e}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates Organization schema required fields
 */
export function validateOrgSchema(schema: unknown): {
  valid: boolean;
  errors: string[];
} {
  const { valid: basicValid, errors } = validateSchema(schema);
  if (!basicValid) return { valid: false, errors };

  const schemaObj = schema as Record<string, unknown>;

  if (schemaObj["@type"] !== "Organization") {
    errors.push("Expected @type to be Organization");
  }

  if (!schemaObj.name) {
    errors.push("Organization requires name");
  }

  if (!schemaObj.url) {
    errors.push("Organization requires url");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates WebSite schema required fields
 */
export function validateWebsiteSchema(schema: unknown): {
  valid: boolean;
  errors: string[];
} {
  const { valid: basicValid, errors } = validateSchema(schema);
  if (!basicValid) return { valid: false, errors };

  const schemaObj = schema as Record<string, unknown>;

  if (schemaObj["@type"] !== "WebSite") {
    errors.push("Expected @type to be WebSite");
  }

  if (!schemaObj.name) {
    errors.push("WebSite requires name");
  }

  if (!schemaObj.url) {
    errors.push("WebSite requires url");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates Service schema required fields
 */
export function validateServiceSchema(schema: unknown): {
  valid: boolean;
  errors: string[];
} {
  const { valid: basicValid, errors } = validateSchema(schema);
  if (!basicValid) return { valid: false, errors };

  const schemaObj = schema as Record<string, unknown>;

  if (schemaObj["@type"] !== "Service") {
    errors.push("Expected @type to be Service");
  }

  if (!schemaObj.name) {
    errors.push("Service requires name");
  }

  if (!schemaObj.serviceType) {
    errors.push("Service requires serviceType");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates LocalBusiness schema required fields
 */
export function validateLocalBusinessSchema(schema: unknown): {
  valid: boolean;
  errors: string[];
} {
  const { valid: basicValid, errors } = validateSchema(schema);
  if (!basicValid) return { valid: false, errors };

  const schemaObj = schema as Record<string, unknown>;

  // HomeAndConstructionBusiness is a subclass of LocalBusiness
  if (
    schemaObj["@type"] !== "LocalBusiness" &&
    schemaObj["@type"] !== "HomeAndConstructionBusiness"
  ) {
    errors.push(
      "Expected @type to be LocalBusiness or HomeAndConstructionBusiness"
    );
  }

  if (!schemaObj.name) {
    errors.push("LocalBusiness requires name");
  }

  // Warn if address is missing (recommended for local SEO)
  if (!schemaObj.address) {
    errors.push(
      "Warning: LocalBusiness should include address for better local SEO"
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates FAQPage schema required fields
 */
export function validateFAQSchema(schema: unknown): {
  valid: boolean;
  errors: string[];
} {
  const { valid: basicValid, errors } = validateSchema(schema);
  if (!basicValid) return { valid: false, errors };

  const schemaObj = schema as Record<string, unknown>;

  if (schemaObj["@type"] !== "FAQPage") {
    errors.push("Expected @type to be FAQPage");
  }

  if (!schemaObj.mainEntity || !Array.isArray(schemaObj.mainEntity)) {
    errors.push("FAQPage requires mainEntity array");
  } else {
    const mainEntity = schemaObj.mainEntity as unknown[];
    if (mainEntity.length === 0) {
      errors.push("FAQPage must have at least one question");
    }

    mainEntity.forEach((item, index) => {
      const question = item as Record<string, unknown>;
      if (question["@type"] !== "Question") {
        errors.push(`mainEntity[${index}] must be of type Question`);
      }
      if (!question.name) {
        errors.push(`mainEntity[${index}] requires name (the question)`);
      }
      if (!question.acceptedAnswer) {
        errors.push(`mainEntity[${index}] requires acceptedAnswer`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates HowTo schema required fields
 */
export function validateHowToSchema(schema: unknown): {
  valid: boolean;
  errors: string[];
} {
  const { valid: basicValid, errors } = validateSchema(schema);
  if (!basicValid) return { valid: false, errors };

  const schemaObj = schema as Record<string, unknown>;

  if (schemaObj["@type"] !== "HowTo") {
    errors.push("Expected @type to be HowTo");
  }

  if (!schemaObj.name) {
    errors.push("HowTo requires name");
  }

  if (!schemaObj.step || !Array.isArray(schemaObj.step)) {
    errors.push("HowTo requires step array");
  } else {
    const steps = schemaObj.step as unknown[];
    if (steps.length === 0) {
      errors.push("HowTo must have at least one step");
    }

    steps.forEach((item, index) => {
      const step = item as Record<string, unknown>;
      if (step["@type"] !== "HowToStep") {
        errors.push(`step[${index}] must be of type HowToStep`);
      }
      if (!step.text && !step.name) {
        errors.push(`step[${index}] requires text or name`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Helper to validate any schema and log results
 * Useful for development and debugging
 */
export function validateAndLog(schema: unknown, schemaType?: string): boolean {
  const { valid, errors } = validateSchema(schema);

  if (valid) {
    console.log(
      `✓ ${schemaType || "Schema"} is valid JSON-LD`,
      JSON.stringify(schema, null, 2)
    );
  } else {
    console.error(`✗ ${schemaType || "Schema"} validation failed:`);
    errors.forEach((error) => console.error(`  - ${error}`));
    console.error("Schema:", JSON.stringify(schema, null, 2));
  }

  return valid;
}
